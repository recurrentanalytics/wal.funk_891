# Whale Listener status

Live status page for a Raspberry Pi 5 that scans public hydrophone audio
(MBARI Pacific Sound, Orcasound) for whale calls.

The Pi pushes `data/status.json` here every 30 minutes with a deploy key
that can write to this repository only. `index.html` draws it.

Contents: Pi temperature and throttle flags, current job progress, and the
status of each project step. No audio, code, credentials or addresses.
