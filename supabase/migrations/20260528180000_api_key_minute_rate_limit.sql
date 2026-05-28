-- Durable per-minute API key rate limiting (replaces in-memory Map in validateApiKey.ts)

BEGIN;

CREATE TABLE IF NOT EXISTS api_key_minute_counts (
  api_key_id    uuid NOT NULL REFERENCES merchant_api_keys(id) ON DELETE CASCADE,
  window_minute bigint NOT NULL,
  count         integer NOT NULL DEFAULT 0,
  PRIMARY KEY (api_key_id, window_minute)
);

CREATE INDEX IF NOT EXISTS api_key_minute_counts_window_idx
  ON api_key_minute_counts (window_minute);

ALTER TABLE api_key_minute_counts ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON api_key_minute_counts FROM authenticated;
REVOKE ALL ON api_key_minute_counts FROM anon;
GRANT ALL ON api_key_minute_counts TO service_role;

CREATE OR REPLACE FUNCTION increment_api_key_minute_count(
  p_key_id        uuid,
  p_window_minute bigint
) RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count int;
BEGIN
  INSERT INTO api_key_minute_counts (api_key_id, window_minute, count)
  VALUES (p_key_id, p_window_minute, 1)
  ON CONFLICT (api_key_id, window_minute)
  DO UPDATE SET count = api_key_minute_counts.count + 1
  RETURNING count INTO v_count;

  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION increment_api_key_minute_count(uuid, bigint) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION increment_api_key_minute_count(uuid, bigint) TO service_role;

COMMIT;
