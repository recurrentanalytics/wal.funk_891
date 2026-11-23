---
title: "Step 7c: MBARI call index on the Pi"
date: 2026-11-23
type: plan
status: done
tags: [wal.funk_891, test, step7c, blue, fin]
---

# Step 7c plan: MBARI's own blue and fin whale call index, on the Pi, checked against MBARI's published values

Written 2026-11-23, before any call index was computed. Pass marks are fixed here and not changed after seeing results.

## Why

This is the comparison layer the brief asks for: before anything the Pi hears is called unusual, the Pi must
reproduce what MBARI already reports. The call index (CI) is MBARI's published measure of blue whale B-call song
and fin whale 20-Hz song at MARS. It is cheap (no neural network), so it can run beside the sampler.

## Method (copied from MBARI's production code, not invented here)

Source: Ryan et al. 2025, PLOS ONE 20(2): e0318624, code and data https://doi.org/10.6084/m9.figshare.24977925.v1
(CC BY 4.0; scripts `Blue_Fin_CIbasis_parallel.m`, `Blue_Fin_DailyCI.m`).

- Audio: MBARI's 2 kHz decimated archive (`s3://pacific-sound-2khz`, daily `MARS-YYYYMMDDT000000Z-2kHz.wav`),
  range request for the same rotating hour the sampler uses ((7·d) mod 24 UTC). 21.6 MB per hour, streamed and discarded.
- Samples scaled to ±1 and multiplied by 3 (volts). 5 s bins. Bins with more than 10% zero samples are dropped (missing data).
- Per bin: Welch PSD, symmetric Hann window of 2,000 samples (MATLAB `hanning`), nfft 2,000 (1 Hz), 50% overlap.
- Calibrated: 10·log10(psd) − cal, with cal = −168.8 dB before 2017-06-13 and −177.9 dB from then on.
- Bins averaged **in dB** over the hour (MBARI averages over the day; one hour is what the Pi samples).
- Blue CI = mean(dB at 42, 43 Hz) / mean(dB at 37, 50 Hz). Fin CI = mean(dB at 20, 21 Hz) / mean(dB at 12, 34 Hz).
  The 43–44 Hz blue variant (MBARI notebook, Oestreich et al. 2020) is stored too but not used for pass marks.
- Presence: CI ≥ 1.01 (MBARI's threshold).

Differences from MBARI, stated before running: one hour instead of a whole day; no 5-day smoothing; no solar-elevation grouping;
no manual QC. All of these make the Pi's value noisier than MBARI's, so they can only make the checks below harder.

## Reference

MBARI's published daily series `Blue_Fin_DailyCI.mat` (smoothed and quality-controlled), 2015-07-29 to 2021-06-30.

## Pass marks (per species, on sampled days that have a valid MBARI daily value)

| Measure | Pass mark |
| --- | --- |
| Spearman correlation, Pi hourly CI vs MBARI daily CI | ≥ 0.60 |
| Agreement on presence (both at threshold 1.01), balanced accuracy | ≥ 0.80 |
| Peak month of the Pi's monthly mean CI, whole sample 2015–today | October, November or December (MBARI: November) |

Judged when at least 300 sampled days fall in the reference period; until then results are shown as "interim".

## Stopping rule

A species that fails: its CI is not shown as whale activity on the public page, and the difference is reported.
Both pass: the page shows the Pi's blue and fin whale song calendar, with MBARI credited for the method.

## Operation

`scripts/call_index.py`: one hour per day, same order as the sampler, one download at a time, resumable
(results/ci/ci.jsonl, one line per day). Pinned to core 3, nice 15. MBARI reference converted once to results/ci/mbari_daily_ci.csv.

## Addendum 2026-11-23, after one interim look (288 reference days, below the 300 needed)

An interim score was run at 288 reference days (blue: Spearman 0.67, presence BA 0.795; fin: 0.82, 0.799; peak month October for both).
Because presence agreement sits right at the pass mark, the moment of judging must not be chosen by me. Rule fixed now:
the verdict uses **the first 300 reference days in the order they were computed** (line order of results/ci/ci.jsonl);
the peak month uses all sampled days at that point. Scores on later, larger sets are reported as additional information only.
