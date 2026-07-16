/**
 * Allowed entity and relationship types for the product graph
 * (`entity_relationships`). This is the merchant-scoped product graph, NOT the
 * legacy identity/cluster graph — do not wire identity-scoring types here.
 *
 * Application-level validators keep the graph honest: the database columns are
 * free text, so every write must pass through these guards.
 *
 * See ARCHITECTURE.md §2.3 and §8.
 */

/** Entity types that may appear on either end of a relationship. */
export const ENTITY_TYPES = [
  'case',
  'customer',
  'order',
  'ticket',
  'message',
  'refund',
  'replacement',
  'fulfilment',
  'shipment',
  'tracking_event',
  'return',
  'dispute',
  'evidence',
  'rule_evaluation',
  'loss',
  'recovery',
  'task',
  'decision',
  'audit_event',
] as const;
export type EntityType = (typeof ENTITY_TYPES)[number];

/** Directed relationship semantics, expressed from → to. */
export const RELATIONSHIP_TYPES = [
  'case_order',
  'case_ticket',
  'case_customer',
  'case_refund',
  'case_replacement',
  'case_shipment',
  'case_return',
  'case_dispute',
  'case_evidence',
  'case_loss',
  'case_recovery',
  'order_customer',
  'order_refund',
  'order_fulfilment',
  'order_shipment',
  'order_return',
  'ticket_customer',
  'ticket_message',
  'shipment_tracking_event',
  'fulfilment_shipment',
] as const;
export type RelationshipType = (typeof RELATIONSHIP_TYPES)[number];

/**
 * Derive the canonical relationship type for a directed (from → to) entity
 * pair, if one exists. Returns null when the pair has no defined relationship,
 * so callers must handle the absence explicitly rather than inventing an edge.
 */
export function deriveRelationshipType(
  fromEntityType: string,
  toEntityType: string,
): RelationshipType | null {
  const key = `${fromEntityType}_${toEntityType}`;
  return isRelationshipType(key) ? key : null;
}

export function isEntityType(value: string): value is EntityType {
  return (ENTITY_TYPES as readonly string[]).includes(value);
}

export function isRelationshipType(value: string): value is RelationshipType {
  return (RELATIONSHIP_TYPES as readonly string[]).includes(value);
}

/** Throw if an entity type is not allowed. */
export function assertEntityType(value: string): asserts value is EntityType {
  if (!isEntityType(value)) {
    throw new Error(`invalid_entity_type: ${value}`);
  }
}

/** Throw if a relationship type is not allowed. */
export function assertRelationshipType(value: string): asserts value is RelationshipType {
  if (!isRelationshipType(value)) {
    throw new Error(`invalid_relationship_type: ${value}`);
  }
}
