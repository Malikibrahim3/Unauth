create index if not exists source_records_external_lookup_idx on public.source_records (merchant_id, source_system, source_entity_type, external_id);
create index if not exists domain_events_case_timeline_idx on public.domain_events (merchant_id, aggregate_id, occurred_at desc) where aggregate_type = 'case';
create index if not exists entity_relationships_neighbors_idx on public.entity_relationships (merchant_id, from_entity_type, from_entity_id, match_status);
create index if not exists record_match_candidates_open_idx on public.record_match_candidates (merchant_id, created_at desc) where status = 'open';
create index if not exists work_tasks_owner_queue_idx on public.work_tasks (merchant_id, owner_user_id, status, due_at) where status in ('open','in_progress','blocked');
create index if not exists notifications_recipient_unread_idx on public.notifications (merchant_id, recipient_user_id, created_at desc) where read_at is null;
create index if not exists financial_summaries_case_currency_idx on public.case_financial_summaries (merchant_id, support_payout_case_id, currency);
create index if not exists ingestion_events_connection_issues_idx on public.ingestion_events (merchant_id, connection_id, received_at desc) where status in ('failed','dead_letter');
create index if not exists domain_event_deliveries_retry_idx on public.domain_event_deliveries (merchant_id, handler_name, status, next_attempt_at) where status in ('pending','failed','dead_letter');
