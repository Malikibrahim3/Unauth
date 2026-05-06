import { NextResponse, type NextRequest } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { scoreOrders } from '@/lib/engine';
import { computeMetrics } from '@/lib/eval/metrics';
import { createJob, completeJob } from '@/lib/processing/job';
import { createHash } from 'crypto';
import type { NormalisedOrder } from '@/lib/engine/types';
import type { Database } from '@/lib/supabase/types';

type MerchantRow = Database['public']['Tables']['merchants']['Row'];

// Deterministic hash for demo data — does not use IDENTITY_SALT
function dh(value: string): string {
  return createHash('sha256').update('parceldemo:' + value).digest('hex');
}

type DemoOrder = NormalisedOrder & { _rawEmail: string; _rawIP: string; _rawAddress: string; _rawCardLast4: string | null };

function makeOrder(
  id: string,
  emailKey: string,
  rawEmail: string,
  addressKey: string,
  daysAgo: number,
  total: number,
  overrides: Partial<NormalisedOrder> = {}
): DemoOrder {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return {
    orderId: id,
    orderDate: date,
    emailHash: dh(emailKey),
    addressHash: dh(addressKey),
    phoneHash: dh('phone:' + emailKey),
    nameHash: dh('name:' + emailKey),
    billingAddressHash: dh(addressKey),
    ipHash: dh('ip:' + emailKey),
    deviceIdHash: dh('device:' + emailKey),
    cardFingerprint: null,
    cardBin: null,
    cardLast4: null,
    cardBinLast4: null,
    browserFingerprint: null,
    cookieIdHash: null,
    userAgentHash: null,
    asnHash: null,
    accountIdHash: null,
    customerNameNorm: emailKey.split('@')[0].replace(/\d+/, '').replace('.', ' '),
    orderTotal: total,
    currency: 'GBP',
    orderStatus: 'completed',
    refundStatus: 'none',
    refundReason: null,
    refundDate: null,
    refundAmount: null,
    paymentMethod: 'visa',
    groundTruthLabel: 'legitimate',
    _rawEmail: rawEmail,
    _rawIP: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
    _rawAddress: addressKey,
    _rawCardLast4: null,
    ...overrides,
  };
}

function rndTotal(min: number, max: number): number {
  return parseFloat((Math.random() * (max - min) + min).toFixed(2));
}

