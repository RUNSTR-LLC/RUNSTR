# RUNSTR Business Plan

**Version:** 1.0
**Date:** January 2026
**Status:** OUTDATED — Subscriptions were removed from the business model as of April 2026. Revenue now comes from sponsorships (Zapvertising) and event ticket sales only. This document needs a full rewrite.

---

## Executive Summary

RUNSTR is a Bitcoin-powered fitness application that rewards users for working out and enables them to support charities through their fitness activities. The app transforms everyday exercise into Bitcoin earnings while building a community of health-conscious individuals.

**Core Value Proposition:** Fitness earns Bitcoin. Bitcoin supports charities.

### Key Highlights

- **Real Bitcoin Rewards:** Users earn 50 sats per daily workout + 5 sats per 1,000 steps
- **Charity Integration:** Configurable donation splits from rewards to Bitcoin-focused charities
- **Privacy-Preserving:** Anonymous by design—no email, phone, or real name required
- **Event Business Model:** In-person race events generate ~$5,000 profit per event
- **Target Market:** 50,000+ Bitcoin/Nostr users, expanding to mainstream fitness enthusiasts
- **Revenue Goal:** 150,000 subscribers at 10,000 sats/month + event profits

### Business Model Summary

| Revenue Stream | Target |
|----------------|--------|
| Subscriptions | 150,000 users × 10,000 sats/month |
| In-person Events | 100+ events/year × $5,000 profit = $500,000+ |
| Sponsorships | Mix of normie and Bitcoin sponsors |

---

## Company Description

### Mission

Build a profitable, privacy-preserving fitness company that rewards people for exercise, enables charitable donations, and survives 10 years while stacking sats.

### Company Goals

1. Make a profitable fitness company that protects user privacy
2. Have a sustainable rewards model
3. Participate in the broader fitness ecosystem while catering to Bitcoin and Nostr users
4. Hit in-person events hard
5. Survive for 10 years while stacking sats and contributing to charitable causes
6. Ensure employees get paid with strong incentives to help the project grow
7. **Avoid grants and investors**

### Core Product Philosophy

> A privacy-preserving fitness tracker that gives you Bitcoin for working out. You can donate a portion of those rewards to charity. You can also participate in virtual fitness events to help raise money for charity and earn additional rewards.

### The Four Core Pillars

#### 1. Workouts
Track fitness activities using GPS or manual entry. Workouts are published to the Nostr network as kind 1301 events.

- GPS tracking for Running, Walking, Cycling
- Manual entry for Strength, Diet, Wellness
- HealthKit (iOS), Health Connect (Android), Garmin sync
- Real-time metrics: pace, distance, elevation, splits

#### 2. Events
Compete in fitness challenges with Bitcoin prizes.

- Hardcoded events (Season II, January Walking Contest)
- Leaderboards with Running/Walking/Cycling tabs
- Prize pools in satoshis
- Both in-person and virtual participation

#### 3. Rewards
Earn Bitcoin for staying active.

| Reward Type | Amount | Frequency |
|-------------|--------|-----------|
| Daily Workout | 50 sats | Once per day |
| Step Milestone | 5 sats | Per 1,000 steps |

- Delivered via Lightning address (LNURL protocol)
- Silent failure—rewards never block workout saving

#### 4. Donations
Support Bitcoin-focused charities through fitness.

- Teams = Charities (Bitcoin Bay, Bitcoin Ekasi, ALS Network, etc.)
- Configurable donation split (0%, 10%, 25%, 50%, 100%)
- Impact Level XP gamification for donations
- Direct zap button for manual donations

---

## Market Analysis

### Primary Market: Bitcoin/Nostr Community

**Size:** ~50,000 addressable users

**Characteristics:**
- Already understand private keys (nsec) and public keys (npub)
- Familiar with Lightning Network payments
- Value decentralized protocols and data ownership
- Care about health and fitness

**Advantage:** This focused market solves the "cold start problem" by targeting users who already have the knowledge to use the app immediately.

### Secondary Market: Privacy-Conscious Fitness Enthusiasts

**Size:** Millions of potential users

**Approach:** Position RUNSTR as:
> "A privacy-preserving Strava alternative that's free and open source, focused on private local-first fitness tracking, with the opportunity to support a charity with every workout."

### The Stealth Strategy

The most counterintuitive aspect of RUNSTR's market strategy: **Don't mention Bitcoin upfront.**

Fitness enthusiasts don't want to hear about decentralized protocols or monetary policy—they want to track workouts, get rewarded, and maybe support a cause.

**Positioning by Audience:**
- **Fitness-first:** "A fitness app that pays you to work out"
- **Charity-first:** "Turn your workouts into donations"
- **Privacy-first:** "The anonymous fitness tracker"
- **Community-first:** "Compete without giving up your privacy"

The Bitcoin layer operates invisibly. Users discover the Bitcoin angle organically when they're ready.

### Competitive Landscape

