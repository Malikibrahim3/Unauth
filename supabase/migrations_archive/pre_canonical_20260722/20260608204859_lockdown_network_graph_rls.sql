-- Security hotfix: revoke authenticated/anon direct reads on cross-merchant graph tables.
-- Network intelligence must only be accessed via service-role API routes that enforce
-- merchant identity, aggregation thresholds, and k-anonymity.
--
-- Production ingestion (worker fastContext, cross-merchant API route) already uses
-- service_role. No application code path reads these tables with the user JWT.

BEGIN;

-- fraud_entities
DROP POLICY IF EXISTS "fraud_entities_read_authenticated" ON public.fraud_entities;
REVOKE ALL ON public.fraud_entities FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fraud_entities TO service_role;

DROP POLICY IF EXISTS "fraud_entities_write_service" ON public.fraud_entities;
CREATE POLICY "fraud_entities_service_only"
  ON public.fraud_entities
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- fraud_entity_co_occurrences
DROP POLICY IF EXISTS "co_occurrences_read_authenticated" ON public.fraud_entity_co_occurrences;
REVOKE ALL ON public.fraud_entity_co_occurrences FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fraud_entity_co_occurrences TO service_role;

DROP POLICY IF EXISTS "co_occurrences_write_service" ON public.fraud_entity_co_occurrences;
CREATE POLICY "co_occurrences_service_only"
  ON public.fraud_entity_co_occurrences
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- fraud_identity_clusters
DROP POLICY IF EXISTS "identity_clusters_read_authenticated" ON public.fraud_identity_clusters;
REVOKE ALL ON public.fraud_identity_clusters FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fraud_identity_clusters TO service_role;

DROP POLICY IF EXISTS "identity_clusters_write_service" ON public.fraud_identity_clusters;
CREATE POLICY "identity_clusters_service_only"
  ON public.fraud_identity_clusters
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMIT;
