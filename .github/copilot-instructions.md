# VacuumStreamer integration guidance

This repository is the `Chorty/Valetudo` fork on `master`. It integrates the `vacuumstreamer-plugin` submodule and the separate native `Chorty/vacuumstreamer` companion for a Dreame L10S Pro Ultra Heat.

Read these files before changing the integration:

1. `MEMORY.md` — current repository, deployment, backup, and verification state
2. `CLAUDE.md` — architecture, APIs, build/deploy safety, MQTT/Home Assistant, and MCP conventions
3. `mcp-server/README.md` — MCP configuration and tool inventory
4. `vacuumstreamer-plugin/README.md` — plugin MQTT/Home Assistant behavior

Development constraints:

- Keep plugin backend implementation in the submodule; keep parent hooks small.
- Commit and publish plugin changes before updating the parent submodule pointer.
- Do not restore the removed video-quality API or MCP tools unless a real recorder/capture control is implemented and verified.
- Preserve filesystem allowlists, archive validation, joystick zero-motion behavior, request timeouts, and secret-free errors.
- Never commit credentials, SSH keys, backups, firmware extracts, generated binaries, or device data.
- Run lint, type checks, backend/plugin/MCP tests, the frontend production build, and ARM64 packaging for release candidates.
- Deploy only an identified commit/artifact after a fresh local backup and remote checksum verification, with automatic rollback and a 60-second health gate.

The robot is normally reached with `ssh vacuum`; key material is managed outside Git.
