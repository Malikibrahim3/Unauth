import {
  scoreCluster,
  scoreAllClusters,
  type ScoreClusterInput,
  type ScorerOrder,
  type LinkedCluster,
  type HistoricalEntity,
} from '../../lib/scorer';

describe('scoreCluster', () => {
  const baseCluster = (overrides: Partial<LinkedCluster>): LinkedCluster => ({
    cluster_id: 'test-cluster',
    order_ids: ['o1', 'o2'],
    confidence_score: 80,
    signals_matched: ['card', 'email'],
    ...overrides,
  });

  const baseOrder = (id: string, overrides: Partial<ScorerOrder> = {}): ScorerOrder => ({
    order_id: id,
    order_date: '2025-01-15',
    order_total: 100,
    customer_email: 'a@example.com',
    ...overrides,
  });

  // ========================================================================
  // 1. HARD CAPS
  // ========================================================================

  describe('IP-only cluster cap', () => {
    it('caps IP-only at WEAK regardless of behavioural score', () => {
      const cluster = baseCluster({
        confidence_score: 30,
        signals_matched: ['ip'],
      });
      const orders = [
        baseOrder('o1', {
          order_date: '2025-01-01',
          refund_status: 'full',
          refund_date: '2025-01-02',
          chargeback_filed: true,
        }),
        baseOrder('o2', {
          order_date: '2025-02-01',
          refund_status: 'full',
          refund_date: '2025-02-03',
          chargeback_filed: true,
        }),
      ];

      const result = scoreCluster({ cluster, orders });
      expect(result.confidence_grade).toBe('WEAK');
      expect(result.review_priority_score).toBeLessThan(35);
    });

    it('does NOT cap when a hard signal is present alongside IP', () => {
      const cluster = baseCluster({
        confidence_score: 65,
        signals_matched: ['ip', 'card'],
      });
      const orders = [baseOrder('o1'), baseOrder('o2')];

      const result = scoreCluster({ cluster, orders });
      expect(result.confidence_grade).toBe('PROBABLE');
    });
  });

  describe('single-order cluster cap', () => {
    it('caps single-order cluster at POSSIBLE maximum', () => {
      const cluster = baseCluster({
        order_ids: ['o1'],
        confidence_score: 133,
        signals_matched: ['card', 'phone', 'account', 'email'],
      });
      const orders = [
        baseOrder('o1', {
          chargeback_filed: true,
          refund_status: 'full',
          refund_date: '2025-01-02',
        }),
      ];

      const result = scoreCluster({ cluster, orders });
      expect(result.confidence_grade).toBe('POSSIBLE');
    });
  });

  // ========================================================================
  // 2. REFUND RATE
  // ========================================================================

  describe('refund rate scoring', () => {
    it('gives +20 for >80% refund rate', () => {
      const cluster = baseCluster({ confidence_score: 50 });
      const orders = [
        baseOrder('o1', { refund_status: 'full', refund_date: '2025-01-16' }),
        baseOrder('o2', { refund_status: 'full', refund_date: '2025-01-16' }),
        baseOrder('o3', { refund_status: 'full', refund_date: '2025-01-16' }),
        baseOrder('o4', { refund_status: 'full', refund_date: '2025-01-16' }),
        baseOrder('o5', { refund_status: 'full', refund_date: '2025-01-16' }),
      ];

      const result = scoreCluster({ cluster, orders });
      const flag = result.behavioural_flags.find((f) => f.flag === 'elevated_refund_rate');
      expect(flag?.points).toBe(20);
    });

    it('gives +0 for <40% refund rate', () => {
      const cluster = baseCluster({ confidence_score: 50 });
      const orders = [
        baseOrder('o1', { refund_status: 'full', refund_date: '2025-01-16' }),
        baseOrder('o2', { refund_status: 'none' }),
        baseOrder('o3', { refund_status: 'none' }),
      ];

      const result = scoreCluster({ cluster, orders });
      const flag = result.behavioural_flags.find((f) => f.flag === 'elevated_refund_rate');
      expect(flag).toBeUndefined();
    });
  });

  // ========================================================================
  // 3. CLAIM VELOCITY
  // ========================================================================

  describe('claim velocity scoring', () => {
    it('gives +15 for average <3 days', () => {
      const cluster = baseCluster({ confidence_score: 50 });
      const orders = [
        baseOrder('o1', { order_date: '2025-01-01', refund_date: '2025-01-02' }),
        baseOrder('o2', { order_date: '2025-01-10', refund_date: '2025-01-12' }),
      ];

      const result = scoreCluster({ cluster, orders });
      const flag = result.behavioural_flags.find((f) => f.flag === 'fast_claim_velocity');
      expect(flag?.points).toBe(15);
    });

    it('gives +8 for average 3-7 days', () => {
      const cluster = baseCluster({ confidence_score: 50 });
      const orders = [
        baseOrder('o1', { order_date: '2025-01-01', refund_date: '2025-01-05' }),
        baseOrder('o2', { order_date: '2025-01-10', refund_date: '2025-01-16' }),
      ];

      const result = scoreCluster({ cluster, orders });
      const flag = result.behavioural_flags.find((f) => f.flag === 'fast_claim_velocity');
      expect(flag?.points).toBe(8);
    });

    it('gives +0 for average >7 days', () => {
      const cluster = baseCluster({ confidence_score: 50 });
      const orders = [
        baseOrder('o1', { order_date: '2025-01-01', refund_date: '2025-01-20' }),
        baseOrder('o2', { order_date: '2025-01-10', refund_date: '2025-01-25' }),
      ];

      const result = scoreCluster({ cluster, orders });
      const flag = result.behavioural_flags.find((f) => f.flag === 'fast_claim_velocity');
      expect(flag).toBeUndefined();
    });
  });

  // ========================================================================
  // 4. DENIAL-THEN-CHARGEBACK
  // ========================================================================

  describe('denial-then-chargeback detection', () => {
    it('detects chargeback with refund not approved', () => {
      const cluster = baseCluster({ confidence_score: 50 });
      const orders = [
        baseOrder('o1', {
          refund_status: 'none',
          refund_requested: false,
          chargeback_filed: true,
        }),
      ];

      const result = scoreCluster({ cluster, orders });
      const flag = result.behavioural_flags.find((f) => f.flag === 'denial_then_chargeback');
      expect(flag?.points).toBe(20);
    });

    it('does NOT fire when full refund was given', () => {
      const cluster = baseCluster({ confidence_score: 50 });
      const orders = [
        baseOrder('o1', {
          refund_status: 'full',
          refund_date: '2025-01-16',
          chargeback_filed: true,
        }),
      ];

      const result = scoreCluster({ cluster, orders });
      const flag = result.behavioural_flags.find((f) => f.flag === 'denial_then_chargeback');
      expect(flag).toBeUndefined();
    });
  });

  // ========================================================================
  // 5. ORDER VALUE ESCALATION
  // ========================================================================

  describe('order value escalation', () => {
    it('fires when last 2 refund claims are top 2 by value', () => {
      const cluster = baseCluster({ confidence_score: 50 });
      const orders = [
        baseOrder('o1', { order_total: 50, order_date: '2025-01-01', refund_status: 'full', refund_date: '2025-01-16' }),
        baseOrder('o2', { order_total: 100, order_date: '2025-02-01', refund_status: 'full', refund_date: '2025-02-16' }),
        baseOrder('o3', { order_total: 200, order_date: '2025-03-01', refund_status: 'full', refund_date: '2025-03-16' }),
        baseOrder('o4', { order_total: 300, order_date: '2025-04-01', refund_status: 'full', refund_date: '2025-04-16' }),
      ];

      const result = scoreCluster({ cluster, orders });
      const flag = result.behavioural_flags.find((f) => f.flag === 'value_escalation');
      expect(flag?.points).toBe(10);
    });

    it('does NOT fire when order values do not escalate', () => {
      const cluster = baseCluster({ confidence_score: 50 });
      const orders = [
        baseOrder('o1', { order_total: 300, order_date: '2025-01-01', refund_status: 'full', refund_date: '2025-01-16' }),
        baseOrder('o2', { order_total: 50, order_date: '2025-02-01', refund_status: 'full', refund_date: '2025-02-16' }),
        baseOrder('o3', { order_total: 500, order_date: '2025-03-01', refund_status: 'none' }), // highest value, not refunded
      ];

      const result = scoreCluster({ cluster, orders });
      const flag = result.behavioural_flags.find((f) => f.flag === 'value_escalation');
      expect(flag).toBeUndefined();
    });
  });

  // ========================================================================
  // 6. REASON ROTATION
  // ========================================================================

  describe('reason rotation', () => {
    it('fires with +8 for 3+ distinct reasons', () => {
      const cluster = baseCluster({ confidence_score: 50 });
      const orders = [
        baseOrder('o1', { refund_status: 'full', refund_reason: 'Never arrived', refund_date: '2025-01-16' }),
        baseOrder('o2', { refund_status: 'full', refund_reason: 'Item damaged', refund_date: '2025-02-16' }),
        baseOrder('o3', { refund_status: 'full', refund_reason: 'Not as described', refund_date: '2025-03-16' }),
      ];

      const result = scoreCluster({ cluster, orders });
      const flag = result.behavioural_flags.find((f) => f.flag === 'reason_rotation');
      expect(flag?.points).toBe(8);
    });

    it('does NOT fire for <3 distinct reasons', () => {
      const cluster = baseCluster({ confidence_score: 50 });
      const orders = [
        baseOrder('o1', { refund_status: 'full', refund_reason: 'Never arrived', refund_date: '2025-01-16' }),
        baseOrder('o2', { refund_status: 'full', refund_reason: 'Never arrived', refund_date: '2025-02-16' }),
      ];

      const result = scoreCluster({ cluster, orders });
      const flag = result.behavioural_flags.find((f) => f.flag === 'reason_rotation');
      expect(flag).toBeUndefined();
    });
  });

  // ========================================================================
  // 7. CHARGEBACK COUNT
  // ========================================================================

  describe('chargeback count', () => {
    it('gives +15 for 2+ chargebacks', () => {
      const cluster = baseCluster({ confidence_score: 50 });
      const orders = [
        baseOrder('o1', { chargeback_filed: true }),
        baseOrder('o2', { chargeback_filed: true }),
        baseOrder('o3', { chargeback_filed: true }),
      ];

      const result = scoreCluster({ cluster, orders });
      const flag = result.behavioural_flags.find((f) => f.flag === 'multiple_chargebacks');
      expect(flag?.points).toBe(15);
    });

    it('gives +5 for exactly 1 chargeback', () => {
      const cluster = baseCluster({ confidence_score: 50 });
      const orders = [
        baseOrder('o1', { chargeback_filed: true }),
        baseOrder('o2', { chargeback_filed: false }),
      ];

      const result = scoreCluster({ cluster, orders });
      const flag = result.behavioural_flags.find((f) => f.flag === 'multiple_chargebacks');
      expect(flag?.points).toBe(5);
    });
  });

  // ========================================================================
  // 8. CE 3.0 ELIGIBILITY
  // ========================================================================

  describe('CE 3.0 eligibility', () => {
    it('eligible when prior order 120+ days before disputed with 2+ matching signals', () => {
      const cluster = baseCluster({ confidence_score: 50 });
      const orders = [
        baseOrder('o1', {
          order_date: '2024-01-01',
          chargeback_filed: false,
          device_id: 'dev-123',
          ip_address: '1.2.3.4',
          customer_email: 'test@example.com',
        }),
        baseOrder('o2', {
          order_date: '2024-06-01',
          chargeback_filed: false,
          device_id: 'dev-123',
          ip_address: '1.2.3.4',
          customer_email: 'test@example.com',
        }),
        baseOrder('o3', {
          order_date: '2025-01-01',
          chargeback_filed: true,
          device_id: 'dev-123',
          ip_address: '1.2.3.4',
          customer_email: 'test@example.com',
        }),
      ];

      const result = scoreCluster({ cluster, orders });
      expect(result.ce3_eligible).toBe(true);
      expect(result.ce3_qualifying_transactions.length).toBeGreaterThanOrEqual(2);
    });

    it('NOT eligible when gap is <120 days', () => {
      const cluster = baseCluster({ confidence_score: 50 });
      const orders = [
        baseOrder('o1', {
          order_date: '2025-01-01',
          chargeback_filed: false,
          device_id: 'dev-123',
          ip_address: '1.2.3.4',
        }),
        baseOrder('o2', {
          order_date: '2025-04-01',
          chargeback_filed: true,
          device_id: 'dev-123',
          ip_address: '1.2.3.4',
        }),
      ];

      const result = scoreCluster({ cluster, orders });
      expect(result.ce3_eligible).toBe(false);
    });

    it('NOT eligible with only 1 matching signal', () => {
      const cluster = baseCluster({ confidence_score: 50 });
      const orders = [
        baseOrder('o1', {
          order_date: '2024-01-01',
          chargeback_filed: false,
          device_id: 'dev-123',
          ip_address: '1.2.3.4',
        }),
        baseOrder('o2', {
          order_date: '2025-01-01',
          chargeback_filed: true,
          device_id: 'dev-456',
          ip_address: '1.2.3.4',
        }),
      ];

      const result = scoreCluster({ cluster, orders });
      expect(result.ce3_eligible).toBe(false);
    });

    it('NOT eligible without any chargeback', () => {
      const cluster = baseCluster({ confidence_score: 50 });
      const orders = [
        baseOrder('o1', { order_date: '2024-01-01', chargeback_filed: false }),
        baseOrder('o2', { order_date: '2025-01-01', chargeback_filed: false }),
      ];

      const result = scoreCluster({ cluster, orders });
      expect(result.ce3_eligible).toBe(false);
    });
  });

  // ========================================================================
  // 9. LANGUAGE RULES
  // ========================================================================

  describe('language rules', () => {
    it('never uses forbidden words in recommended_action', () => {
      const cluster = baseCluster({ confidence_score: 133 });
      const orders = [
        baseOrder('o1', { chargeback_filed: true }),
        baseOrder('o2', { chargeback_filed: true }),
      ];

      const result = scoreCluster({ cluster, orders });
      expect(result.recommended_action.toLowerCase()).not.toContain('fraud');
      expect(result.recommended_action.toLowerCase()).not.toContain('scammer');
      expect(result.recommended_action.toLowerCase()).not.toContain('criminal');
    });
  });

  // ========================================================================
  // 10. GRADE COMPUTATION
  // ========================================================================

  describe('grade computation', () => {
    it('DEFINITE at 85+', () => {
      const cluster = baseCluster({ confidence_score: 85 });
      const result = scoreCluster({ cluster, orders: [baseOrder('o1'), baseOrder('o2')] });
      expect(result.confidence_grade).toBe('DEFINITE');
    });

    it('PROBABLE at 60-84', () => {
      const cluster = baseCluster({ confidence_score: 65 });
      const result = scoreCluster({ cluster, orders: [baseOrder('o1'), baseOrder('o2')] });
      expect(result.confidence_grade).toBe('PROBABLE');
    });

    it('POSSIBLE at 35-59', () => {
      const cluster = baseCluster({ confidence_score: 40 });
      const result = scoreCluster({ cluster, orders: [baseOrder('o1'), baseOrder('o2')] });
      expect(result.confidence_grade).toBe('POSSIBLE');
    });

    it('WEAK below 35', () => {
      const cluster = baseCluster({ confidence_score: 10 });
      const result = scoreCluster({ cluster, orders: [baseOrder('o1'), baseOrder('o2')] });
      expect(result.confidence_grade).toBe('WEAK');
    });
  });

  // ========================================================================
  // 11. BEHAVIOURAL SCORE CAP
  // ========================================================================

  describe('behavioural score cap', () => {
    it('never exceeds 40 behavioural points', () => {
      const cluster = baseCluster({ confidence_score: 50 });
      const orders = [
        baseOrder('o1', {
          order_total: 10,
          order_date: '2025-01-01',
          refund_status: 'full',
          refund_date: '2025-01-02',
          refund_reason: 'A',
          chargeback_filed: true,
        }),
        baseOrder('o2', {
          order_total: 20,
          order_date: '2025-02-01',
          refund_status: 'full',
          refund_date: '2025-02-02',
          refund_reason: 'B',
          chargeback_filed: true,
        }),
        baseOrder('o3', {
          order_total: 30,
          order_date: '2025-03-01',
          refund_status: 'full',
          refund_date: '2025-03-02',
          refund_reason: 'C',
          chargeback_filed: true,
        }),
        baseOrder('o4', {
          order_total: 40,
          order_date: '2025-04-01',
          refund_status: 'full',
          refund_date: '2025-04-02',
          refund_reason: 'D',
          chargeback_filed: true,
        }),
        baseOrder('o5', {
          order_total: 50,
          order_date: '2025-05-01',
          refund_status: 'full',
          refund_date: '2025-05-02',
          refund_reason: 'E',
          chargeback_filed: true,
        }),
      ];

      const result = scoreCluster({ cluster, orders });
      expect(result.behavioural_score).toBeLessThanOrEqual(40);
      expect(result.review_priority_score).toBeLessThanOrEqual(100);
    });
  });

  // ========================================================================
  // 12. SIGNALS SUMMARY
  // ========================================================================

  describe('signals summary', () => {
    it('lists matched signals in plain English', () => {
      const cluster = baseCluster({
        signals_matched: ['card', 'email', 'postcode'],
      });
      const result = scoreCluster({ cluster, orders: [baseOrder('o1'), baseOrder('o2')] });
      expect(result.signals_summary).toContain('same payment card');
      expect(result.signals_summary).toContain('same email address');
      expect(result.signals_summary).toContain('same postcode');
    });
  });

  // ========================================================================
  // 13. scoreAllClusters convenience
  // ========================================================================

  describe('scoreAllClusters', () => {
    it('scores multiple clusters', () => {
      const clusters: LinkedCluster[] = [
        baseCluster({ cluster_id: 'c1', confidence_score: 85, signals_matched: ['card'] }),
        baseCluster({ cluster_id: 'c2', confidence_score: 40, signals_matched: ['email'] }),
      ];
      const ordersById = new Map<string, ScorerOrder>([
        ['o1', baseOrder('o1')],
        ['o2', baseOrder('o2')],
      ]);

      const results = scoreAllClusters(clusters, ordersById);
      expect(results).toHaveLength(2);
      expect(results[0].confidence_grade).toBe('DEFINITE');
      expect(results[1].confidence_grade).toBe('POSSIBLE');
    });
  });

  // ========================================================================
  // 14. Historical entity boost
  // ========================================================================

  describe('historical entity boost', () => {
    it('adds +10 when historical entity has 2+ chargebacks', () => {
      const cluster = baseCluster({ confidence_score: 50 });
      const orders = [baseOrder('o1'), baseOrder('o2')];
      const hist: HistoricalEntity[] = [
        {
          entityType: 'email',
          value: 'a@example.com',
          flagged_count: 5,
          chargeback_count: 3,
          refund_count: 2,
          first_seen: '2023-01-01',
          last_seen: '2024-01-01',
        },
      ];

      const result = scoreCluster({ cluster, orders, historicalEntities: hist });
      const flag = result.behavioural_flags.find((f) => f.flag === 'historical_chargebacks');
      expect(flag?.points).toBe(10);
    });
  });
});
