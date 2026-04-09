-- Season III: Club Battles — tables, config, RLS, bracket generation

-- Config table
CREATE TABLE season3_config (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

INSERT INTO season3_config (key, value) VALUES
  ('registration_deadline', '2026-05-15'),
  ('start_date', '2026-05-19'),
  ('status', 'registration'),
  ('min_members', '4'),
  ('max_clubs', '16'),
  ('prize_pool_first', 'TBD'),
  ('prize_pool_second', 'TBD');

-- Matchups table
CREATE TABLE season3_matchups (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round           INTEGER NOT NULL,
  bracket         TEXT NOT NULL CHECK (bracket IN ('winners', 'losers', 'grand_finals')),
  match_number    INTEGER NOT NULL,
  match_date      DATE,
  seed_a          INTEGER,
  seed_b          INTEGER,
  club_a_id       UUID REFERENCES user_teams(id),
  club_b_id       UUID REFERENCES user_teams(id),
  club_a_steps    BIGINT DEFAULT 0,
  club_b_steps    BIGINT DEFAULT 0,
  club_a_active   INTEGER DEFAULT 0,
  club_b_active   INTEGER DEFAULT 0,
  winner_id       UUID REFERENCES user_teams(id),
  loser_id        UUID REFERENCES user_teams(id),
  status          TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'scheduled', 'live', 'completed')),
  created_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(round, bracket, match_number)
);

-- Indexes for common queries
CREATE INDEX idx_season3_matchups_status ON season3_matchups(status);
CREATE INDEX idx_season3_matchups_date ON season3_matchups(match_date);
CREATE INDEX idx_season3_matchups_clubs ON season3_matchups(club_a_id, club_b_id);

-- RLS: anyone can read, only service role can write
ALTER TABLE season3_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE season3_matchups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "season3_config_read" ON season3_config FOR SELECT USING (true);
CREATE POLICY "season3_matchups_read" ON season3_matchups FOR SELECT USING (true);

-- Bracket generation function (called manually on May 15)
-- Uses a hardcoded 16-team double-elimination bracket structure.
-- Seeds 1-16 are randomly assigned to qualifying clubs.
-- Round 1 matchups get club IDs immediately; later rounds stay NULL until teams advance.
CREATE OR REPLACE FUNCTION generate_season3_bracket(p_start_date DATE DEFAULT '2026-05-19')
RETURNS TEXT AS $$
DECLARE
  v_clubs UUID[];
  v_count INTEGER;
  v_day INTEGER := 0;
  v_match RECORD;
