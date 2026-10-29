"""The committed card bundle must match the sources it was built from.

`npm run build` records the hashes of its inputs and of the bundle next to it
(www/infinassistant-watchface/dist/infinassistant-watchface.build.json), and
www/infinassistant-watchface/check_bundle.py compares them with the tree without needing node.
Without this, a source change that is committed without a rebuild leaves a stale bundle
that nothing notices (limits.ts changed in e7aee59; the bundle was rebuilt in f79fe7b).
"""
from __future__ import annotations

import hashlib
import importlib.util
import json
import shutil
from pathlib import Path

import pytest

INTEGRATION_ROOT = Path(__file__).resolve().parents[1]
CARD_DIR = INTEGRATION_ROOT / "www" / "infinassistant-watchface"
FRONTEND_REL = Path("custom_components") / "infinassistant" / "frontend"

_spec = importlib.util.spec_from_file_location("check_bundle", CARD_DIR / "check_bundle.py")
check_bundle = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(check_bundle)

BUNDLE = check_bundle.BUNDLE
RECORD = check_bundle.RECORD


def test_the_committed_bundle_matches_its_sources():
    problems = check_bundle.check(CARD_DIR)
    assert not problems, "\n".join(problems)


@pytest.fixture
def tree(tmp_path):
    """A copy of the card and the integration's bundle copy; returns the copy's card dir."""
    root = tmp_path / "ha_integration"
    card = root / "www" / "infinassistant-watchface"
    shutil.copytree(CARD_DIR, card, ignore=shutil.ignore_patterns("node_modules", "*.map", "__pycache__"))
    (root / FRONTEND_REL).mkdir(parents=True)
    shutil.copy(INTEGRATION_ROOT / FRONTEND_REL / BUNDLE, root / FRONTEND_REL / BUNDLE)
    assert check_bundle.check(card) == []
    return card


def _problems(card: Path) -> str:
    return "\n".join(check_bundle.check(card))


class TestStaleBundleIsCaught:
    def test_an_edited_source_file(self, tree):
        src = tree / "src" / "generated" / "limits.ts"
        src.write_text(src.read_text(encoding="utf-8") + "\nexport const EXTRA = 1;\n", encoding="utf-8")

        assert "changed since the bundle was built" in _problems(tree)

    def test_a_new_source_file(self, tree):
        (tree / "src" / "new-module.ts").write_text("export {};\n", encoding="utf-8")

        assert "changed since the bundle was built" in _problems(tree)

    def test_a_removed_source_file(self, tree):
        (tree / "src" / "styles.ts").unlink()

        assert "changed since the bundle was built" in _problems(tree)

    @pytest.mark.parametrize("name", ["package-lock.json", "package.json", "tsconfig.json", "vite.config.ts"])
    def test_an_edited_lockfile_or_build_config(self, tree, name):
        path = tree / name
        path.write_text(path.read_text(encoding="utf-8") + "\n", encoding="utf-8")

        assert "changed since the bundle was built" in _problems(tree)

    def test_a_file_that_is_not_utf8_is_hashed_by_its_bytes(self, tree):
        # The build hashes raw bytes too (vite.config.ts), so the two never disagree on such a file.
        # Not UTF-8: a PNG signature, a lone 0xFF and a lone CR before a non-LF byte.
        (tree / "src" / "icon.bin").write_bytes(b"\x89PNG\r\n\x1a\n\xff\xfe\r\x00")
        want = check_bundle.inputs_hash(tree)

        assert want != json.loads((tree / "dist" / RECORD).read_text(encoding="utf-8"))["inputs_sha256"]
        assert "changed since the bundle was built" in _problems(tree)
        # the hash is the sha256 of the path, a NUL, the bytes with CR LF as LF, and a NUL, in order
        sources = sorted(p.relative_to(tree).as_posix() for p in (tree / "src").rglob("*") if p.is_file())
        digest = hashlib.sha256()
        for name in check_bundle.CONFIG_FILES + sources:
            digest.update(name.encode() + b"\0" + (tree / name).read_bytes().replace(b"\r\n", b"\n") + b"\0")
        assert want == digest.hexdigest()

    def test_line_endings_alone_are_not_a_change(self, tree):
        src = tree / "src" / "constants.ts"
        src.write_bytes(src.read_bytes().replace(b"\r\n", b"\n").replace(b"\n", b"\r\n"))

        assert check_bundle.check(tree) == []


class TestBundleAndRecordMustAgree:
    def test_a_hand_edited_bundle(self, tree):
        bundle = tree / "dist" / BUNDLE
        data = bundle.read_bytes() + b"\n// edited\n"
        bundle.write_bytes(data)
        (tree.parents[1] / FRONTEND_REL / BUNDLE).write_bytes(data)

        assert "is not the bundle the build recorded" in _problems(tree)

    def test_a_bundle_without_the_inputs_stamp(self, tree):
        record = json.loads((tree / "dist" / RECORD).read_text(encoding="utf-8"))
        stamp = f"+{record['inputs_sha256'][:8]}".encode()
        bundle = tree / "dist" / BUNDLE
        data = bundle.read_bytes().replace(stamp, b"+00000000")
        bundle.write_bytes(data)
        (tree.parents[1] / FRONTEND_REL / BUNDLE).write_bytes(data)
        record["bundle_sha256"] = hashlib.sha256(data).hexdigest()
        (tree / "dist" / RECORD).write_text(json.dumps(record), encoding="utf-8")

        assert "does not carry the version stamp" in _problems(tree)

    def test_a_missing_record(self, tree):
        (tree / "dist" / RECORD).unlink()

        assert f"dist/{RECORD} is missing" in _problems(tree)

    def test_a_record_without_the_hashes(self, tree):
        (tree / "dist" / RECORD).write_text("{}", encoding="utf-8")

        assert "lacks inputs_sha256 or bundle_sha256" in _problems(tree)

    def test_a_missing_bundle(self, tree):
        (tree / "dist" / BUNDLE).unlink()

        assert f"dist/{BUNDLE} is missing" in _problems(tree)


class TestIntegrationCopy:
    def test_a_copy_that_differs_from_dist(self, tree):
        copy = tree.parents[1] / FRONTEND_REL / BUNDLE
        copy.write_bytes(copy.read_bytes() + b" ")

        assert "differs from dist/" in _problems(tree)

    def test_a_missing_copy(self, tree):
        (tree.parents[1] / FRONTEND_REL / BUNDLE).unlink()

        assert "is missing" in _problems(tree)
