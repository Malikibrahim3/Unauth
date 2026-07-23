/** Shared column template for the connector table — the header row in
 * app/(app)/integrations/page.tsx and every ConnectorRow must stay in
 * lockstep or columns drift out of alignment. Lives in its own module so
 * both server (page) and client (row) code can import it. */
export const CONNECTOR_GRID_CLASS =
  "grid min-w-0 grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_auto] xl:min-w-[780px] xl:grid-cols-[minmax(170px,1.35fr)_110px_minmax(180px,1.4fr)_65px_110px_16px] xl:gap-3";
