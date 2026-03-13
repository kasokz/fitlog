# GSD State

**Active Milestone:** M002 — Analytics & Progression Intelligence
**Active Slice:** None
**Phase:** planned (roadmap written, ready for slice execution)
**Requirements Status:** 35 active · 0 validated · 3 deferred · 2 out of scope

## Milestone Registry
- ✅ **M001:** Core Training Engine
- 🔄 **M002:** Analytics & Progression Intelligence (7 slices planned)
- ⬜ **M003:** Monetization & Premium Features
- ⬜ **M004:** Cloud Sync & Platform

## Recent Decisions
- D042: Analytics service layer as pure functions + repository in `src/lib/services/analytics/`
- D043: Epley formula for 1RM, null for reps >10
- D044: Three PR categories (weight, rep, e1RM)
- D045: Progression thresholds: >=2 sessions, avg RIR >=2, min 3 working sets
- D046: Deload hooks into existing pre-fill flow at session creation
- D047: Analytics via History sub-route + per-exercise detail (no 6th tab)
- D048: Freemium gate via local feature-flag service + @capacitor/preferences
- D049: LayerChart v2 via shadcn-svelte chart wrappers
- D050: Schema v5 composite index for analytics query performance

## Blockers
- None

## Next Action
Execute S01: Analytics Computation Engine & Schema
