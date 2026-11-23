# Round 8: one new test per species, rules fixed before any new data

Written 2026-11-23, before any data for these tests was fetched. Proposals came from three specialist reviews (orca,
blue/fin, humpback) and one adversarial review; the lead developer chose. Pass marks are unchanged from earlier steps.

## Counting tests (multiplicity)

Pre-registered detector tests so far: step 3 (2 models), DCLDE whalu (2), 7a (2), 7c (2 species × 3 measures),
7e (2 measures), 7f (1). Round 8 adds **one primary test per species** (8a, 8b, 8c) plus one equivalence check (8.0).
The page states how many tests were run. A pass in round 8 is reported together with every earlier fail.

## 8.0 Pi equivalence (before any Mac result is called a Pi result)

The Pi re-scores the 300 step-7f clips with the humpback model from the same archive bytes.
Pass: max |score difference| ≤ 0.001 for every clip and second, and identical song/no-song decisions.
The step-7e orca blocks follow after the cooler (≈ 7.7 h of audio through Perch; too hot without it).

## 8a Orca: frozen model, stricter counting rule, new blocks only

- Model frozen: models/orca_lr.joblib, sha256 760fb809bbf4194a0199cf7e6ad6383bd196cef9ea4bd9076dd4796a9afd90e6.
- **Primary rule: a 10-minute block is "orca" if at least 3 windows score ≥ 0.9.** This rule was chosen after seeing
  step 7e, where it would give recall 22/24 and false alarm 1/22; that is why it is tested only on new blocks and never
  reported as a 7e result. The old rule (≥ 3 windows ≥ 0.5) is reported alongside.
- Data: Orcasound live-feed archive, block start times from **2026-11-24 00:00 UTC** onward.
  - Event block: 2 min before the first human report of orcas (description mentions orca/killer whale/SRKW/J/K/L pod/
    Bigg's/transient/resident) in a cluster; at most one event block per feed per 12 h.
  - Quiet block: same feed, start drawn at random within ±7 days of its event, at least 6 h from any **human** whale
    report on **any** feed. Two quiet blocks per event.
  - Blocks without at least 590 s of audio are skipped and counted.
- Pass: recall ≥ 0.70 **and** false alarm ≤ 0.10.
- Decided once, when ≥ 30 event and ≥ 60 quiet blocks are scored, or on 2027-02-28 if that comes first
  (then "not enough data" unless the minimums are met).
- Known limits: with 60 quiet blocks a detector with a true false-alarm rate of 0.10 passes about 6 times in 10; blocks
  from one encounter are not independent (reported per encounter as well). Unreported orcas in quiet blocks count as
  false alarms. A blind listen by the owner to every firing quiet block, mixed with as many non-firing ones, is
  reported as secondary information only and never changes the verdict.

## 8b Humpback: a properly powered second listening round

- Pool: 3,000 random 10 s MARS clips (16 kHz), seed 893, reference period 2015-07-29 to 2021-06-30, days used in 7f
  excluded; scored with the humpback model (max of 7 one-second scores).
- Sample for the owner: **300 clips with max score < 0.3 and 150 with ≥ 0.3** (50 in 0.3-0.7, 40 in 0.7-0.9, 60 ≥ 0.9),
  shuffled together, plus 40 hidden repeats of sampled clips. No scores, dates or strata shown.
- Labelling page: answer buttons unlock only after one full playback; sessions of at most 50 clips.
- Primary measure: balanced accuracy of the model (song if max ≥ 0.7) against the owner, **weighted back to the pool**
  (weight = stratum share of pool ÷ stratum share of sample); unsure excluded from both sides and reported.
- Pass: weighted BA ≥ 0.80. Decidable only with ≥ 40 yes labels, ≥ 300 labelled clips in the < 0.3 stratum
  (unsure not counted) and owner test-retest Cohen's kappa ≥ 0.6 on the 40 repeats; otherwise "labels too unreliable"
  or "not enough song to judge". Precision (weighted) is reported next to BA.

## 8c Blue and fin: MBARI's call index from 6 hours per day instead of 1

- Diagnostic done first (no download): on the 300 days judged in 7c, MBARI's own daily values peak in **November**
  for both species (blue top 3: Nov, Oct, Sep; fin: Nov, Oct, Dec). The Oct-Dec mark is fair; the Pi's September
  peak is a weakness of its one-hour sampling or computation.
- Days: docs/round8-ci-days.json, 204 MBARI reference days (17 per month), seed 8003, the 300 judged days excluded.
  These days were already processed once by the one-hour job, so they are not unseen; the 6-hour method has no
  free parameter tuned on them.
- Method: as step 7c (2 kHz archive, Welch, Hann 2000, dB averaging, same bands), but averaged over 6 hours per day
  at 00, 04, 08, 12, 16, 20 UTC (byte ranges only, about 26 GB in total, streamed and discarded).
- Pass, per species, unchanged from 7c: Spearman ≥ 0.60, presence BA ≥ 0.80 (call index ≥ 1.01), peak month of the
  monthly mean in October-December. A fail is final for this method.
