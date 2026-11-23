"""Stamp one build number into index.html (meta + every local script/style ?v=) and version.json.
Runs in the pre-commit hook so page, scripts and the version check always agree."""
import re, time, json
from pathlib import Path
root = Path(__file__).resolve().parent.parent
b = time.strftime("%Y%m%d%H%M%S")
for name in ("index.html", "handbook.html", "paper.html"):
    p = root / name
    if not p.exists(): continue
    s = p.read_text()
    s = re.sub(r'<meta name="build" content="[^"]*">', f'<meta name="build" content="{b}">', s)
    s = re.sub(r'((?:src|href)="(?!https?:)[\w./-]+\.(?:js|css))(?:\?v=[\w]+)?"', rf'\1?v={b}"', s)   # also stamps new scripts
    p.write_text(s)
(root / "version.json").write_text(json.dumps({"build": b}))
print("build", b)
