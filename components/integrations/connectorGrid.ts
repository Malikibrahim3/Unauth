/** Shared column template for the connector table — the header row in
 * app/(app)/integrations/page.tsx and every ConnectorRow must stay in
 * lockstep or columns drift out of alignment. Lives in its own module so
 * both server (page) and client (row) code can import it. */
export const CONNECTOR_GRID_CLASS =
  "grid min-w-[820px] grid-cols-[minmax(220px,1.35fr)_150px_minmax(240px,1.4fr)_100px_160px_24px] gap-4";
