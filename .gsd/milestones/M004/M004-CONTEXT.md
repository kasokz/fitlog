# M004: Cloud Sync & Platform — Context

**Gathered:** 2026-03-12
**Status:** Pending (depends on M003 completion)

## Project Description

M004 connects FitLog to the cloud. It builds user accounts with authentication, a sync server with conflict resolution for merging offline changes, cross-device sync, cloud backup/restore, and data export (CSV/JSON). The sync-ready data model from M001 (UUIDs, timestamps, soft delete) pays off here — the schema shouldn't need major changes.

## Why This Milestone

Users accumulate months or years of training data. Without cloud backup, a lost or broken phone means losing everything. Cross-device sync is also a common request (e.g., logging on phone at gym, reviewing analytics on tablet at home). This milestone turns FitLog from a single-device tool into a platform.

## User-Visible Outcome

### When this milestone is complete, the user can:

- Create an account and log in
- Have their training data automatically sync across devices logged into the same account
- Back up all training data to the cloud and restore it on a new device
- Export their complete workout history as CSV or JSON
- Continue using the app fully offline, with sync happening when connectivity returns

### Entry point / environment

- Entry point: Native app — account settings, sync status indicator
- Environment: Mobile device + cloud server
- Live dependencies involved: Auth provider (TBD), cloud database/API server, sync service

## Completion Class

- Contract complete means: Sync protocol handles create/update/delete/conflict correctly in tests
- Integration complete means: Two devices with the same account see the same data after sync
- Operational complete means: Sync works reliably over real mobile networks with intermittent connectivity

## Final Integrated Acceptance

To call this milestone complete, we must prove:

- Two devices (iOS + Android) with the same account see identical training data after sync
- Offline changes made on both devices simultaneously are correctly merged (conflict resolution)
- A user can back up on one device, factory reset, install the app on a new device, and restore all data
- Data export produces valid CSV/JSON with complete workout history

## Risks and Unknowns

- **Conflict resolution strategy** — Last-write-wins is simple but can lose data. CRDT-style merge is robust but complex. Need to choose based on data model complexity. Risk: high.
- **Sync protocol choice** — Custom REST API? Real-time sync (WebSocket)? Third-party sync service (e.g., PowerSync, ElectricSQL)? Each has trade-offs. Risk: high.
- **Server infrastructure** — Need to choose hosting, database, and deployment strategy. Risk: medium.
- **Auth provider** — Email/password? Social login? Magic link? Affects UX and implementation complexity. Risk: low.
- **Offline-first sync edge cases** — Long offline periods, large datasets, partial sync failures. Risk: medium.

## Existing Codebase / Prior Art

- M001's SQLite schema with UUID PKs, created_at, updated_at, soft delete — designed for this
- `apps/web/` — Existing web app scaffold (could serve as sync server host or admin dashboard)
- Capacitor Preferences for storing auth tokens

## Relevant Requirements

- R025 — Cloud sync infrastructure
- R026 — Account system (auth)
- R027 — Cross-device sync
- R028 — Backup/restore
- R029 — Data export (CSV/JSON)

## Scope

### In Scope

- User registration and authentication
- Server-side sync API
- Conflict resolution strategy and implementation
- Incremental sync (only changed records)
- Cloud backup and full restore
- Data export in CSV and JSON formats
- Sync status UI (last synced, sync in progress, conflicts)
- Offline queue for pending changes

### Out of Scope / Non-Goals

- Real-time collaborative editing (not needed — single-user data)
- Server-side analytics or processing (analytics stay on-device)
- Admin dashboard (future)
- Web app version of the training interface (future)

## Open Questions

- **Sync technology** — Build custom sync on REST, or use a sync-as-a-service platform? PowerSync and ElectricSQL are purpose-built for offline-first SQLite sync. Need evaluation.
- **Server stack** — SvelteKit on the `apps/web` scaffold? Separate API? Serverless functions?
- **Auth approach** — Self-hosted auth (Lucia)? Third-party (Clerk, Auth0, Supabase Auth)? Depends on server stack choice.
- **Receipt validation** — M003 deferred server-side receipt validation. Should it be added here alongside auth?
