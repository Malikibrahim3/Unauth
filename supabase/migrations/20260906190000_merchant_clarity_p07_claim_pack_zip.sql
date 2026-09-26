-- Claim preparation writes both a PDF and its source-manifest ZIP.
-- Preserve bucket privacy, size limits, policies, and any existing MIME types.
begin;

update storage.buckets
set allowed_mime_types = array_append(allowed_mime_types, 'application/zip')
where id = 'evidence-packages'
  and allowed_mime_types is not null
  and not ('application/zip' = any(allowed_mime_types));

commit;
