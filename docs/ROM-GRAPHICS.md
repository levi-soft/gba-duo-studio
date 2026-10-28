# Live ROM and graphics inspection

[Tiếng Việt](ROM-GRAPHICS.vi.md)

This development feature requires GBA Duo Plus with `bridgeVersion: 2` and
`capabilities.inspect`. Enable Studio Connection in the current game session,
then connect from **RAM Thor**. Older builds retain RAM tools; update Plus to
enable the graphics viewer. Studio remains game-neutral.

## Preview and create an image block

1. In **RAM Thor → ROM & graphics inspector**, choose the OBJ VRAM, BG VRAM or
   ROM starting preset. VRAM presets expose the current game's raw tile memory;
   they are not automatic portrait or sprite recognition.
2. Choose the tile address, palette address, width/height (multiples of 8, at most
   256) and whether the ROM tiles use GBA type-0x10 LZ77 compression.
3. Select **Preview from game**. The viewer reads pixels locally through USB/ADB.
   Index zero is transparent; palette channels match native `gfx.decode`.
4. Give the image block a unique key, select a container in Scene and choose
   **Add bound image**. An image bound to that key appears in the 2D canvas.
5. Export and import the companion ZIP through the normal workflow. Studio
   generates sandboxed Lua calling `gfx.decode` against the player's loaded ROM
   for ROM graphics. Work-RAM fields can coexist with these generated images.

## Storage and compatibility

- A descriptor stores addresses, dimensions and compression. Preview pixels are
  transient editor state, not `project.files` or `preview-data.json`. After a
  reload, select the saved image source, preview again and choose **Refresh linked
  image preview** to see the ROM art in Studio. Existing imported game art
  is not removed automatically; audit those assets separately.
- Generated packs use the existing native `gfx.decode` API. The revision-2 bridge
  is needed while designing, not while playing the exported pack.
  The player must support that API (official 0.1.7 or a compatible build); this
  does not promise compatibility with older players lacking ROM graphics APIs.
- VRAM/palette-RAM previews are for live inspection. Exportable blocks currently
  require both tiles and palette in ROM: native `gfx.decode` caches images by
  source descriptor and does not promise live animation refresh from VRAM.
- Custom Lua is preserved. Adding visual ROM blocks to custom-script projects is
  refused instead of silently replacing or ignoring their code.
- The viewer supports sequential 4bpp tile images, one-hop ROM pointers, and
  up to 32 raw sprite parts. Sequential ROM tiles can use LZ77. Tilemap editing,
  pointer chains, animation and automatic game-art discovery remain separate work.
- Each inspection is limited to 64 KiB, split into ranges of at most 4096 bytes.
  Palette and tile bytes for one preview are read in the same inspection response.
  Unknown capabilities, wrong ROM filters, changed sessions, truncated responses,
  invalid LZ77 and out-of-bounds sources produce errors. A failed refresh retains
  the last preview, marks it stale and prevents adding it under changed settings.
- The bridge is read-only, session-opted-in and local to ADB. It does not read
  arbitrary PC files, expose account credentials or execute uploaded scripts.

## Consecutive image browser

Choose an uncompressed image size and palette, then select **Browse consecutive images**. Studio reads up to 16 images (at most 256 pixels high in the combined read) and displays selectable thumbnails. Click a thumbnail to select its exact source, then add a bound image as usual. Settings or session changes disable old results until refreshed. This assumes consecutive equal-size images with one shared palette; it does not discover addresses or recognize portraits automatically.

Use **Previous page** / **Next page** to move by an entire batch, and **Previous palette** / **Next palette** to move by one 32-byte, 16-color palette. Navigation uses the batch start even after selecting a thumbnail. Failed reads preserve settings and prior results. These controls browse raw data; they do not identify which palette belongs to an image.

**Compare 8 palettes** reads the current tile source and eight consecutive palettes in one inspection response. Select a thumbnail to use that palette and preview when adding the image block. Both compressed ROM tiles and uncompressed tiles are supported. No color recognition is implied; if the source is near the memory-region or ROM end, the comparison is rejected rather than reading beyond it. Preview pixels remain transient.

## ROM pointers and offsets

Enable **Tile address contains a ROM pointer** and/or the equivalent palette
checkbox. That address becomes the location of one little-endian 32-bit pointer,
not the location of pixel data. An optional signed byte offset is added after
dereferencing. With the checkbox off, the offset is added to the direct address.
Both pointer locations and their targets must be in ROM. This is one hop; it
does not resolve a character ID, pointer chain or a game-specific portrait table.

Studio first reads the pointers, then reads their words again together with the
pixel/palette snapshot. A changed word, session, device or ROM invalidates the
read. Source extents are checked against the actual ROM size. Export preserves
the pointer descriptor; generated Lua resolves it through `mem.u32`, guards the
ROM window, then invokes the existing graphics API. New image blocks bind the
project to the observed CRC32 when it previously had only a game-code filter.

## Compose raw sprite / portrait parts

Select **Sprite parts · 1D tiles**. Set an output canvas (multiples of 8, at most
256×256), then add parts. Each part has X/Y placement, width/height in
8/16/32/64, first tile number, palette bank 0–15, and horizontal/vertical flips.
Tile numbers count 32-byte 4bpp tiles from the resolved tile base; banks count
32-byte palettes from the resolved palette base. A part's own tiles follow 1D
row-major mapping. Earlier parts cover later parts; index zero is transparent.
Negative placement clips at the output canvas. **Move forward** swaps a part
with its predecessor. Raw 2D sheets can be described with row-sized parts when
the whole composition fits the 32-part limit; arbitrary sheet layouts are not
automatically inferred.

The preview matches native `gfx.sprite`; exported Lua uses that same API.
The player must provide `gfx.sprite` (as the current official/Plus source does).
Native sprite composition does not accept LZ77, so this mode intentionally uses
raw tiles. Compressed portraits that need multipart rearrangement are not an
exportable source in this workflow. Use sequential mode for compressed sheets.
Pointer and multipart modes disable consecutive browsing/palette comparison,
which operate on direct sequential images. Reads still obey 64 KiB / 64 ranges;
duplicate/overlapping part sources are merged before reading. Only descriptors
are saved; decoded artwork is never added automatically to the project or ZIP.
