// Backward-compatible alias for the canonical provider connect route. Keeping
// one implementation prevents the historical PAT endpoint from drifting away
// from account discovery, ownership, encryption, and error-redaction rules.
export { POST } from '../connect/route';
