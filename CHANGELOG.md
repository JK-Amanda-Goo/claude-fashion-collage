# Changelog

All notable changes to this project are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

## [0.7.0] - 2026-09-23
### Added
- Canvas titles are now editable: click the title on a canvas page to rename it inline (Enter to save, Escape to cancel).

## [0.6.0] - 2026-09-19
### Added
- 7-day trial enforcement: new signups get a trial that expires `TRIAL_DAYS` (default 7) days after signup. Creating a new canvas or uploading a photo after the trial ends is blocked and redirects to `/account` instead, which now shows an "expired" message and marks the Trial plan as expired rather than current.

## [0.5.0] - 2026-09-18
### Added
- `/account` page previewing the upcoming Basic ($5/mo) and Pro ($20/mo) plans alongside the current Trial plan, linked from the tier badge in the header. Upgrade/manage actions are disabled ("Coming soon") until Stripe billing is wired up.

## [0.4.0] - 2026-09-17
### Added
- Server-side authentication: `users` table with signed httpOnly session cookies, replacing the old client-only (localStorage) login. Lays the groundwork for gating paid subscription tiers.
- Subscription tier badge shown in the header, sourced from the server session (defaults to `trial` on signup).

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

[Unreleased]: https://github.com/JK-Amanda-Goo/claude-fashion-collage/compare/v0.7.0...HEAD
[0.7.0]: https://github.com/JK-Amanda-Goo/claude-fashion-collage/compare/v0.6.0...v0.7.0
[0.6.0]: https://github.com/JK-Amanda-Goo/claude-fashion-collage/compare/v0.5.0...v0.6.0
[0.5.0]: https://github.com/JK-Amanda-Goo/claude-fashion-collage/compare/v0.4.0...v0.5.0
[0.4.0]: https://github.com/JK-Amanda-Goo/claude-fashion-collage/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/JK-Amanda-Goo/claude-fashion-collage/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/JK-Amanda-Goo/claude-fashion-collage/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/JK-Amanda-Goo/claude-fashion-collage/releases/tag/v0.1.0
