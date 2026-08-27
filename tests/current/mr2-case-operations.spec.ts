import { expect, test, type Page, type Route } from '@playwright/test';

type InvestigationStatus =
  | 'draft'
  | 'sent'
  | 'waiting_response'
  | 'response_received'
  | 'closed'
  | 'cancelled';

type DemoInvestigation = {
  id: string;
  merchant_id: string;
  support_payout_case_id: string;
  partner_id: string | null;
  is_primary: boolean;
  target_type: 'carrier' | '3pl' | 'warehouse' | 'supplier' | 'customer' | 'internal';
  target_name: string | null;
  status: InvestigationStatus;
  evidence_gap: string;
  recommended_reason: string | null;
  override_rationale: string | null;
  requested_evidence: string[];
  request_summary: string;
  subject: string;
  request_body: string;
  recipient: string | null;
  source_channel: 'email' | 'api' | 'manual' | 'portal' | 'gorgias' | null;
  due_at: string | null;
  sent_at: string | null;
  external_reference: string | null;
  external_url: string | null;
  response_outcome:
    | 'issue_confirmed'
    | 'no_issue_found'
    | 'inconclusive'
    | 'referred_elsewhere'
    | 'no_response'
    | null;
  response_summary: string | null;
  response_body: string | null;
  responder_name: string | null;
  response_received_at: string | null;
  created_by: string | null;
  sent_by: string | null;
  response_recorded_by: string | null;
  closed_by: string | null;
  closed_at: string | null;
  closure_reason: string | null;
  idempotency_key: string | null;
  state_version: number;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  partner: null;
};

type MutationRecord = {
  suffix: string;
  idempotencyKey: string | null;
  body: Record<string, unknown>;
};

const INVESTIGATION_ID = '00000000-0000-4000-8000-000000000002';
const DEMO_MERCHANT_ID = '00000000-0000-4000-8000-000000000001';

