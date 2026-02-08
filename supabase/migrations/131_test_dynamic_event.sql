-- Test dynamic event: February 5K Challenge
-- Run this AFTER 130_dynamic_competitions.sql to verify the dynamic events system.
-- Safe to delete after testing.

INSERT INTO competitions (external_id, name, description, activity_type, scoring_method, start_date, end_date, prize_pool_sats, template, config, image_url, is_open)
VALUES (
  'february-5k-challenge',
  'February 5K Challenge',
  'Run or walk a 5K every week in February',
  'running',
  'total_distance',
  '2026-02-01T00:00:00Z',
  '2026-02-28T23:59:59Z',
  10000,
  'distance_race',
  '{"activity_types": ["running", "walking"], "score_unit": "km", "winner_count": 3, "rules": "Complete as many 5K runs or walks as you can in February. GPS-tracked workouts only. Top 3 by total distance win.", "prizes": [{"place": 1, "amount_sats": 5000, "label": "1st Place"}, {"place": 2, "amount_sats": 3000, "label": "2nd Place"}, {"place": 3, "amount_sats": 2000, "label": "3rd Place"}]}',
  null,
  true
)
ON CONFLICT (external_id) DO NOTHING;
