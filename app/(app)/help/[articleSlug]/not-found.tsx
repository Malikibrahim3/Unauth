import ExactNotFound from '@/components/system/ExactNotFound';

export default function HelpArticleNotFound() {
  return <ExactNotFound data-route-presentation="not-found" stateId="help-article-unknown-slug" surfaceId="help-article" returnHref="/help" />;
}
