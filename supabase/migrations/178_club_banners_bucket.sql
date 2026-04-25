-- Create public club-banners bucket for captain-uploaded club banners.
-- Captains upload directly from the mobile app; writes are anon because the
-- app uses Nostr auth (not Supabase auth). Reads are public so unauthenticated
-- users browsing the Social tab can see banners.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'club-banners',
  'club-banners',
  true,
  5242880, -- 5 MB
  array['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

-- Public read
drop policy if exists "Public read club banners" on storage.objects;
create policy "Public read club banners" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'club-banners');

-- Anon insert (captain gate enforced client-side + by manage-club edge function)
drop policy if exists "Anon insert club banners" on storage.objects;
create policy "Anon insert club banners" on storage.objects
  for insert to anon, authenticated
  with check (bucket_id = 'club-banners');

-- Anon update (re-upload with same path)
drop policy if exists "Anon update club banners" on storage.objects;
create policy "Anon update club banners" on storage.objects
  for update to anon, authenticated
  using (bucket_id = 'club-banners');
