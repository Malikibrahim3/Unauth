import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const readmePath = path.join(repoRoot, 'README.md');
const weightsPath = path.join(repoRoot, 'lib/engine/weights.ts');
const descriptionsPath = path.join(repoRoot, 'lib/engine/signal-descriptions.ts');
const startMarker = '<!-- signals-table:start -->';
const endMarker = '<!-- signals-table:end -->';

function loadTsModule(filePath) {
  const source = fs.readFileSync(filePath, 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
    fileName: filePath,
  });

  const module = { exports: {} };
  const dirname = path.dirname(filePath);
  const localRequire = (specifier) => {
    if (specifier.startsWith('./') || specifier.startsWith('../')) {
      const resolved = path.resolve(dirname, specifier);

      if (fs.existsSync(resolved) && fs.statSync(resolved).isFile()) {
        return resolved.endsWith('.ts') ? loadTsModule(resolved) : require(resolved);
      }

      if (fs.existsSync(`${resolved}.ts`)) {
        return loadTsModule(`${resolved}.ts`);
      }

      if (fs.existsSync(`${resolved}.js`)) {
        return require(`${resolved}.js`);
      }
    }

    return require(specifier);
  };

  const wrapper = `(function(require, module, exports, __filename, __dirname) {${outputText}\n})`;
  const compiled = vm.runInThisContext(wrapper, { filename: filePath });
  compiled(localRequire, module, module.exports, filePath, dirname);

  return module.exports;
}

function validateSignalKeys(signalWeights, signalDescriptions) {
  const weightKeys = Object.keys(signalWeights);
  const descriptionKeys = Object.keys(signalDescriptions);
  const missingDescriptions = weightKeys.filter((key) => !(key in signalDescriptions));
  const extraDescriptions = descriptionKeys.filter((key) => !(key in signalWeights));

  if (missingDescriptions.length > 0 || extraDescriptions.length > 0) {
    const problems = [];

    if (missingDescriptions.length > 0) {
      problems.push(`Missing descriptions: ${missingDescriptions.join(', ')}`);
    }

    if (extraDescriptions.length > 0) {
      problems.push(`Unexpected descriptions: ${extraDescriptions.join(', ')}`);
    }

    throw new Error(problems.join('\n'));
  }
}

function buildTable(signalWeights, signalDescriptions) {
  const lines = [
    '| Signal | Weight | What it detects |',
    '| --- | ---: | --- |',
  ];

  for (const [signal, weight] of Object.entries(signalWeights)) {
    lines.push(`| \`${signal}\` | ${weight} | ${signalDescriptions[signal]} |`);
  }

  return lines.join('\n');
}

function replaceSignalsTable(readme, table) {
  const pattern = new RegExp(`${startMarker}[\\s\\S]*?${endMarker}`, 'm');

  if (!pattern.test(readme)) {
    throw new Error(`README.md is missing ${startMarker} / ${endMarker} markers.`);
  }

  return readme.replace(pattern, `${startMarker}\n${table}\n${endMarker}`);
}

function main() {
  const mode = process.argv[2];

  if (mode !== '--write' && mode !== '--check') {
    console.error('Usage: node scripts/generate-signals-readme.mjs --write|--check');
    process.exit(1);
  }

  const { SIGNAL_WEIGHTS } = loadTsModule(weightsPath);
  const { SIGNAL_DESCRIPTIONS } = loadTsModule(descriptionsPath);

  validateSignalKeys(SIGNAL_WEIGHTS, SIGNAL_DESCRIPTIONS);

  const table = buildTable(SIGNAL_WEIGHTS, SIGNAL_DESCRIPTIONS);
  const currentReadme = fs.readFileSync(readmePath, 'utf8');
  const nextReadme = replaceSignalsTable(currentReadme, table);

  if (mode === '--check') {
    if (currentReadme !== nextReadme) {
      console.error('README fraud signals table is out of sync. Run `npm run docs:generate`.');
      process.exit(1);
    }

    console.log('README fraud signals table is in sync.');
    return;
  }

  if (currentReadme !== nextReadme) {
    fs.writeFileSync(readmePath, nextReadme);
  }

  console.log('README fraud signals table generated.');
}

main();
