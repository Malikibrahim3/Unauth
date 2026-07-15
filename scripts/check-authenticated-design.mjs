import { readFile, readdir } from 'node:fs/promises';
import { extname, join, relative } from 'node:path';

const ROOT = process.cwd();
const scanRoots = [
  'app/(app)',
  'app/onboarding',
  'app/audit-running',
  'styles/authenticated',
  ...[
    'apply', 'analytics', 'billing', 'cases', 'claims', 'collaboration',
    'connections', 'customers', 'evidence', 'exceptions', 'identity', 'imports',
    'inbox', 'integrations', 'layout', 'losses', 'nav', 'navigation',
    'notifications', 'product', 'relationships', 'reporting', 'reports', 'rules',
    'settings', 'shopify', 'sources', 'states', 'support', 'ui', 'work', 'workbench',
  ].map((dir) => `components/${dir}`),
];

// Whole files excluded from every check below — these are the token
// *definitions* themselves (hex/rgba values are expected there), or
// documented landing-only assets.
const ignored = new Set([
  'components/ui/LandingPrimitives.tsx',
  'components/ui/tokens.ts',
  'styles/authenticated/tokens.css',
  'styles/authenticated/status.css',
  'styles/authenticated/foundations.css',
  'styles/authenticated/controls.css',
]);

// Grandfathered pre-existing debt — real hits that predate this lint rule
// and this pass's design-system consolidation. Not exemptions for new code;
// each is logged in docs/design/authenticated-style-system-validation.md as
// remaining cleanup, not silently accepted. Adding a NEW file here for a NEW
// violation defeats the point of the rule — fix the value or add a narrowly-
// scoped documented exception instead (see styles/authenticated/README.md's
// "Exception mechanism" section: data-viz literals and third-party brand
// marks are the only sanctioned categories).
const hardcodedColorGrandfathered = new Set([
  'app/(app)/help/integrations/siena/page.tsx',
  'app/(app)/help/integrations/yuma/page.tsx',
  'app/(app)/recoveries/[id]/page.tsx',
  'components/collaboration/CaseComments.tsx',
  'components/connections/ConnectionPromptStrip.tsx',
  'components/losses/LossLedger.tsx',
  'components/rules/RuleBuilderDrawer.tsx',
  'components/rules/ConditionBlock.tsx',
  'components/sources/FreshnessIndicator.tsx',
  'components/sources/SourceBadge.tsx',
]);
const arbitraryRadiusGrandfathered = new Set([
  'app/(app)/customers/CustomersOverviewFilterChip.tsx',
  'app/(app)/partners/PartnerRulebookClient.tsx',
  'app/(app)/claims/ClaimsPageView.tsx',
  'components/apply/FoundingMerchantApplicationForm.tsx',
  'components/claims/ClaimReviewHeader.tsx',
  'components/nav/SidebarNavItem.tsx',
]);

// Components documented as deprecated in
// docs/design/authenticated-component-migration-register.md. Empty for now:
// nothing found during the design-system consolidation is deprecated
// cleanly enough to retroactively enforce without breaking in-flight work
// (see the register's "why components/claims is excluded" note). Add an
// entry here — { module: '@/path/to/file', names: ['ExportName'], message:
// 'Use X instead.' } — once a replacement is fully migrated and the register
// says so.
const deprecatedImports = [];

