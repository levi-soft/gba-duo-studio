# Function-block validation, 2026-10-28

The scope is reusable Studio/Builder authoring. The private FE7 copy is a
runtime fixture, not a new supported game or a redesign of the FE7 companion.

- On Thor, the exact game identity was AE7E / 32CD990D and the assigned pack was
  the separate `studio-function-blocks-device-test` fixture. Captures showed
  native cards with Lyn and Lucius portraits, names, levels and current/max HP.
- The fixture initially contained five chosen stat rows. After adding omitted
  fields to the fixture, its two-column tables displayed ten rows for Lucius.
  This was test content configuration, not a missing-field reader repair.
- Ten raw values for Lucius (level, EXP, HP/max HP, power, skill, speed, defence,
  resistance and luck) matched an independent bounded read of the unit slot
  identified by the exact-ROM slot contract. Character/class pointers,
  deployment and session were checked for stability. Constitution, movement
  and aid were visible but were not independently recalculated in this check.
- The user's report exposed a real authoring limitation: a literal stat label
  could incorrectly say Strength for a magic user. Stat rows now support a
  validated `labelField`, with a Vietnamese label-source selector in Studio.
  It emits a normal native text binding and uses the reader's value verbatim.
  The constructors remain game-neutral and mirrored in Builder.
- Regression coverage checks label changes between subjects, portrait/resource
  updates, zero values, invalid/unknown label paths and literal-label isolation.
  Studio verification passes **145 tests in 27 files**, zero Svelte diagnostics,
  source gates and production build; Builder passes **120 tests** and build.
- The latest label-source form was not exercised in a browser: Computer Use
  reported no available browser. The regenerated private ZIP was independently
  parsed and contains the expected dynamic text binding. Its final Str/Mag
  binding has not yet been re-imported and observed on Thor.
- Private fixture export/import preserved all 869 unmanaged FE7 Lua/resource
  files, sample data and the original layout subtree. No runtime code, ROM
  addresses, app version or pack release was changed. No commit/release made.

The follow-up should prioritize the general authoring workflow. Per-game fixture
content should only be extended when it is needed to demonstrate a tool defect.

## Follow-up: general authoring form and cross-tool packaging

- Added two tests mounting the actual Svelte function-block form in jsdom.
  They exercise Vietnamese field metadata, selection of a data-driven label,
  insertion gating until the label field is selected, row reordering, insertion,
  export/import and preservation of existing reader bytes/data/settings.
- Changing the destination to a list template clears previous value/label
  selections. The real Preview component resolves the first row's label and
  zero value instead of same-named global fields, without changing the project.
