const FALLBACK_PATH = "/dashboard";

/** Accept only same-origin application paths for post-auth navigation. */
export function safeRedirectPath(candidate: string | null | undefined): string {
  if (
    !candidate ||
    !candidate.startsWith("/") ||
    candidate.startsWith("//") ||
    candidate.includes("\\")
  ) {
    return FALLBACK_PATH;
  }

  try {
    const parsed = new URL(candidate, "https://application.local");
    if (parsed.origin !== "https://application.local") return FALLBACK_PATH;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return FALLBACK_PATH;
  }
}
