-- Migration 164: Change active reward sponsor from RUNSTR to ALS Network
--
-- The ALS Network is the first Zapvertising sponsor. All reward push
-- notifications and in-app sponsor banners will display their branding.

-- Deactivate current RUNSTR sponsor
UPDATE reward_sponsors
SET is_active = false
WHERE name = 'RUNSTR' AND is_active = true;

-- Insert ALS Network as the active sponsor
INSERT INTO reward_sponsors (name, logo_url, website_url, display_text, is_active)
VALUES (
  'ALS Network',
  'https://secure.alsnetwork.org/images/content/pagebuilder/ALS-Network-Logo.svg',
  'https://secure.alsnetwork.org/site/TR?fr_id=1510&pg=entry',
  'Rewards brought to you by',
  true
)
ON CONFLICT DO NOTHING;
