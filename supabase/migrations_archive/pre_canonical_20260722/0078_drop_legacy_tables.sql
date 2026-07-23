-- Drop legacy tables superseded by audit_transactions + customer_profiles.
-- Verified no application code references these before dropping.

DROP TABLE IF EXISTS identity_signal_links CASCADE;
DROP TABLE IF EXISTS identity_sightings CASCADE;
DROP TABLE IF EXISTS identity_merges CASCADE;
DROP TABLE IF EXISTS identities CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;
