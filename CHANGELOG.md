# Changelog

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
