import type { EvidenceResponse, LookupResponse } from '../shared/types';
import { claimsLine, gradeVisualForLookup } from './risk';
import { PopupHeader } from './PopupHeader';

type PopupResultsScreenProps = {
  lookup: LookupResponse;
  showEvidenceForm: boolean;
  evidenceOrderId: string;
  evidenceLoading: boolean;
  evidence: EvidenceResponse | null;
  evidenceError: string;
  onSettings: () => void;
  onOpenProfile: () => void;
  onShowEvidenceForm: () => void;
  onEvidenceOrderIdChange: (value: string) => void;
  onGenerateEvidence: () => void;
  onCancelEvidenceForm: () => void;
  onNewLookup: () => void;
};

export function PopupResultsScreen({
  lookup,
  showEvidenceForm,
  evidenceOrderId,
  evidenceLoading,
  evidence,
  evidenceError,
  onSettings,
  onOpenProfile,
  onShowEvidenceForm,
  onEvidenceOrderIdChange,
  onGenerateEvidence,
  onCancelEvidenceForm,
  onNewLookup,
}: PopupResultsScreenProps) {
  const visual = gradeVisualForLookup(lookup);
  const crossMerchant = lookup.claims_record.cross_merchant;

  return (
    <div className="app">
      <PopupHeader connected showSettings onSettings={onSettings} />
      <div className="body results">
        <div className={`grade-banner ${visual.className}`}>
          <h2>{visual.label}</h2>
          <div className="grade-meta">
            {lookup.matched_on.length > 0
              ? `Matched on ${lookup.matched_on.join(', ')}`
              : 'Identity match'}
          </div>
        </div>

        <div>
          <p className="section-title">Claims on record</p>
          <p style={{ margin: 0 }}>{claimsLine(lookup.claims_record)}</p>
        </div>

        {crossMerchant && (
          <div className="cross-merchant">
            <p className="section-title">Cross-merchant</p>
            <p style={{ margin: 0 }}>
              Seen at {crossMerchant.merchant_count} merchants
              <br />
              {crossMerchant.claim_count} total claims
            </p>
          </div>
        )}

        {lookup.ce3_evidence_available && (
          <div className="ce3">
            <p className="section-title">CE 3.0</p>
            <p style={{ margin: 0 }}>CE 3.0 evidence available</p>
          </div>
        )}

        <div className="actions">
          <button type="button" className="btn btn-primary" onClick={onOpenProfile}>
            View full profile →
          </button>

          {!showEvidenceForm && !evidence && (
            <button type="button" className="btn btn-ghost" onClick={onShowEvidenceForm}>
              Generate evidence PDF
            </button>
          )}

          {showEvidenceForm && !evidence && (
            <div className="evidence-form">
              <label className="label" htmlFor="evidence-order">
                Order ID
              </label>
              <input
                id="evidence-order"
                className="input"
                value={evidenceOrderId}
                onChange={(e) => onEvidenceOrderIdChange(e.target.value)}
                placeholder="Shopify order ID or ref"
              />
              {evidenceError && <div className="error-box">{evidenceError}</div>}
              <button
                type="button"
                className="btn btn-primary"
                disabled={evidenceLoading}
                onClick={onGenerateEvidence}
              >
                {evidenceLoading ? 'Generating…' : 'Generate PDF'}
              </button>
              <button type="button" className="btn btn-ghost" onClick={onCancelEvidenceForm}>
                Cancel
              </button>
            </div>
          )}

          {evidence && (
            <div className="evidence-success">
              <p>
                <strong>{evidence.reference}</strong>
                {evidence.has_prior_match_evidence ? ' · Prior identity match' : ''}
              </p>
              <a
                className="link"
                href={evidence.download_url || evidence.pdf_url}
                target="_blank"
                rel="noreferrer"
              >
                Download PDF →
              </a>
            </div>
          )}

          <button type="button" className="btn btn-ghost" onClick={onNewLookup}>
            New lookup
          </button>
        </div>
      </div>
    </div>
  );
}
