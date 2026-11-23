---
title: "wal.funk_891 · project notes (home)"
date: 2026-11-23
type: index
status: active
tags: [wal.funk_891, index]
---

# wal.funk_891 · project notes

Open this folder (`docs/`) in Obsidian as a vault. Everything here is public on purpose: the rules for every test are
written before the data is touched, and anyone can check them against the results.

## Start here
- [[NEXT]] — what is open, in order
- [[STATUS]] — the running log, newest at the end
- Decisions: [[decisions/2026-11-23-mac-first-pi-paused]] · [[decisions/2026-11-23-round8-one-test-per-species]] · [[decisions/2026-11-23-no-data-requests]] · [[decisions/2026-11-23-public-notes-and-library]] · [[decisions/2026-11-23-crowd-answers-via-github]] · [[decisions/2026-11-23-magazine-at-the-end]]
- Sessions: [[sessions/2026-11-23-model-rounds-and-site]]

## Tests (rules fixed in advance)
| Step | Note | Verdict |
|---|---|---|
| 3 | [[test-plan]] | Perch + classifier on orcas: pass (BA 0.945); whalu: fail |
| 4 / 4b / 4c | [[step4-two-stage]] · [[step4b-plan]] · [[step4c-plan]] | speed and heat gates: fail without a cooler |
| 7a | [[step7a-perch-lowfreq]] | blue 0.545, fin 0.647: fail (Mac, preliminary) |
| 7c | [[step7c-call-index]] | blue: peak month September (fail), fin: BA 0.790 (fail) |
| 7d | [[step7d-humpback]] | open (needs 300 sampled days) |
| 7e | [[step7e-orca-orcasound]] | recall 0.958, false alarm 0.273: fail (Mac) |
| 7f | [[step7f-owner-labels]] | BA 0.914 but 19 < 20 yes: not enough song to judge |
| 8 | [[round8-plan]] | 8a orca, 8b humpback, 8c blue/fin, 8.0 Pi equivalence: running |
| 9 | [[round9-lowfreq-plan]] | low-frequency detector: clips drawn, labels next |

## Reference
- [[hardware]] — the Pi audit · [[LICENSES]] — every data source and its licence · [[archive-plan]] — the long-term plan
- Library of cited works: `../library/references.yml` (page: `library.html`, Zotero export in `../library/`)
- Data files beside the notes: `step7f-labels.json` (owner labels, unchanged), `step7f-manifest.json`, `round8-ci-days.json`

## Conventions
Every note starts with a YAML header: `title`, `date`, `type` (plan, decision, session, log, reference, index),
`status` (open, active, done), `tags`. Decisions and sessions are named `YYYY-MM-DD-topic.md`.
