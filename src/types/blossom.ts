/**
 * Blossom Types - TypeScript interfaces for Blossom server integration
 * Defines server configuration, blob descriptors, and track types
 */

/**
 * Blossom server configuration
 */
export interface BlossomServer {
  url: string;
  name: string;
  isDefault: boolean;
}

/**
 * Blob descriptor from Blossom server /list endpoint
 * Ref: https://github.com/hzrd149/blossom
 */
export interface BlossomBlobDescriptor {
  url: string;
  sha256: string;
  size?: number;
  type?: string; // MIME type
  uploaded?: number; // Unix timestamp
}

/**
 * Track converted from blob descriptor
 * Compatible with MusicPlayerService but distinct from WavlakeTrack
 */
export interface BlossomTrack {
  id: string; // sha256 hash
  title: string; // From filename
  artist: {
    id: string;
    name: string;
    verified: boolean;
  };
  mediaUrl: string; // Direct playable URL
  source: 'blossom';
  duration: number; // 0 until loaded
  server: string; // Server URL this track came from
  hash: string; // sha256 hash
  size?: number;
  mimeType?: string;
  uploadedAt?: Date;

  // User-edited metadata (overrides extracted values when present)
  customTitle?: string;
  customArtist?: string;
  customArtworkUrl?: string; // URL to uploaded custom artwork
}

/**
 * User-edited track metadata for persistence
 */
export interface BlossomTrackMetadata {
  customTitle?: string;
  customArtist?: string;
  customArtworkUrl?: string;
  updatedAt: number; // Unix timestamp
}

/**
 * User-edited playlist metadata for persistence
 * Stored per-server (serverUrl is the key)
 */
export interface BlossomPlaylistMetadata {
  customName?: string; // e.g., "My Workout Jams" (displayed as "🌸 {customName}")
  coverImageUri?: string; // Local file URI from image picker
  updatedAt: number; // Unix timestamp
}

/**
 * Supported audio MIME types for Blossom files
 */
export const SUPPORTED_AUDIO_TYPES = [
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/flac',
  'audio/m4a',
  'audio/aac',
  'audio/ogg',
  'audio/mp4',
  'audio/x-m4a',
  'audio/x-wav',
];

/**
 * Supported audio file extensions for Blossom files
 */
export const SUPPORTED_AUDIO_EXTENSIONS = [
  '.mp3',
  '.wav',
  '.flac',
  '.m4a',
  '.aac',
  '.ogg',
];

/**
 * Check if a file is an audio file based on MIME type or filename
 */
export function isAudioFile(mimeType: string | null | undefined, filename: string): boolean {
  // Check MIME type first
  if (mimeType && SUPPORTED_AUDIO_TYPES.includes(mimeType.toLowerCase())) {
    return true;
  }

  // Fall back to extension check
  const ext = filename.toLowerCase().slice(filename.lastIndexOf('.'));
  return SUPPORTED_AUDIO_EXTENSIONS.includes(ext);
}

/**
 * Extract title from filename
 * Removes extension and cleans up common filename patterns
 */
export function extractTitleFromFilename(filename: string): string {
  // Remove extension
  const lastDot = filename.lastIndexOf('.');
  let title = lastDot > 0 ? filename.slice(0, lastDot) : filename;

  // Replace underscores and hyphens with spaces
  title = title.replace(/[_-]/g, ' ');

  // Remove common prefixes like track numbers (01, 02., etc)
  title = title.replace(/^\d+[\.\s-]*/, '');

  // Trim and capitalize first letter
  title = title.trim();
  if (title.length > 0) {
    title = title.charAt(0).toUpperCase() + title.slice(1);
  }

  return title || 'Unknown Track';
}
