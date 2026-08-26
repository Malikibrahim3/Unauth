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

## Root security follow-up

The clean-install audit initially found production-transitive advisories in
`brace-expansion` and `fast-uri`. Compatible lockfile updates now resolve them
to patched releases (`brace-expansion` 5.0.9 on the Sentry glob path and
`fast-uri` 3.1.6). The development-only `js-yaml` advisory is likewise
resolved to 3.15.2.

The root `sharp` development dependency required the 0.35 major line because
the advisory is inherited from libvips and has no patched 0.34 release. It is
isolated in its own commit, with the existing image-verification scripts as
the compatibility surface. A clean install, image-script checks, production
build, and full audit are required before accepting that commit. The final
root audit must report zero high or critical findings in both full and
`--omit=dev` modes.
