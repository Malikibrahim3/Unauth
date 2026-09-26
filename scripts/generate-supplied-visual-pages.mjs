#!/usr/bin/env node

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { JSDOM } from 'jsdom';

const ROOT = process.cwd();
const args = process.argv.slice(2);
const CHECK_ONLY = args.includes('--check');
const ARCHIVE = args.find((argument) => argument !== '--check') ?? '/Users/malikibrahim/Downloads/Cases page design directions.zip';
const OUTPUT = path.join(ROOT, 'components', 'visual-authority', 'generated');
const SHELL_REGISTRY = path.join(OUTPUT, 'AuthenticatedShellSources.ts');
const EXPECTED_ARCHIVE_SHA256 = '988c09688e0a02c9138307518c6504e647db5c3a2169081932aa1b747925d4aa';
const PAGE_ENTRY = /^handoff\/pages\/([^/]+-Clean)\.dc\.html$/;
const ROOT_STYLE_REMOVALS = new Set(['width', 'flex', 'border-radius', 'box-shadow']);
const FIXED_ROOT_HEIGHTS = new Set(['820px', '900px', '960px']);
// Adapt the supplied page paint at generation time. The source archive and its
// checksum remain unchanged; operational geometry and semantic state colours stay intact.
const VISUAL_PALETTE = new Map([
  ['#1c1b19', '#1c1f23'], ['#45423e', '#40454a'],
  ['#6d6a65', '#64686d'], ['#8b8781', '#64686d'],
  ['#a09b94', '#64686d'], ['#c4bfb8', '#a7abad'],
  ['#fcfbfa', '#ffffff'], ['#f6f4f1', '#f4f3f1'],
  ['#fdf7ee', '#fff3e9'], ['#f1efec', '#eae8e5'],
  ['#eeecea', '#e4e3e0'], ['#e7e3de', '#e4e3e0'],
  ['#e7e4df', '#eae8e5'], ['#f2f0ed', '#f4f3f1'],
  ['#f4f2ef', '#f4f3f1'], ['#f7f5f2', '#f7f6f3'],
  ['#f2761a', '#ff7a30'], ['#e8802a', '#ff7a30'],
  ['#f8974a', '#ff985e'], ['#c96a12', '#9b470d'],
  ['#a85608', '#8a3905'],
]);
function alignVisualPalette(value) {
  return value.replace(/#[\da-f]{6}\b/gi, (match) => VISUAL_PALETTE.get(match.toLowerCase()) ?? match)
    .replace(/rgba?\(\s*28\s*,\s*27\s*,\s*25\s*/g, (match) => match.replace(/28\s*,\s*27\s*,\s*25/, '28,31,35'));
}

const crosswalkJson = execFileSync('node_modules/.bin/ts-node', [
  '--transpile-only',
  '--compiler-options',
  '{"module":"commonjs","moduleResolution":"node"}',
  '-e',
  "const m=require('./lib/surfaces/manifest'); console.log(JSON.stringify(m.designReferenceCrosswalk))",
], { cwd: ROOT, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
const crosswalkLine = crosswalkJson.trim().split('\n').reverse().find((line) => line.startsWith('['));
if (!crosswalkLine) throw new Error('Could not evaluate the canonical visual crosswalk.');
const canonicalRouteBySourceId = new Map(
  JSON.parse(crosswalkLine)
    .filter((reference) => reference.kind === 'shipping' && reference.owner.startsWith('/'))
    .map((reference) => [reference.id, reference.owner]),
);
const shippingReferences = JSON.parse(crosswalkLine).filter((reference) => reference.kind === 'shipping');
canonicalRouteBySourceId.set('Demo-Context-Clean', '/demo?step=incoming');
canonicalRouteBySourceId.set('Demo-Sources-Clean', '/demo?step=evidence');
canonicalRouteBySourceId.set('Demo-Clean', '/demo?step=recommendation');
canonicalRouteBySourceId.set('Demo-Decision-Clean', '/demo?step=decision');
canonicalRouteBySourceId.set('Demo-Recovery-Clean', '/demo?step=recovery');

const ATTRIBUTE_NAMES = new Map([
  ['class', 'className'],
  ['for', 'htmlFor'],
  ['preserveaspectratio', 'preserveAspectRatio'],
  ['stop-color', 'stopColor'],
  ['stop-opacity', 'stopOpacity'],
  ['stroke-dasharray', 'strokeDasharray'],
  ['stroke-linecap', 'strokeLinecap'],
  ['stroke-linejoin', 'strokeLinejoin'],
  ['stroke-width', 'strokeWidth'],
  ['tabindex', 'tabIndex'],
]);

const VOID_ELEMENTS = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function cssPropertyName(property) {
  if (property.startsWith('--')) return property;
  if (property.startsWith('-webkit-')) {
    return `Webkit${property.slice(8).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())}`;
  }
  return property.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
}

function parseStyle(styleText, { root = false } = {}) {
  const declarations = new Map();
  for (const rawDeclaration of styleText.split(';')) {
    const separator = rawDeclaration.indexOf(':');
    if (separator === -1) continue;
    const property = rawDeclaration.slice(0, separator).trim();
    const value = rawDeclaration.slice(separator + 1).trim();
    if (!property || !value) continue;
    if (root && ROOT_STYLE_REMOVALS.has(property)) continue;
    if (root && property === 'height' && FIXED_ROOT_HEIGHTS.has(value)) continue;
    declarations.set(cssPropertyName(property), alignVisualPalette(value));
  }
  return `{{ ${Array.from(declarations, ([property, value]) => `${JSON.stringify(property)}: ${JSON.stringify(value)}`).join(', ')} }}`;
}

function parsedStyleEntries(styleText, { root = false } = {}) {
  const declarations = new Map();
  for (const rawDeclaration of String(styleText ?? '').split(';')) {
    const separator = rawDeclaration.indexOf(':');
    if (separator === -1) continue;
    const property = rawDeclaration.slice(0, separator).trim();
    const value = rawDeclaration.slice(separator + 1).trim();
    if (!property || !value) continue;
    if (root && ROOT_STYLE_REMOVALS.has(property)) continue;
    if (root && property === 'height' && FIXED_ROOT_HEIGHTS.has(value)) continue;
    declarations.set(cssPropertyName(property), alignVisualPalette(value));
  }
  return declarations;
}

function canonicalHref(value) {
  if (!/\.dc\.html(?:[?#]|$)/i.test(value)) return value;
  const match = value.match(/^([^?#]+\.dc\.html)(.*)$/i);
  if (!match) return value;
  const sourceId = decodeURIComponent(match[1])
    .replace(/^\.\//, '')
    .replace(/\.dc\.html$/i, '')
    .trim()
    .replace(/\s+/g, '-');
  const route = canonicalRouteBySourceId.get(sourceId);
  if (!route || route.includes('[')) return value;
  return `${route}${match[2] ?? ''}`;
}

function renderAttributes(element, isRoot) {
  const ordinary = [];
  const custom = [];
  let hoverStyle = null;

  for (const attribute of element.attributes) {
    const rawName = attribute.name;
    if (rawName === 'style') {
      ordinary.push(`style=${parseStyle(attribute.value, { root: isRoot })}`);
      continue;
    }

    const lowerName = rawName.toLowerCase();
    const name = ATTRIBUTE_NAMES.get(lowerName) ?? rawName;
    if (lowerName === 'style-hover' || lowerName === 'hint-placeholder-val') {
      custom.push([rawName, attribute.value]);
      if (lowerName === 'style-hover') hoverStyle = attribute.value;
      continue;
    }
    ordinary.push(`${name}=${JSON.stringify(lowerName === 'href' ? canonicalHref(attribute.value) : alignVisualPalette(attribute.value))}`);
  }

  if (custom.length) {
    ordinary.push(`{...${JSON.stringify(Object.fromEntries(custom))}}`);
  }
  if (hoverStyle) {
    const hover = Object.fromEntries(parsedStyleEntries(hoverStyle));
    const base = parsedStyleEntries(element.getAttribute('style'));
    const rest = Object.fromEntries(Object.keys(hover).map((property) => [property, base.get(property) ?? '']));
    const enter = `{(event) => { Object.assign(event.currentTarget.style, ${JSON.stringify(hover)}); }}`;
    const leave = `{(event) => { Object.assign(event.currentTarget.style, ${JSON.stringify(rest)}); }}`;
    ordinary.push(`onMouseEnter=${enter}`, `onMouseLeave=${leave}`, `onFocus=${enter}`, `onBlur=${leave}`);
  }
  return ordinary.length ? ` ${ordinary.join(' ')}` : '';
}

function renderNode(node, depth = 2, isRoot = false) {
  if (node.nodeType === node.TEXT_NODE) {
    return `{${JSON.stringify(node.nodeValue ?? '')}}`;
  }
  if (node.nodeType !== node.ELEMENT_NODE) return '';

  const sourceTag = node.localName;
  const children = Array.from(node.childNodes).map((child) => renderNode(child, depth + 1)).join('');
  if (sourceTag === 'sc-if') {
    // This is inside the adopted screen, not its screenshot stage. Retain
    // the source custom element and attributes; the shell binds visibility.
    const attributes = Object.fromEntries(Array.from(node.attributes).map(({ name, value }) => [name, value]));
    return `{createElement("sc-if", ${JSON.stringify(attributes)}, <>${children}</>)}`;
  }
  const tag = sourceTag;
  const attributes = renderAttributes(node, isRoot);
  if (VOID_ELEMENTS.has(sourceTag)) return `<${tag}${attributes} />`;

  return `<${tag}${attributes}>${children}</${tag}>`;
}

function generatedModule(sourceId, html) {
  const document = new JSDOM(html).window.document;
  const pageRoot = document.querySelector('[data-screen-label]');
  if (!pageRoot) throw new Error(`${sourceId}: missing [data-screen-label] root`);
  if (document.querySelectorAll('[data-screen-label]').length !== 1) {
    throw new Error(`${sourceId}: expected exactly one [data-screen-label] root`);
  }

  const hasStyleHover = pageRoot.querySelector('[style-hover]') !== null;
  const component = renderNode(pageRoot, 1, true);
  const rootChildren = Array.from(pageRoot.children);
  const isAuthenticatedPage = rootChildren.length === 3
    && rootChildren[0]?.getAttribute('style')?.includes('width:56px')
    && rootChildren[1]?.getAttribute('style')?.includes('width:238px');
  const mainComponent = isAuthenticatedPage ? renderNode(rootChildren[2], 1, false) : null;
  const mainChildNodes = isAuthenticatedPage ? Array.from(rootChildren[2].childNodes) : [];
  const topbarIndex = mainChildNodes.findIndex((node) => node.nodeType === node.ELEMENT_NODE);
  const bodyComponent = topbarIndex >= 0
    ? mainChildNodes.slice(topbarIndex + 1).map((node) => renderNode(node, 1, false)).join('')
    : null;
  const sourceHash = sha256(pageRoot.outerHTML);
  const reactTypeImport = pageRoot.querySelector('sc-if')
    ? "import { createElement, type ReactElement } from 'react';\n\n"
    : "import type { ReactElement } from 'react';\n\n";

  const mainExport = mainComponent
    ? `\n/** Exact authenticated page column, for use inside the shared supplied shell. */\nexport function SuppliedVisualMain(): ReactElement {\n  return (${mainComponent});\n}\n\n/** Exact authenticated page content after the shared 50px top bar. */\nexport function SuppliedVisualBody(): ReactElement {\n  return (<>${bodyComponent}</>);\n}\n`
    : '';
  return `${hasStyleHover ? "'use client';\n\n" : ''}/* eslint-disable */\n// Generated mechanically from ${sourceId}.dc.html. Do not hand-edit.\n// Extracted [data-screen-label] SHA-256: ${sourceHash}\n${reactTypeImport}export const suppliedSourceId = ${JSON.stringify(sourceId)} as const;\nexport const suppliedSourceRootSha256 = ${JSON.stringify(sourceHash)} as const;\n\nexport default function SuppliedVisualPage(): ReactElement {\n  return (${component});\n}\n${mainExport}`;
}

if (!fs.existsSync(ARCHIVE)) throw new Error(`Visual authority archive not found: ${ARCHIVE}`);
const archiveBytes = fs.readFileSync(ARCHIVE);
const archiveHash = sha256(archiveBytes);
if (archiveHash !== EXPECTED_ARCHIVE_SHA256) {
  throw new Error(`Archive checksum mismatch: expected ${EXPECTED_ARCHIVE_SHA256}, received ${archiveHash}`);
}

const entries = execFileSync('unzip', ['-Z1', ARCHIVE], { encoding: 'utf8' })
  .split(/\r?\n/)
  .filter(Boolean)
  .map((entry) => ({ entry, match: entry.match(PAGE_ENTRY) }))
  .filter(({ match }) => match);

if (entries.length !== 79) throw new Error(`Expected 79 shipping pages, found ${entries.length}`);
if (!CHECK_ONLY) fs.mkdirSync(OUTPUT, { recursive: true });

const generated = [];
const authenticatedSourceIds = [];
for (const { entry, match } of entries) {
  const sourceId = match[1];
  const html = execFileSync('unzip', ['-p', ARCHIVE, entry], { encoding: 'utf8', maxBuffer: 2 * 1024 * 1024 });
  const moduleSource = generatedModule(sourceId, html);
  const document = new JSDOM(html).window.document;
  const pageRoot = document.querySelector('[data-screen-label]');
  const rootChildren = pageRoot ? Array.from(pageRoot.children) : [];
  if (
    rootChildren.length === 3
    && rootChildren[0]?.getAttribute('style')?.includes('width:56px')
    && rootChildren[1]?.getAttribute('style')?.includes('width:238px')
  ) {
    authenticatedSourceIds.push(sourceId);
  }
  const outputPath = path.join(OUTPUT, `${sourceId}.tsx`);
  if (CHECK_ONLY) {
    if (!fs.existsSync(outputPath)) throw new Error(`Generated visual page is missing: ${path.relative(ROOT, outputPath)}`);
    const current = fs.readFileSync(outputPath, 'utf8');
    if (current !== moduleSource) throw new Error(`Generated visual page is stale: ${path.relative(ROOT, outputPath)}`);
  } else {
    fs.writeFileSync(outputPath, moduleSource);
  }
  generated.push(path.relative(ROOT, outputPath));
}

function identifier(sourceId) {
  return `Source${sourceId.replace(/[^A-Za-z0-9]+/g, '')}`;
}

function routeMatcher(owner) {
  const escaped = owner
    .split('/')
    .map((segment) => segment.startsWith('[') && segment.endsWith(']') ? '[^/]+' : segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('/');
  return owner.includes('[')
    ? `new RegExp(${JSON.stringify(`^${escaped}$`)}).test(pathname)`
    : `pathname === ${JSON.stringify(owner)}`;
}

function generatedShellRegistry() {
  const authenticated = new Set(authenticatedSourceIds);
  const baseReferences = shippingReferences
    .filter((reference) => authenticated.has(reference.id) && reference.owner.startsWith('/') && !reference.routeState)
    .sort((left, right) => {
      const leftDynamic = left.owner.includes('[') ? 1 : 0;
      const rightDynamic = right.owner.includes('[') ? 1 : 0;
      return leftDynamic - rightDynamic || right.owner.length - left.owner.length || left.id.localeCompare(right.id);
    });
  const imports = authenticatedSourceIds
    .sort()
    .map((sourceId) => `import ${identifier(sourceId)}, { SuppliedVisualBody as Body${identifier(sourceId)} } from './${sourceId}';`)
    .join('\n');
  const matchers = baseReferences
    .map((reference) => `  if (${routeMatcher(reference.owner)}) return ${identifier(reference.id)};`)
    .join('\n');
  const bodyMatchers = baseReferences
    .map((reference) => `  if (${routeMatcher(reference.owner)}) return Body${identifier(reference.id)};`)
    .join('\n');
  return `/* eslint-disable */\n// Generated mechanically from the supplied pages and canonical manifest crosswalk. Do not hand-edit.\nimport type { ReactElement } from 'react';\n${imports}\n\nexport type AuthenticatedSourcePage = () => ReactElement;\n\nexport function authenticatedSourceForPath(pathname: string): AuthenticatedSourcePage {\n${matchers}\n  return ${identifier('Overview-Clean')};\n}\n\nexport function authenticatedBodyForPath(pathname: string): AuthenticatedSourcePage {\n${bodyMatchers}\n  return Body${identifier('Overview-Clean')};\n}\n`;
}

const shellRegistrySource = generatedShellRegistry();
if (CHECK_ONLY) {
  if (!fs.existsSync(SHELL_REGISTRY)) throw new Error(`Generated authenticated shell registry is missing: ${path.relative(ROOT, SHELL_REGISTRY)}`);
  const current = fs.readFileSync(SHELL_REGISTRY, 'utf8');
  if (current !== shellRegistrySource) throw new Error(`Generated authenticated shell registry is stale: ${path.relative(ROOT, SHELL_REGISTRY)}`);
} else {
  fs.writeFileSync(SHELL_REGISTRY, shellRegistrySource);
}

console.log(`${CHECK_ONLY ? 'Verified' : 'Generated'} ${generated.length} supplied visual TSX pages and the authenticated shell projection from ${path.basename(ARCHIVE)} (${archiveHash}).`);
