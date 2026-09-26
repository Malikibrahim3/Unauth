#!/usr/bin/env node

import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { chromium } from '@playwright/test';
import sharp from 'sharp';

const ROOT = process.cwd();
const require = createRequire(import.meta.url);
const axeScript = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const ARCHIVE = process.argv[2] ?? '/Users/malikibrahim/Downloads/Cases page design directions.zip';
const OUTPUT = path.resolve(
  ROOT,
  process.argv[3] ?? 'artifacts/visual-authority/supplied-reference',
);
const EXPECTED_ARCHIVE_SHA256 = '988c09688e0a02c9138307518c6504e647db5c3a2169081932aa1b747925d4aa';
const PAGE_ENTRY = /^handoff\/pages\/([^/]+-Clean)\.dc\.html$/;

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function stableText(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function pngName(sourceId) {
  return `${sourceId}.png`;
}

function dataFontFace(family, weight, file) {
  const bytes = fs.readFileSync(path.join(ROOT, 'public', 'fonts', file));
  return `@font-face{font-family:${JSON.stringify(family)};src:url(data:font/woff2;base64,${bytes.toString('base64')}) format('woff2');font-style:normal;font-weight:${weight};font-display:block}`;
}

const deterministicFontCss = [
  dataFontFace('Inter', '100 900', 'inter-latin-variable.woff2'),
  dataFontFace('IBM Plex Mono', '400', 'ibm-plex-mono-latin-400.woff2'),
  dataFontFace('IBM Plex Mono', '500', 'ibm-plex-mono-latin-500.woff2'),
].join('\n');

if (!fs.existsSync(ARCHIVE)) throw new Error(`Visual authority archive not found: ${ARCHIVE}`);
const archiveBytes = fs.readFileSync(ARCHIVE);
const archiveSha256 = sha256(archiveBytes);
if (archiveSha256 !== EXPECTED_ARCHIVE_SHA256) {
  throw new Error(`Archive checksum mismatch: expected ${EXPECTED_ARCHIVE_SHA256}, received ${archiveSha256}`);
}

const entries = execFileSync('unzip', ['-Z1', ARCHIVE], { encoding: 'utf8' })
  .split(/\r?\n/)
  .filter(Boolean)
  .map((entry) => ({ entry, match: entry.match(PAGE_ENTRY) }))
  .filter(({ match }) => match)
  .sort((left, right) => left.match[1].localeCompare(right.match[1]));
if (entries.length !== 79) throw new Error(`Expected 79 supplied pages, found ${entries.length}`);

fs.mkdirSync(OUTPUT, { recursive: true });
const extractionRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'unauth-visual-authority-'));
execFileSync('unzip', ['-q', ARCHIVE, 'handoff/pages/*', '-d', extractionRoot]);

