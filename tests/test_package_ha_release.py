"""tools/package_ha_release.py: the HACS-shaped tree and the release zip."""
from __future__ import annotations

import importlib.util
import json
import shutil
import sys
import zipfile
from pathlib import Path

import pytest

SCRIPT = Path(__file__).resolve().parents[2] / "tools" / "package_ha_release.py"
if not SCRIPT.is_file():
    pytest.skip(f"no packaging script at {SCRIPT}", allow_module_level=True)

_spec = importlib.util.spec_from_file_location("package_ha_release", SCRIPT)
pkg = importlib.util.module_from_spec(_spec)
sys.modules[_spec.name] = pkg  # its dataclass resolves annotations through sys.modules
_spec.loader.exec_module(pkg)


def _files_under(root: Path) -> list[str]:
    return sorted(p.relative_to(root).as_posix() for p in root.rglob("*") if p.is_file())


def _integration_copy(tmp_path: Path) -> Path:
    """A copy of the integration's folder, without caches, for a test to change."""
    copy = tmp_path / "integration"
    shutil.copytree(pkg.INTEGRATION_DIR, copy, ignore=shutil.ignore_patterns(*pkg.SKIPPED, "*.pyc", "*.pyo"))
    return copy


def _link(link: Path, target: Path) -> None:
    """A symlink at [link]; on Windows without the privilege for one, a junction (folders only)."""
    try:
        link.symlink_to(target, target_is_directory=target.is_dir())
    except OSError:
        if sys.platform != "win32" or not target.is_dir():
            pytest.skip("this system does not let the tests make a symlink")
        import _winapi  # a junction needs no privilege

        _winapi.CreateJunction(str(target), str(link))


class TestPackage:
    def test_packages_a_hacs_shaped_tree_and_a_zip(self, tmp_path):
        release = pkg.package(tmp_path)

        assert release.errors == []
        tree = tmp_path / "repo"
        integration = tree / "custom_components" / "infinassistant"
        for path in ("hacs.json", "README.md", "LICENSE"):
            assert (tree / path).is_file(), path
        assert (integration / "manifest.json").is_file()
        assert (integration / "card.py").is_file()
        assert (integration / "frontend" / "infinassistant-watchface.js").read_bytes() == (
            pkg.INTEGRATION_DIR / "frontend" / "infinassistant-watchface.js"
        ).read_bytes()
        assert not any("__pycache__" in name or name.endswith(".pyc") for name in _files_under(tree))

        # The zip holds the integration's files at its root, for custom_components/infinassistant/.
        with zipfile.ZipFile(release.zip_path) as archive:
            assert sorted(archive.namelist()) == _files_under(integration)
        assert release.zip_path.name == "infinassistant.zip"
        assert release.version == json.loads((pkg.INTEGRATION_DIR / "manifest.json").read_text())["version"]

    def test_the_repo_url_points_the_packaged_manifest_at_the_mirror(self, tmp_path):
        source = (pkg.INTEGRATION_DIR / "manifest.json").read_text(encoding="utf-8")

        release = pkg.package(tmp_path, "https://github.com/owner/infinassistant-ha/")

        packaged = json.loads((tmp_path / "repo" / "custom_components" / "infinassistant" / "manifest.json").read_text())
        assert packaged["documentation"] == "https://github.com/owner/infinassistant-ha"
        assert packaged["issue_tracker"] == "https://github.com/owner/infinassistant-ha/issues"
        assert release.warnings == []
        assert "https://github.com/owner/infinassistant-ha" in (tmp_path / "repo" / "README.md").read_text(encoding="utf-8")
        assert (pkg.INTEGRATION_DIR / "manifest.json").read_text(encoding="utf-8") == source

    def test_a_manifest_off_github_warns_about_the_private_links(self):
        manifest = json.loads((pkg.INTEGRATION_DIR / "manifest.json").read_text(encoding="utf-8"))
        manifest["documentation"] = "https://example.com/docs"

        assert any("documentation" in w and "--repo-url" in w for w in pkg.check_manifest(manifest)[1])

    def test_the_same_tree_gives_the_same_zip(self, tmp_path):
        first = pkg.package(tmp_path / "a").zip_path.read_bytes()
        second = pkg.package(tmp_path / "b").zip_path.read_bytes()

        assert first == second

    def test_a_failed_check_writes_nothing(self, tmp_path):
        integration = tmp_path / "integration"
        shutil.copytree(pkg.INTEGRATION_DIR, integration)
        manifest = json.loads((integration / "manifest.json").read_text(encoding="utf-8"))
        manifest["version"] = "v0.3"
        (integration / "manifest.json").write_text(json.dumps(manifest), encoding="utf-8")
        (integration / "frontend" / "infinassistant-watchface.js").write_text("stale", encoding="utf-8")
        out = tmp_path / "out"

        release = pkg.package(out, integration_dir=integration)

        assert any("version 'v0.3'" in e for e in release.errors)
        assert any("differs from the card's build" in e for e in release.errors)
        assert not out.exists()