| Competitor | Weakness RUNSTR Exploits |
|------------|--------------------------|
| Strava | Privacy concerns, data monetization |
| Nike Run Club | No rewards, no charity integration |
| MapMyRun | No privacy, no Bitcoin |
| Stepn | Token-based, unsustainable tokenomics |

**RUNSTR Differentiation:**
- Real Bitcoin, not points or tokens
- Anonymous by design
- Charity integration built-in
- Open source and verifiable

---

## Products & Services

### Core App (Free)

- GPS tracking for Running, Walking, Cycling
- HealthKit/Health Connect/Garmin sync
- Workout history and statistics
- Daily rewards (50 sats/workout)
- Step rewards (5 sats/1,000 steps)
- Charity selection and donation splits
- Event participation and leaderboards

### Subscription (Season Pass)

- Access to premium events
- Enhanced features
- **Price Target:** 10,000 sats/month (~$10 at current rates)
- **Goal:** 150,000 subscribers

### In-Person Race Events

- 5K races with professional event management
- Post-race brunch and raffle
- Virtual participation option
- Live streaming on YouTube and Zap.stream
- Sponsor integration

---

## Revenue Model

### Revenue Streams

#### 1. Subscriptions
**Target:** 150,000 users × 10,000 sats/month

This subscription revenue funds:
- App development
- Team salaries
- Ongoing operations

#### 2. In-Person Events

**Per-Event Revenue:**

| Item | Amount |
|------|--------|
| 200 in-person tickets @ $35 | $7,000 |
| 30 virtual tickets @ $10 | $300 |
| 10 sponsors @ $500 minimum | $5,000 |
| **Total Revenue** | **~$12,300** |

**Per-Event Expenses:**

| Expense | Amount |
|---------|--------|
| Event management company | $3,000 |
| Vendors | $500 |
| Shirts/medals | $500 |
| Prizes/raffle | $600 |
| Buffer | $2,400 |
| **Total Expenses** | **~$7,000** |

**Profit per event:** ~$5,000

#### 3. Scale Projections

| Events/Year | Annual Profit |
|-------------|---------------|
| 4 events | $20,000 |
| 20 events | $100,000 |
| 100 events | $500,000 |
| 200 events | $1,000,000 |

**Note:** 200 events = 2 events every weekend for a year

### Lightning Node Strategy

RUNSTR conducts rewards and donations through its own Lightning node.

**Current Architecture:**
- App's NWC wallet sends all rewards and charity payments
- Payment verification enabled (both transactions confirmed)
- Accurate donation tracking

**Future Vision:**
- Hook into Amboss for node metrics and liquidity management
- Contract with a Lightning liquidity management specialist
- As volume grows, earn yield from routing transactions
- Node develops strong metrics for sending/receiving activity

**Ultimate Goal:** Rewards funded partially by routing fee yield, creating a self-sustaining rewards pool.

---

## Marketing Strategy

### Dual-Track Distribution

#### Track 1: Traditional Channels (Event Management Company)
- RunSignUp
- Facebook events
- Local running club newsletters
- Flyers at gyms and running stores

#### Track 2: Bitcoin/Nostr Channels (RUNSTR Team)
- Tickets on Satlantis (Bitcoin ticketing platform)
- Events listed in Club Orange and other Nostr apps
- Promotion across Nostr relays and Bitcoin Twitter

**Target Mix:** 80% regular runners who've never heard of Bitcoin, 20% Bitcoiners who run

### Sponsorship Strategy

#### Normie Sponsors
Local running stores, sports drink companies, athletic wear brands provide:
- Legitimacy
- Event cost coverage
- Mainstream audience reach

**They receive:**
- Banner placement around the race course
- Logo placement on race day shirt
- Mentions during post-race brunch
- Exposure through YouTube broadcast and social media

#### Bitcoin Sponsors
Bitcoin-focused sponsors get an opportunity to connect with an audience outside the Bitcoin echo chamber.

### Content Strategy

Every element of the event feeds content creation:

**Live Broadcast:**
- YouTube channel broadcasts live from races
- Simultaneous stream on Zap.stream where Nostr users can zap and interact

**Content Breakdown:**
Long-form content gets broken into shorts:
- 60-second race recap
- Individual finish-line celebrations
- Charity announcement moment
- Merchant spotlights
- Sponsor acknowledgments

---

## Operations

### Event Management Partnership

Rather than handling race logistics internally, RUNSTR partners with professional 5K race event management companies.

**They handle:**
- Obtaining permits (National Park Service, municipal)
- Setting up registration websites
- Managing ticket sales
- Coordinating race-day logistics (timing chips, finish line equipment)
- Ensuring proper safety protocols

**RUNSTR focuses on:**
- Community building
- Bitcoin/Nostr integration
- App development
- Sponsor relationships
- Content creation

### Scaling the Events Operation

**Path to scale:** Bring the event management team in-house and focus exclusively on RUNSTR events.

**Hiring Plan:**
- Dedicated sales person for sponsorships
- Event coordination team
- Content creation team

---

## Milestones & Timeline

### 2026 Milestones

