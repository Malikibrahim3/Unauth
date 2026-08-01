# APPX — Whole-product visual coverage ledger

- **Status:** Complete inventory baseline
- **Date:** 31 July 2026
- **Parent plan:** [`IMPL_whole_product_visual_reconstruction.md`](IMPL_whole_product_visual_reconstruction.md)
- **Coverage check:** `node scripts/visual-rebuild/check-coverage-ledger.mjs`

This is the auditable checklist for the whole-product visual reconstruction.
The parent plan defines what each phase must achieve; this appendix proves that
every independently visible page, route boundary, shell, named view/overlay,
stateful subview owner, and embedded surface has an owning phase.

An unchecked box means the surface is planned but not yet visually completed.
It becomes checked only when the owning phase has implemented and verified the
surface in every applicable state, theme, and required viewport.

## Coverage definition

The inventory unit is a module that independently owns one of:

- a browser route;
- a layout or route boundary;
- a full host-constrained screen;
- a named modal, dialog, drawer, menu, panel, toast, tooltip, skeleton, empty,
  loading, or error view; or
- a stateful route-level composition with materially different internal views.

Leaf components are rebuilt through their canonical primitive and owning view.
They are not misrepresented as separate “pages,” but they remain subject to
`VR-01`, the consuming phase, the detector, and the final source cleanup.

Current baseline:

- **65 page modules**: 64 registered manifest entries plus the development
  case-detail prototype lab;
- **7 layout modules**;
- **95 route-state boundary modules**;
- **53 named nested view/overlay modules**;
- **21 additional stateful view owners**; and
- **4 non-route embedded rendering surfaces**.

The categories overlap in a small number of shared owners. The checker
de-duplicates paths and fails when a required file is absent from this ledger,
when an entry points to a deleted file, or when its phase is invalid.

---

## A. Page modules

