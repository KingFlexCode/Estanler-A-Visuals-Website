-- EST-72 Public Client Gallery Viewer
--
-- Run this after the EST-71 client gallery schema.
-- This adds the public read rules needed by /gallery/:slug and widens the
-- design enum checks used by the admin gallery editor.

-- EST-71 added section slugs in the app flow. Make the column explicit for
-- clean new environments and backfill older Highlights rows.
alter table public.client_gallery_sections
  add column if not exists slug text;

update public.client_gallery_sections
set slug = coalesce(nullif(slug, ''), lower(regexp_replace(title, '[^a-zA-Z0-9]+', '-', 'g')))
where slug is null or slug = '';

update public.client_gallery_sections
set slug = trim(both '-' from slug)
where slug is not null;

update public.client_gallery_sections
set slug = 'photo-set-' || id::text
where slug is null or slug = '';

create unique index if not exists client_gallery_sections_gallery_id_slug_key
  on public.client_gallery_sections(gallery_id, slug);

-- Widen design values now supported by the EST-71/EST-72 UI.
alter table public.client_galleries
  drop constraint if exists client_galleries_cover_style_check;

alter table public.client_galleries
  add constraint client_galleries_cover_style_check
  check (cover_style in (
    'center',
    'left',
    'novel',
    'vintage',
    'frame',
    'stripe',
    'divider',
    'journal',
    'minimal',
    'split'
  ));

alter table public.client_galleries
  drop constraint if exists client_galleries_grid_style_check;

alter table public.client_galleries
  add constraint client_galleries_grid_style_check
  check (grid_style in (
    'masonry',
    'square',
    'editorial',
    'vertical',
    'horizontal',
    'mosaic',
    'clean',
    'filmstrip'
  ));

alter table public.client_galleries
  drop constraint if exists client_galleries_typography_style_check;

alter table public.client_galleries
  add constraint client_galleries_typography_style_check
  check (typography_style in (
    'classic',
    'modern',
    'editorial',
    'luxury',
    'romantic',
    'fashion',
    'cinematic',
    'minimal',
    'playful',
    'street'
  ));

-- Public read policies for the live customer-facing viewer.
-- Only published galleries are readable publicly.
drop policy if exists "Public can read published client galleries" on public.client_galleries;
create policy "Public can read published client galleries"
on public.client_galleries
for select
to anon, authenticated
using (status = 'published');

-- Only visible sections from published galleries are readable publicly.
drop policy if exists "Public can read visible published client gallery sections" on public.client_gallery_sections;
create policy "Public can read visible published client gallery sections"
on public.client_gallery_sections
for select
to anon, authenticated
using (
  is_visible = true
  and exists (
    select 1
    from public.client_galleries gallery
    where gallery.id = client_gallery_sections.gallery_id
      and gallery.status = 'published'
  )
);

-- Only images from visible sections inside published galleries are readable publicly.
drop policy if exists "Public can read published client gallery images" on public.client_gallery_images;
create policy "Public can read published client gallery images"
on public.client_gallery_images
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.client_gallery_sections section
    join public.client_galleries gallery
      on gallery.id = section.gallery_id
    where section.id = client_gallery_images.section_id
      and section.is_visible = true
      and gallery.status = 'published'
  )
);

-- The bucket is public in EST-71. This explicit policy keeps public image reads
-- compatible for projects where storage object policies are enforced.
drop policy if exists "Public can read client gallery files" on storage.objects;
create policy "Public can read client gallery files"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'client-galleries');
