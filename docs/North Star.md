# RUNSTR: A Nostr Workout App with Bitcoin Rewards

> This document is the identity and direction reference for RUNSTR. It describes what the app is, how it works, and where it's headed. All other documentation (CLAUDE.md, ARCHITECTURE.md, USER_FLOW.md, the RUNSTR Book) should align with this document.

---

## The Pitch (Nostr/Bitcoin-native positioning)

> The confident, technology-forward statement for Nostr and Bitcoin audiences (the inverted firewall). For the in-app voice, see the "Two voices" rule below.

RUNSTR is a Nostr fitness app with Bitcoin rewards. It is a cardio app for runners, walkers, cyclists, and hikers, where your training lives on an open protocol and your effort pays out in sats. You move, your workouts travel with you across the network, and you get rewarded for it. There is no email, no phone number, and no account required to start. Everything rests on three pillars: Nostr, Bitcoin, and cardio.

Your identity here is a Nostr key, not a row in our database. Log in with an existing key or spin up a fresh npub inside the app, and that same profile works across every other client on the network. When you finish a workout you can post it to your Nostr feeds, and your history is written to Nostr itself, as kind 1301 events, spread across a decentralized network of relays. That is what keeps your fitness data free: your runs are never locked to one app, and the same workouts can surface in other Nostr clients like Amethyst, POWR, and Chachi.

Movement earns sats, on a scale that rewards the effort. Pass 5,000 steps in a day and you earn a daily reward; complete a distance milestone and you earn more, climbing from a 5K up through 10K, the half marathon, and the full marathon. RUNSTR never holds the money: rewards are sent straight to the lightning address you choose, whether that is your own or a charity featured in the app. Connect a wallet over NWC, like your Alby Hub, and you unlock one tap zaps to reward other people's workouts directly, plus the ability for team captains to put up a Bitcoin prize pool for the events they run. The payments move between people, with no house in the middle.

The tracking stays deliberately narrow: running, walking, cycling, and hiking, and nothing else. A built in GPS tracker logs a workout live, and RUNSTR also pulls sessions in from Apple Health and Health Connect, so a run you recorded on a watch or in another app still counts, still earns, and still competes. An always on leaderboard covering 5K, 10K, half, marathon, and steps keeps everyone in the running every day. You can create or join teams, and captains organize their own virtual events on top of it all.

Put the two halves together and you have the whole of RUNSTR: a Nostr native fitness app powering a peer to peer Bitcoin fitness ecosystem. The Nostr half means your workouts and your identity live on open relays you can carry to any client, never inside a single company. The Bitcoin half means RUNSTR custodies nothing at all, not a sat: every reward, zap, and prize pool flows directly between people and into the lightning address they choose. Around both, the app stays quiet about you, with no routes harvested or sold and no account required to start. From here it keeps growing along those same three lines, more Nostr, more Bitcoin, and more of what a great cardio app needs, each piece added with intent and without clutter, so RUNSTR stays exactly what it is: a Nostr fitness app with Bitcoin rewards.

---

RUNSTR is a Nostr workout app with Bitcoin rewards. At its core it's a focused cardio tracker — you do a run, walk, cycle, or hike, you share it, you earn a reward — but the two things that make it distinct from a generic fitness tracker are the rails it runs on. **Nostr brings interoperability:** a workout published from RUNSTR is an open record on a shared protocol, not a row trapped in one company's database. **Bitcoin brings peer-to-peer micro-rewards:** effort earns real money over Lightning, and that money can flow from RUNSTR, from club captains, or from anyone cheering you on. The product has been deliberately narrowed from a broad fitness platform into this loop, and v2.0 is about making it the most polished and *focused* version yet — not the most feature-stuffed.

The strategic direction is to stop competing with Strava and Nike Run Club on mainstream polish — a race a focused, open app can't win — and instead be a real, first-class client in the emerging Nostr health-and-fitness ecosystem. That's a sharpening, not a pivot: most of the machinery already exists. Workouts publish as kind 1301 notes that render natively in Amethyst (the largest Nostr client on Android), POWR, and Chachi; the feed both publishes and pulls those notes from across the network; captains already fund and pay event prize pools from their own nodes. RUNSTR is one piece in an open fitness world, and a working experiment in what interoperable fitness data on a decentralized network — combined with permissionless money — actually looks like in people's hands.

**Two voices, never conflated.** RUNSTR speaks differently to its two contexts, and this is the single most important rule for anyone working on the product:

