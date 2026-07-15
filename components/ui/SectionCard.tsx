import { type CSSProperties, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SectionCardProps {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  density?: "default" | "compact";
  id?: string;
  className?: string;
  style?: CSSProperties;
}

export function SectionCard({
  title,
  description,
  actions,
  children,
  density = "default",
  id,
  className,
  style,
}: SectionCardProps) {
  const bodyPadding = density === "compact" ? "p-3" : "p-4";

  return (
    <section
      id={id}
      className={cn("overflow-hidden", className)}
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--ua-radius-card)",
        boxShadow: "none",
        ...style,
      }}
    >
      {/* Header */}
      <div
        className="ua-panel-header flex flex-wrap items-start justify-between gap-3 sm:items-center"
        style={{
          borderBottom: "1px solid var(--border-muted)",
          padding: "var(--space-3) var(--space-4)",
        }}
      >
        <div className="min-w-0 flex-1">
          <div className="text-h3" style={{ color: "var(--text-primary)" }}>
            {title}
          </div>
          {description && (
            <p
              className="mt-1 text-small"
              style={{ color: "var(--text-secondary)" }}
            >
              {description}
            </p>
          )}
        </div>
        {actions && (
          <div className="flex max-w-full shrink-0 flex-wrap items-center gap-2">
            {actions}
          </div>
        )}
      </div>

      {/* Body */}
      <div className={cn(bodyPadding, "bg-[var(--surface)]")}>{children}</div>
    </section>
  );
}
