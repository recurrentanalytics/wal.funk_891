---
title: "Status log"
date: 2026-11-22
type: log
status: active
tags: [wal.funk_891, log, status]
---

# Whale Listener: status

## 2026-11-22 · Step 1 hardware audit · PASS (with caveats)

Pi: emergence-pi5 (Pi 5 Rev 1.1), audited over SSH, read-only.

| Gate check | Measured | Result |
| --- | --- | --- |
| 64-bit OS | Debian 13 trixie, arm64 | pass |
| ≥ 20 GB free on / | 220 GB free (Samsung 256 GB NVMe) | pass |
| `get_throttled` = 0x0 | 0x0, EXT5V 5.006 V | pass |

Caveats:
- RAM is 7.9 GiB, not 16 GB as in the brief. Step 4 limit (8 GB peak) is now the whole machine.
- `emergence.service` crash-loops every ~4 s (no `/dev/fb0`), 315 restarts since boot. ~1 s CPU per restart. Must be stopped before benchmarking. Needs sudo: owner's call.
- 54–55 °C at near idle at 22:45, fan PWM 125/255 but tach reads 0 rpm. Fan presence not verified. Little room under the 60 °C night cap.
- Network is Wi-Fi only (eth0 down). MBARI bucket reachable: HTTP 200.
- `usb_max_current_enable=0`: PSU rating not verified.
- uv and git not installed. Python 3.13.5 present.

Next: owner decides on emergence.service, then Step 2 (install uv, whalu).

## 2026-11-22 · Pi cleared for Whale Listener · DONE

Owner: "get rid of everything on there, the whales have absolute priority".
- Backed up `~/emergence` (without .venv) and both unit files to the Mac:
  `~/coding/raspi-cellular-automata/_pi_backup_20261122/` (150 files, 247 KB).
- Disabled and deleted `emergence.service` and `emergence-http.service`, removed `~/emergence`.
- Pi home folder is now empty. OS, packages, NVMe and network untouched.

Idle baseline after cleanup (22:46–22:50, 7 samples, 30 s apart):
temp 54.9 → 50.5 °C, load 0.49 → 0.02, throttled 0x0 throughout.
Fan PWM 125/255 but tach 0 rpm in every sample: fan presence still not verified.
Night headroom under the 60 °C cap: about 10 °C.

Next: Step 2, install uv + git (apt, sudo for packages only), then whalu.

## 2026-11-22 · Cooling · owner confirms NO FAN

Passive cooling only. The PWM/0 rpm reading is the firmware driving an empty header.
Consequence: the night rule (keep fan off) is moot; the real limit is heat soak.
Step 4 gate (< 75 °C, zero throttle flags) is at risk for sustained 3-core inference.
Mitigation without hardware: fewer cores, duty cycling. Measure before deciding.

## 2026-11-22 · Step 2 environment · PARTIAL (gate not yet run)

- Installed on Pi: git 2.47.3, ffmpeg 7.1.5, libsndfile, uv 0.13.9 (user-level, no sudo).
- `~/whale-listener`: Python 3.13.5, whalu 0.1.1, TensorFlow 2.21.0, perch-hoplite 1.0.1.
  All prebuilt ARM64 wheels, no build from source. Install took 80 s.
- Lock file committed on the Pi: b6bc34f (uv.lock, 5291 lines).
- whalu uses Google's `multispecies_whale` model through perch-hoplite, downloaded from Kaggle on first run.
  Its CLI banner also says "Perch v2 + Gemma 4". Gemma's role is not verified.
- `whalu --help` and subcommand help run. Model load NOT run yet.
- Held because the SoC hit 61.5 °C at 22:55 from the install alone (night cap 60 °C).

Next: load the model and run `whalu info` after 08:00, or tonight with one core if the owner allows.

## 2026-11-22 · Owner decision: night 60 °C limit DROPPED

Reason: no fan, so there is no noise to avoid. Remaining heat limits: Step 4 gate (< 75 °C, zero throttle flags) and the Pi's own throttling.

## 2026-11-22 · Step 2 environment · PASS

| Check | Measured |
| --- | --- |
| `whalu info` | runs, 5.9 s, 0.7 GB RAM (prints dataset info only) |
| Model load (`multispecies_whale` via Kaggle, no login) | 22.4 s incl. download, 28 MB downloaded |
| Classes | Oo, Mn, Eg, Be, Upcall, Bp, Call, Gunshot, Echolocation, Bm, Whistle, Ba (12) |
| One 5 s window (cold) | 1.76 s, output 2 × 12 logits |
| Peak RAM | 1.37 GB |
| Temp / throttle | 60.9 °C / 0x0 |

Open points for Step 4: model expects 24 kHz, MBARI is 16 kHz, so audio gets resampled. Check how whalu does it. The cold single-window time is not a speed figure.

Next: Step 3. Write the agreement definition in docs/test-plan.md, then run on Orcasound labelled clips.

## 2026-11-22 · Step 3 correctness test · FAIL

Definition fixed before the run (docs/test-plan.md, Pi commit c95a3db 22:59):
balanced accuracy of `Oo ≥ 0.5` on 5 s windows, gate ≥ 0.80.

