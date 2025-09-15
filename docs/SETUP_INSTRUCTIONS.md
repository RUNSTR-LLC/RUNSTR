# RUNSTR Setup Instructions

## Required Environment Setup

### 1. Supabase Configuration

1. **Create Supabase Project**: Visit [supabase.com](https://supabase.com) and create a new project
2. **Get Your Credentials**: From your project dashboard, copy:
   - Project URL (looks like: `https://abcdefgh.supabase.co`)
   - Anonymous Key (starts with `eyJ...`)

3. **Update Environment File**: Open `.env` and replace the placeholder values:
   ```env
   SUPABASE_URL=https://your-actual-project.supabase.co
   SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

### 2. Database Schema Setup

Run these SQL commands in your Supabase SQL Editor to create the required tables:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT,
  name TEXT NOT NULL,
  avatar TEXT,
  npub TEXT NOT NULL,
  nsec TEXT,
  role TEXT CHECK (role IN ('member', 'captain')) DEFAULT 'member',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_sync_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Teams table  
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  about TEXT,
  captain_id UUID REFERENCES users(id),
  prize_pool INTEGER DEFAULT 0,
  join_reward INTEGER DEFAULT 0,
  exit_fee INTEGER DEFAULT 2000,
  sponsored_by TEXT,
  member_count INTEGER DEFAULT 0,
  avg_pace_seconds INTEGER,
  difficulty_level TEXT CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced', 'elite')) DEFAULT 'intermediate',
  is_active BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  avatar TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Team members table
CREATE TABLE team_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role TEXT CHECK (role IN ('member', 'captain', 'co_captain')) DEFAULT 'member',
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  total_workouts INTEGER DEFAULT 0,
  total_distance_meters INTEGER DEFAULT 0,
  total_duration_seconds INTEGER DEFAULT 0,
  avg_pace_seconds INTEGER,
  last_workout_at TIMESTAMPTZ
);

-- Add Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies (customize as needed)
CREATE POLICY "Users can read own profile" ON users FOR SELECT USING (auth.uid()::TEXT = id::TEXT);
CREATE POLICY "Teams are readable by all" ON teams FOR SELECT USING (true);
CREATE POLICY "Team members readable by all" ON team_members FOR SELECT USING (true);
```

### 3. Development Commands

```bash
# Install dependencies
npm install

# Start development server
expo start --ios

# Run type checking
npm run typecheck

# Run linting
npm run lint
```

### 4. Next Steps

Once your environment is configured:
1. Test authentication flows
2. Set up team discovery
3. Implement workout sync
4. Configure Bitcoin/CoinOS integration

## Troubleshooting

- **"Using default credentials" warning**: Update your `.env` file with real Supabase credentials
- **Database connection errors**: Verify your Supabase URL and key are correct
- **Type errors**: Run `npm run typecheck` to identify and fix TypeScript issues