BEGIN
  -- Get qualifying clubs: active, 4+ members, random order, max 16
  SELECT array_agg(club_id ORDER BY random())
  INTO v_clubs
  FROM (
    SELECT cm.club_id
    FROM club_memberships cm
    JOIN user_teams ut ON ut.id = cm.club_id
    WHERE ut.is_active = true
    GROUP BY cm.club_id
    HAVING COUNT(cm.member_npub) >= 4
    LIMIT 16
  ) q;

  v_count := coalesce(array_length(v_clubs, 1), 0);

  IF v_count < 2 THEN
    RETURN 'ERROR: Need at least 2 qualifying clubs, found ' || v_count;
  END IF;

  -- Pad to 16 with NULLs (byes) if fewer than 16 clubs
  WHILE array_length(v_clubs, 1) < 16 LOOP
    v_clubs := v_clubs || NULL::UUID;
  END LOOP;

  -- Clear any existing bracket
  DELETE FROM season3_matchups;

  -- ============================================================
  -- WINNERS BRACKET
  -- ============================================================

  -- Winners Round 1: 8 matchups (seeds paired 1v16, 8v9, 5v12, 4v13, 3v14, 6v11, 7v10, 2v15)
  INSERT INTO season3_matchups (round, bracket, match_number, match_date, seed_a, seed_b, club_a_id, club_b_id, status) VALUES
    (1, 'winners', 1, p_start_date + (v_day + 0), 1,  16, v_clubs[1],  v_clubs[16], 'scheduled'),
    (1, 'winners', 2, p_start_date + (v_day + 1), 8,  9,  v_clubs[8],  v_clubs[9],  'scheduled'),
    (1, 'winners', 3, p_start_date + (v_day + 2), 5,  12, v_clubs[5],  v_clubs[12], 'scheduled'),
    (1, 'winners', 4, p_start_date + (v_day + 3), 4,  13, v_clubs[4],  v_clubs[13], 'scheduled'),
    (1, 'winners', 5, p_start_date + (v_day + 4), 3,  14, v_clubs[3],  v_clubs[14], 'scheduled'),
    (1, 'winners', 6, p_start_date + (v_day + 5), 6,  11, v_clubs[6],  v_clubs[11], 'scheduled'),
    (1, 'winners', 7, p_start_date + (v_day + 6), 7,  10, v_clubs[7],  v_clubs[10], 'scheduled'),
    (1, 'winners', 8, p_start_date + (v_day + 7), 2,  15, v_clubs[2],  v_clubs[15], 'scheduled');
  v_day := v_day + 8;

  -- Winners Round 2: 4 matchups
  INSERT INTO season3_matchups (round, bracket, match_number, match_date, status) VALUES
    (2, 'winners', 1, p_start_date + (v_day + 0), 'pending'),
    (2, 'winners', 2, p_start_date + (v_day + 1), 'pending'),
    (2, 'winners', 3, p_start_date + (v_day + 2), 'pending'),
    (2, 'winners', 4, p_start_date + (v_day + 3), 'pending');
  v_day := v_day + 4;

  -- Losers Round 1: 4 matchups (WR1 losers face each other, cross-bracket to avoid rematches)
  INSERT INTO season3_matchups (round, bracket, match_number, match_date, status) VALUES
    (1, 'losers', 1, p_start_date + (v_day + 0), 'pending'),
    (1, 'losers', 2, p_start_date + (v_day + 1), 'pending'),
    (1, 'losers', 3, p_start_date + (v_day + 2), 'pending'),
    (1, 'losers', 4, p_start_date + (v_day + 3), 'pending');
  v_day := v_day + 4;

  -- Winners Round 3: 2 matchups
  INSERT INTO season3_matchups (round, bracket, match_number, match_date, status) VALUES
    (3, 'winners', 1, p_start_date + (v_day + 0), 'pending'),
    (3, 'winners', 2, p_start_date + (v_day + 1), 'pending');
  v_day := v_day + 2;

  -- Losers Round 2: 4 matchups (LR1 winners vs WR2 losers, cross-bracket)
  INSERT INTO season3_matchups (round, bracket, match_number, match_date, status) VALUES
    (2, 'losers', 1, p_start_date + (v_day + 0), 'pending'),
    (2, 'losers', 2, p_start_date + (v_day + 1), 'pending'),
    (2, 'losers', 3, p_start_date + (v_day + 2), 'pending'),
    (2, 'losers', 4, p_start_date + (v_day + 3), 'pending');
  v_day := v_day + 4;

  -- Losers Round 3: 2 matchups
  INSERT INTO season3_matchups (round, bracket, match_number, match_date, status) VALUES
    (3, 'losers', 1, p_start_date + (v_day + 0), 'pending'),
    (3, 'losers', 2, p_start_date + (v_day + 1), 'pending');
  v_day := v_day + 2;

  -- Winners Round 4: Winners Finals (1 matchup)
  INSERT INTO season3_matchups (round, bracket, match_number, match_date, status) VALUES
    (4, 'winners', 1, p_start_date + (v_day + 0), 'pending');
  v_day := v_day + 1;

  -- Losers Round 4: 2 matchups (LR3 winners vs WR3 losers, cross-bracket)
  INSERT INTO season3_matchups (round, bracket, match_number, match_date, status) VALUES
    (4, 'losers', 1, p_start_date + (v_day + 0), 'pending'),
    (4, 'losers', 2, p_start_date + (v_day + 1), 'pending');
  v_day := v_day + 2;

  -- Losers Round 5: Losers Finals (1 matchup)
  INSERT INTO season3_matchups (round, bracket, match_number, match_date, status) VALUES
    (5, 'losers', 1, p_start_date + (v_day + 0), 'pending');
  v_day := v_day + 1;

  -- Losers Round 6: Losers Bracket Championship (WF loser vs LF winner)
  INSERT INTO season3_matchups (round, bracket, match_number, match_date, status) VALUES
    (6, 'losers', 1, p_start_date + (v_day + 0), 'pending');
  v_day := v_day + 1;

  -- Grand Finals (1 matchup, reset created only if needed)
  INSERT INTO season3_matchups (round, bracket, match_number, match_date, status) VALUES
    (1, 'grand_finals', 1, p_start_date + (v_day + 0), 'pending');
  v_day := v_day + 1;

  -- Grand Finals Reset slot (match_date assigned only if needed)
  INSERT INTO season3_matchups (round, bracket, match_number, match_date, status) VALUES
    (2, 'grand_finals', 1, NULL, 'pending');

  -- Set first match to 'live' on start date
  UPDATE season3_matchups
  SET status = 'live'
  WHERE round = 1 AND bracket = 'winners' AND match_number = 1;

  -- Update config status
  UPDATE season3_config SET value = 'bracket_set' WHERE key = 'status';

  RETURN 'Bracket generated with ' || v_count || ' clubs. ' || (16 - v_count) || ' byes. Tournament starts ' || p_start_date;
END;
$$ LANGUAGE plpgsql;
