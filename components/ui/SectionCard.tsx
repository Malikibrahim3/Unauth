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
  const bodyPadding = density === "compact" ? "p-3" : "p-4";

  return (
    <section
      id={id}
      className={cn(joined ? "border-b border-[#eae8e5] bg-white last:border-b-0" : "overflow-hidden rounded-xl border border-[#e4e3e0] bg-white", className)}
      style={style}
    >
      {/* Header */}
      <div
        className="flex flex-wrap items-start justify-between gap-3 border-b border-[#eae8e5] px-4 py-3 sm:items-center"
      >
        <div className="min-w-0 flex-1">
          <h2 className="m-0 text-[13px] font-medium leading-5 text-[#1c1f23]">
            {title}
          </h2>
          {description && (
            <p
              className="mt-1 text-[11.5px] leading-[1.45] text-[#64686d]"
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
      <div className={cn("flex flex-col gap-3", bodyPadding)}>{children}</div>
    </section>
  );
}
