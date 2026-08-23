import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Award,
  Bell,
  CalendarDays,
  CheckCircle2,
  Clock,
  Download,
  FileText,
  Gauge,
  History as HistoryIcon,
  Mail,
  MapPin,
  Phone,
  Search,
  Settings as SettingsIcon,
  ShieldCheck,
  Smartphone,
  UserRound,
  Wrench,
} from "lucide-react";
import { Meter, Panel, PanelHead, PageHeader, Pill, Ring } from "@/components/ui/primitives";
import { ActionButton } from "@/components/workflow/pages";
import { Crumbs, DefRow, EngineerTabs, KpiCard } from "@/components/engineer/kit";
import { SelectInput, TextArea, TextInput } from "@/components/engineer/workflow";
import {
  engineerAgenda,
  engineerHistory,
  engineerProfile,
  engineerTasks,
  engineerWeek,
  performanceRadar,
  priorityTone,
  taskTone,
  typeSplit,
  workloadTrend,
} from "@/lib/engineer";
import { usePreventiveList } from "@/lib/api/usePreventive";
import { useCalibrationList } from "@/lib/api/useCalibration";
import type { ApiCalibration, ApiEquipment, ApiPreventivePlan } from "@/lib/api/types";
import { cn } from "@/lib/utils";

const chartColors = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

/* ------------------------------ Maintenance history ----------------------------- */

