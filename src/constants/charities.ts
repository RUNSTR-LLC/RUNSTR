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
  isPPQ?: boolean; // Special flag for PPQ.AI team (rewards go to AI credits)
}

// PPQ.AI team ID constant for easy reference
export const PPQ_AI_TEAM_ID = 'ppq-ai';

export const CHARITIES: Charity[] = [
  // PPQ.AI - Special team: Earn AI credits instead of sats
  {
    id: 'ppq-ai',
    name: 'PPQ.AI',
    displayName: 'PPQ.AI',
    // No lightningAddress - rewards go to PPQ.AI credits via bolt11 invoice
    description: 'Earn AI credits for Coach RUNSTR instead of sats',
    website: 'https://ppq.ai',
    image: require('../../assets/images/charities/ppq-ai.png'),
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
  },
  {
    id: 'ashigaru',
    name: 'Ashigaru',
    displayName: 'Ashigaru',
    lightningAddress: 'ashigarufund@geyser.fund',
    description:
      'Support the Ashigaru developers by contributing donations to ensure their project remains strong, sustainable, and resilient.',
    website: 'https://geyser.fund/project/ashigarufund',
    image: require('../../assets/images/charities/ashigaru.webp'),
  },
  {
    id: 'bitcoin-bay',
    name: 'Bitcoin Bay',
    displayName: 'Bitcoin Bay',
    lightningAddress: 'sats@donate.bitcoinbay.foundation',
    description: 'Bitcoin circular economy in the Bay Area',
    website: 'https://geyser.fund/project/bitcoinbayfoundation',
    image: require('../../assets/images/charities/bitcoin-bay.webp'),
  },
  {
    id: 'bitcoin-ekasi',
    name: 'Bitcoin Ekasi',
    displayName: 'Bitcoin Ekasi',
    lightningAddress: 'bitcoinekasi@primal.net',
    description: 'Bitcoin circular economy in South Africa',
    website: 'https://geyser.fund/project/bitcoinekasi',
    image: require('../../assets/images/charities/bitcoin-ekasi.webp'),
  },
  {
    id: 'bitcoin-isla',
    name: 'Bitcoin Isla',
    displayName: 'Bitcoin Isla',
    lightningAddress: 'BTCIsla@primal.net',
    description: 'Bitcoin circular economy in Isla Mujeres',
    image: require('../../assets/images/charities/bitcoin-isla.jpg'),
  },
  {
    id: 'bitcoin-district',
    name: 'Bitcoin District',
    displayName: 'Bitcoin District',
    lightningAddress: 'bdi@strike.me',
    description: 'Bitcoin circular economy in Washington DC',
    website: 'https://geyser.fund/project/bitcoindc',
    image: require('../../assets/images/charities/bitcoin-district.webp'),
  },
  {
    id: 'bitcoin-yucatan',
    name: 'Bitcoin Yucatan',
    displayName: 'Bitcoin Yucatan',
    lightningAddress: 'bitcoinyucatancommunity@geyser.fund',
    description: 'Bitcoin circular economy in Mexico',
    website: 'https://geyser.fund/project/bitcoinyucatancommunity',
    image: require('../../assets/images/charities/bitcoin-yucatan.webp'),
  },
  {
    id: 'bitcoin-veterans',
    name: 'Bitcoin Veterans',
    displayName: 'Bitcoin Veterans',
    lightningAddress: 'opbitcoin@strike.me',
    description: 'Supporting veterans through Bitcoin',
    website: 'https://geyser.fund/project/operationbitcoin',
    image: require('../../assets/images/charities/bitcoin-veterans.png'),
  },
  {
    id: 'bitcoin-makueni',
    name: 'Bitcoin Makueni',
    displayName: 'Bitcoin Makueni',
    lightningAddress: 'rosechicken19@primal.net',
    description: 'Bitcoin circular economy in Kenya',
    image: require('../../assets/images/charities/bitcoin-makueni.webp'),
  },
  {
    id: 'bitcoin-house-bali',
    name: 'Bitcoin House Bali',
    displayName: 'Bitcoin House Bali',
    lightningAddress: 'btchousebali@walletofsatoshi.com',
    description: 'Bitcoin circular economy in Bali',
    image: require('../../assets/images/charities/bitcoin-house-bali.png'),
  },
  {
    id: 'human-rights-foundation',
    name: 'Human Rights Foundation',
    displayName: 'HRF',
    lightningAddress: 'nostr@btcpay.hrf.org',
    description: 'Defending human rights globally through Bitcoin',
    image: require('../../assets/images/charities/human-rights-foundation.png'),
  },
  {
    id: 'runstr',
    name: 'RUNSTR',
    displayName: 'RUNSTR',
    lightningAddress: 'thewildhustle@strike.me',
    description: 'Lets Go!',
    image: require('../../assets/images/charities/runstr.png'),
  },
  {
    id: 'afribit-kibera',
    name: 'Afribit Kibera',
    displayName: 'Afribit Kibera',
    lightningAddress: 'afribit@blink.sv',
    description: 'Bitcoin circular economy in Kibera, Kenya',
    image: require('../../assets/images/charities/afribit-kibera.png'),
  },
  {
    id: 'bitcoin-basin',
    name: 'Bitcoin Basin',
    displayName: 'Bitcoin Basin',
    lightningAddress: 'plasticbowl87@walletofsatoshi.com',
    description: 'Bitcoin circular economy in Queenstown, New Zealand',
    image: require('../../assets/images/charities/bitcoin-basin.png'),
  },
  {
    id: 'buho-go',
    name: 'BuhoGO',
    displayName: 'BuhoGO',
    lightningAddress: 'buho@lnbits.de',
    description:
      'BuhoGO is an open-source, NWC-ready wallet app that makes payments simple and accessible for everyone',
    image: require('../../assets/images/charities/buho-go.jpeg'),
  },
  {
    id: 'central-pennsylvania-bitcoiners',
    name: 'Central Pennsylvania Bitcoiners',
    displayName: 'Central PA Bitcoiners',
    lightningAddress: 'businesscat@getalby.com',
    description: 'A Bitcoin focused group located in Pennsylvania.',
    image: require('../../assets/images/charities/central-pennsylvania-bitcoiners.png'),
  },
  {
    id: 'wesatoshi',
    name: 'WeSatoshi',
    displayName: 'WeSatoshi',
    lightningAddress: 'thefirstbitcointerminalhardware@geyser.fund',
    description: 'A Bitcoin-focused Swiss Army knife hardware',
    website: 'https://geyser.fund/project/thefirstbitcointerminalhardware',
    image: require('../../assets/images/charities/wesatoshi.webp'),
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
