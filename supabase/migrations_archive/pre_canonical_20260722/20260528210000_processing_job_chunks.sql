-- Durable CSV chunk queue (replaces fragile fire-and-forget HTTP self-POST chain)

BEGIN;

CREATE TABLE IF NOT EXISTS processing_job_chunks (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id        uuid NOT NULL REFERENCES processing_jobs(id) ON DELETE CASCADE,
  chunk_index   int NOT NULL,
  total_chunks  int NOT NULL,
  merchant_id   uuid NOT NULL,
  storage_path  text NOT NULL,
  column_map    jsonb,
  status        text NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  claimed_at    timestamptz,
  completed_at  timestamptz,
  last_error    text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (job_id, chunk_index)
);

CREATE INDEX IF NOT EXISTS idx_processing_job_chunks_pending
  ON processing_job_chunks (job_id, chunk_index)
  WHERE status = 'pending';

ALTER TABLE processing_job_chunks ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON processing_job_chunks FROM authenticated;
REVOKE ALL ON processing_job_chunks FROM anon;
GRANT ALL ON processing_job_chunks TO service_role;

ALTER TABLE processing_jobs
  ADD COLUMN IF NOT EXISTS finalize_claimed_at timestamptz;

CREATE OR REPLACE FUNCTION register_processing_job_chunks(
  p_job_id       uuid,
  p_merchant_id  uuid,
  p_total_chunks int,
  p_storage_path text,
  p_column_map   jsonb DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF p_total_chunks < 1 THEN
    RETURN;
  END IF;

  INSERT INTO processing_job_chunks (
    job_id, chunk_index, total_chunks, merchant_id, storage_path, column_map, status
  )
  SELECT
    p_job_id,
    g.i,
    p_total_chunks,
    p_merchant_id,
    p_storage_path,
    p_column_map,
    'pending'
  FROM generate_series(0, p_total_chunks - 1) AS g(i)
  ON CONFLICT (job_id, chunk_index) DO NOTHING;
END;
$$;

CREATE OR REPLACE FUNCTION begin_processing_job_chunk(
  p_job_id      uuid,
  p_chunk_index int
) RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_status text;
BEGIN
  SELECT status INTO v_status
  FROM processing_job_chunks
  WHERE job_id = p_job_id AND chunk_index = p_chunk_index
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN 'missing';
  END IF;

  IF v_status = 'completed' THEN
    RETURN 'completed';
  END IF;

  UPDATE processing_job_chunks
  SET status = 'processing', claimed_at = COALESCE(claimed_at, now())
  WHERE job_id = p_job_id AND chunk_index = p_chunk_index;

  RETURN 'processing';
END;
$$;

CREATE OR REPLACE FUNCTION complete_processing_job_chunk(
  p_job_id      uuid,
  p_chunk_index int
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE processing_job_chunks
  SET status = 'completed', completed_at = now(), last_error = NULL
  WHERE job_id = p_job_id AND chunk_index = p_chunk_index;
END;
$$;

CREATE OR REPLACE FUNCTION fail_processing_job_chunk(
  p_job_id      uuid,
  p_chunk_index int,
  p_error       text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE processing_job_chunks
  SET status = 'failed', last_error = p_error, completed_at = now()
  WHERE job_id = p_job_id AND chunk_index = p_chunk_index;
END;
$$;

CREATE OR REPLACE FUNCTION next_pending_processing_chunk_index(p_job_id uuid)
RETURNS int
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT chunk_index
  FROM processing_job_chunks
  WHERE job_id = p_job_id AND status = 'pending'
  ORDER BY chunk_index ASC
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION all_processing_job_chunks_complete(p_job_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM processing_job_chunks
    WHERE job_id = p_job_id AND status <> 'completed'
  )
  AND EXISTS (
    SELECT 1 FROM processing_job_chunks WHERE job_id = p_job_id
  );
$$;

CREATE OR REPLACE FUNCTION try_claim_job_finalize(p_job_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_claimed boolean;
BEGIN
  IF NOT all_processing_job_chunks_complete(p_job_id) THEN
    RETURN false;
  END IF;

  UPDATE processing_jobs
  SET finalize_claimed_at = now()
  WHERE id = p_job_id
    AND finalize_claimed_at IS NULL
    AND status NOT IN ('completed', 'failed')
  RETURNING true INTO v_claimed;

  RETURN COALESCE(v_claimed, false);
END;
$$;

REVOKE ALL ON FUNCTION register_processing_job_chunks(uuid, uuid, int, text, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION begin_processing_job_chunk(uuid, int) FROM PUBLIC;
REVOKE ALL ON FUNCTION complete_processing_job_chunk(uuid, int) FROM PUBLIC;
REVOKE ALL ON FUNCTION fail_processing_job_chunk(uuid, int, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION next_pending_processing_chunk_index(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION all_processing_job_chunks_complete(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION try_claim_job_finalize(uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION register_processing_job_chunks(uuid, uuid, int, text, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION begin_processing_job_chunk(uuid, int) TO service_role;
GRANT EXECUTE ON FUNCTION complete_processing_job_chunk(uuid, int) TO service_role;
GRANT EXECUTE ON FUNCTION fail_processing_job_chunk(uuid, int, text) TO service_role;
GRANT EXECUTE ON FUNCTION next_pending_processing_chunk_index(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION all_processing_job_chunks_complete(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION try_claim_job_finalize(uuid) TO service_role;

COMMIT;
