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
  /** Use when the parent working surface already owns the perimeter. */
  joined?: boolean;
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
  joined = false,
}: SectionCardProps) {
  const bodyPadding = density === "compact" ? "ua-section-card__body--compact" : "ua-section-card__body--default";

  return (
    <section
      id={id}
      className={cn("ua-section-card", joined && "ua-section-card--joined", className)}
      style={style}
    >
      {/* Header */}
      <div
        className="ua-section-card__header flex flex-wrap items-start justify-between gap-3 sm:items-center"
      >
        <div className="min-w-0 flex-1">
          <div className="ua-section-card__title text-h3">
            {title}
          </div>
          {description && (
            <p
              className="ua-section-card__description mt-1 text-small"
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
      <div className={cn("ua-section-card__body", bodyPadding)}>{children}</div>
    </section>
  );
}
