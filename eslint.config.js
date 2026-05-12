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
      ],
    },
  },
];