| Measure | Result |
| --- | --- |
| Windows scored | 462 (119 call, 343 no call), 21 excluded |
| Windows where the model fired | **0** |
| Balanced accuracy | **0.50** (gate 0.80) |
| Plain accuracy | 0.742, identical to "always say no" |
| ROC AUC of Oo score | 0.76: some ranking signal, scores tiny |
| Highest Oo score anywhere | 0.354; median on labelled calls 0.000 |
| Clip level | 11/21 (no better than chance) |
| Speed | 17.9× real time, 2 cores avg, 1.7 GB RAM |
| Heat | 66 → 79 °C in 72 s and still rising, throttled 0x0 |

Diagnosis (scripts/step3_diag.py):
- Audio level is normal (RMS ~0.01, peaks 0.2–0.4). Peak-normalising does not change scores.
- Model returns 2 frames per 5 s input (its own hop is 5 s). Row 2 is ~0; whalu uses row 1. Not the cause.
- Centred on labelled calls, every class stays ≤ 0.002. The model does not recognise these Southern Resident calls at this node.
- Not verified: whether this holds for other Orcasound data or for MBARI species.

Not changed: the threshold. Lowering it would be tuning to pass.

Heat risk for Step 4: no fan, 79 °C after 72 s. A day of audio takes far longer. Expect throttling at full load.

Next: owner decision. Options in the brief's order: Perch 2.0 via perch-hoplite (already installed), or test whalu on MBARI-relevant species before giving up on it.

## 2026-11-22 · Public status page · LIVE

https://recurrentanalytics.github.io/whale-listener-status/ (public repo recurrentanalytics/whale-listener-status, owner approved public).
- Pi pushes `data/status.json` every 30 min (crontab `*/30`, scripts/push_status.sh, log in logs/push_status.log).
- Write access: deploy key `~/.ssh/whale_status_deploy` on the Pi, valid for this one repo only (GitHub key id 170777698). Revoke it in the repo's Settings → Deploy keys.
- Published: temperature, throttle flags, job progress, step status. No audio, code, credentials, hostnames or location.
- Health logger now restarts after reboot (crontab @reboot).

## 2026-11-22/23 · Step 3 correctness (Perch 2.0) · PASS

Protocol fixed before the run (docs/test-plan.md addendum, Pi commit 4032966). Trained once, scored once.

| Measure | Result |
| --- | --- |
| Training | 48 clips, 1,066 windows (338 call), 44 same-source clips excluded |
| Test | 462 windows (119 call), 21 excluded |
| Calls found | 109 / 119 (recall 0.916) |
| False alarms | 9 / 343 (quiet recall 0.974), precision 0.924 |
| **Balanced accuracy** | **0.945** (gate 0.80) |
| ROC AUC | 0.987 |
| Clip level | 21 / 21 |
| Embedding speed | 2,940 s audio in 2,046 s = 1.4× real time on 3 cores, throttled at 83–90 °C |

Limitation (stated in advance): training and test come from the same day and hydrophone.
Sound map (t-SNE of embeddings): 90% of a call's 10 nearest neighbours are calls, vs 30% base rate.