const oldPalette = /#(?:7b2d26|5e2018|a85040|f4e6e0|f8f5ee|fdfbf6|d8d0bd|4a4640|8a8472|ead8d2|8a2828|c45c4c|a84035|18150f|211d16)\b|var\(--(?:copper-(?:bright|mid|dim|glow)|brand-rust(?:-hover|-soft)?)\)/gi;
const landingDependency = /var\(--(?:landing-|fl-)/g;
// Hex / rgb(a) / hsl(a) literals, and inline color/background/border style
// props holding a literal instead of a var() reference. Data-viz series
// colours and third-party brand marks are the sanctioned exceptions (see
// styles/authenticated/README.md) — grandfather a specific file only when
// it predates this rule, not to work around it for new code.
const hardcodedColor = /#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?)\([^)]*\)/g;
// rounded-[...] with a literal value (not a var() reference).
const arbitraryRadius = /rounded-\[(?!var\()[^\]]+\]/g;
// Inline borderRadius holding a literal instead of var() — the CSS-in-JS
// form of the Tailwind rounded-[...] check above. "50%" is allowed: it
// makes a circle (avatars, dots, status indicators), which is a shape, not
// a point on the radius scale.
const arbitraryRadiusInline = /borderRadius:\s*(['"])(?!var\()(?!50%\1)(?!\1\1)[^'"]+\1/g;
// Inline boxShadow holding a literal instead of var() or the bare literal
// "none" (which is a legitimate "no shadow" value, not a hardcoded shadow).
const arbitraryShadow = /boxShadow:\s*(['"])(?!var\()(?!none\1)[^'"]+\1/g;

// Exact baseline for native controls that still live in low-level forms,
// navigation, overlays, and compatibility surfaces. New files may not add
// native controls, and existing files may not increase their count. Migrate a
// call site to Input/Select/Button/IconButton before changing this baseline.
const rawControlExpression = /<(?:button|input|select|textarea)\b/g;
const rawControlBaseline = new Map([
  ['app/(app)/claims/ClaimsQueueClient.tsx', 1],
  ['app/(app)/recoveries/RecoveryBoardClient.tsx', 2],
  ['app/(app)/settings/agreements/page.tsx', 17],
  ['components/apply/FoundingMerchantApplicationForm.tsx', 3],
  ['components/audit/CustomerNotes.tsx', 6],
  ['components/BuiltForPurposeStack.tsx', 1],
  ['components/billing/BillingSettingsClient.tsx', 9],
  ['components/claims/ClaimReviewContextColumn.tsx', 2],
  ['components/claims/ClaimReviewFormSection.tsx', 8],
  ['components/claims/ClaimReviewHeader.tsx', 1],
  ['components/claims/ClaimReviewManageCard.tsx', 17],
  ['components/claims/ClaimReviewToast.tsx', 1],
  ['components/claims/claimReviewPrimitives.tsx', 7],
  ['components/collaboration/CaseComments.tsx', 2],
  ['components/collaboration/MentionPicker.tsx', 1],
  ['components/customers/BehaviorRoadmap.tsx', 1],
  ['components/customers/CustomerPreviewDrawer.tsx', 1],
  ['components/customers/CustomersFilterSheetInner.tsx', 2],
  ['components/customers/CustomersTableClient.tsx', 1],
  ['components/evidence/EvidencePackageFormFields.tsx', 4],
  ['components/evidence/EvidencePackageFormStates.tsx', 1],
  ['components/EvidenceNotVerdictsRampSection.tsx', 1],
  ['components/exceptions/ExceptionQueue.tsx', 7],
  ['components/identity/EvidenceScoreBadge.tsx', 1],
  ['components/imports/CanonicalCsvImportClient.tsx', 5],
  ['components/integrations/ConnectionActions.tsx', 2],
  ['components/layout/AppHeader.tsx', 2],
  ['components/layout/AvatarMenu.tsx', 2],
  ['components/layout/CommandPaletteInputBar.tsx', 2],
  ['components/layout/CommandPaletteResultsList.tsx', 4],
  ['components/layout/WorkspaceSwitcher.tsx', 1],
  ['components/losses/LossActions.tsx', 2],
  ['components/nav/SidebarAside.tsx', 3],
  ['components/nav/SidebarInner.tsx', 1],
  ['components/notifications/NotificationCentre.tsx', 1],
  ['components/OnboardingClient.tsx', 8],
  ['components/rules/ConditionBlock.tsx', 2],
  ['components/rules/FlowEditor.tsx', 6],
  ['components/rules/FlowVersionWorkbench.tsx', 1],
  ['components/rules/RuleBuilderDrawer.tsx', 3],
  ['components/rules/RuleVersionWorkbench.tsx', 3],
  ['components/settings/AccountPasswordSection.tsx', 1],
  ['components/settings/ApiIntegrationsKeyDialogs.tsx', 2],
  ['components/settings/ApiKeyCreateDialog.tsx', 3],
  ['components/settings/AppearanceSettings.tsx', 1],
  ['components/settings/AuditTrailClient.tsx', 2],
  ['components/settings/BulkDeleteClient.tsx', 3],
  ['components/settings/ChromeSetupClient.tsx', 1],
  ['components/settings/FreshdeskCredentialFields.tsx', 2],
  ['components/settings/FreshdeskSupportSyncConnectionDetails.tsx', 3],
  ['components/settings/FreshdeskSupportSyncCreateForm.tsx', 3],
  ['components/settings/FreshdeskWebhookSetupPanel.tsx', 3],
  ['components/settings/GorgiasCredentialFields.tsx', 3],
  ['components/settings/GorgiasSupportSyncConnectionDetails.tsx', 5],
  ['components/settings/GorgiasSupportSyncCreateForm.tsx', 3],
  ['components/settings/GorgiasWebhookSetupPanel.tsx', 2],
  ['components/settings/NotificationPreferencesForm.tsx', 1],
  ['components/settings/PlatformSettingsClient.tsx', 7],
  ['components/settings/TeamInviteForm.tsx', 3],
  ['components/settings/TeamMemberRow.tsx', 4],
  ['components/settings/FreshdeskSupportSyncConnectionDetails.tsx', 3],
  ['components/settings/ZendeskSetupClient.tsx', 1],
  ['components/settings/ZendeskSupportSyncClient.tsx', 6],
  ['components/shopify/ShopifyDisconnectClient.tsx', 3],
  ['components/shopify/ShopifyIntegrationBanner.tsx', 0],
  ['components/shopify/SyncStatusConnectModal.tsx', 5],
  ['components/shopify/SyncStatusConnectedView.tsx', 2],
  ['components/shopify/SyncStatusDisconnectedView.tsx', 2],
  ['components/ui/Button.tsx', 1],
  ['components/ui/DataTable.tsx', 1],
  ['components/ui/Drawer.tsx', 1],
  ['components/ui/FilterChip.tsx', 1],
  ['components/ui/IconButton.tsx', 1],
  ['components/ui/Input.tsx', 1],
  ['components/ui/LandingPrimitives.tsx', 1],
  ['components/ui/RowActionsMenu.tsx', 2],
  ['components/ui/SegmentedControl.tsx', 1],
  ['components/ui/Select.tsx', 1],
  ['components/ui/SensitiveField.tsx', 1],
  ['components/ui/Tabs.tsx', 1],
  ['components/ui/Toast.tsx', 1],
  ['components/work/WorkQueue.tsx', 5],
]);
const textArrowExpression = /[→↗]/g;
const textArrowBaseline = 70;

const allowedExtensions = new Set(['.ts', '.tsx', '.css']);

async function filesUnder(path) {
  const absolute = join(ROOT, path);
  const entries = await readdir(absolute, { withFileTypes: true });
  const results = [];
  for (const entry of entries) {
    const child = join(path, entry.name);
    if (entry.isDirectory()) results.push(...await filesUnder(child));
    else if (allowedExtensions.has(extname(entry.name))) results.push(child);
  }
  return results;
}

function findMatches(source, expression) {
  expression.lastIndex = 0;
  const matches = [];
  let match;
  while ((match = expression.exec(source))) {
    const line = source.slice(0, match.index).split('\n').length;
    matches.push({ line, text: match[0] });
    if (match[0].length === 0) expression.lastIndex += 1; // guard against zero-width infinite loop
  }
  return matches;
}

const files = (await Promise.all(scanRoots.map(filesUnder))).flat();
const failures = [];
let rawControlTotal = 0;
let textArrowTotal = 0;

for (const file of files) {
  const normalized = relative(ROOT, join(ROOT, file));
  if (ignored.has(normalized)) continue;
  const source = await readFile(join(ROOT, file), 'utf8');

  if (!['components/ui/LandingPrimitives.tsx', 'components/ui/index.ts'].includes(normalized)) {
    for (const { line, text } of findMatches(source, /<PanelCard\b|\bPanelCard\b(?=.*from)/g)) {
      failures.push(`${normalized}:${line} deprecated PanelCard usage: ${text} — use Card, SectionCard, or a specialised canonical surface`);
    }
  }

  const rawControls = findMatches(source, rawControlExpression);
  rawControlTotal += rawControls.length;
  if (rawControls.length > 0 && !rawControlBaseline.has(normalized)) {
    failures.push(`${normalized}: raw control outside explicit allowlist — use Button, Input, Select, SegmentedControl, or document a low-level implementation reason`);
  } else if (rawControlBaseline.has(normalized) && rawControls.length !== rawControlBaseline.get(normalized)) {
    failures.push(`${normalized}: raw control baseline changed from ${rawControlBaseline.get(normalized)} to ${rawControls.length} — migrate the call site or update the documented baseline after review`);
  }

  textArrowTotal += findMatches(source, textArrowExpression).length;

  for (const [rule, expression] of [['old palette', oldPalette], ['landing token dependency', landingDependency]]) {
    for (const { line, text } of findMatches(source, expression)) {
      failures.push(`${normalized}:${line} ${rule}: ${text} — replace with a styles/authenticated token`);
    }
  }

  if (!hardcodedColorGrandfathered.has(normalized)) {
    for (const { line, text } of findMatches(source, hardcodedColor)) {
      failures.push(`${normalized}:${line} hardcoded colour: ${text} — use a var(--ua-*) token, or a documented data-viz/brand-mark exception`);
    }
  }

  if (!arbitraryRadiusGrandfathered.has(normalized)) {
    for (const { line, text } of findMatches(source, arbitraryRadius)) {
      failures.push(`${normalized}:${line} arbitrary radius: ${text} — use one of the --ua-radius-* tokens`);
    }
    for (const { line, text } of findMatches(source, arbitraryRadiusInline)) {
      failures.push(`${normalized}:${line} arbitrary radius: ${text} — use one of the --ua-radius-* tokens`);
    }
  }

  for (const { line, text } of findMatches(source, arbitraryShadow)) {
    failures.push(`${normalized}:${line} arbitrary shadow: ${text} — use one of the --ua-shadow-* tokens, or literal "none"`);
  }

  for (const dep of deprecatedImports) {
    const importPattern = new RegExp(
      `import\\s*\\{[^}]*\\b(${dep.names.join('|')})\\b[^}]*\\}\\s*from\\s*['"]${dep.module.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]`,
      'g',
    );
    for (const { line, text } of findMatches(source, importPattern)) {
      failures.push(`${normalized}:${line} deprecated import: ${text} — ${dep.message}`);
    }
  }
}

if (textArrowTotal > textArrowBaseline) {
  failures.push(`authenticated text-arrow baseline increased from ${textArrowBaseline} to ${textArrowTotal} — use words or an accessible icon component`);
}

if (failures.length) {
  console.error('Authenticated design guard failed:\n' + failures.join('\n'));
  process.exit(1);
}

console.log(`Authenticated design guard passed (${files.length} files checked).`);
