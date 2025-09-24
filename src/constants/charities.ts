/**
 * Charity Constants
 * Preset charitable organizations that teams can support
 */

export interface Charity {
  id: string;
  name: string;
  displayName: string; // For button labels (e.g., "Zap OpenSats")
  lightningAddress: string;
  description: string;
  website?: string;
}

export const CHARITIES: Charity[] = [
  {
    id: 'opensats',
    name: 'OpenSats',
    displayName: 'OpenSats',
    lightningAddress: 'opensats@vlt.ge',
    description: 'Supporting open source Bitcoin development',
    website: 'https://opensats.org'
  },
  {
    id: 'hrf',
    name: 'Human Rights Foundation',
    displayName: 'The HRF',
    lightningAddress: 'hrf@vlt.ge', // TODO: Update with actual HRF lightning address when available
    description: 'Promoting freedom and human rights worldwide',
    website: 'https://hrf.org'
  }
];

// Helper function to get charity by ID
export const getCharityById = (charityId?: string): Charity | undefined => {
  if (!charityId) return undefined;
  return CHARITIES.find(charity => charity.id === charityId);
};

// Helper to get charity options for dropdowns
export const getCharityOptions = () => {
  return CHARITIES.map(charity => ({
    label: charity.name,
    value: charity.id
  }));
};