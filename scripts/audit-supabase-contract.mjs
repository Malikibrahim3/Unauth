import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const root = process.cwd();
const sourceRoots = ['app', 'components', 'lib'];
// Retained compatibility modules that are not imported by the authenticated UI
// data plane. They describe the archived v1 graph and are intentionally kept
// out of the live-v2 contract check until those public/fixture APIs are removed.
const archivedV1Modules = new Set([
  'lib/analysis/entityResolution.ts',
  'lib/engine/fastContext.ts',
  'lib/gorgias/widgetData.ts',
  'lib/supabase/merchantHelpers.ts',
  'lib/support/intake/claimSummary.ts',
  'lib/support/intake/linkSupportCase.ts',
]);

function parse(file) {
  return ts.createSourceFile(
    file,
    fs.readFileSync(file, 'utf8'),
    ts.ScriptTarget.Latest,
    true,
    file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
}

function propertyName(node) {
  if (!node) return null;
  if (ts.isIdentifier(node) || ts.isStringLiteral(node)) return node.text;
  return null;
}

function findPropertyType(node, name) {
  if (!node || !ts.isTypeLiteralNode(node)) return null;
  const member = node.members.find((candidate) =>
    ts.isPropertySignature(candidate) && propertyName(candidate.name) === name
  );
  return member && ts.isPropertySignature(member) ? member.type : null;
}

function readSchema() {
  const file = path.join(root, 'lib/supabase/types.ts');
  const source = parse(file);
  let databaseType = null;
  source.forEachChild((node) => {
    if (ts.isTypeAliasDeclaration(node) && node.name.text === 'Database') {
      databaseType = node.type;
    }
  });
  const publicType = findPropertyType(databaseType, 'public');
  const tablesType = findPropertyType(publicType, 'Tables');
  if (!tablesType || !ts.isTypeLiteralNode(tablesType)) {
    throw new Error('Could not read Database.public.Tables from lib/supabase/types.ts');
  }

  const schema = new Map();
  for (const tableMember of tablesType.members) {
    if (!ts.isPropertySignature(tableMember) || !tableMember.type) continue;
    const table = propertyName(tableMember.name);
    const rowType = findPropertyType(tableMember.type, 'Row');
    if (!table || !rowType || !ts.isTypeLiteralNode(rowType)) continue;
    schema.set(table, new Set(rowType.members.flatMap((member) => {
      if (!ts.isPropertySignature(member)) return [];
      const name = propertyName(member.name);
      return name ? [name] : [];
    })));
  }
  return schema;
}

function readTableConstants() {
  const file = path.join(root, 'lib/supabase/tables.ts');
  const source = parse(file);
  const constants = new Map();
  function visit(node) {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === 'TABLES') {
      let initializer = node.initializer;
      if (initializer && ts.isAsExpression(initializer)) initializer = initializer.expression;
      if (initializer && ts.isObjectLiteralExpression(initializer)) {
        for (const property of initializer.properties) {
          if (!ts.isPropertyAssignment(property) || !ts.isStringLiteral(property.initializer)) continue;
          const name = propertyName(property.name);
          if (name) constants.set(name, property.initializer.text);
        }
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  return constants;
}

function listFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) return [];
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return listFiles(full);
    return /\.(ts|tsx)$/.test(entry.name) ? [full] : [];
  });
}

function resolveTableArgument(argument, constants) {
  if (ts.isStringLiteral(argument) || ts.isNoSubstitutionTemplateLiteral(argument)) return argument.text;
  if (
    ts.isPropertyAccessExpression(argument) &&
    ts.isIdentifier(argument.expression) &&
    argument.expression.text === 'TABLES'
  ) return constants.get(argument.name.text) ?? null;
  return null;
}

function tableFromChain(node, constants) {
  if (ts.isCallExpression(node)) {
    if (ts.isPropertyAccessExpression(node.expression)) {
      if (node.expression.name.text === 'from' && node.arguments[0]) {
        return resolveTableArgument(node.arguments[0], constants);
      }
      return tableFromChain(node.expression.expression, constants);
    }
    return null;
  }
  if (ts.isPropertyAccessExpression(node)) return tableFromChain(node.expression, constants);
  if (ts.isParenthesizedExpression(node) || ts.isAsExpression(node)) return tableFromChain(node.expression, constants);
  return null;
}

function selectedColumns(value) {
  const parts = [];
  let depth = 0;
  let current = '';
  for (const char of value) {
    if (char === '(') depth += 1;
    if (char === ')') depth = Math.max(0, depth - 1);
    if (char === ',' && depth === 0) {
      parts.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  parts.push(current);
  return parts.flatMap((part) => {
    const column = part.trim();
    if (!column || column === '*' || /[!():]/.test(column)) return [];
    return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(column) ? [column] : [];
  });
}

const columnMethods = new Set([
  'eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'like', 'ilike', 'is', 'in', 'contains',
  'containedBy', 'overlaps', 'textSearch', 'not', 'filter', 'order',
]);
const writeMethods = new Set(['insert', 'update', 'upsert']);

function lineOf(source, node) {
  return source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;
}

const schema = readSchema();
const constants = readTableConstants();
const violations = [];

for (const [constant, table] of constants) {
  if (!schema.has(table)) {
    violations.push(`lib/supabase/tables.ts: TABLES.${constant} points to missing table ${table}`);
  }
}

for (const file of sourceRoots.flatMap((dir) => listFiles(path.join(root, dir)))) {
  if (file.endsWith('lib/supabase/types.ts') || file.endsWith('lib/supabase/legacyV1Types.ts')) continue;
  if (archivedV1Modules.has(path.relative(root, file))) continue;
  const source = parse(file);
  function visit(node) {
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
      const method = node.expression.name.text;
      const table = tableFromChain(node.expression.expression, constants);
      if (table) {
        const rel = path.relative(root, file);
        const location = `${rel}:${lineOf(source, node)}`;
        const columns = schema.get(table);
        if (!columns) {
          violations.push(`${location}: references missing table ${table}`);
        } else if (method === 'select' && node.arguments[0] && ts.isStringLiteralLike(node.arguments[0])) {
          for (const column of selectedColumns(node.arguments[0].text)) {
            if (!columns.has(column)) violations.push(`${location}: ${table}.${column} does not exist`);
          }
        } else if (columnMethods.has(method) && node.arguments[0] && ts.isStringLiteralLike(node.arguments[0])) {
          const column = node.arguments[0].text;
          if (!column.includes('.') && !columns.has(column)) {
            violations.push(`${location}: ${table}.${column} does not exist`);
          }
        } else if (writeMethods.has(method) && node.arguments[0]) {
          const values = ts.isArrayLiteralExpression(node.arguments[0])
            ? node.arguments[0].elements
            : [node.arguments[0]];
          for (const value of values) {
            if (!ts.isObjectLiteralExpression(value)) continue;
            for (const property of value.properties) {
              if (!ts.isPropertyAssignment(property) && !ts.isShorthandPropertyAssignment(property)) continue;
              const column = propertyName(property.name);
              if (column && !columns.has(column)) {
                violations.push(`${location}: write targets missing ${table}.${column}`);
              }
            }
          }
        }
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
}

if (violations.length > 0) {
  console.error(`Supabase contract audit failed (${violations.length}):`);
  for (const violation of violations) console.error(`- ${violation}`);
  process.exit(1);
}

console.log(`Supabase contract audit passed (${schema.size} live tables checked).`);
