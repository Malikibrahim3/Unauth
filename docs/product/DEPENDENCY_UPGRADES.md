# Dependency upgrade receipt

Recorded: 26 August 2026.

Routine root updates are in `chore: update dependencies and repository
hygiene`. They stay within the existing major lines: Next/ESLint 16, React 19,
Supabase 0.10/2.x, Playwright 1.x, Sentry 10.x, Tailwind 4.x, and compatible
patch/minor updates for the remaining tooling. The lockfile is the install
authority and `npm ci` is required.

## Isolated Chrome extension major

The extension’s previous Vite 5 line carried three high-severity advisories
(Vite path traversal/UNC handling and transitive PostCSS/nanoid issues) and one
moderate development-server advisory. The available remediation required the
Vite 8 major line, so it is isolated here rather than hidden in an audit fix.

- `vite`: 5.4.x → 8.2.2
- `@vitejs/plugin-react`: 4.x → 6.1.0 (the Vite 8-compatible plugin)
- `@types/react`: patch update within React 18
- Node/npm are pinned to the repository’s Node 22/npm 10.9.2 toolchain.

Compatibility proof: `npm ci` in `extensions/chrome`, `npm run build`, and a
live `npm audit` all pass with zero vulnerabilities. The Vite config’s existing
multi-entry popup/background/content build and asset-copy plugin remain intact;
the generated `extensions/chrome/dist` output is still committed because the
runtime download route serves it.
