# Changelog

## 0.3.0 — 2026-07-23

### Added

- **Crush CLI support.** Added `.crush-plugin/marketplace.json` so Crush users can discover DS4CC plugins and install their `SKILL.md` payloads via `options.skills_paths`.
- Added `scripts/build-crush-marketplace.py` to validate plugins and generate the Crush catalog deterministically.
- Added `tests/test_build_crush_marketplace.py` for the new builder.
- Updated the `ds4cc-docs` skill, root README, and the `ds4cc` plugin README with Crush CLI install instructions.

### Changed

- Bumped the `ds4cc` meta-plugin to `0.3.0` to reflect new Crush CLI documentation.
- Bumped root `kimi.plugin.json` and `.claude-plugin/marketplace.json` metadata to `0.3.0`.
- Regenerated `.kimi-plugin/artifacts/ds4cc-0.3.0.zip` and updated `.kimi-plugin/marketplace.json` and `.grok-plugin/marketplace.json` with the new `ds4cc` version.
- Reordered CLI mentions so Crush CLI is highlighted without removing existing GitHub Copilot CLI support.
