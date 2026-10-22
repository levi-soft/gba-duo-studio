# Studio 0.3.0-beta.1 validation

- Private projects, releases, assets, game adapters, scripts, RAM captures and historical Git metadata moved to the sibling private workspace. The original private editor source was copied before changing generic source.
- Generic Studio source/static scan: passed, no private game references found.
- Studio tests: 91 passed in 16 files, including actual execution of generated Lua 5.4, ZIP path/inflation guards, layout/data budgets and bridge request/session validation.
- Production builds: generic Studio passed; preserved private editor passed.
- Private tests: 147 passed and one timed out at the default 5-second limit under parallel load. The affected equipment file passed all four tests when rerun with a 15-second limit.
- Browser: Content/Appearance/Behavior switching, Project Tools, English/Vietnamese, direct/pointer fields with mask/shift, custom Lua save and ZIP download checked in a fresh headless Chrome context. The downloaded ZIP retained its fields and UTF-8 Lua. Custom design sizes 1280x720, 800x600 and 1240x1080 checked without document horizontal overflow. No page errors observed.
- Strict check: **0 errors, 0 warnings**. Strict mode remains enabled; no check suppression was added. This supersedes the earlier 812-error report.
- Dependency check: NPM Audit's remote endpoint timed out. OSV querybatch was used as an independent fallback for all 161 exact package versions in the lockfile; zero matching vulnerability records returned. This is not a guarantee of absence of vulnerabilities.
- GPL license and attribution added for the native compatible CSS baseline; third-party notices generated from the dependency tree. Original simulator code/history remains excluded. This is a technical source review, not a legal certification.
- No hardware test performed for this Studio change. GitHub CI is configured but has not run remotely.
- Clean source smoke test: exported allowlisted ZIP extracted into a new folder, `npm ci --no-audit` installed dependencies independently, then `npm run verify` passed with 0 errors/0 warnings, 91 tests and a successful build. Local execution used Node 26.4 on Windows; Node 22/24 and Linux remain CI targets rather than locally verified environments.

Imported Lua and adapter metadata are preserved on export. Live Lua data uses the assigned companion runtime over the emulator bridge; the generic editor contains no built-in game adapter.

## Commit readiness recheck

Rechecked after GBA Duo Plus 0.1.6 publication: `npm run verify` passed again (0 strict diagnostics, 91 tests, successful production build). `npm audit --audit-level=moderate` completed with zero reported vulnerabilities. The allowlisted source ZIP was regenerated successfully. README now links Plus 0.1.6, and Windows launcher messages are English. This recheck did not repeat browser/device testing or execute GitHub CI.
