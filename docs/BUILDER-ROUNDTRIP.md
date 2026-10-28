# Studio and Builder roundtrip checks

Studio and Companion Builder are independently buildable repositories. The
optional integration gate exercises both current checkouts together:

```sh
npm run test:builder
```

By default it reads `../GBA-Duo-Companion-Builder/site/`. Set
`GBA_DUO_BUILDER_DIR` to another prepared Builder checkout if needed. Missing
files stop the gate with an explicit message. The normal Studio test suite
does not require a sibling checkout, and no Builder source is copied into
the Studio production bundle.

The gate uses Studio's actual authoring/import/export helpers, Builder's
actual browser compiler/packager/template helpers, and synthetic `TEST` data.
It checks saved project JSON → Builder ZIP → Studio reopen/edit → Studio ZIP
→ Builder rebuild, including:

- Custom design dimensions and grid settings, Unicode labels and zero/false.
- Existing layouts, Builder card/table templates and conditional styles.
- Text/list field changes after reopening and data-driven stat labels.
- Literal wording changes around preserved native data tokens after reopening.
- Image/font asset edits and their original/new file bytes across both packagers.
- Original Lua/module/opaque resource bytes, native values, ROM matching and
  sample data across repeated cycles.

These are native-format/authoring/packaging checks, not a browser file-picker
test, execution of arbitrary Lua, live RAM discovery or Android acceptance.
Use `npm run verify` as the standalone Studio gate and `npm run check` in
Builder alongside this optional gate.

The optional gate also checks that Studio's `project-diagnostics.js` mirror
matches Builder's readable `ui/project-diagnostics.js`. Both tools inspect the
same saved source and must agree on dependency severities, fields and paths.
Builder embeds the authored source during its normal build, so standalone
Studio and the standalone Builder runner do not need the other checkout at
runtime. When changing shared rules, update both mirrors, regenerate Builder
and run both standalone gates plus `npm run test:builder`.

## Editor metadata in ZIP files

Both exporters write design dimensions and optional grid settings in
`studio-design.json` version 1. They remain editor metadata; they do not change
the native manifest's canvas or RAM settings. Studio restores them only when
the metadata's generated layout/CSS exactly match the actual runtime files.

Dimensions must be integers from 64 through 8192. Grid settings require boolean
`visible`/`snap` and an integer `size` from 1 through 512. Invalid optional values
are ignored. Existing packs without matching settings keep the legacy default
canvas; their original dimensions cannot be inferred from a missing record.

Opening the editable `.gbastudio.json` remains the way to retain the complete
project independently of a runtime ZIP. Device checks should use a separate
test pack and keep ROM-derived materials in the private workspace.
