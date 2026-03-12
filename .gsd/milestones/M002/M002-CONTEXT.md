# M002: Analytics & Progression Intelligence — Context

**Gathered:** 2026-03-12
**Status:** Pending (depends on M001 completion)

## Project Description

M002 adds the intelligence layer on top of M001's training engine. It transforms raw workout data into actionable insights: strength curves with estimated 1RM over time, PR tracking, volume/tonnage trends, and — most importantly — RIR-driven progression suggestions that tell users when to increase weight. It also implements scheduled deload auto-adjustment within mesocycles.

## Why This Milestone

M001 gives users a great logger. M002 makes it a smart training partner. The progression intelligence (especially RIR-driven suggestions) is the core differentiator against competitors like Strong, Hevy, and JEFIT. This milestone also introduces the first freemium gate — basic history stays free, full analytics and suggestions become premium.

## User-Visible Outcome

### When this milestone is complete, the user can:

- View strength curves showing estimated 1RM progression per exercise over time
- See automatic PR detection and a personal records history
- View volume/tonnage trends per exercise and per muscle group
- Receive smart progression suggestions based on RIR trends ("You've hit RIR 2-3 consistently on Bench Press — consider adding 2.5kg next session")
- Have deload weeks auto-adjusted in their mesocycle (weight/volume reduced to ~60%)
- See a progress dashboard with interactive charts
- Hit the freemium boundary: basic history free, full analytics premium

### Entry point / environment

- Entry point: Native app — analytics tab/dashboard and inline suggestions during workout logging
- Environment: Mobile device (Capacitor hybrid app)
- Live dependencies involved: none (all computation is local — no server-side analytics)

## Completion Class

- Contract complete means: 1RM calculations are correct, PR detection is accurate, progression suggestions fire at the right time
- Integration complete means: Analytics read from real workout data in SQLite, suggestions appear during real workout sessions
- Operational complete means: Analytics dashboard loads performantly even with 6+ months of training data

## Final Integrated Acceptance

To call this milestone complete, we must prove:

- A user with 4+ weeks of workout history sees accurate strength curves, PRs, and progression suggestions
- Deload week auto-adjusts weight/volume correctly when the mesocycle reaches the deload position
- The freemium gate correctly separates free vs. premium analytics features
- Dashboard loads in <1 second with a realistic dataset

## Risks and Unknowns

- **1RM estimation accuracy** — Epley/Brzycki formulas are well-established but may need weighting or selection based on rep range. High-rep sets (15+) produce less reliable estimates.
- **RIR-driven progression algorithm** — No standard algorithm exists. Need to design the heuristic: how many sessions at RIR 2-3 before suggesting? What about per-exercise variation? Risk: medium.
- **Query performance with large datasets** — Aggregating months of workout data for charts could be slow on SQLite. May need materialized views or pre-computed aggregates. Risk: medium.
- **Freemium gate UX** — Must feel fair, not punitive. Risk: low (UX challenge, not technical).

## Existing Codebase / Prior Art

- M001's SQLite data layer with workout sessions, sets, RIR values
- M001's exercise library with muscle group metadata
- M001's program/mesocycle definitions with deload week position
- `packages/ui` chart components (shadcn-svelte chart component exists)

## Relevant Requirements

- R013 — Strength curves & estimated 1RM
- R014 — PR tracking & history
- R015 — Volume/tonnage trends
- R016 — RIR-driven progression suggestions
- R017 — Scheduled deload auto-adjustment
- R018 — Progress dashboard with charts
- R019 — Freemium analytics gate

## Scope

### In Scope

- 1RM estimation engine (Epley/Brzycki)
- Automatic PR detection across sessions
- Volume/tonnage aggregation per exercise and muscle group
- RIR trend analysis and progression suggestion algorithm
- Deload week auto-adjustment logic
- Interactive progress dashboard with charts
- Freemium gate implementation (feature flags for free vs. premium)

### Out of Scope / Non-Goals

- In-app purchase infrastructure (M003)
- Payment processing (M003)
- Cloud-based analytics or server-side computation (M004)
- AI/LLM-powered coaching (deferred)

## Open Questions

- **Progression suggestion algorithm** — What's the right threshold? 2+ sessions with average RIR >= 2 across working sets? Need to research and test during slice planning.
- **Chart library** — shadcn-svelte has chart components. Are they sufficient for interactive strength curves, or do we need a more capable charting solution?
- **Deload auto-adjustment UX** — Should deload sets be auto-populated with reduced weights, or should the app just show a banner saying "deload week — reduce to ~60%"?
