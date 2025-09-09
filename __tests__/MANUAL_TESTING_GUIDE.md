# 🧪 Manual Testing Guide: Phase 1 & 2 Fixes

## Overview
This guide verifies that our Phase 1 (Real NPUB Usage) and Phase 2 (Direct Navigation) fixes work correctly in the actual app.

---

## 📋 Pre-Testing Setup

### Prerequisites
1. ✅ App running on simulator/device: `npm run ios` or `npm run android`
2. ✅ Valid Nostr nsec for testing (don't use production keys!)
3. ✅ Database connection working (Supabase)
4. ✅ Console logs visible for debugging

### Test Data
```
Test nsec: nsec1testkey1234567890abcdefghijklmnopqrstuvwxyz (example)
Expected npub: npub1realkey1234567890abcdefghijklmnopqrstuvwxyz (example)
Team Name: "Phase Test Team"
Team Description: "Testing Phase 1 & 2 fixes"
```

---

## 🔍 Phase 1 Tests: Real NPUB Identity

### Test 1.1: Nostr Authentication
**Objective**: Verify real NPUB extraction during login

**Steps**:
1. Launch app
2. Navigate to authentication screen
3. Enter valid nsec in text field
4. Press "Sign In" button

**Expected Results**:
- ✅ Authentication succeeds
- ✅ Console logs show: `"Valid Nostr keys, npub: npub1..."`  
- ✅ User profile shows real npub (not `simple_user123`)
- ❌ NO fake npub patterns in console logs

**Verification Commands** (Console):
```javascript
// Check user object in console
console.log('Current user:', window.currentUser?.npub);
// Should show: npub1realkey... (not simple_xxx)
```

### Test 1.2: Team Creation with Real Identity  
**Objective**: Verify team creation uses real user data

**Steps**:
1. Complete authentication (Test 1.1)
2. Navigate to team creation wizard
3. Fill out team basic info:
   - Name: "Phase Test Team"
   - About: "Testing real NPUB usage"
4. Complete all wizard steps
5. Press "🚀 Launch Your Team"

**Expected Results**:
- ✅ Console logs show: `"Using REAL Nostr identity - npub: npub1..."`
- ✅ Database record created with real npub
- ❌ NO logs containing `simple_`, `fallback_`, or fake patterns
- ✅ Team creation succeeds

**Database Verification**:
```sql
-- Check teams table for real npub
SELECT id, name, captain_id FROM teams 
WHERE name = 'Phase Test Team';

-- Check users table for real npub  
SELECT id, name, npub FROM users 
WHERE npub LIKE 'npub1%' AND npub NOT LIKE 'simple_%';
```

---

## 🧭 Phase 2 Tests: Direct Navigation  

### Test 2.1: Eliminate Double Popup
**Objective**: Verify no Alert popups during team creation success

**Steps**:
1. Complete team creation (Test 1.2)
2. Wait for success screen showing:
   - 🎉 "Team Launched!" message
   - Team invite code display
   - "Go to Team Dashboard" button

**Expected Results**:
- ✅ Success screen appears smoothly
- ❌ NO Alert popup saying "Team Created!" 
- ❌ NO second Alert popup saying "Success! Redirecting..."
- ✅ Only clean UI success screen

**Red Flags** (Should NOT happen):
- ❌ Alert.alert() popup appears
- ❌ User sees "Go to Captain Dashboard" popup
- ❌ Multiple consecutive popups

### Test 2.2: Direct Team Navigation
**Objective**: Verify "Go to Team Dashboard" navigates directly

**Steps**:
1. From team creation success screen (Test 2.1)
2. Press "Go to Team Dashboard" button
3. Observe navigation behavior

**Expected Results**:
- ✅ Immediate navigation to TeamScreen  
- ✅ Console logs: `"Navigating to team dashboard: team-abc-123"`
- ✅ Team screen loads with correct team data
- ❌ NO Alert popup during navigation
- ✅ URL/navigation params contain real teamId

**Navigation Verification**:
```javascript
// Check navigation state in console  
console.log('Current route:', navigation.getState());
// Should show: { name: 'Team', params: { teamId: 'real-team-id' } }
```

### Test 2.3: AppNavigator Integration
**Objective**: Verify navigation handlers work end-to-end

**Steps**:
1. Use standalone team creation screen (not wizard)
2. Navigate to: AppNavigator → TeamCreation screen
3. Complete team creation process
4. Verify navigation completion

**Expected Results**:
- ✅ Navigation to Team screen with teamId
- ✅ Console: `"NavigationHandlers: Navigating directly to TeamScreen"`
- ❌ NO navigation to CaptainDashboard as fallback
- ✅ Team refresh occurs with new data

---

## 🔄 End-to-End Integration Tests

### Test E2E.1: Complete User Flow
**Objective**: Full workflow from auth to team dashboard

**Steps**:
1. 🔐 **Auth**: Sign in with real nsec
2. 👤 **Profile**: Verify real npub in user profile
3. ⚡ **Role**: Select "Captain" role  
4. 🏗️ **Creation**: Create team through wizard
5. 🚀 **Launch**: Complete team launch
6. 🧭 **Navigate**: Go to team dashboard

**Success Criteria**:
- ✅ Each step completes without fake data
- ✅ No Alert popups in entire flow
- ✅ Direct navigation to team dashboard  
- ✅ Console shows real npub throughout
- ✅ Database contains real identities

### Test E2E.2: Error Handling
**Objective**: Verify graceful failures

**Test Cases**:

**Invalid Authentication**:
- Enter invalid nsec → Should show clear error (not crash)

**Team Creation Failure**:  
- Simulate network failure → Should show error Alert (acceptable)
- Missing user data → Should prevent creation

**Navigation Failure**:
- Missing teamId → Should show "Navigation Error" (acceptable)

---

## 🔧 Debugging Helpers

### Console Commands
```javascript
// Check current user identity
console.log('User npub:', window.currentUser?.npub);

// Check for fake patterns  
const userStr = JSON.stringify(window.currentUser);
if (userStr.includes('simple_') || userStr.includes('fallback_')) {
  console.error('❌ FAKE IDENTITY DETECTED:', userStr);
} else {
  console.log('✅ Real identity confirmed');
}

// Check navigation state
console.log('Navigation:', navigation.getState());
```

### Database Queries
```sql
-- Find fake identities (should be empty)
SELECT * FROM users WHERE npub LIKE 'simple_%' OR npub LIKE 'fallback_%';

-- Find real identities (should have data)  
SELECT * FROM users WHERE npub LIKE 'npub1%' AND LENGTH(npub) > 60;

-- Check teams with real captains
SELECT t.name, t.id, u.npub 
FROM teams t 
JOIN users u ON t.captain_id = u.id 
WHERE u.npub LIKE 'npub1%';
```

---

## 📊 Success Metrics

### Phase 1 Success: Real NPUB Usage
- [ ] ✅ Authentication extracts real npub from nsec
- [ ] ✅ Team creation uses real captainNpub field  
- [ ] ✅ Database stores real npub (not fake patterns)
- [ ] ✅ Console logs show real identity throughout
- [ ] ❌ Zero instances of `simple_`, `fallback_`, fake patterns

### Phase 2 Success: Direct Navigation  
- [ ] ✅ Team creation success shows clean UI (no popups)
- [ ] ✅ "Go to Team Dashboard" navigates directly
- [ ] ✅ Navigation includes real teamId parameter
- [ ] ✅ Team screen loads with correct data
- [ ] ❌ Zero Alert popups during success flow

### Integration Success
- [ ] ✅ Complete user flow works end-to-end
- [ ] ✅ Real Nostr identity maintained throughout
- [ ] ✅ Navigation flow is smooth and intuitive  
- [ ] ✅ Error handling works gracefully
- [ ] ✅ Performance is acceptable (< 3s team creation)

---

## 🚨 Red Flags (Report Immediately)

### Critical Issues:
- ❌ **Fake Identity**: Any `simple_xxx` or `fallback_xxx` npubs
- ❌ **Double Popups**: Multiple Alert dialogs during team creation
- ❌ **Navigation Failure**: "Go to Team Dashboard" doesn't work
- ❌ **Data Loss**: User data missing after team creation
- ❌ **Crashes**: App crashes during workflow

### Performance Issues:
- ⚠️ Team creation takes > 5 seconds
- ⚠️ Navigation lag > 2 seconds  
- ⚠️ Console errors during normal flow

---

## 📝 Test Report Template

```markdown
# Test Report: Phase 1 & 2 Fixes

**Date**: ___________
**Tester**: ___________  
**Platform**: iOS/Android
**Build**: ___________

## Phase 1: Real NPUB Usage
- [ ] Test 1.1: Nostr Authentication - ✅/❌
- [ ] Test 1.2: Team Creation Identity - ✅/❌

**Issues Found**: ___________

## Phase 2: Direct Navigation  
- [ ] Test 2.1: Eliminate Double Popup - ✅/❌
- [ ] Test 2.2: Direct Team Navigation - ✅/❌
- [ ] Test 2.3: AppNavigator Integration - ✅/❌

**Issues Found**: ___________

## End-to-End Integration
- [ ] Test E2E.1: Complete User Flow - ✅/❌
- [ ] Test E2E.2: Error Handling - ✅/❌

**Overall Assessment**: PASS/FAIL
**Notes**: ___________
```

---

**Ready to test!** 🚀 Follow this guide to verify our Phase 1 & 2 fixes work correctly in the actual app.