| Date | Milestone |
|------|-----------|
| **March 15, 2026** | Inaugural DC Race at Haines Point |
| Q2 2026 | Expand to Texas |
| Q3 2026 | Expand to Tennessee |
| Q4 2026 | Expand to Mexico |

### DC Event Success Metrics

| Metric | Target |
|--------|--------|
| In-person participants | 200 |
| Virtual participants | 30 |
| Normie sponsors | 7 |
| Bitcoin sponsors | 3 |
| App downloads | Significant increase |
| Season Pass signups | Meaningful conversion |
| Charity raised | $500+ |
| Content pieces | Library for ongoing marketing |

### Long-Term Goals

| Timeframe | Goal |
|-----------|------|
| Year 1 | Prove event model in 4+ markets |
| Year 3 | 50+ events per year |
| Year 5 | 150,000 subscribers, 100+ events |
| Year 10 | Self-sustaining ecosystem, stacking sats |

---

## Team & Partnerships

### Key Partnerships

- **Bitcoin District** - Local Bitcoin community support (DC)
- **Pubkey DC** - Post-race venue (DC)
- **Professional Event Management** - Race logistics
- **Satlantis** - Bitcoin ticketing platform

### Hiring Roadmap

1. **Dedicated Sales Person** - Secure sponsorships, build relationships
2. **Event Coordinator** - Manage logistics across multiple events
3. **Content Creator** - Video production, social media

---

## Technical Architecture

### Overview

RUNSTR uses a **hybrid architecture**:
- **Nostr** - Workouts (kind 1301 events) and user authentication
- **Supabase** - Event participation and leaderboards
- **Lightning** - Reward payments via LNURL

### Key Technical Decisions

| Decision | Implementation | Rationale |
|----------|---------------|-----------|
| Authentication | Nostr (nsec-only) | Decentralized identity |
| Workout Data | Nostr kind 1301 | Interoperable fitness standard |
| Event Joining | Supabase | Simpler than Nostr for participation tracking |
| Rewards | Lightning address | Universal wallet support |
| Charity Selection | Teams tab | Simple UX for choosing charity |

### Privacy Guarantees

**What Gets Published:**
- Activity type (running, walking, cycling)
- Distance and duration
- Elevation gain/loss
- Calories burned
- Team/charity selection

**What Never Gets Published:**
- GPS coordinates or route data
- Email, phone, or real name
- Detailed health metrics beyond workout summaries

---

## Risk Analysis

### Key Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Bitcoin price volatility | Price rewards in sats, not fiat |
| Regulatory uncertainty | No token, just Bitcoin payments |
| Competition from major apps | Privacy focus, open source differentiator |
| Event logistics complexity | Partner with professionals |
| Reward pool sustainability | Events fund the pool, Lightning routing yield |

### Competitive Advantages

1. **Open Source** - Verifiable privacy claims
2. **Real Bitcoin** - Not points or tokens
3. **Charity Integration** - Built into the core product
4. **Anonymous by Design** - No personal data collection
5. **Event Business Model** - Real revenue, not VC-dependent

---

## Financial Summary

### Revenue Targets

| Year | Subscriptions | Events | Total |
|------|---------------|--------|-------|
| Year 1 | Bootstrap | $20,000 | $20,000+ |
| Year 3 | Growing | $250,000 | $300,000+ |
| Year 5 | 150,000 subs | $500,000 | $1M+ |

### Use of Funds

- App development and maintenance
- Team salaries and incentives
- Event operations
- Strategic sats reserve
- Rewards pool replenishment

### No Outside Funding

RUNSTR explicitly avoids grants and investors to maintain:
- Independence
- Long-term thinking
- Alignment with community values

---

## Conclusion

RUNSTR represents a new model for building sustainable Bitcoin businesses: real revenue from real customers, no tokens, no VCs. By combining a useful fitness app with in-person events, RUNSTR creates multiple revenue streams that fund ongoing development while stacking sats for the long term.

The inaugural DC race on March 15, 2026, will validate this model and set the stage for expansion to Texas, Tennessee, Mexico, and beyond.

**Success = Profitable privacy-preserving fitness company that survives 10 years while stacking sats and supporting charities.**

---

## Appendix: Recommended Additional Documents

### High Priority (To Create)
- [ ] Pitch Deck (10-15 slides)
- [ ] One-Pager / Fact Sheet
- [ ] Sponsorship Packages (see separate document)
- [ ] Event Budget Template
- [ ] Brand Guidelines
- [ ] Privacy Policy
- [ ] Terms of Service
- [ ] Press Release Template

### Medium Priority
- [ ] Charity Partnership Agreement
- [ ] Vendor Contract Template
- [ ] Competitor Analysis
- [ ] Financial Projections (3-year)
- [ ] User Persona Documents

### Lower Priority (May Need Legal)
- [ ] Event Liability Waiver
- [ ] Employee/Contractor Agreement
- [ ] IP Assignment Agreement

---

*RUNSTR - Fitness earns Bitcoin. Bitcoin supports charities.*
