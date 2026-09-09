import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  ArrowRight,
  CalendarDays,
  CircleAlert,
  ClipboardList,
  Clock,
  Cpu,
  FileText,
  Gauge,
  Loader2,
  MapPin,
  Play,
  Search,
  ShieldCheck,
  Timer,
  Wrench,
} from "lucide-react";
import { Meter, Panel, PanelHead, PageHeader, Pill, Ring } from "@/components/ui/primitives";
import { ActionButton } from "@/components/workflow/pages";
import { Crumbs, DefRow, EngineerTabs, KpiCard, Timeline } from "@/components/engineer/kit";
import {
  engineerProfile,
  engineerTasks,
  findEquipment,
  findTask,
  priorityTone,
  taskTone,
  workloadTrend,
  type EngineerTask,
} from "@/lib/engineer";
import { complaints, statusTone } from "@/lib/mock-data";
import { useWorkOrderList, useWorkOrderRecord } from "@/lib/api/useWorkOrders";
import { useComplaintList } from "@/lib/api/useComplaints";
import { apiEnabled } from "@/lib/api/client";
import type { ApiWorkOrder } from "@/lib/api/types";
import { cn } from "@/lib/utils";

/* ---------------------------------- Task card ---------------------------------- */

/** Card for a static mock-based EngineerTask (legacy, used in calendar/history). */
export function TaskCard({ t }: { t: EngineerTask }) {
  return (
    <Link to="/engineer/tasks/$id" params={{ id: t.id }} className="block">
      <Panel className="h-full">
        <div className="space-y-4 p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold tracking-wide text-muted-foreground">
                {t.id}
              </p>
              <p className="mt-1 text-[14.5px] font-semibold leading-snug text-foreground">
                {t.title}
              </p>
              <p className="mt-1 truncate text-[12.5px] text-muted-foreground">{t.equipment}</p>
            </div>
            <Pill tone={priorityTone(t.priority)}>{t.priority}</Pill>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Pill tone={taskTone(t.status)}>{t.status}</Pill>
            <Pill tone="neutral">{t.type}</Pill>
            <span className="inline-flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
              <Clock className="size-3.5" /> {t.slot}
            </span>
          </div>
          <div>
            <div className="mb-1.5 flex items-center justify-between text-[11.5px] text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="size-3.5" /> {t.dept}
              </span>
              <span className="font-semibold tabular-nums text-foreground">{t.progress}%</span>
            </div>
            <Meter value={t.progress} tone={t.progress === 100 ? "success" : "primary"} />
          </div>
        </div>
      </Panel>
    </Link>
  );
}

/** Card for a live ApiWorkOrder from MongoDB. */
export function WorkOrderCard({ wo }: { wo: ApiWorkOrder }) {
  const equipName =
    wo.equipmentId && typeof wo.equipmentId === "object"
      ? wo.equipmentId.name
      : wo.equipmentId
        ? String(wo.equipmentId)
        : "—";
  const deptName =
    wo.departmentId && typeof wo.departmentId === "object"
      ? wo.departmentId.name
      : (wo.departmentId ?? "-");
  const priorityMap: Record<string, "danger" | "warning" | "primary" | "neutral"> = {
    CRITICAL: "danger",
    HIGH: "warning",
    MEDIUM: "primary",
    LOW: "neutral",
  };
  const statusMap: Record<string, "success" | "primary" | "warning" | "neutral"> = {
    COMPLETED: "success",
    IN_PROGRESS: "primary",
    AWAITING_PARTS: "warning",
    ASSIGNED: "neutral",
    UNDER_VERIFICATION: "primary",
  };
  const progress = wo.status === "COMPLETED" ? 100 : wo.status === "IN_PROGRESS" ? 50 : 15;
  const slot = wo.scheduledDate ? new Date(wo.scheduledDate).toLocaleDateString() : "Today";

  return (
    <Link to="/engineer/tasks/$id" params={{ id: wo._id }} className="block">
      <Panel className="h-full">
        <div className="space-y-4 p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold tracking-wide text-muted-foreground">
                {wo.workOrderId}
              </p>
              <p className="mt-1 text-[14.5px] font-semibold leading-snug text-foreground">
                {wo.title}
              </p>
              <p className="mt-1 truncate text-[12.5px] text-muted-foreground">{equipName}</p>
            </div>
            <Pill tone={priorityMap[wo.priority] ?? "neutral"}>{wo.priority}</Pill>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Pill tone={statusMap[wo.status] ?? "neutral"}>{wo.status.replace("_", " ")}</Pill>
            <Pill tone="neutral">{wo.maintenanceType}</Pill>
            <span className="inline-flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
              <Clock className="size-3.5" /> {slot}
            </span>
          </div>
          <div>
            <div className="mb-1.5 flex items-center justify-between text-[11.5px] text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="size-3.5" /> {deptName}
              </span>
              <span className="font-semibold tabular-nums text-foreground">{progress}%</span>
            </div>
            <Meter value={progress} tone={progress === 100 ? "success" : "primary"} />
          </div>
        </div>
      </Panel>
    </Link>
  );
}

