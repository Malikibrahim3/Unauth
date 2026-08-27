export type RuleEvaluationInput = {
  rule_id: string | null;
  recommendation: string | null;
  evaluated_at: string;
  claim_id?: string | null;
};

export type FlowRunInput = {
  id: string;
  status: string;
  error: string | null;
  started_at: string;
  completed_at: string | null;
};

export type AnalysisItem = {
  key: string;
  label: string;
  value: number;
  detail: string;
  href?: string;
};

export type DailyRunActivity = {
  key: string;
  label: string;
  total: number;
  successful: number;
};

function readable(value: string | null, fallback: string) {
  const next = value?.trim();
  if (!next) return fallback;
  return next.replaceAll('_', ' ').replace(/^./, (letter) => letter.toUpperCase());
}

export function buildRuleEvaluationAnalytics(
  rows: RuleEvaluationInput[],
  ruleNames: Map<string, string>,
) {
  const hits = new Map<string, number>();
  const outcomes = new Map<string, number>();
  let matched = 0;
  for (const row of rows) {
    if (row.rule_id) {
      matched += 1;
      hits.set(row.rule_id, (hits.get(row.rule_id) ?? 0) + 1);
    }
    const outcome = readable(row.recommendation, row.rule_id ? 'Recommendation unavailable' : 'No rule matched');
    outcomes.set(outcome, (outcomes.get(outcome) ?? 0) + 1);
  }
  const ranked = (map: Map<string, number>, labelFor: (key: string) => string, hrefFor?: (key: string) => string) =>
    [...map.entries()]
      .map(([key, value]) => ({ key, label: labelFor(key), value, detail: `${value} evaluation${value === 1 ? '' : 's'}`, href: hrefFor?.(key) }))
      .sort((left, right) => right.value - left.value || left.label.localeCompare(right.label));
  return {
    total: rows.length,
    matched,
    unmatched: rows.length - matched,
    hits: ranked(hits, (key) => ruleNames.get(key) ?? 'Historical rule', (key) => `/controls/rules/${key}`),
    outcomes: ranked(outcomes, (key) => key),
  };
}

export function buildFlowRunAnalytics(rows: FlowRunInput[]) {
  const daily = new Map<string, DailyRunActivity>();
  const durations = new Map([
    ['under-1s', { label: 'Under 1 second', value: 0 }],
    ['1-5s', { label: '1–5 seconds', value: 0 }],
    ['5-30s', { label: '5–30 seconds', value: 0 }],
    ['over-30s', { label: '30 seconds or more', value: 0 }],
  ]);
  const failures = new Map<string, number>();
  let successful = 0;
  for (const row of rows) {
    const started = new Date(row.started_at);
    if (Number.isFinite(started.getTime())) {
      const key = started.toISOString().slice(0, 10);
      const current = daily.get(key) ?? {
        key,
        label: new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(started),
        total: 0,
        successful: 0,
      };
      current.total += 1;
      if (!row.error && ['completed', 'not_matched'].includes(row.status)) current.successful += 1;
      daily.set(key, current);
    }
    const complete = row.completed_at ? new Date(row.completed_at).getTime() : Number.NaN;
    const start = new Date(row.started_at).getTime();
    if (Number.isFinite(complete) && Number.isFinite(start)) {
      const milliseconds = Math.max(0, complete - start);
      const bucket = milliseconds < 1_000 ? 'under-1s' : milliseconds < 5_000 ? '1-5s' : milliseconds < 30_000 ? '5-30s' : 'over-30s';
      durations.get(bucket)!.value += 1;
    }
    if (!row.error && ['completed', 'not_matched'].includes(row.status)) successful += 1;
    if (row.error) {
      const key = row.error.split(':', 1)[0]?.trim() || 'Execution failed';
      failures.set(key, (failures.get(key) ?? 0) + 1);
    }
  }
  return {
    total: rows.length,
    successful,
    successRate: rows.length ? Math.round((successful / rows.length) * 100) : null,
    daily: [...daily.values()].sort((left, right) => left.key.localeCompare(right.key)),
    durations: [...durations.entries()].map(([key, item]) => ({ key, ...item, detail: `${item.value} completed run${item.value === 1 ? '' : 's'}` })),
    failures: [...failures.entries()].map(([key, value]) => ({ key, label: readable(key, 'Execution failed'), value, detail: `${value} failed run${value === 1 ? '' : 's'}` })).sort((left, right) => right.value - left.value),
  };
}

export function buildImportErrorContributions(errors: Array<{ code: string }>) {
  const counts = new Map<string, number>();
  for (const error of errors) counts.set(error.code, (counts.get(error.code) ?? 0) + 1);
  return [...counts.entries()]
    .map(([key, value]) => ({ key, label: readable(key, 'Validation error'), value, detail: `${value} invalid row${value === 1 ? '' : 's'}` }))
    .sort((left, right) => right.value - left.value || left.label.localeCompare(right.label));
}
