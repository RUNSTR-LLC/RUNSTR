# 🚀 APPLY TEAM TABLES MIGRATION

## Current Status
✅ **Hybrid Schema Present:** users, workouts, competition_entries, device_tokens  
❌ **Missing Team Tables:** teams, team_members (required for competition automation)

## Required Action
Your competition automation is broken because the code expects `teams` and `team_members` tables that don't exist in your Supabase database.

## 🎯 Apply Migration (Choose One Method)

### Method 1: Supabase Dashboard (RECOMMENDED)
1. Go to your Supabase Dashboard → SQL Editor
2. Copy the contents of `supabase/migrations/102_restore_team_tables.sql`
3. Paste and run the SQL
4. Run verification: `node apply-team-tables-migration.js`

### Method 2: Supabase CLI (If you have it setup)
```bash
supabase db push
# Or apply specific migration:
supabase db push --include-all
```

### Method 3: Direct SQL Execution
If you have database admin access, run the SQL file directly against your database.

## 🔍 Verification Steps
After applying the migration:

```bash
# Check if tables were created successfully
node deep-table-inspection.js

# Verify migration worked
node apply-team-tables-migration.js
```

## 🎉 Expected Results After Migration
- ✅ `teams` table: Ready for team management
- ✅ `team_members` table: Ready for member tracking
- ✅ All competition automation code will work
- ✅ Team creation, joining, leaderboards functional

## 📋 Migration Contents Summary
The migration creates:
- **teams** table with captain tracking, prize pools, member counts
- **team_members** table with competition stats and leaderboard data
- **Hybrid compatibility:** Supports both npub (Nostr) and traditional user IDs
- **Row Level Security:** Proper permissions for team management
- **Automatic triggers:** Member count updates, timestamp management

## ⚠️ Important Notes
- **Zero data loss:** Migration only creates new tables
- **Backward compatible:** Existing hybrid schema unchanged
- **Competition-first:** Designed specifically for your competition automation needs
- **Nostr-ready:** Tables include npub fields for future Nostr integration

## 🚨 If Migration Fails
If you encounter issues:
1. Check Supabase logs in dashboard
2. Ensure you have admin permissions
3. Try applying in smaller chunks (create tables first, then indexes/policies)
4. Contact for help with specific error messages

## Next Steps After Migration
1. ✅ Apply migration
2. ✅ Run verification scripts  
3. ✅ Test team creation in your app
4. ✅ Test competition automation
5. 🎉 Competition system fully functional!