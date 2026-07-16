import { readFileSync } from 'fs';
import path from 'path';
import { findMerchantCustomerByEmail } from '@/lib/gorgias/findMerchantCustomerByEmail';
import { TABLES } from '@/lib/supabase/tables';
import { createMemoryClient } from '@/tests/lib/supabaseMemoryClient';

const KNOWN_MERCHANT_ID = '00000000-0000-4000-8000-000000000001';
const KNOWN_EMAIL = 'simeonmurray123@gmail.com';

describe('findMerchantCustomerByEmail', () => {
  it('does not use PostgREST contains on emails jsonb in lookup source', () => {
    const source = readFileSync(
      path.join(process.cwd(), 'lib/gorgias/findMerchantCustomerByEmail.ts'),
      'utf8'
    );
    expect(source).not.toMatch(/\.contains\s*\(\s*['"]emails['"]/);
  });

  it('resolves the merchant-scoped customer link to the current identity', async () => {
    const supabase = createMemoryClient();
    supabase.__store.set(TABLES.MERCHANT_CUSTOMERS, [{
      merchant_id: KNOWN_MERCHANT_ID,
      email: KNOWN_EMAIL,
      identity_id: '6ac24686-2fd4-4a27-9eb3-cb1751a9548c',
    }]);
    supabase.__store.set(TABLES.CUSTOMER_PROFILES, [{
      id: '6ac24686-2fd4-4a27-9eb3-cb1751a9548c',
      confidence_grade: 'probable',
      superseded_by: null,
    }]);
    const { customer } = await findMerchantCustomerByEmail(
      supabase as never,
      KNOWN_MERCHANT_ID,
      KNOWN_EMAIL
    );

    expect(customer).toEqual({
      id: '6ac24686-2fd4-4a27-9eb3-cb1751a9548c',
      risk_level: 'probable',
      risk_score: 0,
      fraud_flags: [],
      identity_confidence_grade: 'probable',
    });
  });

  it('does not resolve the same email through another merchant', async () => {
    const supabase = createMemoryClient();
    supabase.__store.set(TABLES.MERCHANT_CUSTOMERS, [{
      merchant_id: 'other-merchant',
      email: KNOWN_EMAIL,
      identity_id: 'profile-other',
    }]);
    supabase.__store.set(TABLES.CUSTOMER_PROFILES, [{
      id: 'profile-other',
      confidence_grade: 'definite',
      superseded_by: null,
    }]);
    const { customer, diagnostics } = await findMerchantCustomerByEmail(
      supabase as never,
      KNOWN_MERCHANT_ID,
      KNOWN_EMAIL
    );

    expect(customer).toBeNull();
    expect(diagnostics.merchantScopedRows).toBe(0);
  });

  it('ignores unlinked merchant-customer rows', async () => {
    const supabase = createMemoryClient();
    supabase.__store.set(TABLES.MERCHANT_CUSTOMERS, [{
      merchant_id: KNOWN_MERCHANT_ID,
      email: KNOWN_EMAIL,
      identity_id: null,
    }]);
    const { customer, diagnostics } = await findMerchantCustomerByEmail(
      supabase as never,
      KNOWN_MERCHANT_ID,
      KNOWN_EMAIL
    );

    expect(customer).toBeNull();
    expect(diagnostics.identityLinkRows).toBe(0);
  });

  it('does not return an identity that has been superseded', async () => {
    const supabase = createMemoryClient();
    supabase.__store.set(TABLES.MERCHANT_CUSTOMERS, [{
      merchant_id: KNOWN_MERCHANT_ID,
      email: KNOWN_EMAIL,
      identity_id: 'profile-old',
    }]);
    supabase.__store.set(TABLES.CUSTOMER_PROFILES, [{
      id: 'profile-old',
      confidence_grade: 'possible',
      superseded_by: 'profile-current',
    }]);
    const { customer } = await findMerchantCustomerByEmail(
      supabase as never,
      KNOWN_MERCHANT_ID,
      KNOWN_EMAIL
    );

    expect(customer).toBeNull();
  });
});
