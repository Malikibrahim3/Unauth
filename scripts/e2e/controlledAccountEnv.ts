/** Required inputs for controlled-account scripts. Never provide tenant defaults. */
export function requiredControlledAccountEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required for this controlled-account script`);
  return value;
}
