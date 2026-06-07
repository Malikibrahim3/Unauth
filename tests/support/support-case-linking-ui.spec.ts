import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const VIEW_TOKEN_PATH = path.join(__dirname, '.auth/profile-view-token.json');

type ProfileViewTokenState = {
  profileId: string;
  viewToken: string;
};

function readProfileViewTokenState(): ProfileViewTokenState {
  if (!fs.existsSync(VIEW_TOKEN_PATH)) {
    throw new Error(`Missing support profile view token at ${VIEW_TOKEN_PATH}`);
  }
  return JSON.parse(fs.readFileSync(VIEW_TOKEN_PATH, 'utf8')) as ProfileViewTokenState;
}

function profilePageUrl(): string {
  const { profileId, viewToken } = readProfileViewTokenState();
  return `/customers/${profileId}?view_token=${encodeURIComponent(viewToken)}`;
}
const CLAIM_ID = '63f5f1ec-e96c-41b7-a759-cb4c253da644';

const linkedSupportCase = {
  id: '6f5b78fb-2757-4989-a949-4b6b2bb64864',
  provider: 'gorgias',
  external_case_id: 'g-500',
  external_url: 'https://live-link-verify.gorgias.com/app/ticket/g-live-verify-1007',
  case_status: 'open',
  claim_reason: 'refund_request',
  customer_message_summary: 'Please refund Shopify order #1007',
  agent_notes_summary: null,
  tags: ['refund'],
  link_status: 'linked',
  shopify_order_id: '16848379281777',
  order_ref: '1007',
  claim_candidate: true,
  merchant_claim_id: null,
  updated_at_provider: '2026-05-28T09:30:00+00:00',
};

test.describe('Support case linking UI', () => {
  test('customer profile shows Support cases section without raw email', async ({ page }) => {
    const { profileId } = readProfileViewTokenState();

    await page.route(`**/api/customers/${profileId}/support-cases`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ support_cases: [linkedSupportCase] }),
      });
    });

    await page.goto(profilePageUrl(), { waitUntil: 'domcontentloaded' });

    await expect(page.getByText('Support cases', { exact: true })).toBeVisible();
    await expect(
      page.getByText('Tickets and support conversations linked to this customer or their orders.')
    ).toBeVisible();
    await expect(page.getByText('g-500')).toBeVisible();
    await expect(page.getByText('Please refund Shopify order #1007')).toBeVisible();
    await expect(page.getByText('refund_request')).toBeVisible();
    await expect(page.getByText(/Tags:.*refund/i)).toBeVisible();

    const pageText = await page.locator('body').innerText();
    expect(pageText).not.toMatch(/shopper@/i);
    expect(pageText.toLowerCase()).not.toContain('raw_payload');
  });

  test('claim review shows Support ticket context when available', async ({ page }) => {
    const { profileId } = readProfileViewTokenState();

    await page.route(`**/api/claims/${CLAIM_ID}/support-context`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ support_cases: [linkedSupportCase] }),
      });
    });

    await page.route(`**/api/customers/${profileId}**`, async (route) => {
      if (route.request().url().includes('/support-cases')) {
        return route.continue();
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          profile: { id: profileId, primary_email: null, risk_score: 10, risk_level: 'low' },
          orderHistory: [],
          linkedAccounts: [],
        }),
      });
    });

    await page.route('**/api/claims?**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          shops: ['unauth-test.myshopify.com'],
          activeShopDomain: 'unauth-test.myshopify.com',
          claims: [
            {
              id: CLAIM_ID,
              claim_type: 'missing_parcel',
              status: 'under_review',
              shopify_order_id: '16848379281777',
              shop_domain: 'simeon-murray-store.myshopify.com',
            },
          ],
        }),
      });
    });

    await page.route(`**/api/customers/${profileId}/shopify-orders`, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ orders: [] }) });
    });

    await page.goto(`/customers/${profileId}/claims?claimId=${CLAIM_ID}`, {
      waitUntil: 'domcontentloaded',
    });

    await expect(page.getByText('Support ticket context')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('g-500')).toBeVisible();
    const pageText = await page.locator('body').innerText();
    expect(pageText).not.toMatch(/shopper@/i);
  });
});
