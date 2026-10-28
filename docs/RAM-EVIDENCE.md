# Record and replay RAM evidence

In **Device → Advanced: read and capture RAM**, connect to the running game,
enter a state label, and choose **Record RAM sample**. Repeat at meaningful
states, then **Save evidence**. Each sample is a read-only bridge `capture`
of EWRAM and IWRAM at one emulator frame. A set is limited to 16 samples.

**Open evidence file** accepts a saved `.ram-evidence.json` without a device.
Choose a state and **Replay RAM**, then use the address, byte count and paging
controls normally. Offline reads resolve only bytes in that sample; they never
fall back to a device. The RAM inspector labels this source explicitly and
disables live watching, Lua-data and ROM-graphics reads until reconnecting.
Replay does not execute a companion or replace the project's preview data.

Start a new evidence set after switching ROM, game session or companion.
If a request fails, the last valid set remains available. Samples are temporary
in the panel until downloaded; save before leaving the Device workspace.
The ordinary RAM ZIP export remains available separately.

## Portable contract, version 1

```json
{
  "format": "gba-duo-ram-evidence",
  "version": 1,
  "samples": [{
    "label": "Map",
    "capturedAt": "2026-10-27T00:00:00.000Z",
    "packet": {
      "gameCode": "TEST",
      "crc32": "1234ABCD",
      "sessionId": "session-a",
      "packId": "my-companion",
      "frame": 120,
      "paused": false,
      "ranges": [{"address": 33554432, "length": 4, "base64": "AH+A/w=="}]
    }
  }]
}
```

Only EWRAM/IWRAM ranges are accepted. Byte length, canonical base64, bounds,
overlap, sample count and exact identity are checked before replay. The file
limit is 8 MiB, with up to 288 KiB of RAM per sample. Export projects only
the stated metadata; device serials, paths, scripts and extra bridge fields
are excluded. RAM can still contain game text or data: keep real evidence
outside public repositories and release assets.

This module is mirrored by Companion Builder's `scripts/ram-evidence.mjs`.
Keep the wire contract synchronized; Builder's Node copy replaces only the
Studio-specific JSDoc type import. Synthetic tests exercise both sides.

Builder's `scripts/replay-evidence.mjs` accepts the same evidence, an exact
local ROM, a prepared companion project and per-label UI/expected fields.
It runs the existing isolated Lua host and records hashes and semantic checks.
This is RAM/companion replay, not an emulator save state: it does not reconstruct
CPU registers, VRAM, input timing or the complete emulator state.

Runtime `data` packets may lag the capture frame. Do not assert whole-object
equality against a separately fetched packet; choose stable semantic fields
and record the packet's frame/dataFrame and observation procedure privately.
An Analysis replay validates that captured context, not a future battle or
level-up outcome. Validate actual combat separately on the target ROM/device.

For that separate check, Companion Builder provides
`scripts/check-battle-outcome.mjs` and `docs/battle-outcomes.md`. Record the
prediction before combat, pair a later capture from the same session, and
read the persistent map-unit record using a verified layout for that exact
ROM. Temporary Forecast battle copies may already contain simulated outcomes.
The outcome runner does not execute the companion's EXP or growth formulas.
