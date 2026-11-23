---
title: "Step 7a: Perch on blue and fin calls"
date: 2026-11-23
type: plan
status: done
tags: [wal.funk_891, test, step7a, blue, fin]
---

# Step 7a plan: can Perch embeddings recognise blue and fin whale calls?

Written 2026-11-23, before any data for this step was downloaded. Pass marks are fixed here
and not changed after seeing results. Owner asked for "alles" (detectors, comparison, unattended operation).

## Why

The sampler stores a Perch 2.0 embedding for every 5 s window, but nothing yet decides whether a
window holds a blue or fin whale call (whalu failed Step 4b Part A: 0/240 blue D calls, 0/47 fin 40-Hz calls).
This step tests whether a small classifier on Perch embeddings can do it, on human labels.

## Data (NOAA, DCLDE 2015, `gs://noaa-passive-bioacoustic/dclde/2015/`)

Labels: blue whale **D calls** (Bm, D) and fin whale **40-Hz calls** (Bp, 40Hz), call level, by people.
Audio: the continuous 2 kHz FLAC files (`*_lf`), two per deployment, 20 files, about 12 GB in total.
Downloaded one at a time, used, deleted. The split follows DCLDE's own dev / eval split, which is by deployment and season:

| Use | Site | Deployment (label set) | Months |
| --- | --- | --- | --- |
| train | CINMS-B | 17 winter, 18 summer, 19 fall (`cinms-b_seasonal_annotations_lf_dev`) | 2011-12, 2012-06, 2012-11 |
| train | DCPP-A | 01 fall, 02 spring, 02 summer (`dcpp-a_seasonal_annotations_lf_dev`) | 2012-11, 2013-04, 2013-07 |
| train | DCPP-C | 01 winter (`dcpp-c_seasonal_annotations_lf_dev`) | 2013-01/02 |
| test | CINMS-B | 18 spring (`cinms-b_annotations_lf_eval`) | 2012-04/05 |
| test | DCPP-A | 01 winter (`dcpp-a_annotations_lf_eval`) | 2013-01 |
| test | DCPP-C | 01 fall (`dcpp-c_annotations_lf_eval`) | 2012-11 |

A label whose time is not covered by the downloaded audio is dropped and counted.

## Windows

- **Positive:** one 5 s window centred on the label's midpoint.
- **Negative:** 5 s windows from the same files whose centre is at least 30 s from every Bm or Bp label,
  drawn with numpy default_rng(20261123), twice as many as the positives of that split.
  Negatives are shared by both species; a window positive for one species is not used as a negative for the other.
- **Caps** (to keep Pi time near 4 hours): at most 600 positives per species per split, drawn with the same seed;
  all of them if fewer.
- Audio: 2 kHz, resampled to Perch's 32 kHz; embedding = Perch 2.0 CPU, 1,536 values, same as the sampler.

## Classifier

Per species: standardise, then logistic regression (scikit-learn, class_weight="balanced", C = 1.0), trained on
the train split only. Decision threshold: the one that maximises balanced accuracy on 5-fold cross-validated
scores **within the train split**. The test split is scored once with that threshold.

## Pass marks (per species, on the test split)

| Measure | Pass mark |
| --- | --- |
| Balanced accuracy | ≥ 0.80 |
| Recall (labelled calls found) | ≥ 0.70 |

Reported also: ROC AUC, precision, and results per test site.

## Known limits, stated before running

- DCLDE marks D calls and 40-Hz calls. At MBARI the dominant calls are blue whale **B calls** and fin whale
  **20-Hz pulses**, which are not labelled here. A pass shows that Perch embeddings carry low-frequency whale
  calls at all; it does **not** yet make a detector for B calls or 20-Hz pulses.
- Negatives may contain unlabelled calls (B calls, 20-Hz pulses, other species). That lowers measured accuracy, never raises it.
- Training audio is 2 kHz (nothing above 1 kHz). The sampler's MBARI embeddings are from 16 kHz audio.
  Whether a classifier trained here transfers to them is a **separate** question, tested in Step 7b before
  any classifier output is shown as a detection.
- DCLDE licence: not verified. Used for testing only; no DCLDE audio is redistributed.

## Stopping rule

- A species that fails: "Perch + linear classifier does not recognise <species> calls"; nothing built on it.
- Both fail: stop and report; MBARI's own call index (Step 7c) becomes the only blue/fin measure.

## Operation

The sampler timer is stopped during this run (heat, CPU) and restarted afterwards. Same heat guard as the
sampler (pause above 78 °C, owner exception 2026-11-23). Results: `results/step7a/`, docs/STATUS.md.

## Addendum 2026-11-23, before any result of this step: computed on the owner's Mac mini

Owner decision 2026-11-23: run the model tests on the Mac mini (Apple M4, arm64) instead of the Pi, to get results in hours
rather than days without a cooler. Nothing else changes: same script (only a WL_ROOT path variable and a heat-guard fallback
that returns 0 °C where `vcgencmd` does not exist), same locked package versions (`uv.lock` from the Pi, `uv sync --frozen`),
same Perch 2.0 CPU model and classifier files, same seed, data and pass marks. Correctness does not depend on the machine;
speed and heat are not part of this step. Any partial Pi output of this step is discarded, not mixed in.
Results are copied back to the Pi repository and marked "computed on the Mac mini".

## Result (Mac mini, preliminary, 2026-11-23)

Computed on the Mac mini with the same packages, seed, data and pass marks; the Pi repeats it after the cooler.
Train 3,045 windows, test 3,600 (600 positive and 2,400 negative per species, sites CINMS-B, DCPP-A, DCPP-C).

| Species | Threshold (from CV) | Recall | Specificity | Balanced accuracy | ROC AUC | Pass mark | Verdict |
|---|---|---|---|---|---|---|---|
| Blue whale D calls (Bm) | 0.421 | 0.307 | 0.782 | **0.545** | 0.596 | ≥ 0.80 | FAIL |
| Fin whale 40 Hz (Bp) | 0.2045 | 0.588 | 0.707 | **0.647** | 0.670 | ≥ 0.80 | FAIL |

Perch 2.0 embeddings with a linear classifier do not separate these low-frequency calls well enough on the held-out
test. Not tuned afterwards. Raw numbers: data/step7a_mac.json on the page repo.
