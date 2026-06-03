/**
 * recommended_action is a legacy DB column — must not carry decisioning text or leak to exports.
 */
import * as fs from 'fs';
import * as path from 'path';
import { scoreIdentityFromSignals } from '@/lib/scorer';

const FORBIDDEN_UI_PHRASES = [
  'recommended action',
  'suggested action',
  'recommended review',
  'before deciding',
  'auto-deny',
  'auto-reject',
  'approve claim',
  'reject claim',
  'deny claim',
];

describe('recommended_action deprecation', () => {
  it('scoreCluster always returns null recommended_action', () => {
    const result = scoreIdentityFromSignals(['email', 'phone', 'card', 'account']);
    expect(result.recommended_action).toBeNull();
    expect(result.identity_confidence_grade).toBe('definite');
  });

  it('scoreIdentityFromSignals always returns null recommended_action', () => {
    const result = scoreIdentityFromSignals(['card', 'phone', 'email']);
    expect(result.recommended_action).toBeNull();
  });

  it('worker does not populate recommendedAction for persistence', () => {
    const content = fs.readFileSync(
      path.join(process.cwd(), 'lib/processing/worker.ts'),
      'utf-8',
    );
    expect(content).toContain('recommendedAction: null');
    expect(content).not.toContain('recommendedActionForPureGrade');
    expect(content).not.toMatch(/recommended_action\s*:/);
  });

  it('audit CSV export uses review_context_summary not recommended_review_reason', () => {
    const content = fs.readFileSync(
      path.join(process.cwd(), 'app/api/audit/[runId]/export/route.ts'),
      'utf-8',
    );
    expect(content).toContain('review_context_summary');
    expect(content).not.toContain('recommended_review_reason');
    expect(content).not.toContain('recommended_action');
  });

  it('merchant-facing UI files do not contain recommended action phrasing', () => {
    const uiRoots = ['app/(app)', 'components'];
    const violations: string[] = [];
    for (const root of uiRoots) {
      const dir = path.join(process.cwd(), root);
      if (!fs.existsSync(dir)) continue;
      const walk = (folder: string) => {
        for (const entry of fs.readdirSync(folder, { withFileTypes: true })) {
          const full = path.join(folder, entry.name);
          if (entry.isDirectory()) walk(full);
          else if (/\.(tsx|ts)$/.test(entry.name) && !full.includes('node_modules')) {
            const text = fs.readFileSync(full, 'utf-8');
            for (const phrase of FORBIDDEN_UI_PHRASES) {
              if (text.toLowerCase().includes(phrase)) {
                violations.push(`${path.relative(process.cwd(), full)}: "${phrase}"`);
              }
            }
          }
        }
      };
      walk(dir);
    }
    expect(violations).toEqual([]);
  });
});
