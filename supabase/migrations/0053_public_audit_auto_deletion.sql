-- Add auto-deletion fields to public_audits.
-- deletion_scheduled_at = submitted + 7 days (set on insert via trigger).
-- account_created = flipped to true when a user claims the audit.
-- A daily cron job deletes rows where deletion_scheduled_at < now() AND account_created = false.

ALTER TABLE public_audits
  ADD COLUMN IF NOT EXISTS deletion_scheduled_at timestamptz,
  ADD COLUMN IF NOT EXISTS account_created boolean NOT NULL DEFAULT false;

-- Back-fill existing rows: 7 days from created_at.
UPDATE public_audits
SET deletion_scheduled_at = created_at + INTERVAL '7 days'
WHERE deletion_scheduled_at IS NULL;

-- Trigger: set deletion_scheduled_at automatically on every new row.
CREATE OR REPLACE FUNCTION set_public_audit_deletion_schedule()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.deletion_scheduled_at := NEW.created_at + INTERVAL '7 days';
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_public_audit_deletion_schedule ON public_audits;
CREATE TRIGGER trg_public_audit_deletion_schedule
  BEFORE INSERT ON public_audits
  FOR EACH ROW EXECUTE FUNCTION set_public_audit_deletion_schedule();

-- Index for the daily cleanup query.
CREATE INDEX IF NOT EXISTS public_audits_deletion_idx
  ON public_audits (deletion_scheduled_at, account_created)
  WHERE account_created = false;
