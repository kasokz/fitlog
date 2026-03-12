# M003: Monetization & Premium Features — Context

**Gathered:** 2026-03-12
**Status:** Pending (depends on M002 completion)

## Project Description

M003 turns FitLog into a revenue-generating product. It implements in-app purchase and subscription infrastructure for both App Store and Play Store, creates premium content (program templates from established methodologies), packages advanced analytics as a paid feature, and builds the paywall UX and upgrade flows. It also handles App Store / Play Store listing optimization for launch.

## Why This Milestone

The user explicitly wants to make money from this app. M001 and M002 create value. M003 captures value. The freemium model (generous free tier + granular premium features) was chosen to maximize adoption while monetizing serious users. This milestone is what makes the app a business, not just a side project.

## User-Visible Outcome

### When this milestone is complete, the user can:

- Encounter premium features (analytics, templates) with clear, non-intrusive upgrade prompts
- Purchase individual feature packs or a subscription via native App Store / Play Store purchase flow
- Access premium program templates from established methodologies (5/3/1, GZCL, nSuns, etc.)
- Access the full advanced analytics pack after purchase
- Find the app in App Store / Play Store with optimized listing (screenshots, descriptions, keywords)

### Entry point / environment

- Entry point: Native app — paywall screens, store listings
- Environment: Mobile device + App Store Connect / Google Play Console
- Live dependencies involved: Apple StoreKit, Google Play Billing, App Store Connect, Google Play Console

## Completion Class

- Contract complete means: Purchase flows work in sandbox/test environments, premium features unlock correctly
- Integration complete means: Real StoreKit / Play Billing SDK processes test purchases
- Operational complete means: App is listed in both stores with approved metadata, purchases work in production

## Final Integrated Acceptance

To call this milestone complete, we must prove:

- A test user can complete a purchase flow on both iOS (sandbox) and Android (test track)
- Premium features correctly unlock/lock based on purchase status
- Purchase status persists across app restart
- App is submitted and approved in both App Store and Play Store

## Risks and Unknowns

- **StoreKit / Play Billing Capacitor plugins** — Need to identify and evaluate Capacitor plugins for in-app purchases. May need capacitor-purchases (RevenueCat) or a direct StoreKit/Billing wrapper. Risk: medium.
- **App Store review** — Apple has strict guidelines for subscriptions, metadata, and IAP. First submission may be rejected. Risk: medium.
- **Premium template licensing** — Using names like "5/3/1" or "nSuns" may have trademark considerations. May need generic names inspired by the methodologies. Risk: low.
- **Freemium conversion rate** — Pricing and packaging directly affect revenue. Need to research competitor pricing. Risk: business risk, not technical.

## Existing Codebase / Prior Art

- M001's program creation system (templates feed into it)
- M002's analytics dashboard and freemium gate
- `packages/ui` components for modal/paywall UI

## Relevant Requirements

- R020 — In-app purchase / subscription infrastructure
- R021 — Premium program templates
- R022 — Advanced analytics pack
- R023 — Paywall UX & upgrade flows
- R024 — App Store / Play Store optimization

## Scope

### In Scope

- Capacitor in-app purchase plugin integration
- Subscription and one-time purchase products
- Purchase state management (persisted locally, verified with store)
- Premium program template content creation
- Paywall UI and upgrade flow design
- App Store Connect and Google Play Console setup
- Store listing optimization (metadata, screenshots, descriptions — no emojis)
- Feature flag system for free vs. premium features

### Out of Scope / Non-Goals

- Server-side receipt validation (M004 — needs cloud infrastructure)
- User accounts (M004)
- A/B testing of paywalls (future optimization)

## Open Questions

- **IAP plugin choice** — RevenueCat SDK (capacitor-purchases) vs. direct StoreKit/Billing plugin? RevenueCat simplifies cross-platform but adds a dependency and revenue share. Direct is more work but zero cost.
- **Pricing model** — Monthly subscription? Annual? One-time unlock? Bundle vs. individual packs? Needs competitive research.
- **Store metadata language** — Submit in German only, English only, or both? Both stores support localized listings.