/* ---------------------------------- Dashboard ---------------------------------- */

export function EngineerDashboard() {
  const { items: workOrders, loading: woLoading } = useWorkOrderList(
    apiEnabled ? {} : { limit: 0 },
  );
  const { items: complaintsData, loading: compLoading } = useComplaintList(
    apiEnabled ? { status: "OPEN", limit: 5 } : { limit: 0 },
  );

  // Derive KPIs from live data
  const openWOs =
    workOrders?.filter((w) => w.status !== "COMPLETED" && w.status !== "CANCELLED") ?? [];
  const dueToday = openWOs.filter((w) => {
    if (!w.scheduledDate) return false;
    const d = new Date(w.scheduledDate);
    const today = new Date();
    return d.toDateString() === today.toDateString();
  });
  const critical = openWOs.filter((w) => w.priority === "CRITICAL");

  const liveKpis = [
    {
      label: "Open assignments",
      value: woLoading ? "…" : String(openWOs.length),
      delta: apiEnabled ? "Live from MongoDB" : "API not configured",
      tone: "primary" as const,
    },
    {
      label: "Due today",
      value: woLoading ? "…" : String(dueToday.length),
      delta: critical.length ? `${critical.length} critical` : "No critical",
      tone: "danger" as const,
    },
    {
      label: "Open complaints",
      value: compLoading ? "…" : String(complaintsData?.length ?? 0),
      delta: "Requires attention",
      tone: "warning" as const,
    },
    {
      label: "Completed this week",
      value: woLoading
        ? "…"
        : String(workOrders?.filter((w) => w.status === "COMPLETED").length ?? 0),
      delta: "Closed work orders",
      tone: "success" as const,
    },
  ];

  // Fall back to static KPIs when API is off
  const engineerKpis = apiEnabled
    ? liveKpis
    : [
        {
          label: "Open assignments",
          value: "5",
          delta: "-2 vs last week",
          tone: "primary" as const,
        },
        { label: "Due today", value: "3", delta: "1 critical", tone: "danger" as const },
        { label: "First-time fix", value: "92%", delta: "+4.1%", tone: "success" as const },
        { label: "Hours logged", value: "38.4", delta: "+2.6 h", tone: "violet" as const },
      ];

  const active = apiEnabled
    ? (workOrders?.filter((w) => w.status !== "COMPLETED" && w.status !== "CANCELLED") ?? [])
    : [];
  const icons = [ClipboardList, CircleAlert, ShieldCheck, Timer];

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 rise-in">
      <Crumbs trail={[{ label: "Dashboard" }]} />
      <PageHeader
        eyebrow="Field operations"
        title={`Good morning, ${engineerProfile.name.split(" ")[0]}`}
        description={`${active.length} live assignments. Your next slot starts at 10:15 in ICU · Bay 6.`}
        actions={
          <>
            <ActionButton variant="ghost" to="/engineer/calendar" icon={CalendarDays}>
              My schedule
            </ActionButton>
            <ActionButton to="/engineer/tasks" icon={Wrench}>
              Assigned tasks
            </ActionButton>
          </>
        }
      />
      <EngineerTabs active="dashboard" />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {engineerKpis.map((k, i) => {
          const Icon = icons[i]!;
          return (
            <KpiCard
              key={k.label}
              label={k.label}
              value={k.value}
              delta={k.delta}
              tone={k.tone}
              to="/engineer/performance"
              icon={<Icon className="size-4" />}
            />
          );
        })}
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Panel interactive={false}>
          <PanelHead
            title="Today's queue"
            subtitle="Ordered by SLA burn — open any card to start the maintenance workflow"
            icon={<ClipboardList className="size-4" />}
            action={
              <ActionButton variant="ghost" to="/engineer/tasks" icon={ArrowRight}>
                View all
              </ActionButton>
            }
          />
          <div className="grid gap-4 px-6 pb-6 sm:px-7 md:grid-cols-2">
            {woLoading && apiEnabled && (
              <div className="col-span-2 flex items-center justify-center py-8 text-muted-foreground">
                <Loader2 className="mr-2 size-4 animate-spin" /> Loading work orders…
              </div>
            )}
            {!woLoading && apiEnabled && active.length === 0 && (
              <p className="col-span-2 py-8 text-center text-[13px] text-muted-foreground">
                No active assignments
              </p>
            )}
            {apiEnabled
              ? (active as ApiWorkOrder[])
                  .slice(0, 4)
                  .map((wo) => <WorkOrderCard key={wo._id} wo={wo} />)
              : []}
          </div>
        </Panel>

        <div className="space-y-5">
          <Panel interactive={false}>
            <PanelHead
              title="Shift readiness"
              subtitle="Composite field score"
              icon={<Gauge className="size-4" />}
            />
            <div className="flex items-center gap-6 px-6 pb-6 sm:px-7">
              <Ring value={92} size={104} sub="Ready" />
              <div className="min-w-0 flex-1 space-y-3">
                {[
                  { label: "SLA adherence", v: 96 },
                  { label: "Checklist completion", v: 88 },
                  { label: "Parts availability", v: 74 },
                ].map((r) => (
                  <div key={r.label}>
                    <div className="mb-1.5 flex items-center justify-between text-[11.5px]">
                      <span className="text-muted-foreground">{r.label}</span>
                      <span className="font-semibold tabular-nums">{r.v}%</span>
                    </div>
                    <Meter value={r.v} tone={r.v >= 85 ? "success" : "warning"} />
                  </div>
                ))}
              </div>
            </div>
          </Panel>

          <Panel interactive={false}>
            <PanelHead
              title="Linked complaints"
              subtitle="Tickets driving your current work orders"
              icon={<CircleAlert className="size-4" />}
            />
            <ul className="px-6 pb-6 sm:px-7">
              {compLoading && apiEnabled && (
                <li className="flex items-center justify-center py-6 text-muted-foreground">
                  <Loader2 className="mr-2 size-4 animate-spin" /> Loading…
                </li>
              )}
              {!compLoading && apiEnabled && (!complaintsData || complaintsData.length === 0) && (
                <li className="py-6 text-center text-[13px] text-muted-foreground">
                  No open complaints
                </li>
              )}
              {(complaintsData ?? []).slice(0, 4).map((c) => {
                const equipName =
                  typeof c.equipmentId === "object" ? c.equipmentId.name : String(c.equipmentId);
                const deptName =
                  typeof c.departmentId === "object" ? c.departmentId.name : (c.departmentId ?? "");
                return (
                  <li
                    key={c._id}
                    className="flex items-start gap-3 border-b border-border/70 py-3 last:border-0"
                  >
                    <span className="mt-1 grid size-7 shrink-0 place-items-center rounded-lg bg-primary-soft text-[10px] font-bold text-primary">
                      {c.complaintId?.slice(-3) ?? "?"}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-medium text-foreground">{c.title}</p>
                      <p className="mt-0.5 text-[11.5px] text-muted-foreground">
                        {deptName || equipName} · {c.priority}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </Panel>
        </div>
      </div>

      <Panel interactive={false}>
        <PanelHead
          title="Workload trend"
          subtitle="Work orders opened vs closed over the last six weeks"
          icon={<Activity className="size-4" />}
          action={
            <ActionButton variant="ghost" to="/engineer/performance" icon={Gauge}>
              Performance
            </ActionButton>
          }
        />
        <div className="h-[280px] px-3 pb-6 sm:px-5">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={workloadTrend}>
              <defs>
                <linearGradient id="engA" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="engB" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--chart-3)" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="var(--chart-3)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="4 4" stroke="var(--border)" vertical={false} />
              <XAxis
                dataKey="week"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
              />
              <Tooltip
                contentStyle={{ borderRadius: 14, border: "1px solid var(--border)", fontSize: 12 }}
              />
              <Area
                type="monotone"
                dataKey="closed"
                stroke="var(--chart-1)"
                fill="url(#engA)"
                strokeWidth={2.5}
              />
              <Area
                type="monotone"
                dataKey="opened"
                stroke="var(--chart-3)"
                fill="url(#engB)"
                strokeWidth={2.5}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Panel>
    </div>
  );
}

/* -------------------------------- Assigned tasks -------------------------------- */

export function AssignedTasks() {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  // Live work orders from MongoDB
  const { items: workOrders, loading, error } = useWorkOrderList(apiEnabled ? {} : { limit: 0 });

  const STATUS_OPTIONS = [
    "All",
    "ASSIGNED",
    "IN_PROGRESS",
    "AWAITING_PARTS",
    "UNDER_VERIFICATION",
    "COMPLETED",
  ];

  const rows = (workOrders ?? []).filter((wo) => {
    const matchStatus = statusFilter === "All" || wo.status === statusFilter;
    const equipName =
      wo.equipmentId && typeof wo.equipmentId === "object"
        ? (wo.equipmentId as { name?: string }).name
        : wo.equipmentId
          ? String(wo.equipmentId)
          : "";
    const deptName =
      wo.departmentId && typeof wo.departmentId === "object"
        ? (wo.departmentId as { name?: string }).name
        : wo.departmentId
          ? String(wo.departmentId)
          : "";
    const matchQuery = (wo.title + wo.workOrderId + (equipName ?? "") + (deptName ?? ""))
      .toLowerCase()
      .includes(query.toLowerCase());
    return matchStatus && matchQuery;
  });

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 rise-in">
      <Crumbs trail={[{ label: "Assigned tasks" }]} />
      <PageHeader
        eyebrow="Field operations"
        title="Assigned tasks"
        description="Every work order routed to you, with live SLA burn, linked complaint and equipment context."
        actions={
          <>
            <ActionButton variant="ghost" to="/engineer/history" icon={FileText}>
              History
            </ActionButton>
            <ActionButton to="/engineer/calendar" icon={CalendarDays}>
              Schedule
            </ActionButton>
          </>
        }
      />
      <EngineerTabs active="tasks" />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {loading && apiEnabled && (
          <div className="col-span-3 flex items-center justify-center py-10 text-muted-foreground">
            <Loader2 className="mr-2 size-5 animate-spin" /> Loading work orders…
          </div>
        )}
        {error && (
          <div className="col-span-3 rounded-xl border border-danger-soft bg-danger-soft/20 p-4 text-[13px] text-danger">
            {error}
          </div>
        )}
        {!loading &&
          apiEnabled &&
          rows.filter((w) => w.status !== "COMPLETED").length === 0 &&
          !error && (
            <div className="col-span-3 py-10 text-center text-[13px] text-muted-foreground">
              No active assignments. Work orders assigned to you will appear here.
            </div>
          )}
        {rows
          .filter((w) => w.status !== "COMPLETED")
          .slice(0, 3)
          .map((wo) => (
            <WorkOrderCard key={wo._id} wo={wo} />
          ))}
      </div>

      <Panel interactive={false}>
        <PanelHead
          title="Work order queue"
          subtitle={`${rows.length} assignment${rows.length !== 1 ? "s" : ""} match the current filters`}
          icon={<ClipboardList className="size-4" />}
          action={
            <div className="flex flex-wrap items-center gap-2">
              <label className="flex h-10 items-center gap-2 rounded-xl border border-border bg-surface px-3 text-[12.5px] shadow-xs">
                <Search className="size-3.5 text-muted-foreground" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search work orders…"
                  className="w-40 bg-transparent outline-none placeholder:text-muted-foreground"
                />
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-10 rounded-xl border border-border bg-surface px-3 text-[12.5px] font-medium shadow-xs outline-none"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>
          }
        />
        <div className="overflow-x-auto px-2 pb-6">
          {loading && apiEnabled ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="mr-2 size-5 animate-spin" /> Loading…
            </div>
          ) : (
            <table className="w-full min-w-[900px] border-collapse">
              <thead>
                <tr className="border-y border-border bg-surface-muted/60">
                  {["Work order", "Title", "Equipment", "Department", "Priority", "Status", ""].map(
                    (h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
                      >
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-[13px] text-muted-foreground">
                      No assigned tasks available
                    </td>
                  </tr>
                ) : (
                  rows.map((wo) => {
                    const equipName =
                      wo.equipmentId && typeof wo.equipmentId === "object"
                        ? wo.equipmentId.name
                        : wo.equipmentId
                          ? String(wo.equipmentId)
                          : "—";
                    const deptName =
                      wo.departmentId && typeof wo.departmentId === "object"
                        ? wo.departmentId.name
                        : (wo.departmentId ?? "-");
                    const pTone: Record<string, "danger" | "warning" | "primary" | "neutral"> = {
                      CRITICAL: "danger",
                      HIGH: "warning",
                      MEDIUM: "primary",
                      LOW: "neutral",
                    };
                    const pToneValue = pTone[wo.priority] ?? "neutral";
                    const sTone: Record<string, "success" | "primary" | "warning" | "neutral"> = {
                      COMPLETED: "success",
                      IN_PROGRESS: "primary",
                      AWAITING_PARTS: "warning",
                      ASSIGNED: "neutral",
                      UNDER_VERIFICATION: "primary",
                      CANCELLED: "neutral",
                    };
                    const statusToneValue = sTone[wo.status] ?? "neutral";
                    return (
                      <tr
                        key={wo._id}
                        className="border-b border-border/70 transition-colors last:border-0 hover:bg-surface-muted/60"
                      >
                        <td className="px-4 py-3 text-[12.5px] font-semibold tabular-nums">
                          {wo.workOrderId}
                        </td>
                        <td className="px-4 py-3 text-[13px] font-medium">{wo.title}</td>
                        <td className="px-4 py-3 text-[12.5px] text-muted-foreground">
                          {equipName}
                        </td>
                        <td className="px-4 py-3 text-[12.5px] text-muted-foreground">
                          {deptName}
                        </td>
                        <td className="px-4 py-3">
                          <Pill tone={pToneValue}>{wo.priority}</Pill>
                        </td>
                        <td className="px-4 py-3">
                          <Pill tone={statusToneValue}>{wo.status.replace(/_/g, " ")}</Pill>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Link
                            to="/engineer/tasks/$id"
                            params={{ id: wo._id }}
                            className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-primary hover:underline"
                          >
                            Open <ArrowRight className="size-3.5" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}
        </div>
      </Panel>
    </div>
  );
}

/* --------------------------------- Task details --------------------------------- */

export function TaskDetails({ id }: { id: string }) {
  const { item: workOrder, loading, error } = useWorkOrderRecord(id);

  // Loading state
  if (loading) {
    return (
      <div className="mx-auto max-w-[1600px] flex items-center justify-center py-24 text-muted-foreground rise-in">
        <Loader2 className="mr-3 size-6 animate-spin" /> Loading work order…
      </div>
    );
  }

  // Error state
  if (error || !workOrder) {
    return (
      <div className="mx-auto max-w-[1600px] space-y-4 rise-in">
        <Crumbs trail={[{ label: "Assigned tasks", to: "/engineer/tasks" }, { label: id }]} />
        <div className="rounded-xl border border-danger-soft bg-danger-soft/20 p-6 text-[13px] text-danger">
          {error ?? "Work order not found."} — The ID you opened ({id}) may be a legacy mock ID. Try
          opening a work order from the{" "}
          <Link to="/engineer/tasks" className="font-semibold underline">
            Assigned tasks
          </Link>{" "}
          list.
        </div>
      </div>
    );
  }

  const equipName =
    workOrder.equipmentId && typeof workOrder.equipmentId === "object"
      ? workOrder.equipmentId.name
      : workOrder.equipmentId
        ? String(workOrder.equipmentId)
        : "—";
  const equipId =
    workOrder.equipmentId && typeof workOrder.equipmentId === "object"
      ? workOrder.equipmentId._id
      : workOrder.equipmentId
        ? String(workOrder.equipmentId)
        : "";
  const deptName =
    workOrder.departmentId && typeof workOrder.departmentId === "object"
      ? workOrder.departmentId.name
      : (workOrder.departmentId ?? "-");
  const engineerName =
    workOrder.engineerId && typeof workOrder.engineerId === "object"
      ? workOrder.engineerId.name
      : (workOrder.engineerId ?? "Unassigned");
  const priorityMap: Record<string, "danger" | "warning" | "primary" | "neutral"> = {
    CRITICAL: "danger",
    HIGH: "warning",
    MEDIUM: "primary",
    LOW: "neutral",
  };
  const statusMap: Record<string, "success" | "primary" | "warning" | "neutral"> = {
    COMPLETED: "success",
    IN_PROGRESS: "primary",
    AWAITING_PARTS: "warning",
    ASSIGNED: "neutral",
    UNDER_VERIFICATION: "primary",
  };
  const partsUsed =
    (
      workOrder as unknown as {
        partsUsed?: { name?: string; partNo?: string; qty?: number; cost?: number }[];
      }
    ).partsUsed ?? [];

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 rise-in">
      <Crumbs
        trail={[
          { label: "Assigned tasks", to: "/engineer/tasks" },
          { label: workOrder.workOrderId },
        ]}
      />
      <PageHeader
        eyebrow={`${workOrder.maintenanceType} work order`}
        title={workOrder.title}
        description={workOrder.description ?? `${equipName} · ${deptName}`}
        actions={
          <>
            <ActionButton
              variant="ghost"
              to="/engineer/equipment/$id"
              params={{ id: equipId }}
              icon={Cpu}
            >
              Equipment
            </ActionButton>
            <ActionButton to="/engineer/tasks/$id/start" params={{ id: workOrder._id }} icon={Play}>
              Start maintenance
            </ActionButton>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Status"
          value={workOrder.status.replace(/_/g, " ")}
          delta={`Work order ${workOrder.workOrderId}`}
          tone={statusMap[workOrder.status] ?? "neutral"}
        />
        <KpiCard
          label="Priority"
          value={workOrder.priority}
          delta={`Maintenance type: ${workOrder.maintenanceType}`}
          tone={priorityMap[workOrder.priority] ?? "neutral"}
        />
        <KpiCard
          label="Scheduled"
          value={
            workOrder.scheduledDate
              ? new Date(workOrder.scheduledDate).toLocaleDateString()
              : "Not set"
          }
          delta={workOrder.estimatedHours ? `Est. ${workOrder.estimatedHours}h` : "No estimate"}
          tone="primary"
        />
        <KpiCard
          label="Department"
          value={deptName}
          delta={`Engineer: ${engineerName}`}
          tone="violet"
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="space-y-5">
          <Panel interactive={false}>
            <PanelHead
              title="Work order details"
              subtitle={`${workOrder.workOrderId} · ${workOrder.maintenanceType}`}
              icon={<ClipboardList className="size-4" />}
              action={
                <ActionButton
                  variant="ghost"
                  to="/engineer/tasks/$id/checklist"
                  params={{ id: workOrder._id }}
                >
                  Open checklist
                </ActionButton>
              }
            />
            <div className="px-6 pb-6 sm:px-7">
              <dl>
                <DefRow label="Equipment" value={equipName} />
                <DefRow label="Department" value={deptName} />
                <DefRow label="Assigned to" value={engineerName} />
                <DefRow label="Maintenance type" value={workOrder.maintenanceType} />
                <DefRow
                  label="Priority"
                  value={
                    <Pill tone={priorityMap[workOrder.priority] ?? "neutral"}>
                      {workOrder.priority}
                    </Pill>
                  }
                />
                <DefRow
                  label="Status"
                  value={
                    <Pill tone={statusMap[workOrder.status] ?? "neutral"}>
                      {workOrder.status.replace(/_/g, " ")}
                    </Pill>
                  }
                />
                {workOrder.scheduledDate && (
                  <DefRow
                    label="Scheduled"
                    value={new Date(workOrder.scheduledDate).toLocaleString()}
                  />
                )}
                {workOrder.startedAt && (
                  <DefRow label="Started" value={new Date(workOrder.startedAt).toLocaleString()} />
                )}
                {workOrder.completedAt && (
                  <DefRow
                    label="Completed"
                    value={new Date(workOrder.completedAt).toLocaleString()}
                  />
                )}
              </dl>
            </div>
          </Panel>

          <Panel interactive={false}>
            <PanelHead
              title="Parts & consumables"
              subtitle="Issued against this work order"
              icon={<Wrench className="size-4" />}
            />
            <div className="overflow-x-auto px-2 pb-6">
              <table className="w-full min-w-[560px] border-collapse">
                <thead>
                  <tr className="border-y border-border bg-surface-muted/60">
                    {["Part", "Code", "Qty", "Cost"].map((h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {partsUsed.length === 0 ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-4 py-6 text-center text-[13px] text-muted-foreground"
                      >
                        No parts recorded yet
                      </td>
                    </tr>
                  ) : (
                    partsUsed.map((p, i) => (
                      <tr key={p.partNo ?? i} className="border-b border-border/70 last:border-0">
                        <td className="px-4 py-3 text-[13px] font-medium">{p.name ?? "-"}</td>
                        <td className="px-4 py-3 text-[12.5px] tabular-nums text-muted-foreground">
                          {p.partNo ?? "-"}
                        </td>
                        <td className="px-4 py-3 text-[12.5px] tabular-nums">{p.qty ?? 0}</td>
                        <td className="px-4 py-3 text-[12.5px] tabular-nums">
                          {p.cost ? `$${p.cost}` : "-"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>

        <div className="space-y-5">
          <Panel interactive={false}>
            <PanelHead
              title="Maintenance workflow"
              subtitle="Move through the field process"
              icon={<Play className="size-4" />}
            />
            <div className="space-y-2 px-6 pb-6 sm:px-7">
              {[
                {
                  label: "Start maintenance",
                  to: "/engineer/tasks/$id/start" as const,
                  icon: Play,
                },
                {
                  label: "Preventive checklist",
                  to: "/engineer/tasks/$id/checklist" as const,
                  icon: ClipboardList,
                },
                {
                  label: "Breakdown maintenance",
                  to: "/engineer/tasks/$id/breakdown" as const,
                  icon: CircleAlert,
                },
                {
                  label: "Upload photos & documents",
                  to: "/engineer/tasks/$id/uploads" as const,
                  icon: FileText,
                },
                {
                  label: "Service report",
                  to: "/engineer/tasks/$id/report" as const,
                  icon: FileText,
                },
                {
                  label: "Complete maintenance",
                  to: "/engineer/tasks/$id/complete" as const,
                  icon: ShieldCheck,
                },
              ].map((s) => (
                <Link
                  key={s.label}
                  to={s.to}
                  params={{ id: workOrder._id }}
                  className="flex items-center gap-3 rounded-xl border border-border bg-surface px-3.5 py-3 text-[13px] font-medium shadow-xs transition-all hover:-translate-y-0.5 hover:shadow-soft"
                >
                  <s.icon className="size-4 text-primary" />
                  <span className="min-w-0 flex-1 truncate">{s.label}</span>
                  <ArrowRight className="size-3.5 text-muted-foreground" />
                </Link>
              ))}
            </div>
          </Panel>

          <Panel interactive={false}>
            <PanelHead
              title="Asset context"
              subtitle={
                typeof workOrder.equipmentId === "object" ? workOrder.equipmentId.equipmentId : ""
              }
              icon={<Cpu className="size-4" />}
            />
            <div className="px-6 pb-6 sm:px-7">
              <dl>
                <DefRow label="Asset" value={equipName} />
                <DefRow label="Department" value={deptName} />
                <DefRow
                  label="Status"
                  value={
                    <Pill tone={statusMap[workOrder.status] ?? "neutral"}>
                      {workOrder.status.replace(/_/g, " ")}
                    </Pill>
                  }
                />
                {typeof workOrder.complaintId === "object" && workOrder.complaintId && (
                  <DefRow
                    label="Complaint"
                    value={(workOrder.complaintId as { complaintId?: string }).complaintId ?? ""}
                  />
                )}
              </dl>
              <div className="mt-4">
                <ActionButton
                  variant="ghost"
                  to="/engineer/equipment/$id"
                  params={{ id: equipId }}
                  icon={ArrowRight}
                >
                  Open equipment details
                </ActionButton>
              </div>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------ Equipment details ------------------------------ */

export function EngineerEquipmentDetails({ id }: { id: string }) {
  const asset = findEquipment(id);
  const tasks = engineerTasks.filter((t) => t.equipmentId === asset.id);
  const tickets = complaints.filter((c) => asset.name.includes(c.equipment.split(" ")[1] ?? "###"));

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 rise-in">
      <Crumbs trail={[{ label: "Equipment", to: "/engineer/tasks" }, { label: asset.id }]} />
      <PageHeader
        eyebrow={asset.category}
        title={asset.name}
        description={`${asset.specs.location} · owned by ${asset.specs.owner} · ${asset.vendor} ${asset.specs.model}`}
        actions={
          <>
            <ActionButton
              variant="ghost"
              to="/engineer/equipment/$id"
              params={{ id: asset.id }}
              icon={FileText}
            >
              Full asset record
            </ActionButton>
            {tasks[0] ? (
              <ActionButton to="/engineer/tasks/$id" params={{ id: tasks[0].id }} icon={Wrench}>
                Open work order
              </ActionButton>
            ) : null}
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Health index"
          value={`${asset.health}%`}
          delta={statusTone[asset.status].label}
          tone={asset.health >= 85 ? "success" : asset.health >= 65 ? "warning" : "danger"}
        />
        <KpiCard
          label="Usage hours"
          value={asset.specs.usageHours}
          delta={`Risk ${asset.specs.riskClass}`}
          tone="primary"
        />
        <KpiCard
          label="Last service"
          value={asset.specs.lastService}
          delta={`Next ${asset.specs.nextService}`}
          tone="violet"
        />
        <KpiCard
          label="Coverage"
          value={asset.specs.amc.split("·")[0]!.trim()}
          delta={`Warranty ${asset.warranty}`}
          tone="success"
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Panel interactive={false}>
          <PanelHead
            title="Technical specification"
            subtitle="Vendor baseline and site configuration"
            icon={<Cpu className="size-4" />}
          />
          <div className="grid gap-x-8 px-6 pb-6 sm:px-7 md:grid-cols-2">
            <dl>
              <DefRow label="Model" value={asset.specs.model} />
              <DefRow label="Serial" value={asset.specs.serial} />
              <DefRow label="Manufactured" value={asset.specs.manufactured} />
              <DefRow label="Installed" value={asset.specs.installed} />
              <DefRow label="Location" value={asset.specs.location} />
              <DefRow label="Owner" value={asset.specs.owner} />
              <DefRow label="Power" value={asset.specs.power} />
            </dl>
            <dl>
              <DefRow label="Weight" value={asset.specs.weight} />
              <DefRow label="Dimensions" value={asset.specs.dimensions} />
              <DefRow label="Software" value={asset.specs.software} />
              <DefRow label="Risk class" value={asset.specs.riskClass} />
              <DefRow label="Coverage" value={asset.specs.amc} />
              <DefRow label="Compliance" value={asset.specs.compliance} />
              <DefRow label="Department" value={asset.dept} />
            </dl>
          </div>
        </Panel>

        <div className="space-y-5">
          <Panel interactive={false}>
            <PanelHead
              title="Condition"
              subtitle="Live health signal"
              icon={<Gauge className="size-4" />}
            />
            <div className="flex items-center gap-6 px-6 pb-6 sm:px-7">
              <Ring value={asset.health} size={104} sub="Health" />
              <div className="min-w-0 flex-1 space-y-3">
                {[
                  { label: "Uptime (30d)", v: 97 },
                  { label: "Alarm rate", v: 64 },
                  { label: "PPM adherence", v: 89 },
                ].map((r) => (
                  <div key={r.label}>
                    <div className="mb-1.5 flex items-center justify-between text-[11.5px]">
                      <span className="text-muted-foreground">{r.label}</span>
                      <span className="font-semibold tabular-nums">{r.v}%</span>
                    </div>
                    <Meter value={r.v} tone={r.v >= 85 ? "success" : "warning"} />
                  </div>
                ))}
              </div>
            </div>
          </Panel>

          <Panel interactive={false}>
            <PanelHead
              title="Related work orders"
              subtitle="Assignments on this asset"
              icon={<Wrench className="size-4" />}
            />
            <ul className="px-6 pb-6 sm:px-7">
              {(tasks.length ? tasks : engineerTasks.slice(0, 2)).map((t) => (
                <li key={t.id} className="border-b border-border/70 py-3 last:border-0">
                  <Link
                    to="/engineer/tasks/$id"
                    params={{ id: t.id }}
                    className="flex items-center gap-3"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-medium text-foreground">
                        {t.title}
                      </span>
                      <span className="block text-[11.5px] text-muted-foreground">
                        {t.id} · {t.slot}
                      </span>
                    </span>
                    <Pill tone={taskTone(t.status)}>{t.status}</Pill>
                  </Link>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel interactive={false}>
            <PanelHead
              title="Reported complaints"
              subtitle="Tickets logged against this asset"
              icon={<CircleAlert className="size-4" />}
            />
            <ul className="px-6 pb-6 sm:px-7">
              {(tickets.length ? tickets : complaints.slice(0, 2)).map((c) => (
                <li key={c.id} className="border-b border-border/70 py-3 last:border-0">
                  <p className="text-[13px] font-medium text-foreground">{c.title}</p>
                  <p className="mt-0.5 text-[11.5px] text-muted-foreground">
                    {c.id} · {c.status} · {c.assignee}
                  </p>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>
    </div>
  );
}
