import type { LegacyProcessingJobRow } from '@/lib/supabase/legacyV1Types';

// `processing_jobs` was dropped in the v2 cutover; this dashboard type is part of
// the legacy v1 audit surface retained until the cutover. See legacyV1Types.ts.
export type RunRow = LegacyProcessingJobRow;

export type QueueRow = {
  id: string;
  job_id: string;
  order_id: string | null;
  processed_at: string;
  order_value: number | string | null;
  identity_confidence_grade: string | null;
  identity_score: number | null;
  match_status: string | null;
  customer_email: string | null;
  customer_name: string | null;
  signals_matched: string[] | null;
};

export type ActivityItem = { type: string; detail: string; time: string; href?: string };
export type Tone = 'incomplete' | 'stale' | 'normal';

export type DashboardConfig = {
  subtitle: string;
  primaryCta: { label: string; href: string };
  secondaryCta?: { label: string; href: string };
  banner: { tone: Tone; title: string; body: string } | null;
};
