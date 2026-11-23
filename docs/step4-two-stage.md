---
title: "Step 4: two-stage detector"
date: 2026-11-23
type: plan
status: done
tags: [wal.funk_891, test, step4]
---

# Step 4 design: two-stage detector — feasibility test plan

Written 2026-11-23, before any measurement on MBARI audio. Owner chose the two-stage route.

## Why

Perch 2.0 passed Step 3 (balanced accuracy 0.945) but embeds at 1.4× real time on
3 throttled cores. Step 4 needs ≥ 10× real time on ≤ 3 cores. Most ocean audio
holds no call, so a cheap first stage decides which windows Perch must hear.

## Design

**Stage 1, every window (cheap):** flag a 5 s window (2.5 s hop) if EITHER
- the whalu multispecies model gives any of its 12 classes a score ≥ 0.10, OR
- band energy stands out: in either band, 10–200 Hz (baleen) or 500–8,000 Hz
  (toothed whales, other sounds), the window's mean log power is ≥ 3 robust
  standard deviations (median/MAD over the hour) above that hour's median.

The energy rule is species-agnostic, so unusual sounds reach Stage 2 even when
whalu has no class for them (it missed every orca call in Step 3). This keeps
Goal 1 ("find something nobody was listening for") possible.

**Stage 2, flagged windows only:** Perch 2.0 embedding (1,536 numbers), stored.
Classifiers (orca now; baleen later) and novelty search run on the stored embeddings.

## What this measurement is

One hour of MBARI Pacific Sound 16 kHz, fetched with one range request (~172 MB),
deleted afterwards:

- File: `2020/11/MARS-20201115T000000Z-16kHz.wav`, first hour (00:00–01:00 UTC).
  Chosen in advance: November has humpback song on every day 2015–2021 (Ryan et al. 2025),
  and blue and fin whales are in season.

Measured, all pinned to 3 cores (`taskset -c 0-2`):

1. Stage 1a: whalu over the whole hour — wall time, × real time.
2. Stage 1b: band-energy rule over the whole hour — wall time, × real time.
3. Fraction of windows flagged by the rule above (thresholds fixed here, not tuned).
4. Stage 2: Perch on flagged windows only — wall time.
5. Combined speed = audio duration / (1a + 1b + 2 wall time).
6. Peak RAM, temperature every 30 s, throttle flags.

## Pass marks for this design (fixed now)

- **Combined speed ≥ 10× real time on ≤ 3 cores.** If not, the design fails as is.
- Peak RAM < 8 GB.
- Temperature < 75 °C and zero new throttle flags are the Step 4 gate. They are
  reported, not waived. Without a fan they are expected to fail at full load;
  that is a separate finding for the owner.

## Not measured here (and therefore not claimed)

- Stage 1 recall: there are no human labels for this hour. The fraction of whalu's
  own ≥ 0.5 detections that Stage 1 keeps is 100% by construction and proves nothing.
  A real recall test needs labelled MBARI audio — next step if this one passes.
- Species results for this hour. Any detections are candidates only.
