"""Block a commit if the three language files drift apart.

Checks: same keys in en/de/zh, no empty values, identical {placeholders},
12 month abbreviations, and every key used in index.html / *.js exists.
Run: python3 tools/check_i18n.py   (also runs as the git pre-commit hook)
"""
import json, re, sys
from pathlib import Path

root = Path(__file__).resolve().parent.parent
langs = {l: json.loads((root / f"i18n/{l}.json").read_text()) for l in ("en", "de", "zh")}
errors = []
base = set(langs["en"])
for l, d in langs.items():
    if l == "en": continue
    for k in sorted(base - set(d)): errors.append(f"{l}: missing key {k}")
    for k in sorted(set(d) - base): errors.append(f"{l}: extra key {k} (not in en)")
ph = lambda s: sorted(re.findall(r"\{(\w+)\}", s))
for k in base:
    for l, d in langs.items():
        v = d.get(k)
        if v is None: continue
        if not str(v).strip(): errors.append(f"{l}: empty value {k}")
        if ph(v) != ph(langs["en"][k]): errors.append(f"{l}: placeholders differ in {k}: {ph(v)} vs {ph(langs['en'][k])}")
for l, d in langs.items():
    if len(d.get("whales.monthsabbr", "").split("|")) != 12: errors.append(f"{l}: whales.monthsabbr needs 12 parts")
used = set()
for f in [root / "index.html", *root.glob("*.js")]:
    s = f.read_text()
    used |= set(re.findall(r'data-i18n(?:-html|-aria|-title)?="([\w.\-]+)"', s))
    used |= set(re.findall(r"\bt\(\s*'([\w.\-]+)'", s))
for k in sorted(used - base): errors.append(f"used but not defined: {k}")
if errors:
    print("i18n check FAILED:"); [print("  -", e) for e in errors]; sys.exit(1)
print(f"i18n check passed: {len(base)} keys in en, de, zh; {len(used)} used in the page")
