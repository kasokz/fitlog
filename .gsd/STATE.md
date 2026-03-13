# GSD State

**Active Milestone:** M005 — Native Social Login
**Active Slice:** S01 — Server Config + Auth Client + Google Sign-In
**Phase:** executing
**Requirements Status:** 35 active · 0 validated · 3 deferred · 2 out of scope

## Milestone Registry
- ✅ **M001:** Core Training Engine
- ✅ **M002:** Analytics & Progression Intelligence
- ✅ **M003:** Monetization & Premium Features
- ✅ **M004:** Cloud Sync & Platform
- 🔄 **M005:** Native Social Login

## Recent Decisions
- D129: Social sign-in endpoint posts to `/api/auth/sign-in/social/token`, handles `{ data: { user, session } }` response shape
- D130: Social login plugin wrapper follows D073 catch-and-return pattern
- D131: SocialLoginButtons takes `onSuccess` callback for reuse in S02

## Blockers
- None

## Next Action
Execute T01: Add social providers to Better Auth server config.
