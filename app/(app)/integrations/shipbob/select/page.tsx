import ShipBobAccountSelectionClient from './ShipBobAccountSelectionClient';

export default async function ShipBobAccountSelectionPage({
  searchParams,
}: {
  searchParams: Promise<{ selection?: string }>;
}) {
  const { selection = '' } = await searchParams;
  return <ShipBobAccountSelectionClient selectionId={selection} />;
}
