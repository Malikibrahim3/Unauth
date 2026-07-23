alter table public.integration_documents drop constraint if exists integration_documents_extraction_status_check;
alter table public.integration_documents add constraint integration_documents_extraction_status_check check (extraction_status in ('quarantined','uploaded','needs_merchant_approval','approved','rejected','failed'));
alter table public.integration_documents add column if not exists malware_scan_status text not null default 'pending' check (malware_scan_status in ('pending','clean','infected','failed'));
alter table public.integration_documents add column if not exists content_type text;
alter table public.integration_documents add column if not exists size_bytes bigint;
alter table public.integration_documents add column if not exists scan_completed_at timestamptz;
