#!/usr/bin/env node

/**
 * Build the canonical R1 logo outputs and the raster derivatives used by
 * browser metadata, PWA installs, social cards, and third-party packages.
 *
 * The supplied R1 lockups/wordmarks use live Instrument Sans text. This build
 * step converts that text to paths once, so every consumer gets the same
 * artwork without depending on a host font.
 */
import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const require = createRequire(import.meta.url);
const fontkit = require('fontkit');

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..');
const logoRoot = path.join(repoRoot, 'public', 'brand', 'unauth-r1');
const sourceRoot = path.join(logoRoot, 'source');
const generatedRoot = path.join(logoRoot, 'generated');
const fontPath = path.join(scriptDir, 'brand', 'InstrumentSans-SemiBold.ttf');
const font = fontkit.openSync(fontPath);

const TEXT_RE = /<text\s+([^>]+)>Unauth<\/text>/;
const ATTRIBUTE_RE = /([a-zA-Z-]+)="([^"]*)"/g;

function attrs(value) {
  return Object.fromEntries([...value.matchAll(ATTRIBUTE_RE)].map((match) => [match[1], match[2]]));
}

function number(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function format(value) {
  return Number(value.toFixed(4)).toString();
}

function outlinedText(textNode) {
  const properties = attrs(textNode[1]);
  const x = number(properties.x, 0);
  const baseline = number(properties.y, 42);
  const fontSize = number(properties['font-size'], 46);
  const letterSpacing = number(properties['letter-spacing'], -1);
  const fill = properties.fill ?? '#202020';
  const scale = fontSize / font.unitsPerEm;
  const run = font.layout('Unauth', { features: ['kern'] });
  let cursor = x;

  const paths = run.glyphs.map((glyph, index) => {
    const position = run.positions[index];
    const pathData = glyph.path.toSVG();
    const glyphX = cursor + (position.xOffset ?? 0) * scale;
    const glyphY = baseline + (position.yOffset ?? 0) * scale;
    cursor += position.xAdvance * scale;
    if (index < run.glyphs.length - 1) cursor += letterSpacing;

    return `    <path d="${pathData}" transform="translate(${format(glyphX)} ${format(glyphY)}) scale(${format(scale)} ${format(-scale)})" />`;
  });

  return `<g fill="${fill}" aria-hidden="true">\n${paths.join('\n')}\n  </g>`;
}

async function outlineLogo(fileName) {
  const sourcePath = path.join(sourceRoot, fileName);
  const destinationPath = path.join(logoRoot, fileName);
  const source = await fs.readFile(sourcePath, 'utf8');
  const match = source.match(TEXT_RE);
  if (!match) throw new Error(`Expected live text in ${fileName}`);
  const output = source.replace(match[0], outlinedText(match));
  await fs.writeFile(destinationPath, output);
  if (/<text\b/.test(output)) throw new Error(`Live text remains in ${destinationPath}`);
}

async function renderPng(sourceFile, outputFile, width, height) {
  const source = await fs.readFile(path.join(logoRoot, sourceFile));
  await sharp(source, { density: 300 })
    .resize(width, height, { fit: 'fill' })
    .png()
    .toFile(path.join(generatedRoot, outputFile));
}

async function renderSocialCard() {
  const logo = await sharp(await fs.readFile(path.join(logoRoot, 'unauth-r1-lockup-graphite.svg')), { density: 300 })
    .resize({ width: 520 })
    .png()
    .toBuffer();

  await sharp({
    create: {
      width: 1200,
      height: 630,
      channels: 4,
      background: '#FAFAFA',
    },
  })
    .composite([{ input: logo, left: 340, top: 266 }])
    .png()
    .toFile(path.join(generatedRoot, 'unauth-og-1200x630.png'));
}

async function copyAlias(sourceFile, aliasPath) {
  await fs.copyFile(path.join(logoRoot, sourceFile), path.join(repoRoot, aliasPath));
}

await fs.mkdir(generatedRoot, { recursive: true });

for (const fileName of [
  'unauth-r1-lockup-black.svg',
  'unauth-r1-lockup-graphite.svg',
  'unauth-r1-lockup-horizontal-white-on-graphite.svg',
  'unauth-r1-lockup-white.svg',
  'unauth-r1-wordmark-black.svg',
  'unauth-r1-wordmark-graphite.svg',
  'unauth-r1-wordmark-white-on-graphite.svg',
  'unauth-r1-wordmark-white.svg',
]) {
  await outlineLogo(fileName);
}

await renderPng('unauth-r1-favicon-graphite-on-white.svg', 'favicon-32x32.png', 32, 32);
await renderPng('unauth-r1-symbol-white-on-graphite.svg', 'apple-touch-icon-180x180.png', 180, 180);
await renderPng('unauth-r1-symbol-white-on-graphite.svg', 'pwa-icon-192x192.png', 192, 192);
await renderPng('unauth-r1-symbol-white-on-graphite.svg', 'pwa-icon-512x512.png', 512, 512);
await renderPng('unauth-r1-symbol-white-on-graphite.svg', 'pwa-icon-maskable-512x512.png', 512, 512);
await renderPng('unauth-r1-symbol-white-on-graphite.svg', 'chrome-icon-16.png', 16, 16);
await renderPng('unauth-r1-symbol-white-on-graphite.svg', 'chrome-icon-48.png', 48, 48);
await renderPng('unauth-r1-symbol-white-on-graphite.svg', 'chrome-icon-128.png', 128, 128);
await renderPng('unauth-r1-symbol-white-on-graphite.svg', 'zendesk-logo-128.png', 128, 128);
await renderPng('unauth-r1-symbol-white-on-graphite.svg', 'zendesk-logo-320.png', 320, 320);
await renderPng('unauth-r1-wordmark-graphite.svg', 'unauth-wordmark-graphite-2x.png', 440, 112);
await renderPng('unauth-r1-wordmark-white.svg', 'unauth-wordmark-white-2x.png', 440, 112);
await renderSocialCard();

await copyAlias('unauth-r1-favicon-graphite-on-white.svg', 'public/favicon.svg');
await copyAlias('unauth-r1-favicon-graphite-on-white.svg', 'public/logo-mark.svg');
await copyAlias('unauth-r1-wordmark-graphite.svg', 'public/logo-wordmark.svg');
await copyAlias('unauth-r1-wordmark-graphite.svg', 'public/logo-wordmark-light.svg');
await copyAlias('unauth-r1-wordmark-white.svg', 'public/logo-wordmark-dark.svg');
await fs.copyFile(path.join(generatedRoot, 'favicon-32x32.png'), path.join(repoRoot, 'public/favicon-32x32.png'));
await fs.copyFile(path.join(generatedRoot, 'apple-touch-icon-180x180.png'), path.join(repoRoot, 'public/apple-touch-icon.png'));
await fs.copyFile(path.join(generatedRoot, 'pwa-icon-192x192.png'), path.join(repoRoot, 'public/icon-192.png'));
await fs.copyFile(path.join(generatedRoot, 'pwa-icon-512x512.png'), path.join(repoRoot, 'public/icon-512.png'));
await fs.copyFile(path.join(generatedRoot, 'pwa-icon-maskable-512x512.png'), path.join(repoRoot, 'public/icon-512-maskable.png'));
await fs.copyFile(path.join(generatedRoot, 'unauth-wordmark-graphite-2x.png'), path.join(repoRoot, 'public/logo-wordmark.png'));
await renderPng('unauth-r1-favicon-graphite-on-white.svg', 'legacy-logo-mark-440.png', 440, 440);
await fs.copyFile(path.join(generatedRoot, 'legacy-logo-mark-440.png'), path.join(repoRoot, 'public/logo-mark.png'));

console.log(`Generated outlined logos and raster derivatives in ${generatedRoot}`);
