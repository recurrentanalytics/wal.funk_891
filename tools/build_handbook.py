"""Generate data/handbook.json: the facts the handbook shows that change with every build (build number, page stack read
from index.html, own code size, data files, translation coverage, species counts). Runs in the pre-commit hook."""
import json, re, os, time
from pathlib import Path
root = Path(__file__).resolve().parent.parent
html = (root / "index.html").read_text()
build = re.search(r'<meta name="build" content="(\d+)"', html).group(1)
libs = []
for src in re.findall(r'<script src="(https?://[^"]+)"', html):
    m = re.search(r'/(?:npm/)?([\w.\-]+)@([\d.]+)|/libs/([\w.\-]+)/([\d.]+)/', src)
    if m: libs.append([(m.group(1) or m.group(3)) + (' (OrbitControls)' if 'OrbitControls' in src else ''), m.group(2) or m.group(4), src.split('/')[2]])
own = [[p.name, sum(1 for _ in p.open())] for p in sorted(root.glob("*.js"))]
langs = {l: len(json.loads((root / f"i18n/{l}.json").read_text())) for l in ("en", "de", "zh")}
files = []
for p in sorted((root / "data").rglob("*")):
    if p.is_file() and not p.name.startswith("._"): files.append([str(p.relative_to(root)), p.stat().st_size])
sp = json.loads((root / "data/species.json").read_text())["species"]
out = {"build": build, "built_at": time.strftime("%Y-%m-%d %H:%M %Z"), "libs": libs, "own_js": own, "own_js_lines": sum(n for _, n in own),
       "html_lines": html.count("\n"), "i18n_keys": langs, "data_files": files, "data_bytes": sum(s for _, s in files),
       "species_total": len(sp), "species_at_stations": sum(1 for x in sp if x["seen"][0] + x["seen"][1] > 0),
       "species_with_clips": sum(1 for x in sp if (x.get("info") or {}).get("clips")),
       "fonts": re.findall(r"family=([A-Za-z+]+)", html)}
(root / "data/handbook.json").write_text(json.dumps(out, ensure_ascii=False, indent=1))
print("handbook data:", build, len(libs), "libs,", out["own_js_lines"], "JS lines")
