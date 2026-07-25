/**
 * Design system barrel export.
 * All consumers must import from '@/components/ui' — not from deep paths.
 */

export { Button } from './Button';
export type { ButtonVariant, ButtonSize } from './Button';
export { ButtonLink } from './ButtonLink';
export { IconButton } from './IconButton';
export { FilterChip } from './FilterChip';
export type { FilterChipProps } from './FilterChip';
export { SegmentedControl } from './SegmentedControl';
export type { SegmentedControlItem, SegmentedControlProps } from './SegmentedControl';
export { Tabs } from './Tabs';
export type { TabItem } from './Tabs';
export { MetadataChip } from './MetadataChip';
export { Input } from './Input';
export { Select } from './Select';
export { Badge } from './Badge';
export type { BadgeTone, BadgeVariant, BadgeSize } from './Badge';

export { scoreToGrade } from '@/lib/confidence';
export type { ConfidenceGradeValue } from '@/lib/confidence';
export { PrivacyBadge } from './PrivacyBadge';

export { SIGNAL_META } from '@/lib/ui/signalBadgeMeta';
export type { SignalType, SignalStrength } from '@/lib/ui/signalBadgeMeta';
export { Card } from './Card';
export type { CardVariant, CardDensity } from './Card';
export { Modal } from './Modal';
export type { ModalProps } from './Modal';
export { GradeBadge } from './GradeBadge';
export { MetricCard } from './MetricCard';
export { MetricGroup } from './MetricGroup';
export type { MetricGroupItem } from './MetricGroup';
export { Panel } from './Panel';
export type { PanelVariant } from './Panel';
export { EvidenceRow } from './EvidenceRow';
export { SectionCard } from './SectionCard';
export { KeyInsightCallout } from './KeyInsightCallout';
export type { KeyInsightTone } from './KeyInsightCallout';
export { SummaryRail } from './SummaryRail';
export type { SummaryRailRow, SummaryRailSection } from './SummaryRail';
export type { Breadcrumb } from '@/components/authenticated/AuthenticatedPageHeader';
export { AuthenticatedPageHeader } from '@/components/authenticated/AuthenticatedPageHeader';
export { AuthenticatedPanel } from '@/components/authenticated/AuthenticatedPanel';
export { DataTable } from './DataTable';
export { DataTableServer } from './DataTableServer';
export type { DataTableServerProps, ServerDataTableColumn } from './DataTableServer';
export { Drawer } from './Drawer';
export { EmptyState } from './EmptyState';
export { EvidenceChecklist } from './EvidenceChecklist';
export { RecommendationBlock } from './RecommendationBlock';
export { ErrorBoundaryUI } from './LoadingState';
export { LoadingSkeleton } from './LoadingSkeleton';
export type { LoadingSkeletonVariant } from './LoadingSkeleton';
export { Tooltip } from './Tooltip';
export type { TimelineEventItem, TimelineEventType, TimelineEventSeverity } from './timelineTypes';
export { WorkbenchPage } from '@/components/workbench/WorkbenchPage';
export { WorkbenchKpiStrip } from '@/components/workbench/WorkbenchKpiStrip';
export type { WorkbenchKpiItem } from '@/components/workbench/WorkbenchKpiStrip';
export { WorkbenchActionBar } from '@/components/workbench/WorkbenchActionBar';
export { WorkbenchEmptyState } from '@/components/workbench/WorkbenchEmptyState';
export { SettingsPageShell } from '@/components/settings/SettingsPageShell';
export { StatusBadge, PriorityChip, STATUS_TONES, statusTone } from './StatusBadge';
export type { StatusTone } from './StatusBadge';
export { uiTokens } from './tokens';
export type { StepBadgeVariant } from './tokens';

/*
 * `components/ui/LandingPrimitives.tsx` is public/marketing only and is
 * deliberately NOT re-exported here. Product surfaces use `Panel` for
 * structural surfaces and `EvidenceRow` for evidence/checklist rows. Public
 * pages import the landing family from its own module.
 */
