# Source and attribution

GBA Duo Studio is a community visual companion editor. It is not an official release of GBA Duo and does not include an emulator, ROM, BIOS or private companion assets.

The project is distributed under **GPL-3.0-only**, with third-party components retaining their own notices. See `LICENSE` and `THIRD-PARTY-NOTICES.txt`.

## Native companion CSS

The `DEFAULT_CSS` baseline in `src/lib/preview/css.js` adapts GBA Duo's built-in companion stylesheet:

- Project: https://github.com/khumam/gba-duo
- Author/project owner: khumam and GBA Duo contributors
- Source: https://github.com/khumam/gba-duo/blob/main/app/src/main/assets/companion/default.css
- License: https://github.com/khumam/gba-duo/blob/main/LICENSE
- Changes: condensed baseline selectors, DOM selector adaptation, preview containment and device-density handling.

## Earlier simulator workspace

Early local development began in a checkout of https://github.com/khumam/gba-duo-companion-simulator. That repository did not provide a license at the time of this review. Its renderer, parser, binding/actions, stylesheet processor, file loader and editor implementation have been removed from the active project. The active preview modules were implemented separately for Studio. Historical files and Git metadata are excluded from this distribution.

The source review found no nontrivial identical simulator JavaScript blocks in the active implementation. This statement records the review performed; it is not a formal clean-room or legal certification. Generic Svelte/Vite scaffolding and compatible format terminology do not constitute an ownership claim over that simulator.

## Other dependencies

JSZip and the Svelte/Vite toolchain are installed from the versions pinned in `package-lock.json`. Their original licenses remain in the installed packages. The Wasmoon/Lua dependency is used only by tests and is not embedded in the Studio interface or exported companion packs.

Companion creators are responsible for the rights to their own pack assets and scripts. Studio's license does not change the license of an imported or exported companion.
