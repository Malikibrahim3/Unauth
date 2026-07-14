import "../../styles/authenticated/index.css";

export default function OnboardingRouteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="ua-auth-surface min-h-screen">{children}</div>;
}