const browser = await chromium.launch({ headless: true });
const records = [];
const context = await browser.newContext({
  viewport: { width: 1440, height: 1100 },
  deviceScaleFactor: 1,
  colorScheme: 'light',
  reducedMotion: 'reduce',
});
const page = await context.newPage();
await context.route(/^https?:\/\//, (route) => route.abort());

try {
  for (const { match } of entries) {
    const sourceId = match[1];
    // Exercise the desktop-required state at its real responsive breakpoint.
    // All other references retain the original capture viewport.
    await page.setViewportSize({ width: sourceId === 'Desktop-Required-Clean' ? 1000 : 1440, height: 1100 });
    const pageFile = path.join(extractionRoot, 'handoff', 'pages', `${sourceId}.dc.html`);
    await page.goto(`file://${pageFile}`, { waitUntil: 'load' });
    await page.evaluate(() => {
      for (const link of document.querySelectorAll('link[href*="fonts.googleapis.com"],link[href*="fonts.gstatic.com"]')) link.remove();
      const screen = document.querySelector('[data-screen-label]');
      if (!(screen instanceof HTMLElement)) throw new Error('Missing supplied screen root');
      const presentationProperties = ['color', 'fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing', 'textDecorationLine'];
      const sourcePresentation = [screen, ...screen.querySelectorAll('*')].map((node) => ({
        node,
        values: presentationProperties.map((property) => getComputedStyle(node)[property]),
      }));
      // The package puts its page-wide stylesheet in a body-level helmet.
      // Removing the stage must not discard that visual authority with it.
      for (const style of document.querySelectorAll('helmet style')) {
        document.head.append(style);
      }
      for (const property of ['width', 'flex', 'border-radius', 'box-shadow']) screen.style.removeProperty(property);
      if (['820px', '900px', '960px'].includes(screen.style.height)) screen.style.removeProperty('height');
      document.body.replaceChildren(screen);
      document.body.style.background = '#ffffff';
      for (const { node, values } of sourcePresentation) {
        const style = getComputedStyle(node);
        for (const [index, property] of presentationProperties.entries()) {
          if (style[property] !== values[index]) throw new Error(`Stage extraction changed supplied ${property} on ${node.tagName}: ${values[index]} -> ${style[property]}`);
        }
      }
    });
    await page.addStyleTag({ content: deterministicFontCss });
    await page.evaluate(async () => {
      await document.fonts.ready;
    });
    const root = page.locator('[data-screen-label]');
    if (await root.count() !== 1) throw new Error(`${sourceId}: expected exactly one [data-screen-label]`);
    const contract = await root.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      const removableRootStyles = new Set(['width', 'flex', 'border-radius', 'box-shadow']);
      const ignored = (name) => name === 'class' || name === 'style-hover' || name === 'href' || name === 'src' || name === 'id' || name === 'role' || name === 'tabindex' || name.startsWith('aria-') || name.startsWith('on') || (name.startsWith('data-') && !['data-screen-label', 'hint-placeholder-val'].includes(name));
      const structure = (node, isRoot = false) => {
        if (node instanceof Element && node.hasAttribute('data-reference-ignore')) return null;
        if (node.nodeType === Node.TEXT_NODE) return /\S/.test(node.textContent ?? '') ? ['text'] : null;
        if (!(node instanceof Element)) return null;
        const attributes = Array.from(node.attributes)
          .filter((attribute) => !ignored(attribute.name))
          .map((attribute) => {
            if (attribute.name !== 'style') return [attribute.name, attribute.value];
            const declarations = Array.from(node.style)
              .filter((property) => !isRoot || (!removableRootStyles.has(property) && !(property === 'height' && /^(?:960|820|900)px$/.test(node.style.getPropertyValue(property)))))
              .map((property) => [property, node.style.getPropertyValue(property).replace(/\s+/g, ' ').trim()])
              .sort(([left], [right]) => left.localeCompare(right));
            return ['style', declarations];
          })
          .sort(([left], [right]) => left.localeCompare(right));
        return [node.getAttribute('data-reference-tag') || node.tagName.toLowerCase(), attributes, Array.from(node.childNodes).map((child) => structure(child, false)).filter(Boolean)];
      };
      const geometry = [element, ...element.querySelectorAll('*')].filter((node) => !node.closest('[data-reference-ignore]')).map((node) => {
        const nodeRect = node.getBoundingClientRect();
        return {
          tag: node.getAttribute('data-reference-tag') || node.tagName.toLowerCase(),
          x: Math.round((nodeRect.x - rect.x) * 100) / 100,
          y: Math.round((nodeRect.y - rect.y) * 100) / 100,
          width: Math.round(nodeRect.width * 100) / 100,
          height: Math.round(nodeRect.height * 100) / 100,
        };
      });
      const svgSignatures = Array.from(element.querySelectorAll('svg')).map((svg) => ({
        viewBox: svg.getAttribute('viewBox') ?? '',
        width: svg.getAttribute('width') ?? '',
        height: svg.getAttribute('height') ?? '',
        paths: Array.from(svg.querySelectorAll('path')).map((item) => item.getAttribute('d') ?? ''),
      }));
      const navigationGroups = Array.from(element.querySelectorAll('div'))
        .map((node) => String(node.textContent ?? '').replace(/\s+/g, ' ').trim())
        .filter((text) => ['Act on work', 'Trace money', 'Configure & connect', 'Workspace'].includes(text));
      const exactText = (root) => {
        const tokens = [];
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
        while (walker.nextNode()) {
          const value = String(walker.currentNode.textContent ?? '').replace(/\s+/g, ' ').trim();
          if (value) tokens.push(value);
        }
        return tokens.join(' ');
      };
      const text = exactText(element);
      return {
        screenLabel: element.getAttribute('data-screen-label'),
        viewport: { width: Math.round(rect.width), height: Math.round(rect.height) },
        elementCount: element.querySelectorAll('*').length,
        text,
        textSha256Input: text,
        rootDisplay: style.display,
        rootOverflow: style.overflow,
        rootColor: style.color,
        rootBackground: style.backgroundColor,
        structure: structure(element, true),
        geometry,
        links: Array.from(element.querySelectorAll('a')).map((link) => ({
          text: String(link.textContent ?? '').replace(/\s+/g, ' ').trim(),
          href: link.getAttribute('href') ?? '',
        })),
        controls: (() => {
          const tags = [element, ...element.querySelectorAll('*')].map((node) => node.getAttribute('data-reference-tag') || node.tagName.toLowerCase());
          return {
            links: tags.filter((tag) => tag === 'a').length,
            buttons: tags.filter((tag) => tag === 'button').length,
            inputs: tags.filter((tag) => tag === 'input').length,
            selects: tags.filter((tag) => tag === 'select').length,
            textareas: tags.filter((tag) => tag === 'textarea').length,
          };
        })(),
        navigationGroups,
        svgSignatures,
      };
    });
    const screenshot = path.join(OUTPUT, pngName(sourceId));
    const uncroppedScreenshot = `${screenshot}.uncropped.png`;
    await root.screenshot({ path: uncroppedScreenshot, type: 'png', animations: 'disabled', caret: 'hide' });
    await sharp(uncroppedScreenshot).extract({ left: 0, top: 0, width: contract.viewport.width, height: contract.viewport.height }).png().toFile(screenshot);
    fs.unlinkSync(uncroppedScreenshot);
    const screenshotBytes = fs.readFileSync(screenshot);
    await page.addScriptTag({ content: axeScript });
    const acceptedContrastSignatures = await page.evaluate(async () => {
      const result = await window.axe.run('[data-screen-label]', { runOnly: { type: 'rule', values: ['color-contrast'] }, resultTypes: ['violations'] });
      return [...new Set(result.violations.flatMap((violation) => violation.nodes.flatMap((node) => node.any.filter((check) => check.id === 'color-contrast' && check.data).map((check) => JSON.stringify([check.data.fgColor, check.data.bgColor, check.data.fontSize, check.data.fontWeight])))))];
    });
    const acceptedLinkContrastSignatures = await page.evaluate(async () => {
      const result = await window.axe.run('[data-screen-label]', { runOnly: { type: 'rule', values: ['link-in-text-block'] }, resultTypes: ['violations'] });
      return [...new Set(result.violations.flatMap((violation) => violation.nodes.map((node) => {
        const link = document.querySelector(node.target[0]);
        if (!link?.parentElement) return null;
        const style = getComputedStyle(link);
        return JSON.stringify([style.color, getComputedStyle(link.parentElement).color, style.fontSize, style.fontWeight, style.textDecorationLine]);
      }).filter(Boolean)))];
    });
    records.push({
      sourceId,
      browserViewport: page.viewportSize(),
      acceptedContrastSignatures,
      acceptedLinkContrastSignatures,
      archiveEntry: `handoff/pages/${sourceId}.dc.html`,
      screenshot: path.relative(ROOT, screenshot),
      screenshotSha256: sha256(screenshotBytes),
      screenLabel: contract.screenLabel,
      viewport: contract.viewport,
      elementCount: contract.elementCount,
      textSha256: sha256(stableText(contract.textSha256Input)),
      text: contract.text,
      root: {
        display: contract.rootDisplay,
        overflow: contract.rootOverflow,
        color: contract.rootColor,
        background: contract.rootBackground,
      },
      sourceMarkupFingerprint: sha256(JSON.stringify(contract.structure)),
      structure: contract.structure,
      geometry: contract.geometry,
      geometrySha256: sha256(JSON.stringify(contract.geometry)),
      links: contract.links,
      controls: contract.controls,
      navigationGroups: contract.navigationGroups,
      svgCount: contract.svgSignatures.length,
      svgSha256: sha256(JSON.stringify(contract.svgSignatures)),
    });
    process.stdout.write(`captured ${sourceId}\n`);
  }
} finally {
  await context.close();
  await browser.close();
  fs.rmSync(extractionRoot, { recursive: true, force: true });
}

const manifest = {
  schemaVersion: 1,
  evidenceKind: 'supplied-html-reference-render',
  archive: path.resolve(ARCHIVE),
  archiveSha256,
  pageCount: records.length,
  browser: 'chromium',
  deviceScaleFactor: 1,
  records,
};
fs.writeFileSync(path.join(OUTPUT, 'reference-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Captured ${records.length} exact supplied HTML reference pages in ${path.relative(ROOT, OUTPUT)}.`);
