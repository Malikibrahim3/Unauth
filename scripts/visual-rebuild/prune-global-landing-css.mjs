import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import postcss from 'postcss';

const workspace = path.resolve(new URL('../..', import.meta.url).pathname);
const target = path.join(workspace, 'app/globals.css');
const source = await readFile(target, 'utf8');
const root = postcss.parse(source);

async function collectSourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...await collectSourceFiles(entryPath));
    } else if (/\.(?:css|jsx?|mdx|tsx?)$/.test(entry.name) && entryPath !== target) {
      files.push(entryPath);
    }
  }

  return files;
}

const sourceFiles = (
  await Promise.all(
    ['app', 'components', 'lib'].map((directory) =>
      collectSourceFiles(path.join(workspace, directory)),
    ),
  )
).flat();
const consumerSource = (
  await Promise.all(sourceFiles.map((file) => readFile(file, 'utf8')))
).join('\n');
const classPattern = /\.([_a-zA-Z]+[\w-]*)/g;

root.walkRules((rule) => {
  const retainedSelectors = (rule.selectors ?? [rule.selector]).filter((selector) => {
    if (!/\.ua-|\.cid-/.test(selector)) return true;
    const classes = [...selector.matchAll(classPattern)].map((match) => match[1]);
    return classes.some((className) => consumerSource.includes(className));
  });

  if (retainedSelectors.length === 0) {
    rule.remove();
  } else {
    rule.selectors = retainedSelectors;
  }
});

const remainingCss = root.toString();
root.walkDecls((declaration) => {
  if (!declaration.prop.startsWith('--landing-')) return;
  const reference = `var(${declaration.prop}`;
  if (!consumerSource.includes(reference) && !remainingCss.includes(reference)) {
    declaration.remove();
  }
});

root.walkComments((comment) => {
  if (/landing|warm|espresso|dusk|sky program/i.test(comment.text)) comment.remove();
});
root.walkAtRules((atRule) => {
  if (atRule.nodes && atRule.nodes.length === 0) atRule.remove();
});

await writeFile(target, `${root.toString().trim()}\n`);
