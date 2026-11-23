---
title: "Round 9: low-frequency detector for MARS"
date: 2026-11-23
type: plan
status: active
tags: [wal.funk_891, test, round9, blue, fin]
---

# Round 9 plan: a low-frequency detector for MARS (blue B calls, fin 20 Hz pulses)

Written 2026-11-23, before any clip for this round was drawn, labelled or scored. Pass marks fixed here.
Owner decision the same day: no data requests to MBARI or Orcasound; labels are made in this project.

## Why

Perch (built for birds, 32 kHz input) and whalu do not separate blue and fin calls (steps 7a, DCLDE). The calls that
dominate at MARS are blue whale B calls (about 43 Hz fundamental with harmonics, ~15-20 s units) and fin whale 20 Hz
pulses (about 1 s, repeated every ~10-30 s). Neither is what the DCLDE labels in step 7a mark (D calls, 40 Hz calls).

## Data

- MBARI MARS 2 kHz archive (`pacific-sound-2khz`), byte ranges only. Checked from headers only: daily files
  `YYYY/MM/MARS-YYYYMMDDT000000Z-2kHz.wav`, 518,400,332 bytes, PCM mono 2 kHz 24-bit (the format step 7c already reads).
- Clip unit: 60 s (long enough for one B call or several fin pulses), spectrogram 5-120 Hz.
- Three disjoint sets by **recording year** (no day shared, no neighbouring days leak):
  - train: 2016 and 2017
  - validation (choosing thresholds and stopping): 2018
  - test: 2019 and 2020, touched once
- Per set, clips drawn at random times with a fixed seed, 50 per calendar month in train and in test, 25 per month in
  validation (600 / 300 / 600 clips). The test clips are drawn and labelled now, but the model never sees them until the
  model and threshold are frozen and committed.

## Labels

- The owner labels each clip blind (no date, no model output): **B call yes / no / unsure** and **fin pulses
  yes / no / unsure**, on a labelling page with the spectrogram and the sound sped up 10× (so 20-45 Hz become
  audible). Buttons unlock after one full playback.
- Reference examples are shown from published descriptions of B calls and 20 Hz pulses.
- 40 hidden repeats across the sets measure test-retest agreement (Cohen's kappa).
- Unsure is excluded from training and from the test, and reported.

## Models (decided now, nothing else is tried on the test set)

1. Baseline, no training: band-energy ratio detectors (B: 40-46 Hz against 30-38 and 48-56 Hz; fin: 17-24 Hz against
   10-15 and 26-32 Hz), threshold set on validation.
2. Small CNN (about 50k parameters, TensorFlow) on PCEN spectrograms, 5-120 Hz, 60 s, one output per species.
   Trained on train, early stopping and threshold on validation.
The one carried to the test is the one with the higher validation balanced accuracy (per species), chosen before the
test is opened.

## Pass marks (per species, on the test set, unsure excluded)

| Measure | Pass mark |
| --- | --- |
| Balanced accuracy | ≥ 0.80 |
| Recall | ≥ 0.70 |

Decidable only with ≥ 30 yes labels for that species in the test set and owner test-retest kappa ≥ 0.6;
otherwise "not enough calls" or "labels too unreliable".
It must run on the Pi: inference time per hour of audio is measured and reported; no pass mark on speed.

## Where it runs (owner decision 2026-11-23)

Everything in this round runs on the Mac mini first and is labelled preliminary. If it passes, the frozen model moves to
the Pi, which must reproduce the test-set outputs (max score difference ≤ 0.001, identical decisions) and report its
speed with the cooler before the page says it runs on a Pi.

## What a pass would and would not mean

A pass means: the detector agrees with one careful lay listener on MARS B calls / fin pulses in held-out years.
It does not mean expert-validated detection, and it says nothing about other sites or call types.
