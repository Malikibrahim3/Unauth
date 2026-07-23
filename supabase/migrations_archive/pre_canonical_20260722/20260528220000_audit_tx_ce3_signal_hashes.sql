BEGIN;
ALTER TABLE audit_transactions
  ADD COLUMN IF NOT EXISTS ce3_signal_hashes jsonb NOT NULL DEFAULT '{}'::jsonb;
COMMENT ON COLUMN audit_transactions.ce3_signal_hashes IS
  'Map of CE3.0-accepted signal name -> HMAC-SHA256 hash of the normalised identifier on THIS order. Keys: deviceMatch, ipCluster, emailVariant, addressCluster, phoneMatch, accountLink. Only present identifiers are included.';
COMMIT;
