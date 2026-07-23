-- 20260619160000_extend_requested_action_taxonomy.sql
-- Align support payout case requested actions with docs/product/MVP_STEERING.md.
-- PostgreSQL enum additions are additive and safe for existing rows.

alter type public.requested_action add value if not exists 'return_label';
alter type public.requested_action add value if not exists 'investigation';
