/**
 * Charity Constants
 * Preset charitable organizations that teams can support
 */

export interface Charity {
  id: string;
  name: string;
  displayName: string; // For button labels (e.g., "Zap OpenSats")
  lightningAddress?: string; // Optional for special teams like PPQ.AI
  description: string;
  website?: string;
  image?: number; // require() returns a number in React Native
  category: 'charity' | 'project' | 'service'; // For reward destination grouping
  isPPQ?: boolean; // Special flag for PPQ.AI team (rewards go to AI credits)
  isCoinOS?: boolean; // Special flag for CoinOS team (rewards go to Bitcoin wallet) - DEPRECATED: kept for migration
  isSelf?: boolean; // Special flag for "You" team (rewards go to user's Lightning address)
}

// PPQ.AI team ID constant for easy reference
export const PPQ_AI_TEAM_ID = 'ppq-ai';

// CoinOS team ID constant - DEPRECATED: kept for migration from CoinOS to self
export const COINOS_TEAM_ID = 'coinos';

// Self team ID constant - "You" team where rewards go to user's Lightning address
export const SELF_TEAM_ID = 'self';

export const CHARITIES: Charity[] = [
  // PPQ.AI - Special team: Earn AI credits instead of sats
  {
    id: 'ppq-ai',
    name: 'PPQ.AI',
    displayName: 'PPQ.AI',
    // No lightningAddress - rewards go to PPQ.AI credits via bolt11 invoice
    description: 'AI credits',
    website: 'https://ppq.ai',
    image: require('../../assets/images/charities/ppq-ai.png'),
    category: 'service',
    isPPQ: true,
  },
  // ALS Network - Default team (honoring Hal Finney)
  {
    id: 'als-foundation',
    name: 'ALS Network',
    displayName: 'ALS Network',
    lightningAddress: 'RunningBTC@primal.net',
    description: 'Honoring Hal Finney - Supporting ALS research and patient care',
    website: 'https://secure.alsnetwork.org/site/TR?fr_id=1510&pg=entry',
    image: require('../../assets/images/running-bitcoin/avatar.jpg'),
    category: 'charity',
  },
  {
    id: 'bitcoin-bay',
    name: 'Bitcoin Bay',
    displayName: 'Bitcoin Bay',
    lightningAddress: 'sats@donate.bitcoinbay.foundation',
    description: 'Bitcoin circular economy in the Bay Area',
    website: 'https://geyser.fund/project/bitcoinbayfoundation',
    image: require('../../assets/images/charities/bitcoin-bay.webp'),
    category: 'project',
  },
  {
    id: 'bitcoin-ekasi',
    name: 'Bitcoin Ekasi',
    displayName: 'Bitcoin Ekasi',
    lightningAddress: 'bitcoinekasi@primal.net',
    description: 'Bitcoin circular economy in South Africa',
    website: 'https://geyser.fund/project/bitcoinekasi',
    image: require('../../assets/images/charities/bitcoin-ekasi.webp'),
    category: 'project',
  },
  {
    id: 'bitcoin-isla',
    name: 'Bitcoin Isla',
    displayName: 'Bitcoin Isla',
    lightningAddress: 'BTCIsla@primal.net',
    description: 'Bitcoin circular economy in Isla Mujeres',
    image: require('../../assets/images/charities/bitcoin-isla.jpg'),
    category: 'project',
  },
  {
    id: 'bitcoin-district',
    name: 'Bitcoin District',
    displayName: 'Bitcoin District',
    lightningAddress: 'bdi@strike.me',
    description: 'Bitcoin circular economy in Washington DC',
    website: 'https://geyser.fund/project/bitcoindc',
    image: require('../../assets/images/charities/bitcoin-district.webp'),
    category: 'project',
  },
  {
    id: 'bitcoin-yucatan',
    name: 'Bitcoin Yucatan',
    displayName: 'Bitcoin Yucatan',
    lightningAddress: 'bitcoinyucatancommunity@geyser.fund',
    description: 'Bitcoin circular economy in Mexico',
    website: 'https://geyser.fund/project/bitcoinyucatancommunity',
    image: require('../../assets/images/charities/bitcoin-yucatan.webp'),
    category: 'project',
  },
  {
    id: 'bitcoin-veterans',
    name: 'Bitcoin Veterans',
    displayName: 'Bitcoin Veterans',
    lightningAddress: 'opbitcoin@strike.me',
    description: 'Supporting veterans through Bitcoin',
    website: 'https://geyser.fund/project/operationbitcoin',
    image: require('../../assets/images/charities/bitcoin-veterans.png'),
    category: 'project',
  },
  {
    id: 'bitcoin-makueni',
    name: 'Bitcoin Makueni',
    displayName: 'Bitcoin Makueni',
    lightningAddress: 'rosechicken19@primal.net',
    description: 'Bitcoin circular economy in Kenya',
    image: require('../../assets/images/charities/bitcoin-makueni.webp'),
    category: 'project',
  },
  {
    id: 'bitcoin-house-bali',
    name: 'Bitcoin House Bali',
    displayName: 'Bitcoin House Bali',
    lightningAddress: 'btchousebali@walletofsatoshi.com',
    description: 'Bitcoin circular economy in Bali',
    image: require('../../assets/images/charities/bitcoin-house-bali.png'),
    category: 'project',
  },
  {
    id: 'human-rights-foundation',
    name: 'Human Rights Foundation',
    displayName: 'HRF',
    lightningAddress: 'nostr@btcpay.hrf.org',
    description: 'Defending human rights globally through Bitcoin',
    image: require('../../assets/images/charities/human-rights-foundation.png'),
    category: 'charity',
  },
  {
    id: 'lightning-news',
    name: 'Lightning News',
    displayName: 'Lightning News',
    lightningAddress: 'lightningnews@puresignal.news',
    description: 'Up to date news on Bitcoin and Lightning',
    image: require('../../assets/images/charities/lightning-news.webp'),
    category: 'project',
  },
  {
    id: 'runstr',
    name: 'RUNSTR',
    displayName: 'RUNSTR',
    lightningAddress: 'thewildhustle@strike.me',
    description: 'Lets Go!',
    image: require('../../assets/images/charities/runstr.png'),
    category: 'project',
  },
  {
    id: 'afribit-kibera',
    name: 'Afribit Kibera',
    displayName: 'Afribit Kibera',
    lightningAddress: 'afribit@blink.sv',
    description: 'Bitcoin circular economy in Kibera, Kenya',
    image: require('../../assets/images/charities/afribit-kibera.png'),
    category: 'project',
  },
  {
    id: 'bitcoin-basin',
    name: 'Bitcoin Basin',
    displayName: 'Bitcoin Basin',
    lightningAddress: 'plasticbowl87@walletofsatoshi.com',
    description: 'Bitcoin circular economy in Queenstown, New Zealand',
    image: require('../../assets/images/charities/bitcoin-basin.png'),
    category: 'project',
  },
  {
    id: 'buho-go',
    name: 'BuhoGO',
    displayName: 'BuhoGO',
    lightningAddress: 'buho@lnbits.de',
    description:
      'BuhoGO is an open-source, NWC-ready wallet app that makes payments simple and accessible for everyone',
    image: require('../../assets/images/charities/buho-go.jpeg'),
    category: 'project',
  },
  {
    id: 'central-pennsylvania-bitcoiners',
    name: 'Central Pennsylvania Bitcoiners',
    displayName: 'Central PA Bitcoiners',
    lightningAddress: 'businesscat@getalby.com',
    description: 'A Bitcoin focused group located in Pennsylvania.',
    image: require('../../assets/images/charities/central-pennsylvania-bitcoiners.png'),
    category: 'project',
  },
];