- [x] `app/(app)/claims/[id]/page.tsx` — `VR-03`
- [x] `app/(app)/claims/page.tsx` — `VR-03`
- [x] `app/(app)/customers/[id]/claims/page.tsx` — `VR-04`
- [x] `app/(app)/customers/[id]/evidence/new/page.tsx` — `VR-04`
- [x] `app/(app)/customers/[id]/page.tsx` — `VR-04`
- [x] `app/(app)/customers/page.tsx` — `VR-04`
- [x] `app/(app)/dashboard/page.tsx` — `VR-03`
- [x] `app/(app)/dev/design-system/page.tsx` — `VR-01`
- [x] `app/(app)/disputes/[id]/page.tsx` — `VR-05`
- [x] `app/(app)/exceptions/page.tsx` — `VR-03`
- [x] `app/(app)/flows/[id]/page.tsx` — `VR-06`
- [x] `app/(app)/flows/page.tsx` — `VR-06`
- [x] `app/(app)/flows/runs/[id]/page.tsx` — `VR-06`
- [x] `app/(app)/flows/runs/page.tsx` — `VR-06`
- [x] `app/(app)/help/page.tsx` — `VR-09`
- [x] `app/(app)/integrations/[provider]/page.tsx` — `VR-08`
- [x] `app/(app)/integrations/dev-preview/page.tsx` — `VR-01`
- [x] `app/(app)/integrations/imports/page.tsx` — `VR-08`
- [x] `app/(app)/integrations/page.tsx` — `VR-08`
- [x] `app/(app)/integrations/shipbob/select/page.tsx` — `VR-08`
- [x] `app/(app)/losses/[id]/page.tsx` — `VR-04`
- [x] `app/(app)/losses/page.tsx` — `VR-04`
- [x] `app/(app)/notifications/page.tsx` — `VR-09`
- [x] `app/(app)/orders/[id]/page.tsx` — `VR-05`
- [x] `app/(app)/recoveries/[id]/page.tsx` — `VR-04`
- [x] `app/(app)/recoveries/page.tsx` — `VR-04`
- [x] `app/(app)/refunds/[id]/page.tsx` — `VR-05`
- [x] `app/(app)/reports/page.tsx` — `VR-07`
- [x] `app/(app)/reports/records/page.tsx` — `VR-07`
- [x] `app/(app)/returns/[id]/page.tsx` — `VR-05`
- [x] `app/(app)/rules/[id]/page.tsx` — `VR-06`
- [x] `app/(app)/rules/page.tsx` — `VR-06`
- [x] `app/(app)/rules/recovery/page.tsx` — `VR-06`
- [x] `app/(app)/settings/account/page.tsx` — `VR-08`
- [x] `app/(app)/settings/agreements/page.tsx` — `VR-08`
- [x] `app/(app)/settings/api-integrations/page.tsx` — `VR-08`
- [x] `app/(app)/settings/audit-trail/page.tsx` — `VR-08`
- [x] `app/(app)/settings/billing/page.tsx` — `VR-08`
- [x] `app/(app)/settings/data-privacy/page.tsx` — `VR-08`
- [x] `app/(app)/settings/integrations/chrome/page.tsx` — `VR-08`
- [x] `app/(app)/settings/integrations/freshdesk/page.tsx` — `VR-08`
- [x] `app/(app)/settings/integrations/gorgias/page.tsx` — `VR-08`
- [x] `app/(app)/settings/integrations/shopify/page.tsx` — `VR-08`
- [x] `app/(app)/settings/integrations/zendesk/page.tsx` — `VR-08`
- [x] `app/(app)/settings/notifications/page.tsx` — `VR-08`
- [x] `app/(app)/settings/page.tsx` — `VR-08`
- [x] `app/(app)/settings/platform/page.tsx` — `VR-08`
- [x] `app/(app)/settings/team/page.tsx` — `VR-08`
- [x] `app/(app)/shipments/[id]/page.tsx` — `VR-05`
- [x] `app/(app)/tickets/[id]/page.tsx` — `VR-05`
- [x] `app/(app)/work/page.tsx` — `VR-03`
- [x] `app/(auth)/login/page.tsx` — `VR-10`
- [x] `app/(auth)/reset/page.tsx` — `VR-10`
- [x] `app/(auth)/reset/update/page.tsx` — `VR-10`
- [x] `app/(public)/demo/page.tsx` — `VR-11`
- [x] `app/(public)/landing/page.tsx` — `VR-11`
- [x] `app/(public)/landing/prototypes/unauth-case-detail/page.tsx` — `VR-01`
- [x] `app/(public)/legal/data-handling/page.tsx` — `VR-11`
- [x] `app/(public)/legal/dpa/page.tsx` — `VR-11`
- [x] `app/(public)/legal/pilot-terms/page.tsx` — `VR-11`
- [x] `app/(public)/legal/privacy/page.tsx` — `VR-11`
- [x] `app/(public)/pricing/page.tsx` — `VR-11`
- [x] `app/(public)/signup/page.tsx` — `VR-10`
- [x] `app/onboarding/page.tsx` — `VR-10`
- [x] `app/page.tsx` — `VR-11`

---

## B. Layout modules

- [x] `app/(app)/layout.tsx` — `VR-02`
- [x] `app/(app)/settings/layout.tsx` — `VR-08`
- [x] `app/(auth)/layout.tsx` — `VR-10`
- [x] `app/(internal)/layout.tsx` — `VR-02`
- [x] `app/(public)/layout.tsx` — `VR-11`
- [x] `app/layout.tsx` — `VR-02`
- [x] `app/onboarding/layout.tsx` — `VR-10`

The internal layout is currently a visual pass-through. It remains listed so a
future visible internal route cannot inherit an unowned shell.

---

## C. Route-state boundary modules

