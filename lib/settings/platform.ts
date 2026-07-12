import { z } from 'zod';

export const platformSettingsSchema = z.object({
  reportingCurrency: z.string().regex(/^[A-Z]{3}$/).default('GBP'), timezone: z.string().min(1).max(100).default('Europe/London'), defaultDateRangeDays: z.number().int().min(1).max(366).default(30), retentionDays: z.number().int().min(30).max(3650).default(730),
  matchingPolicy: z.enum(['strict','balanced','review_ambiguous']).default('review_ambiguous'), sourcePriority: z.array(z.string().max(80)).max(30).default([]), costBasis: z.enum(['actual','average','standard']).default('actual'),
  shippingCostAssumptionMinor: z.number().int().min(0).default(0), paymentCostBasisPoints: z.number().int().min(0).max(10000).default(0), replacementCostPercent: z.number().int().min(0).max(100).default(100),
  defaultOwnerRole: z.string().max(100).nullable().default(null), escalationThresholdMinor: z.number().int().min(0).default(50000), defaultDeadlineHours: z.number().int().min(1).max(8760).default(72), approvalLimitMinor: z.number().int().min(0).default(100000),
  highValueThresholdMinor: z.number().int().min(0).default(50000), repeatCaseWindowDays: z.number().int().min(1).max(730).default(120), syncFrequencyMinutes: z.number().int().min(5).max(10080).default(60), connectorWritebackEnabled: z.boolean().default(false), webhookHealthAlerts: z.boolean().default(true),
});
export type PlatformSettings = z.infer<typeof platformSettingsSchema>;
export const DEFAULT_PLATFORM_SETTINGS = platformSettingsSchema.parse({});
export function parsePlatformSettings(value: unknown): PlatformSettings { const root = value && typeof value === 'object' ? value as Record<string, unknown> : {}; return platformSettingsSchema.parse(root.platform ?? {}); }
export function mergePlatformSettings(existing: unknown, patch: PlatformSettings): Record<string, unknown> { const root = existing && typeof existing === 'object' ? existing as Record<string, unknown> : {}; return { ...root, platform: patch }; }