// Helper function to get charity by ID
export const getCharityById = (charityId?: string): Charity | undefined => {
  if (!charityId) return undefined;
  return CHARITIES.find((charity) => charity.id === charityId);
};

// Helper to get charity options for dropdowns
export const getCharityOptions = () => {
  return CHARITIES.map((charity) => ({
    label: charity.name,
    value: charity.id,
  }));
};

// Helper function to get charity by Lightning address (case-insensitive)
export const getCharityByLightningAddress = (address?: string): Charity | undefined => {
  if (!address) return undefined;
  return CHARITIES.find(
    (c) => c.lightningAddress && c.lightningAddress.toLowerCase() === address.toLowerCase()
  );
};

// Helper to check if a team is the PPQ.AI team
export const isPPQTeam = (teamId?: string): boolean => {
  if (!teamId) return false;
  return teamId === PPQ_AI_TEAM_ID;
};

// Helper to get the PPQ.AI team
export const getPPQTeam = (): Charity | undefined => {
  return CHARITIES.find((charity) => charity.isPPQ);
};

// Helper to check if a team is the CoinOS team - DEPRECATED: kept for migration
export const isCoinOSTeam = (teamId?: string): boolean => {
  if (!teamId) return false;
  return teamId === COINOS_TEAM_ID;
};

// Helper to check if a team is the "You" (self) team
export const isSelfTeam = (teamId?: string): boolean => {
  if (!teamId) return false;
  return teamId === SELF_TEAM_ID;
};

// Community team ID prefix
export const COMMUNITY_TEAM_PREFIX = 'community-';

// Helper to check if a team is a community-created team (from Supabase user_teams)
export const isCommunityTeam = (teamId?: string): boolean => {
  if (!teamId) return false;
  return teamId.startsWith(COMMUNITY_TEAM_PREFIX);
};

// Helper to extract the UUID from a community team ID (strips "community-" prefix)
export const extractCommunityTeamUUID = (teamId: string): string => {
  return teamId.slice(COMMUNITY_TEAM_PREFIX.length);
};

// Helper to get charities by category (for reward destination picker)
export const getCharitiesByCategory = (category: Charity['category']): Charity[] => {
  return CHARITIES.filter((c) => c.category === category);
};
