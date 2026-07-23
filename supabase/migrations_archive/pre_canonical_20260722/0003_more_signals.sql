-- =========================================================
-- TRANSACTIONS: add new signal columns
-- =========================================================
ALTER TABLE transactions
  ADD COLUMN card_bin             TEXT,
  ADD COLUMN card_last4           TEXT,
  ADD COLUMN card_bin_last4       TEXT,
  ADD COLUMN browser_fingerprint  TEXT,
  ADD COLUMN cookie_id_hash       TEXT,
  ADD COLUMN user_agent_hash      TEXT,
  ADD COLUMN asn_hash             TEXT,
  ADD COLUMN account_id_hash      TEXT;

-- Indexes for high-confidence signals used in identity lookup
CREATE INDEX idx_tx_card_bin_last4    ON transactions(card_bin_last4)      WHERE card_bin_last4 IS NOT NULL;
CREATE INDEX idx_tx_browser_fp        ON transactions(browser_fingerprint)  WHERE browser_fingerprint IS NOT NULL;
CREATE INDEX idx_tx_cookie_id         ON transactions(cookie_id_hash)       WHERE cookie_id_hash IS NOT NULL;
CREATE INDEX idx_tx_account_id        ON transactions(account_id_hash)      WHERE account_id_hash IS NOT NULL;

-- =========================================================
-- IDENTITY_SIGNAL_LINKS: expand signal_type check constraint
-- PostgreSQL requires drop + re-add to modify a check constraint.
-- =========================================================
ALTER TABLE identity_signal_links
  DROP CONSTRAINT identity_signal_links_signal_type_check;

ALTER TABLE identity_signal_links
  ADD CONSTRAINT identity_signal_links_signal_type_check
  CHECK (signal_type IN (
    'email', 'phone',
    'address_shipping', 'address_billing',
    'name', 'card_fingerprint',
    'card_bin', 'card_last4', 'card_bin_last4',
    'browser_fingerprint', 'cookie_id', 'user_agent',
    'asn', 'account_id',
    'ip', 'device'
  ));
