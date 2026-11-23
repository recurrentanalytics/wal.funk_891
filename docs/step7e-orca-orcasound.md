---
title: "Step 7e: orca classifier vs Orcasound reports"
date: 2026-11-23
type: plan
status: done
tags: [wal.funk_891, test, step7e, orca]
---

# Step 7e plan: does the orca classifier find orcas that people reported on Orcasound?

Written 2026-11-23, before any Orcasound audio for this step was fetched. Pass marks are fixed here.

## Why

The orca classifier (Step 3: Perch 2.0 + logistic regression, 0.945 on one labelled Orcasound day) is useless at MBARI
(it fires on 20–30 % of windows there). It was trained on Orcasound audio, so this is where it may work. This step tests it
on recent Orcasound recordings against what human listeners reported, before any live listening is built on it.

## Data

- Human reports: Orcasound's public detections API (live.orcasound.net/api/json/detections), last 60 days,
  `category = whale`, `source = human`, and a description matching `orca|srkw|killer|[jkl] ?pod|resident|transient|bigg`
  (case-insensitive). Reports on one feed less than 30 min apart form one **event**; event time = first report.
- Audio: Orcasound's HLS archive (`audio-orcasound-net`, CC BY-NC-SA 4.0), streamed and discarded.
- **Event blocks:** 10 minutes per event, from 2 min before the first report. At most 30 events, drawn with
  numpy default_rng(20261123) from all events, at most 10 per feed. An event without audio is dropped and counted.
- **Quiet blocks:** the same number of 10-minute blocks, one on the same feed as each event block, at a random time in the
  60-day period that is at least 6 h from any `whale` report (human or machine) on that feed. Same seed.

## Scoring

Each block: 120 windows of 5 s (no overlap), resampled to 32 kHz, Perch 2.0 embedding, the Step 3 classifier
(`models/orca_lr.joblib`), threshold 0.5 as trained. A block counts as **orca detected** if at least 3 windows score ≥ 0.5.

## Pass marks

| Measure | Pass mark |
| --- | --- |
| Event blocks detected (recall) | ≥ 0.70 |
| Quiet blocks detected (false alarm rate) | ≤ 0.10 |

Reported also: the same numbers for "≥ 1 window" and "≥ 10 windows", per feed.

## Known limits

- Human reports are incomplete: a quiet block may hold orcas nobody reported (raises false alarms), and a report may be
  late or about calls that faded (lowers recall). Both make the test harder, not easier.
- Reports of humpbacks are excluded by the description rule, but reports that say only "whale" are excluded too.

## If it passes

A live listener on the Orcasound Lab feed (pre-registered separately), whose hits are shown on the page beside the
human reports. If it fails: no live orca listening; reported.

## Operation

Sampler paused while this runs, same heat guard (owner exception, 78 °C). Results: results/step7e/.

## Addendum 2026-11-23, before any result of this step: computed on the owner's Mac mini

Owner decision 2026-11-23: run the model tests on the Mac mini (Apple M4, arm64) instead of the Pi, to get results in hours
rather than days without a cooler. Nothing else changes: same script (only a WL_ROOT path variable and a heat-guard fallback
that returns 0 °C where `vcgencmd` does not exist), same locked package versions (`uv.lock` from the Pi, `uv sync --frozen`),
same Perch 2.0 CPU model and classifier files, same seed, data and pass marks. Correctness does not depend on the machine;
speed and heat are not part of this step. Any partial Pi output of this step is discarded, not mixed in.
Results are copied back to the Pi repository and marked "computed on the Mac mini".

## Result (Mac mini, preliminary, 2026-11-23)

The first run lost all quiet blocks to a script bug (macOS "._" sidecar files on the external disk broke the temp-folder
cleanup, so every quiet block was recorded as "no audio"). Fixed (`unlink(missing_ok=True)`); every block skipped for
"no audio" was re-queued once; plan, model, threshold and pass marks unchanged. First-run records kept as
results/step7e/blocks.first_try.jsonl. 14 of 60 blocks still had no usable audio (gaps in the Orcasound archive).

| Rule | Recall (24 event blocks) | False alarm (22 quiet blocks) |
|---|---|---|
| ≥ 1 window ≥ 0.5 | 0.958 | 0.545 |
| **≥ 3 windows (pre-registered)** | **0.958** | **0.273** |
| ≥ 10 windows | 0.875 | 0.091 |

Pass marks: recall ≥ 0.70 (met), false alarm ≤ 0.10 (not met). **Verdict: FAIL.**
The ≥ 10 rule would meet both marks; it is reported, not adopted, because it was not the pre-registered rule.
Quiet blocks may hold orcas nobody reported, which raises false alarms (noted in the rules before the run).
