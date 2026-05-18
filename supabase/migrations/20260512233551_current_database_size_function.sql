-- Utility function used by Supabase dashboard to report database size
CREATE OR REPLACE FUNCTION public.current_database_size_bytes()
RETURNS TABLE(database_bytes bigint)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog'
AS $$
  SELECT coalesce(sum(pg_database_size(pg_database.datname)), 0)::bigint AS database_bytes
  FROM pg_database;
$$;
