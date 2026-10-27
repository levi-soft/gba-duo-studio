# Studio workspace overhaul

The editor remains game-neutral and keeps format-2 pack compatibility. Baseline:
0.3.0-beta.1 passes 117 tests, checks and production build. Fifteen Builder packs (1.1.0 and 1.1.5 outputs) round-trip with identical layout/CSS, manifest, Lua and assets.

## Product contract

The primary job is to alternate between Codex editing real source files and
visual editing, without losing Lua modules, metadata or unsaved changes. No
hosted AI service, API key or embedded model is required.

- Design: searchable components/layers, canvas with fit/grid/snap and explicit
  before/after/inside drop hints. Keep advanced existing Inspector tools.
- Code: edit manifest, source layout, CSS, sample data and individual Lua modules.
  Saving a module must not silently change the Lua entry point. Validate edits
  before applying them, and apply each edit as one undo operation.
- Test: interactive preview, sample/live data and visible diagnostics. Browser
  preview does not execute arbitrary Lua or emulate the game.
- A connected folder uses plain UTF-8 source files plus native assets. External
  changes are reloaded automatically only if the visual document has no unsaved
  changes. Otherwise show a conflict and keep both versions available. Invalid
  external files never replace the last valid project. Never delete unmanaged
  files or overwrite external changes without an explicit resolution.
- Projects remain importable/exportable as legacy JSON and native ZIP.
- History is bounded and avoids serializing large immutable asset payloads for
  each form edit.

## UI direction and evidence

Use a quiet desktop editor with a stable project bar, three task modes, dark
neutral docks, a large central canvas and one accent for selection/drop targets.
Reuse current Svelte/runes, preview renderer, components and native compiler.
Avoid a new framework or a separate editor representation.

Target viewports: **1440x900**, **1280x800**, **390x844**. Desktop is the primary
authoring surface. Narrow screens use explicit dock switching and must retain
access to project actions without horizontal overflow.

States to exercise: opening/saving progress; empty project/folder; invalid JSON;
missing browser folder support or disconnected device; source conflict; saved or
reloaded success; explicit directory access, including cancellation/denial.
Check keyboard focus, text fit, labels, reduced motion and drag/drop undo in the
rendered application. Unit checks alone do not establish usable UI.

## Architecture

Keep filesystem serialization and sync/conflict decisions in independent tested
modules. The route coordinates them; components render the project/source editor
and source status. Native pack import/export remains the existing authority.
No private ROM, capture, generated pack, absolute machine path or AI credential
enters source/tests. Real-pack compatibility results stay in ignored runtime
reports.

Acceptance: existing verification; folder round-trip/conflict tests; source-edit
and drop-placement tests; all ten real Builder packs; rendered design/code/test
flows in English and Vietnamese; documented live-device limits.

## Scope cleanup

Removed HP discovery, numeric value scanning, automatic numeric-bar generation,
block-name suggestions and the duplicate Project Tools / Lua editor. Data now
starts with sample values; native RAM configuration and pulse settings remain
collapsed under Advanced. Device starts with connection and runtime output; raw
RAM reads/captures and ROM graphics are optional advanced inspection. Existing
pack metadata and native value readers are preserved.

## Publication validation (2026-10-27)

`npm run verify` passed: no Svelte/type warnings, 112 tests and production build. `npm audit --audit-level=moderate` reported zero vulnerabilities after updating the transitive development dependency undici to 7.30.1. Removing retired scan/discovery suites accounts for the lower count than the older 117-test baseline.

All 15 current Builder packs round-tripped without changing manifest, layout or CSS; 14,973 Lua/assets/other preserved files remained byte-identical. The private pack fixtures and reports are excluded from Git.

Browser checks exercised Code module editing without changing the entry point, draft retention across modes, invalid JSON rejection, folder auto-reload and blocked saving on an external-edit conflict. Folder UI checks used in-memory browser handles; native directory permissions and emulator execution remain separate checks.
