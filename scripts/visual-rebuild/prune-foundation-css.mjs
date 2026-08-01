import { readFile, writeFile } from 'node:fs/promises';
import postcss from 'postcss';

const target = new URL('../../app/(public)/landing/_components/foundation/foundation.module.css', import.meta.url);
const source = await readFile(target, 'utf8');
const root = postcss.parse(source);

const active = new Set([
  'collapseDetails', 'collapseIcon', 'collapseRoot', 'collapseToggle', 'dusk',
  'finalField', 'hero2Copy', 'hero2Field', 'hero2Headline', 'hero2Layout',
  'hero2Subtitle', 'heroAssurance', 'heroCopy', 'heroCtaPrimary', 'heroCtaRow',
  'heroCtaSecondary', 'heroEyebrow', 'heroHeadline', 'heroLayout',
  'heroNavActions', 'heroNavCentre', 'heroNavCta', 'heroNavCtaArrow',
  'heroNavCtaText', 'heroNavLink', 'heroNavLogoGroup', 'heroNavMenuBtn',
  'heroNavRight', 'heroNavSheet', 'heroNavSheetLight', 'heroNavSheetLink',
  'heroNavSheetSignIn', 'heroNavSignIn', 'heroNavbar', 'heroNavbarInner',
  'heroNavbarLight', 'heroProductImage', 'heroProductOuter', 'heroSubtitle',
  'integrationProof', 'integrationProofBody', 'integrationProofList',
  'integrationProofTitle', 'landingHeadings', 'landingSectionBody',
  'landingSectionFaqAnswer', 'landingSectionFaqQuestion', 'landingSectionLead',
  'landingSectionTitle', 'landingSubsectionTitle', 'pricingCreditsField',
  'pricingField', 'pricingTierBadge', 'pricingTierCard', 'pricingTierCardFeatured',
  'pricingTierCta', 'pricingTierCtaPrimary', 'pricingTierCtaSecondary', 'pricingTierFeatures',
  'pricingTierPrice', 'productProofBand', 'productProofBandInner',
  'productProofBandTitle', 'productProofCaption', 'productProofCopy',
  'productProofFigure', 'productProofImage', 'productProofLayout',
  'productProofLink', 'productProofSteps', 'productProofTopline', 'riseIn',
]);

const classPattern = /\.([_a-zA-Z]+[\w-]*)/g;
let changed = true;
while (changed) {
  changed = false;
  root.walkRules((rule) => {
    const classes = [...rule.selector.matchAll(classPattern)].map((match) => match[1]);
    if (!classes.some((name) => active.has(name))) return;
    rule.walkDecls('composes', (decl) => {
      for (const name of decl.value.split(/\s+/)) {
        if (name && name !== 'from' && !active.has(name)) {
          active.add(name);
          changed = true;
        }
      }
    });
  });
}

root.walkRules((rule) => {
  const selectors = rule.selectors ?? [rule.selector];
  const retainedSelectors = selectors.filter((selector) => {
    const classes = [...selector.matchAll(classPattern)].map((match) => match[1]);
    return classes.length === 0 || classes.every((name) => active.has(name));
  });

  if (retainedSelectors.length === 0) {
    rule.remove();
    return;
  }

  rule.selectors = retainedSelectors;
});

root.walkComments((comment) => comment.remove());
root.walkAtRules((atRule) => {
  if (atRule.nodes && atRule.nodes.length === 0) atRule.remove();
});

await writeFile(target, `${root.toString().trim()}\n`);
