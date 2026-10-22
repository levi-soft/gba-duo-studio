# Contributing

Use Node.js 22.17+ and `npm ci`. Run `npm run verify` before proposing a change. Keep the compiler, preview and native pack format consistent; add a regression test for behavior changes.

Keep Studio game-neutral. Do not add ROMs, BIOS files, extracted game assets, game-specific memory addresses/adapters, private companion projects, secrets or device captures. Use synthetic data and neutral test fixtures.

The interface defaults to English and supports Vietnamese. New visible controls must have entries in the locale catalog. Normal design work should remain visual; code editing is an advanced path.

Test custom aspect ratios, nested lists, tab navigation, imported Lua preservation and asset identity when changing layout or export. Automated/browser success does not establish device compatibility. State exactly what was tested on hardware.

Contributions must be compatible with the project's GPL-3.0-only license. Preserve third-party attribution. Do not copy code from an unlicensed repository.
