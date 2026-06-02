/**
 * Design system barrel export.
 * All consumers must import from '@/components/ui' — not from deep paths.
 */

export { Button } from './Button';
export type { ButtonVariant, ButtonSize } from './Button';
export { ButtonLink } from './ButtonLink';
export { Input } from './Input';
export { Select } from './Select';
export { Badge } from './Badge';
export type { BadgeTone, BadgeVariant, BadgeSize } from './Badge';

export { ConfidenceBadge } from './ConfidenceBadge';
export { scoreToGrade } from '@/lib/confidence';
export type { ConfidenceGradeValue } from '@/lib/confidence';
export { PrivacyBadge } from './PrivacyBadge';
export { SensitiveField } from './SensitiveField';

export { SIGNAL_META } from '@/lib/ui/signalBadgeMeta';
export type { SignalType, SignalStrength } from '@/lib/ui/signalBadgeMeta';
export { MetricCard } from './MetricCard';
export { SectionCard } from './SectionCard';
export { PageHeader } from './PageHeader';
export { DataTable } from './DataTable';
export { Drawer } from './Drawer';
export { EmptyState } from './EmptyState';
export { ErrorBoundaryUI } from './LoadingState';
export { Tooltip } from './Tooltip';
export type { TimelineEventItem, TimelineEventType, TimelineEventSeverity } from './timelineTypes';
export { WorkbenchPage } from '@/components/workbench/WorkbenchPage';
export { WorkbenchNav } from '@/components/workbench/WorkbenchNav';
export type { WorkbenchNavItem } from '@/components/workbench/WorkbenchNav';
export { WorkbenchKpiStrip } from '@/components/workbench/WorkbenchKpiStrip';
export type { WorkbenchKpiItem } from '@/components/workbench/WorkbenchKpiStrip';
export { WorkbenchActionBar } from '@/components/workbench/WorkbenchActionBar';
export { WorkbenchEmptyState } from '@/components/workbench/WorkbenchEmptyState';
