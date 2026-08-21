# Changelog

All notable changes to this project are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

## [0.3.0] - 2026-08-21
### Added
- Postgres event logging (Vercel Postgres / Neon): `events` table records `login`, `canvas_created`, and `photo_uploaded` per user, queryable by user, event type, canvas, or time.

## [0.2.0] - 2026-08-20
### Fixed
- Analysis prompt no longer surfaces non-purchasable items (tattoos, hairstyles) as shopping items.
- "Save" (search) and "Discover more" now show an error message on API failure instead of failing silently.

## [0.1.0] - 2026-04-30
### Added
- Email/password auth (client-side, local storage).
- Langfuse tracing for image analysis calls.
- Initial test suite.

[Unreleased]: https://github.com/JK-Amanda-Goo/claude-fashion-collage/compare/v0.3.0...HEAD
[0.3.0]: https://github.com/JK-Amanda-Goo/claude-fashion-collage/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/JK-Amanda-Goo/claude-fashion-collage/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/JK-Amanda-Goo/claude-fashion-collage/releases/tag/v0.1.0
