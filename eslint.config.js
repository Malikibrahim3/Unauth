// @ts-check
const nextCwv = require("eslint-config-next/core-web-vitals");
const nextTs = require("eslint-config-next/typescript");

// Raw Tailwind color class pattern — matches things like text-red-500, bg-blue-200, etc.
// Used as an esquery regex selector inside no-restricted-syntax.
const RAW_TW_COLOR_SELECTOR_LITERAL =
  "JSXAttribute[name.name='className'] Literal[value=/\\b(?:text|bg|border|ring|fill|stroke|shadow|outline|decoration|accent|caret|divide|placeholder)-(?:red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|slate|gray|zinc|neutral|stone)-(?:[0-9]+|white|black)\\b/]";

const RAW_TW_COLOR_SELECTOR_TEMPLATE =
  "JSXExpressionContainer TemplateLiteral > TemplateElement[value.raw=/\\b(?:text|bg|border|ring|fill|stroke|shadow|outline|decoration|accent|caret|divide|placeholder)-(?:red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|slate|gray|zinc|neutral|stone)-(?:[0-9]+|white|black)\\b/]";

const RAW_TW_COLOR_MESSAGE =
  "Avoid raw Tailwind color classes (e.g. text-red-500, bg-blue-200) in components/**. " +
  "Use design-token CSS variables via custom utility classes instead. " +
  "Raw color classes are allowed in components/internal/.";

// WS0.4 — one renderer per data type. Direct Intl/toLocaleString formatting in
// app/** and components/** is a defect: use the canonical helpers in
// @/lib/utils/format (formatMoney/formatMoneyOrDash, formatNumber, formatDate/
// formatDateAbsolute/formatDateTime) and the enum label layer in @/lib/ui/labels.
const NO_INLINE_INTL_SELECTOR =
  'NewExpression[callee.object.name="Intl"][callee.property.name=/^(NumberFormat|DateTimeFormat)$/]';
const NO_INLINE_INTL_MESSAGE =
  "Do not construct Intl.NumberFormat/DateTimeFormat here. Use the canonical formatters in @/lib/utils/format (formatMoney/formatMoneyOrDash/formatNumber/formatDate/formatDateAbsolute/formatDateTime).";
const NO_TO_LOCALE_STRING_SELECTOR =
  'CallExpression[callee.property.name="toLocaleString"]';
const NO_TO_LOCALE_STRING_MESSAGE =
  "Do not call .toLocaleString() directly. Use formatNumber() (counts), formatMoney/formatMoneyOrDash (money) or formatDate*/formatDateTime (dates) from @/lib/utils/format.";

/** @type {import('eslint').Linter.Config[]} */
module.exports = [
  // Next.js core-web-vitals + typescript flat configs
  ...(Array.isArray(nextCwv) ? nextCwv : [nextCwv]),
  ...(Array.isArray(nextTs) ? nextTs : [nextTs]),

  // Global rules (mirrors old .eslintrc.json)
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/ban-ts-comment": "off",
      "prefer-const": "warn",
      "react/no-unescaped-entities": "off",
      "@next/next/no-img-element": "off",
      "react-hooks/exhaustive-deps": "warn",
      "react-hooks/purity": "off",
      "react-hooks/refs": "off",
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/use-memo": "off",
    },
  },

  // Phase 4A — no-restricted-imports: prevent bypassing SSOT constants
  // Blocks direct imports of scoring/weight constants from non-canonical locations.
  {
    files: ["**/*.{ts,tsx}"],
    ignores: ["lib/engine/weights.ts", "lib/scorer.ts", "scripts/**", "tests/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@/lib/utils/riskStyles",
              importNames: ["scoreToGrade"],
              message: "Import scoreToGrade from @/lib/engine/weights instead.",
            },
            {
              name: "@/lib/utils/confidenceStyles",
              importNames: ["CONFIDENCE_THRESHOLDS", "CONFIDENCE_GRADES"],
              message: "Import CONFIDENCE_THRESHOLDS from @/lib/engine/weights instead.",
            },
          ],
          patterns: [],
        },
      ],
    },
  },

  // Phase A — disallow raw Tailwind color classes in components/**
  // (except components/internal/*)
  {
    files: ["components/**/*.{ts,tsx}"],
    ignores: ["components/internal/**"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: RAW_TW_COLOR_SELECTOR_LITERAL,
          message: RAW_TW_COLOR_MESSAGE,
        },
        {
          selector: RAW_TW_COLOR_SELECTOR_TEMPLATE,
          message: RAW_TW_COLOR_MESSAGE,
        },
        { selector: NO_INLINE_INTL_SELECTOR, message: NO_INLINE_INTL_MESSAGE },
        { selector: NO_TO_LOCALE_STRING_SELECTOR, message: NO_TO_LOCALE_STRING_MESSAGE },
      ],
    },
  },

  // WS0.4 — ban inline Intl/toLocaleString formatting in app/** (route + page code)
  {
    files: ["app/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-syntax": [
        "error",
        { selector: NO_INLINE_INTL_SELECTOR, message: NO_INLINE_INTL_MESSAGE },
        { selector: NO_TO_LOCALE_STRING_SELECTOR, message: NO_TO_LOCALE_STRING_MESSAGE },
      ],
    },
  },
];
