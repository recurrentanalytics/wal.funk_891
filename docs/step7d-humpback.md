---
title: "Step 7d: humpback song vs MBARI"
date: 2026-11-23
type: plan
status: open
tags: [wal.funk_891, test, step7d, humpback]
---

# Step 7d plan: humpback whale song with MBARI's own method, checked against MBARI's published values

Written 2026-11-23, before any hour was scored for this step (one 5-minute timing test on 2019-11-10 06:00 UTC was run
to check that the model loads and how fast it is: 4.7× real time on one core). Pass marks are fixed here.

## Method (as published by MBARI, Ryan et al. 2025, PLOS ONE 20(2): e0318624)

- Model: Google's humpback whale song CNN (Allen et al. 2021), Kaggle `google/humpback-whale/tensorFlow2/humpback-whale/1`
  (the same model MBARI used; input 10 kHz, context 39,124 samples).
- The sampler's 16 kHz hour is resampled to 10 kHz and scored at a 1 s step (3,600 scores per hour), in 10-minute chunks
  with the heat guard between chunks.
- Song detected in a second: score ≥ 0.7 (MBARI's threshold, chosen by them to exclude gray whales and dolphins at ~0.3–0.6).
- Hourly metric: percent of seconds with score ≥ 0.7. MBARI's daily metric is the same percentage over a whole day.

## Reference

MBARI's published daily humpback metric (`WhaleDailyAcousticDetection.mat`, field `hump`, CC BY 4.0,
https://doi.org/10.6084/m9.figshare.24977925.v1), 2015-07-29 to 2021-06-30, converted to results/ci/mbari_daily_hump.csv.
MBARI's own rule for calling a day "with song" is **not verified** (every published day is above 0 %).
Here a day or hour counts as "with song" at **≥ 1 % of the time**, for both MBARI and the Pi. This is my choice, made now.

## Pass marks (on sampled days with an MBARI value)

| Measure | Pass mark |
| --- | --- |
| Spearman correlation, Pi hourly % vs MBARI daily % | ≥ 0.60 |
| Agreement on "with song" (≥ 1 %), balanced accuracy | ≥ 0.80 |
| Peak month of the Pi's monthly mean %, whole sample | October, November or December (MBARI: November, 46 %) |

Judged at ≥ 300 sampled days in the reference period; before that, "interim".
Known difference: one hour against a whole day; this can only lower agreement.

## If it passes / fails

Pass: the page shows the Pi's humpback song calendar beside blue and fin, crediting MBARI and Google.
Fail: not shown as whale activity; reported. The owner's 300 labels remain an independent second check either way.
