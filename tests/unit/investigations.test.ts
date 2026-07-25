import {
  aggregateInvestigations,
} from '@/lib/investigations/store';
import {
  availableInvestigationActions,
  canApplyInvestigationAction,
} from '@/lib/investigations/lifecycle';
import {
  attachmentMagicMatches,
  safeInvestigationFileName,
  validatedInvestigationExternalUrl,
} from '@/lib/investigations/attachments';
import { recommendInvestigation } from '@/lib/investigations/recommend';
import { responsibilitySignalFromResponse } from '@/lib/investigations/responsibility';
import type { CaseInvestigation } from '@/lib/investigations/types';
import { buildSupportPayoutCase } from '@/lib/payouts/supportPayoutCase';
import { makeContext } from './payouts/context';

function investigation(
  overrides: Partial<CaseInvestigation> = {},
): CaseInvestigation {
  return {
    id: '00000000-0000-4000-8000-000000000001',
    merchant_id: '00000000-0000-4000-8000-000000000002',
    support_payout_case_id: '00000000-0000-4000-8000-000000000003',
    partner_id: null,
    is_primary: true,
    target_type: 'carrier',
    target_name: 'Carrier',
    status: 'waiting_response',
    evidence_gap: 'Where was the parcel delivered?',
    recommended_reason: null,
    override_rationale: null,
    requested_evidence: ['delivery_photo'],
    request_summary: 'Request delivery evidence.',
    subject: 'Evidence request',
    request_body: 'Please provide delivery evidence.',
    recipient: 'carrier@example.test',
    source_channel: 'manual',
    due_at: '2026-07-22T12:00:00.000Z',
    sent_at: '2026-07-21T12:00:00.000Z',
    external_reference: null,
    external_url: null,
    response_outcome: null,
    response_summary: null,
    response_body: null,
    responder_name: null,
    response_received_at: null,
    created_by: null,
    sent_by: null,
    response_recorded_by: null,
    closed_by: null,
    closed_at: null,
    closure_reason: null,
    idempotency_key: 'test-investigation',
    state_version: 2,
    metadata: {},
    created_at: '2026-07-21T11:00:00.000Z',
    updated_at: '2026-07-21T12:00:00.000Z',
    ...overrides,
  };
}

describe('investigation lifecycle', () => {
  it('allows only draft edits and only waiting responses', () => {
    expect(canApplyInvestigationAction('draft', 'update')).toBe(true);
    expect(canApplyInvestigationAction('draft', 'response')).toBe(false);
    expect(canApplyInvestigationAction('waiting_response', 'response')).toBe(true);
    expect(availableInvestigationActions(investigation({ status: 'closed' }))).toEqual([]);
  });

  it('projects primary, waiting, overdue, review, and next due facts', () => {
    const aggregate = aggregateInvestigations(
      [
        investigation(),
        investigation({
          id: '00000000-0000-4000-8000-000000000004',
          is_primary: false,
          status: 'response_received',
          due_at: null,
        }),
        investigation({
          id: '00000000-0000-4000-8000-000000000005',
          is_primary: false,
          status: 'closed',
          due_at: null,
        }),
      ],
      new Date('2026-07-23T12:00:00.000Z'),
    );
    expect(aggregate).toMatchObject({
      total: 3,
      open: 2,
      waiting: 1,
      overdue: 1,
      awaitingReview: 1,
      nextDueAt: '2026-07-22T12:00:00.000Z',
    });
    expect(aggregate.primary?.id).toBe(
      '00000000-0000-4000-8000-000000000001',
    );
  });
});

describe('investigation routing', () => {
  it('routes a missing item in a delivered parcel to fulfilment first', () => {
    const context = makeContext({
      claim: {
        type: 'item_not_received',
        reasonNormalized: 'missing_item',
      },
    });
    const payoutCase = buildSupportPayoutCase(context);
    const recommendation = recommendInvestigation({
      context,
      payoutCase,
      responseSlaHours: 24,
      now: new Date('2026-07-23T12:00:00.000Z'),
    });
    expect(payoutCase.claimType).toBe('missing_item');
    expect(recommendation.targetType).toBe('3pl');
    expect(recommendation.requestedEvidence).toContain('final_parcel_weight');
    expect(recommendation.dueAt).toBe('2026-07-24T12:00:00.000Z');
  });

  it('routes a whole parcel with carrier custody to the carrier', () => {
    const context = makeContext({
      delivery: { hasProofOfDelivery: false, status: 'in_transit' },
    });
    const recommendation = recommendInvestigation({
      context,
      payoutCase: buildSupportPayoutCase(context),
    });
    expect(recommendation.targetType).toBe('carrier');
    expect(recommendation.requestedEvidence).toContain(
      'carrier_investigation_finding',
    );
  });
});

describe('investigation response responsibility', () => {
  it.each(['no_issue_found', 'no_response', 'inconclusive'] as const)(
    'keeps %s neutral',
    (outcome) => {
      const signal = responsibilitySignalFromResponse(
        { target_type: 'carrier' },
        outcome,
      );
      expect(signal.neutral).toBe(true);
      expect(signal.attribution).toBeNull();
    },
  );

  it('uses a confirmed issue as advisory supporting evidence', () => {
    expect(
      responsibilitySignalFromResponse(
        { target_type: 'warehouse' },
        'issue_confirmed',
      ),
    ).toMatchObject({
      attribution: 'warehouse_missing_item',
      confidence: 'medium',
      neutral: false,
    });
  });
});

describe('investigation attachment validation', () => {
  it('sanitizes names and checks file signatures', () => {
    expect(safeInvestigationFileName('../../ Delivery photo (1).png')).toBe(
      '..-..-Delivery-photo-1-.png',
    );
    expect(
      attachmentMagicMatches(
        new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
        'image/png',
      ),
    ).toBe(true);
    expect(
      attachmentMagicMatches(new TextEncoder().encode('not a pdf'), 'application/pdf'),
    ).toBe(false);
  });

  it('accepts public HTTPS links and rejects credentials and private hosts', () => {
    expect(validatedInvestigationExternalUrl('https://evidence.example/path#part')).toBe(
      'https://evidence.example/path',
    );
    expect(validatedInvestigationExternalUrl('https://user:pass@example.com/a')).toBeNull();
    expect(validatedInvestigationExternalUrl('https://127.0.0.1/a')).toBeNull();
    expect(validatedInvestigationExternalUrl('http://evidence.example/a')).toBeNull();
  });
});
