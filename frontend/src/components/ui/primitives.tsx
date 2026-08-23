import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function Panel({
  className,
  children,
  glass,
  interactive = true,
}: {
  className?: string;
  children: ReactNode;
  glass?: boolean;
  interactive?: boolean;
}) {
  return (
    <section
      className={cn(
        glass ? "glass-card" : "surface-card",
        interactive && "hover-lift",
        "overflow-hidden",
        className,
      )}
    >
      {children}
    </section>
  );
}

export function PanelHead({
  title,
  subtitle,
  icon,
  action,
  className,
}: {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 px-6 pt-6 pb-4 sm:px-7",
        className,
      )}
    >
      <div className="flex min-w-0 items-start gap-3">
        {icon ? (
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
            {icon}
          </span>
        ) : null}
        <div className="min-w-0">
          <h2 className="text-[15px] font-semibold leading-snug text-foreground">{title}</h2>
          {subtitle ? (
            <p className="mt-0.5 text-[13px] leading-snug text-muted-foreground">{subtitle}</p>
          ) : null}
        </div>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  );
}

export function Pill({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: "neutral" | "primary" | "success" | "warning" | "danger" | "violet";
  className?: string;
}) {
  const tones: Record<string, string> = {
    neutral: "bg-muted text-muted-foreground",
    primary: "bg-primary-soft text-primary",
    success: "bg-success-soft text-success",
    warning: "bg-warning-soft text-warning",
    danger: "bg-danger-soft text-danger",
    violet: "bg-violet-soft text-violet",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-tight",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Meter({ value, tone = "primary" }: { value: number; tone?: string }) {
  const color =
    tone === "danger"
      ? "var(--danger)"
      : tone === "warning"
        ? "var(--warning)"
        : tone === "success"
          ? "var(--success)"
          : "var(--primary)";
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-muted">
      <div
        className="h-full rounded-full transition-[width] duration-700 ease-out"
        style={{ width: `${Math.min(100, value)}%`, background: color }}
      />
    </div>
  );
}

export function Ring({
  value,
  size = 92,
  label,
  sub,
}: {
  value: number;
  size?: number;
  label?: string;
  sub?: string;
}) {
  const stroke = 8;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const tone = value >= 85 ? "var(--success)" : value >= 65 ? "var(--warning)" : "var(--danger)";
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="var(--surface-muted)"
          strokeWidth={stroke}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={tone}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={c}
          strokeDashoffset={c - (c * Math.min(100, value)) / 100}
          style={{ transition: "stroke-dashoffset 1s cubic-bezier(.22,1,.36,1)" }}
        />
      </svg>
      <div className="absolute text-center">
        <div className="text-lg font-bold tabular-nums text-foreground">{label ?? `${value}%`}</div>
        {sub ? <div className="text-[10px] font-medium text-muted-foreground">{sub}</div> : null}
      </div>
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-6 pb-2">
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
          {eyebrow}
        </p>
        <h1 className="mt-2 text-3xl font-bold text-foreground">{title}</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{description}</p>
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  hint,
  action,
}: {
  icon: ReactNode;
  title: string;
  hint: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center">
      <span className="grid size-14 place-items-center rounded-2xl bg-surface-muted text-muted-foreground">
        {icon}
      </span>
      <div>
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="mt-1 text-[13px] text-muted-foreground">{hint}</p>
      </div>
      {action}
    </div>
  );
}
