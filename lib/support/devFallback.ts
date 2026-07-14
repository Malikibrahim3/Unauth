/** True only for a local/test runtime. Deployed preview and production are always false. */
export function isLocalSupportFallbackRuntime(input: {
  nodeEnv?: string;
  vercelEnv?: string;
}): boolean {
  if (input.vercelEnv === 'production' || input.vercelEnv === 'preview') return false;
  if (input.nodeEnv === 'production') return false;
  return input.nodeEnv === 'development' || input.nodeEnv === 'test' || input.vercelEnv === 'development';
}