- [x] `app/(app)/claims/[id]/error.tsx` — `VR-03`
- [x] `app/(app)/claims/[id]/loading.tsx` — `VR-03`
- [x] `app/(app)/claims/error.tsx` — `VR-03`
- [x] `app/(app)/claims/loading.tsx` — `VR-03`
- [x] `app/(app)/customers/[id]/error.tsx` — `VR-04`
- [x] `app/(app)/customers/[id]/evidence/new/error.tsx` — `VR-04`
- [x] `app/(app)/customers/[id]/evidence/new/loading.tsx` — `VR-04`
- [x] `app/(app)/customers/[id]/loading.tsx` — `VR-04`
- [x] `app/(app)/customers/error.tsx` — `VR-04`
- [x] `app/(app)/customers/loading.tsx` — `VR-04`
- [x] `app/(app)/dashboard/error.tsx` — `VR-03`
- [x] `app/(app)/dashboard/loading.tsx` — `VR-03`
- [x] `app/(app)/disputes/[id]/error.tsx` — `VR-05`
- [x] `app/(app)/disputes/[id]/loading.tsx` — `VR-05`
- [x] `app/(app)/disputes/[id]/not-found.tsx` — `VR-05`
- [x] `app/(app)/flows/[id]/error.tsx` — `VR-06`
- [x] `app/(app)/flows/[id]/loading.tsx` — `VR-06`
- [x] `app/(app)/flows/error.tsx` — `VR-06`
- [x] `app/(app)/flows/loading.tsx` — `VR-06`
- [x] `app/(app)/flows/runs/[id]/error.tsx` — `VR-06`
- [x] `app/(app)/flows/runs/[id]/loading.tsx` — `VR-06`
- [x] `app/(app)/flows/runs/error.tsx` — `VR-06`
- [x] `app/(app)/flows/runs/loading.tsx` — `VR-06`
- [x] `app/(app)/help/error.tsx` — `VR-09`
- [x] `app/(app)/integrations/[provider]/error.tsx` — `VR-08`
- [x] `app/(app)/integrations/[provider]/loading.tsx` — `VR-08`
- [x] `app/(app)/integrations/error.tsx` — `VR-08`
- [x] `app/(app)/integrations/imports/error.tsx` — `VR-08`
- [x] `app/(app)/integrations/imports/loading.tsx` — `VR-08`
- [x] `app/(app)/integrations/loading.tsx` — `VR-08`
- [x] `app/(app)/integrations/shipbob/select/error.tsx` — `VR-08`
- [x] `app/(app)/integrations/shipbob/select/loading.tsx` — `VR-08`
- [x] `app/(app)/loading.tsx` — `VR-13`
- [x] `app/(app)/losses/[id]/error.tsx` — `VR-04`
- [x] `app/(app)/losses/[id]/loading.tsx` — `VR-04`
- [x] `app/(app)/losses/[id]/not-found.tsx` — `VR-04`
- [x] `app/(app)/losses/error.tsx` — `VR-04`
- [x] `app/(app)/losses/loading.tsx` — `VR-04`
- [x] `app/(app)/not-found.tsx` — `VR-13`
- [x] `app/(app)/notifications/error.tsx` — `VR-09`
- [x] `app/(app)/notifications/loading.tsx` — `VR-09`
- [x] `app/(app)/orders/[id]/error.tsx` — `VR-05`
- [x] `app/(app)/orders/[id]/loading.tsx` — `VR-05`
- [x] `app/(app)/recoveries/[id]/error.tsx` — `VR-04`
- [x] `app/(app)/recoveries/[id]/loading.tsx` — `VR-04`
- [x] `app/(app)/recoveries/error.tsx` — `VR-04`
- [x] `app/(app)/recoveries/loading.tsx` — `VR-04`
- [x] `app/(app)/refunds/[id]/error.tsx` — `VR-05`
- [x] `app/(app)/refunds/[id]/loading.tsx` — `VR-05`
- [x] `app/(app)/reports/error.tsx` — `VR-07`
- [x] `app/(app)/reports/loading.tsx` — `VR-07`
- [x] `app/(app)/reports/records/error.tsx` — `VR-07`
- [x] `app/(app)/reports/records/loading.tsx` — `VR-07`
- [x] `app/(app)/returns/[id]/error.tsx` — `VR-05`
- [x] `app/(app)/returns/[id]/loading.tsx` — `VR-05`
- [x] `app/(app)/rules/[id]/error.tsx` — `VR-06`
- [x] `app/(app)/rules/[id]/loading.tsx` — `VR-06`
- [x] `app/(app)/rules/error.tsx` — `VR-06`
- [x] `app/(app)/rules/loading.tsx` — `VR-06`
- [x] `app/(app)/rules/recovery/error.tsx` — `VR-06`
- [x] `app/(app)/rules/recovery/loading.tsx` — `VR-06`
- [x] `app/(app)/settings/account/error.tsx` — `VR-08`
- [x] `app/(app)/settings/account/loading.tsx` — `VR-08`
- [x] `app/(app)/settings/agreements/error.tsx` — `VR-08`
- [x] `app/(app)/settings/agreements/loading.tsx` — `VR-08`
- [x] `app/(app)/settings/api-integrations/error.tsx` — `VR-08`
- [x] `app/(app)/settings/api-integrations/loading.tsx` — `VR-08`
- [x] `app/(app)/settings/audit-trail/error.tsx` — `VR-08`
- [x] `app/(app)/settings/audit-trail/loading.tsx` — `VR-08`
- [x] `app/(app)/settings/billing/error.tsx` — `VR-08`
- [x] `app/(app)/settings/billing/loading.tsx` — `VR-08`
- [x] `app/(app)/settings/data-privacy/error.tsx` — `VR-08`
- [x] `app/(app)/settings/data-privacy/loading.tsx` — `VR-08`
- [x] `app/(app)/settings/error.tsx` — `VR-08`
- [x] `app/(app)/settings/integrations/error.tsx` — `VR-08`
- [x] `app/(app)/settings/integrations/loading.tsx` — `VR-08`
- [x] `app/(app)/settings/loading.tsx` — `VR-08`
- [x] `app/(app)/settings/notifications/error.tsx` — `VR-08`
- [x] `app/(app)/settings/notifications/loading.tsx` — `VR-08`
- [x] `app/(app)/settings/platform/error.tsx` — `VR-08`
- [x] `app/(app)/settings/platform/loading.tsx` — `VR-08`
- [x] `app/(app)/settings/team/error.tsx` — `VR-08`
- [x] `app/(app)/settings/team/loading.tsx` — `VR-08`
- [x] `app/(app)/shipments/[id]/error.tsx` — `VR-05`
- [x] `app/(app)/shipments/[id]/loading.tsx` — `VR-05`
- [x] `app/(app)/tickets/[id]/error.tsx` — `VR-05`
- [x] `app/(app)/tickets/[id]/loading.tsx` — `VR-05`
- [x] `app/(app)/tickets/[id]/not-found.tsx` — `VR-05`
- [x] `app/(app)/work/error.tsx` — `VR-03`
- [x] `app/(app)/work/loading.tsx` — `VR-03`
- [x] `app/(public)/legal/not-found.tsx` — `VR-11`
- [x] `app/global-error.tsx` — `VR-02`
- [x] `app/not-found.tsx` — `VR-02`
- [x] `app/onboarding/error.tsx` — `VR-10`
- [x] `app/onboarding/loading.tsx` — `VR-10`

