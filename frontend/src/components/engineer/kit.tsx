import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import {
  CalendarDays,
  CircleGauge,
  ClipboardList,
  LayoutGrid,
  History as HistoryIcon,
  Settings,
  UserRound,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Panel, Pill } from "@/components/ui/primitives";
import type { Tone } from "@/lib/engineer";

/* --------------------------------- Breadcrumbs -------------------------------- */

export function Crumbs({ trail }: { trail: { label: string; to?: string }[] }) {
  return (
    <nav className="flex flex-wrap items-center gap-2 text-[12px] text-muted-foreground">
      <Link to="/engineer" className="transition-colors hover:text-foreground">
        Biomedical Engineer
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

/* ------------------------------------ Tabs ------------------------------------ */

const tabs = [
  { key: "dashboard", label: "Dashboard", to: "/engineer", icon: LayoutGrid },
  { key: "tasks", label: "Assigned tasks", to: "/engineer/tasks", icon: ClipboardList },
  { key: "calendar", label: "Calendar", to: "/engineer/calendar", icon: CalendarDays },
  { key: "history", label: "History", to: "/engineer/history", icon: HistoryIcon },
  { key: "performance", label: "Performance", to: "/engineer/performance", icon: CircleGauge },
  { key: "profile", label: "Profile", to: "/engineer/profile", icon: UserRound },
  { key: "settings", label: "Settings", to: "/engineer/settings", icon: Settings },
];

export function EngineerTabs({ active }: { active: string }) {
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

/* ------------------------------------ KPIs ------------------------------------ */

export function KpiCard({
  label,
  value,
  delta,
  tone = "primary",
  to,
  icon,
}: {
  label: string;
  value: string;
  delta: string;
  tone?: Tone;
  to?: string;
  icon?: ReactNode;
}) {
  const toneCls: Record<string, string> = {
    neutral: "text-muted-foreground",
    primary: "text-primary",
    success: "text-success",
    warning: "text-warning",
    danger: "text-danger",
    violet: "text-violet",
  };
  const body = (
    <Panel className="h-full">
      <div className="p-6">
        <div className="flex items-start justify-between gap-3">
          <p className="text-[12px] font-medium text-muted-foreground">{label}</p>
          {icon ? <span className={cn("shrink-0", toneCls[tone])}>{icon}</span> : null}
        </div>
        <p className="mt-3 text-[26px] font-bold leading-none tabular-nums">{value}</p>
        <p className={cn("mt-2 text-[11.5px] font-semibold", toneCls[tone])}>{delta}</p>
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

/* ------------------------------- Layout helpers -------------------------------- */

export function DefRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="grid grid-cols-[minmax(0,140px)_minmax(0,1fr)] gap-4 border-b border-border/70 py-3 last:border-0">
      <dt className="text-[12px] text-muted-foreground">{label}</dt>
      <dd className="text-[13px] font-medium text-foreground">{value}</dd>
    </div>
  );
}

export function Timeline({
  items,
}: {
  items: { when: string; who: string; what: string; tone: Tone }[];
}) {
  const dot: Record<string, string> = {
    neutral: "bg-muted-foreground",
    primary: "bg-primary",
    success: "bg-success",
    warning: "bg-warning",
    danger: "bg-danger",
    violet: "bg-violet",
  };
  return (
    <ol className="space-y-5 px-6 pb-6 sm:px-7">
      {items.map((a, i) => (
        <li key={i} className="relative flex gap-4 pl-1">
          <span className="relative flex flex-col items-center">
            <span
              className={cn(
                "mt-1.5 size-2.5 shrink-0 rounded-full ring-4 ring-surface",
                dot[a.tone],
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

export function StatusPills({ items }: { items: { tone: Tone; label: string }[] }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {items.map((i) => (
        <Pill key={i.label} tone={i.tone}>
          {i.label}
        </Pill>
      ))}
    </div>
  );
}