function isoAfter(hours: number): string {
  return new Date(Date.now() + hours * 60 * 60 * 1_000).toISOString();
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function investigationPayload(
  investigations: DemoInvestigation[],
  recommendationDueAt: string,
) {
  const open = investigations.filter((item) => !['closed', 'cancelled'].includes(item.status));
  const waiting = investigations.filter((item) => item.status === 'waiting_response');
  const nextDueAt = waiting
    .map((item) => item.due_at)
    .filter((value): value is string => Boolean(value))
    .sort()[0] ?? null;

  return {
    investigations,
    aggregate: {
      total: investigations.length,
      open: open.length,
      waiting: waiting.length,
      overdue: 0,
      awaitingReview: investigations.filter((item) => item.status === 'response_received').length,
      primary: open.find((item) => item.is_primary) ?? null,
      nextDueAt,
    },
    recommendation: {
      targetType: 'carrier',
      targetName: 'Demo carrier operations',
      partnerId: null,
      evidenceGap: 'The final delivery scan and parcel condition are not independently evidenced.',
      reason: 'Ask for the smallest factual record needed to re-evaluate responsibility.',
      requestedEvidence: ['final delivery scan', 'parcel condition record'],
      priority: 'high',
      dueAt: recommendationDueAt,
      secondaryJustified: false,
    },
    suggested_request: {
      subject: 'Evidence request for controlled MR2 case',
      summary: 'Confirm the final scan and parcel condition.',
      body: 'Please provide the final delivery scan and the recorded parcel condition for this controlled demo case.',
    },
    partners: [],
    settings: {
      reply_to_configured: false,
      email_enabled: false,
    },
    permissions: {
      can_mutate: true,
      writes_enabled: true,
      disabled_reason: null,
    },
  };
}

async function installSyntheticInvestigationApi(
  page: Page,
  caseId: string,
  mutationLog: MutationRecord[],
  unexpectedRequests: string[],
) {
  let investigations: DemoInvestigation[] = [];
  const createdAt = new Date().toISOString();
  const recommendationDueAt = isoAfter(48);

  await page.route(/\/api\/claims\/[^/]+\/investigations(?:\/[^/?]+(?:\/[^/?]+)?)?(?:\?.*)?$/, async (route: Route) => {
    const request = route.request();
    const url = new URL(request.url());
    const marker = '/investigations';
    const suffix = url.pathname.slice(url.pathname.indexOf(marker) + marker.length);

    if (request.method() === 'GET' && suffix === '') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(investigationPayload(investigations, recommendationDueAt)),
      });
      return;
    }

    const body = asRecord(request.postDataJSON());
    mutationLog.push({
      suffix,
      idempotencyKey: await request.headerValue('idempotency-key'),
      body,
    });

    if (request.method() === 'POST' && suffix === '') {
      const investigation: DemoInvestigation = {
        id: INVESTIGATION_ID,
        merchant_id: DEMO_MERCHANT_ID,
        support_payout_case_id: caseId,
        partner_id: typeof body.partner_id === 'string' ? body.partner_id : null,
        is_primary: body.is_primary !== false,
        target_type: body.target_type === 'carrier' ? 'carrier' : 'internal',
        target_name: typeof body.target_name === 'string' ? body.target_name : null,
        status: 'draft',
        evidence_gap: String(body.evidence_gap ?? ''),
        recommended_reason: typeof body.recommended_reason === 'string' ? body.recommended_reason : null,
        override_rationale: typeof body.override_rationale === 'string' ? body.override_rationale : null,
        requested_evidence: Array.isArray(body.requested_evidence)
          ? body.requested_evidence.map(String)
          : [],
        request_summary: String(body.request_summary ?? ''),
        subject: String(body.subject ?? ''),
        request_body: String(body.request_body ?? ''),
        recipient: typeof body.recipient === 'string' ? body.recipient : null,
        source_channel: body.source_channel === 'manual' ? 'manual' : null,
        due_at: typeof body.due_at === 'string' ? body.due_at : null,
        sent_at: null,
        external_reference: null,
        external_url: null,
        response_outcome: null,
        response_summary: null,
        response_body: null,
        responder_name: null,
        response_received_at: null,
        created_by: 'controlled-demo-operator',
        sent_by: null,
        response_recorded_by: null,
        closed_by: null,
        closed_at: null,
        closure_reason: null,
        idempotency_key: 'browser-fixture-create',
        state_version: 1,
        metadata: { evidence_classification: 'synthetic_browser_fixture' },
        created_at: createdAt,
        updated_at: createdAt,
        partner: null,
      };
      investigations = [investigation];
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ investigation }),
      });
      return;
    }

    const current = investigations[0];
    if (!current) {
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Synthetic investigation not found.' }),
      });
      return;
    }

    if (request.method() === 'POST' && suffix === `/${INVESTIGATION_ID}/mark-sent`) {
      const updatedAt = new Date().toISOString();
      current.status = 'waiting_response';
      current.sent_at = updatedAt;
      current.sent_by = 'controlled-demo-operator';
      current.source_channel = body.source_channel === 'portal' || body.source_channel === 'api'
        ? body.source_channel
        : 'manual';
      current.due_at = typeof body.due_at === 'string' ? body.due_at : recommendationDueAt;
      current.external_reference = typeof body.external_reference === 'string'
        ? body.external_reference
        : null;
      current.external_url = typeof body.external_url === 'string' ? body.external_url : null;
      current.state_version = 2;
      current.updated_at = updatedAt;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ investigation: current }),
      });
      return;
    }

    if (request.method() === 'POST' && suffix === `/${INVESTIGATION_ID}/response`) {
      const updatedAt = new Date().toISOString();
      current.status = 'response_received';
      current.response_outcome = body.response_outcome === 'issue_confirmed'
        ? 'issue_confirmed'
        : 'inconclusive';
      current.response_summary = String(body.response_summary ?? '');
      current.response_body = typeof body.response_body === 'string' ? body.response_body : null;
      current.responder_name = typeof body.responder_name === 'string' ? body.responder_name : null;
      current.external_reference = typeof body.external_reference === 'string'
        ? body.external_reference
        : current.external_reference;
      current.external_url = typeof body.external_url === 'string'
        ? body.external_url
        : current.external_url;
      current.response_received_at = updatedAt;
      current.response_recorded_by = 'controlled-demo-operator';
      current.state_version = 3;
      current.updated_at = updatedAt;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          investigation: current,
          evidence_status: 'projected',
          reevaluation_status: 'refreshed',
        }),
      });
      return;
    }

    if (request.method() === 'POST' && suffix === `/${INVESTIGATION_ID}/attachments`) {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          attachment: {
            id: '00000000-0000-4000-8000-000000000003',
            investigation_id: INVESTIGATION_ID,
            external_url: String(body.external_url ?? ''),
            safety_status: 'clean',
            evidence_classification: 'synthetic_browser_fixture',
          },
        }),
      });
      return;
    }

    unexpectedRequests.push(`${request.method()} ${suffix}`);
    await route.fulfill({
      status: 400,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Unexpected synthetic investigation request.' }),
    });
  });
}

