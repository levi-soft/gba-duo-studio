# Changelog

## Companion authoring update (0.3.0-beta.1, 2026-10-28)

- Guide existing-pack editing in English and Vietnamese: find components, edit
  labels/colors and change literal wording while retaining native data tokens.
- Connect existing reader fields to text, images, bars and lists; remap fields
  within repeated rows without replacing their template, styles or actions.
- Add reusable character-card/stat-table blocks and importable configuration
  presets, with optional data-driven labels and no bundled game data.
- Preview and replace images, button/tab image states and TTF/OTF fonts as
  undoable edits. Protect dynamic image bindings, preserve colliding originals,
  reject incompatible new selections and damaged PNG containers/checksums.
- Share component/property/file diagnostics with Companion Builder; navigate
  directly to repairs and retain code drafts while switching source files.
- Preserve canvas/grid metadata through Studio/Builder packaging and reopening.
- Add read-only RAM recording/replay evidence helpers and bounded source-linked
  sprite/indirect graphics support for development workflows.
- Guard startup while drafts restore, improve narrow-screen authoring controls,
  and add optional real-browser and sibling-Builder checks.

Validation: 244 Studio tests, 7 Studio/Builder interop tests, 2 complete Chrome
authoring flows, and edited PNG/TTF/current-unit display on AYN Thor with the exact
FE7 Vietnamese ROM. These checks do not establish arbitrary game readers or all
fonts/devices. See [trial scope](docs/TRIAL-READINESS.vi.md) and
[repeatable browser checks](docs/AUTHOR-FLOW-TESTS.vi.md).
The Studio version remains **0.3.0-beta.1**.

## Workspace overhaul (0.3.0-beta.1 source update)

- Separate Design, Code and Test workspaces with a plain-file Codex workflow.
- Source-folder reload/conflict protection, modular Lua editing, bounded undo and explicit drop placement.
- Keep native pack metadata, source modules and assets; simplify advanced memory/device tools.
- Retain English and Vietnamese UI and add narrow-screen dock switching.
- Update the transitive undici development dependency to 7.30.1.


## 0.3.0-beta.1

- Game-neutral visual editor with a dedicated preview implementation.
- English default UI and Vietnamese option.
- Inspector Content/Appearance/Behavior sections and global Project Tools.
- Strict typed layout/project/bridge contracts; type-check errors resolved without disabling checks.
- Create/edit/import/select custom Lua in Studio; native direct/pointer memory fields, masks and shifts.
- Generated Lua regression tests run in Lua 5.4; preserve custom imported scripts and metadata.
- Preserve project identity/data/canvas metadata when compiling skins.
- Bounded ZIP inflation, safe pack paths and bounded layout traversal.
- Read-only local bridge validation, confirmed device handshakes and stale-response protection.
- Public source packaging allowlist, attribution, contributing/security documentation and CI.

This is a development beta. Automated checks and browser tests do not replace testing each companion on its target emulator/device.
