"""Take game answers from a GitHub issue into data/crowd/ and rebuild data/crowd_summary.json.

Runs in the GitHub Action .github/workflows/crowd-labels.yml. The issue body is untrusted input: it is only parsed as
JSON, validated field by field and never executed or passed to a shell. Prints 'ok <n>' or 'skip <reason>'.
"""
import json, os, re, sys
from pathlib import Path
root = Path(__file__).resolve().parent.parent
ev = json.load(open(os.environ["GITHUB_EVENT_PATH"]))
iss = ev.get("issue") or {}
title, body, num = iss.get("title") or "", iss.get("body") or "", iss.get("number")
if not title.startswith("[labels]"): print("skip title"); sys.exit(0)
m = re.search(r"```json\s*(\{.*?\})\s*```", body, re.S)
if not m: print("skip no json"); sys.exit(0)
try: d = json.loads(m.group(1))
except Exception: print("skip bad json"); sys.exit(0)
ids = set(json.load(open(root / "label" / "clips.json"))["clips"])
sess = str(d.get("session", ""))[:40]
if not re.fullmatch(r"[a-z0-9]{8,40}", sess): sess = f"issue{num}"
rows = []
for r in (d.get("labels") or [])[:400]:
    if not isinstance(r, list) or len(r) < 2: continue
    c, v = r[0], r[1]; ms = r[2] if len(r) > 2 and isinstance(r[2], int) else None
    if c in ids and v in ("yes", "no", "unsure"): rows.append([c, v, ms if ms is None else max(0, min(600000, ms))])
if not rows: print("skip no valid rows"); sys.exit(0)
out = root / "data" / "crowd"; out.mkdir(exist_ok=True)
json.dump({"issue": num, "created_at": iss.get("created_at"), "session": sess, "labels": rows},
          open(out / f"issue-{num}.json", "w"), separators=(",", ":"))
# summary over all files; one vote per session and clip (the latest file wins)
votes = {}
for f in sorted(out.glob("issue-*.json"), key=lambda p: int(re.findall(r"\d+", p.name)[0])):
    x = json.load(open(f))
    for c, v, _ in x["labels"]: votes[(x["session"], c)] = v
S = {}
for (s, c), v in votes.items(): S.setdefault(c, {"yes": 0, "no": 0, "unsure": 0})[v] += 1
json.dump({"answers": len(votes), "people": len({s for s, _ in votes}), "clips": S}, open(root / "data" / "crowd_summary.json", "w"), separators=(",", ":"))
print("ok", len(rows))