---

## D. Named nested views and overlays

- [x] `app/(app)/claims/ClaimsPageView.tsx` — `VR-03`
- [x] `app/(app)/customers/CustomersOverviewPageView.tsx` — `VR-04`
- [x] `app/(app)/customers/[id]/CustomerProfilePageView.tsx` — `VR-04`
- [x] `components/authenticated/AuthenticatedPanel.tsx` — `VR-01`
- [x] `components/cases/CaseContextDrawer.tsx` — `VR-03`
- [x] `components/charts/authenticated/core/ChartTooltip.tsx` — `VR-01`
- [x] `components/claims/ClaimReviewPanel.tsx` — `VR-03`
- [x] `components/claims/ClaimReviewToast.tsx` — `VR-03`
- [x] `components/claims/investigations/InvestigationRequestDialog.tsx` — `VR-03`
- [x] `components/claims/investigations/InvestigationResponseDialog.tsx` — `VR-03`
- [x] `components/claims/payout/GateRecommendationPanel.tsx` — `VR-03`
- [x] `components/claims/payout/IntegrationEvidenceSourcePanel.tsx` — `VR-03`
- [x] `components/customers/CustomerPreviewDrawer.tsx` — `VR-04`
- [x] `components/integrations/ConnectionHealthPanel.tsx` — `VR-08`
- [x] `components/layout/AvatarMenu.tsx` — `VR-02`
- [x] `components/navigation/skeletons/AuthenticatedChartSkeleton.tsx` — `VR-01`
- [x] `components/navigation/skeletons/WorkbenchPageSkeleton.tsx` — `VR-01`
- [x] `components/navigation/skeletons/pageSkeletons.tsx` — `VR-01`
- [x] `components/relationships/CommerceObjectRouteSkeleton.tsx` — `VR-05`
- [x] `components/relationships/RelatedRecordsPanel.tsx` — `VR-05`
- [x] `components/relationships/SupportObjectRouteSkeleton.tsx` — `VR-05`
- [x] `components/reporting/IntelligenceReportView.tsx` — `VR-07`
- [x] `components/reports/ExportMenu.tsx` — `VR-07`
- [x] `components/rules/RuleBuilderDrawer.tsx` — `VR-06`
- [x] `components/settings/ApiIntegrationsKeyDialogs.tsx` — `VR-08`
- [x] `components/settings/ApiKeyCreateDialog.tsx` — `VR-08`
- [x] `components/settings/ApiKeyRevokeDialog.tsx` — `VR-08`
- [x] `components/settings/FreshdeskWebhookSetupPanel.tsx` — `VR-08`
- [x] `components/settings/GorgiasWebhookSetupPanel.tsx` — `VR-08`
- [x] `components/settings/TeamInviteDialog.tsx` — `VR-08`
- [x] `components/shopify/SyncStatusConnectModal.tsx` — `VR-08`
- [x] `components/shopify/SyncStatusConnectedView.tsx` — `VR-08`
- [x] `components/shopify/SyncStatusDisconnectedView.tsx` — `VR-08`
- [x] `components/states/OperationalRouteError.tsx` — `VR-01`
- [x] `components/states/OperationalRouteSkeleton.tsx` — `VR-01`
- [x] `components/ui/Drawer.tsx` — `VR-01`
- [x] `components/ui/EmptyState.tsx` — `VR-01`
- [x] `components/ui/LoadingSkeleton.tsx` — `VR-01`
- [x] `components/ui/LoadingState.tsx` — `VR-01`
- [x] `components/ui/Modal.tsx` — `VR-01`
- [x] `components/ui/Panel.tsx` — `VR-01`
- [x] `components/ui/RowActionsMenu.tsx` — `VR-01`
- [x] `components/ui/Toast.tsx` — `VR-01`
- [x] `components/ui/Tooltip.tsx` — `VR-01`
- [x] `components/work/ExceptionResolutionDrawer.tsx` — `VR-03`
- [x] `components/workbench/WorkbenchEmptyState.tsx` — `VR-01`
- [x] `extensions/chrome/popup/PopupBootstrapLoading.tsx` — `VR-12`
- [x] `extensions/chrome/popup/PopupErrorScreen.tsx` — `VR-12`
- [x] `extensions/chrome/popup/PopupLookupLoadingScreen.tsx` — `VR-12`
- [x] `extensions/chrome/popup/PopupLookupScreen.tsx` — `VR-12`
- [x] `extensions/chrome/popup/PopupResultsScreen.tsx` — `VR-12`
- [x] `extensions/chrome/popup/PopupSettingsScreen.tsx` — `VR-12`
- [x] `extensions/chrome/popup/PopupSetupScreen.tsx` — `VR-12`

