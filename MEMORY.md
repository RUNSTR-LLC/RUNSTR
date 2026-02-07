# RUNSTR Project Memory

## Company Overview

RUNSTR is a fitness event company that operates both virtual and in-person competitions, powered by a privacy-first mobile app that tracks running, walking, cycling, and more. No email, phone number, or real name required. Free, open source (MIT license). Solo founder: Dakota Brown. RUNSTR LLC.

## Three Core Pillars

Three core pillars: Workouts, Events, Rewards. Workouts: GPS tracking for cardio with real-time metrics plus Apple Health and Google Health Connect sync (any wearable or app that feeds these works, including Strava). Also supports strength, diet, and wellness. Events: virtual competitions with leaderboards and prizes, plus in-person races like the District 5K (March 15 2026, Haines Point DC). Rewards: hit 5k steps or complete a 3km run to earn 50 sats daily. Users can also save encrypted workout records to Nostr.

## Three Audiences

Three audiences, feature-gated by design. Regular fitness enthusiasts use RUNSTR as a privacy-preserving Strava alternative (or alongside Strava) -- they see competitions, leaderboards, charitable contributions to their selected team. Never need to know about Bitcoin or Nostr. Users who enter a Lightning address unlock Bitcoin reward payouts. Users with Nostr identities and Web of Trust scores unlock social features like posting achievements. Features are gated based on indicators users provide.

## Teams and Charities

Teams represent charities. 18+ organizations including HRF, ALS Network, Chimes International. Binary reward routing: if user has Lightning address, rewards go to user; if not, rewards go to selected charity. In-person races add competitive charity layer -- charity with most runners in Top 100 wins a prize. RUNSTR Level: 7 tiers (Newcomer to Champion) based on 14-day rolling workout average.

## AI Integration

AI integration via PPQ.ai. AI journal and habit tracker with context from locally stored workout history across cardio, strength, diet, wellness. Users earn AI credits through healthy activity via anonymous PPQ.ai accounts -- access to frontier models without a credit card. Stack sats, stack AI credits, or stack charitable contributions, all transparently tracked through open source. Business is for-profit -- proving business, charity, and profit are not mutually exclusive.

## Business Model and Tech Stack

Business model: in-person 5K races (~$5k profit per event from registration and sponsorships) plus subscriptions. Inaugural event: District 5K in DC (March 15 2026). Second event likely Mexico. Q3/Q4 TBD. Goal: run events remotely via local community partnerships and professional race management companies, scaling to 100+ events/year. No grants, no investors. Tech: React Native, TypeScript, Expo, Supabase-first (leaderboards/workouts), Nostr for auth (nsec) and profile sync, NDK exclusively. Project at /Users/dakotabrown/runstr.project.
