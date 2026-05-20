/**
 * Design system barrel export.
 * All consumers must import from '@/components/ui' — not from deep paths.
 */

export { Button } from './Button';
export type { ButtonVariant, ButtonSize } from './Button';
export { Input } from './Input';
export { Select } from './Select';
export { FilterChip } from './FilterChip';
export { Field, FieldInput, FieldSelect, FieldTextarea } from './Field';

export { Badge } from './Badge';
export type { BadgeTone, BadgeVariant, BadgeSize } from './Badge';

export { ConfidenceBadge } from './ConfidenceBadge';
export { scoreToGrade } from '@/lib/confidence';
export type { ConfidenceGradeValue } from '@/lib/confidence';

export { RiskScoreBadge, scoreToRiskLevel } from './RiskScoreBadge';
export type { RiskLevel } from './RiskScoreBadge';

export { SignalBadge, SIGNAL_META } from './SignalBadge';
export type { SignalType, SignalStrength } from './SignalBadge';

export { MetricCard } from './MetricCard';
export { SectionCard } from './SectionCard';
export { PageHeader } from './PageHeader';
export { DataTable } from './DataTable';
export { FilterBar } from './FilterBar';
export { Drawer } from './Drawer';
export { Tabs } from './Tabs';
export { EmptyState } from './EmptyState';
export { Skeleton, LoadingState, Spinner, ErrorBoundaryUI } from './LoadingState';
export { Tooltip } from './Tooltip';
export { SparklineChip } from './SparklineChip';
export { KbdHint } from './KbdHint';
export { EvidenceList } from './EvidenceList';
export { LinkedIdentityList } from './LinkedIdentityList';
export { Timeline } from './Timeline';
export type { TimelineEventItem, TimelineEventType, TimelineEventSeverity } from './Timeline';
export { ActionBar } from './ActionBar';
export { RecommendedActionCard } from './RecommendedActionCard';
export type { RecommendedActionKey } from './RecommendedActionCard';
export { WorkbenchPage } from '@/components/workbench/WorkbenchPage';
export { WorkbenchNav } from '@/components/workbench/WorkbenchNav';
export type { WorkbenchNavItem } from '@/components/workbench/WorkbenchNav';
export { WorkbenchKpiStrip } from '@/components/workbench/WorkbenchKpiStrip';
export type { WorkbenchKpiItem } from '@/components/workbench/WorkbenchKpiStrip';
export { WorkbenchPanel } from '@/components/workbench/WorkbenchPanel';
export { WorkbenchActionBar } from '@/components/workbench/WorkbenchActionBar';
export { WorkbenchEmptyState } from '@/components/workbench/WorkbenchEmptyState';