- **Inside the app, the technology is invisible.** A normal person must be able to use RUNSTR without ever knowing what Nostr or Bitcoin is. Onboarding is one-tap and anonymous-first ("Start"). The UI says "rewards," "password," and "lightning address" — never "sats," "nsec," "zap," or "Nostr." The app feels like a clean fitness product that happens to use open rails, not a crypto demo that happens to track workouts. This firewall stays.
- **In positioning and marketing, the technology is the pitch.** The landing page and Nostr/Bitcoin-audience copy lead confidently with Nostr, Bitcoin, sats, zaps, 1301, and interoperability. The Nostr-native story lives in positioning and the "Advanced" surfaces, not the default in-app flow. Having both a niche moat and a wide door is intentional.

The Workouts pillar is permissive about *how* a workout enters the system. Users can track in-app with the GPS tracker (run, walk, cycle, hike), or never open the tracker at all and let workouts flow in passively from Apple Health or Health Connect. RUNSTR's job is not to be the best tracker on the market — it's to be the layer that turns *any* tracked workout into a social, interoperable, and rewarded one. When a workout is published, it goes out as a kind 1301 note by default, freed from the platform silo so any client or tool that speaks the protocol can read and build on it in new and novel ways. A strict allowlist strips anything sensitive (lightning address, team/charity tags, verification metadata) before publishing — only neutral workout facts leave the device.

> **Framing note — interoperability, not ownership.** Nostr's value here is that it *frees* workout data to be portable and interoperable across clients, not that it makes the data private or "yours." Publishing a 1301 makes a workout public and reusable. Self-custody language ("your keys, your sats") belongs only to the Bitcoin/wallet side. Don't sell the Nostr side as data ownership.

The Social pillar is where workouts become visible and value flows peer to peer. The Social tab is a single feed that mixes workout posts (including 1301 notes pulled from other Nostr clients) with Fitness Clubs — there's no separate "discover" surface. Clubs are the social gravity well: captains run chatrooms and create events, and members earn together. The feed supports zaps, so appreciation — and real sats — flow directly from person to person alongside the structured rewards from the app itself.

