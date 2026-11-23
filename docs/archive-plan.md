---
title: "Long-term plan: every hour of the archive"
date: 2026-11-23
type: plan
status: open
tags: [wal.funk_891, plan, archive]
---

# Long-term plan: every hour of the archive (owner goal 2026-11-23)

The owner wants, in the long run, every hour of the MBARI archive (~99,900 hours since
2015, growing by 24 per day). This file records how that could work on the same Pi.
It is a direction, not yet a test plan: each stage gets its own written pass marks before it runs.

## The arithmetic

- Perch 2.0 on the Pi: about 1.2–1.4× real time on 3 cores (throttled). Every hour would take
  ~8–9 years of computing. Not feasible.
- whalu: 20× real time, but it failed on orcas and on the blue and fin calls tested so far.
- So the whole archive needs a model that is both accurate here and at least ~10× real time.

## Route: a small model taught by Perch (distillation)

1. **Teacher data:** Step 4c fills a store of Perch embeddings from one sampled hour per day,
   about 4,150 hours spread across every season and hour of day.
2. **Labels:** the owner's labels (300 windows from Step 4b), reviewed candidates, and
   human-labelled public sets where they fit (DCLDE, Orcasound).
3. **Student model:** a small network that reads a spectrogram and predicts Perch's embedding
   (or directly the class scores). Trained on the Pi in the background. Target size: well
   under 1 million parameters, so it can run at ≥ 10× real time on 2 cores.
4. **Pass marks before it replaces anything** (to be fixed in its own plan):
   agreement with Perch on held-out sampled hours, the same correctness tests Perch passed,
   speed ≥ 10× real time, and the brief's heat limits.
5. **Then:** the student listens to every hour; Perch re-checks only the student's candidates.

## Other levers, if the student falls short

- Run on more hardware (a second Pi or a desktop) — the owner's decision.
- Use MBARI's own 2 kHz decimated archive for the low-frequency species, which is
  8× less data than 16 kHz (availability to be checked).

## Stopping rule

If no student model reaches the pass marks after a reasonable effort, the system stays in
sampling mode, and the write-up says so.
