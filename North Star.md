# RUNSTR: Fitness Rewards, Your Way

> This document is the identity and direction reference for RUNSTR. It describes what the app is, how it works, and where it's headed. All other documentation (CLAUDE.md, ARCHITECTURE.md, USER_FLOW.md, the RUNSTR Book) should align with this document.

---

RUNSTR is a fitness app that enters your workouts into virtual competitions and rewards you for working out. It doesn't matter if you're a marathon runner or someone who takes a walk after dinner — every workout counts. You choose where your rewards go: to your wallet, to a charity, to an open source project, or converted into AI credits. RUNSTR gives you rewards the way you want them.

Getting started takes seconds. Tap Start and you're in — no account, no email, no sign-up form. The experience is the same whether you log in or not. You pick a reward destination, and from that point forward, every qualifying workout earns you rewards sent exactly where you chose. Want to change your destination later? Change it anytime. There's no commitment and no complicated setup.

RUNSTR tracks far more than just running. The app supports four categories of activity across a swipeable grid. Cardio covers running, walking, cycling, and hiking with full GPS tracking — real-time pace, distance, elevation, and per-kilometer splits. Strength includes pushups, pull-ups, sit-ups, squats, curls, and bench press with rep and set counting. Wellness offers five types of meditation: guided, unguided, breathwork, body scan, and gratitude. And Mindfulness covers journaling and habit tracking. Diet and water intake tracking are also available outside the main grid.

But you don't have to use RUNSTR's trackers at all. The app works with any device or fitness app connected to Apple Health or Health Connect. Strava, Nike Run Club, Garmin, Apple Watch, Fitbit, Google Fit — whatever you already use. RUNSTR syncs your workouts automatically in the background. On iPhone, HealthKit background delivery wakes the app when a new workout appears. On Android, a periodic sync runs every fifteen minutes. You can earn rewards and show up on leaderboards without ever opening the app after your initial setup.

Competitions are central to the experience. RUNSTR hosts virtual and in-person fitness events where your workouts automatically count toward leaderboards. A built-in daily leaderboard tracks the fastest 5K, 10K, half marathon, and marathon times alongside a daily steps ranking — all updated in real time. Beyond the daily boards, RUNSTR runs featured events like distance challenges, goal-completion races, and team-based competitions. The platform is moving toward user-created competitions so anyone can build and host their own events.

Rewards are funded by sponsors. The Rewards page shows a message like "This month's rewards are brought to you by [Sponsor]" so you know who's backing your earnings. When you receive a push notification for a workout reward, it includes the sponsor's brand — something like "You received a reward from Cash App for your workout." RUNSTR calls this Zapvertising: businesses aligned with the platform's ethos sponsor rewards and reach an active fitness audience through branded push notifications. It keeps the reward system sustainable without selling user data.

Fitness Clubs are the social layer of the app. When you create a club, you get a dedicated page with a member leaderboard, real-time chat, and the ability to host events. Captains can create competitions from templates — 5K races, 10K challenges, half marathons, step challenges — and all club members are automatically entered. Captains earn rewards for each club member workout, and the roadmap includes enabling clubs to create their own reward pools and event prize pools by connecting an NWC wallet — giving captains a non-custodial way to reward their members directly.

On the destination side, RUNSTR partners with over twenty charities, projects, and services. When you choose a charity like the ALS Network or Human Rights Foundation, your rewards are sent to them as micro donations. Choose an open source project like Bitcoin Beach or Bitcoin Ekasi, and you're funding grassroots initiatives. Choose a service like PPQ.AI, and your rewards become AI credits. Choose yourself, and rewards go straight to your wallet. The point isn't to pressure anyone into donating — it's to let every user decide what their effort is worth and where it should go.

Your workout data is yours. RUNSTR stores workouts locally on your device and automatically creates encrypted backups to Nostr relays. If you switch phones or reinstall, you can restore everything from the encrypted backup. Older workouts originally published as individual Nostr events (kind 1301) can also be recovered and imported. Recovered workouts are automatically submitted to leaderboards so nothing is lost.

RUNSTR is a fitness company that hosts events, builds community through Fitness Clubs, and rewards people for moving. It monetizes through sponsorships (Zapvertising) and event ticket sales. The app is designed to stay out of your way — three tabs, dark theme, no gimmicks. Private Mode lets you track workouts locally without participating in anything. Whether you're competing for the fastest 5K of the day or just logging your evening walk, RUNSTR meets you where you are and makes sure your effort counts for something.

---

## Key Principles

- **Rewards your way** — Users choose a single destination for all rewards. No splits, no pressure to donate.
- **Works in the background** — Any HealthKit or Health Connect compatible app/device syncs automatically. Users earn without opening the app.
- **Competitions first** — Workouts go into virtual competitions. Leaderboards and events are central, not secondary.
- **Sponsor-funded rewards** — Rewards come from sponsors, not RUNSTR. Sponsor attribution is visible and transparent (Zapvertising).
- **Fitness company, not a crypto app** — RUNSTR hosts events and partners with sponsors. The underlying technology is invisible to users.
- **Your data, your device** — Workouts stored locally with encrypted Nostr backups. Recoverable from backups or legacy kind 1301 events.
- **Terminology** — Use "rewards", "micro donations", "AI credits" in all user-facing and documentation contexts. Avoid "Bitcoin", "sats", "Lightning", "Nostr" except where technically necessary in code.

## Current Reward Destinations (20+)

| Category | Examples |
|----------|---------|
| **Charities** | ALS Network, Human Rights Foundation, Bitcoin Veterans |
| **Projects** | Bitcoin Beach, Bitcoin Ekasi, Bitcoin Isla, Bitcoin Bay |
| **Services** | PPQ.AI (AI credits) |
| **Yourself** | User's wallet |

## Activity Categories

| Category | Activities |
|----------|-----------|
| **Cardio** | Running, Walking, Cycling, Hiking |
| **Strength** | Pushups, Pull-ups, Sit-ups, Squats, Curls, Bench |
| **Wellness** | Guided meditation, Unguided, Breathwork, Body Scan, Gratitude |
| **Mindfulness** | Journal, Habits |
| **Other** | Diet tracking, Water tracking |

## Business Model

| Revenue Stream | How |
|---|---|
| **Sponsorships** | Zapvertising — branded reward attribution on Rewards page and push notifications |
| **Ticket sales** | In-person and virtual event entry fees |

## Direction

- Moving toward **user-created competitions** (away from hardcoded events, daily leaderboard stays built-in)
- **Fitness Club economies** — captains will connect NWC wallets to create reward pools and prize pools (non-custodial)
- More competition types coming
- Captains already earn rewards per club member workout