async function seriousAxeViolations(page: Page) {
  await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') });
  return page.evaluate(async () => {
    const axe = (window as unknown as {
      axe: {
        run: (
          context: string,
          options: unknown,
        ) => Promise<{
          violations: Array<{ id: string; impact: string | null }>;
        }>;
      };
    }).axe;
    const result = await axe.run('main', {
      resultTypes: ['violations'],
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] },
    });
    return result.violations.filter(
      (violation) => violation.impact === 'serious' || violation.impact === 'critical',
    );
  });
}

test.afterEach(async ({ page }) => {
  await page.unrouteAll({ behavior: 'ignoreErrors' });
});

test('MR2 controlled Case journey opens, sends, answers, re-evaluates, focuses, and returns exactly', async ({
  page,
}) => {
  test.setTimeout(120_000);
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const mutationLog: MutationRecord[] = [];
  const unexpectedRequests: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => pageErrors.push(error.message));

  await page.goto('/cases', { waitUntil: 'domcontentloaded' });
  const firstCaseRow = page.locator('main button[data-case-id]').first();
  await expect(firstCaseRow).toBeVisible({ timeout: 20_000 });
  await firstCaseRow.click();
  const expandCaseLink = page.getByRole('link', { name: 'Expand case' });
  await expect(expandCaseLink).toBeVisible();
  const discoveredHref = await expandCaseLink.getAttribute('href');
  expect(discoveredHref).toBeTruthy();
  const discoveredUrl = new URL(discoveredHref!, 'http://controlled.demo');
  const caseId = discoveredUrl.pathname.split('/').filter(Boolean).at(-1);
  expect(caseId).toBeTruthy();

  await installSyntheticInvestigationApi(
    page,
    caseId!,
    mutationLog,
    unexpectedRequests,
  );

  const returnHref = '/work?view=mine&q=late&selected=task-9';
  const caseHref = `${discoveredUrl.pathname}?tab=evidence&return=${encodeURIComponent(returnHref)}`;
  await page.goto(caseHref, { waitUntil: 'domcontentloaded' });
  const operatingChain = page.getByRole('region', {
    name: 'Recommendation → decision → external result → money',
  });
  await expect(operatingChain).toBeVisible({ timeout: 30_000 });
  await expect(operatingChain.getByText('1 · Advisory recommendation')).toBeVisible();
  await expect(operatingChain.getByText('2 · Merchant decision')).toBeVisible();
  await expect(operatingChain.getByText('3 · Assisted provider handoff')).toBeVisible();
  await expect(operatingChain.getByText('4 · External outcome')).toBeVisible();
  await expect(operatingChain.getByText('5 · Financial stage')).toBeVisible();
  await page.getByRole('button', { name: 'Responsibility' }).click();
  await expect(
    page.getByRole('heading', { name: 'Resolve the material evidence gap' }),
  ).toBeVisible({ timeout: 30_000 });

  await page.getByRole('button', { name: 'New request' }).click();
  const requestDialog = page.getByRole('dialog', { name: 'Request evidence from a partner' });
  await expect(requestDialog).toBeVisible();
  await expect(requestDialog.getByLabel('Material evidence gap')).toHaveValue(
    'The final delivery scan and parcel condition are not independently evidenced.',
  );
  await requestDialog.getByRole('button', { name: 'Save draft' }).click();
  await expect(page.getByText('Investigation draft saved. Nothing has been sent.')).toBeVisible();
  await expect(page.locator(`#investigation-${INVESTIGATION_ID}`)).toContainText('Carrier');

  await page.getByRole('button', { name: 'Mark sent' }).click();
  const sentDialog = page.getByRole('dialog', { name: 'Mark request sent' });
  await expect(sentDialog).toBeVisible();
  await sentDialog.getByLabel('External reference').fill('MR2-DEMO-SEND-001');
  await sentDialog.getByRole('button', { name: 'Mark request sent' }).click();
  await expect(
    page.getByText('Request marked sent and a response-due Work task was created.'),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Record response' })).toBeVisible();

  await page.getByRole('button', { name: 'Record response' }).click();
  const responseDialog = page.getByRole('dialog', { name: 'Record the partner response' });
  await responseDialog.getByLabel('Outcome').selectOption('issue_confirmed');
  await responseDialog.getByLabel('Response summary').fill(
    'Controlled carrier record confirms a final scan discrepancy.',
  );
  await responseDialog.getByLabel('Responder name').fill('Demo carrier operator');
  await responseDialog.getByLabel('External reference').fill('MR2-DEMO-RESPONSE-001');
  await responseDialog.getByLabel('Public HTTPS evidence link (optional)').fill(
    'https://evidence.example.test/mr2/carrier-response-001',
  );
  await responseDialog.getByRole('button', { name: 'Record response' }).click();
  await expect(
    page.getByText('Response and validated HTTPS evidence link saved.'),
  ).toBeVisible();
  await expect(page.getByText('Latest response', { exact: true })).toBeVisible();
  await expect(
    page.getByText('Controlled carrier record confirms a final scan discrepancy.', { exact: true }),
  ).toBeVisible();

  const focusedHref = `${discoveredUrl.pathname}?tab=responsibility&investigationId=${INVESTIGATION_ID}&return=${encodeURIComponent(returnHref)}`;
  await page.goto(focusedHref, { waitUntil: 'domcontentloaded' });
  const focusedInvestigation = page.locator(`#investigation-${INVESTIGATION_ID}`);
  await expect(focusedInvestigation).toHaveAttribute('data-focused', 'true');
  await expect(page.getByRole('button', { name: /Responsibility.*Focused/ })).toHaveAttribute(
    'aria-current',
    'page',
  );
  await expect.poll(
    () => focusedInvestigation.evaluate((element) => document.activeElement === element),
  ).toBe(true);
  await expect(page.getByRole('link', { name: 'Back to work' })).toHaveAttribute(
    'href',
    returnHref,
  );

  expect(await seriousAxeViolations(page)).toEqual([]);
  expect(unexpectedRequests).toEqual([]);
  expect(pageErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);

  expect(mutationLog.map((record) => record.suffix)).toEqual([
    '',
    `/${INVESTIGATION_ID}/mark-sent`,
    `/${INVESTIGATION_ID}/response`,
    `/${INVESTIGATION_ID}/attachments`,
  ]);
  expect(mutationLog[1]?.body.expected_version).toBe(1);
  expect(mutationLog[2]?.body.expected_version).toBe(2);
  expect(mutationLog[2]?.body.response_outcome).toBe('issue_confirmed');
  expect(mutationLog[3]?.body.external_url).toBe(
    'https://evidence.example.test/mr2/carrier-response-001',
  );
  const idempotencyKeys = mutationLog.map((record) => record.idempotencyKey);
  expect(idempotencyKeys.every(Boolean)).toBe(true);
  expect(new Set(idempotencyKeys).size).toBe(idempotencyKeys.length);

  await page.getByRole('link', { name: 'Back to work' }).click();
  await expect(page).toHaveURL(new URL(returnHref, page.url()).toString());
});
