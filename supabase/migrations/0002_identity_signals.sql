-- =========================================================
-- TRANSACTIONS: add new signal columns
-- =========================================================
ALTER TABLE transactions
  ADD COLUMN name_hash             TEXT,
  ADD COLUMN billing_address_hash  TEXT,
  ADD COLUMN ip_hash               TEXT,
  ADD COLUMN device_id_hash        TEXT,
  ADD COLUMN card_fingerprint      TEXT;

CREATE INDEX idx_tx_card   ON transactions(card_fingerprint) WHERE card_fingerprint IS NOT NULL;
CREATE INDEX idx_tx_ip     ON transactions(ip_hash)          WHERE ip_hash IS NOT NULL;
CREATE INDEX idx_tx_device ON transactions(device_id_hash)   WHERE device_id_hash IS NOT NULL;

-- =========================================================
-- IDENTITIES: drop legacy arrays, add merge columns
-- The arrays are superseded by identity_signal_links below.
-- =========================================================
ALTER TABLE identities
  DROP COLUMN linked_address_hashes,
  DROP COLUMN linked_phone_hashes,
  ADD COLUMN is_merged   BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN merged_into UUID REFERENCES identities(id);

-- =========================================================
-- IDENTITY_SIGNAL_LINKS
-- Canonical per-signal graph. One row per (identity, type, hash).
-- Enables reverse lookup: "which identity owns this card?"
-- =========================================================
CREATE TABLE identity_signal_links (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identity_id      UUID    NOT NULL REFERENCES identities(id) ON DELETE CASCADE,
  signal_type      TEXT    NOT NULL CHECK (signal_type IN (
                     'email', 'phone',
                     'address_shipping', 'address_billing',
                     'name', 'card_fingerprint', 'ip', 'device'
                   )),
  signal_hash      TEXT    NOT NULL,
  confidence       NUMERIC(3,2) NOT NULL CHECK (confidence BETWEEN 0 AND 1),
  first_seen_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  occurrence_count INTEGER NOT NULL DEFAULT 1,
  UNIQUE (identity_id, signal_type, signal_hash)
);

-- Reverse lookup: find which identity owns a given (type, hash) pair
CREATE INDEX idx_signal_links_lookup ON identity_signal_links(signal_type, signal_hash);

REVOKE ALL ON identity_signal_links FROM anon, authenticated;

-- =========================================================
-- IDENTITY_MERGES
-- Records when two email-anchored identities are collapsed
-- because a stronger signal (card, device) proved they are
-- the same person.
-- =========================================================
CREATE TABLE identity_merges (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  surviving_identity_id UUID NOT NULL REFERENCES identities(id),
  absorbed_identity_id  UUID NOT NULL REFERENCES identities(id),
  merge_trigger         TEXT NOT NULL,        -- e.g. 'card_fingerprint', 'device'
  merge_confidence      NUMERIC(3,2) NOT NULL,
  merged_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (absorbed_identity_id)               -- each identity absorbed at most once
);

REVOKE ALL ON identity_merges FROM anon, authenticated;
