"use client";

import { OperationalRouteError } from "@/components/states/OperationalRouteError";

export default function SourceCatalogueError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <OperationalRouteError title="Source catalogue is unavailable" description="Existing connections and provider credentials are unchanged." reset={reset} digest={error.digest} fallbackHref="/sources/connected" />;
}
