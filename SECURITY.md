# Security

Run Studio on loopback only (`127.0.0.1`). It is a local development tool, not a public web service. Do not expose the server or ADB bridge to a network or reverse proxy.

The Studio bridge accepts read-only memory commands. Enable Studio Connection in a compatible emulator session only when needed. Lua is saved/exported, never executed by the Studio interface. Tests execute generated synthetic Lua in a dedicated test VM.

ZIP imports are limited to 128 MiB compressed, 256 MiB expanded, 32 MiB per file and 10,000 entries. Pack paths must be relative. Layout traversal is bounded. These limits reduce resource exhaustion; do not import files from sources you do not trust.

Do not post credentials, ROMs, private packs or RAM captures in public issues. For a security report, use the repository's private vulnerability reporting feature when enabled, or contact its maintainer privately. If no private channel is available, open an issue asking for one without exploit details.
