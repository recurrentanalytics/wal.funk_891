---
title: "Step 4b: whalu as main detector"
date: 2026-11-23
type: plan
status: done
tags: [wal.funk_891, test, step4b, blue, fin]
---

# Step 4b plan: whalu as main detector, Perch only for the unusual

Written 2026-11-23, after Step 4 (two-stage) failed at 1.18× real time.
Nothing below has been run. Pass marks are fixed here and are not changed after
seeing results. Needs the owner's approval before Part A starts.

## Design

- **Stage 1 (every window):** whalu multispecies model, 5 s windows, 2.5 s hop.
  Its own default decision: a class counts at score ≥ 0.5.
- **Stage 1b (every window):** the band-energy rule from Step 4, unchanged
  (10–200 Hz or 500–8,000 Hz, ≥ 3 robust SD above the hour's median).
- **Stage 2 (only windows flagged by 1b):** Perch 2.0 embedding, stored for the
  orca classifier and for novelty search later. whalu's scores no longer decide
  what Perch hears.
- **Heat control:** a configuration is chosen from those measured in Part C.

## Part A: is whalu right about baleen whales? (correctness)

### Data

1. **DCLDE 2015 low-frequency evaluation sets** (NOAA, `gs://noaa-passive-bioacoustic/dclde/2015/`):
   people labelled blue whale **D calls** and fin whale **40-Hz calls** at Channel
   Islands (CINMS-B) and Diablo Canyon (DCPP-A), Southern California, 2012–2013.
   Only the `_eval` files are used for the test. The `_dev` files stay untouched.
2. **Owner-labelled MBARI sample:** 300 five-second windows drawn at random
   (fixed seed 20261123) from 12 MBARI hours, one per month of 2020, 00:00 UTC.
   The owner labels each as blue / fin / humpback / other / none on the review
   page, without seeing model scores. About 1–2 hours of listening.

### Known limits of the DCLDE labels (stated before running)

- They mark D calls and 40-Hz calls, not blue whale B calls or fin whale 20-Hz
  song, which dominate at MBARI. They test whether whalu hears these species,
  not every call type.
- Other call types were not labelled, so a "no label" window may still contain
  a whale. DCLDE therefore measures **recall only** (calls found). False alarms
  are measured on the owner-labelled MBARI sample alone.
- DCLDE licence: not verified yet. It is used for testing only and nothing from
  it is redistributed until the licence is checked.

### Pass marks (Part A)

| Measure | Data | Pass mark |
| --- | --- | --- |
| Recall, blue whale (D calls) | DCLDE eval | ≥ 0.70 |
| Recall, fin whale (40-Hz) | DCLDE eval | ≥ 0.70 |
| Balanced accuracy per species (blue, fin, humpback) | owner-labelled MBARI | ≥ 0.80 for each species with ≥ 20 labelled windows |

A species that fails is reported as "not reliably detected" and its counts are
not shown as findings. Species with < 20 owner-labelled windows: "not testable".

## Part B: how many windows reach Perch?

On the same 12 MBARI hours: fraction of windows flagged by stage 1b.
No pass mark; it feeds the speed calculation in Part C.

## Part C: speed and heat (the Step 4 gate, unchanged)

Gate from the brief: **≥ 10× real time on ≤ 3 cores, peak RAM < 8 GB,
temperature < 75 °C, zero new throttle flags.**

Three configurations, each run on the same 3 MBARI hours (2020-01-15 00:00,
2020-07-15 00:00, 2020-11-15 00:00 UTC), measured end to end including download:

| Config | Cores | Duty cycle |
| --- | --- | --- |
| C1 | 3 | continuous |
| C2 | 2 | continuous |
| C3 | 3 | 50%: work 60 s, pause 60 s |

A configuration passes only if it meets all four parts of the gate at once.
Temperature is the maximum over the run, sampled every 10 s; throttle flags are
read before and after (bits set during the run count, bits from earlier do not).

## Stopping rules

- **Part A fails for all three species:** whalu cannot be the main detector.
  Stop and report. Options then: Perch-only at lower coverage, a distilled small
  model, or the owner decides on a fan.
- **Part C: no configuration passes:** stop and report the best measured
  trade-off. Changing the heat limit or buying a fan is the owner's decision,
  not mine.
- **Both pass:** proceed to Step 5 (unattended design) with the passing
  configuration.

## Order and cost

1. Part A, DCLDE: about 4 hours of eval audio streamed, about 30 min on the Pi.
2. Part A, owner sample: the Pi prepares 300 clips (about 15 min); then the owner listens.
3. Parts B and C: 9 hour-runs, about 3–6 hours of Pi time in total.

Everything streams and is deleted after use. Results go to docs/STATUS.md and the public page.

---

## Addendum 2026-11-23 01:20, before any Part A run: exact rules

### DCLDE recall
- Label files: `dclde_2015_cinms-b_annotations_lf_eval` (234 blue D calls, 44 fin 40-Hz calls) and
  `dclde_2015_dcpp-a_annotations_lf_eval` (6 blue D, 3 fin 40-Hz). 287 calls in total.
- Audio: the continuous 2 kHz FLAC files covering those times (CINMS-B 18 spring: files starting
  2012-04-29 02:38:46 and 2012-05-03 18:28:46; DCPP-A 01 winter: 2013-01-10 18:01:52 and 2013-01-13 21:36:41),
  downloaded once (~2.3 GB) and deleted after the run. Time of a sample = file start in its name + sample index / rate.
- For each call: one 5 s window centred on the call's midpoint, resampled to whalu's 24 kHz.
- Found = whalu score for that species (Bm for D calls, Bp for 40-Hz calls) ≥ 0.5.
- Recall per species = found / labelled. Pass mark unchanged: ≥ 0.70 each. Scores reported as quantiles too.

### Owner-labelled MBARI sample
- Hours: 2020-MM-15 00:00–01:00 UTC for MM = 01…12 (MBARI Pacific Sound 16 kHz).
- 25 windows per hour, 300 in total: start times drawn with numpy default_rng(20261123), uniform over multiples
  of 2.5 s between 10 s and 3,580 s, without repeats within an hour.
- Each item shows 15 s of audio (5 s before and after); the label applies to the centre 5 s, which is marked.
  Audio fetched by range request (~0.7 MB per item).
- Owner ticks any of: blue, fin, humpback, other whale, none; or "unsure". Model scores are not shown.
- Scoring per species: positive = owner ticked it; predicted = whalu score ≥ 0.5 on the centre window.
  "Unsure" items are excluded. Balanced accuracy ≥ 0.80 for species with ≥ 20 positive items; otherwise "not testable".

### Deviation 2026-11-23, before any labels exist
2020-08-15 is missing from the MBARI archive. Rule added: if the 15th has no file, use the next later day
of that month that has one, 00:00–01:00 UTC. The random draws are unchanged (same seed, same order).

### Deviation 2, 2026-11-23, before any labels exist
2020-08-17 00:00–01:00 UTC is digital silence (max −91 dBFS), likely an outage. Rule added: a day counts as missing
if 10 s of audio at 00:30 UTC has a peak below 1e-4 (−80 dBFS); then the next later day is used. Draws unchanged.
