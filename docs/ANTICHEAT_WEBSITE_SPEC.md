# Anti-Cheat Verification Payment Page Specification

## Page URL
`https://runstr.club/pages/anti-cheat.html`

## Purpose
Payment page for the Anti-Cheat Verification Service. Users arrive here after submitting a verification request in the RUNSTR app.

---

## Page Content

### Header
- RUNSTR logo
- Title: "Anti-Cheat Verification Service"
- Subtitle: "Protect competition integrity"

### Service Description Section

```
How It Works
-------------
1. You've submitted a verification request through the RUNSTR app
2. Pay the 5,000 reward verification fee below
3. Our team manually investigates within 24-48 hours
4. Results delivered via your chosen contact method (Nostr DM or email)

What We Check
-------------
- Workout event authenticity (legitimate app usage vs. scripted posts)
- Duplicate event patterns (same workout posted multiple times)
- Impossible distances or timing anomalies
- Coordinated fake account activity
```

### Pricing Box
```
Verification Fee: 5,000 rewards (~$2-3 USD)

[Payment Invoice QR Code]
[Copy Invoice Button]

Or pay via payment address: anticheat@runstr.club
```

### After Investigation Section
```
What Happens Next?
------------------
Based on our findings, you may be able to request:

- Competition Removal: If cheating is confirmed, request the user be
  removed from the competition leaderboard

- Account Flagging: Repeat offenders can be flagged for ongoing
  monitoring in future competitions

- Evidence Report: Receive a detailed breakdown of the suspicious
  activity we discovered

Simply reply to our results message to request additional action.
```

### Important Notes / Disclaimers
```
Important Information
---------------------
- Verification requests are processed within 24-48 hours
- Results are confidential and sent only to you
- We cannot guarantee removal - final decisions rest with competition
  organizers (team captains)
- Refunds are not available once investigation has begun
- False or frivolous reports may result in service restrictions
```

### Footer
- Link back to RUNSTR app
- Contact: support@runstr.club
- "Powered by RUNSTR rewards"

---

## Technical Requirements

### Payment Integration
- Generate payment invoice for 5,000 rewards
- Options:
  1. **Recommended**: Use existing Alby/NWC setup to generate invoices
  2. Alternative: Static payment address (anticheat@runstr.club)
  3. Alternative: BTCPay Server invoice

### Design
- Match RUNSTR dark theme (black background #000, orange accents #FF7B1C)
- Mobile-responsive (most users arrive from the app)
- Simple, clean layout

### Optional Enhancements
- Payment confirmation message after successful payment
- Email notification to admin when payment received
- Countdown timer showing "Request submitted X minutes ago"

---

## Example Payment Address Setup

If using Alby:
1. Create payment address: `anticheat@getalby.com` or custom domain
2. Set up webhook to notify when payment received
3. Include memo field showing it's for anti-cheat service

---

## Questions for Senior Dev
- [ ] Which payment method to use? (Alby, BTCPay, static address)
- [ ] Should payments trigger automatic notification to admin?
- [ ] Need any tracking between app request and website payment?