The Rewards pillar is the peer-to-peer Bitcoin economy. A completed cardio workout earns a daily reward that scales with distance, and there are three distinct sources of rewards, not one: **from RUNSTR** (the daily distance-tiered reward), **from club captains** (event prize pools the captain funds from their own node over NWC, with splits the captain sets, paid phone-to-wallet so RUNSTR's servers never touch the funds), and **from the crowd** (zaps on the feed). Payouts go to a destination the user chooses — their own wallet, a charity, or a community project — defaulting to the lightning address on their Nostr profile if present. RUNSTR isn't the only one handing out rewards; it's a platform for *anyone* to reward movement.

Everything else is supporting infrastructure for those pillars. Streaks surface as the user's level — a single legible progress number instead of a dashboard. Identity runs on Nostr but stays invisible in-app. Push notifications announce rewards as they land. The through-line for v2.0 is restraint: do workouts, social, and rewards extremely well on open rails, and resist growing back into the everything-fitness-app it used to be.

---

## Key Principles

- **Positioning** — A Nostr workout app with Bitcoin rewards. Nostr brings interoperability; Bitcoin brings peer-to-peer micro-rewards. Not competing with Strava/Nike — a focused client in the Nostr fitness ecosystem.
- **Two voices** — In-app: technology is invisible ("rewards"/"password," anonymous-first, no "sats"/"Nostr"). Marketing/Nostr+Bitcoin audiences: lead with Nostr, Bitcoin, sats, zaps, 1301, interoperability. Never conflate the two.
- **Interoperability, not ownership** — Nostr frees workout data to be portable and reusable across clients; it does not make it private or "owned." Keep self-custody language to the Bitcoin/wallet side.
- **1301 by default** — Published workouts go out as kind 1301 notes that render in Amethyst, POWR, Chachi, and other clients. The feed publishes and pulls 1301s. A tag allowlist strips sensitive data before publishing.
- **Three pillars only** — Workouts, Social, Rewards. Anything that doesn't serve the loop is trimmed.
- **Cardio-only** — Running, walking, cycling, hiking. No strength, meditation, journaling, or habit tracking.
- **Three reward sources** — From RUNSTR (daily, distance-tiered), from captains (event pools funded from their own node), from zaps (peer-to-peer cheering).
- **Reward destination is a choice** — Own wallet, charity, or community project; defaults to the Nostr lud16 if present.
- **Works in the background** — Any HealthKit/Health Connect app or device syncs automatically. Users earn without opening the app.
- **Captains build their own economies** — Captains create clubs and events and fund prize pools from their own node over NWC, paid peer-to-peer.
- **Level is the streak** — A single legible progress number, not a dashboard of metrics.
- **Identity is invisible (in-app)** — Nostr is the auth layer. Users see "password," not "nsec," and never have to know the protocol exists.
- **Terminology (in-app)** — Use "rewards" in user-facing app text, code, and product docs; avoid "Bitcoin," "sats," "Lightning," "Nostr" except where technically necessary. This does **not** apply to marketing/landing/Nostr-audience copy, which leads with the technology on purpose.

## Activities

| Category | Activities |
|----------|-----------|
| **Cardio** | Running, Walking, Cycling, Hiking |

GPS tracking provides real-time pace, distance, elevation, and per-kilometer splits for in-app tracked workouts. Workouts synced from Apple Health or Health Connect carry whatever data the source provided.

## Workouts & Interoperability

| Aspect | Detail |
|---|---|
| **Source of truth** | Every workout is written to Supabase — powers history, leaderboards, and rewards. This does not depend on Nostr. |
| **Outbound format** | Published workouts go out as kind 1301 notes by default (the card-post format is hidden behind a dormant flag). |
| **Cross-client interop** | 1301 notes render natively in Amethyst, POWR, Chachi, and any client that speaks the standard. The feed pulls 1301s back in. |
| **Privacy allowlist** | Only neutral workout facts (distance, duration, type, pace, elevation, calories, steps) are published. Lightning address, team/charity tags, and verification metadata are stripped. |

## Social

| Surface | Description |
|---|---|
| **Feed** | Workout posts from across Nostr, including 1301 notes from other clients. Likes, reposts, comments, zaps. |
| **Fitness Clubs** | Captain-run groups with member leaderboard, real-time chat, and events |
| **Events** | Daily leaderboard (always-on) and captain-created club events |

The Social tab surfaces the feed and clubs; events are conceptually part of the social pillar — they're how members earn together and how captains create engagement. Zaps let appreciation and real sats flow peer to peer in the feed.

## Rewards

| Source | How |
|---|---|
| **From RUNSTR** | Every qualifying cardio workout earns a daily reward that scales with distance |
| **From captains** | Placing in a captain-created club event earns from a prize pool the captain funds from their own node over NWC |
| **From zaps** | People who see your workout on the feed can zap it — peer-to-peer cheering, in sats |
| **Destination** | The user chooses: own wallet, charity, or community project. Defaults to the Nostr lud16 if present. |

Rewards are sent over Lightning. Captain event pools are paid phone-to-wallet over NWC, so RUNSTR's servers never touch the funds — the peer-to-peer spine of the reward economy.

## Events

| Type | Notes |
|---|---|
| **Daily leaderboard** | Built-in, always active — fastest 5K, 10K, Half, Marathon, and daily Steps |
| **Club events** | Captains create events for their club; members auto-enter. Captains can attach a prize pool, set splits, and pay winners from their own node. |

"Events" and "competitions" refer to the same concept — use "events" in user-facing copy.

## Fitness Clubs

Every club has a dedicated page with a member leaderboard, real-time chat, and events. Captains create events, attach reward pools funded from their own connected wallet (NWC), set the distribution, and pay winners directly. This is the foundation of the captain-run economy: anyone can build their own reward system on top of RUNSTR.

## Background Sync

| Platform | Mechanism |
|---|---|
| **iOS** | HealthKit background delivery wakes RUNSTR when a new workout appears |
| **Android** | Health Connect periodic sync every 15 minutes via WorkManager |

Either way, workouts auto-submit to Supabase, auto-trigger reward eligibility, and auto-enter any active club events.

## Direction

- **Peer-to-peer fitness economy** — Deepen the captain-funded and zap-funded reward paths so value increasingly flows person-to-person, not just from RUNSTR. RUNSTR made this case publicly (talk in Mexico).
- **Zap workouts on the feed** — Surface a first-class flow to zap a 1301 in the feed from your own node. Infrastructure exists; the surfaced loop is the next build. (Not fully shipped yet — don't claim it present-tense in public copy.)
- **Automatic 1301 publishing** — A future opt-out-with-privacy-switch feature so every completed workout becomes portable across clients without a manual share. The 1301-by-default change is the foundation; this is a small follow-up, not a migration.
- **User-created events** — Moving toward individual users, not just captains, creating events.
- **v2.0 polish** — The most focused, most polished version of the app, with the open rails as the reason RUNSTR exists rather than a detail it hides.
