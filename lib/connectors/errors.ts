/**
 * Typed connector errors. Every failure surfaced by the connector runtime uses
 * one of these codes so routes/health records can render safe, stable messages
 * instead of leaking raw provider errors.
 *
 * See ARCHITECTURE.md §5.
 */

export type ConnectorErrorCode =
  | 'connector_not_registered'
  | 'capability_unsupported'
  | 'capability_permission_missing'
  | 'capability_merchant_disabled'
  | 'connection_degraded'
  | 'connection_not_found'
  | 'test_connection_failed'
  | 'normalization_failed'
  | 'webhook_verification_failed'
  | 'action_forbidden';

export class ConnectorError extends Error {
  readonly code: ConnectorErrorCode;
  readonly providerId?: string;
  readonly retryable: boolean;

  constructor(
    code: ConnectorErrorCode,
    message: string,
    opts: { providerId?: string; retryable?: boolean } = {},
  ) {
    super(message);
    this.name = 'ConnectorError';
    this.code = code;
    this.providerId = opts.providerId;
    this.retryable = opts.retryable ?? false;
  }
}

export function connectorNotRegistered(providerId: string): ConnectorError {
  return new ConnectorError(
    'connector_not_registered',
    `No connector registered for provider '${providerId}'.`,
    { providerId },
  );
}