class TestPathSafety:
    """Nothing written outside --out, no tree deleted that the script did not write, no link
    followed, and nothing shipped that SHIPPED does not name."""

    # (a) hacs.json's filename

    @pytest.mark.parametrize("filename", ["../escape.zip", "sub/x.zip", "sub\\x.zip", "/abs.zip", "C:x.zip", "..zip"])
    def test_the_zip_filename_must_be_a_bare_name(self, filename):
        errors = pkg.check_hacs({"name": "X", "zip_release": True, "filename": filename})

        assert any("must be a bare file name" in e for e in errors)

    def test_a_zip_filename_out_of_out_writes_nothing(self, tmp_path):
        hacs = tmp_path / "hacs.json"
        hacs.write_text(json.dumps({"name": "X", "zip_release": True, "filename": "../escape.zip"}), encoding="utf-8")
        out = tmp_path / "out"

        release = pkg.package(out, hacs_json=hacs)

        assert any("must be a bare file name" in e for e in release.errors)
        assert not out.exists()
        assert not (tmp_path / "escape.zip").exists()

    # (b) the repo/ tree in --out

    def test_a_repo_folder_it_did_not_write_is_left_alone(self, tmp_path):
        mine = tmp_path / "repo"
        (mine / ".git").mkdir(parents=True)
        (mine / "notes.md").write_text("mine", encoding="utf-8")

        release = pkg.package(tmp_path)

        assert any(f"has no {pkg.TREE_MARKER} beside it" in e for e in release.errors)
        assert (mine / "notes.md").read_text(encoding="utf-8") == "mine"
        assert (mine / ".git").is_dir()
        assert not (tmp_path / "infinassistant.zip").exists()
        assert not (tmp_path / pkg.TREE_MARKER).exists()

    def test_it_records_the_tree_it_writes_and_replaces_it(self, tmp_path):
        assert pkg.package(tmp_path).errors == []
        marker = json.loads((tmp_path / pkg.TREE_MARKER).read_text(encoding="utf-8"))
        assert marker["files"] == _files_under(tmp_path / "repo")
        readme = tmp_path / "repo" / "README.md"
        readme.write_text("edited", encoding="utf-8")

        assert pkg.package(tmp_path).errors == []

        assert readme.read_text(encoding="utf-8") != "edited"

    def test_a_tree_it_wrote_that_holds_more_is_left_alone(self, tmp_path):
        assert pkg.package(tmp_path).errors == []
        head = tmp_path / "repo" / ".git" / "HEAD"
        head.parent.mkdir()
        head.write_text("ref: refs/heads/main\n", encoding="utf-8")

        release = pkg.package(tmp_path)

        assert any("did not write (.git/)" in e for e in release.errors)
        assert head.is_file()

    # (c) links in the integration's folder

    def test_a_linked_file_fails(self, tmp_path):
        integration = _integration_copy(tmp_path)
        secret = tmp_path / "secret.txt"
        secret.write_text("not for the release", encoding="utf-8")
        _link(integration / "secrets.py", secret)
        out = tmp_path / "out"

        release = pkg.package(out, integration_dir=integration)

        assert any("integration/secrets.py is a link" in e for e in release.errors)
        assert not out.exists()

    def test_a_linked_folder_fails(self, tmp_path):
        integration = _integration_copy(tmp_path)
        outside = tmp_path / "outside"
        outside.mkdir()
        (outside / "secret.json").write_text("{}", encoding="utf-8")
        _link(integration / "translations" / "more", outside)
        out = tmp_path / "out"

        release = pkg.package(out, integration_dir=integration)

        assert any("integration/translations/more is a link" in e for e in release.errors)
        assert not any("secret.json" in e for e in release.errors), "the link was followed"
        assert not out.exists()

    # (d) the allowlist

    @pytest.mark.parametrize(
        "stray",
        [
            "notes.txt",
            ".env",
            ".hidden.json",
            "frontend/infinassistant-watchface.js.map",
            "translations/en.yaml",
            "helpers/extra.py",
        ],
    )
    def test_a_file_shipped_does_not_name_fails(self, tmp_path, stray):
        integration = _integration_copy(tmp_path)
        (integration / stray).parent.mkdir(parents=True, exist_ok=True)
        (integration / stray).write_text("x", encoding="utf-8")
        out = tmp_path / "out"

        release = pkg.package(out, integration_dir=integration)

        assert any(f"integration/{stray} is not a file the integration ships" in e for e in release.errors)
        assert not out.exists()

    def test_caches_are_left_out_without_failing(self, tmp_path):
        integration = _integration_copy(tmp_path)
        (integration / "__pycache__").mkdir()
        (integration / "__pycache__" / "card.cpython-314.pyc").write_bytes(b"\0")
        (integration / "stale.pyc").write_bytes(b"\0")

        release = pkg.package(tmp_path / "out", integration_dir=integration)

        assert release.errors == []
        assert not any("__pycache__" in name or name.endswith(".pyc") for name in release.zip_names)

    def test_it_ships_every_file_of_the_integration(self, tmp_path):
        release = pkg.package(tmp_path)

        assert release.errors == []
        on_disk = [
            name for name in _files_under(pkg.INTEGRATION_DIR)
            if "__pycache__" not in name and not name.endswith((".pyc", ".pyo"))
        ]
        assert release.zip_names == on_disk


