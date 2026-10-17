#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Circuit Lab build script - deterministic single-file build.

Reads the sources from src/ and writes one self-contained index.html. The output is
byte-identical for the same inputs (no timestamps, no random values). The published
site needs no build step: index.html is committed to the repository.

    python3 build.py                 # writes ./index.html
    python3 build.py --out DIR       # writes DIR/index.html

Checks before writing:
  * no em dash (U+2014), en dash (U+2013) or byte order mark in any source or output
  * no script-breaking "</script" sequence inside inlined JavaScript
  * the four UI locales (ro, en, sr-latn, sr-cyrl) share exactly the same keys
    (checked with Node.js, which is only needed by the maintainer, not by users)

SPDX-License-Identifier: Apache-2.0
Copyright 2026 Kristian Mario Miskovic (TekiDeki)
"""
import argparse
import io
import json
import os
import shutil
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "src")
TEMPLATE = os.path.join(SRC, "template.html")
INLINE = [
    ("/*@@ENGINE@@*/", "engine.js"),
    ("/*@@CONTENT_UI@@*/", "content_ui.js"),
    ("/*@@CONTENT_LESSONS@@*/", "content_lessons.js"),
    ("/*@@CONTENT_CARDS@@*/", "content_cards.js"),
    ("/*@@CONTENT_REPAIR@@*/", "content_repair.js"),
    ("/*@@APP@@*/", "app.js"),
]
FORBIDDEN = {
    "\u2014": "em dash (U+2014)",
    "\u2013": "en dash (U+2013)",
    "\ufeff": "byte order mark (U+FEFF)",
}
LOCALES = ["ro", "en", "sr-latn", "sr-cyrl"]


def read(path):
    with io.open(path, encoding="utf-8", newline="") as handle:
        return handle.read()


def check_forbidden(name, text):
    for char, label in FORBIDDEN.items():
        if char in text:
            line = text[: text.index(char)].count("\n") + 1
            raise SystemExit("%s: forbidden %s at line %d" % (name, label, line))


def check_locale_keys():
    """Loads content_ui.js in Node and verifies the four locales have identical keys."""
    script = (
        "global.window = global;"
        "require(process.argv[1]);"
        "const ui = global.CircuitI18N.ui;"
        "const locales = process.argv.slice(2);"
        "const ref = Object.keys(ui[locales[0]]).sort();"
        "const out = {ok: true, counts: {}, diff: []};"
        "for (const l of locales) {"
        "  if (!ui[l]) { out.ok = false; out.diff.push('missing locale ' + l); continue; }"
        "  const keys = Object.keys(ui[l]).sort();"
        "  out.counts[l] = keys.length;"
        "  const missing = ref.filter(k => !keys.includes(k));"
        "  const extra = keys.filter(k => !ref.includes(k));"
        "  if (missing.length || extra.length) { out.ok = false; out.diff.push(l + ' missing:' + missing + ' extra:' + extra); }"
        "  const empty = keys.filter(k => ui[l][k] === '' && k !== 'tipNone');"
        "  if (empty.length) { out.ok = false; out.diff.push(l + ' empty:' + empty.join(',')); }"
        "}"
        "console.log(JSON.stringify(out));"
    )
    node = shutil.which("node")
    if not node:
        print("warning: node not found, locale key check skipped", file=sys.stderr)
        return
    path = os.path.join(SRC, "content_ui.js")
    proc = subprocess.run([node, "-e", script, path] + LOCALES, capture_output=True, text=True, cwd=HERE)
    if proc.returncode != 0:
        raise SystemExit("locale check failed to run: " + proc.stderr.strip())
    result = json.loads(proc.stdout.strip().splitlines()[-1])
    if not result["ok"]:
        raise SystemExit("locale keys differ: " + "; ".join(result["diff"]))
    print("locales ok: " + ", ".join("%s=%d" % (k, v) for k, v in sorted(result["counts"].items())))


def build(out_dir):
    for name in ["template.html", "engine.js", "content_ui.js", "content_lessons.js",
                 "content_cards.js", "content_repair.js", "app.js"]:
        check_forbidden(name, read(os.path.join(SRC, name)))
    for _, name in INLINE:
        if "</script" in read(os.path.join(SRC, name)).lower():
            raise SystemExit("%s: contains a literal closing script tag" % name)

    html = read(TEMPLATE)
    for marker, filename in INLINE:
        if html.count(marker) != 1:
            raise SystemExit("template: marker %s must appear exactly once" % marker)
        html = html.replace(marker, read(os.path.join(SRC, filename)).rstrip() + "\n")

    check_forbidden("index.html", html)
    if html.count("<script>") != html.count("</script>"):
        raise SystemExit("index.html: unbalanced script tags")

    os.makedirs(out_dir, exist_ok=True)
    target = os.path.join(out_dir, "index.html")
    with io.open(target, "w", encoding="utf-8", newline="\n") as handle:
        handle.write(html)
    print("wrote %s (%d bytes)" % (target, len(html.encode("utf-8"))))


def main():
    parser = argparse.ArgumentParser(description=__doc__.split("\n")[1])
    parser.add_argument("--out", default=HERE, help="output directory (default: repository root)")
    args = parser.parse_args()
    check_locale_keys()
    build(args.out)


if __name__ == "__main__":
    main()
