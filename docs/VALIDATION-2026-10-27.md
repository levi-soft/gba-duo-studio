# RAM evidence and ROM graphics validation

This checkpoint covers local Studio/Builder development. Versions remain
unchanged; no commit, release or emulator APK update is part of this work.
Real ROMs, captures, game-specific layouts, artwork and reports stay in the
private companion workspace.

## Record and replay

- Studio records labeled EWRAM/IWRAM snapshots and reopens them as an explicit
  offline RAM source. Exact ROM/session/pack identity, range bounds, overlap,
  canonical base64 and size limits are validated. Exports omit device paths
  and serials. Failed requests retain the last valid evidence set.
- Browser recording, offline reads and evidence download were exercised on a
  live handheld session. The downloaded seed bytes matched the capture.
  Browser file import remains unverified: the automation extension blocked
  local file access. Import parsing has automated coverage.
- Builder replay executed the current generated Lua against three frozen
  map/Forecast/Analysis samples: 69 read-only ticks and 20 asserted fields
  matched. RAM replay does not reconstruct a full emulator save state.

## Independent actual-battle outcome

- A prediction was fixed before one live combat. The user performed the
  combat and returned to map; the observer sent no input or memory writes.
- The later persistent map-unit record matched 13 received EXP, level 7 / 97
  EXP becoming level 8 / 10 EXP, and both predicted stat increases. All seven
  standard final stats, target defeat, identity and chapter checks matched:
  26 checks passed. This is independent of the companion formula execution.
- An archived real-device battle for a second exact ROM was also rechecked:
  24 checks passed, including 33 EXP and all seven final stats. This was an
  archived-data check, not a second live gameplay session today.
- These results establish those recorded cases only. Each additional ROM,
  growth mode, RNG style and EXP branch needs its own locked before/after
  case. A raw RAM snapshot is not sufficient to resume gameplay in an emulator.

## Pointer sources and multipart graphics

- Added one-hop ROM pointers with signed offsets and up to 32 explicit raw
  4bpp 1D sprite parts. Source words and pixel reads are checked coherently,
  with actual ROM size, session and bridge budgets enforced.
- The browser preview displayed a composition of two real ROM icons with
  placement and a horizontal flip. Generated Lua ran in an isolated native
  test process on the handheld using the existing emulator graphics sources.
  All 512 RGBA pixels matched the Studio preview; test-bus writes were zero.
- This native check did not install a new companion pack or inspect its full
  Android screen. Multipart LZ77 portraits, pointer chains, automatic asset
  discovery and animation are outside the implemented modes.

## Automated gates

- Studio: source/privacy checks, Svelte diagnostics (zero errors/warnings),
  123 tests in 23 files and production build passed.
- Builder: build/distribution checks and 112 tests passed. Generated tests
  cover evidence bounds, pointer/LZ77 reading, ZIP preservation, sprite pixels
  and outcome invariants. Pack ZIP timestamps are normalized for reproducible
  output.
- Synthetic tests contain no private ROM data. Passing them does not replace
  exact-ROM runtime checks or user acceptance of the authoring workflow.

See [RAM evidence](RAM-EVIDENCE.md) and [ROM graphics](ROM-GRAPHICS.md) for
the implemented workflows and their limits.

## Follow-up: editing an existing companion

- Added a bilingual **Edit a companion** guide: open ZIP, search components,
  apply a static label or inline color, open the full editor, preview, save an
  editable project or export a copy. Dynamic labels retain their bindings.
  Code drafts and missing declared Lua entry points block conflicting actions.
- The guide uses the existing edit/undo pipeline. Keyboard focus stays in its
  dialog; Escape closes it. Long component lists are capped at 100 visible
  matches until narrowed by search. A 390x844 browser check showed no horizontal
  overflow in the guide. Actual text editing and preview were exercised in
  English and Vietnamese on a separate local test origin.
- All 15 current private companion packs were imported, had one static label
  and inline color changed through the guide's actual helper functions, and
  were exported/imported again. 14,967 unmanaged Lua/assets/additional files
  stayed byte-identical; manifests and sample data stayed equivalent. This is
  preservation verification, not execution of every edited pack on Android.
- Builder's new custom-project path packages an already prepared Studio
  project against its exact declared ROM without a curated profile. The shared
  packager also preserved the files of one real project. Studio-specific Lua
  generation descriptors are rejected with instructions to export in Studio.
- Automated follow-up gates: Studio 126 tests in 24 files, zero Svelte errors
  or warnings and production build; Builder 117 tests and distribution build.
  Browser file upload is blocked by the automation extension's local-file
  permission. That permission was not changed; actual file-picker import and
  full website custom-project download need a manual follow-up. Parser,
  packaging and CLI flows have automated coverage.