export function MaintenanceHistoryPage() {
  const [query, setQuery] = useState("");
  const [type, setType] = useState("All");
  const types = ["All", ...new Set(engineerHistory.map((h) => h.type))];
  const rows = engineerHistory.filter(
    (h) =>
      (type === "All" || h.type === type) &&
      (h.task + h.equipment + h.id).toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 rise-in">
      <Crumbs trail={[{ label: "Maintenance history" }]} />
      <PageHeader
        eyebrow="Field operations"
        title="Maintenance history"
        description="Every job you have completed, with outcome, labour time and the archived service report."
        actions={
          <>
            <ActionButton variant="ghost" icon={Download}>
              Export CSV
            </ActionButton>
            <ActionButton to="/engineer/tasks" icon={Wrench}>
              Open tasks
            </ActionButton>
          </>
        }
      />
      <EngineerTabs active="history" />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Jobs completed (30d)" value="42" delta="+6 vs last month" tone="primary" />
        <KpiCard label="Pass rate" value="88%" delta="7 of 8 recent jobs passed" tone="success" />
        <KpiCard label="Avg. duration" value="1.9 h" delta="-14 min vs target" tone="violet" />
        <KpiCard label="Vendor escalations" value="1" delta="Dräger vaporiser" tone="warning" />
      </div>

      <Panel interactive={false}>
        <PanelHead
          title="Completed work orders"
          subtitle={`${rows.length} archived records`}
          icon={<HistoryIcon className="size-4" />}
          action={
            <div className="flex flex-wrap items-center gap-2">
              <label className="flex h-10 items-center gap-2 rounded-xl border border-border bg-surface px-3 text-[12.5px] shadow-xs">
                <Search className="size-3.5 text-muted-foreground" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search history…"
                  className="w-40 bg-transparent outline-none placeholder:text-muted-foreground"
                />
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="h-10 rounded-xl border border-border bg-surface px-3 text-[12.5px] font-medium shadow-xs outline-none"
              >
                {types.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </div>
          }
        />
        <div className="overflow-x-auto px-2 pb-6">
          <table className="w-full min-w-[900px] border-collapse">
            <thead>
              <tr className="border-y border-border bg-surface-muted/60">
                {[
                  "Work order",
                  "Task",
                  "Equipment",
                  "Type",
                  "Department",
                  "Date",
                  "Duration",
                  "Outcome",
                ].map((h) => (
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
              {rows.map((h) => (
                <tr
                  key={h.id}
                  className="border-b border-border/70 transition-colors last:border-0 hover:bg-surface-muted/60"
                >
                  <td className="px-4 py-3 text-[12.5px] font-semibold tabular-nums">{h.id}</td>
                  <td className="px-4 py-3 text-[13px] font-medium">{h.task}</td>
                  <td className="px-4 py-3 text-[12.5px] text-muted-foreground">{h.equipment}</td>
                  <td className="px-4 py-3 text-[12.5px]">{h.type}</td>
                  <td className="px-4 py-3 text-[12.5px] text-muted-foreground">{h.dept}</td>
                  <td className="px-4 py-3 text-[12.5px] tabular-nums">{h.date}</td>
                  <td className="px-4 py-3 text-[12.5px] tabular-nums">{h.duration}</td>
                  <td className="px-4 py-3">
                    <Pill tone={h.tone}>{h.outcome}</Pill>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel interactive={false}>
          <PanelHead
            title="Throughput"
            subtitle="Jobs closed per week"
            icon={<Gauge className="size-4" />}
          />
          <div className="h-[260px] px-3 pb-6 sm:px-5">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={workloadTrend}>
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
                  contentStyle={{
                    borderRadius: 14,
                    border: "1px solid var(--border)",
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="closed" radius={[8, 8, 0, 0]} fill="var(--chart-1)" />
                <Bar dataKey="opened" radius={[8, 8, 0, 0]} fill="var(--chart-4)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel interactive={false}>
          <PanelHead
            title="Recent reports"
            subtitle="Signed service documentation"
            icon={<FileText className="size-4" />}
          />
          <ul className="px-6 pb-6 sm:px-7">
            {engineerHistory.slice(0, 5).map((h) => (
              <li
                key={h.id}
                className="flex items-center gap-3 border-b border-border/70 py-3.5 last:border-0"
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-surface-muted text-muted-foreground">
                  <FileText className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium text-foreground">
                    SR-{h.id.replace("WO-", "")} · {h.task}
                  </p>
                  <p className="mt-0.5 text-[11.5px] text-muted-foreground">
                    {h.date} · {h.duration}
                  </p>
                </div>
                <Pill tone={h.tone}>{h.outcome}</Pill>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  );
}

/* ------------------------------- Calendar & schedule ----------------------------- */

const pmStateTone: Record<string, "danger" | "warning" | "primary" | "neutral"> = {
  OVERDUE: "danger",
  DUE_TODAY: "warning",
  UPCOMING: "primary",
  INACTIVE: "neutral",
};

const pmDueLabel = (plan: ApiPreventivePlan) => {
  const days = plan.daysUntilDue;
  if (days === null || days === undefined) return "—";
  if (days < 0) return `${Math.abs(days)} d overdue`;
  if (days === 0) return "Due today";
  return `In ${days} d`;
};

/**
 * Live preventive maintenance plans due in the next 30 days.
 * Renders only when the MERN backend is configured — the demo week grid above
 * stays untouched otherwise.
 */
function PreventiveSchedulePanel() {
  const live = usePreventiveList({ active: true, limit: 50 });
  if (!live.enabled) return null;

  const plans = live.items ?? [];

  return (
    <Panel interactive={false}>
      <PanelHead
        title="Preventive maintenance due"
        subtitle={
          live.stats
            ? `${live.stats.overdue} overdue · ${live.stats.dueToday} due today · ${live.stats.upcoming} upcoming`
            : "Scheduled PPM plans for your equipment"
        }
        icon={<ShieldCheck className="size-4" />}
      />
      <div className="px-6 pb-6 sm:px-7">
        {live.loading ? (
          <p className="rounded-xl bg-surface-muted px-4 py-6 text-center text-[12px] text-muted-foreground">
            Loading preventive plans…
          </p>
        ) : live.error ? (
          <p className="rounded-xl bg-danger-soft px-4 py-6 text-center text-[12px] text-danger">
            {live.error}
          </p>
        ) : plans.length === 0 ? (
          <p className="rounded-xl bg-surface-muted px-4 py-6 text-center text-[12px] text-muted-foreground">
            No preventive maintenance plans scheduled.
          </p>
        ) : (
          <ul className="space-y-2">
            {plans.map((plan) => {
              const equipment = plan.equipmentId as ApiEquipment | string;
              const asset = typeof equipment === "string" ? null : equipment;
              return (
                <li
                  key={plan._id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-surface px-4 py-3 shadow-xs"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[12.5px] font-medium text-foreground">
                      {plan.title || `${plan.frequency} preventive maintenance`}
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {plan.preventiveMaintenanceId}
                      {asset ? ` · ${asset.equipmentId} ${asset.name}` : ""}
                      {asset?.location ? ` · ${asset.location}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] tabular-nums text-muted-foreground">
                      {new Date(plan.nextDueDate).toLocaleDateString()}
                    </span>
                    <Pill tone={pmStateTone[plan.scheduleState ?? "UPCOMING"] ?? "neutral"}>
                      {pmDueLabel(plan)}
                    </Pill>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Panel>
  );
}

const calStateTone: Record<string, "danger" | "warning" | "primary" | "success" | "neutral"> = {
  OVERDUE: "danger",
  DUE_TODAY: "warning",
  UPCOMING: "primary",
  COMPLETED: "success",
  INACTIVE: "neutral",
};

const calDueLabel = (record: ApiCalibration) => {
  if (record.status === "PASSED") return "Passed";
  if (record.status === "FAILED") return "Failed";
  const days = record.daysUntilDue;
  if (days === null || days === undefined) return "—";
  if (days < 0) return `${Math.abs(days)} d overdue`;
  if (days === 0) return "Due today";
  return `In ${days} d`;
};

/**
 * Live calibration records. Renders only when the MERN backend is configured —
 * the demo schedule above stays untouched otherwise.
 */
function CalibrationSchedulePanel() {
  const live = useCalibrationList({ active: true, limit: 50 });
  if (!live.enabled) return null;

  const records = live.items ?? [];

  return (
    <Panel interactive={false}>
      <PanelHead
        title="Calibration due"
        subtitle={
          live.stats
            ? `${live.stats.overdue} overdue · ${live.stats.dueToday} due today · ${live.stats.upcoming} upcoming · ${live.stats.passed} passed`
            : "Scheduled calibration for your equipment"
        }
        icon={<ShieldCheck className="size-4" />}
      />
      <div className="px-6 pb-6 sm:px-7">
        {live.loading ? (
          <p className="rounded-xl bg-surface-muted px-4 py-6 text-center text-[12px] text-muted-foreground">
            Loading calibration records…
          </p>
        ) : live.error ? (
          <p className="rounded-xl bg-danger-soft px-4 py-6 text-center text-[12px] text-danger">
            {live.error}
          </p>
        ) : records.length === 0 ? (
          <p className="rounded-xl bg-surface-muted px-4 py-6 text-center text-[12px] text-muted-foreground">
            No calibration scheduled.
          </p>
        ) : (
          <ul className="space-y-2">
            {records.map((record) => {
              const equipment = record.equipmentId as ApiEquipment | string;
              const asset = typeof equipment === "string" ? null : equipment;
              const due =
                record.scheduleState === "COMPLETED"
                  ? record.nextCalibrationDate
                  : record.scheduledDate;
              return (
                <li
                  key={record._id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-surface px-4 py-3 shadow-xs"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[12.5px] font-medium text-foreground">
                      {record.title || `${record.frequency} calibration`}
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {record.calibrationId}
                      {asset ? ` · ${asset.equipmentId} ${asset.name}` : ""}
                      {record.calibrationStandard ? ` · ${record.calibrationStandard}` : ""}
                      {record.certificateNumber ? ` · Cert ${record.certificateNumber}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] tabular-nums text-muted-foreground">
                      {due ? new Date(due).toLocaleDateString() : "—"}
                    </span>
                    <Pill tone={calStateTone[record.scheduleState ?? "UPCOMING"] ?? "neutral"}>
                      {calDueLabel(record)}
                    </Pill>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Panel>
  );
}

export function CalendarSchedule() {
  const dot: Record<string, string> = {
    neutral: "bg-muted-foreground",
    primary: "bg-primary",
    success: "bg-success",
    warning: "bg-warning",
    danger: "bg-danger",
    violet: "bg-violet",
    info: "bg-primary",
  };

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 rise-in">
      <Crumbs trail={[{ label: "Calendar & schedule" }]} />
      <PageHeader
        eyebrow="Field operations"
        title="Calendar & schedule"
        description="Your planned week, today's agenda and the on-call rotation for the biomedical wing."
        actions={
          <>
            <ActionButton variant="ghost" icon={Download}>
              Sync to calendar
            </ActionButton>
            <ActionButton to="/engineer/tasks" icon={Wrench}>
              Assigned tasks
            </ActionButton>
          </>
        }
      />
      <EngineerTabs active="calendar" />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Jobs this week" value="11" delta="3 critical" tone="primary" />
        <KpiCard label="Booked hours" value="27.5" delta="of 37.5 available" tone="violet" />
        <KpiCard label="Travel time" value="3.2 h" delta="Across 4 wings" tone="warning" />
        <KpiCard label="On-call" value="Sat 08" delta="Hospital-wide cover" tone="danger" />
      </div>

      <Panel interactive={false}>
        <PanelHead
          title="Week of 03 – 09 August"
          subtitle="Planned interventions by day"
          icon={<CalendarDays className="size-4" />}
        />
        <div className="grid gap-3 px-6 pb-6 sm:px-7 md:grid-cols-4 xl:grid-cols-7">
          {engineerWeek.map((d) => (
            <div
              key={d.day}
              className="rounded-2xl border border-border bg-surface p-3.5 shadow-xs"
            >
              <div className="mb-3 flex items-baseline justify-between">
                <span className="text-[12px] font-semibold text-foreground">{d.day}</span>
                <span className="text-[11px] tabular-nums text-muted-foreground">Aug {d.date}</span>
              </div>
              <div className="space-y-2">
                {d.items.length === 0 ? (
                  <p className="rounded-xl bg-surface-muted px-3 py-4 text-center text-[11.5px] text-muted-foreground">
                    Rest day
                  </p>
                ) : (
                  d.items.map((i) => (
                    <div key={i.title} className="rounded-xl bg-surface-muted px-3 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <span className={cn("size-1.5 rounded-full", dot[i.tone])} />
                        <span className="text-[11px] font-semibold tabular-nums text-muted-foreground">
                          {i.time}
                        </span>
                      </div>
                      <p className="mt-1 text-[12px] font-medium leading-snug text-foreground">
                        {i.title}
                      </p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">{i.where}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      </Panel>

      <PreventiveSchedulePanel />

      <CalibrationSchedulePanel />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Panel interactive={false}>
          <PanelHead
            title="Today's agenda"
            subtitle="Chronological run sheet"
            icon={<Clock className="size-4" />}
          />
          <ul className="px-6 pb-6 sm:px-7">
            {engineerAgenda.map((s) => (
              <li
                key={s.time}
                className="flex items-start gap-4 border-b border-border/70 py-3.5 last:border-0"
              >
                <span className="w-14 shrink-0 text-[12.5px] font-semibold tabular-nums text-muted-foreground">
                  {s.time}
                </span>
                <span
                  className={cn("mt-1.5 size-2 shrink-0 rounded-full", dot[s.tone] ?? "bg-primary")}
                />
                <div className="min-w-0">
                  <p className="text-[13px] font-medium text-foreground">{s.title}</p>
                  <p className="mt-0.5 text-[11.5px] text-muted-foreground">{s.where}</p>
                </div>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel interactive={false}>
          <PanelHead
            title="Upcoming assignments"
            subtitle="Next work orders in the queue"
            icon={<Wrench className="size-4" />}
          />
          <ul className="px-6 pb-6 sm:px-7">
            {engineerTasks
              .filter((t) => t.status !== "Completed")
              .map((t) => (
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
                        {t.slot} · {t.dept}
                      </span>
                    </span>
                    <Pill tone={priorityTone(t.priority)}>{t.priority}</Pill>
                  </Link>
                </li>
              ))}
          </ul>
        </Panel>
      </div>
    </div>
  );
}

/* ----------------------------- Performance dashboard ---------------------------- */

export function PerformanceDashboard() {
  return (
    <div className="mx-auto max-w-[1600px] space-y-6 rise-in">
      <Crumbs trail={[{ label: "Performance" }]} />
      <PageHeader
        eyebrow="Field operations"
        title="Performance dashboard"
        description="How your maintenance output compares against SLA targets, work mix and the wider biomedical team."
        actions={
          <>
            <ActionButton variant="ghost" to="/engineer/history" icon={HistoryIcon}>
              History
            </ActionButton>
            <ActionButton variant="ghost" icon={Download}>
              Export review pack
            </ActionButton>
          </>
        }
      />
      <EngineerTabs active="performance" />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="First-time fix" value="92%" delta="+4.1% vs quarter" tone="success" />
        <KpiCard label="SLA adherence" value="96%" delta="Team avg 91%" tone="primary" />
        <KpiCard label="Utilisation" value="81%" delta="27.5 h booked" tone="violet" />
        <KpiCard label="Reopened jobs" value="2" delta="-3 vs last month" tone="warning" />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Panel interactive={false}>
          <PanelHead
            title="Opened vs closed"
            subtitle="Six-week rolling workload"
            icon={<Gauge className="size-4" />}
          />
          <div className="h-[300px] px-3 pb-6 sm:px-5">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={workloadTrend}>
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
                  contentStyle={{
                    borderRadius: 14,
                    border: "1px solid var(--border)",
                    fontSize: 12,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="opened" name="Opened" radius={[8, 8, 0, 0]} fill="var(--chart-4)" />
                <Bar dataKey="closed" name="Closed" radius={[8, 8, 0, 0]} fill="var(--chart-1)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel interactive={false}>
          <PanelHead
            title="Work mix"
            subtitle="Share of jobs by type"
            icon={<Wrench className="size-4" />}
          />
          <div className="h-[300px] px-3 pb-6 sm:px-5">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={typeSplit}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={58}
                  outerRadius={92}
                  paddingAngle={3}
                >
                  {typeSplit.map((_, i) => (
                    <Cell key={i} fill={chartColors[i % chartColors.length]} />
                  ))}
                </Pie>
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    borderRadius: 14,
                    border: "1px solid var(--border)",
                    fontSize: 12,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Panel interactive={false}>
          <PanelHead
            title="Competency radar"
            subtitle="Assessed against role expectations"
            icon={<Award className="size-4" />}
          />
          <div className="h-[320px] px-3 pb-6 sm:px-5">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={performanceRadar} outerRadius={110}>
                <PolarGrid stroke="var(--border)" />
                <PolarAngleAxis
                  dataKey="axis"
                  tick={{ fontSize: 11.5, fill: "var(--muted-foreground)" }}
                />
                <Radar
                  dataKey="A"
                  stroke="var(--chart-1)"
                  fill="var(--chart-1)"
                  fillOpacity={0.28}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 14,
                    border: "1px solid var(--border)",
                    fontSize: 12,
                  }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel interactive={false}>
          <PanelHead
            title="Quality signals"
            subtitle="Rolling 90-day indicators"
            icon={<ShieldCheck className="size-4" />}
          />
          <div className="flex flex-wrap items-center gap-8 px-6 pb-6 sm:px-7">
            <Ring value={92} size={120} sub="Overall" />
            <div className="min-w-0 flex-1 space-y-4">
              {[
                { label: "Documentation completeness", v: 88 },
                { label: "Safety test compliance", v: 98 },
                { label: "Response within SLA", v: 96 },
                { label: "Parts forecast accuracy", v: 71 },
              ].map((r) => (
                <div key={r.label}>
                  <div className="mb-1.5 flex items-center justify-between text-[12px]">
                    <span className="text-muted-foreground">{r.label}</span>
                    <span className="font-semibold tabular-nums">{r.v}%</span>
                  </div>
                  <Meter
                    value={r.v}
                    tone={r.v >= 90 ? "success" : r.v >= 75 ? "primary" : "warning"}
                  />
                </div>
              ))}
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}

/* ---------------------------------- Profile ------------------------------------- */

export function EngineerProfilePage() {
  const p = engineerProfile;
  return (
    <div className="mx-auto max-w-[1600px] space-y-6 rise-in">
      <Crumbs trail={[{ label: "Profile" }]} />
      <PageHeader
        eyebrow="Administration"
        title={p.name}
        description={`${p.role} · ${p.zone} · employee ${p.employeeId}. Credentials, competencies and current field coverage.`}
        actions={
          <>
            <ActionButton variant="ghost" to="/engineer/settings" icon={SettingsIcon}>
              Settings
            </ActionButton>
            <ActionButton to="/engineer/performance" icon={Gauge}>
              Performance
            </ActionButton>
          </>
        }
      />
      <EngineerTabs active="profile" />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <div className="space-y-5">
          <Panel interactive={false}>
            <div className="flex flex-col items-center gap-4 px-6 py-8 text-center sm:px-7">
              <span className="grid size-20 place-items-center rounded-3xl gradient-primary text-xl font-bold text-white shadow-glow">
                {p.avatar}
              </span>
              <div>
                <p className="text-[17px] font-bold text-foreground">{p.name}</p>
                <p className="mt-1 text-[12.5px] text-muted-foreground">{p.role}</p>
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                <Pill tone="success">Active</Pill>
                <Pill tone="primary">{p.shift.split("·")[0]!.trim()} shift</Pill>
              </div>
            </div>
            <div className="px-6 pb-6 sm:px-7">
              <dl>
                <DefRow label="Handle" value={p.handle} />
                <DefRow label="Employee ID" value={p.employeeId} />
                <DefRow
                  label="Email"
                  value={
                    <span className="inline-flex items-center gap-2">
                      <Mail className="size-3.5 text-muted-foreground" />
                      {p.email}
                    </span>
                  }
                />
                <DefRow
                  label="Phone"
                  value={
                    <span className="inline-flex items-center gap-2">
                      <Phone className="size-3.5 text-muted-foreground" />
                      {p.phone}
                    </span>
                  }
                />
                <DefRow
                  label="Zone"
                  value={
                    <span className="inline-flex items-center gap-2">
                      <MapPin className="size-3.5 text-muted-foreground" />
                      {p.zone}
                    </span>
                  }
                />
                <DefRow label="Shift" value={p.shift} />
              </dl>
            </div>
          </Panel>

          <Panel interactive={false}>
            <PanelHead
              title="Skills"
              subtitle="Verified competencies"
              icon={<UserRound className="size-4" />}
            />
            <div className="flex flex-wrap gap-2 px-6 pb-6 sm:px-7">
              {p.skills.map((s) => (
                <Pill key={s} tone="primary">
                  {s}
                </Pill>
              ))}
            </div>
          </Panel>
        </div>

        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard label="Open jobs" value="5" delta="3 due today" tone="primary" />
            <KpiCard label="Closed (30d)" value="42" delta="+6" tone="success" />
            <KpiCard label="Assets covered" value="318" delta="ICU & Renal" tone="violet" />
            <KpiCard
              label="Certifications"
              value={String(p.certifications.length)}
              delta="1 expiring soon"
              tone="warning"
            />
          </div>

          <Panel interactive={false}>
            <PanelHead
              title="Certifications"
              subtitle="Training and regulatory currency"
              icon={<Award className="size-4" />}
            />
            <ul className="px-6 pb-6 sm:px-7">
              {p.certifications.map((c) => (
                <li
                  key={c.name}
                  className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 py-3.5 last:border-0"
                >
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium text-foreground">{c.name}</p>
                    <p className="mt-0.5 text-[11.5px] text-muted-foreground">
                      Issued {c.issued} · Expires {c.expires}
                    </p>
                  </div>
                  <Pill tone={c.tone}>
                    {c.tone === "danger"
                      ? "Renew now"
                      : c.tone === "warning"
                        ? "Expiring"
                        : "Current"}
                  </Pill>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel interactive={false}>
            <PanelHead
              title="Current assignments"
              subtitle="Live coverage across departments"
              icon={<Wrench className="size-4" />}
            />
            <ul className="px-6 pb-6 sm:px-7">
              {engineerTasks.slice(0, 5).map((t) => (
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
                        {t.id} · {t.equipment}
                      </span>
                    </span>
                    <Pill tone={taskTone(t.status)}>{t.status}</Pill>
                  </Link>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------- Settings ------------------------------------ */

export function EngineerSettings() {
  const [toggles, setToggles] = useState<Record<string, boolean>>({
    "Critical work order alerts": true,
    "SLA breach warnings": true,
    "Daily schedule digest": true,
    "Parts delivery notifications": false,
    "Offline mode sync on Wi-Fi only": true,
    "Auto-attach safety test results": true,
    "Require signature before closure": true,
  });

  const groups = [
    {
      title: "Notifications",
      icon: Bell,
      subtitle: "How the field app reaches you",
      keys: [
        "Critical work order alerts",
        "SLA breach warnings",
        "Daily schedule digest",
        "Parts delivery notifications",
      ],
    },
    {
      title: "Field defaults",
      icon: Wrench,
      subtitle: "Behaviour while working on site",
      keys: [
        "Offline mode sync on Wi-Fi only",
        "Auto-attach safety test results",
        "Require signature before closure",
      ],
    },
  ];

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 rise-in">
      <Crumbs trail={[{ label: "Settings" }]} />
      <PageHeader
        eyebrow="Administration"
        title="Engineer settings"
        description="Control notifications, field defaults, offline sync and device security for your maintenance workspace."
        actions={
          <>
            <ActionButton variant="ghost" to="/engineer/profile" icon={UserRound}>
              Profile
            </ActionButton>
            <ActionButton icon={CheckCircle2}>Save preferences</ActionButton>
          </>
        }
      />
      <EngineerTabs active="settings" />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="space-y-5">
          {groups.map((g) => (
            <Panel key={g.title} interactive={false}>
              <PanelHead
                title={g.title}
                subtitle={g.subtitle}
                icon={<g.icon className="size-4" />}
              />
              <ul className="px-6 pb-6 sm:px-7">
                {g.keys.map((k) => (
                  <li
                    key={k}
                    className="flex items-center justify-between gap-4 border-b border-border/70 py-3.5 last:border-0"
                  >
                    <span className="min-w-0 text-[13px] text-foreground">{k}</span>
                    <button
                      onClick={() => setToggles((t) => ({ ...t, [k]: !t[k] }))}
                      aria-pressed={toggles[k]}
                      className={cn(
                        "relative h-6 w-11 shrink-0 rounded-full transition-colors",
                        toggles[k] ? "bg-primary" : "bg-surface-muted border border-border",
                      )}
                    >
                      <span
                        className={cn(
                          "absolute top-0.5 size-5 rounded-full bg-white shadow-xs transition-all",
                          toggles[k] ? "left-[22px]" : "left-0.5",
                        )}
                      />
                    </button>
                  </li>
                ))}
              </ul>
            </Panel>
          ))}

          <Panel interactive={false}>
            <PanelHead
              title="Work preferences"
              subtitle="Defaults applied to new work orders"
              icon={<SettingsIcon className="size-4" />}
            />
            <div className="grid gap-4 px-6 pb-6 sm:px-7 md:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-[12px] font-medium text-muted-foreground">
                  Default department
                </span>
                <SelectInput
                  options={[
                    "ICU",
                    "Radiology",
                    "Operating Theatre",
                    "Emergency",
                    "Laboratory",
                    "Cardiology",
                  ]}
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-[12px] font-medium text-muted-foreground">
                  Preferred shift
                </span>
                <SelectInput options={["Morning", "Evening", "Night", "Rotating"]} />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-[12px] font-medium text-muted-foreground">
                  Default test instrument
                </span>
                <SelectInput
                  options={[
                    "Fluke ESA615 · CAL-2291",
                    "Rigel 288+ · CAL-2277",
                    "Seaward Priming · CAL-2260",
                  ]}
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-[12px] font-medium text-muted-foreground">
                  Measurement units
                </span>
                <SelectInput options={["Metric (SI)", "Imperial"]} />
              </label>
              <label className="block md:col-span-2">
                <span className="mb-1.5 block text-[12px] font-medium text-muted-foreground">
                  Service report signature block
                </span>
                <TextArea
                  rows={3}
                  defaultValue="Daniel Okafor · Senior Biomedical Engineer · BME-2207 · Medixa Clinical Engineering"
                />
              </label>
            </div>
          </Panel>
        </div>

        <div className="space-y-5">
          <Panel interactive={false}>
            <PanelHead
              title="Device & security"
              subtitle="Field tablet posture"
              icon={<Smartphone className="size-4" />}
            />
            <div className="px-6 pb-6 sm:px-7">
              <dl>
                <DefRow label="Device" value="Medixa Field Tablet · MT-118" />
                <DefRow label="App version" value="4.8.2 (build 2261)" />
                <DefRow label="Offline cache" value="Last synced 12 min ago" />
                <DefRow label="Screen lock" value="5 minutes" />
                <DefRow label="MFA" value={<Pill tone="success">Enabled</Pill>} />
              </dl>
              <div className="mt-4 grid gap-3">
                <label className="block">
                  <span className="mb-1.5 block text-[12px] font-medium text-muted-foreground">
                    Emergency contact
                  </span>
                  <TextInput defaultValue="Biomedical control room · ext. 4400" />
                </label>
              </div>
            </div>
          </Panel>

          <Panel interactive={false}>
            <PanelHead
              title="Data & retention"
              subtitle="Policy applied to your records"
              icon={<ShieldCheck className="size-4" />}
            />
            <ul className="px-6 pb-6 sm:px-7">
              {[
                "Service reports retained for 7 years",
                "Evidence photos encrypted at rest",
                "Offline records purge 30 days after sync",
                "Audit trail is immutable once a job closes",
              ].map((n) => (
                <li
                  key={n}
                  className="flex items-start gap-3 border-b border-border/70 py-3 text-[13px] last:border-0"
                >
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                  <span className="text-foreground">{n}</span>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>
    </div>
  );
}
