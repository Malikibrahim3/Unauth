import { ChevronRight } from "lucide-react";
import { isValidElement, type ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  PAGE_EYEBROW_STYLE,
  PAGE_HEADER_STYLE,
  PAGE_SHELL_INNER_CLASS,
  PAGE_SUBTITLE_STYLE,
  PAGE_TITLE_STYLE,
} from "@/components/ui/pageShellStyles";

interface Breadcrumb {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  breadcrumbs?: Breadcrumb[];
  primaryAction?: ReactNode;
  secondaryActions?: ReactNode[];
  meta?: ReactNode;
  metricSlot?: ReactNode;
  tabs?: ReactNode;
  statusBadge?: ReactNode;
  className?: string;
}

export type { Breadcrumb };

export function PageHeader({
  title,
  subtitle,
  eyebrow,
  breadcrumbs,
  primaryAction,
  secondaryActions,
  meta,
  metricSlot,
  tabs,
  statusBadge,
  className,
}: PageHeaderProps) {
  return (
    <header
      className={cn(PAGE_SHELL_INNER_CLASS, className)}
      style={PAGE_HEADER_STYLE}
    >
      {/* Breadcrumbs */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav aria-label="Breadcrumb" className="flex items-center gap-1 mb-2">
          {breadcrumbs.map((crumb, i) => (
            <span
              key={crumb.href ?? crumb.label}
              className="flex items-center gap-1"
              style={{ fontSize: 12, color: "var(--text-tertiary)" }}
            >
              {i > 0 && (
                <ChevronRight
                  size={12}
                  aria-hidden="true"
                  style={{ opacity: 0.5 }}
                />
              )}
              {crumb.href ? (
                <Link
                  href={crumb.href}
                  className="hover:underline transition-colors"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {crumb.label}
                </Link>
              ) : (
                <span style={{ color: "var(--text-tertiary)" }}>
                  {crumb.label}
                </span>
              )}
            </span>
          ))}
        </nav>
      )}

      {/* Eyebrow overline — Ramp-style category label */}
      {eyebrow && (
        <div className="mb-2" style={PAGE_EYEBROW_STYLE}>
          {eyebrow}
        </div>
      )}

      {/* Title row */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="break-words" style={PAGE_TITLE_STYLE}>
              {title}
            </h1>
            {statusBadge}
          </div>
          {subtitle && (
            <p className="mt-2" style={PAGE_SUBTITLE_STYLE}>
              {subtitle}
            </p>
          )}
        </div>
        {(primaryAction ||
          (secondaryActions && secondaryActions.length > 0)) && (
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {secondaryActions?.map((action) => (
              <span
                key={
                  isValidElement(action) && action.key != null
                    ? String(action.key)
                    : typeof action === "string"
                      ? action
                      : "secondary-action"
                }
              >
                {action}
              </span>
            ))}
            {primaryAction}
          </div>
        )}
      </div>

      {/* Meta row */}
      {meta && (
        <div className="mt-3 flex flex-wrap items-center gap-2.5">{meta}</div>
      )}

      {/* Metric slot */}
      {metricSlot && (
        <div className="mt-5 flex flex-wrap items-baseline gap-6">
          {metricSlot}
        </div>
      )}

      {/* Tabs row */}
      {tabs && <div className="mt-6">{tabs}</div>}
    </header>
  );
}