---

## E. Stateful view owners and internal variants

These modules own materially different in-page views, steps, modes, tabs, or
conditional compositions that are not separate route files. Their phase cannot
be completed by styling only the default branch.

- [x] `app/(app)/claims/ClaimsQueueClient.tsx` — `VR-03` — list, split preview, selection, bulk, empty, loading
- [x] `app/(app)/customers/CustomersPageWorkbench.tsx` — `VR-04` — registry, preview, filter and selection
- [x] `app/(app)/dev/design-system/DesignSystemGalleryClient.tsx` — `VR-01` — component, modal, drawer, theme and state laboratory
- [x] `app/(app)/integrations/shipbob/select/ShipBobAccountSelectionClient.tsx` — `VR-08` — selection, pending, error and completion
- [x] `app/(app)/recoveries/RecoveryBoardClient.tsx` — `VR-04` — stages, filtered board, item detail and empty columns
- [x] `components/OnboardingClient.tsx` — `VR-10` — profile, commerce, helpdesk, completion and failure steps
- [x] `components/dashboard/DashboardOverview.tsx` — `VR-03` — metric, range, comparison, currency, trust and report views
- [x] `components/demo/OperationalCaseDemo.tsx` — `VR-11` — incoming, evidence, recommendation, decision and recovery steps
- [x] `components/integrations/IntegrationsWorkspace.tsx` — `VR-08` — connected, browse, import and empty views
- [x] `components/losses/LossLedger.tsx` — `VR-04` — all, confirmed, estimated, recoverable, prevented and written-off views
- [x] `components/rules/FlowVersionWorkbench.tsx` — `VR-06` — draft, published, test, history and rollback states
- [x] `components/rules/FlowsIndexClient.tsx` — `VR-06` — registry filters, row actions and zero state
- [x] `components/rules/RecoveryRulebookClient.tsx` — `VR-06` — partner/rule views and edit dialogs
- [x] `components/rules/RuleVersionWorkbench.tsx` — `VR-06` — draft, simulation, version and publication states
- [x] `components/rules/RulesIndexClient.tsx` — `VR-06` — registry filters, ordering and zero state
- [x] `components/shopify/SyncStatusCard.tsx` — `VR-08` — disconnected, connecting, connected, degraded and modal states
- [x] `components/work/WorkQueue.tsx` — `VR-03` — built-in, saved, shared, exception and bulk-action views
- [x] `components/claims/investigations/CaseInvestigationsCard.tsx` — `VR-03` — draft, sent, waiting, response, close and cancel views
- [x] `components/claims/payout/ResponsibilityAssessmentCard.tsx` — `VR-03` — advisory, confirmed, corrected and dialog views
- [x] `components/layout/CommandPalette.tsx` — `VR-02` — recent, searching, grouped results, empty and error views
- [x] `extensions/chrome/popup/PopupApp.tsx` — `VR-12` — bootstrap, setup, lookup, loading, results, settings and error routing

