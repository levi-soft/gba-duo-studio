> Historical documentation: discovery, profile-import and automatic bar-generation tools described below were removed from the current workspace. Use Code for source files, Data for preview values and verified fields, and Device for read-only inspection.

# Guided HP discovery

[Tiếng Việt](HP-DISCOVERY.vi.md)

In **RAM Thor**, connect a running game through Studio Connection, then use **Find character HP — guided**.

1. Enter the HP currently shown for one character and capture it.
2. Damage or heal that same character. Enter the new HP and capture again. Repeat with further values if there are many candidates. Studio tests unsigned 8-bit and aligned unsigned 16-bit values across EWRAM and IWRAM automatically.
3. Choose a candidate, select **Watch this candidate**, and compare its displayed HP with the game as HP changes. Polling reads only that candidate every 750 ms, not full RAM.
4. Enter maximum HP and optionally a character name, then confirm the live value matches. Select **Create HP bar**. Studio saves the field and bar together in one undoable edit. Names for data fields are assigned automatically.
5. Export the ZIP normally. The player reads the direct RAM field using the standard manifest; Studio and a custom Lua script are not needed while playing.

Maximum HP is a constant chosen by the author in this first workflow. It does not increase automatically on level-up. The discovered field uses a direct address: it is not automatically the selected character and may move after a scene change, a different deployment, or loading a save. Test these cases before sharing a pack. Encoded, signed, unaligned 16-bit, 32-bit and pointer-driven values need the advanced tools. Two different HP values are required before choosing a candidate; matching those values alone does not prove its meaning.

Snapshots are transient editor state, never companion files. Switching away from the RAM view or reloading Studio discards the scan; finish the scan before switching. A changed game session blocks refinement and creation until a new scan starts. A failed live read retains the last value, labels it as the last reading, and disables creation until live checking resumes. Existing custom Lua is preserved: use a separate project for this workflow when a project has a custom script.
