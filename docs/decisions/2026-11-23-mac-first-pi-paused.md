---
title: "Everything on the Mac mini first; the Pi is paused"
date: 2026-11-23
type: decision
status: active
tags: [wal.funk_891, decision, pi, mac]
---

# Everything on the Mac mini first; the Pi is paused

**Decision (owner):** all tests and rounds run on the Mac mini first and are labelled "preliminary". What passes moves
to the Raspberry Pi, which must reproduce the numbers (equivalence check) and pass the speed/heat gate with the cooler.
Only then may the page say it runs on a Pi.

**Consequence:** the Pi's sampler timer is stopped and disabled, the equivalence run stopped; the Pi only reports its
health. The page shows "Pi paused". Step 7d (humpback vs MBARI, needs 300 sampled days) waits for the migration.

**Why:** the Mac is fast and cool; the project's claim is still that it runs on a Pi, so the Pi must reproduce, not
just receive, the results. See [[STATUS]], [[round8-plan]].
