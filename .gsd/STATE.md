# GSD State

**Active Milestone:** M004 — Cloud Sync & Platform
**Active Slice:** None
**Phase:** planned (roadmap written, ready for slice execution)
**Requirements Status:** 35 active · 0 validated · 3 deferred · 2 out of scope

## Milestone Registry
- ✅ **M001:** Core Training Engine
- ✅ **M002:** Analytics & Progression Intelligence
- ✅ **M003:** Monetization & Premium Features
- 🔄 **M004:** Cloud Sync & Platform — 5 slices planned (S01–S05 + S05 i18n)

## M004 Slices
- [ ] **S01:** Backend API + Auth + Mobile Sign-In `risk:high`
- [ ] **S02:** Sync Protocol + Two-Way Sync `risk:high`
- [ ] **S03:** Data Export (CSV/JSON) `risk:low`
- [ ] **S04:** Sync Status UI + Account Settings `risk:low`
- [ ] **S05:** i18n — German + English `risk:low`

## Recent Decisions
- D098 — Custom REST sync over PowerSync (keep existing SQLite layer)
- D099 — `@capgo/capacitor-fast-sql` stays, no plugin swap
- D100 — Incremental push/pull with `updated_at` high-water mark, LWW per row
- D102 — Deterministic UUIDs for seed exercises
- D106 — Sync triggers: after sign-in, app resume, connectivity change, manual
- D107 — 7 user tables sync; seed exercises shared via deterministic UUIDs

## Blockers
- None

## Next Action
Plan and execute S01 (Backend API + Auth + Mobile Sign-In).
