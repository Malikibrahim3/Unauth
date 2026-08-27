"use client";

import { OperationalRouteError } from "@/components/states/OperationalRouteError";

export default function SourceSetupError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <OperationalRouteError title="Provider setup could not be loaded" description="No credentials, mapping or activation state were changed." reset={reset} digest={error.digest} fallbackHref="/sources/browse" />;
}
