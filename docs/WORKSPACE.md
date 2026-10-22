# Workspace boundaries

Studio contains the game-neutral visual editor, preview, data bindings and read-only live memory connection.

Private companion development is a separate sibling workspace: `../GBA-Duo-Companions-Private`.
It owns the projects, releases, ROM-derived assets, game adapters, extraction/build scripts and RAM captures. Its original editor source remains available for maintaining existing adapters.

Use Studio's **Open Project** or **Import pack ZIP** to edit a private companion. Imported Lua and unknown manifest metadata are preserved; Studio reads actual runtime script output from a matching companion assigned in GBA Duo Plus. Studio does not execute game-specific scripts locally.

Inspector sections:

- **Content**: component values and text.
- **Appearance**: fonts, dimensions, spacing, borders, backgrounds and visual states.
- **Behavior**: touch actions, navigation and conditional bindings.

**Project Tools** contains global memory fields and pulse configuration.

Run `node scripts/check-game-neutral.mjs`, `npm test`, and `npm run build` to check the active workspace. Browser validation and device validation remain separate.
