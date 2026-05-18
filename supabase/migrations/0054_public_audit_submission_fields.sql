ALTER TABLE public_audits
  ADD COLUMN IF NOT EXISTS submitted_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS csv_path text;

UPDATE public_audits
SET submitted_at = COALESCE(submitted_at, created_at)
WHERE submitted_at IS NULL;

CREATE OR REPLACE FUNCTION set_public_audit_deletion_schedule()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.submitted_at := COALESCE(NEW.submitted_at, NEW.created_at, now());
  NEW.deletion_scheduled_at := NEW.submitted_at + INTERVAL '7 days';
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_public_audit_deletion_schedule ON public_audits;
CREATE TRIGGER trg_public_audit_deletion_schedule
  BEFORE INSERT OR UPDATE OF submitted_at ON public_audits
  FOR EACH ROW EXECUTE FUNCTION set_public_audit_deletion_schedule();

UPDATE public_audits
SET deletion_scheduled_at = submitted_at + INTERVAL '7 days'
WHERE submitted_at IS NOT NULL
  AND (
    deletion_scheduled_at IS NULL
    OR deletion_scheduled_at <> submitted_at + INTERVAL '7 days'
  );
