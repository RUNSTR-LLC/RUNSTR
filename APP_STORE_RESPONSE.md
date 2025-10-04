# App Store Review Response

## Response to Apple Review Team

Dear Apple Review Team,

Thank you for your detailed feedback on RUNSTR v0.1.1. We have addressed all the issues raised in your review:

### 1. Guideline 5.1.1 - Privacy Permission Strings

**RESOLVED**: We have updated all permission strings to be more descriptive with specific examples:

- **Camera Permission**: "RUNSTR needs camera access to take profile pictures and scan QR codes for team invitations. For example, you can scan a team's QR code to instantly join competitions."

- **Photo Library Permission**: "RUNSTR needs photo library access to select a profile picture for your fitness account. Your profile picture helps teammates identify you in competitions and leaderboards."

### 2. Guideline 5.1.1 - Custom Permission UI

**RESOLVED**: We have modified our QR scanner permission flow:
- Changed button text from "Grant Access" to "Continue"
- Removed the Cancel button from the permission explanation screen
- Users now proceed directly to the system permission request

### 3. Guideline 2.3 - Bitcoin Prize Features

**CLARIFICATION**: The "Bitcoin prizes" mentioned in our metadata refer to **peer-to-peer motivational rewards between team members**, not gambling or prize pools. Here's how it works:

- Team captains and members can send small amounts of Bitcoin (satoshis) to each other as motivation
- These are voluntary peer-to-peer payments, similar to tipping
- Each user has their own Lightning wallet (NIP-60/61 protocol)
- There are no pooled funds or gambling mechanics

To locate this feature in the app:
1. Join or create a team
2. Navigate to any team member's profile
3. Tap the lightning bolt icon to send satoshis
4. Long-press for custom amounts

We can update our metadata to clarify this as "peer-to-peer Bitcoin rewards" if that would be clearer.

### 4. Guideline 2.1 - Background Location Demo Video

**PROVIDED**: We have created a demo video showing the background location feature on a physical iPhone. The video demonstrates:
- Starting a workout (run/walk/cycle) in RUNSTR
- App tracking location while active
- Backgrounding the app (swipe to home)
- Location indicator visible in status bar
- Returning to app showing continued tracking
- Completing workout with full route displayed

**Demo Video Link**: [TO BE ADDED - See instructions below]

### Additional Improvements

We have also added a PrivacyInfo.xcprivacy manifest file for iOS 17.2+ compliance, declaring:
- Health & Fitness data collection for workout tracking
- Precise location usage for route tracking
- Photo/Video access for profile pictures only
- No tracking or advertising purposes

All changes have been implemented in this submission. Thank you for your time and consideration.

Best regards,
RUNSTR Team

---

## Demo Video Recording Instructions

### Equipment Needed
- Physical iPhone (not simulator)
- Screen recording software or another device to record
- RUNSTR app installed on the device

### Video Script (2-3 minutes)

#### Part 1: App Introduction (30 seconds)
1. Open RUNSTR app on physical iPhone
2. Show login with Nostr key
3. Navigate to Teams tab, then Profile tab
4. Show your profile with workout history

#### Part 2: Background Location Feature Demo (90 seconds)
1. **Start Workout**:
   - Go to Profile tab
   - Tap "Start Workout" button
   - Select "Running" or "Walking"
   - Show permission prompt (if first time)
   - Tap "Start" to begin tracking
   - Walk/move around for 10-15 seconds showing map updating

2. **Background the App**:
   - Swipe up to go to home screen
   - Point out the blue location arrow in status bar
   - Wait 10-15 seconds
   - Optional: Open another app briefly

3. **Return to App**:
   - Return to RUNSTR
   - Show workout still tracking
   - Show distance/time still accumulating
   - Move around more to show continued tracking

4. **Complete Workout**:
   - Tap "Stop" button
   - Show workout summary with route
   - Show option to save/post to Nostr

#### Part 3: Bitcoin Features (30 seconds)
1. Navigate to a team member profile
2. Show lightning bolt icon
3. Demonstrate sending 21 sats (tap icon)
4. Show custom amount modal (long-press)
5. Show transaction confirmation

### Recording Tips
- Use QuickTime Player (Mac) with iPhone connected via cable
- Or use built-in iOS screen recording + camera to show physical device
- Ensure location services indicator is clearly visible
- Move enough to show actual GPS tracking
- Keep video under 5 minutes total

### Upload Instructions
1. Export video as MP4 (H.264, 1080p recommended)
2. Upload to:
   - iCloud Drive and generate share link
   - Or YouTube (unlisted)
   - Or Dropbox/Google Drive
3. Add link to App Store Connect under "App Review Information"
4. Include link in your response message

---

## Next Steps

1. Record the demo video following the script above
2. Upload video and get shareable link
3. Copy the response text above into App Store Connect
4. Add video link to the response
5. Resubmit app for review

The code changes have been completed. The app should now pass review once you provide the demo video.