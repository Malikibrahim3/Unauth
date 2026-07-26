import { AuthUiCohortTelemetry } from "@/components/product/AuthUiCohortTelemetry";

export default function OnboardingRouteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="ua-auth-surface min-h-screen" data-ui-version="authenticated-v2">
      <AuthUiCohortTelemetry />
      {children}
    </div>
  );
}
