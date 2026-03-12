# Decisions Register

<!-- Append-only. Never edit or remove existing rows.
     To reverse a decision, add a new row that supersedes it.
     Read this file at the start of any planning or research phase. -->

| # | When | Scope | Decision | Choice | Rationale | Revisable? |
|---|------|-------|----------|--------|-----------|------------|
| D001 | M001 | arch | Offline data storage | capacitor-community/sqlite | Structured relational data needs SQL, not key-value. Capacitor Preferences only for app settings. | No |
| D002 | M001 | arch | Data model sync readiness | UUID PKs + timestamps + soft delete | Enables future cloud sync (M004) without schema migration. crypto.randomUUID() works offline. | No |
| D003 | M001 | pattern | Workout logging UX | Tap-tap-done with pre-fill from last session | Minimum taps is the #1 UX priority. Pre-fill from last session for same program day. | No |
| D004 | M001 | data | RIR tracking granularity | Per set (not per exercise) | User trains with RIR as a first-class signal on every working set. Drives M002 progression logic. | No |
| D005 | M001 | pattern | Set type taxonomy | Warmup, Working, Drop, Failure | Only working sets count toward progression analytics. Prevents data pollution. | Yes — if users request more types |
| D006 | M001 | scope | Rest timer behavior | Optional/manual, no auto-start | Timer available but not intrusive. Some users track rest, some don't. | Yes — if user feedback demands auto-start |
| D007 | M001 | data | Mesocycle model | Full mesocycles with week blocks + deload scheduling | Programs define week count and deload position. Deload auto-adjustment is M002 scope. | No |
| D008 | M001 | scope | Body tracking scope | Body weight only, no photos or measurements | Keep it simple. Photos and measurements deferred (R037). | Yes — if demand appears |
| D009 | M001 | arch | Monetization model | Freemium with granular feature packs | Free: core logging + basic history. Premium: analytics, AI suggestions, premium templates. | Yes — pricing/packaging revisable |
| D010 | M001 | scope | Platform targeting | iOS + Android simultaneously | Both platforms from M001. No web-only phase. | No |
| D011 | M001 | pattern | Progression algorithm signal | RIR-driven (not rep range ceiling) | User chose RIR as primary signal. Consistently RIR 2-3 across sets → suggest weight increase. | No |
| D012 | M001 | pattern | Deload scheduling | Scheduled in mesocycle + auto-adjusted (M002) | Deload position defined in program. M002 auto-reduces weight/volume to ~60%. | No |
| D013 | M001 | scope | Social features | Not now — deferred post-M004 | Solo app focus. Social adds complexity without clear ROI at this stage. | Yes — revisit after M004 |
| D014 | M001 | scope | Cloud sync depth | Sync-ready infra, not just data model | User wants actual sync mechanism built (M004), not just schema readiness. | No |
| D015 | M001 | pattern | Onboarding flow | Pick a starter template, not build-your-own | Fastest path to first workout. Templates: PPL, Upper/Lower, Full Body. | Yes — if users want guided creation |
