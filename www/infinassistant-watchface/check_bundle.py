#!/usr/bin/env python3
"""Fails when the committed card bundle does not match the sources it was built from.

    python check_bundle.py [CARD_DIR]

CARD_DIR defaults to the directory this file is in (www/infinassistant-watchface). Needs no node.

`npm run build` (vite.config.ts) writes dist/infinassistant-watchface.build.json next to the bundle:

    {"bundle_sha256": "<sha256 of the bundle>", "inputs_sha256": "<sha256 of what it is built from>"}

The inputs are package.json, package-lock.json, tsconfig.json, vite.config.ts and every file under
src/, hashed as `<path>\\0<content with CRLF as LF>\\0` in that order (src/ sorted by path). The same
inputs hash is what the bundle's version stamp (`<package version>+<first 8 hex>`) is made from.
This script repeats that hash, so it must stay identical to inputsHash() in vite.config.ts.

Checks (each failure is printed as `card bundle: ...`; exit status 1):
  1. the record exists and has both hashes;
  2. the inputs hash recomputed from the sources equals the recorded one (a source, the lockfile or
     the build config changed since the last build);
  3. the bundle's hash equals the recorded one (the bundle was edited or replaced by hand);
  4. the bundle carries the version stamp made from the inputs hash;
  5. the integration's copy (custom_components/infinassistant/frontend) is byte-identical to dist/.
"""
from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path

BUNDLE = "infinassistant-watchface.js"
RECORD = "infinassistant-watchface.build.json"
CONFIG_FILES = ["package.json", "package-lock.json", "tsconfig.json", "vite.config.ts"]


def inputs_hash(card_dir: Path) -> str:
    sources = sorted(p.relative_to(card_dir).as_posix() for p in (card_dir / "src").rglob("*") if p.is_file())
    digest = hashlib.sha256()
    for name in CONFIG_FILES + sources:
        content = (card_dir / name).read_bytes().replace(b"\r\n", b"\n")
        digest.update(name.encode() + b"\0" + content + b"\0")
    return digest.hexdigest()


def check(card_dir: Path) -> list[str]:
    problems: list[str] = []
    bundle = card_dir / "dist" / BUNDLE
    record = card_dir / "dist" / RECORD
    copy = card_dir.parents[1] / "custom_components" / "infinassistant" / "frontend" / BUNDLE
    rebuild = "run `npm run build` in www/infinassistant-watchface and commit dist/ and the frontend/ copy"

    if not bundle.is_file():
        return [f"dist/{BUNDLE} is missing; {rebuild}"]
    bundle_bytes = bundle.read_bytes()

    want_inputs = want_bundle = None
    try:
        recorded = json.loads(record.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        problems.append(f"dist/{RECORD} is missing or unreadable; {rebuild}")
    else:
        want_inputs = recorded.get("inputs_sha256") if isinstance(recorded, dict) else None
        want_bundle = recorded.get("bundle_sha256") if isinstance(recorded, dict) else None
        if not (isinstance(want_inputs, str) and isinstance(want_bundle, str)):
            problems.append(f"dist/{RECORD} lacks inputs_sha256 or bundle_sha256; {rebuild}")
            want_inputs = want_bundle = None

    if want_inputs is not None:
        got_inputs = inputs_hash(card_dir)
        if got_inputs != want_inputs:
            problems.append(
                "the sources, the lockfile or the build config changed since the bundle was built "
                f"(inputs {got_inputs[:12]}, built from {want_inputs[:12]}); {rebuild}"
            )
        if hashlib.sha256(bundle_bytes).hexdigest() != want_bundle:
            problems.append(f"dist/{BUNDLE} is not the bundle the build recorded; {rebuild}")
        if f"+{want_inputs[:8]}".encode() not in bundle_bytes:
            problems.append(f"dist/{BUNDLE} does not carry the version stamp +{want_inputs[:8]}; {rebuild}")

    if not copy.is_file():
        problems.append(f"the integration's copy {copy.relative_to(card_dir.parents[1]).as_posix()} is missing; {rebuild}")
    elif copy.read_bytes() != bundle_bytes:
        problems.append(
            f"{copy.relative_to(card_dir.parents[1]).as_posix()} differs from dist/{BUNDLE}; {rebuild}"
        )
    return problems


def main(argv: list[str] | None = None) -> int:
    argv = sys.argv[1:] if argv is None else argv
    card_dir = Path(argv[0]).resolve() if argv else Path(__file__).resolve().parent
    problems = check(card_dir)
    for problem in problems:
        print(f"card bundle: {problem}", file=sys.stderr)
    if not problems:
        print("card bundle: matches its sources")
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main())
