import { OperationalRouteSkeleton } from "@/components/states/OperationalRouteSkeleton";

export default function ImportJobLoading() {
  return <OperationalRouteSkeleton title="Loading import job" rows={5} detail showRail />;
}
