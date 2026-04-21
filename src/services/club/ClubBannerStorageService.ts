/**
 * ClubBannerStorageService — pick + upload club banners to Supabase Storage.
 *
 * Flow:
 *   1. Caller triggers `pickAndUpload(clubId)` from a captain-only UI, OR
 *      `pickBannerImage()` first and `uploadBannerImage(uri, clubId)` later
 *      when creating a brand-new club (clubId is not known at pick time).
 *   2. Image is uploaded to the public `club-banners` bucket under the key
 *      `<clubId>/<timestamp>.<ext>`.
 *   3. Public URL is returned; caller writes it to `user_teams.banner_url`
 *      via the existing `manage-club` edge function.
 *
 * Notes:
 *   - Bucket read is public, writes are anon (captain gate enforced in-app +
 *     server-side by `updateClub`). See migration 178.
 *   - Max size is 5MB; we set image-picker quality = 0.8 to keep uploads small.
 *   - Prior banners for the same club are NOT deleted here — left as orphans.
 *     A sweeper can clean those up later if storage cost becomes a concern.
 */

import * as ImagePicker from 'expo-image-picker';
import { getSupabaseClient } from '../../utils/supabase';

const BUCKET = 'club-banners';

export interface BannerPickResult {
  uri?: string;
  cancelled?: boolean;
  error?: string;
}

export interface BannerUploadResult {
  success: boolean;
  url?: string;
  error?: string;
  /** True when the user cancelled the picker — not a real error. */
  cancelled?: boolean;
}

/**
 * Launch the image picker and return the picked image URI (no upload).
 * Useful when the club hasn't been created yet and a clubId is not available.
 */
export async function pickBannerImage(): Promise<BannerPickResult> {
  try {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      return { error: 'Photo library permission denied' };
    }

    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
      base64: false,
    });

    if (picked.canceled || !picked.assets?.[0]) {
      return { cancelled: true };
    }

    return { uri: picked.assets[0].uri };
  } catch (err: any) {
    console.error('[ClubBannerStorage] Pick failed:', err);
    return { error: err?.message || 'Unknown error' };
  }
}

/**
 * Upload a previously picked image URI to Supabase Storage for the given club.
 */
export async function uploadBannerImage(
  uri: string,
  clubId: string,
): Promise<BannerUploadResult> {
  try {
    const ext = (uri.split('.').pop() || 'jpg').toLowerCase();
    const contentType = ext === 'png' ? 'image/png'
      : ext === 'webp' ? 'image/webp'
      : 'image/jpeg';

    const response = await fetch(uri);
    const arrayBuffer = await response.arrayBuffer();

    const path = `${clubId}/${Date.now()}.${ext}`;
    const supabase = getSupabaseClient();

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, arrayBuffer, { contentType, upsert: true });

    if (uploadError) {
      console.error('[ClubBannerStorage] Upload failed:', uploadError);
      return { success: false, error: uploadError.message };
    }

    const { data: publicUrl } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return { success: true, url: publicUrl.publicUrl };
  } catch (err: any) {
    console.error('[ClubBannerStorage] Upload exception:', err);
    return { success: false, error: err?.message || 'Unknown error' };
  }
}

/**
 * Convenience: pick + upload in one step when clubId is already known.
 */
export async function pickAndUploadClubBanner(clubId: string): Promise<BannerUploadResult> {
  const picked = await pickBannerImage();
  if (picked.cancelled) return { success: false, cancelled: true };
  if (!picked.uri) return { success: false, error: picked.error || 'No image' };
  return uploadBannerImage(picked.uri, clubId);
}
