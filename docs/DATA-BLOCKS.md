# Data blocks without writing code

[Tiếng Việt](DATA-BLOCKS.vi.md)

Studio can create a working numeric companion from known memory addresses without
Lua, JSON or CSS authoring. Ordinary direct/pointer fields use GBA Duo's native
manifest values; a Lua script is not required for this workflow.

## Use an existing game profile

1. Create a **Blank page** project. Select the page's container in Scene.
2. Open **RAM Thor → Import data profile** and choose a profile JSON file.
   It supplies game/ROM filters and named numeric fields. You do not edit the JSON.
3. Under **Create a bound progress bar**, choose the current and maximum blocks,
   then click **Create progress bar**. The bar is inserted into the selected
   container and opens in the 2D editor.
4. Enable Studio Connection in Plus, connect USB, then select **Direct Thor · RAM
   field** as the preview source. Check that values match the game's screen.
5. Style the component with the Inspector and export the pack ZIP. Import it in
   GBA Duo and assign it to the matching game. The exported pack reads its own
   values; it does not need Studio, USB or a desktop connection while playing.

You can also declare known addresses through **Data → Field read from RAM**.
Use **Project** to set the matching game code/CRC32 in that case. Profile imports
refuse duplicate field keys, mismatching existing ROM filters and custom Lua
projects rather than replacing their behavior silently. Exporting a profile
includes only its name, version, game filters and memory specifications.

## Discover data for a game without a profile

Connect the handheld in **RAM Thor**. Under **Discover data blocks**, select a RAM
region and numeric type. Enter a known value, or leave it blank for an unknown
initial value, and choose **New scan**. Change the value through normal gameplay,
then use **Capture & filter** with equals, decreased, increased, changed or
unchanged. Repeat to narrow the candidates. Select a candidate, give it a unique
block key and save it. Test it repeatedly before claiming it is a verified field.

The first scan and each filter read the current memory. Filtering compares with
the preceding successful snapshot. Scans are read-only and not exported into the
project/pack. A changed session invalidates old candidates. An unsuccessful read
does not erase the previous successful scan. Only the first 100 candidates are
shown; keep filtering when the result set is larger.

## Scope

- Numeric signed/unsigned 8/16/32-bit values in GBA EWRAM/IWRAM are supported.
- An address can represent a fixed character slot, selected character, or another
  temporary game structure. Naming it `hp` does not identify its owner or make it
  follow the game cursor. Profiles must document what the fields represent.
- Existing pointer/offset fields can be imported or edited through the memory
  form. This scanner does not automatically find pointer chains or game rules.
- Invalid pointers and incompatible sessions are errors; zero is never used as a
  substitute for a failed live read.
- Profile files contain no graphics, scripts or captures. This does not audit
  other project files: review imported assets and previews separately before
  public distribution.
