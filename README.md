# GBA Duo Studio

A local visual editor for companion interfaces: build a scene, edit properties, preview sample or live data, and export a companion ZIP.

Design, Code and Test are the main workspaces. Use a plain source folder with Codex,
then continue visually in Studio. See [the workspace workflow](docs/STUDIO-OVERHAUL.md).

The **2026-10-28 authoring update** keeps version **0.3.0-beta.1** and adds guided
editing, reusable data blocks, image/font replacement and shared Builder checks.
See [what changed](CHANGELOG.md) and the [verified trial scope](docs/TRIAL-READINESS.vi.md).

Development builds also offer [live ROM/graphics inspection](docs/ROM-GRAPHICS.md)
and image blocks that load art from the player's ROM instead of bundled PNGs.

Use **Edit a companion** to open an existing ZIP, find a label/component, change
static text or inline colors, and export a copy while preserving its reader and
assets. The guide is available in English and Vietnamese. See the
[Vietnamese editing walkthrough](docs/EDIT-COMPANION.vi.md).

**Connect data** adds text, a current/maximum bar or a simple repeated list
from the existing companion's named fields. It can also reconnect existing
text/bars without rewriting their reader. See [the data-binding guide](docs/CONNECT-DATA.vi.md).

**Check pack** reports missing entry scripts/static images, unresolved sample
bindings and incomplete export settings, with links to the component or panel
to fix. See [export checks and their limits](docs/PACK-CHECKS.vi.md).

**Function blocks** inserts a character card or stat table using existing named
data fields, with editable labels and optional portrait/level/value bar. The
blocks inherit the project theme and preserve its reader. See the
[block library guide](docs/FUNCTION-BLOCKS.vi.md).

Maintained by [levi-soft](https://github.com/levi-soft). Studio creates packs for [GBA Duo by khumam](https://github.com/khumam/gba-duo); thank you to its author and contributors for the original companion format and emulator. Studio is a separate community authoring tool, not the official emulator or simulator.

[Hướng dẫn tiếng Việt](README.vi.md) · Development beta **0.3.0-beta.1** · Community project, not an official GBA Duo release.

![Studio workspace with the neutral starter project](docs/images/studio.png)

## Start

Clone the repository and enter its directory:

```sh
git clone https://github.com/levi-soft/gba-duo-studio.git
cd gba-duo-studio
```

Use `Run-Studio.bat`, or run `npm ci` followed by `npm run dev -- --host 127.0.0.1`. Node.js 22.17 or newer is required. Keep the server bound to your own computer.

Open the local address printed by Vite (normally `http://127.0.0.1:5173`). Windows users can close the launcher-managed server with `Stop-Studio.bat`; in a terminal, press Ctrl+C. Internet is needed for the initial dependency installation; sample-data design does not require a connected handheld.

Read the complete user guide in [English](docs/USER-GUIDE.md) or [Tiếng Việt](docs/USER-GUIDE.vi.md).

The interface defaults to English. Select **Tiếng Việt** in the top menu to switch; the browser remembers your choice. New project templates follow that choice, while existing project text stays unchanged.

## Works with GBA Duo Plus

[GBA Duo Plus](https://github.com/levi-soft/gba-duo-plus) is our companion-enabled Android emulator fork. Studio **supports its optional Studio Connection** for read-only live RAM inspection and previewing the assigned companion's runtime data over USB/ADB. Download [Plus 0.1.6](https://github.com/levi-soft/gba-duo-plus/releases/tag/plus-v0.1.6), enable Studio Connection inside a game, then follow the [connection guide](docs/USER-GUIDE.md#connect-a-handheld-for-read-only-ram-tools).

The workflow is **design in Studio → export Pack ZIP → import/assign in Plus → test on the handheld**. Native-format packs can also target compatible official GBA Duo versions; Plus is needed only for features that require its host support, such as this live bridge.

## Authoring tools

- Scene hierarchy, component palette, drag/drop, Inspector, assets, undo and redo.
- Custom canvas dimensions, visual styles, bindings, conditional classes and navigation.
- Project save/load and companion ZIP import/export, preserving Lua and binary assets.
- Three neutral starter templates without ROM content.
- Data for preview values; verified native RAM fields and pulse configuration remain under Advanced.
- Code for individual Lua modules, manifest, layout, CSS and sample JSON; entry selection is explicit.
- ADB-connected read-only memory tools for compatible emulator builds. In [GBA Duo Plus 0.1.6](https://github.com/levi-soft/gba-duo-plus/releases/tag/plus-v0.1.6), enable **Studio Connection** from the game's quick menu before connecting.

The preview does not execute ROMs or Lua. Validate generated companions on the target device. Hardware input/control features depend on emulator support; exporting a layout does not require a particular fork.

Studio does not automatically discover a game's memory layout or implement its rules. Creators supply the addresses and, when needed, Lua logic. See [the complete authoring workflow](docs/AUTHORING.md).

English is the default documentation and interface language. [README tiếng Việt](README.vi.md) and the [Vietnamese user guide](docs/USER-GUIDE.vi.md) cover the same installation and authoring workflow.

## Development

The optional `npm run test:builder` gate checks save/package/reopen/edit cycles
against a sibling Companion Builder checkout. It uses synthetic data and keeps
both repositories independently buildable. See [Builder roundtrip checks](docs/BUILDER-ROUNDTRIP.md)
for setup, preserved editor settings and the boundary with device acceptance.

```sh
npm run verify
npm run source:zip
```

Verification runs strict type checks, source-boundary checks, tests and a production build. The optional source ZIP is written to `.studio-runtime/distribution/` and excludes private projects, device captures, Git history and installed dependencies. CI runs on Windows and Linux with Node 22 and 24. Local browser/device results are recorded separately from CI; the optional interop/browser gates have their own setup instructions.

The optional `npm run test:ui` gate exercises the real Vietnamese authoring flow in desktop/phone browser viewports. See [browser setup and evidence](docs/AUTHOR-FLOW-TESTS.vi.md) and [local trial readiness](docs/TRIAL-READINESS.vi.md). It uses isolated browser contexts and synthetic pack/ROM data; Android runtime acceptance is separate.

The active preview implementation is in `src/lib/preview/`. See [workspace boundaries and Inspector organization](docs/WORKSPACE.md).

## License and attribution

GPL-3.0-only; see [LICENSE](LICENSE) and [NOTICE.md](NOTICE.md). The compatible baseline CSS includes adaptations from GBA Duo under its GPL license. Third-party dependency notices are in [THIRD-PARTY-NOTICES.txt](THIRD-PARTY-NOTICES.txt). Studio's license does not change the rights to companion assets or scripts.

Private projects, game adapters/assets, releases and historical archives are outside this source distribution. Review [SECURITY.md](SECURITY.md) before using live memory tools and [CONTRIBUTING.md](CONTRIBUTING.md) before submitting changes.
