# About RUNSTR

RUNSTR is a cardio workout companion built around three pillars: Workouts, Social, and Rewards. The product has been deliberately narrowed from a broader fitness platform into a focused loop — you do a cardio workout, you share it, you earn a reward. Everything that doesn't serve that loop is either being trimmed away or pushed into the background. The app is opinionated about cardio specifically (running, walking, cycling, hiking), and it treats every other surface in the app as support scaffolding for that core activity.

The Workouts pillar is intentionally permissive about *how* a workout enters the system. Users can track in-app with the GPS-based tracker, or they can never open the tracker at all and let their workouts flow in passively from Apple Health or Health Connect — whatever device or app they already trust to record their runs. The job of RUNSTR is not to be the best tracker on the market; it's to be the layer that turns *any* tracked workout into a social and rewarded one. Workouts also get quietly backed up to Nostr so a user's history is portable and never trapped inside the app.

The Social pillar is where workouts become visible to other people. The Social tab is a single feed that mixes workout posts, events, and Fitness Clubs into one place — there isn't a separate "discover" or "explore" surface. Clubs are the social gravity well: captains run chatrooms and create events for their members, and members get extra rewards on top of their normal daily rewards just for participating. The feed supports zaps, so appreciation flows peer-to-peer alongside the structured rewards from the app itself.

The Rewards pillar is what makes RUNSTR distinct from a generic fitness tracker. Every completed workout earns a daily reward, and placing in an event — whether the always-on daily leaderboard or a captain-created club event — earns extra on top. Payouts go to a lightning address the user provides; if their Nostr profile already has a lightning address attached, RUNSTR uses that by default, so most users never have to fill in a field at all. There's no destination picker, no splits, no routing logic — the address is the address. Captains earn a slice when their members work out, which gives them a real incentive to run an engaged club rather than a dormant one.

Everything else in the app is supporting infrastructure for those three pillars. Streaks are surfaced as the user's level, giving a single legible progress number instead of a dashboard of metrics. Identity is handled through Nostr login, but it's invisible to the user experience — the app shows "password" instead of "nsec" and "rewards" instead of "sats." The audience is Bitcoin and Nostr users, but RUNSTR doesn't lead with that — the app feels like a clean fitness product that happens to use those rails, not a Bitcoin or Nostr demo that happens to track workouts. Push notifications announce rewards as they land. An NWC wallet can be connected for users who want full custody. The through-line for the next phase is restraint: the app should do workouts, social, and rewards extremely well, and resist the urge to grow back into the everything-fitness-app it used to be.

---

**Next:** [Chapter 1: Introduction](./01-introduction.md)

**Table of Contents:** [Back to TOC](./00-table-of-contents.md)
