import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Panel, Pill } from "@/components/ui/primitives";
import { formatWhen } from "@/lib/lifecycle/repository";
import type {
  AuditEvent,
  ComplaintStatus,
  EquipmentStatus,
  WorkOrderStage,
} from "@/lib/lifecycle/types";
import { workOrderStages } from "@/lib/lifecycle/types";

type Tone = "neutral" | "primary" | "success" | "warning" | "danger" | "violet";

export function Crumbs({ trail }: { trail: { label: string; to?: string }[] }) {
  return (
    <nav className="flex flex-wrap items-center gap-2 text-[12px] text-muted-foreground">
      {trail.map((t, i) => (
        <span key={`${t.label}-${i}`} className="flex items-center gap-2">
          {i > 0 && <span className="text-border-strong">/</span>}
          {t.to ? (
            <Link to={t.to as never} className="transition-colors hover:text-foreground">
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

export const equipmentTone: Record<EquipmentStatus, Tone> = {
  Active: "primary",
  "Under Breakdown": "danger",
  "Under Maintenance": "warning",
  "Awaiting Parts": "warning",
  "Maintenance Completed": "violet",
  "Under Verification": "violet",
  Operational: "success",
  "Out of Service": "danger",
  Retired: "neutral",
};

export const complaintTone: Record<ComplaintStatus, Tone> = {
  Open: "danger",
  "Under Review": "warning",
  Assigned: "primary",
  Investigation: "primary",
  "Maintenance In Progress": "warning",
  "Awaiting Parts": "warning",
  Testing: "violet",
  Resolved: "success",
  Closed: "neutral",
};

export function StatusPill({ status }: { status: EquipmentStatus | ComplaintStatus }) {
  const tone =
    (equipmentTone as Record<string, Tone>)[status] ??
    (complaintTone as Record<string, Tone>)[status] ??
    "neutral";
  return <Pill tone={tone}>{status}</Pill>;
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string | undefined;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[12px] font-semibold text-foreground">{label}</span>
      {hint ? <span className="block text-[11.5px] text-muted-foreground">{hint}</span> : null}
      {children}
    </label>
  );
}

export const inputCls =
  "w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-[13px] text-foreground outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-primary";

export function ActionBtn({
  children,
  onClick,
  to,
  variant = "primary",
  type = "button",
  disabled,
}: {
  children: ReactNode;
  onClick?: () => void;
  to?: string;
  variant?: "primary" | "ghost";
  type?: "button" | "submit";
  disabled?: boolean;
}) {
  const cls = cn(
    "inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-[12.5px] font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-50",
    variant === "primary"
      ? "gradient-primary text-white shadow-glow hover:-translate-y-0.5"
      : "border border-border bg-surface text-foreground hover:bg-surface-muted",
  );
  if (to)
    return (
      <Link to={to as never} className={cls}>
        {children}
      </Link>
    );
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={cls}>
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

/** Horizontal stage tracker for a work order. */
export function StageTracker({
  stage,
  workOrderId,
}: {
  stage: WorkOrderStage;
  workOrderId: string;
}) {
  const steps: { stage: WorkOrderStage; label: string; to?: string }[] = [
    { stage: "Assigned", label: "Assigned", to: `/maintenance/${workOrderId}` },
    {
      stage: "Investigation",
      label: "Investigation",
      to: `/maintenance/${workOrderId}/investigation`,
    },
    { stage: "Checklist", label: "Checklist", to: `/maintenance/${workOrderId}/checklist` },
    { stage: "Root Cause", label: "Root cause", to: `/maintenance/${workOrderId}/root-cause` },
    {
      stage: "Corrective Action",
      label: "Corrective action",
      to: `/maintenance/${workOrderId}/corrective-action`,
    },
    { stage: "Evidence", label: "Evidence", to: `/maintenance/${workOrderId}/uploads` },
    { stage: "Testing", label: "Testing", to: `/maintenance/${workOrderId}/testing` },
    { stage: "Report", label: "Service report", to: `/maintenance/${workOrderId}/report` },
    { stage: "Approved", label: "Complete", to: `/maintenance/${workOrderId}/complete` },
  ];
  const current = workOrderStages.indexOf(stage);
  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-2xl border border-border bg-surface p-1.5 shadow-xs">
      {steps.map((s) => {
        const idx = workOrderStages.indexOf(s.stage);
        const done = idx < current;
        const active = idx === current;
        return (
          <Link
            key={s.stage}
            to={s.to as never}
            className={cn(
              "inline-flex items-center gap-2 rounded-xl px-3 py-2 text-[12px] font-semibold transition-all",
              active
                ? "bg-primary-soft text-primary"
                : done
                  ? "text-success hover:bg-surface-muted"
                  : "text-muted-foreground hover:bg-surface-muted hover:text-foreground",
            )}
          >
            <span
              className={cn(
                "grid size-4 place-items-center rounded-full text-[9px] font-bold text-white",
                done ? "bg-success" : active ? "bg-primary" : "bg-border-strong",
              )}
            >
              {done ? "✓" : idx + 1}
            </span>
            {s.label}
          </Link>
        );
      })}
    </div>
  );
}

export function AuditTrail({
  events,
  title = "Audit trail",
}: {
  events: AuditEvent[];
  title?: string;
}) {
  const tone: Record<string, string> = {
    admin: "bg-primary",
    engineer: "bg-violet",
    staff: "bg-warning",
    system: "bg-muted-foreground",
  };
  return (
    <Panel>
      <header className="px-6 pt-6 pb-3 sm:px-7">
        <h2 className="text-[15px] font-semibold text-foreground">{title}</h2>
        <p className="mt-0.5 text-[13px] text-muted-foreground">
          Every workflow action is recorded with user, role, module, status change and timestamp.
        </p>
      </header>
      <ol className="space-y-5 px-6 pb-6 sm:px-7">
        {events.length === 0 ? (
          <li className="py-6 text-center text-[13px] text-muted-foreground">
            No recorded events yet.
          </li>
        ) : null}
        {events.map((e) => (
          <li key={e.id} className="grid grid-cols-[auto_minmax(0,1fr)] gap-4">
            <span className="relative mt-1.5 flex justify-center">
              <span className={cn("size-2.5 rounded-full", tone[e.role])} />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[13px] font-semibold text-foreground">{e.action}</p>
                <Pill tone="neutral">{e.module}</Pill>
                <Pill tone="primary">{e.recordId}</Pill>
                {e.previousStatus && e.newStatus ? (
                  <Pill tone="violet">
                    {e.previousStatus} → {e.newStatus}
                  </Pill>
                ) : e.newStatus ? (
                  <Pill tone="violet">{e.newStatus}</Pill>
                ) : null}
              </div>
              <p className="mt-1 text-[12.5px] text-muted-foreground">{e.description}</p>
              <p className="mt-1 text-[11.5px] text-muted-foreground/80">
                {formatWhen(e.at)} · {e.user} · {e.role}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </Panel>
  );
}
