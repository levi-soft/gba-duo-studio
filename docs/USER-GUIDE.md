# GBA Duo Studio user guide

[Tiếng Việt](USER-GUIDE.vi.md) · [Home](../README.md)

## Requirements and installation

Use Node.js 22.17+ and npm. Git is needed for cloning; alternatively extract the repository's source ZIP. Install dependencies with `npm ci`, then run `npm run dev -- --host 127.0.0.1`. Windows users may run `Run-Studio.bat`, which installs missing dependencies and opens the local interface. Keep the terminal running when starting Vite manually.

Open the address shown in the terminal, normally `http://127.0.0.1:5173`. Keep Studio local; do not expose its server to the Internet. The Windows launcher uses port 5173 and refuses to replace another application already using it. `Stop-Studio.bat` stops only its verified launcher-managed process; Ctrl+C stops a manually launched server.

## Language and workspace

English is the default. Choose **Tiếng Việt** in the top menu; the browser remembers the choice. Newly created starter content follows that language. Switching language does not translate text in existing companion projects.

The left side contains Scene, Components and Assets. The center contains the 2D design canvas, Preview and data tools. Inspector is on the right: **Content** edits values, **Appearance** edits visual style and **Behavior** edits interactions. Global data/script settings are in **Project Tools**.

## Create, save and export

1. Create a project or choose a neutral template. Set the project name, game code and target design dimensions in Project.
2. Add containers, text, images, progress bars, lists and buttons. Drag components into their containers and edit their size, spacing and style in Inspector. Import your own images, SVGs and fonts through Assets.
3. Supply sample data and bind text using `{field}`. Progress bars and repeated lists use their configured data fields. Preview supports page/tab actions; 2D mode is for selecting and editing components.
4. Use **Save Project** to download the editable project. Browser storage is convenient but is not your backup. Keep project files outside the Studio source folder.
5. Export **Pack ZIP**, import it into GBA Duo and assign it to the matching game. Saving an editable project and exporting a runtime pack serve different purposes; keep both when maintaining a companion.
6. Test actual screen dimensions, long names, changing values, scrolling, tabs and touch actions on the target device. A design preview is not proof of emulator compatibility.

You can reopen a project or import an existing pack. Imported Lua and assets are preserved; review rights before redistributing them.

## Game data and Lua

Studio does not automatically discover RAM meanings. In Project Tools, configure verified direct addresses or pointer-plus-offset fields, numeric types, masks and shifts. Simple packs can use native manifest values without custom Lua. For advanced logic, import/create a Lua script, edit it and choose **Save and use this script**. See [advanced authoring](AUTHORING.md).

The preview does not execute ROMs or arbitrary Lua. Live scripted values come from the matching companion running inside the emulator. Built-in RAM fields/inspector cover GBA EWRAM/IWRAM; do not assume the same addresses or tools work for GB/GBC.

## Connect a handheld for read-only RAM tools

1. Install [GBA Duo Plus 0.1.6](https://github.com/levi-soft/gba-duo-plus/releases/tag/plus-v0.1.6) or a compatible bridge-enabled build. Ordinary exported packs do not require Plus-only functionality.
2. Install Android SDK Platform-Tools on your computer. Put `adb` on PATH, or set `GBA_DUO_ADB` to its absolute executable path before starting Studio.
3. Enable USB debugging on the handheld, connect USB and approve the computer's authorization prompt. `adb devices` should show the device as `device`.
4. Open the game in Plus and enable **Studio Connection** in its quick menu for this session.
5. In Studio's RAM tools, refresh devices, select the connected device and connect. Read known address ranges, monitor values or capture memory for private analysis. The connection is read-only.

Studio uses a local ADB forward on port 8787. It does not offer arbitrary shell execution or memory writes. Do not publish ROMs, credentials or memory captures.

## Troubleshooting and scope

| Symptom | Check |
|---|---|
| Startup fails | Confirm a supported Node version with `node --version`; run `npm ci`; read the terminal or `.studio-runtime/server-error.log`. |
| Port 5173 is occupied | Close your previous Studio session, or start Vite manually with another local port. Do not terminate an unrelated application. |
| No handheld is listed | Check USB cable, USB debugging, ADB installation and device authorization. |
| Bridge does not connect | Keep the game running, enable Studio Connection again for the session and verify that port 8787 is available. |
| Sample data appears but live values do not | Check game code, assigned companion, verified addresses and selected data source. Studio does not supply game adapters. |
| Layout differs on the handheld | Check target aspect ratio, native widget/CSS support and emulator-specific actions; test the exported pack on that device. |

This is beta software. Automated verification is `npm run verify`; `npm run source:zip` creates an allowlisted source archive. See [validation evidence](VALIDATION-2026-10-22.md), [security](../SECURITY.md), [license/credits](../NOTICE.md) and [contributing](../CONTRIBUTING.md). Report issues at [levi-soft/gba-duo-studio](https://github.com/levi-soft/gba-duo-studio/issues) without private game data.
