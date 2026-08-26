import { OperationalRouteSkeleton } from "@/components/states/OperationalRouteSkeleton";

export default function SourceCatalogueLoading() {
  return <OperationalRouteSkeleton title="Loading source catalogue" rows={6} kpiCount={0} showInsight={false} showRail={false} />;
}
