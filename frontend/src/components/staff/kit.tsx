import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import {
  Bell,
  Building2,
  CircleAlert,
  Cpu,
  FileText,
  LayoutGrid,
  Settings,
  UserRound,
  Wrench,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Panel, Pill } from "@/components/ui/primitives";
import type { Tone } from "@/lib/staff";

/* -------------------------------- Breadcrumbs ------------------------------- */

export function StaffCrumbs({ trail }: { trail: { label: string; to?: string }[] }) {
  return (
    <nav className="flex flex-wrap items-center gap-2 text-[12px] text-muted-foreground">
      <Link to="/staff" className="transition-colors hover:text-foreground">
        Department Staff
      </Link>
      {trail.map((t) => (
        <span key={t.label} className="flex items-center gap-2">
          <span className="text-border-strong">/</span>
          {t.to ? (
            <Link to={t.to} className="transition-colors hover:text-foreground">
              {t.label}
            </Link>
          ) : (
            <span className="font-semibold text-foreground">{t.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

/* ----------------------------------- Tabs ----------------------------------- */

const tabs = [
  { key: "dashboard", label: "Dashboard", to: "/staff", icon: LayoutGrid },
  { key: "equipment", label: "Equipment", to: "/staff/equipment", icon: Cpu },
  { key: "complaints", label: "Complaints", to: "/staff/complaints", icon: CircleAlert },
  { key: "maintenance", label: "Maintenance", to: "/staff/maintenance", icon: Wrench },
  { key: "reports", label: "Service reports", to: "/staff/reports", icon: FileText },
  { key: "department", label: "Department", to: "/staff/department", icon: Building2 },
  { key: "notifications", label: "Notifications", to: "/staff/notifications", icon: Bell },
  { key: "profile", label: "Profile", to: "/staff/profile", icon: UserRound },
  { key: "settings", label: "Settings", to: "/staff/settings", icon: Settings },
];

export function StaffTabs({ active }: { active: string }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-2xl border border-border bg-surface p-1.5 shadow-xs">
      {tabs.map((t) => (
        <Link
          key={t.key}
          to={t.to}
          className={cn(
            "inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-[12.5px] font-semibold transition-all",
            active === t.key
              ? "bg-primary-soft text-primary"
              : "text-muted-foreground hover:bg-surface-muted hover:text-foreground",
          )}
        >
          <t.icon className="size-3.5" />
          {t.label}
        </Link>
      ))}
    </div>
  );
}

/* ----------------------------------- KPIs ----------------------------------- */

const toneText: Record<string, string> = {
  neutral: "text-muted-foreground",
  primary: "text-primary",
  success: "text-success",
  warning: "text-warning",
  danger: "text-danger",
  violet: "text-violet",
};

export function StatCard({
  label,
  value,
  hint,
  tone = "primary",
  to,
  icon,
}: {
  label: string;
  value: string | number;
  hint: string;
  tone?: Tone;
  to?: string;
  icon?: ReactNode;
}) {
  const body = (
    <Panel className="h-full">
      <div className="p-6">
        <div className="flex items-start justify-between gap-3">
          <p className="text-[12px] font-medium text-muted-foreground">{label}</p>
          {icon ? <span className={cn("shrink-0", toneText[tone])}>{icon}</span> : null}
        </div>
        <p className="mt-3 text-[26px] font-bold leading-none tabular-nums">{value}</p>
        <p className={cn("mt-2 text-[11.5px] font-semibold", toneText[tone])}>{hint}</p>
      </div>
    </Panel>
  );
  return to ? (
    <Link to={to} className="block">
      {body}
    </Link>
  ) : (
    body
  );
}

/* ------------------------------- Layout helpers ------------------------------ */

export function StaffHero({
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
    <section className="relative overflow-hidden rounded-[28px] border border-border bg-surface p-8 shadow-float rise-in">
      <div className="absolute inset-0 gradient-mesh" />
      <div className="relative grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
            {eyebrow}
          </p>
          <h1 className="mt-2 text-[32px] font-bold leading-tight">{title}</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{description}</p>
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </section>
  );
}

export function ActionLink({
  to,
  children,
  variant = "ghost",
  icon,
}: {
  to: string;
  children: ReactNode;
  variant?: "primary" | "ghost";
  icon?: ReactNode;
}) {
  return (
    <Link
      to={to}
      className={cn(
        "inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-[12.5px] font-semibold transition-all hover:-translate-y-0.5",
        variant === "primary"
          ? "gradient-primary text-white shadow-glow"
          : "border border-border bg-surface text-foreground shadow-xs hover:shadow-soft",
      )}
    >
      {icon}
      {children}
    </Link>
  );
}

export function ActionButton({
  children,
  icon,
  variant = "ghost",
  onClick,
}: {
  children: ReactNode;
  icon?: ReactNode;
  variant?: "primary" | "ghost";
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-[12.5px] font-semibold transition-all hover:-translate-y-0.5",
        variant === "primary"
          ? "gradient-primary text-white shadow-glow"
          : "border border-border bg-surface text-foreground shadow-xs hover:shadow-soft",
      )}
    >
      {icon}
      {children}
    </button>
  );
}

export function DefRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="grid grid-cols-[minmax(0,150px)_minmax(0,1fr)] gap-4 border-b border-border/70 py-3 last:border-0">
      <dt className="text-[12px] text-muted-foreground">{label}</dt>
      <dd className="text-[13px] font-medium text-foreground">{value}</dd>
    </div>
  );
}

const dotTone: Record<string, string> = {
  neutral: "bg-muted-foreground",
  primary: "bg-primary",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
  violet: "bg-violet",
};

export function StaffTimeline({
  items,
  className,
}: {
  items: { when: string; who: string; what: string; tone: Tone }[];
  className?: string;
}) {
  return (
    <ol className={cn("space-y-5 px-6 pb-6 sm:px-7", className)}>
      {items.map((a, i) => (
        <li key={`${a.when}-${i}`} className="relative flex gap-4 pl-1">
          <span className="relative flex flex-col items-center">
            <span
              className={cn(
                "mt-1.5 size-2.5 shrink-0 rounded-full ring-4 ring-surface",
                dotTone[a.tone],
              )}
            />
            {i < items.length - 1 ? <span className="mt-1 w-px flex-1 bg-border" /> : null}
          </span>
          <div className="min-w-0 pb-1">
            <p className="text-[13px] leading-snug text-foreground">
              <span className="font-semibold">{a.who}</span> {a.what}
            </p>
            <p className="mt-1 text-[11.5px] text-muted-foreground">{a.when}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

export function TagPills({ items, tone = "neutral" }: { items: string[]; tone?: Tone }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {items.map((i) => (
        <Pill key={i} tone={tone}>
          {i}
        </Pill>
      ))}
    </div>
  );
}

/* ------------------------------ Loading / empty ------------------------------ */

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3 px-6 pb-6 sm:px-7">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          <div className="size-9 shrink-0 animate-pulse rounded-xl bg-surface-muted" />
          <div className="h-3 flex-1 animate-pulse rounded-full bg-surface-muted" />
          <div className="h-3 w-20 animate-pulse rounded-full bg-surface-muted" />
        </div>
      ))}
    </div>
  );
}

export function useFakeLoad(ms = 420) {
  return ms;
}
