export type ReadinessRecommendation = {
  headline?: string | null;
  missing_evidence?: string[] | null;
};

export type ReadinessRecommendationAxes = {
  customerAction?: ReadinessRecommendation | null;
  responsibility?: ReadinessRecommendation | null;
  recovery?: ReadinessRecommendation | null;
};

export type ReconciliationReadinessProjection = {
  state: 'loading' | 'unavailable' | 'not_ready' | 'needs_evidence' | 'not_evaluated' | 'ready';
  readiness: string;
  namedGaps: string[];
  nextAction: string;
  stale: boolean;
};

const AXES = ['customerAction', 'responsibility', 'recovery'] as const;

function normalizedGap(value: string): string | null {
  const normalized = value.trim().replace(/\s+/g, ' ');
  return normalized || null;
}

function sortedUniqueGaps(values: Array<string | null | undefined>): string[] {
  const byKey = new Map<string, string>();
  for (const value of values) {
    if (!value) continue;
    const normalized = normalizedGap(value);
    if (!normalized) continue;
    const key = normalized.toLocaleLowerCase('en-GB');
    if (!byKey.has(key)) byKey.set(key, normalized);
  }
  return [...byKey.values()].sort((a, b) =>
    a.toLocaleLowerCase('en-GB').localeCompare(b.toLocaleLowerCase('en-GB'), 'en-GB'),
  );
}

function headline(recommendation: ReadinessRecommendation | null | undefined): string | null {
  const value = recommendation?.headline?.trim();
  return value || null;
}

export function projectReconciliationReadiness(input: {
  facts: unknown[];
  matrix: Array<{ missingEvidence?: string[] | null }>;
  recommendations: ReadinessRecommendationAxes;
  loading: boolean;
  error: boolean;
  hasData: boolean;
  hasStaleData?: boolean;
}): ReconciliationReadinessProjection {
  if (!input.hasData && input.loading) {
    return { state: 'loading', readiness: 'Loading evidence', namedGaps: [], nextAction: 'Loading canonical evidence', stale: false };
  }
  if (!input.hasData && input.error) {
    return { state: 'unavailable', readiness: 'Unavailable — retry', namedGaps: [], nextAction: 'Retry evidence', stale: false };
  }

  const recommendationGaps = AXES.flatMap((axis) =>
    input.recommendations[axis]?.missing_evidence ?? [],
  );
  const matrixGaps = input.matrix.flatMap((row) => row.missingEvidence ?? []);
  const namedGaps = sortedUniqueGaps([
    ...recommendationGaps,
    ...matrixGaps,
    ...(input.facts.length === 0 ? ['Canonical evidence facts'] : []),
  ]);
  const stale = Boolean(input.hasStaleData);

  if (input.facts.length === 0) {
    return {
      state: 'not_ready',
      readiness: 'Not ready — no canonical facts',
      namedGaps,
      nextAction: 'Collect canonical evidence before a merchant decision',
      stale,
    };
  }

  if (namedGaps.length > 0) {
    const recommendationWithGap = AXES.map((axis) => input.recommendations[axis])
      .find((recommendation) => (recommendation?.missing_evidence ?? []).some((gap) => normalizedGap(gap)));
    return {
      state: 'needs_evidence',
      readiness: 'Needs evidence',
      namedGaps,
      nextAction: headline(recommendationWithGap) ?? 'Review named evidence gaps',
      stale,
    };
  }

  const evaluated = AXES.every((axis) => input.recommendations[axis] != null);
  if (!evaluated) {
    return {
      state: 'not_evaluated',
      readiness: 'Not yet evaluated',
      namedGaps: [],
      nextAction: 'Evaluate the canonical evidence before a merchant decision',
      stale,
    };
  }

  return {
    state: 'ready',
    readiness: 'Ready for merchant review',
    namedGaps: [],
    nextAction: AXES.map((axis) => headline(input.recommendations[axis])).find(Boolean)
      ?? 'Review the canonical recommendations',
    stale,
  };
}