---

## F. Non-route embedded rendering surfaces

- [x] `extensions/unauth-checkout/src/index.jsx` — `VR-12` — visible checkout-extension states
- [x] `extensions/zendesk/assets/iframe.html` — `VR-12` — host frame and loading/failure presentation
- [x] `lib/gorgias/renderWidgetHtml.ts` — `VR-12` — widget loaded, no-match, partial, locked, disconnected and error HTML
- [x] `lib/gorgias/renderWidgetUnlockHtml.ts` — `VR-12` — unlock pending, success, invalid and failure HTML

---

## G. Completion and maintenance rule

1. Run the coverage checker before `VR-00` starts.
2. When a new page, layout, route boundary, named view, overlay, screen, or
   embedded surface appears during the programme, the checker must fail until
   this ledger assigns it a phase.
3. A phase checks only its own boxes after implementation, direct tests, and
   visual verification pass.
4. Renaming or deleting a surface requires updating both its consumer and this
   ledger; an orphaned checkbox is a failure.
5. `VR-13` verifies all unchecked state/responsive concerns.
6. `VR-14` requires every applicable box checked and a final checker pass.
7. A checked page with an unchecked applicable boundary, overlay, or internal
   view does not count as complete.

---

## H. Instrument Grade discovered visual owners

These independently visible owners were discovered after the original curated
inventory passed. They are mandatory in the Instrument Grade hard cutover and
prove why coverage must discover mounted visual responsibility rather than
trust historical completion marks.

