-- Migration 136: Import Old Nostr Teams as Supabase Clubs
--
-- Imports the 10 original kind 33404 Nostr teams into the user_teams table
-- so they appear as clubs in the new Clubs tab.
-- Also adds banner_url column and seeds captain memberships.

-- =============================================
-- 1. Add banner_url to user_teams (for team images)
-- =============================================

ALTER TABLE user_teams ADD COLUMN IF NOT EXISTS banner_url TEXT;

-- =============================================
-- 2. Import the 10 original Nostr teams
-- =============================================
-- Lightning addresses fetched from each captain's kind 0 profile on Nostr.
-- Bitcoin Runners captain had no kind 0 profile found; lightning_address left NULL.

-- Use a DO block so we can skip teams that already exist (idempotent)
DO $$
DECLARE
  v_team_id UUID;
BEGIN

  -- 1. RUNSTR
  INSERT INTO user_teams (id, name, description, lightning_address, created_by_npub, member_count, is_active, banner_url)
  VALUES (
    '87d30c8b-aa18-4424-a629-d41ea7f89078',
    'RUNSTR',
    'The Official RUNSTR Team',
    'thewildhustle@strike.me',
    'npub1xr8tvnnnr9aqt9vv30vj4vreeq2mk38mlwe7khvhvmzjqlcghh6sr85uum',
    1, true,
    'https://blossom.primal.net/473c4f185f3b64d040b70bead27fd45fd2c21333bb06ba130bc532e83ca2c128.png'
  ) ON CONFLICT (id) DO NOTHING;

  -- Captain membership
  INSERT INTO club_memberships (club_id, member_npub, role)
  VALUES ('87d30c8b-aa18-4424-a629-d41ea7f89078', 'npub1xr8tvnnnr9aqt9vv30vj4vreeq2mk38mlwe7khvhvmzjqlcghh6sr85uum', 'captain')
  ON CONFLICT (member_npub) DO NOTHING;

  -- 2. LATAM Corre
  INSERT INTO user_teams (id, name, description, lightning_address, created_by_npub, member_count, is_active, banner_url)
  VALUES (
    '072e6926-8a7c-4c5e-9360-1c728eaaddc9',
    'LATAM Corre',
    'Un club de entrenamiento para usuarios de NOSTR de Latinoamérica en español.',
    'kamoweasel@getalby.com',
    'npub1jdvvva54m8nchh3t708pav99qk24x6rkx2sh0e7jthh0l8efzt7q9y7jlj',
    3, true,
    NULL
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO club_memberships (club_id, member_npub, role)
  VALUES ('072e6926-8a7c-4c5e-9360-1c728eaaddc9', 'npub1jdvvva54m8nchh3t708pav99qk24x6rkx2sh0e7jthh0l8efzt7q9y7jlj', 'captain')
  ON CONFLICT (member_npub) DO NOTHING;

  -- 3. Bitcoin Runners
  INSERT INTO user_teams (id, name, description, lightning_address, created_by_npub, member_count, is_active, banner_url)
  VALUES (
    'b11c0100-4a11-4e50-a000-000000000001',
    'Bitcoin Runners',
    'Bitcoin Runners is an open-source running club at the intersection of two community-led movements enabling sovereignty of one''s wealth, while improving one''s health.',
    NULL,
    'npub1mlq3pk5cp5x5f80d8h6wpy756cmyzxc8vq7mhjf6lrfkg46cdrgqe67u32',
    1, true,
    NULL
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO club_memberships (club_id, member_npub, role)
  VALUES ('b11c0100-4a11-4e50-a000-000000000001', 'npub1mlq3pk5cp5x5f80d8h6wpy756cmyzxc8vq7mhjf6lrfkg46cdrgqe67u32', 'captain')
  ON CONFLICT (member_npub) DO NOTHING;

  -- 4. BULLISH
  INSERT INTO user_teams (id, name, description, lightning_address, created_by_npub, member_count, is_active, banner_url)
  VALUES (
    '7293184b-130e-4fb5-9fec-669a7c0daccf',
    'BULLISH',
    'The official BULLISH fitness team.',
    'bullish@rizful.com',
    'npub169g6736xpscfwsepzzhvpd9xjmfd632mxhwpvfk2ea2pjx3tugvswfudm7',
    1, true,
    'https://image.nostr.build/53636a9d132c0ccb6aeddd0c39d78e19c15ae18fc2d71de8c24a6a0a00bfe734.jpg'
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO club_memberships (club_id, member_npub, role)
  VALUES ('7293184b-130e-4fb5-9fec-669a7c0daccf', 'npub169g6736xpscfwsepzzhvpd9xjmfd632mxhwpvfk2ea2pjx3tugvswfudm7', 'captain')
  ON CONFLICT (member_npub) DO NOTHING;

  -- 5. Ohio Ruckers
  INSERT INTO user_teams (id, name, description, lightning_address, created_by_npub, member_count, is_active, banner_url)
  VALUES (
    '2ecc62e5-3445-432b-b708-2017f1e8e27b',
    'Ohio Ruckers',
    'We''re a troop of mostly dad-bods trying to maintain our waistlines, here in Cleveland, Ohio. All are welcome.',
    'deallen@unitypay.cash',
    'npub1rsvhkyk2nnsyzkmsuaq9h9ms7rkxhn8mtxejkca2l4pvkfpwzepql3vmtf',
    1, true,
    NULL
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO club_memberships (club_id, member_npub, role)
  VALUES ('2ecc62e5-3445-432b-b708-2017f1e8e27b', 'npub1rsvhkyk2nnsyzkmsuaq9h9ms7rkxhn8mtxejkca2l4pvkfpwzepql3vmtf', 'captain')
  ON CONFLICT (member_npub) DO NOTHING;

  -- 6. Pleb Walkstr
  INSERT INTO user_teams (id, name, description, lightning_address, created_by_npub, member_count, is_active, banner_url)
  VALUES (
    'f2154c92-7d38-4305-8cd3-41f4fabaf2c6',
    'Pleb Walkstr',
    'Pleb Walkstr was inspired by twentyone.world. On the last Saturday of each month, we walk 3 miles and talk about bitcoin.',
    'fullreserve@getalby.com',
    'npub1marc26z8nh3xkj5rcx7ufkatvx6ueqhp5vfw9v5teq26z254renshtf3g0',
    1, true,
    NULL
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO club_memberships (club_id, member_npub, role)
  VALUES ('f2154c92-7d38-4305-8cd3-41f4fabaf2c6', 'npub1marc26z8nh3xkj5rcx7ufkatvx6ueqhp5vfw9v5teq26z254renshtf3g0', 'captain')
  ON CONFLICT (member_npub) DO NOTHING;

  -- 7. CYCLESTR
  INSERT INTO user_teams (id, name, description, lightning_address, created_by_npub, member_count, is_active, banner_url)
  VALUES (
    '101f4947-43a4-4f26-bb1e-56f6959bc4ec',
    'CYCLESTR',
    'A club for nostriches who love riding bicycles.',
    'pup@rizful.com',
    'npub1vgldyxx7syc30qm9v7padnnfpdfp4zwymsyl9ztzuklaf7j5jfyspk36wu',
    1, true,
    NULL
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO club_memberships (club_id, member_npub, role)
  VALUES ('101f4947-43a4-4f26-bb1e-56f6959bc4ec', 'npub1vgldyxx7syc30qm9v7padnnfpdfp4zwymsyl9ztzuklaf7j5jfyspk36wu', 'captain')
  ON CONFLICT (member_npub) DO NOTHING;

  -- 8. Family Walks & Hikes
  INSERT INTO user_teams (id, name, description, lightning_address, created_by_npub, member_count, is_active, banner_url)
  VALUES (
    'fa3117a1-1a50-4b3e-a000-000000000001',
    'Family Walks & Hikes',
    'Family Walks & hikes around the world.',
    'elsantofrikal@minibits.cash',
    'npub1wf02ttnmqfmvm63f2cuzgkwrm75gltw88z5uhrhzvl3gaprj248qunget5',
    1, true,
    'https://iili.io/KZ2j1Nn.jpg'
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO club_memberships (club_id, member_npub, role)
  VALUES ('fa3117a1-1a50-4b3e-a000-000000000001', 'npub1wf02ttnmqfmvm63f2cuzgkwrm75gltw88z5uhrhzvl3gaprj248qunget5', 'captain')
  ON CONFLICT (member_npub) DO NOTHING;

  -- 9. Ruckstr
  INSERT INTO user_teams (id, name, description, lightning_address, created_by_npub, member_count, is_active, banner_url)
  VALUES (
    '0075ed82-32b7-487c-b17d-c1b8cae05275',
    'Ruckstr',
    'We ruck!',
    'spiffaroo@coinos.io',
    'npub1n0v3dq4j0yf0vuf64tpkzdhhyzcw232vsjjtcneexwlsarrmjqkszkt4g0',
    1, true,
    NULL
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO club_memberships (club_id, member_npub, role)
  VALUES ('0075ed82-32b7-487c-b17d-c1b8cae05275', 'npub1n0v3dq4j0yf0vuf64tpkzdhhyzcw232vsjjtcneexwlsarrmjqkszkt4g0', 'captain')
  ON CONFLICT (member_npub) DO NOTHING;

  -- 10. Spain scape
  INSERT INTO user_teams (id, name, description, lightning_address, created_by_npub, member_count, is_active, banner_url)
  VALUES (
    '9cca15c3-2804-4da6-bc77-e0baf5b8d406',
    'Spain scape',
    'Españoles intentando escapar de la agenda 2030',
    'kilombino@kilombino.com',
    'npub1qqqqqqzs0udz0dpa93ra5thgycmcmwsqw5qave53ltdrd75nrptqv5h62x',
    2, true,
    'https://blossom.primal.net/028761128cb14544ecefa16d6180e82784da38832d48d782bf828027fc41d056.jpg'
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO club_memberships (club_id, member_npub, role)
  VALUES ('9cca15c3-2804-4da6-bc77-e0baf5b8d406', 'npub1qqqqqqzs0udz0dpa93ra5thgycmcmwsqw5qave53ltdrd75nrptqv5h62x', 'captain')
  ON CONFLICT (member_npub) DO NOTHING;

END $$;
