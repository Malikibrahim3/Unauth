# Old-theme eradication report

Updated: 2026-07-13

## Result

The authenticated application no longer receives its visual identity from the legacy cream/espresso/rust token layers in `app/globals.css`. A new signed-in scope in `app/(app)/authenticated.css` overrides all shared semantic aliases at the authenticated layout boundary. Onboarding and the authenticated asynchronous setup route use the same system through `.ua-auth-surface`.

`npm run lint:authenticated-design` checks 374 authenticated route and component files and fails on prohibited legacy hex values, old copper/rust variables, or landing-token dependencies.

## Migration register

| Match/family | Classification | Resolution or reason |
|---|---|---|
| Legacy `--brand-rust*`, `--copper-*`, warm surface declarations in `app/globals.css` | Landing-page-only and permitted / compatibility source outside authenticated scope | Public landing work remains out of scope. Authenticated descendants override all aliases and cannot depend on the landing token names. |
| `--landing-*` and `--fl-*` token families | Landing-page-only and permitted | Retained unchanged for the public site. Static guard prohibits use from authenticated code. |
| `LandingPrimitives.tsx`, public hero/roadmap/network components, and landing CSS modules | Landing-page-only and permitted | These are marketing assets and are not imported by authenticated route code. |
| `components/ui/tokens.ts` legacy public prototype constants | Landing-page-only and permitted / currently unimported by authenticated code | Excluded from the authenticated static scan; no authenticated import exists. |
| Founding merchant application hardcoded rust/cream values | Removed | Replaced with authenticated semantic input, text, border, and critical-state tokens. |
| Onboarding `--copper-glow` active/CTA states | Removed | Replaced with selected-surface and canonical primary-action tokens. Ordinary setup cards are shadowless. |
| Customer filter chip `--copper-glow` | Removed | Replaced with selected surface, neutral ink, and accent border. |
| Badge accent `--copper-glow` | Removed | Replaced with the canonical pale selection treatment. |
| ECharts reading tokens from `document.documentElement` | Removed | Charts now read from `.ua-app`/`.ua-auth-surface`, preventing root landing colours from leaking into authenticated charts. |
| Semantic chart colours | Data visualisation and documented | Green/amber/red/blue remain only for recovery, attention, loss/risk, and information series. |
| Provider/product brand marks | Third-party component | Provider names and any official marks identify connections; they do not define the Unauth product theme. |
| Literal `#1234` strings in help examples | False positive | Example order identifiers, not colours. |

## Verification

- Static authenticated scan: passed, 374 files.
- Live computed-style scan on the authenticated Integrations surface: no legacy rust/cream values detected in the sampled rendered tree.
- Landing isolation: no landing files were changed by the authenticated token migration.
