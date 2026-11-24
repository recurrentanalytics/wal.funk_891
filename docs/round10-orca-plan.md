---
title: "Round 10: orca model with station noise as counter-examples"
date: 2026-11-24
type: plan
status: active
tags: [wal.funk_891, test, round10, orca]
---

# Round 10 plan: orca model retrained with station noise as counter-examples

Written 2026-11-24, before any audio for this round was fetched. Pass marks unchanged from 7e, 8a and 8a-r.
Runs on the Mac mini; labelled preliminary until the Pi reproduces it.

## Why

Step 7e and round 8a-r failed on false alarms, not on recall (8a-r: recall 0.85, false alarm 0.175).
Half of the 8a-r false alarms came from one feed (Bush Point, 7 of 14 quiet blocks).
The orca model was trained on one hydrophone in 2017 (Orcasound Round 3); it has never heard the background noise of
the other live feeds. This round adds that noise as counter-examples. It is a new model and a new test; a pass does not
change 7e, 8a-r or 8a (8a keeps the frozen old model).

## Data, split by time (no block shared, no day shared)

Source: Orcasound live-feed archive (HLS), streamed and discarded; only Perch embeddings and scores are kept.
Human reports: the snapshot already saved for 8a-r (`results/round8ar/plan.json`, 7,246 human reports, fetched
2026-11-23), so the candidate list cannot change after this plan.

| Part | Dates (UTC) | Used for |
|---|---|---|
| Train | 2023-06-22 to 2024-12-31 | counter-examples only (quiet blocks) |
| Validation | 2025-01-01 to 2025-12-31 | choosing the score threshold, go/no-go |
| Test | 2026-01-01 to 2026-11-23 | touched once, after the model is frozen |

Excluded everywhere: any time within 1 day of a step-7e or 8a-r block (event or quiet) on the same feed.

- **Counter-examples (train):** per feed, 20 random 10-min blocks in the train period, ≥ 6 h from any human whale report
  on any feed. Every 5 s window in them is labelled "no orca". Feeds with audio in the train period: 7
  (Andrews Bay starts 2025-10-17 and gets none) → at most 140 blocks. Blocks without ≥ 590 s
  of audio are replaced by the next draw (at most 400 draws per feed).
- **Events (validation and test):** the 8a-r candidate clusters not yet used (249 after order 78; 237 after the
  1-day exclusion), in their seeded order (seed 8801), at most 8 per feed. Validation: **30 events** from 2025
  (49 available under the cap). Test: **40 events** from 2026 (45 available under the cap); if audio gaps leave fewer,
  all available are used.
  Event block = 2 min before the first human orca report of the cluster. Events without audio are skipped and counted.
- **Quiet blocks (validation and test):** 2 per event, same feed, random within ±7 days but inside the same part,
  ≥ 6 h from any human whale report on any feed.

## Model (fixed now, nothing else is tried)

Same as step 3: Perch v2 embeddings (5 s windows, 1,536 values), StandardScaler + logistic regression
(class_weight balanced, C = 1.0). Training set = the original Round 3 training windows (unchanged) **plus** all
windows of the counter-example blocks as "no orca". No other model, feature or setting is tried.

**Sanity gate before validation:** the new model must still reach balanced accuracy ≥ 0.80 on the step-3 test set
(the old model: 0.945). If not, the round stops: "counter-examples broke call detection".

## Block rule and threshold (chosen on validation only)

A 10-minute block is "orca" if **at least 3 windows score ≥ τ**.
τ is chosen on validation from {0.5, 0.6, 0.7, 0.8, 0.9, 0.95, 0.99}: the **lowest τ with validation false alarm
≤ 0.05**. Go to test only if validation recall at that τ is ≥ 0.70; otherwise the round stops on validation
("no threshold works") and the test set is never opened.
Model file and τ are committed with their sha256 before any test block is scored.

## Test pass marks (unchanged)

| Measure | Pass mark |
| --- | --- |
| Recall (events found) | ≥ 0.70 |
| False alarm (quiet blocks firing) | ≤ 0.10 |

Decidable only with ≥ 30 test events and ≥ 60 test quiet blocks; otherwise "not enough data".
Reported alongside, never changing the verdict: the old frozen model with the 8a rule (≥ 3 windows ≥ 0.9) on the same
test blocks, results per feed, and per encounter.

## Counting tests

Round 10 adds one test. The page lists it with every earlier orca result (step 3 pass, 7e fail, 8a-r fail, 8a pending).

## Known limits

- Labels come from human reports, not from listening: an event block may hold no calls, a quiet block may hold
  unreported orcas (then it counts as a false alarm, and as a wrong counter-example in training).
- Andrews Bay has no counter-examples (no audio before 2025-10-17) but up to 8 test events: it tests a feed the new
  model has never heard. Reported separately.
- Feeds with few events (Point Robinson, Mast Center, Bush Point in 2026: 1, 5, 4 candidates) are thinly tested.
- The test period is 2026 only; with 80 quiet blocks a detector with a true false-alarm rate of 0.10 passes about
  half the time.
- Cost: about 350 ten-minute blocks streamed (≈ 9-10 h on the Mac), nothing stored but embeddings.

## Result (Mac mini, preliminary, 2026-11-24): stopped on validation

- Counter-examples: 140 blocks (20 per feed, 7 feeds; Andrews Bay none), 16,800 windows.
- Sanity gate passed: step-3 test balanced accuracy 0.942 (≥ 0.80; old model 0.945).
  Model sha256 25fe0e522c3ca09e0624b41cd95a6278149b6dfd3f10fa7adfb515e3cde16f47.
- Validation 2025, 30 events and 60 quiet blocks (1 event without audio skipped):

| τ | 0.5-0.9 | 0.95-0.99 |
|---|---|---|
| Recall | 0.667 (20/30) | 0.633 |
| False alarm | 0.033 (2/60) | 0.033 |

  Chosen τ = 0.5 (lowest with false alarm ≤ 0.05); recall 0.667 < 0.70 → **stopped, test set not opened.**
- For comparison, the old model with the 8a rule on the same validation blocks: recall 0.767, false alarm 0.117.

What this shows: the counter-examples did what they were meant to do on false alarms (0.117 → 0.033) but cost
recall (0.767 → 0.667); the scores became nearly all-or-nothing (the threshold hardly matters). It missed the go mark
by about one encounter. Per the rules nothing is retuned on these 2025 blocks; the 2026 test blocks stay unopened and
can be used by a later, separately registered round.
