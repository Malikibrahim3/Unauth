export function sourceAgnosticFlags(values: Record<string, string | undefined> = process.env) {
  const pilots = new Set((values.SOURCE_AGNOSTIC_PILOT_MERCHANTS ?? '').split(',').map((value) => value.trim()).filter(Boolean));
  return {
    readsEnabled: values.SOURCE_AGNOSTIC_READS === 'true',
    writesEnabled: values.SOURCE_AGNOSTIC_WRITES === 'true',
    pilotMerchantIds: pilots,
    readsForMerchant(merchantId: string) { return values.SOURCE_AGNOSTIC_READS === 'true' || pilots.has(merchantId); },
  };
}
