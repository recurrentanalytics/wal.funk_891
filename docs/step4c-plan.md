---
title: "Step 4c: sampling mode with Perch"
date: 2026-11-23
type: plan
status: done
tags: [wal.funk_891, test, step4c, pi, heat]
---

# Step 4c plan: sampling mode with Perch (owner decision 2026-11-23)

Owner decisions on 2026-11-23:
- A Raspberry Pi 5 Active Cooler is ordered.
- For now the Pi listens to a **sample** of the MBARI archive, not every hour.
- Long term the goal is **every hour** of the archive (see docs/archive-plan.md).

Nothing below has run. Pass marks are fixed here and not changed after seeing results.

## Why this changes the speed requirement

The brief's 10× real-time gate assumed every hour since 2015 (~99,900 hours).
With one sampled hour per day the archive is ~4,150 hours (2015-07 to 2026-11).
Perch 2.0 measured 1.2–1.4× real time on 3 throttled cores. Processing the sample
in about six months therefore needs roughly ≥ 1× real time sustained.

## Design

- **Sample:** one hour per calendar day, from 2015-07-28 to today and then daily.
  The hour rotates: day number d (days since 2015-07-28) uses UTC hour (7·d) mod 24,
  so every hour of the day is covered evenly over time. A missing or silent day
  (same rule as Step 4b) is skipped and logged, not replaced.
- **Windows:** 5 s, **no overlap** (5 s hop). Halves Perch's work versus Step 3.
- **Per window, stored:** Perch 2.0 embedding (1,536 values, float16), the orca
  classifier score (trained in Step 3), band energies as in Step 4. About 2.2 MB per hour,
  ~9 GB for the whole sample (215 GB free).
- **Not used as a detector:** whalu, unless the humpback part of Step 4b Part A passes.
- **Candidates for review:** windows whose embedding is far from everything seen so far
  (novelty), plus any orca score ≥ 0.5 (orcas are rare at MBARI, so every one is checked by ear).
- **Robustness:** one hour = one job; results written to a temporary file and renamed;
  a job that dies restarts from the last finished hour. Audio is streamed and discarded.

## Gate (measured after the Active Cooler is fitted)

Three sampled hours (2020-01-15, 2020-07-15, 2020-11-15, each at the hour the rotation gives),
end to end including download, pinned to ≤ 3 cores:

| Measure | Pass mark |
| --- | --- |
| Throughput, sustained over the three hours | ≥ 1.0× real time |
| Peak RAM | < 8 GB |
| Peak SoC temperature (sampled every 10 s) | < 75 °C |
| New throttle flags during the run | none |

The 75 °C and no-throttling marks are the brief's and stay unchanged.
If the configuration fails on heat, the same run is repeated with 2 cores, then with
a 50% duty cycle, in that order, and the first one that passes everything is used.
If none passes: stop and report.

## Not claimed

- The orca classifier was trained on Orcasound, not MBARI. Its scores at MBARI are
  untested; every orca candidate is checked by a person before it counts.
- Detections of baleen whales are not made in this step. They come from classifiers
  trained on Perch embeddings later (docs/archive-plan.md) or from whalu if it passes.

## Order

1. Write the pipeline (resumable, atomic) and run it on one hour as a smoke test (any time).
2. After the cooler is fitted: measure the gate.
3. If it passes: Step 5 (systemd timers, backlog worker, daily job) and Step 6 (seven-day trial).

## Addendum 2026-11-23, before any gate run: measure now, without the cooler

Owner decision 2026-11-23: the cooler will take a long time; carry on with the Pi now.
So the gate above is measured **now, on the passive heatsink only**. Pass marks, hours and the
order of fallbacks are unchanged. Clarifications fixed before the run:

- Ladder: 3 cores → 2 cores → 2 cores at a 50% duty cycle (after each block of windows the job
  sleeps as long as the block took). The first configuration that passes everything is used.
- A configuration counts as failed the moment it breaks a pass mark (e.g. the first 10 s reading ≥ 75 °C
  or a new throttle flag); the run is then stopped early to spare the board, and the next rung starts
  after the SoC is back below 50 °C.
- "New throttle flag" means one of the live bits 0–3 of `vcgencmd get_throttled` (under-voltage,
  frequency capped, throttled, soft temperature limit) set at any 10 s reading. The sticky bits 16–19
  are already set from the restart at 02:40 and cannot be cleared without a reboot.
- Every 10 s: SoC temperature, live throttle bits. Peak RAM: maximum resident memory of the job.
- Context, not part of the gate: the smoke test (3 cores, 2018-03-03) reached 88.9 °C, throttled,
  at 2.72× real time, and the Pi restarted by itself at 02:40 during the second smoke-test hour at ~90 °C.
- If no rung passes: stop and report. The sampler is then **not** run unattended, and the owner decides.

Correction 2026-11-23, still before any gate run: the "below 50 °C" start condition cannot be met; the idle SoC
on the passive heatsink reads 58–59 °C. Each rung starts once the SoC is **below 60 °C**. Pass marks unchanged.
Throughput (≥ 1.0× real time) and peak RAM are judged on the rung's three finished hours; gate hours are written to
results/step4c/gate_<rung>/, not into the sample store.

## Owner exception 2026-11-23, after the gate failed without the cooler

The gate failed on temperature at all three rungs (see docs/STATUS.md). Owner decision 2026-11-23:
run the sampler anyway until the cooler arrives, allowing the SoC up to 80 °C instead of the brief's 75 °C.
- This is an owner exception, not a pass. Step 4c stays **failed** until it is re-measured with the cooler against the unchanged marks.
- Configuration: 3 cores, pause whenever the SoC is above 78 °C (checked every 6 windows = 30 s of audio), resume below 65 °C,
  so the Pi stays below its own throttling point (80 °C). NVMe temperature is logged every minute and per hour.
- Unattended: cron every 15 minutes, flock so only one runs, at most 4 hours per start.
