"""Screenshots of the page for the handbook, in every language (photos/hb/<view>-<lang>.jpg) plus data/screens.json.

Needs Google Chrome and a local server in this folder (python3 -m http.server 8765). Run after visible changes:
  uv run --no-project --python 3.12 --with "playwright>=1.49,<1.56" python tools/screenshots.py
Uses the installed Chrome (no browser download), software WebGL, a 1440x900 window; scrolls to each view and waits.
"""
import json, subprocess, sys, tempfile, time
from pathlib import Path
from playwright.sync_api import sync_playwright
root = Path(__file__).resolve().parent.parent
base = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8765/"
VIEWS = [("hero", "index.html", None, 4000), ("whales", "index.html", "lineup", 5000), ("canyon", "index.html", "bathy3d", 12000),
         ("results", "index.html", "results", 5000), ("game", "label.html", None, 5000), ("paper", "paper.html", None, 4000), ("handbook", "handbook.html", None, 4000)]
out = root / "photos" / "hb"; out.mkdir(parents=True, exist_ok=True)
tmp = Path(tempfile.mkdtemp()); shots = []
with sync_playwright() as p:
    b = p.chromium.launch(channel="chrome", args=["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--mute-audio"])
    for l in ("en", "de", "zh"):
        for name, page, target, wait in VIEWS:
            ctx = b.new_context(viewport={"width": 1440, "height": 900}); pg = ctx.new_page()
            pg.goto(f"{base}{page}?lang={l}", wait_until="load"); pg.wait_for_timeout(2500)
            if target:
                pg.evaluate("id => { const e = document.getElementById(id); if (!e) return; if (window.wlReveal) wlReveal(e); e.scrollIntoView({ block: 'start', behavior: 'instant' }); scrollBy({ top: -60, behavior: 'instant' }); }", target)
            pg.wait_for_timeout(wait)
            png = tmp / f"{name}-{l}.png"
            try: pg.screenshot(path=str(png), timeout=60000)
            except Exception as e: print("failed", name, l, str(e)[:80], flush=True); ctx.close(); continue
            ctx.close()
            jpg = out / f"{name}-{l}.jpg"
            subprocess.run(["sips", "-s", "format", "jpeg", "-s", "formatOptions", "72", "--resampleWidth", "1200", str(png), "--out", str(jpg)], stdout=subprocess.DEVNULL, check=True)
            shots.append({"view": name, "lang": l, "file": f"photos/hb/{jpg.name}", "w": 1200, "h": 750}); print("ok", name, l, jpg.stat().st_size, flush=True)
    b.close()
old = {(x["view"], x["lang"]): x for x in json.load(open(root / "data" / "screens.json")).get("shots", [])} if (root / "data" / "screens.json").exists() else {}
for x in shots: old[(x["view"], x["lang"])] = x
shots = list(old.values())
json.dump({"taken_at": time.strftime("%Y-%m-%d %H:%M"), "views": [v[0] for v in VIEWS], "shots": shots}, open(root / "data" / "screens.json", "w"), indent=1)
