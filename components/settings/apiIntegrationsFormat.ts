const integrationDateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

export function formatIntegrationDate(value: string | null) {
  if (!value) return 'Never';
  return integrationDateFormatter.format(new Date(value));
}
