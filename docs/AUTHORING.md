# Companion authoring workflow

## Visual design

Create a neutral template or open a project/pack. Set the design screen dimensions in Project, then place widgets using Scene, Components and the canvas. Use Content for values, Appearance for visual style and Behavior for navigation, bindings and touch actions. Assets can contain your images, SVGs and fonts.

Sample data is for design only. Bind text with `{field}`, bars with `$hp` / `$maxHp`, and lists with an array path. Use a list template to bind each repeated item's own fields. Preview mode allows tab and action interaction; 2D mode selects and edits the design.

## Live values

Set the four-character game code in Project. Enable Studio Connection in a compatible GBA Duo Plus session, connect over USB/ADB, then open RAM tools. ADB must be on PATH or configured with `GBA_DUO_ADB` as an absolute executable path. The bridge is read-only.

In Project Tools, add a direct address or a pointer address with offset. Choose `u8`, `s8`, `u16`, `s16`, `u32` or `s32`; optional hexadecimal masks and shifts expose flags/packed data. These fields export through the native `manifest.values` mechanism without a Lua script.

The default fields reader and RAM inspector support GBA EWRAM/IWRAM. Do not interpret this as universal GB/GBC memory-address support. A visual pack can be used with other supported systems, but its data adapter must match the target emulator/API.

## Custom logic

For game-specific calculations, rosters or state detection, open **Project Tools → Lua script**. Create/import a file, edit it and select **Save and use this script**. The selected path becomes `manifest.script`; other Lua files remain in the ZIP for modules.

The starter is only an example address, not a useful adapter for every game. Replace it with addresses verified for your ROM. Use the emulator's Lua API documentation for `mem`, `gfx` and actions. Studio stores custom Lua as UTF-8/base64 and preserves it byte-for-byte on export. It does not run arbitrary Lua in the design preview. Live scripted data comes from the matching companion assigned in the emulator.

Imported generated Studio scripts are regenerated only if they carry Studio's own marker and corresponding configuration. Editing one in the script editor converts it into a custom script so subsequent export preserves the edited source.

## Export and validation

Save the editable project separately, then export Pack ZIP. The ZIP contains native manifest/layout/CSS, assets and any selected scripts; editor-only design metadata is separate. Import that ZIP into the target emulator and assign it to the correct game.

Check the target screen's aspect ratio, long text, changing data, lists, tabs, touch actions and stale/disconnected memory states. Official GBA Duo does not automatically gain Plus-only bridge/control features from a pack. A successful Studio build or preview is not proof of complete device compatibility.

Never include ROMs, BIOS files or assets you do not have permission to distribute in a public pack or Studio contribution.
