import fixture from '@/docs/unauth/implementation/p00/reference-fixture.normal.json';
import schema from '@/docs/unauth/implementation/p00/reference-fixture.schema.json';

const surfaceIds = ['hero_overview', 'cases_workbench', 'recovery_portfolio', 'reconciliation_command_centre', 'rule_impact_proof'];
const stateIds = ['partial', 'stale', 'unavailable', 'permission', 'error'];

describe('P00 frozen non-computing reference fixture', () => {
  it('is structurally complete for every P01 surface and state', () => {
    expect(schema.$schema).toBe('https://json-schema.org/draft/2020-12/schema');
    expect(fixture.non_computing).toBe(true);
    expect(fixture.synthetic_only).toBe(true);
    expect(fixture.surfaces.map((surface) => surface.surface_id)).toEqual(surfaceIds);
    for (const [index, surface] of fixture.surfaces.entries()) {
      expect(surface.order).toBe(index + 1);
      expect(surface.normal.length).toBeGreaterThan(0);
      expect(surface.alternate_states.map((state) => state.state)).toEqual(stateIds);
      for (const [recordIndex, record] of surface.normal.entries()) {
        expect(record.order).toBe(recordIndex + 1);
        expect(record.display).not.toBe('');
        expect(record.definition_id).not.toBe('');
        expect(record.qualifiers.length).toBeGreaterThan(0);
        expect(record.provenance).not.toBe('');
        expect(record.scope).not.toBe('');
        expect(record.period_or_as_of).not.toBe('');
        expect(record.permission_label).not.toBe('');
      }
    }
  });

  it('locks the P14 normal display strings without computing them', () => {
    const records = fixture.surfaces.flatMap((surface) => surface.normal);
    expect(records.find((record) => record.id === 'overview.exposure')?.display).toBe('£284,620.00');
    expect(records.find((record) => record.id === 'overview.net_loss')?.display).toBe('£46,400.00');
    expect(records.find((record) => record.id === 'case.identity')?.display).toBe('CASE-24017');
    expect(records.find((record) => record.id === 'rule.counts')?.display).toContain('totals 250/250');
    expect(JSON.stringify(fixture)).not.toMatch(/formula|calculate|sum\(|min\(|max\(/i);
  });
});
