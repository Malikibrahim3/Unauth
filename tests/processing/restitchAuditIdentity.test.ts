import { deterministicClusterId, type LinkedCluster, type LinkerOrderInput } from '../../lib/linker';
import { consolidateClusterAssignments } from '../../lib/processing/restitchAuditIdentity';

function cluster(orderIds: string[]): LinkedCluster {
  return {
    cluster_id: deterministicClusterId(orderIds),
    order_ids: orderIds,
    confidence_score: 35,
    signals_matched: ['phone'],
    evidence_summary: [],
  };
}

describe('restitch cluster consolidation', () => {
  it('merges chunk-local seed clusters that share a hard identity anchor', () => {
    const inputs: LinkerOrderInput[] = [
      { order_id: 'A1', phone: '+44 7883 445796', name: 'Alex Ahmed' },
      { order_id: 'A2', phone: '07883 445 796', name: 'A. Ahmed' },
      { order_id: 'B1', phone: '07883445796', name: 'Alexa Ahmed' },
      { order_id: 'B2', phone: '+447883445796', name: 'Alex Ahme' },
    ];

    const consolidated = consolidateClusterAssignments(
      [cluster(['A1', 'A2']), cluster(['B1', 'B2'])],
      new Map(inputs.map((row) => [row.order_id, row])),
    );

    expect(consolidated).toHaveLength(1);
    expect(consolidated[0].order_ids).toEqual(['A1', 'A2', 'B1', 'B2']);
  });

  it('does not merge clusters on email alone without corroboration', () => {
    const inputs: LinkerOrderInput[] = [
      { order_id: 'A1', email: 'shared@example.com', postcode: 'SE1 9SG' },
      { order_id: 'A2', email: 'a2@example.com', postcode: 'SE1 9SG' },
      { order_id: 'B1', email: 'shared@example.com', postcode: 'M1 1AE' },
      { order_id: 'B2', email: 'b2@example.com', postcode: 'M1 1AE' },
    ];

    const consolidated = consolidateClusterAssignments(
      [cluster(['A1', 'A2']), cluster(['B1', 'B2'])],
      new Map(inputs.map((row) => [row.order_id, row])),
    );

    expect(consolidated).toHaveLength(2);
  });
});
