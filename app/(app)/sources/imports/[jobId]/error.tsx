"use client";

import { OperationalRouteError } from "@/components/states/OperationalRouteError";

export default function ImportJobError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <OperationalRouteError title="Import job could not be loaded" description="The retained job record and imported data are unchanged." reset={reset} digest={error.digest} fallbackHref="/sources/imports" />;
}
