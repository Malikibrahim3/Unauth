import { access, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, '../..');
const ledgerPath = path.join(
  projectRoot,
  'docs/APPX_whole_product_visual_coverage_ledger.md',
);

async function walk(relativeDir) {
  const absoluteDir = path.join(projectRoot, relativeDir);
  const entries = await readdir(absoluteDir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const relativePath = path.join(relativeDir, entry.name);
    if (relativePath === 'app/api') continue;
    if (entry.isDirectory()) {
      files.push(...await walk(relativePath));
    } else {
      files.push(relativePath);
    }
  }

  return files;
}

const appFiles = (await walk('app')).sort();
const componentFiles = (await walk('components')).sort();
const extensionFiles = (await walk('extensions')).sort();

const pageModules = appFiles.filter(
  (file) => file === 'app/page.tsx' || file.endsWith('/page.tsx'),
);
const layoutModules = appFiles.filter((file) => /(^|\/)layout\.tsx$/.test(file));
const routeStateModules = appFiles.filter((file) =>
  /(^|\/)(loading|error|not-found|global-error)\.tsx$/.test(file),
);
const nestedViewModules = [...appFiles, ...componentFiles, ...extensionFiles]
  .filter((file) =>
    /\/[^/]*(View|Screen|Modal|Dialog|Drawer|Panel|Menu|Popover|Tooltip|Toast|Skeleton|Loading|Error|Empty)[^/]*\.tsx$/.test(file),
  )
  .filter((file) =>
    !/(^|\/)(page|loading|error|not-found|global-error|layout)\.tsx$/.test(file),
  )
  .sort();

const statefulViewOwners = [
  'app/(app)/claims/ClaimsQueueClient.tsx',
  'app/(app)/customers/CustomersPageWorkbench.tsx',
  'app/(app)/dev/design-system/DesignSystemGalleryClient.tsx',
  'app/(app)/integrations/shipbob/select/ShipBobAccountSelectionClient.tsx',
  'app/(app)/recoveries/RecoveryBoardClient.tsx',
  'components/OnboardingClient.tsx',
  'components/dashboard/DashboardOverview.tsx',
  'components/demo/OperationalCaseDemo.tsx',
  'components/integrations/IntegrationsWorkspace.tsx',
  'components/losses/LossLedger.tsx',
  'components/rules/FlowVersionWorkbench.tsx',
  'components/rules/FlowsIndexClient.tsx',
  'components/rules/RecoveryRulebookClient.tsx',
  'components/rules/RuleVersionWorkbench.tsx',
  'components/rules/RulesIndexClient.tsx',
  'components/shopify/SyncStatusCard.tsx',
  'components/work/WorkQueue.tsx',
  'components/claims/investigations/CaseInvestigationsCard.tsx',
  'components/claims/payout/ResponsibilityAssessmentCard.tsx',
  'components/layout/CommandPalette.tsx',
  'extensions/chrome/popup/PopupApp.tsx',
];

const embeddedSurfaceFiles = [
  'extensions/unauth-checkout/src/index.jsx',
  'extensions/zendesk/assets/iframe.html',
  'lib/gorgias/renderWidgetHtml.ts',
  'lib/gorgias/renderWidgetUnlockHtml.ts',
];

const additionalVisualOwners = [
  'app/(app)/template.tsx',
  'components/system/DesktopRequiredBoundary.tsx',
  'components/connections/PageConnectionGate.tsx',
  'components/connections/ConnectionPromptStrip.tsx',
  'components/navigation/RoutePendingNotice.tsx',
  'components/navigation/RouteProgressBar.tsx',
  'components/common/DemoBanner.tsx',
  'components/billing/BillingStatusBanner.tsx',
  'components/integrations/ShipBobIntegrationBanner.tsx',
  'components/layout/WorkspaceSwitcher.tsx',
  'components/layout/MerchantEnvChip.tsx',
  'components/layout/ContextCreditsBadge.tsx',
  'components/product/FeatureGate.tsx',
  'components/product/LockedFeaturePreview.tsx',
  'components/product/UpgradeCard.tsx',
  'components/product/FeatureTierBadge.tsx',
  'components/relationships/ConnectedObjectNotFound.tsx',
  'components/evidence/EvidencePackageForm.tsx',
  'components/evidence/EvidencePackageFormFields.tsx',
  'components/evidence/EvidencePackageFormStates.tsx',
  'components/help/HelpCentre.tsx',
  'components/customers/CustomersFilterSheet.tsx',
  'components/customers/CustomersFilterSheetInner.tsx',
  'components/settings/AgreementSettingsClient.tsx',
  'components/billing/BillingSettingsClient.tsx',
  'components/settings/NotificationPreferencesForm.tsx',
  'components/settings/PlatformSettingsClient.tsx',
  'components/settings/TeamManagementClient.tsx',
  'components/settings/AuditTrailClient.tsx',
  'components/settings/ApiIntegrationsClient.tsx',
  'components/settings/ChromeSetupClient.tsx',
  'components/settings/FreshdeskSupportSyncClient.tsx',
  'components/settings/GorgiasSupportSyncClient.tsx',
  'components/settings/ZendeskSupportSyncClient.tsx',
];

const requiredFiles = [
  ...new Set([
    ...pageModules,
    ...layoutModules,
    ...routeStateModules,
    ...nestedViewModules,
    ...statefulViewOwners,
    ...embeddedSurfaceFiles,
    ...additionalVisualOwners,
  ]),
].sort();

const ledger = await readFile(ledgerPath, 'utf8');
const entryPattern = /^- \[[ xX]\] `([^`]+)` — `((?:VR|IG)-\d{2})`(?: — .*)?$/gm;
const ledgerEntries = new Map();
const duplicateEntries = [];

for (const match of ledger.matchAll(entryPattern)) {
  const [, file, phase] = match;
  if (ledgerEntries.has(file)) duplicateEntries.push(file);
  ledgerEntries.set(file, phase);
}

const missingEntries = requiredFiles.filter((file) => !ledgerEntries.has(file));
const orphanedEntries = [];

for (const file of ledgerEntries.keys()) {
  try {
    await access(path.join(projectRoot, file));
  } catch {
    orphanedEntries.push(file);
  }
}

const invalidPhases = [...ledgerEntries.entries()]
  .filter(([, phase]) => {
    const number = Number.parseInt(phase.slice(3), 10);
    const max = phase.startsWith('IG-') ? 16 : 14;
    return !Number.isInteger(number) || number < 0 || number > max;
  })
  .map(([file, phase]) => `${file} (${phase})`);

const summary = {
  pages: pageModules.length,
  layouts: layoutModules.length,
  routeStates: routeStateModules.length,
  namedNestedViews: nestedViewModules.length,
  statefulViewOwners: statefulViewOwners.length,
  embeddedSurfaces: embeddedSurfaceFiles.length,
  additionalVisualOwners: additionalVisualOwners.length,
  uniqueRequiredFiles: requiredFiles.length,
  ledgerEntries: ledgerEntries.size,
};

if (
  missingEntries.length
  || orphanedEntries.length
  || duplicateEntries.length
  || invalidPhases.length
) {
  console.error(JSON.stringify({
    status: 'FAIL',
    summary,
    missingEntries,
    orphanedEntries,
    duplicateEntries,
    invalidPhases,
  }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({ status: 'PASS', summary }, null, 2));
