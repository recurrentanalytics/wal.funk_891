---
title: "Step 3 test plan: agreement with Orcasound labels"
date: 2026-11-22
type: plan
status: done
tags: [wal.funk_891, test, orca, step3]
---

# Step 3 test plan: agreement with Orcasound labels

Written 2026-11-22, before any model output on this data was seen.

## Data

`s3://acoustic-sandbox/labeled-data/detection/test/OrcasoundLab09272017_Test.tar.gz`
(95 MB, Pod.Cast Round 3 test split, Orcasound Lab node, 27 Sep 2017).
21 WAV files, 20 kHz mono, about 61 s each. `test.tsv` lists only positive
segments (start, duration) of Southern Resident killer whale calls. Everything
not listed is negative. Files with a single entry of duration ≤ 0.1 s are all
negative (per the dataset README).

## Model and windows

- whalu 0.1.1 as installed (`multispecies_whale` via perch-hoplite).
- Audio loaded the way whalu loads Orcasound: `librosa.load(sr=24000, mono=True)`.
- whalu's own `run_detections`: 5 s windows, 2.5 s hop. Called with
  threshold 0 only so every class probability is kept; the decision threshold
  below is applied afterwards.

## Labels per window

- **Positive**: the window overlaps labelled call segments by ≥ 1.0 s in total.
- **Negative**: no overlap at all with any labelled segment (> 0.1 s long).
- **Excluded**: overlap above 0 and below 1.0 s. The count is reported.

## Prediction per window

Positive if sigmoid(`Oo`) ≥ 0.5, whalu's default threshold. Only the orca
class counts for the gate.

## Agreement (the gate metric)

**Balanced accuracy** = (recall on positive windows + recall on negative windows) / 2.

Plain accuracy is not used for the gate. With about 4 negatives to 1 positive,
a model that never fires would get about 80% plain accuracy and pass.

**Gate: balanced accuracy ≥ 0.80.**

## Also reported, not part of the gate

- Plain accuracy, precision, recall, confusion matrix, and the always-negative
  baseline accuracy.
- The same metrics when a window counts as positive if any of `Oo`, `Call`,
  `Whistle` or `Echolocation` is ≥ 0.5.
- Clip-level agreement (orca present or absent per file): 21 files is too few
  to gate on.
- ROC AUC of the `Oo` score, to show whether a different threshold would help.
  The threshold is NOT changed to pass the gate.
- Inference speed on this data, and temperature and throttle flags.

---

# Addendum 2026-11-22 23:05: Perch 2.0 run (owner approved)

Written before any Perch output on the test set was seen. The gate is unchanged.

## Model

Perch 2.0 CPU build (`perch_v2_cpu` via perch-hoplite 1.0.1, Kaggle), 32 kHz,
5 s windows, 1536-d embedding. Perch has no orca class of its own, so a linear
classifier is trained on its embeddings.

## Training data

`labeled-data/detection/train/OrcasoundLab09272017_PodCastRound3.tar.gz`:
92 WAV files, 1.57 h. **Excluded: every file whose 5-minute source recording
(`data_source_id`) also appears in the test set: 44 files.** 48 files remain.

Remaining limitation: training and test are from the same day and node.
This test shows whether Perch embeddings separate calls here, not how well they
generalise to new places.

## Windows and labels

Same as the main plan, for both training and test: 5 s windows, 2.5 s hop,
positive at ≥ 1.0 s of call overlap, negative at zero overlap, otherwise excluded.
Audio loaded with `librosa.load(sr=32000, mono=True)`.

## Classifier

scikit-learn `StandardScaler` + `LogisticRegression(class_weight="balanced",
C=1.0, max_iter=5000)`. No hyperparameter search. Decision: predicted
probability ≥ 0.5. Trained once, on the training files only. The test set is
scored once.

## Gate

Unchanged: balanced accuracy ≥ 0.80 on the same 462 test windows.
Also reported: plain accuracy, precision, recall, ROC AUC, clip-level agreement,
speed, temperature and throttle flags.

Runs pinned to 3 cores (`taskset -c 0-2`).