function generateDemoOrders(): DemoOrder[] {
  const orders: DemoOrder[] = [];
  let seq = 1;
  const nextId = () => `DEMO-${String(seq++).padStart(5, '0')}`;

  const DISPOSABLE_DOMAINS = ['mailinator.com', 'guerrillamail.com', '10minutemail.com', 'trashmail.com'];
  const PAYMENT_METHODS = ['visa', 'mastercard', 'amex', 'paypal', 'apple_pay', 'google_pay'];

  // ── Cohort 1: INR abusers (10 customers × 4 orders = 40) ─────────────────
  for (let c = 0; c < 10; c++) {
    const email = `inr.abuser${c}@gmail.com`;
    const addr = `inr-addr-${c}`;
    for (let i = 0; i < 3; i++) {
      const total = rndTotal(40, 280);
      const orderDaysAgo = 80 + c * 7 + i * 15;
      const refDate = new Date();
      refDate.setDate(refDate.getDate() - orderDaysAgo + 10);
      orders.push(makeOrder(nextId(), email, email, addr, orderDaysAgo, total, {
        orderStatus: 'refunded',
        refundStatus: 'full',
        refundReason: 'inr',
        refundDate: refDate,
        refundAmount: total,
        groundTruthLabel: 'fraud',
      }));
    }
    orders.push(makeOrder(nextId(), email, email, addr, 5 + c, rndTotal(20, 150), {
      groundTruthLabel: 'fraud',
    }));
  }

  // ── Cohort 2: High refund rate (10 customers × 5 orders = 50) ────────────
  for (let c = 0; c < 10; c++) {
    const email = `refund.heavy${c}@outlook.com`;
    const addr = `refund-addr-${c}`;
    for (let i = 0; i < 4; i++) {
      const total = rndTotal(25, 180);
      const orderDaysAgo = 120 + c * 5 + i * 20;
      const refDate = new Date();
      refDate.setDate(refDate.getDate() - orderDaysAgo + 8);
      orders.push(makeOrder(nextId(), email, email, addr, orderDaysAgo, total, {
        orderStatus: 'refunded',
        refundStatus: 'full',
        refundReason: 'not_as_described',
        refundDate: refDate,
        refundAmount: total,
        groundTruthLabel: 'fraud',
      }));
    }
    orders.push(makeOrder(nextId(), email, email, addr, 10 + c, rndTotal(15, 90), {
      groundTruthLabel: 'fraud',
    }));
  }

  // ── Cohort 3: Velocity bursts (10 customers × 6 orders on same day = 60) ─
  for (let c = 0; c < 10; c++) {
    const email = `burst.buyer${c}@yahoo.com`;
    const addr = `velocity-addr-${c}`;
    const burstDaysAgo = 20 + c * 3;
    for (let i = 0; i < 6; i++) {
      orders.push(makeOrder(nextId(), email, email, addr, burstDaysAgo, rndTotal(30, 200), {
        groundTruthLabel: 'fraud',
      }));
    }
  }

  // ── Cohort 4: INR speed (6 customers × 3 orders = 18) ────────────────────
  for (let c = 0; c < 6; c++) {
    const email = `inr.speed${c}@hotmail.com`;
    const addr = `speed-addr-${c}`;
    for (let i = 0; i < 2; i++) {
      const total = rndTotal(60, 350);
      const orderDaysAgo = 50 + c * 10 + i * 5;
      const refDate = new Date();
      refDate.setDate(refDate.getDate() - orderDaysAgo + 1);
      orders.push(makeOrder(nextId(), email, email, addr, orderDaysAgo, total, {
        orderStatus: 'refunded',
        refundStatus: 'full',
        refundReason: 'inr',
        refundDate: refDate,
        refundAmount: total,
        groundTruthLabel: 'fraud',
      }));
    }
    orders.push(makeOrder(nextId(), email, email, addr, 3 + c, rndTotal(20, 100), {
      groundTruthLabel: 'fraud',
    }));
  }

  // ── Cohort 5: Disposable emails (8 customers × 2 orders = 16) ────────────
  for (let c = 0; c < 8; c++) {
    const domain = DISPOSABLE_DOMAINS[c % DISPOSABLE_DOMAINS.length];
    const raw = `throwaway${c}@${domain}`;
    const addr = `disposable-addr-${c}`;
    for (let i = 0; i < 2; i++) {
      orders.push(makeOrder(nextId(), raw, raw, addr, 30 + c * 4 + i * 3, rndTotal(15, 120), {
        groundTruthLabel: 'fraud',
      }));
    }
  }

  // ── Cohort 6: Address clusters (4 clusters × 5 orders = 20) ──────────────
  const CLUSTER_ADDRS = [
    '17 Fraud Lane London E1 6RF',
    '99 Abuse Road Manchester M1 2AB',
    '42 Scam Street Birmingham B1 1AA',
    '7 Ring Road Leeds LS1 1BA',
  ];
  for (let cluster = 0; cluster < 4; cluster++) {
    const addr = CLUSTER_ADDRS[cluster];
    for (let i = 0; i < 5; i++) {
      const email = `cluster${cluster}.user${i}@gmail.com`;
      orders.push(makeOrder(nextId(), email, email, addr, 15 + cluster * 8 + i * 2, rndTotal(40, 220), {
        addressHash: dh(addr),
        groundTruthLabel: 'fraud',
      }));
    }
  }

  // ── Cohort 7: Payment churn (5 customers × 6 orders = 30) ────────────────
  for (let c = 0; c < 5; c++) {
    const email = `churn.payer${c}@icloud.com`;
    const addr = `churn-addr-${c}`;
    PAYMENT_METHODS.forEach((method) => {
      orders.push(makeOrder(nextId(), email, email, addr, 25 + c * 5, rndTotal(50, 300), {
        paymentMethod: method,
        cardFingerprint: dh(`card:${email}:${method}`),
        groundTruthLabel: 'fraud',
      }));
    });
  }

  // ── Legitimate filler to reach ~3 000 ────────────────────────────────────
  const LEGIT_DOMAINS = ['gmail.com', 'yahoo.com', 'outlook.com', 'icloud.com', 'hotmail.com', 'me.com'];
  const LEGIT_NAMES = [
    'james.harris', 'sarah.thompson', 'michael.jones', 'emily.davis', 'robert.wilson',
    'jessica.moore', 'william.taylor', 'ashley.anderson', 'david.thomas', 'amanda.jackson',
    'richard.white', 'stephanie.harris', 'joseph.martin', 'melissa.garcia', 'charles.martinez',
    'nicole.robinson', 'thomas.clark', 'heather.rodriguez', 'christopher.lewis', 'michelle.lee',
    'daniel.walker', 'kimberly.hall', 'matthew.allen', 'amy.young', 'anthony.hernandez',
    'angela.king', 'mark.wright', 'brenda.lopez', 'donald.hill', 'emma.scott',
  ];
  const LEGIT_ADDRS = [
    '10 Acacia Avenue London N1 2PJ', '25 Baker Street London W1U 6TY',
    '3 Castle Road Edinburgh EH1 2NG', '78 Church Lane Bristol BS1 5TP',
    '14 Green Street Cambridge CB2 1RX', '55 High Road Manchester M4 1HQ',
    '6 Mill Lane Oxford OX1 4AB', '31 Park View Leeds LS6 2ES',
    '19 Queen Street Glasgow G1 3EJ', '47 River Road Sheffield S1 2GH',
  ];

  const fraudOrderCount = orders.length;
  const target = 3000;
  for (let i = fraudOrderCount; i < target; i++) {
    const name = LEGIT_NAMES[i % LEGIT_NAMES.length];
    const domain = LEGIT_DOMAINS[i % LEGIT_DOMAINS.length];
    const raw = `${name}${(i % 97) + 1}@${domain}`;
    const addr = LEGIT_ADDRS[i % LEGIT_ADDRS.length];
    orders.push(makeOrder(nextId(), raw, raw, addr + i, Math.floor(Math.random() * 365), rndTotal(10, 400)));
  }

  // Shuffle
  for (let i = orders.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [orders[i], orders[j]] = [orders[j], orders[i]];
  }

  return orders;
}

