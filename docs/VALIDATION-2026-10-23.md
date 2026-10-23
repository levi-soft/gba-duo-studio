# Numeric data-block workflow validation

## ROM inspection and generated image blocks

- Studio verification passes with 111 tests in 20 files, 0 Svelte errors/warnings
  and a production build. Plus regression passes 312 JVM tests (golden-image
  exclusions unchanged) and 155 native checks on the handheld.
- A signed Plus update was installed in place after the user saved progress.
  The running game advertised revision-2 inspection and its actual 16 MiB ROM.
  Read the known icon tile/palette through the live bridge and compared the
  decoded pixels with the exact local ROM; they matched byte-for-byte.
- Browser: connected to the handheld, entered the known image source through
  forms, previewed the decoded 16x16 image, added a bound image and confirmed its
  canvas bitmap loaded. The project continued to report zero asset files.
- The generated private pack was 3,304 bytes and contained only manifest,
  layout, CSS, preview data and generated Lua. The user imported it on the
  handheld; a screenshot confirmed the ROM-decoded icon on the companion screen.
- Decoder tests cover nibble/tile ordering, transparent palette zero, native
  color expansion, overlapping LZ77 references, malformed/truncated data,
  old capabilities, session changes, ROM bounds, source equality, generated Lua
  execution, safe failure, custom-script preservation and zero image embedding.
- VRAM/OAM/palette inspection is available through bounded read-only regions.
  Exported blocks currently require ROM tiles and palette, because native image
  caching does not promise animation refresh from mutable VRAM.
- Source addresses were reused from a private known adapter, not automatically
  discovered. Runtime raw-icon decoding was hardware-verified; multipart portrait
  assembly, tilemap authoring, pointer-driven art and universal no-code game
  discovery remain outside this change. The saved-source refresh control has
  static/type coverage; a full second-session manual refresh needs follow-up.

## Local natural-language profile search

- The follow-up `npm run verify` passed with 105 tests in 19 files, 0 Svelte
  errors/warnings, game-neutral checks and a production build.
- Browser-tested the existing private numeric project using the new description
  form: saved a fixed-unit current/maximum HP pair and the prior in-game
  verification claim. A Vietnamese HP request returned that pair. Clicking the
  result created a new bar whose Inspector bound current/maximum to the expected
  fields, without writing code.
- A selected-unit request correctly showed the fixed-slot mismatch and disabled
  creation. Reloading the page retained descriptions. The review tab remains open
  with the successful request; screenshots stay in the private test workspace.
- Search is deterministic and local, limited to HP meanings/aliases. It does not
  call an LLM, discover unknown RAM, independently verify profile assertions or
  implement the selected-unit game adapter.
- New tests cover bilingual/diacritic queries, aliases, scope mismatch, ambiguous
  and cross-owner pairs, stale suggestions, metadata round-trip/validation and
  invalidating verification when the underlying RAM definition changes.

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
