# Numeric data-block workflow validation

- `npm run verify`: game-neutral source scan, preview-independence scan, strict
  Svelte check (0 errors, 0 warnings), 98 tests in 18 files and production build
  passed on Windows.
- New regressions cover narrowing candidates across multiple snapshots, signed
  and little-endian values, zero, alignment, session mismatch, incomplete and
  overlapping ranges, profile validation, import boundaries, duplicate keys,
  custom-script preservation, ZIP round-trip and matching live manifest reads.
- On an actual handheld, reused previously verified addresses from a private
  game adapter. Created numeric fields with the GUI form, chose those fields in
  the progress-bar builder, and observed the live preview display 16/16.
- A separate private project/profile was exported through the same pack-export
  library and imported on the handheld by the user. A device screenshot confirmed
  the exported pack displaying 16/16 with zero assets and no Lua script.
- After normal gameplay reduced the character's health, another device screenshot
  showed 6/16 and the corresponding shorter progress bar. The Studio bridge was
  unavailable after the game restart; the companion continued updating through
  native manifest reads without a live desktop connection.
- The browser automation extension refused local file uploads without an extra
  extension permission; its download wait subsequently timed out. Automated
  end-to-end browser file import/download is therefore not claimed. Profile
  import/export parsing and pack generation have automated coverage; ordinary
  browser file-picker interaction needs a follow-up manual check.
- Read-only scan algorithms have synthetic coverage. The hardware case reused a
  known profile; it does not establish discovery of a previously unknown field.
- Test profiles, game identifiers, addresses, screenshots and output packs stay
  outside public source. The test targets one fixed character slot, not general
  cursor-following selection or complete game mechanics.
