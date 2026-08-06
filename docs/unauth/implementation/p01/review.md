# P01 visual review

`PROVISIONAL — NOT CERTIFICATION EVIDENCE`

## Review boundary

This review covers the standalone P01 reference artifact and its deterministic captures only. It is not a product-route review, marketing approval, human signature, or certification evidence.

## Manual inspection

- Inspected all five normal 1440×900 frames as one contact sheet.
- Inspected all five normal 320×640 direct-reflow frames.
- Sampled error, permission, stale at 200% text, partial at actual 400% browser zoom, and unavailable states.
- Manifest completeness: 180/180 required frames.
- Horizontal overflow: 0/180 frames.
- Visual boundaries remain distinct: actual/ledger, estimated, modelled, recommendation, merchant decision, approved, received, residual, and rule recommendation.
- V02 monthly values are copied verbatim from the v1.2 display supplement; P12-owned chart/table regions are explicit structural `Unavailable` states and do not imply zero, success, or hidden data.

## Craft detector

The impeccable detector ran once after the v1.2 correction batch. It reported one warning for `SF Pro Text` not appearing in repository `DESIGN.md`, plus advisories for literal compact type sizes, radii, and tonal colors. These values are confined to the non-production P01 reference and implement the binding visual brief; no durable design-system change is claimed and `DESIGN.md` is intentionally unchanged.

## Independent finish review

The read-only `impeccable-finish-reviewer` found no material visual-craft defect. Advisories were confined to the non-production font exception, compact metadata requiring later production validation, Unicode status glyphs, and absent interactive treatments in a static reference. The reviewer also identified that the initial CDP page-scale capture did not prove 400% reflow. That evidence was replaced with a 320×256 CSS layout viewport at 4× device scale, producing a 1280×1024 physical PNG; all 30 corrected zoom rows now report `browser_zoom_percent: 400`, the narrow reflow layout, and no horizontal overflow.

For v1.2, the first finish round found four material evidence issues: implied `RECON-882` membership, an unnamed reconciliation V07 gap, a missing supplement hash in the capture manifest, and colliding mobile crumbs. One correction batch removed the implied member, added the explicit Unresolved ageing / V07 frame, bound the supplement and specification hashes, and split the mobile crumb. The second and final finish round returned **PASS** with no remaining material issue.

## Fixture-coverage resolution

Specification v1.2 resolves P01-BLOCK-001 without inventing data. The hashed, non-computing display supplement contains only verbatim P14-locked V02 strings and explicit structural `Unavailable` records for facts assigned to P12. The five references therefore prove composition and truthful unavailable handling while remaining invalid for production, P12 evidence, P14 capture, marketing or certification.

## Result

Visual craft and responsive-state work are complete for P01. No material visual defect remains; later P12-owned data obligations are recorded in `blockers.yaml` and do not block provisional P02 entry.