- Vitest selects Svelte's browser entry points only during tests, following
  [Svelte's component-testing setup](https://svelte.dev/docs/svelte/testing).
  Production SSR resolution is unchanged. No dependencies were added.
- A private synthetic integration built a pilot/resource project through the
  actual Studio insertion functions and Builder custom-project API, then
  imported the output into Studio. It required no curated game profile and
  preserved the label binding, current/max bindings, source project, sample
  data and Lua bytes. Repeated packaging produced identical ZIP bytes.
- The synthetic input only contains a TEST header. This proves authoring and
  packaging interoperability, not RAM discovery or support for an actual game.
- Latest Studio verification passes **147 tests in 28 files**, zero Svelte
  errors/warnings, source checks and production build. Builder source was
  unchanged in this follow-up; its previous 120-test gate was not repeated.
- There was still no connected browser for visual testing. DOM interaction
  checks do not establish CSS geometry, visual quality or full browser/device
  behavior. No additional Thor import was requested, and the final Str/Mag
  fixture revision remains unobserved on Android.
- Added a Vietnamese end-to-end user workflow to the function-block guide.
  No commit, release or version change was made.

## Follow-up: reusable block configurations

- Added a saved-configuration section inside Function blocks, with Vietnamese
  names, loading, removal/undo, and JSON export/import. It saves creation
  settings in a separate bounded browser key (50 entries, 512 KiB JSON).
- Constructor-shaped cards/tables can recover creation settings from a selected
  descendant. CSS/manual styling, Lua, assets and sample values stay in their
  own projects. Unsupported hand-authored structures are not silently captured.
- Insertion into another project still validates the target fields and image
  assets. Loading a configuration does not insert a node or change the project.
  Duplicate names/IDs are rejected; identical imported entries are skipped.
- Six module tests cover selected-block recovery, 60 generated stat tables,
  library roundtrips/merges, malformed/oversized input, storage failures, target
  rebinding and the public documentation example. Four additional real-form
  DOM tests cover save/reload between projects, capture, removal/undo, an import
  pending during a save, invalid JSON, and a failed storage write without a
  false success message. Existing reader/data/manifest preservation is checked.
- Full Studio verification passes **157 tests in 29 files**, zero Svelte
  errors/warnings, source-neutrality/preview checks and production build.
  New controls have DOM interaction coverage; no new real-browser visual or
  Android validation is claimed. Builder/runtime source was not changed.
- The Vietnamese guide and `block-presets.example.json` document the workflow
  and provide an importable generic example. The example is a configuration
  library, not a runtime companion or a new supported game.
- No dependencies, versions, commits or releases were added in this step.

## Follow-up: edit existing data-bound components

- Data binding now supports new and existing images through string source
  fields. Existing image IDs, styles, conditions and actions are retained;
  data/files/reader configuration are not rewritten or copied between games.
- Opening the guide on text, image or bar nodes defaults to editing that node
  and prefills recognizable bindings. Simple text prefixes are recovered;
  complex multi-field text requires a deliberate field choice and explains
  that the guide replaces its content with a label and one field.
- Existing-target and mode selectors use the new event value before loading
  settings, avoiding selection of the previous node. A selected field outside
  the current search/result limit remains represented in the dropdown.
- Existing bars can keep their label format. Current/max placeholders are
  remapped in a single pass, preserving other text and bindings, including when
  the fields swap places. Ambiguous/constant old bindings require a deliberate
  new label. The current/max pair must still be distinct, numeric and in scope.
- Four additional helper tests cover prefill, in-place image export/import,
  preserved Lua/resource bytes, bar-label remapping and ambiguous old bindings.
  Five real Svelte-form DOM tests cover initial image/bar selection, type
  filtering, zero values, target switching, list-row images versus global
  fields, and the Code-draft guard.
- `npm run verify` passes **166 tests in 30 files**, zero Svelte diagnostics,
  source/preview independence checks and production build. These are helper,
  DOM-interaction and packaging checks, not new real-browser visual or Android
  runtime acceptance. No Thor import/RAM read was requested in this step.
- Updated the Vietnamese data-connection guide and friendly image field names.
  Builder/runtime profiles, dependencies and versions were unchanged. No
  commit, upload or release was made.

## Follow-up: rebind an existing repeated list

- The data guide now opens on a selected list, prefills its current source,
  and changes only `items`. The complete existing template, component IDs,
  styles, conditions, images, buttons and actions are retained. New-list
  creation still uses the separate simple-row flow.
- A bounded compatibility check compares the first old sample row with every
  destination sample row. It checks text/image/bar references, conditions,
  bound styles, action parameters/whole-value payloads and nested templates,
  including global versus row scope. Literal JSON action values are not
  interpreted as bindings. Missing fields, type/scope changes, unsupported
  references or complexity limits block the operation without a partial edit.
- Bare paths and `$` paths for bars/conditions/lists follow the preview
  resolver, while image/style/action values follow typed binding semantics.
  Nested rows use the global root rather than an enclosing row. A list inside
  another list uses the first enclosing sample rows and explains that limit.
- Twelve helper/rendering tests cover in-place preservation and ZIP roundtrip,
  actual preview DOM row values/actions, later-row failures, visibility/bar/
  style bindings, scope changes, nested and empty nested lists, `ui` scope,
  whole-row payloads, literal values, sample requirements, unsafe paths and
  bounded work. One of these tests checks preservation over 60 deterministically
  generated examples. No property-testing dependency was added.
- Three real Svelte-form DOM tests cover prefilled list editing, translated
  incompatible-source feedback and disabled Apply, recovery to a compatible
  source, and the existing Code-draft guard.
- `npm run verify` passes **181 tests in 31 files**, zero Svelte errors/warnings,
  game-neutral/source dependency checks and production build. Evidence is in
  `.studio-runtime/list-rebinding-verify.log`. `git diff --check` also passes.
  These are automated helper, DOM and packaging checks, not new real-browser
  visual validation or Android/game runtime acceptance. No Lua or ROM was
  executed by the new check, and the guide does not infer new game support.
- Updated the Vietnamese data guide. Builder/runtime profiles, dependencies
  and version numbers remain unchanged; no commit, upload or release was made.

## Follow-up: preserve multi-field text when rebinding

- Existing native text can now keep its complete text template while changing
  each reader-field reference through a separate dropdown. Supported complex
  text defaults to this mode; simple `Label: {field}` editing retains its
  existing flow and offers template preservation as an option.
- One replacement pass handles swaps/cycles and repeated references while
  preserving literals, punctuation and newlines. Row-index and `ui.*`
  references stay unchanged. Only the text property changes; component IDs,
  styles, conditions, actions, reader/resource bytes and sample data stay put.
- Every mapping must target an available scalar field in the selected scope.
  Missing/extra/unsafe mappings and list destinations are rejected atomically.
  Missing original fields require deliberate replacements. Reader declarations
  are accepted without inventing sample values. The guide bounds templates to
  24 unique reader fields and 16,384 characters before and after replacement.
- The form shows a sample-only text preview, including zero and false values.
  Missing sample values and unresolved row-index/UI state appear as an ellipsis
  with an explicit explanation. Search filtering retains selected mappings;
  switching targets resets the mappings to the new target. Opting out clearly
  explains that applying will replace the text with one label/field.
- Eight helper tests cover extraction, bounded input/output, atomic rejection,
  simultaneous swaps, repeated-row scope, declarations, ZIP preservation and
  80 deterministic generated remap/inverse examples. Five additional Svelte
  form DOM tests cover the actual controls, preview, missing-field recovery,
  target switching, opt-out, search, scope and the Code-draft guard.
- `npm run verify` passes **194 tests in 32 files**, zero Svelte errors/warnings,
  source/preview checks and production build. Evidence is in
  `.studio-runtime/text-rebinding-verify.log`. `git diff --check` passes.
  This validates authoring/DOM/packaging behavior with synthetic data; no new
  real-browser visual or Android/game runtime validation is claimed.
- Updated the Vietnamese data guide and the edit guide's dynamic-text hint.
  Builder/runtime profiles, dependencies and versions remain unchanged. No
  commit, upload or release was made.

## Follow-up: match fields when rebinding repeated lists

- The existing-list data guide now offers optional field matching, with
  type-compatible dropdowns, author-supplied field labels, sample values and
  reset controls. A source/target change discards pending matches; the Code
  draft guard remains effective. The source-only workflow stays available.
- Matching keys include the owning list ID and the original row-field path.
  This keeps identically named fields in different nested lists independent.
  Matching a nested source exposes its own inner field choices. Global
  references, row-index/UI state, static style, action names and JSON literals
  remain unchanged. Only selected bound references and the list source change.
- Compatibility uses the old representative row and checks all destination
  rows before applying. It covers text/images/bars, labels, conditions, bound
  styles and action arguments/state values/navigation. Missing mapped fields,
  incompatible types, row/global fallback, unsafe/reserved destinations and
  stale mapping keys block the transaction without a partial project edit.
- Reference edits are collected across rows and rebuilt once. This handles a
  nested list empty in the first new row but populated in a later one. Swaps
  and repeated references are simultaneous. Whole-row/object action payloads
  still require compatible schemas; no Lua argument adapter is generated.
- Candidate fields come from the first inspectable new sample row of each
  scope. Checks retain bounded work/depth, a maximum of 128 scoped fields and
  16,384 characters for changed interpolated text. Source-only validation does
  not enumerate unused candidates or inherit the mapping-work limit overhead.
- Nine helper/rendering/packaging tests cover choices, complete reference
  preservation, ZIP roundtrip and reader bytes, rendered row values and action
  calls, later-row failures, nested scope separation, empty-first-row cases,
  unsafe/scope/whole-row rejection, swaps, bounded candidates and 60 generated
  renamed schemas. Four additional Svelte-form DOM tests exercise field
  matching, metadata labels/sample values, nested choices, disabled Apply,
  reset/source/target changes, atomic preservation and the Code draft guard.
- `npm run verify` passes **207 tests in 33 files**, zero Svelte diagnostics,
  source/preview checks and production build. Evidence is in
  `.studio-runtime/list-field-mapping-verify.log`; `git diff --check` passes.
  These are synthetic helper, DOM, preview-renderer and packaging checks;
  no real-browser visual, Thor or actual game runtime acceptance is claimed.
- Updated the Vietnamese data guide. Builder/runtime profiles, dependencies
  and versions are unchanged. No commit, upload or release was made.

## Follow-up: actual Studio–Builder roundtrip and editor settings

- Added the optional `npm run test:builder` integration gate. It loads the
  current sibling Builder compiler/packager/templates and actual Studio
  authoring/import/export helpers, with no copied Builder runtime in Studio's
  production bundle. Standalone Studio checks do not require the sibling repo.
- The first run exposed loss of canvas/grid settings: reopening a ZIP reset
  non-default canvases to 1240×1080. Both exporters now retain those settings
  in matching version-1 editor metadata, and Studio restores only valid optional
  dimensions/grid values. Native manifest/RAM/viewport behavior is unchanged.
- Four standalone regression tests cover ordinary unstyled projects, legacy
  packs, stale metadata and malformed optional sizes/grid settings. Four
  integration tests cover saved JSON, Builder templates, conditional styles,
  reopened text/list editing, native rendering, and 12 generated projects over
  repeated Builder/Studio cycles with unchanged reader/resource bytes.
- `npm run verify` passes **211 tests in 34 files**, zero Svelte diagnostics,
  source/preview checks and build. `npm run test:builder` passes **4 integration
  tests** separately. Evidence: `.studio-runtime/builder-roundtrip-verify.log`
  and `.studio-runtime/builder-roundtrip-interop.log`. Builder's standalone
  check passes **138 tests**, distribution/policy/fingerprint generation.
- A separate private device pack went through Builder → Studio edit/export →
  Builder rebuild → Studio reopen. It retained 869 original reader/resource
  files, sample data, native metadata, and a 960×720 canvas/grid. Original source
  files were not changed, and the output used a distinct test pack ID.
- On Thor, the assigned new pack's identity/session were checked before/after
  reading the selected unit. Ten fields matched raw RAM. Visual inspection
  confirmed the selected unit's portrait/name, HP 18/18, Mag label and displayed
  values. Evidence remains only in the private workspace.
- After an idle screen timeout and an L1 navigation attempt, the game was
  observed at its intro. The user restored a map state and selected another
  unit. The second read-only verification again matched all ten RAM fields;
  visual inspection confirmed a different portrait/name, HP 20/20, Str label
  and updated values. Both selections used the new assigned test pack; this
  does not establish the intro interruption's cause or validate sleep/resume.
  No broad game/ROM or browser-file-picker acceptance is claimed.
- Documented the optional gate and editor metadata compatibility. Versions,
  dependencies, public profiles and release state are unchanged; no commit,
  publication or upload was made.

## Follow-up: shared dependency diagnostics and repair navigation

- Studio's existing Check pack panel now uses the same native dependency rules
  as custom Builder preflight. The readable JavaScript source is mirrored in
  both repositories; Builder's normal authored-source build embeds it into the
  standalone core. Neither standalone tool depends on the sibling checkout.
- Reports include component/location, property, field and file path. Static
  CSS/style URLs, relative images, skin states, actions, bare native paths and
  representative list scopes are checked. Missing dynamic/sample/conditional
  images remain notes; skins are required at compile time even on hidden
  buttons. Empty list templates do not generate guessed missing row fields.
  Studio-generated computed/graphics fields are treated as declared contracts,
  without executing their generator or confusing custom Lua with generated Lua.
- Go to fix selects the content/appearance/behavior inspector as appropriate,
  or opens the named CSS/Lua source. File navigation preserves other source
  drafts, applies no changes and creates no missing file automatically. Reports
  display up to 100 entries with full totals and blocking errors first.
- Four added readiness helper tests cover dependencies, actions/scopes,
  generated contracts, immutability, capped totals and repair destinations.
  Four Svelte DOM tests cover localized issue details, blocking/nonblocking
  export controls, bounded rendering, source focus/navigation, preserved drafts
  and safe missing-entry editing. These are component DOM tests, not rendered
  browser/layout acceptance or game runtime validation.
- `npm run verify` passes **219 tests in 35 files**, zero Svelte diagnostics,
  source/preview checks and build. Evidence:
  `.studio-runtime/shared-diagnostics-verify.log`. The optional integration gate
  passes **6 tests in 2 files** including mirror consistency and actual shared
  preflight/repaired packaging; evidence:
  `.studio-runtime/shared-diagnostics-interop.log`.
- Builder's `npm run check` passes **149 tests**, distribution generation,
  release policy and fingerprints; evidence in Builder:
  `reports/shared-diagnostics-check.log`. No device interaction, private game
  materials, dependencies, version bumps, commits, uploads or releases added.

## Follow-up: edit wording around bound data in the companion guide

- Added protected-data text controls for native text/button labels and bar
  labels. Users edit literal text segments in Vietnamese or English while the
  original interpolation tokens stay read-only and in the same order. Repeated
  fields, list indices, indexed paths and UI-state bindings are preserved.
  The helper verifies the resulting native token sequence before changing one
  authored property. New bindings, stale source, malformed segments and bounds
  violations fail atomically. No editor-only metadata enters the runtime layout.
- The existing guide/Undo transaction applies the wording change. Switching
  components resets unapplied wording; changing the Studio language preserves
  it. Source drafts still block edits. Custom Lua, reader fields, data, actions,
  styles and unrelated nodes remain intact. Templates over 16,384 characters or
  32 interpolation tokens use the full editor.
- Corrected guide reader status for pending Studio-generated Lua, including
  computed/pulse projects. A missing custom entry remains a missing entry.
- Four pure helper tests include 120 deterministic generated templates checking
  native token preservation, identity and rejection of new binding injection;
  explicit tests check Unicode/repeated/scoped tokens, zero-value rendering,
  stale/malformed failure, property preservation and ZIP persistence. Three
  Svelte DOM tests exercise Vietnamese controls, language preservation,
  validation, draft blocking, failed application, guide selection reset and bar
  label application. One guide-status regression test covers generated entries.
- `npm run verify` passes **227 tests in 37 files**, zero Svelte diagnostics,
  source/preview checks and production build. Evidence:
  `.studio-runtime/text-parts-verify.log`. The optional Builder gate passes
  **6 tests**, with the actual saved-JSON/ZIP roundtrip extended to retain the
  edited wording and original data tokens. Evidence:
  `.studio-runtime/text-parts-interop.log`.
- These are automated helper/component/packaging checks. No new rendered
  browser acceptance or device/game execution is claimed. Builder production
  code, dependencies and versions are unchanged. No commits, uploads or
  releases were made.

## Follow-up: preview and apply image/font changes

- Added an image/font dialog from the toolbar and companion guide. It handles
  static image sources, individual button/tab skin states, component fonts and
  individual tab label fonts. Existing resources or a local uploaded file can
  be selected. Apply uses the existing edit/Undo transaction; guide navigation
  returns to the selected component. The toolbar tools can wrap at narrow widths.
- New upload names allocate a separate safe asset path on a collision; identical
  bytes may reuse an existing path. Original files, reader/native settings,
  sample data, actions and unrelated properties are retained. Component/source
  snapshots reject stale changes. Switching a bound image to a static file
  requires the explicit product checkbox. Font descendants are opt-in.
- Images use browser load/error events. Fonts use temporary FontFace instances
  with a Vietnamese sample, removed on close. Apply requires the current preview
  to be ready; stale load/decode completions cannot enable the new selection.
  Reading is cancellable and bounded to a nonempty 32 MiB file. Nothing is added
  to the project until Apply. Runtime layout still uses the normal compiler.
- Six helper tests cover static/bound/stale targets, image/skin/tab/font scope,
  canonical bytes/types/paths, actual FileReader success/cancellation, native ZIP
  persistence and 64 deterministic name-collision cases. Six component DOM tests
  cover localized image preview/application, decode failures, explicit binding
  replacement, font scope, font cleanup and late decode, late file-read results,
  language preservation, source drafts and cancellation. FontFace and image
  decode events are controlled in these tests; they are not real decoder QA.
- These tests found and corrected a Svelte reactive-proxy identity issue that
  initially left Apply disabled after a valid preview. The readiness record now
  uses raw immutable state and checks the exact selected preview object.
- `npm run verify` passes **239 tests in 39 files**, zero Svelte diagnostics,
  source/preview checks and production build. Evidence:
  `.studio-runtime/asset-edit-verify.log`. After the small toolbar-wrap CSS change,
  the production build was rerun separately; evidence:
  `.studio-runtime/asset-edit-final-build.log`. The build reports a nonblocking
  chunk-size warning for the main page; rendered layout/performance is not
  established by this build.
- The optional Builder gate passes **6 tests**. Its actual cross-repository
  roundtrip now includes replacement SVG bytes and a synthetic font packaging
  fixture, preserving both original and new resources through Studio and
  Builder exports. Evidence: `.studio-runtime/asset-edit-interop.log`. The font
  fixture tests byte/metadata contracts, not actual font decoding on Android.
- No browser-rendered or new device/game acceptance is claimed. Builder
  production code, dependencies and versions are unchanged. No commits,
  uploads or releases were made.

## Follow-up: complete real-browser authoring flow and local trial review

- Added the optional pinned Playwright development dependency and `npm run
  test:ui`. A fresh headless Chrome context performs the Vietnamese workflow
  at 1440×1000 and 390×844, using the actual Studio page, file chooser/inputs,
  downloads, browser image/font decoding and persisted project reopening.
  It does not inject application state or run the companion's Lua.
- The workflow imports a synthetic native ZIP, edits static/bound wording,
  uploads and decodes a private local TTF, replaces SVG art with a colliding
  name, exercises actual Undo/Redo, rebinds a bar to zero-valued data, previews,
  downloads editable JSON and ZIP, and checks their original reader/data/files.
- With the prepared sibling Builder available, the same browser gate opens
  the real Builder website, expands its custom-project controls, selects the
  downloaded JSON and a synthetic `TEST` ROM, creates/downloads a companion,
  and reopens it in Studio. The final ZIP retains the edits, original/new
  resources, reader/native metadata, canvas/grid and sample data after reload.
- Browser testing exposed controls being usable before initial restoration/
  hydration finished. Studio now shows a startup status and keeps the workspace
  inert until ready; the language picker is disabled during that period. Also
  corrected checkbox row styling and five Studio-specific Vietnamese readiness
  messages that had been written with the wrong encoding. A regression test
  checks the actual Vietnamese messages. Vite ignores ignored runtime artifacts
  to avoid Windows file-watcher locks during downloads.
- `npm run verify` passes **240 tests in 39 files**, zero Svelte diagnostics,
  source/preview checks and build. `npm run test:builder` passes **6 tests**.
  Evidence: `.studio-runtime/author-flow-verify.log` and
  `.studio-runtime/author-flow-interop.log`.
- Real Chrome passes **2 complete workflows**, including actual TTF decoding
  and both Studio/Builder interfaces. Screenshots were visually inspected;
  the tested screens had no horizontal document overflow. Each viewport has
  JSON verification, six screenshots and exported project/companion files in
  ignored `.studio-runtime/browser-results/`; evidence log:
  `.studio-runtime/author-flow-browser.log`. These are local browser viewport
  results, not physical phone/Android companion acceptance.
- Dependency audit passes the configured moderate threshold; four existing
  low-severity build-chain findings remain. No forced downgrade was applied.
  Evidence: `.studio-runtime/author-flow-audit.log`. Updated selected-tool
  notices and the source export allowlist for the optional tests/config; no
  source ZIP was generated or published in this step.
- Documented repeatable browser setup, optional local font/sibling Builder
  coverage and local trial readiness. Studio remains **0.3.0-beta.1**, Builder
  remains **1.1.5**. No Android/game state, user browser profile, public game
  profile, commit, GitHub asset or release was changed.

- Visual review of Builder's browser screenshots also found its custom-project
  checkbox separated from the label by the global input width rule. Added a
  scoped row style and regenerated its fingerprints/distribution. Builder's
  standalone gate passes **149 tests**; evidence in Builder:
  `reports/author-flow-check.log`. No palette or version was changed.

## Follow-up: align asset editing with the native Android decoder

- Read `AndroidCompanionPlatform`: images use `BitmapFactory.decodeFile`,
  fonts use Compose `Font(File)`. Cross-checked the official Android
  [image support](https://developer.android.com/media/platform/supported-formats)
  and [font resource formats](https://developer.android.com/guide/topics/resources/font-resource).
  Browser SVG/WOFF decoding does not establish companion compatibility.
- The asset edit transaction and file reader reject SVG/WOFF/WOFF2 for new
  selections, including existing-asset choices and skins/tab fonts. The dialog
  explains PNG/JPEG/WebP/still GIF and TTF/OTF. Imported files remain intact;
  shared preflight warns at referenced browser-only formats without blocking
  legacy editing, and does not warn on unused files. The source is mirrored
  exactly and embedded into Builder's existing distribution pipeline.
- Added atomic no-write format cases and an actual dialog check that unsupported
  assets cannot reach preview/Apply. Browser fixtures now use real PNG bytes;
  both actual Chrome workflows reject an SVG upload before accepting the PNG,
  decoding the private local TTF and completing Studio/Builder roundtrip.
- Gates: **242 Studio tests**, zero Svelte errors/warnings and build; **150
  Builder tests** with generated distribution/fingerprints; **7 interop tests**;
  **2 Chrome workflows**. Evidence: Studio `.studio-runtime/android-assets-verify.log`,
  `android-assets-interop.log`, `android-assets-browser.log`; Builder
  `reports/android-assets-check.log`. The existing main-page chunk-size warning
  remains nonblocking. No forced dependency update was made.
- Prepared a private device pack from the earlier exact-ROM test project and
  actual browser-exported PNG/TTF. Separate ID `studio-assets-device-test`, match
  `AE7E / 32CD990D`, preserved **869 original reader/resource files**, sample
  data, original source bytes and the original UI in a second tab. Native
  compiler-generated font face/file and reopen metadata were checked.
- The test ZIP is at `Download/Studio-Assets-Device-Test.zip` on the AYN Thor test device.
  Host/device SHA-256 matches `0a71e66a57030e8c0b599c1a0a4266123da12dfbb59072c8f6e852148fe4aeaf`.
  Preparation evidence lives in private ignored
  `.studio-runtime/studio-assets-device-2026-10-28/preparation.json`.
  Thor was asleep during the read-only state checks; no new app assignment,
  game input, save writes or physical Android rendering acceptance is claimed.
  Awaiting the user's wake/import/map setup.
- Studio stays **0.3.0-beta.1**, Builder **1.1.5**; no Plus source edits, commit,
  upload or release. The local test font and game resources remain private.

## Follow-up: first Android asset capture and damaged PNG fixture repair

- The user imported the test pack and woke Thor. Fresh read-only bridge data
  confirms `AE7E / 32CD990D`, `studio-assets-device-test`, Plus `0.1.8-plus.4`,
  session a privately recorded session. Captured both physical screens.
  The companion shows the TTF-assigned heading with Vietnamese marks, Lyn's
  portrait/name, HP 20/20, power/skill/speed and both tabs without observed
  clipping. **The static gold PNG did not display**; the initial capture is
  not a completed asset acceptance result.
- Independent Pillow inspection found the manually copied PNG fixture had
  an invalid IDAT CRC. Chrome and Pillow's pixel loading accepted it, while
  Pillow's strict `verify()` rejected it. Recreated the blue/green/gold browser
  fixtures as small actual PNG files using Pillow and verified their CRCs.
  No claim that changing the layout fixed the missing image.
- Added a bounded PNG container/chunk CRC check to the asset selection/apply
  and FileReader paths. It rejects bad signatures, truncated/invalid chunks,
  wrong CRCs, missing IHDR/IDAT/IEND and trailing bytes. Browser decoding remains
  required for the compressed pixels. Existing imported files are retained.
  New tests include 32 deterministic one-bit corruptions, no-write failures,
  real FileReader rejection and dialog prevention of preview/Apply.
- Both real Chrome workflows now reject an IDAT-CRC-damaged PNG and SVG before
  applying a correct PNG, then preserve bytes through the actual Builder and
  Studio reopen. Gates pass **244 Studio tests**, zero Svelte diagnostics,
  production build, **7 interop tests** and **2 Chrome workflows**. Evidence:
  `.studio-runtime/png-integrity-verify.log`, `png-integrity-interop.log`,
  `png-integrity-browser.log`. Builder code was unchanged in this repair;
  its latest standalone result remains **150 tests**.
- Ten current Lyn fields match raw RAM: level 7, EXP 32, HP/maxHP 20/20,
  Str 10, Skill 11, Spd 15, Def 3, Res 2, Lck 10. Character/class pointers and
  deployment agree, and the game session/pack remain unchanged across reads.
  Private `reader-verification.json` records the individual comparisons.
- The corrected actual browser export was packaged as
  `Download/Studio-Assets-Device-Test-Fixed.zip`, same manifest ID/version.
  SHA-256 `1c945d1b38679f838a284d4af67330f8e725438be18e8ca8b491ae6d6e4056b9`
  matches host/device. Initial ZIP/source/preparation/captures were retained.
  Awaiting user import of the corrected pack and a fresh companion screenshot
  before declaring the gold image verified on Android.
- A separate shell decoder probe was compiled into a temporary dex JAR and
  attempted without installing an app or accessing game state. Android killed
  it with exit 137, so it provided **no decoder validation**. Acceptance relies
  on the real companion capture instead. No game input, save writes, Plus source
  edits, version bump, commit or release in this step.

## Follow-up: corrected PNG confirmed in the actual Thor companion

- The user imported/tried the corrected pack. Rechecked the live bridge:
  `AE7E / 32CD990D`, `studio-assets-device-test`, Plus `0.1.8-plus.4`, session
  a privately recorded session. Captured both physical displays again.
- Visually inspected `fixed-companion.png`: the static gold PNG now appears,
  the TTF-assigned Vietnamese heading renders with accents, Lucius's portrait
  and name are present, the bar reads **HP 18 / 18**, and the power label is
  **Mag: 7**, alongside Skill 6 and Spd 10. Both tabs and all text in the
  captured page are visible; no clipping was observed. The initial blank slot
  and the repaired visible image are separately retained as evidence.
- Verified the selected player deployment and character/class pointers before
  comparing memory. All **10 Lucius fields** match RAM in the same session:
  level 3, EXP 0, HP/maxHP 18/18, power 7, Skill 6, Spd 10, Def 1, Res 6,
  Lck 2. The earlier initial-pack Lyn comparison also passed 10 fields with
  a Str label; the final capture covers Mag. No test input or save writes.
- The downloaded corrected ZIP still matches host/device SHA-256
  `1c945d1b38679f838a284d4af67330f8e725438be18e8ca8b491ae6d6e4056b9`.
  Private ignored evidence is at
  `GBA-Duo-Companions-Private/.studio-runtime/studio-assets-device-2026-10-28/`:
  `fixed-companion.png`, `fixed-game.png`, `fixed-live-data.json`,
  `fixed-ram.json`, `fixed-reader-verification.json`, `final-verification.json`.
- This closes the pending **edited PNG/TTF and current-unit data** check for
  this exact ROM/device. It does not establish every format/font/game, native
  variable-font behavior, all UI pages, or all tablet/phone layouts. No source
  logic changed after the last 244 Studio / 150 Builder / 7 interop / 2 browser
  gates; this step only records actual device evidence and updates documentation.
  Versions are unchanged; no commit, upload or release was made.