- [ ] `app/(app)/template.tsx` — `IG-02` — route-settle owner
- [ ] `components/system/DesktopRequiredBoundary.tsx` — `IG-11` — accessibility reflow and advisory
- [ ] `components/connections/PageConnectionGate.tsx` — `IG-02`
- [ ] `components/connections/ConnectionPromptStrip.tsx` — `IG-02`
- [ ] `components/navigation/RoutePendingNotice.tsx` — `IG-02`
- [ ] `components/navigation/RouteProgressBar.tsx` — `IG-02`
- [ ] `components/common/DemoBanner.tsx` — `IG-02`
- [ ] `components/billing/BillingStatusBanner.tsx` — `IG-02`
- [ ] `components/integrations/ShipBobIntegrationBanner.tsx` — `IG-09`
- [ ] `components/layout/WorkspaceSwitcher.tsx` — `IG-02`
- [ ] `components/layout/MerchantEnvChip.tsx` — `IG-02`
- [ ] `components/layout/ContextCreditsBadge.tsx` — `IG-02`
- [ ] `components/product/FeatureGate.tsx` — `IG-02`
- [ ] `components/product/LockedFeaturePreview.tsx` — `IG-02`
- [ ] `components/product/UpgradeCard.tsx` — `IG-02`
- [ ] `components/product/FeatureTierBadge.tsx` — `IG-02`
- [ ] `components/relationships/ConnectedObjectNotFound.tsx` — `IG-06`
- [ ] `components/evidence/EvidencePackageForm.tsx` — `IG-05`
- [ ] `components/evidence/EvidencePackageFormFields.tsx` — `IG-05`
- [ ] `components/evidence/EvidencePackageFormStates.tsx` — `IG-05`
- [ ] `components/help/HelpCentre.tsx` — `IG-11`
- [ ] `components/customers/CustomersFilterSheet.tsx` — `IG-05`
- [ ] `components/customers/CustomersFilterSheetInner.tsx` — `IG-05`
- [ ] `components/settings/AgreementSettingsClient.tsx` — `IG-10`
- [ ] `components/billing/BillingSettingsClient.tsx` — `IG-10`
- [ ] `components/settings/NotificationPreferencesForm.tsx` — `IG-10`
- [ ] `components/settings/PlatformSettingsClient.tsx` — `IG-10`
- [ ] `components/settings/TeamManagementClient.tsx` — `IG-10`
- [ ] `components/settings/AuditTrailClient.tsx` — `IG-10`
- [ ] `components/settings/ApiIntegrationsClient.tsx` — `IG-10`
- [ ] `components/settings/ChromeSetupClient.tsx` — `IG-10`
- [ ] `components/settings/FreshdeskSupportSyncClient.tsx` — `IG-10`
- [ ] `components/settings/GorgiasSupportSyncClient.tsx` — `IG-10`
- [ ] `components/settings/ZendeskSupportSyncClient.tsx` — `IG-10`
