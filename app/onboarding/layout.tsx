import { AuthenticatedSurfaceTelemetry } from "@/components/product/AuthenticatedSurfaceTelemetry";

export default function OnboardingRouteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className="ua-auth-surface min-h-screen"
      data-ui-version="decision-ledger-instrument-grade-entry"
      data-readiness="shell-ready auth-resolved"
      data-shell-ready="true"
      data-auth-resolved="true"
    >
      <AuthenticatedSurfaceTelemetry />
      {children}
    </div>
  );
}