## Follow-up: connect existing reader data

- Added **Connect data** in the workspace and existing-companion guide. It can
  add bound text, a numeric current/maximum bar or a simple object-row list,
  or reconnect existing text/bars. Container and start/end placement are explicit;
  each apply uses one existing edit/undo transaction. No reader code is rewritten.
- Named fields come from sample data, configured native values, existing bar
  contracts and optional `studioDataFields` metadata. Global and list-row scope
  are kept separate. A maximum must be a different numeric field in the same
  scope. Empty list scopes are blocked until a representative row is supplied.
- Legacy numeric bars may have `"---"` preview placeholders. Their existing
  bindings supply an expected numeric type without changing the placeholder
  or claiming a successful game read. Invalid types/paths, prototype keys,
  missing fields and malformed metadata have regression coverage.
- A new bar was applied to each of the 15 private profile packs using the
  actual authoring helper, then exported/imported. All 14,967 unmanaged files,
  manifests and sample data stayed intact, apart from the intended layout edit.
- A separate exact-ROM copy with the new HP bar was exported and imported on
  the handheld by the user. The user confirmed that its visible HP changed
  with character selection. This is user-observed Android verification; the
  later Studio bridge socket was unavailable, so no fresh packet or automated
  screenshot was captured after import.
- Computer Use stopped the browser test because it could not determine the
  current Windows browser URL confidently. No further UI automation or
  permission changes followed. The new wizard's complete browser interaction
  remains unverified; its helpers, type checks and build passed.
- Current gates: Studio **132 tests in 25 files**, zero Svelte diagnostics,
  source checks and production build; Builder **118 tests** and distribution
  build. A generated binding test covers 100 changing value/max pairs. No
  dependency, emulator update, version bump or release was introduced.

## Follow-up: browser binding flow and export checks

- The previously unverified binding guide was exercised in the browser on a
  synthetic project: select current/maximum HP by Vietnamese name, add a bar,
  observe its interpolated label, undo, redo and use Test preview.
- Added **Check pack** and checks before exporting. Missing declared entry Lua,
  unconditional static images, pending Code drafts and invalid export settings
  block export. Notes cover sample-only data, missing native/sample fields and
  images in conditionally visible branches. Unknown custom-Lua fields are
  informational because the current sample does not prove their absence at runtime.
- Browser checks confirmed that missing ROM settings block export, **Go to fix**
  opens Project settings, and entering the code allows an explicitly reviewed
  sample-only export. The actual downloaded ZIP was read independently: its
  synthetic game code, bar value/max bindings and Vietnamese label matched.
- The review dialog did not overflow horizontally at 390x844 (364px client
  width and scroll width). Temporary viewport overrides were reset.
- All 15 private original packs and their HP-bar edits were checked and
  exported/imported without new blocking issues. The scan exposed a missing
  image in a conditionally visible optional branch; it remains a review note,
  not a claim that the asset was repaired. All 14,967 unmanaged files remained
  byte-identical. No game adapter, ROM asset or capture entered public source.
- Studio verification now passes **138 tests in 26 files**, zero Svelte
  errors/warnings, source checks and production build. These checks do not
  execute Lua, verify all dependency modules, decode images or validate CSS
  references in every runtime state. See [export-check limits](PACK-CHECKS.vi.md).

## Follow-up: reusable function blocks

- Added character cards and ordered stat tables using native layout nodes.
  Their constructors are game-neutral, share identical authored source with
  Builder and inherit the companion's colors/fonts. They require fields from
  an existing reader; they do not discover RAM or add automatic ROM support.
- Browser checks on a synthetic project covered card configuration, value/max
  preview, insertion, single-step undo/redo, automatic Vietnamese row labels,
  row reordering, table insertion and reviewed sample-only ZIP export. The
  downloaded ZIP contains the native layout and sample data. At 390x844 the
  library dialog had equal client/scroll widths (349px); the viewport was reset.
- Visual inspection exposed vertical flex shrinking on an overfilled page.
  New blocks now retain their content height (`flex-shrink: 0`), with a
  regression assertion. A subsequent browser check confirmed separated text
  and bars in the new card and both rows in the new table. Existing imported
  nodes/styles are not rewritten to fix unrelated overfilled layouts.
- Private export/import checks covered edited copies of all 15 current packs:
  manifests/sample data were unchanged and all 14,967 unmanaged Lua/resource
  files remained byte-identical. A separate FE7 test copy was generated.
  These new blocks have not yet been verified in the Android renderer.
- Studio passes **143 tests in 27 files**, zero Svelte errors/warnings, source
  checks and production build. Builder passes **120 tests** and distribution
  checks. Generated tests cover 80 varying stat tables and non-FE field names.
  Versions remain unchanged; no commit or release was made in this step.
