import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const { LEGACY_UI_REDIRECTS } = require('../lib/navigation/aliases.js');
const projectRoot = process.cwd();
const scanRoots = ['app', 'components'];
const excludedFiles = new Set([
  'components/dashboard/DesignChallenge2Pages.tsx',
  'components/dashboard/DesignChallenge3Pages.tsx',
  'components/dashboard/DesignChallenge4Pages.tsx',
]);

function walk(directory, predicate) {
  const entries = fs.readdirSync(directory, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return walk(fullPath, predicate);
    return predicate(fullPath) ? [fullPath] : [];
  });
}

function relative(filePath) {
  return path.relative(projectRoot, filePath).split(path.sep).join('/');
}

function routePatternFromPage(filePath) {
  const parts = relative(filePath).split('/').slice(1, -1).filter((part) => !/^\(.+\)$/.test(part));
  const source = parts.map((part) => {
    if (/^\[\[\.\.\..+\]\]$/.test(part)) return '(?:/.*)?';
    if (/^\[\.\.\..+\]$/.test(part)) return '/.+';
    if (/^\[.+\]$/.test(part)) return '/[^/]+';
    return `/${part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`;
  }).join('');
  return new RegExp(`^${source || '/'}\/?$`);
}

function redirectPattern(source) {
  const escaped = source
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    .replace(/\\:path\\\*/g, '.*')
    .replace(/\\:[^/]+/g, '[^/]+');
  return new RegExp(`^${escaped}/?$`);
}

const pageFiles = walk(path.join(projectRoot, 'app'), (filePath) => filePath.endsWith(`${path.sep}page.tsx`));
const routePatterns = pageFiles.map(routePatternFromPage);
const redirectPatterns = LEGACY_UI_REDIRECTS.map(({ source }) => redirectPattern(source));

function staticString(initializer) {
  if (!initializer) return null;
  if (ts.isStringLiteral(initializer)) return initializer.text;
  if (!ts.isJsxExpression(initializer) || !initializer.expression) return null;
  if (ts.isStringLiteral(initializer.expression) || ts.isNoSubstitutionTemplateLiteral(initializer.expression)) {
    return initializer.expression.text;
  }
  return null;
}

function attributesFor(node) {
  return new Map(node.attributes.properties
    .filter(ts.isJsxAttribute)
    .map((attribute) => [attribute.name.text.toString(), attribute]));
}

function hasSpread(node) {
  return node.attributes.properties.some(ts.isJsxSpreadAttribute);
}

function hasAction(attributes) {
  return ['onClick', 'onPointerDown', 'onMouseDown', 'formAction', 'href'].some((name) => attributes.has(name));
}

function isDisabled(attributes) {
  const attribute = attributes.get('disabled');
  if (!attribute) return false;
  if (!attribute.initializer) return true;
  if (!ts.isJsxExpression(attribute.initializer)) return true;
  return attribute.initializer.expression?.kind !== ts.SyntaxKind.FalseKeyword;
}

function submitType(attributes) {
  const type = staticString(attributes.get('type')?.initializer);
  return type === 'submit' || type === 'reset';
}

function hasFormAncestor(node) {
  let current = node.parent;
  while (current) {
    if (ts.isJsxElement(current) && current.openingElement.tagName.getText() === 'form') return true;
    current = current.parent;
  }
  return false;
}

function isEmptyHandler(attribute) {
  if (!attribute?.initializer || !ts.isJsxExpression(attribute.initializer)) return false;
  const expression = attribute.initializer.expression;
  return Boolean(expression && ts.isArrowFunction(expression) && ts.isBlock(expression.body) && expression.body.statements.length === 0);
}

function validInternalHref(href) {
  if (!href.startsWith('/')) return true;
  const pathname = href.split(/[?#]/)[0] || '/';
  if (pathname.startsWith('/api/') || pathname.startsWith('/_next/') || /\.[a-z0-9]+$/i.test(pathname)) return true;
  return routePatterns.some((pattern) => pattern.test(pathname))
    || redirectPatterns.some((pattern) => pattern.test(pathname));
}

const findings = [];
const scannedFiles = scanRoots.flatMap((root) => walk(path.join(projectRoot, root), (filePath) => /\.[jt]sx$/.test(filePath)));

for (const filePath of scannedFiles) {
  const rel = relative(filePath);
  if (excludedFiles.has(rel)) continue;
  const sourceText = fs.readFileSync(filePath, 'utf8');
  const sourceFile = ts.createSourceFile(filePath, sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

  if (/DesignChallenge[234]Pages|\bReferencePage\b|referencePreview\s*=/.test(sourceText)) {
    findings.push(`${rel}: competing static reference implementation is imported or activated`);
  }

  function visit(node) {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const tagName = node.tagName.getText(sourceFile);
      const attributes = attributesFor(node);
      const href = staticString(attributes.get('href')?.initializer);
      const position = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
      const at = `${rel}:${position.line + 1}`;

      if (href === '#') findings.push(`${at}: placeholder href="#"`);
      else if (href && !validInternalHref(href)) findings.push(`${at}: internal href has no page or redirect owner: ${href}`);

      const actionControl = tagName === 'button' || tagName === 'Button' || tagName === 'IconButton';
      if (actionControl && !hasSpread(node) && !hasAction(attributes) && !isDisabled(attributes) && !submitType(attributes)) {
        const nativeFormSubmit = tagName === 'button' && !attributes.has('type') && hasFormAncestor(node);
        if (!nativeFormSubmit) findings.push(`${at}: ${tagName} has no action, submit contract, or disabled state`);
      }
      if (isEmptyHandler(attributes.get('onClick'))) findings.push(`${at}: empty onClick handler`);
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
}

const dashboardSource = fs.readFileSync(path.join(projectRoot, 'components/dashboard/DashboardOverview.tsx'), 'utf8');
if (!dashboardSource.includes('href="/settings/workspace/account"') || !dashboardSource.includes('aria-label="Open Settings"')) {
  findings.push('components/dashboard/DashboardOverview.tsx: exact shell is missing its Settings entry');
}

const intelligenceSource = fs.readFileSync(path.join(projectRoot, 'lib/reporting/intelligence.ts'), 'utf8');
for (const missingIndexRoute of ['/orders', '/tickets', '/refunds', '/returns']) {
  if (intelligenceSource.includes(`,'${missingIndexRoute}','connected-source'`)) {
    findings.push(`lib/reporting/intelligence.ts: dashboard source health links to missing index route ${missingIndexRoute}`);
  }
}

if (findings.length > 0) {
  console.error(`UI integrity verification failed with ${findings.length} finding(s):`);
  for (const finding of findings) console.error(`- ${finding}`);
  process.exit(1);
}

console.log(`UI integrity verified: ${pageFiles.length} page owners; ${scannedFiles.length - excludedFiles.size} TSX/JSX files; no placeholder actions, orphaned literal links, or active static reference branches.`);
