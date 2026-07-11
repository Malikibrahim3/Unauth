/**
 * Connector-facing re-export of the source-record registry. The canonical
 * implementation lives in `lib/sources/sourceRegistry.ts` (Phase 1); connectors
 * import it from here so the connector layer has one stable surface.
 */
export {
  upsertSourceRecord,
  SOURCE_RECORD_CONFLICT_TARGET,
  SOURCE_SYNC_STATES,
  SOURCE_FRESHNESS_STATES,
  type UpsertSourceRecordInput,
  type SourceSyncState,
  type SourceFreshnessState,
} from '@/lib/sources/sourceRegistry';
