import { HELP_ARTICLES, getHelpArticle } from '@/lib/help/registry';

const REQUIRED_SLUGS = [
  'activation',
  'source-repair',
  'work-queue',
  'case-investigation',
  'external-handoff',
  'recovery-submission',
  'credit-reconciliation',
  'roles-permissions',
  'privacy-requests',
  'api-access',
] as const;

describe('pilot help registry', () => {
  it('contains one complete article for every MR5 critical job', () => {
    const slugs = HELP_ARTICLES.map((article) => article.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(slugs).toEqual(expect.arrayContaining(REQUIRED_SLUGS));

    for (const slug of REQUIRED_SLUGS) {
      const article = getHelpArticle(slug);
      expect(article?.sections.length).toBeGreaterThan(0);
      expect(article?.sections.every((section) => section.paragraphs.length > 0)).toBe(true);
      expect(article?.related.length).toBeGreaterThan(0);
    }
  });

  it('uses direct internal destinations and never links to a missing help article', () => {
    for (const article of HELP_ARTICLES) {
      for (const related of article.related) {
        expect(related.href).toMatch(/^\/[a-z0-9]/);
        expect(related.href).not.toBe('/help');
        if (related.href.startsWith('/help/')) {
          const slug = related.href.slice('/help/'.length).split(/[?#]/)[0];
          expect(getHelpArticle(slug)).not.toBeNull();
        }
      }
    }
  });
});
