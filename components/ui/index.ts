/**
 * Design system barrel export.
 * All consumers must import from '@/components/ui' — not from deep paths.
 */

export { Button } from './Button';
export type { ButtonVariant, ButtonSize } from './Button';

export { Badge } from './Badge';
export type { BadgeTone, BadgeVariant, BadgeSize } from './Badge';

export { ConfidenceBadge, scoreToGrade, riskLevelToNewGrade } from './ConfidenceBadge';
export type { ConfidenceGradeValue } from './ConfidenceBadge';

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
export { Skeleton, LoadingState, Spinner } from './LoadingState';
export { Tooltip } from './Tooltip';
export { EvidenceList } from './EvidenceList';
export { LinkedIdentityList } from './LinkedIdentityList';
export { Timeline } from './Timeline';
export type { TimelineEventItem, TimelineEventType, TimelineEventSeverity } from './Timeline';
export { ActionBar } from './ActionBar';
export { RecommendedActionCard } from './RecommendedActionCard';
export type { RecommendedActionKey } from './RecommendedActionCard';
