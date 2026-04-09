-- Migration 140: Fix missing club images (banner_url)
--
-- Migration 136 imported 10 Nostr teams but missed setting banner_url for clubs
-- that used the 'image' tag (instead of 'banner') in their kind 33404 events.
-- This updates the 3 clubs that have valid image URLs in their Nostr events.

-- LATAM Corre - has ['image', url] in Nostr event, was NULL in migration 136
UPDATE user_teams
SET banner_url = 'https://blossom.primal.net/76fa8378a0356eb74453a573480525e333472ea603335cd74e0abd4296d77617.jpg'
WHERE id = '072e6926-8a7c-4c5e-9360-1c728eaaddc9'
  AND banner_url IS NULL;

-- Ohio Ruckers - has ['image', url] in Nostr event, was NULL in migration 136
UPDATE user_teams
SET banner_url = 'https://thumbs.dreamstime.com/b/camping-elements-equipment-top-mountain-backpack-hiking-shoes-world-map-sunny-day-43194966.jpg'
WHERE id = '2ecc62e5-3445-432b-b708-2017f1e8e27b'
  AND banner_url IS NULL;

-- CYCLESTR - has ['image', url] in Nostr event, was NULL in migration 136
UPDATE user_teams
SET banner_url = 'https://raw.githubusercontent.com/bitcoinpup/PhotoHost/main/file_000000006484620a91763b74fd8eba71%20(1).png'
WHERE id = '101f4947-43a4-4f26-bb1e-56f6959bc4ec'
  AND banner_url IS NULL;

-- Note: Pleb Walkstr's image URL is an expired ephemeral ideogram.ai link, skipped.
-- Note: Bitcoin Runners and Ruckstr have no image tags in their Nostr events.
