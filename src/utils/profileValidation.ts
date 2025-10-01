/**
 * Profile Validation Utilities
 * Shared validation logic for profile editing (onboarding and settings)
 */

import { EditableProfile } from '../services/nostr/NostrProfilePublisher';

export interface ValidationErrors {
  [key: string]: string;
}

/**
 * Validate profile name
 */
export const validateName = (name?: string): string | null => {
  if (!name) return null; // Name is optional

  if (name.length > 50) {
    return 'Name must be 50 characters or less';
  }

  return null;
};

/**
 * Validate profile bio/about
 */
export const validateBio = (bio?: string): string | null => {
  if (!bio) return null; // Bio is optional

  if (bio.length > 500) {
    return 'Bio must be 500 characters or less';
  }

  return null;
};

/**
 * Validate Lightning address (LUD-16)
 */
export const validateLightningAddress = (lud16?: string): string | null => {
  if (!lud16) return null; // Lightning address is optional

  const lud16Pattern = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!lud16Pattern.test(lud16)) {
    return 'Invalid Lightning address format';
  }

  return null;
};

/**
 * Validate URL format
 */
export const validateUrl = (url?: string): string | null => {
  if (!url) return null; // URL is optional

  const urlPattern = /^https?:\/\/.+/i;
  if (!urlPattern.test(url)) {
    return 'Must be a valid URL (http:// or https://)';
  }

  return null;
};

/**
 * Validate entire profile object
 * Returns object with field-specific error messages
 */
export const validateProfile = (profile: EditableProfile): ValidationErrors => {
  const errors: ValidationErrors = {};

  // Validate name
  const nameError = validateName(profile.name);
  if (nameError) {
    errors.name = nameError;
  }

  // Validate bio
  const bioError = validateBio(profile.about);
  if (bioError) {
    errors.about = bioError;
  }

  // Validate Lightning address
  const lud16Error = validateLightningAddress(profile.lud16);
  if (lud16Error) {
    errors.lud16 = lud16Error;
  }

  // Validate picture URL
  const pictureError = validateUrl(profile.picture);
  if (pictureError) {
    errors.picture = pictureError;
  }

  // Validate banner URL
  const bannerError = validateUrl(profile.banner);
  if (bannerError) {
    errors.banner = bannerError;
  }

  // Validate website URL
  const websiteError = validateUrl(profile.website);
  if (websiteError) {
    errors.website = websiteError;
  }

  return errors;
};

/**
 * Check if profile has any validation errors
 */
export const isProfileValid = (profile: EditableProfile): boolean => {
  const errors = validateProfile(profile);
  return Object.keys(errors).length === 0;
};
