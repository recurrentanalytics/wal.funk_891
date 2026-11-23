# Step 7f plan: the owner listens, the humpback model is checked against those labels

Written 2026-11-23, before any clip was drawn, listened to or scored. Pass marks are fixed here.
This is the independent second check named in step 7d ("the owner's 300 labels").

## Clips

- 300 clips of 10 s from the MBARI MARS archive (`pacific-sound-16khz`, 16 kHz), reference period 2015-07-29 to
  2021-06-30 (the period with MBARI's published daily humpback values).
- Drawn with a fixed seed (891): 25 clips per calendar month, each a random day of that month inside the period and a
  random start second of that day (not the first or last minute). A day whose file is missing, short or silent is
  replaced by the next draw from the same generator. Only the 10 s are downloaded (byte range), never a whole file.
- Stored for listening as MP3 (mono, 16 kHz, 48 kbit/s) on the page. Date, time and month are **not** shown on the
  labelling page; clips are numbered 1-300 in a shuffled order. The manifest that links a clip to its date and second
  is kept in this repository, not loaded by the page.

## Labelling

- The owner listens to each clip (spectrogram 0-4 kHz shown, loop and replay allowed) and answers:
  **yes** (humpback song or song units heard), **no** (none heard), or **unsure**.
- Reference recordings of humpback song (MBARI, NOAA) can be played at any time. No model score is shown.
- The owner is not a trained analyst. This is a lay listener check and is reported as such.
- Labels are kept in the browser and exported as a JSON file, which is committed here unchanged.

## Model decision per clip (fixed now)

Google humpback song CNN as in step 7d (10 kHz, 1 s step, context 3.9 s). Scores for the start positions 0-6 s of
the clip. A clip counts as **song** for the model if any score is ≥ 0.7 (MBARI's threshold).
Scoring is done only after all 300 labels are exported. First on the Mac mini (preliminary), later on the Pi.

## Pass marks (unsure labels excluded)

| Measure | Pass mark |
| --- | --- |
| Balanced accuracy, model vs owner | ≥ 0.80 |

Also reported, without a pass mark: recall, specificity, precision, the number of unsure labels, and the agreement
split by song season (October-January) and the rest of the year.
If fewer than 20 clips are labelled yes, the verdict is "not enough song to judge", not pass or fail.