export async function POST(_request: NextRequest) {
  try {
    const supabase = createClient();
    const serviceClient = createServiceClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: merchant } = await supabase
      .from('merchants')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!merchant) {
      return NextResponse.json({ error: 'Merchant account not found.' }, { status: 403 });
    }

    const merchantData = merchant as unknown as MerchantRow;

    const { count } = await supabase
      .from('processing_jobs')
      .select('id', { count: 'exact', head: true })
      .eq('merchant_id', merchantData.id);

    if ((count ?? 0) > 0) {
      return NextResponse.json({ error: 'Demo is only available for accounts with no prior runs.' }, { status: 409 });
    }

    const orders = generateDemoOrders();
    const scored = scoreOrders(orders as NormalisedOrder[]);

    const flaggedCount = scored.filter((s) => s.flagged).length;

    const predicted = scored.map((s) => s.flagged);
    const actual = scored.map((s) => s.order.groundTruthLabel);
    const _evalMetrics = computeMetrics(predicted, actual);

    // Create processing_jobs record (unified schema)
    const jobId = await createJob(serviceClient, merchantData.id, 'sample_audit_3000_orders.csv');

    const txInserts = scored.map((s) => ({
      job_id: jobId,
      order_id: s.order.orderId,
      customer_email: (s.order as any)._rawEmail ?? null,
      customer_name: s.order.customerNameNorm ?? null,
      shipping_address: (s.order as any)._rawAddress ?? null,
      billing_address: (s.order as any)._rawAddress ?? null,
      order_value: s.order.orderTotal,
      payment_method: s.order.paymentMethod,
      card_last4: (s.order as any)._rawCardLast4 ?? null,
      device_ip: (s.order as any)._rawIP ?? null,
      refund_claimed: s.order.refundStatus !== 'none',
      refund_reason: s.order.refundReason,
      match_score: s.totalScore,
      risk_level: s.riskTier,
      fraud_flags: s.signals.filter((sig) => sig.fired).map((sig) => sig.name) as unknown as Database['public']['Tables']['audit_transactions']['Insert']['fraud_flags'],
    }));

    const BATCH = 500;
    for (let i = 0; i < txInserts.length; i += BATCH) {
      // @ts-ignore
      await serviceClient.from('audit_transactions').insert(txInserts.slice(i, i + BATCH));
    }

    await completeJob(serviceClient, jobId, true, undefined, flaggedCount);
    // Attach eval metrics to the job record for reference
    await serviceClient
      .from('processing_jobs')
      .update({ has_ground_truth: true } as any)
      .eq('id', jobId);

    return NextResponse.json({ runId: jobId, flaggedCount, rowCount: orders.length });
  } catch (err) {
    console.error('[demo] Error:', err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Server error: ${message}` }, { status: 500 });
  }
}
