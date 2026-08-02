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
export { Disclosure } from './Disclosure';
export {
  FormField,
  Textarea,
  Checkbox,
  Switch,
  RadioGroup,
} from './FormField';
export { Badge } from './Badge';
export type { BadgeTone, BadgeVariant, BadgeSize } from './Badge';

export { scoreToGrade } from '@/lib/confidence';
export type { ConfidenceGradeValue } from '@/lib/confidence';
export { PrivacyBadge } from './PrivacyBadge';

export { SIGNAL_META } from '@/lib/ui/signalBadgeMeta';
export type { SignalType, SignalStrength } from '@/lib/ui/signalBadgeMeta';
export { Surface } from './Surface';
export type { SurfaceStructure, SurfacePad } from './Surface';
export { PageFrame } from './PageFrame';
export type { PageFrameProps } from './PageFrame';
export { RegistrySurface } from './RegistrySurface';
export type { RegistrySurfaceProps } from './RegistrySurface';
export { Pagination } from './Pagination';
export type { PaginationProps } from './Pagination';
export { BoardSurface, BoardColumn } from './BoardSurface';
export { EvidenceThread } from './EvidenceThread';
export type {
  EvidenceAuthority,
  EvidenceThreadItem,
  EvidenceThreadState,
} from './EvidenceThread';
export { FinancialEquation } from './FinancialEquation';
export type { FinancialEquationItem } from './FinancialEquation';
export { SourceBeacon } from './SourceBeacon';
export type { SourceBeaconState } from './SourceBeacon';
export { OverlayPortal } from './OverlayPortal';
export {
  BuilderShell,
  BuilderValidationSummary,
  BuilderSequence,
  BuilderStep,
} from './BuilderShell';
export type {
  BuilderShellProps,
  BuilderValidationTone,
  BuilderValidationSummaryProps,
  BuilderSequenceProps,
  BuilderStepProps,
} from './BuilderShell';
export { Card } from './Card';
export type { CardVariant, CardDensity } from './Card';
export { Modal } from './Modal';
export type { ModalProps } from './Modal';
export { MetricCard } from './MetricCard';
export { MetricGroup } from './MetricGroup';
export type { MetricGroupItem, MetricGroupProps } from './MetricGroup';
export { LeadSummary } from './LeadSummary';
export type { LeadSummaryItem, LeadSummaryProps } from './LeadSummary';
export { Panel } from './Panel';
export type { PanelVariant } from './Panel';
export { EvidenceRow } from './EvidenceRow';
export { SectionCard } from './SectionCard';
export { JoinedSection } from './JoinedSection';
export { InsetGroup } from './InsetGroup';
export { KeyInsightCallout } from './KeyInsightCallout';
export type { KeyInsightTone } from './KeyInsightCallout';
export { SummaryRail } from './SummaryRail';
export type { SummaryRailRow, SummaryRailSection } from './SummaryRail';
export type { Breadcrumb } from '@/components/authenticated/AuthenticatedPageHeader';
export { AuthenticatedPageHeader } from '@/components/authenticated/AuthenticatedPageHeader';
export { AuthenticatedPanel } from '@/components/authenticated/AuthenticatedPanel';
export { DecisionHeader } from '@/components/authenticated/DecisionHeader';
export { DecisionSentence } from '@/components/authenticated/DecisionSentence';
export { ScopeStrip } from '@/components/authenticated/ScopeStrip';
export { LedgerBridge } from '@/components/authenticated/LedgerBridge';
export type { LedgerBridgeItem } from '@/components/authenticated/LedgerBridge';
export { SourceTraceRow } from '@/components/authenticated/SourceTraceRow';
export { RecordedOutcome } from '@/components/authenticated/RecordedOutcome';
export { ActionDock } from '@/components/authenticated/ActionDock';
export { DataTable } from './DataTable';
export type { DataTableColumn } from './DataTable';
export { DataTableServer } from './DataTableServer';
export type { DataTableServerProps, ServerDataTableColumn } from './DataTableServer';
export { Drawer } from './Drawer';
export { EmptyState } from './EmptyState';
export { OperationalState } from './OperationalState';
export type { OperationalStateKind, OperationalStateProps } from './OperationalState';
export { EvidenceChecklist } from './EvidenceChecklist';
export { RecommendationBlock } from './RecommendationBlock';
export { ErrorBoundaryUI } from './LoadingState';
export { LoadingSkeleton, Bone } from './LoadingSkeleton';
export type { LoadingSkeletonVariant } from './LoadingSkeleton';
export { Spinner } from './Spinner';
export type { SpinnerSize } from './Spinner';
export { Recency } from './Recency';
export { LivenessIndicator } from './LivenessIndicator';
export { Tooltip } from './Tooltip';
export { ToastProvider, useToast } from './Toast';
export type { ToastTone } from './Toast';
export { RowActionsMenu } from './RowActionsMenu';
export type { RowAction } from './RowActionsMenu';
export type { TimelineEventItem, TimelineEventType, TimelineEventSeverity } from './timelineTypes';
export { WorkbenchPage } from '@/components/workbench/WorkbenchPage';
export { WorkbenchKpiStrip } from '@/components/workbench/WorkbenchKpiStrip';
export type { WorkbenchKpiItem } from '@/components/workbench/WorkbenchKpiStrip';
export { WorkbenchActionBar } from '@/components/workbench/WorkbenchActionBar';
export { WorkbenchEmptyState } from '@/components/workbench/WorkbenchEmptyState';
export { SettingsPageShell } from '@/components/settings/SettingsPageShell';
export { SettingsNav, isSettingsNavItemActive } from '@/components/settings/SettingsNav';
export type { SettingsNavItem, SettingsNavGroup, SettingsNavProps } from '@/components/settings/SettingsNav';
export { DetailPageShell } from '@/components/workbench/DetailPageShell';
export type { DetailMetaItem, DetailRecordNav } from '@/components/workbench/DetailPageShell';
export { StatusBadge, PriorityChip, STATUS_TONES, statusTone } from './StatusBadge';
export type { StatusTone } from './StatusBadge';
export { StatusWithReason } from './StatusWithReason';
export { uiTokens } from './tokens';
export type { StepBadgeVariant } from './tokens';

/*
 * `components/ui/LandingPrimitives.tsx` is public/marketing only and is
 * deliberately NOT re-exported here. Product surfaces use `Panel` for
 * structural surfaces and `EvidenceRow` for evidence/checklist rows. Public
 * pages import the landing family from its own module.
 */