class TestChecks:
    def test_the_repositorys_manifest_and_hacs_json_pass(self):
        manifest = json.loads((pkg.INTEGRATION_DIR / "manifest.json").read_text(encoding="utf-8"))
        hacs = json.loads(pkg.HACS_JSON.read_text(encoding="utf-8"))

        assert pkg.check_manifest(manifest)[0] == []
        assert pkg.check_hacs(hacs) == []

    @pytest.mark.parametrize(
        ("hacs", "error"),
        [
            ({"render_readme": True}, "'name' is missing"),
            ({"name": "X", "zip_releases": True}, "unknown key 'zip_releases'"),
            ({"name": "X", "render_readme": "yes"}, "'render_readme' has the wrong type"),
            ({"name": "X", "content_in_root": True}, "content_in_root must be false"),
            ({"name": "X", "zip_release": True}, "zip_release needs a filename"),
            ({"name": "X", "zip_release": True, "filename": "x.tar"}, "zip_release needs a filename"),
            ({"name": "X", "filename": "x.zip"}, "filename is read only with zip_release"),
            ({"name": "X", "homeassistant": "latest"}, "is not a Home Assistant version"),
        ],
    )
    def test_hacs_json(self, hacs, error):
        assert any(error in e for e in pkg.check_hacs(hacs))

    def test_a_zip_release_takes_its_filename(self):
        assert pkg.check_hacs({"name": "X", "zip_release": True, "filename": "infinassistant.zip"}) == []

    @pytest.mark.parametrize(
        ("change", "error"),
        [
            ({"issue_tracker": ""}, "'issue_tracker' is missing"),
            ({"documentation": "github.com/owner/repo"}, "is not an http(s) URL"),
            ({"version": "0.3.0-beta"}, "is not MAJOR.MINOR[.PATCH]"),
            ({"domain": "other"}, "the directory is 'infinassistant'"),
            ({"codeowners": ["w6tech"]}, "codeowners must be GitHub handles"),
            ({"dependencies": ["webhook"]}, "dependencies must include 'http'"),
            ({"after_dependencies": []}, "'frontend' must be in dependencies or after_dependencies"),
        ],
    )
    def test_manifest(self, change, error):
        manifest = json.loads((pkg.INTEGRATION_DIR / "manifest.json").read_text(encoding="utf-8"))
        manifest.update(change)

        assert any(error in e for e in pkg.check_manifest(manifest)[0])