Consequence for Step 4: Perch at 1.4× real time is far below the 10× gate, and heat is the binding limit.
A day of MBARI audio would take about 17 hours. Options: cheap first-stage detector + Perch only on flagged windows,
a distilled small model, fewer windows (no overlap), or a fan (hardware: owner's decision).

Public page redesigned 2026-11-23: playable minute with three listeners, species explorer, drawn map, sound map.
Pi push script fixed (it pulled before committing and failed from 23:33 to 23:59; now commits first; repo-local git identity set).
Whale facts and corrections: Upcall/Gunshot classes = North Pacific right whale; Eg in Pacific data = false alarm;
Google trained the detector partly on MBARI MARS audio.

## 2026-11-23 · Step 4 two-stage feasibility · RUNNING (interim)

Plan fixed before measuring: docs/step4-two-stage.md (Pi commit 6bba4c0, 00:06:51).
One hour MBARI, 2020-11-15 00:00–01:00 UTC, 172 MB range request.
- whalu over the hour: 20.0× real time (3 cores, 85–86 °C, throttled 0xe0006).
- Band-energy rule: 515× real time.
- Stage 1 flagged 1,418 of 1,439 windows (98.5%), all via whalu ≥ 0.10. Energy rule alone: 30 windows.
- Perch on flagged windows still running; combined speed expected ~1.7×, i.e. FAIL against 10×. Final number pending.
- whalu ≥ 0.5 in this hour: humpback 432, blue 125, fin 90 windows (candidates).

Public page additions 2026-11-23: descent story, three voice clips (humpback, blue, fin; blue/fin 10× faster),
live Orcasound player (HLS, CORS allowed, verified a live fragment loads), archive calendar (1 of ~99,900 hours),
review queue. Spectrogram check: fin clip energy 12–20 Hz (consistent); blue clip shows no clear 43 Hz band → marked doubtful.

Open archives elsewhere (survey 2026-11-23, details in session notes): NOAA NCEI gs://noaa-passive-bioacoustic
(NRS 12 sites incl. Arctic and Caribbean, SanctSound 30 sites; anonymous HTTPS; licence not verified),
OOI broadband 64 kHz + low-frequency 200 Hz (NE Pacific, near-real-time; licence not verified),
IMOS Australia 2008–2018 (CC BY 4.0, custom .DAT format), SmartBay Ireland (CC BY 4.0, 512 kHz),
AWI Weddell Sea on PANGAEA (CC BY 4.0), Ocean Networks Canada (free account + token). Nothing open found for Asia, Africa, South America.

## 2026-11-23 · Public page rebuilt in three languages

- All text in status-site/i18n/{en,de,zh}.json (306 keys). `tools/check_i18n.py` runs as a git pre-commit hook and blocks any commit with missing keys, empty values or mismatched placeholders.
- Language: ?lang=en|de|zh, saved choice, else browser language. Numbers formatted per language.
- New: at-a-glance tiles, dive with real GMRT sea-floor profile Moss Landing → MARS (straight line, not the cable route), world map of 59 open hydrophones from 7 archives (coordinates from each archive's metadata / FDSN).
- Pi now exports the pipeline as numbers so each language phrases it.
- Bug fixed: duplicate id "places" wiped the section.
- Checked live in EN, DE, ZH, phone and desktop; no console errors from the new version.

## 2026-11-23 · Step 4 two-stage feasibility · FAIL

| Measure | Result | Pass mark |
| --- | --- | --- |
| Stage 1a whalu | 180 s, 20.0× real time | – |
| Stage 1b energy rule | 7 s, 515× | – |
| Flagged by stage 1 | 1,418 / 1,439 (98.5%) | – |
| Stage 2 Perch on flagged | 2,876 s, 2.03 s/window | – |
| **Combined** | **1.18× real time** | **≥ 10×: FAIL** |
| Peak RAM | 4.3 GB | < 8 GB: pass |
| Temperature | 90.6 °C | < 75 °C: FAIL |
| Throttle flags | 0xe0006 | 0x0: FAIL |

Cause: whalu ≥ 0.10 fires on almost every window in a song-rich November hour, so stage 1 filters nothing.
Not changed after the fact: the 0.10 threshold. Next design needs owner approval and its own test plan.

## 2026-11-23 · Step 4b plan written · AWAITING OWNER APPROVAL

docs/step4b-plan.md: whalu as main detector, Perch only on energy-flagged windows.
Part A correctness: DCLDE 2015 eval labels (blue D calls, fin 40-Hz; recall ≥ 0.70) and a 300-window
owner-labelled MBARI sample (balanced accuracy ≥ 0.80 per species). Part C: three heat configs against the
unchanged Step 4 gate. Stopping rules defined. Nothing run yet.

## 2026-11-23 · Step 4b Part A (DCLDE recall) · FAIL for blue and fin

Rules fixed before running (docs/step4b-plan.md addendum, Pi commit 043ce8f).
| Species / call type | Labelled | Found (score ≥ 0.5) | Recall | Score quantiles 10/50/90 | Pass mark |
| --- | --- | --- | --- | --- | --- |
| Blue whale D calls (Bm) | 240 | 0 | 0.00 | 0.000 / 0.002 / 0.011 | ≥ 0.70: FAIL |
| Fin whale 40-Hz calls (Bp) | 47 | 0 | 0.00 | 0.000 / 0.000 / 0.001 | ≥ 0.70: FAIL |

Alignment check (not a pass mark): CINMS-B file is continuous (402,600 s = nominal span); the 13 blue D calls in it
are 4.9 dB louder in 25–90 Hz than ±60 s (13/13 louder) → timing correct. Fin 40-Hz: +0.5 dB, weak.
Possible reasons, not tested: whalu's Bm/Bp classes target other call types (B calls, 20-Hz song); 2 kHz HARP audio
lacks the bandwidth whalu saw in training. Thresholds not changed. Humpback: decided by the owner sample.
Sample: 2020-08-15 missing in the archive → next-day rule added before any labels existed.

## 2026-11-23 · Step 4b Part A (owner sample) · READY FOR LABELLING

Private review page: https://claude.ai/artifact/Qn2yqDBeX5UHDKHmvJspYq (only the owner can open it and write labels).
300 windows, 25 per month of 2020 (August from 2020-08-19: the 15th is missing, the 17th and 18th are silent; rules added
before any labels existed). Model scores stay on the Pi (results/step4b/sample/hidden_scores.json), not on the page.
Save path tested with one probe entry (written, read back, hidden from non-admin viewers, deleted).

## 2026-11-23 · Owner decisions · plans written

- Active Cooler ordered by the owner. The heat gate is measured again once it is fitted.
- For now: sampling mode, one rotating hour per day (docs/step4c-plan.md), Perch embeddings for every 5 s window,
  gate ≥ 1.0× real time sustained, < 8 GB, < 75 °C, no throttling.
- Long term: every hour of the archive (docs/archive-plan.md) via a small model taught by Perch.
- Archive start verified in the bucket: 2015-07-28 (first file MARS-20150728T000000Z).
- Step 4b Part A (humpback) still waits on the owner's labels.

## 2026-11-23 · Globe layers and fixes

- Fixed: a story fade rule had made all 3D scenes transparent (canyon, sound landscape); publish check now blocks it.
- Globe: surface currents from NOAA CoastWatch `noaacwBLENDEDNRTcurrentsDaily` (geostrophic, 1° subset, ~3 days behind, free to redistribute);
  the Pi fetches once a day inside push_status.sh (scripts/currents_export.py, 173 KB).
- Globe: GBIF cetacean records of the last 30 days (browser-direct, 1–3 weeks behind, mixed CC0/CC BY/CC BY-NC) and Orcasound whale
  detections of the last 48 h at the fixed hydrophones (CC BY-NC-SA).
- Deliberately not used: Acartia (near-real-time positions of endangered Southern Residents; needs the owner's explicit yes),
  WhaleMap (reuse forbidden), satellite-tag tracks.
- Sampling smoke test, first hour (2018-03-03 19h): 2.72× real time, 88.9 °C throttled. Orca classifier fired on 140/720 windows at MBARI:
  treated as false alarms until checked; it was trained on one Orcasound day only.
- 2026-11-23, owner decision: show Acartia Salish Sea sightings directly (no delay). Built as a globe layer, browser-direct from
  acartia.io/api/v1/sightings/current (CC BY 4.0). Observer names and comments are not shown; Be Whale Wise note and provider credit included.

## 2026-11-23 · Dashboard build 20261123024007

- New: info cards for clicked sightings, a fullscreen button on every visualisation, the surface currents as a faint page background,
  a re-rendered Monterey Canyon (576×425 depth grid, GMRT) and a dive ride along the canyon floor to the hydrophone (~52 km, 55 s).
- Tested on the live page (desktop width): canyon overview renders; dive runs, depth readout reached 628–645 m after ~20 s, light fades, lamp on.
- Not verified: fullscreen and info cards by click, the background flow, anything on a phone.
- Sampling smoke test: second of two hours still running (SoC 78.5 °C). Atlas build and crash test follow when it ends.

## 2026-11-23 · Renamed to wal.funk_891; unplanned Pi restart

- Owner decision: the project is now **wal.funk_891** (page title, header with a one-line explanation in en/de/zh, repo).
  New address: https://recurrentanalytics.github.io/wal.funk_891/ (repo recurrentanalytics/wal.funk_891). The old address returns 404.
  Pi clone points at the new repo; a push from the Pi after the rename worked. Local folder names on the Pi are unchanged.
- **The Pi restarted by itself at about 02:40 during the second smoke-test hour.** Last readings before it: 89.5 °C and 90.0 °C, throttled (0xe0006).
  `vcgencmd get_rsts` = 1000; no persistent journal, so the cause is not verified (heat or power supply are the candidates).
  5 V rail after restart: 5.03 V idle. Throttle flags since the restart: 0xe0000 (no under-voltage flag).
- State after the restart: the one finished hour (2018-03-03.npz) is intact, no partial file left, health logger came back via cron.
  The sampler did not come back (it was started by hand; no timer yet). It stays off until the cooler is fitted.
- The restart left NUL bytes in logs/health.csv, which broke dashboard_export.py and so the status push. The export now skips damaged lines.
- Atlas build and the planned crash test are still open.
- Click tests on the live page (desktop): fullscreen opens, fills the window and closes on all 11 views (atlas, galaxy and time-lapse
  still show their "being built" state). Info cards open for hydrophones and sightings. Fixed: sighting names came in the reporter's
  language (Danish "tumlare" on the German page); now the page language for our species, otherwise the scientific name.
  GBIF answered in 4–45 s tonight, so that layer can appear late. Background current field present. Phone: header checked only.

## 2026-11-23 · Step 4c gate, measured without the cooler: FAIL

Owner asked to carry on without waiting for the cooler. Gate measured as pre-registered (docs/step4c-plan.md, addendum), first gate hour 2020-01-15 00h UTC:

| Rung | Stopped after | Reason | Peak RAM |
| --- | --- | --- | --- |
| 3 cores | 89 s, 48 of 720 windows | 77.4 °C | 2.6 GB |
| 2 cores | 58 s, 24 windows | 75.2 °C | 2.6 GB |
| 2 cores, 50% duty | 140 s, 48 windows | 77.9 °C | 2.6 GB |

- No live throttle bits were set in any rung; temperature alone failed. RAM is far below 8 GB. Throughput not measured (no hour finished).
- On the passive heatsink the SoC idles at 58–60 °C, so there is only ~15 °C of headroom; even half-time computing on 2 cores crosses 75 °C within about 2 minutes.
- Per the plan: stop and report. The sampler is **not** started unattended. No rung was added after seeing the results.

## 2026-11-23 · Sampling under the owner's 80 °C exception; Step 5 basics; Step 7a started

- Owner decision: sample now, allowing up to 80 °C (docs/step4c-plan.md). Step 4c stays **failed** until measured with the cooler.
- First unattended hour (2022-01-18 02h): **1.4× real time** including heat pauses (1,540 s paused), peak SoC 79.0 °C,
  no live throttle bits, NVMe peak 33.9 °C, peak RAM 3.6 GB. At this pace the ~4,140 sampled days take about 4 months.
- Crash test PASS: sampler killed with SIGKILL mid-hour, restarted; no partial file was left and the hour was redone from the start.
- Step 5 (unattended): systemd user units replace cron (linger on, no sudo): `whale-sampler.timer` (5 min after boot,
  10 min after each run; at most 4 hours per run; flock), `whale-push.timer` (every 30 min), `whale-health.service` (restart always).
  Previous crontab saved to logs/crontab.before-systemd.txt. TensorFlow/perch log spam silenced; sampler logs go to the journal.
- The page's live line now shows sampled days and turns grey with "sampler stalled" if no new hour arrives for 3 h.
- Orca classifier at MBARI: 215/720 windows ≥ 0.5 in the second hour. Confirms it is not usable at MBARI; it stays unshown as detections.
- Step 7a pre-registered (docs/step7a-perch-lowfreq.md): Perch + logistic regression on DCLDE blue D and fin 40-Hz calls,
  trained on DCLDE dev, tested on DCLDE eval. Sampler paused while it runs (started 05:58).

## 2026-11-23 · Step 7c verdict: MBARI call index from one hour per day — FAIL (narrowly) for both species

Pi's hourly call index (MBARI's method, 2 kHz archive) vs MBARI's published daily index, first 300 reference days (rule fixed before judging):

| Species | Spearman (≥ 0.60) | Presence agreement, BA (≥ 0.80) | Peak month (Oct–Dec) | Verdict |
| --- | --- | --- | --- | --- |
| Blue (B call, 42–43 Hz) | 0.671 ✓ | 0.803 ✓ | September ✗ | FAIL |
| Fin (20 Hz) | 0.813 ✓ | 0.790 ✗ | October ✓ | FAIL |

- One interim look happened at 288 days; the judging rule (first 300 reference days in computing order) was fixed after it and before 300 was reached (addendum in docs/step7c-call-index.md).
- Reading: the Pi tracks MBARI's seasonal song well (correlations 0.67 and 0.81), but one hour per day is too noisy for the presence mark (fin) and shifts the blue peak a month early. Per the stopping rule, neither index is shown as whale activity on the public page.
- Step 7d (humpback, Google CNN in the sampler) and Step 7a (Perch on DCLDE) and Step 7e (orcas on Orcasound) are pre-registered and queued/running.
- Call-index backfill stopped once on a network read timeout (2,851 hours done) and was restarted (resumable). Information only, not the verdict:
  on all 1,559 reference days so far, blue Spearman 0.73 / presence BA 0.80, fin 0.86 / 0.82.
- Page (owner request): tapping a drawn whale now plays all its example sounds in a row: own clips (MBARI candidates for blue, fin,
  humpback; human-labelled Orcasound orca clip) plus NOAA Fisheries "Sounds in the Ocean" clips played from NOAA's site (not copied;
  NOAA gives no licence statement on that page, so nothing is redistributed). No free clip found yet for Bryde's and North Pacific right whale.
  Click-tested live (humpback: plays, chains to the NOAA clip, stops cleanly).
- Page correction (owner: the claim was false): the whale section no longer says "seven species the detector knows". It now reads
  "Eight whales, and what the Pi can really recognise", with a per-species status (failed / test running / only elsewhere / nothing tested)
  and the facts behind it. Glance tiles now say "reliably recognises: no whale species yet", days sampled, and heat as the open problem.
- North Atlantic right whale removed from the whale section (it never reaches the Pacific); the right whale entry is now North Pacific only. Seven whales remain.
- Whale section now shows evidence at our stations (owner idea): GBIF records since 2015 around MARS and the Orcasound hydrophones (snapshot 2026-11-23: humpback 51,508/6,705; orca 2,234/2,329; blue 1,853/0; fin 1,087/15; minke 27/111; North Pacific right whale 2/0 (two iNaturalist research-grade sightings, Monterey Bay, Mar 2023 and Mar 2026); Bryde's 0/0) plus acoustic records (MBARI published: blue, fin, humpback; Orcasound human reports: orca). Bryde's whale is hatched until a station records it.

## 2026-11-23 · Page: all living whale species, range and migration map (owner request)

- Species list: all 93 living cetacean species from Wikidata (CC0: names en/de/zh, IUCN status, photo), photos hotlinked from
  Wikimedia Commons with per-photo credit and licence. GBIF records since 2015 near MARS and the Orcasound hydrophones: **18 species**
  at our stations (incl. gray whale 17,711 off Monterey, Risso's dolphin 5,849, bottlenose dolphin, harbour porpoise, sperm whale,
  Baird's and Cuvier's beaked whales). These are drawn to scale (maximum length from the NOAA Fisheries species pages);
  the other 75 appear only on click, hatched, grouped by family (length from PanTHERIA, CC0, where known: 51 of 93 have a length).
- Range and migration map (routes.js): GBIF ad-hoc maps, cells of ~1.4°, month by month for the 18 station species, whole year for the rest.
  Play/pause, month slider, speed, trail, second species to compare, drag to turn, zoom, hover readout, fullscreen.
  Caveat on the page: records show where people reported whales, not where whales are. Data download still running (partial on the page).
- Temperature chart: 6/24/48 h buttons, hover readout with throttling, lines at 75 °C (brief), 78 °C (pause), 85 °C.

## 2026-11-23 · Model tests moved to the Mac mini; page in tabs

- Owner decision: run model tests on the Mac mini (Apple M4, 10 cores, 16 GB) "just to test the model". No emulation needed: both are
  arm64, so the Pi's locked environment installs natively (`uv sync --frozen`; TensorFlow 2.21.0, numpy 2.4.4, scikit-learn 1.9.1,
  librosa 0.11.0, scipy 1.17.1, identical to the Pi). Addendum committed to the 7a and 7e plans before any result.
  Speed and heat gates stay Pi measurements. The Pi's partial 7a output was moved to results/step7a_pi_partial/ (kept, not used).
- Pi: back to sampling (whale-sampler.timer), now with the humpback CNN scoring each hour (Step 7d).
- Page: six tabs plus a start page (Start, Dive, Whales, Places, Listen & try, Results, Machine); every section and old link kept
  (#whales, #finds, any element id opens its tab). Start page went from ~34,000 px of scrolling to ~2,900 px. 3D scenes size
  correctly when their tab opens (checked: canyon, globe, sound landscape, spectrogram, microscope, range map).
- First Mac start of 7a/7e failed before computing anything (my edit had commented out the OUT path line); fixed and restarted 09:5x. No result existed, nothing to discard.
- Owner decision 2026-11-23: the Mac mini is the lab (test code and models first); once the cooler is fitted, **every Mac result is
  recomputed in full on the Pi**, with timing, so the project can say it ran on the Pi. Until then Mac results are marked
  "computed on the Mac mini, preliminary". Mac working data lives on the owner's external disk: /Volumes/Data/wal.funk_891
  (README inside; nothing else on that disk is touched). Python environment stays on the internal disk.
- Page: previous/next buttons at the end of every tab; species names made consistent (Wikidata label, else Wikipedia article title; sentence case in English; simplified Chinese; the seven described species use the page's own names; Latin only where no common name exists: 2 species in Chinese). Range map now has data for all 93 species.
- Page back to one continuous scroll (owner: tabs felt blocky), now in six chapters: chapter cards, current chapter + progress line in the top bar, previous/next at each chapter end, folded reference blocks (steps, lab notebook, glossary, world-map sources), tighter dive story and whale lineup. Total ~30,300 px on a tall desktop window vs ~34,200 before plus the new content: about 12 % shorter, less than the third I had estimated. Build stamp now also covers newly added scripts (tabs.js/routes.js had been served from cache).

## 2026-11-23 · Page: consistency pass, live-ocean background, place photos, all 18 whales described alike

- Consistency: section numbers removed (chapters number now), step list and lab notebook brought up to date (DCLDE, no-cooler gate,
  80 °C exception, unattended operation, call index, humpback, Mac lab), chart note, queue text and full footer credits.
- Background sound: live Orcasound hydrophone (feed with the latest human whale report in the last 6 h, else Orcasound Lab), switch in
  the top bar, remembered; generated soundscape only as fallback. Fades out within ~0.3 s under any other sound (hooked on every
  media element's play(), plus the Web Audio microscope) and back in over ~1.5 s, measured with a level probe.
- Globe currents: about one fifth of the old speed by default, with a speed slider; page background flow slowed too.
- Places: five real photos (Moss Landing, NOAA 3D image of Monterey Canyon, Lime Kiln Point, Port Townsend, Point Robinson),
  Wikimedia Commons, credited per photo.
- Whales: all 18 drawn species now have the same detail: photo, sound description, pitch range (scale now up to 200 kHz),
  season (song for the baleen whales, presence for the others), status, station evidence, detection status, example sounds
  (NOAA public domain; MBARI MARS recordings on Freesound, CC BY-NC 4.0), sources. No freely usable clip found for northern right
  whale dolphin, Dall's porpoise, harbour porpoise (NOAA's clip is a SAMS recording, licence not verified), pygmy sperm whale and
  North Pacific right whale. Facts researched with sources; unverified ranges show "—".
- Pi: RackMate agent found (system service installed 2026-11-23 09:22, read-only health JSON on port 9105, not part of this project);
  left untouched, owner asked. Sampler resume threshold raised from 65 °C to 70 °C because the idle Pi now sits at 66–67 °C.
- Canyon: GMRT re-downloaded at maximum resolution (~49 × 61 m cells, 1728 × 1274) and baked into colour textures (sediment by depth, rock on steep walls, multi-scale relief shading) plus an object-space normal map; the 3D mesh stays at the old size. Textures load on the live page (HTTP 200); the visual result is not verified by me (background test tabs do not render WebGL).
- Canyon: shore flicker fixed (land and shallow seafloor kept clear of the water plane; near plane follows camera height);
  assumed procedural fine detail (ripples, rubble) only near the camera, labelled on the page as assumed, not measured.
- Dive: five stops with real material: NOAA photo of rockfish in Soquel Canyon (~60 m), CDFW ROV video Soquel Canyon (~215 m),
  MBARI "Dueling ROVs" (~650 m), NOAA/MBARI photo of sea pigs at 1,282 m (CC0), ROV footage at the MARS node (891 m). Videos are
  youtube-nocookie embeds that load only when played; the background sound fades out while one plays. Tested: the dive reaches
  the MARS stop.
- Chapter cards: big photos (NOAA blue whale, humpbacks in Monterey Bay, NOAA fluke) and slowly breaching low-poly wireframe whales.
- Research for the 75 hidden species was interrupted by API overload (529) and restarted.
- RackMate agent on the Pi: confirmed by the owner as theirs; stays.
- Chapter cards: procedural humpback (14 m adult, calf) drawn as an organic contour-line wireframe on a stylised sea; four slow-motion
  scenes (breach on a ballistic arc with real gravity at 0.3x, fluke-up dive after a blow, mother and calf, three whales from below),
  always swimming nose first. Not visually verified by me (the shared browser was in use).
- Dive: 110 s by default, pause, 0.5/1/2x, scrub along the route, drag to look around; camera ~20 m above the floor; assumed rocks,
  sea pens, fish schools, light shafts and glowing jellies along the route (labelled).
- All 93 species: the 75 not reported at our stations now have sound description, pitch range, range, status, sources (researched,
  translated to de/zh); 14 with a free example sound, 35 with an external listening link.
- Handbook page (handbook.html, linked from the start page and the footer): overview, architecture diagram, tech stack, data and
  licences, tests and notebook, operation, using the page, terms, limits, version; 145 text keys in each of en/de/zh. Facts are
  regenerated at every commit by tools/build_handbook.py (data/handbook.json); "Save as PDF" prints one chapter per page.
- Sampler resume threshold raised to 74 °C (pause stays at 78 °C): the idle Pi now sits near 70 °C, so with 70 °C it barely resumed (1 h, no hour finished). The interrupted hour restarts from scratch.
- Humpback: flexible spine (whole-body arch + travelling fluke wave); bends organically when launching, in the air, re-entering,
  rounding out to dive and while swimming; technical wireframe (gradient, node points, scan band, live readout: scene, L, v, z).
  Not visually verified by me.
- Every photo enlarges on click (lightbox, 1280 px from Commons); fullscreen added for temperature chart, Pi-vs-MBARI check, results,
  whale lineup and detail, place photos, voices, calendar and the humpback cards (22 fullscreen buttons in total).
- Real photos are pinned in the 3D canyon (Moss Landing, NOAA canyon image, rockfish in Soquel Canyon, sea pigs at 1,282 m; tap to
  open); the Moss Landing and canyon photo cards have "show in the 3D canyon", which flies the camera there.
- Results: new board at the top of the results chapter: all 21 pre-registered measures in four groups (orcas, blue/fin, humpback,
  the Pi), each with data, n, value against its pass mark as a bar, verdict and where it ran; KPI tiles (6 passed, 8 failed,
  6 running, 4 on the Mac). Source of truth: data/results.json, also read by the article draft.
- Article draft (paper.html, en/de/zh): abstract, introduction, data and methods incl. pre-registration, results with Table 1
  (generated) and Figure 1 (call index Pi vs MBARI, generated), discussion, limitations, data availability, references.
  Marked as draft, not peer reviewed; numbers update with every new result; print to PDF.

## 2026-11-23 — Step 7a result (Mac mini, preliminary) and page fixes

- Step 7a, Perch 2.0 + logistic regression on DCLDE 2015 (test 3,000 windows per species): blue whale D calls
  balanced accuracy 0.545 (recall 0.307, specificity 0.782), fin whale 40 Hz 0.647 (recall 0.588, specificity 0.707).
  Pass mark ≥ 0.80: **both FAIL**. Preliminary until the Pi repeats it. Step 7e (Orcasound reports) runs next on the Mac.
- Humpback motion rebuilt after cetacean kinematics: fluke beat as a wave travelling head to tail, amplitude smallest near
  the flippers and largest at the flukes (~0.2 L peak to peak), flukes pitching a quarter cycle out of phase; bends go into
  the lumbar region and tail stock, the head stays stiff. Fluke-up dive: the body slides through one entry point, the tail
  stock rises behind it and the flukes lift ~2–3 m clear, then slip in near vertically. Checked as still frames in a browser.
- Player bar now always visible (idle hint when nothing plays); "Share link" opens a panel that says what the link restores.

## 2026-11-23 — Step 7f: blind listening page for the owner's labels

- Rules written first: docs/step7f-owner-labels.md (300 clips × 10 s, 25 per calendar month, seed 891, reference period
  2015-07-29 to 2021-06-30; model "song" if any 1 s score ≥ 0.7; pass mark balanced accuracy ≥ 0.80, unsure excluded,
  fewer than 20 "yes" → "not enough song to judge").
- Clips drawn on the Mac mini by byte range from the public archive (10 s each, 16 replaced because missing/short/silent,
  274 distinct days), MP3 48 kbit/s, 18 MB, on the page under label/. Manifest (clip → date, second): docs/step7f-manifest.json,
  not loaded by the page. Script: scripts/step7f_clips.py.
- Page label.html (en/de/zh): spectrogram 0–4 kHz, play/loop, yes/no/unsure with keys J/N/U, reference song (MBARI, NOAA),
  progress grid, labels in the browser with download/load as JSON. No date, time or model score is shown.
- Results board: new pending row "humpback model vs your ears" and a link to the listening page.

## 2026-11-23 — Step 7f result (Mac mini, preliminary)

- Owner's 300 blind labels: 19 yes, 260 no, 21 unsure (file committed unchanged). Humpback model vs labels: recall 0.947,
  specificity 0.881, balanced accuracy 0.914. **Not enough song to judge** (19 < 20 yes labels), so no pass.
- Median 2.4 s between answers (clips are 10 s); noted in docs/step7f-owner-labels.md.
- Step 7e rerun: the first run lost all 30 quiet blocks to a bug (macOS "._" sidecar files on the external disk made
  the temp-folder cleanup fail); fixed (unlink missing_ok), skipped blocks re-queued, same plan and pass marks. Running.

## 2026-11-23 — Game for everyone, crowd answers, handbook pictures

- label.html is now the game "You vs the model" (owner's blind test kept at ?mode=owner): answer first, then the reveal
  (model score per second, owner's label, everyone else's). Answers are anonymous (random id, listening time, language).
- Collection without a server of our own: "Send" opens a prefilled GitHub issue; .github/workflows/crowd-labels.yml
  validates it (tools/ingest_labels.py, body parsed as JSON only), stores data/crowd/issue-N.json, rebuilds
  data/crowd_summary.json, comments and closes. Tested with a rejected empty issue (#1); the commit path is tested only
  locally. Supabase is prepared (data/backend.json) but needs an account the owner creates.
- Handbook chapter "The page in pictures": 21 screenshots (7 views × 3 languages), retaken with tools/screenshots.py.
- Blue/fin species texts now state that the Perch attempt failed (step 7a).

## 2026-11-23 — Step 7e result (Mac mini, preliminary)

- Orca classifier on human-reported Orcasound encounters (≥ 3 windows rule): recall 0.958 (23/24, pass), false alarm
  0.273 on 22 quiet blocks (mark ≤ 0.10): **FAIL**. With ≥ 10 windows it would be 0.875 / 0.091; reported, not adopted.
- Rerun after the sidecar-file fix; 14 of 60 blocks without usable audio.

## 2026-11-23 — Round 8 planned (docs/round8-plan.md)

- Three specialist reviews and one adversarial review of how to improve the detectors; one primary test per species:
  8a orca (frozen model, "≥ 3 windows ≥ 0.9", only blocks from 2026-11-24, ≥ 30 events / ≥ 60 quiet),
  8b humpback (3,000-clip pool, 450 stratified owner labels, weighted BA, test-retest kappa),
  8c blue/fin (call index from 6 h/day on 204 days, unchanged 7c marks). Plus 8.0: Pi equivalence on the 7f clips.
- Diagnostic: on the 300 days judged in 7c, MBARI's own values peak in November for blue and fin, so the Oct-Dec mark
  was fair and the Pi's September peak is a real weakness.
- Correction to my own brief (not to the page): the 7c Spearman mark is 0.60, not 0.70.
- Privacy fix: the game now says that sending via GitHub shows the sender's GitHub name; the ingest no longer stores it.

## 2026-11-23 — Round 8b being prepared; round 9 planned; Mac-first decision

- Owner decision: everything runs on the Mac mini first; what passes all tests is migrated to the Pi, which must
  reproduce the numbers (equivalence) and pass the speed/heat gate with the cooler.
- 8b: 3,000-clip pool drawing and scoring on the Mac; listening mode label.html?mode=r8b built (buttons unlock after
  one full playback, break after 50 answers, 40 hidden repeats). Not published until the clips exist.
- Round 9 (docs/round9-lowfreq-plan.md): own low-frequency detector for MARS blue B calls and fin 20 Hz pulses,
  train 2016-17 / validation 2018 / test 2019-20 by year, owner labels with 10× sped-up audio, baseline band-ratio vs
  small CNN chosen on validation, pass BA ≥ 0.80 and recall ≥ 0.70 per species. No data requests to MBARI/Orcasound
  (owner decision).

## 2026-11-23 — Pi paused (owner: everything on the Mac mini first)

- whale-sampler.timer stopped and disabled, the 8.0 equivalence run stopped. whale-push and whale-health keep running
  (status only). RackMate untouched. The Pi resumes when what passes on the Mac is migrated (with the cooler).

## 2026-11-23 — Round 8b clips ready

- Pool of 3,000 clips scored (148 draws skipped: missing/short/silent). Strata in the pool: < 0.3: 2,147 · 0.3-0.7: 178 ·
  0.7-0.9: 221 · ≥ 0.9: 454. Sample: 300 / 50 / 40 / 60 plus 40 hidden repeats = 490 clips (label8/, 29 MB), shuffled.
- The manifest (clip → date, stratum, score) stays off the public repo until the labels are in: it would reveal the
  model's view. Listening page: label.html?mode=r8b (tested: buttons unlock after one full playback, answers saved).
- Library page and Obsidian vault (docs/) published; library DOIs checked at Crossref/DataCite.

## 2026-11-23 — Round 8c: first pass (Mac mini, preliminary)

- Call index from 6 h/day on 204 days: blue Spearman 0.867, BA 0.907, peak November; fin 0.952, 0.897, November.
  Both species pass all three marks. Meaning: the method reproduces MBARI's daily index; not single-call detection.
  Details in [[round8-plan]]. Round 9 clips: 1,500 drawn + 40 repeats.
