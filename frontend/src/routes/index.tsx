import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
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
  ArrowUpRight,
  ArrowRight,
  BellRing,
  CalendarDays,
  CircleAlert,
  Cpu,
  FileText,
  Loader2,
  Plus,
  ShieldCheck,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Wrench,
  Zap,
} from "lucide-react";
import { EmptyState, Meter, Panel, PanelHead, Pill, Ring } from "@/components/ui/primitives";
import {
  activities,
  complaintFlow as complaintFlowData,
  complaints,
  costSplit,
  departments,
  engineers,
  healthTrend,
  kpis,
  maintenance,
  notifications,
  radarData,
  schedule,
  warranties,
} from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { analyticsApi, type DashboardAnalytics } from "@/lib/api/analyticsApi";
import { useComplaintList } from "@/lib/api/useComplaints";
import { useWorkOrderList } from "@/lib/api/useWorkOrders";
import { useWarrantyList } from "@/lib/api/useWarranty";
import { useNotifications } from "@/lib/api/useNotifications";
import { auditApi } from "@/lib/api/auditApi";
import { departmentsApi } from "@/lib/api/departmentsApi";
import { apiEnabled } from "@/lib/api/client";
import type { ApiAuditLog, ApiDepartment } from "@/lib/api/types";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Command Center — Medixa Hospital Asset Intelligence" },
      {
        name: "description",
        content:
          "Executive command center for hospital equipment health, maintenance, complaints and warranty performance.",
      },
      { property: "og:title", content: "Command Center — Medixa" },
      {
        property: "og:description",
        content:
          "Real-time hospital asset intelligence across equipment, maintenance and compliance.",
      },
    ],
  }),
  component: Dashboard,
});

const chartTip = {
  contentStyle: {
    borderRadius: 14,
    border: "1px solid var(--border)",
    boxShadow: "var(--shadow-float)",
    fontSize: 12,
    padding: "10px 12px",
  },
  labelStyle: { fontWeight: 600, color: "var(--foreground)", marginBottom: 4 },
};

const pieColors = ["var(--chart-1)", "var(--chart-5)", "var(--chart-2)", "var(--chart-4)"];

/** Fetches /analytics/dashboard from MongoDB */
function useDashboardAnalytics() {
  const [data, setData] = useState<DashboardAnalytics | null>(null);
  const [loading, setLoading] = useState(apiEnabled);
  useEffect(() => {
    if (!apiEnabled) return;
    analyticsApi
      .dashboard()
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);
  return { data, loading };
}

function HeroBanner({ analytics, loading }: { analytics: DashboardAnalytics | null; loading: boolean }) {

  const liveKpis = analytics
    ? [
        {
          key: "equipment",
          label: "Total equipment",
          value: analytics.totalEquipment.toLocaleString(),
          delta: analytics.operational + " operational",
          trend: "up" as const,
        },
        {
          key: "complaints",
          label: "Open complaints",
          value: analytics.openComplaints.toString(),
          delta: analytics.resolvedComplaints + " resolved",
          trend: (analytics.openComplaints > 10 ? "down" : "up") as "up" | "down",
        },
        {
          key: "workorders",
          label: "Work orders",
          value: analytics.workOrders.toString(),
          delta: analytics.completedWorkOrders + " completed",
          trend: "up" as const,
        },
        {
          key: "completion",
          label: "Completion rate",
          value: analytics.maintenanceCompletionRate.toFixed(1) + "%",
          delta: "Avg " + analytics.avgResolutionHours.toFixed(1) + "h resolution",
          trend: (analytics.maintenanceCompletionRate >= 80 ? "up" : "down") as "up" | "down",
        },
      ]
    : kpis;

  return (
    <section className="relative overflow-hidden rounded-[28px] border border-border bg-surface shadow-float rise-in">
      <div className="absolute inset-0 gradient-mesh" />
      <div className="absolute inset-0 grid-lines opacity-40" />
      <div className="relative grid gap-8 p-8 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:p-10">
        <div className="min-w-0">
          <Pill tone="primary">
            <Sparkles className="size-3" /> Monday · 03 August · Shift A
          </Pill>
          <h1 className="mt-5 text-[34px] font-bold leading-[1.1] tracking-tight text-foreground lg:text-[40px]">
            Good morning, Emilia.
            <span className="block text-gradient">
              {analytics
                ? "Fleet: " +
                  analytics.totalEquipment.toLocaleString() +
                  " assets · " +
                  analytics.operational +
                  " operational"
                : "Your fleet is running at 98.4% uptime."}
            </span>
          </h1>
          <p className="mt-4 max-w-xl text-[14.5px] leading-relaxed text-muted-foreground">
            {analytics
              ? analytics.openComplaints +
                " open complaints · " +
                analytics.workOrders +
                " work orders · " +
                analytics.maintenanceCompletionRate.toFixed(0) +
                "% maintenance completion."
              : "Two critical assets need attention before noon, 18 preventive work orders are queued, and one AMC contract expires in 12 days."}
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <button className="inline-flex items-center gap-2 rounded-xl gradient-primary px-5 py-2.5 text-[13.5px] font-semibold text-white shadow-glow transition-transform hover:-translate-y-0.5">
              <Zap className="size-4" /> Run daily briefing
            </button>
            <Link
              to="/complaints"
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-5 py-2.5 text-[13.5px] font-semibold text-foreground shadow-xs transition-all hover:-translate-y-0.5 hover:shadow-soft"
            >
              Review escalations <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 self-center">
          {loading ? (
            <div className="col-span-2 flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="mr-2 size-5 animate-spin" /> Loading analytics…
            </div>
          ) : (
            liveKpis.map((k) => (
              <div key={k.key} className="glass-card hover-lift p-5">
                <p className="text-[11.5px] font-medium text-muted-foreground">{k.label}</p>
                <p className="mt-2 text-[26px] font-bold leading-none tabular-nums text-foreground">
                  {k.value}
                </p>
                <p
                  className={cn(
                    "mt-2.5 inline-flex items-center gap-1 text-[11.5px] font-semibold",
                    k.trend === "up" ? "text-success" : "text-primary",
                  )}
                >
                  {k.trend === "up" ? (
                    <TrendingUp className="size-3.5" />
                  ) : (
                    <TrendingDown className="size-3.5" />
                  )}
                  {k.delta}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
}

function EquipmentHealth({ analytics }: { analytics: DashboardAnalytics | null }) {
  const activeHealthTrend = apiEnabled && analytics?.healthTrend ? analytics.healthTrend : healthTrend;
  const compositeHealth = analytics && analytics.healthTrend && analytics.healthTrend.length > 0
    ? analytics.healthTrend[analytics.healthTrend.length - 1].health
    : 98;

  return (
    <Panel className="lg:col-span-2">
      <PanelHead
        title="Equipment health index"
        subtitle="Rolling 8-month fleet condition vs. uptime"
        icon={<Cpu className="size-4" />}
        action={
          <div className="flex items-center gap-1 rounded-xl bg-surface-muted p-1">
            {["8M", "1Y", "All"].map((t, i) => (
              <button
                key={t}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-[11.5px] font-semibold transition-colors",
                  i === 0
                    ? "bg-surface text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {t}
              </button>
            ))}
          </div>
        }
      />
      <div className="flex flex-wrap items-center gap-8 px-7 pb-2">
        <div>
          <p className="text-[32px] font-bold leading-none tabular-nums">{compositeHealth}%</p>
          <p className="mt-1.5 text-[12px] text-muted-foreground">Composite health score</p>
        </div>
        <div className="h-10 w-px bg-border" />
        <div className="flex gap-6">
          {[
            { l: "Assets monitored", v: analytics ? analytics.totalEquipment.toLocaleString() : "2,486" },
            { l: "Incidents this month", v: analytics ? analytics.openComplaints.toString() : "9" },
            { l: "MTTR", v: analytics ? `${(analytics.avgResolutionHours / 10).toFixed(1)} h` : "3.2 h" },
          ].map((s) => (
            <div key={s.l}>
              <p className="text-[17px] font-semibold tabular-nums">{s.v}</p>
              <p className="text-[11.5px] text-muted-foreground">{s.l}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="h-[240px] px-2 pb-4">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={activeHealthTrend} margin={{ top: 20, right: 24, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="gHealth" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.35} />
                <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gUptime" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--chart-5)" stopOpacity={0.22} />
                <stop offset="100%" stopColor="var(--chart-5)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="4 6" vertical={false} stroke="var(--border)" />
            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              fontSize={11}
              stroke="var(--muted-foreground)"
            />
            <YAxis
              domain={[85, 100]}
              tickLine={false}
              axisLine={false}
              fontSize={11}
              width={36}
              stroke="var(--muted-foreground)"
            />
            <Tooltip {...chartTip} />
            <Area
              type="monotone"
              dataKey="health"
              stroke="var(--chart-1)"
              strokeWidth={2.5}
              fill="url(#gHealth)"
            />
            <Area
              type="monotone"
              dataKey="uptime"
              stroke="var(--chart-5)"
              strokeWidth={2}
              fill="url(#gUptime)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Panel>
  );
}

function OpenComplaints() {
  const {
    items: liveComplaints,
    loading,
    total,
  } = useComplaintList(apiEnabled ? { status: "OPEN", limit: 4 } : { limit: 0 });

  const toneFor = (p: string) =>
    p === "Critical" || p === "CRITICAL"
      ? ("danger" as const)
      : p === "High" || p === "HIGH"
        ? ("warning" as const)
        : p === "Medium" || p === "MEDIUM"
          ? ("primary" as const)
          : ("neutral" as const);

  // When API is disabled fall back to mock complaints
  const displayComplaints = apiEnabled
    ? (liveComplaints ?? [])
    : complaints.slice(0, 4).map((c) => ({
        _id: c.id,
        complaintId: c.id,
        title: c.title,
        priority: c.priority,
        departmentId: c.dept,
        equipmentId: { name: c.equipment } as { name: string },
        slaBreached: c.sla > 70,
      }));

  return (
    <Panel>
      <PanelHead
        title="Open complaints"
        subtitle={loading ? "Loading…" : (total ?? displayComplaints.length).toString() + " active"}
        icon={<CircleAlert className="size-4" />}
        action={
          <Link to="/complaints" className="text-[12px] font-semibold text-primary hover:underline">
            View all
          </Link>
        }
      />
      <ul className="space-y-1 px-4 pb-5">
        {loading && (
          <li className="flex items-center justify-center py-6 text-muted-foreground">
            <Loader2 className="mr-2 size-4 animate-spin" /> Loading…
          </li>
        )}
        {!loading && displayComplaints.length === 0 && (
          <li className="py-6 text-center text-[13px] text-muted-foreground">No open complaints</li>
        )}
        {displayComplaints.map((c) => {
          const equipName =
            typeof c.equipmentId === "object" && c.equipmentId !== null
              ? ((c.equipmentId as { name?: string }).name ?? "")
              : String(c.equipmentId ?? "");
          const deptName =
            typeof c.departmentId === "object" && c.departmentId !== null
              ? ((c.departmentId as { name?: string }).name ?? "")
              : String(c.departmentId ?? "");
          const label = deptName || equipName;
          return (
            <li
              key={c._id}
              className="group rounded-2xl px-3 py-3 transition-colors hover:bg-surface-muted"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-[11px] font-semibold tabular-nums text-muted-foreground">
                  {(c as { complaintId?: string }).complaintId ?? c._id}
                </span>
                <Pill tone={toneFor(c.priority)}>{c.priority}</Pill>
              </div>
              <p className="mt-1.5 line-clamp-1 text-[13px] font-medium text-foreground">
                {c.title}
              </p>
              {label && <p className="mt-1 text-[11.5px] text-muted-foreground">{label}</p>}
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}

function MaintenanceToday() {
  const { items: liveWorkOrders, loading } = useWorkOrderList(
    apiEnabled ? { limit: 5 } : { limit: 0 },
  );

  const displayList =
    apiEnabled && liveWorkOrders
      ? liveWorkOrders.map((wo) => ({
          id: wo.workOrderId,
          task: wo.title,
          progress: wo.status === "COMPLETED" ? 100 : wo.status === "IN_PROGRESS" ? 50 : 0,
          time: wo.scheduledDate
            ? new Date(wo.scheduledDate).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })
            : "Today",
          equipment:
            typeof wo.equipmentId === "object" && wo.equipmentId
              ? ((wo.equipmentId as { name?: string }).name ?? "")
              : "Equipment",
          engineer:
            typeof wo.engineerId === "object" && wo.engineerId
              ? ((wo.engineerId as { name?: string }).name ?? "Unassigned")
              : "Unassigned",
        }))
      : maintenance;

  return (
    <Panel>
      <PanelHead
        title="Maintenance today"
        subtitle={
          loading
            ? "Loading work orders…"
            : `${displayList.length} work orders · ${displayList.filter((m) => m.progress === 100).length} completed`
        }
        icon={<Wrench className="size-4" />}
      />
      <ol className="relative space-y-5 px-7 pb-7 pt-1">
        <span className="absolute left-[38px] top-2 bottom-8 w-px bg-border" />
        {loading && (
          <li className="flex items-center justify-center py-6 text-muted-foreground">
            <Loader2 className="mr-2 size-4 animate-spin" /> Loading…
          </li>
        )}
        {!loading && displayList.length === 0 && (
          <li className="py-6 text-center text-[13px] text-muted-foreground">
            No maintenance scheduled
          </li>
        )}
        {!loading &&
          displayList.map((m) => (
            <li key={m.id} className="relative flex gap-4">
              <span
                className={cn(
                  "relative z-10 mt-0.5 grid size-6 shrink-0 place-items-center rounded-full border-2 bg-surface text-[9px] font-bold",
                  m.progress === 100
                    ? "border-success text-success"
                    : m.progress > 0
                      ? "border-primary text-primary"
                      : "border-border text-muted-foreground",
                )}
              >
                {m.progress === 100 ? "✓" : ""}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-[13px] font-semibold">{m.task}</p>
                  <span className="shrink-0 text-[11px] font-semibold tabular-nums text-muted-foreground">
                    {m.time}
                  </span>
                </div>
                <p className="mt-0.5 truncate text-[11.5px] text-muted-foreground">
                  {m.equipment} · {m.engineer}
                </p>
              </div>
            </li>
          ))}
      </ol>
    </Panel>
  );
}

function UpcomingWarranty() {
  const { items: liveWarranties, loading } = useWarrantyList(
    apiEnabled ? { limit: 3 } : { limit: 0 },
  );

  const displayWarranties =
    apiEnabled && liveWarranties
      ? liveWarranties.map((w) => {
          const endDate = new Date(w.endDate);
          const days = Math.max(0, Math.ceil((endDate.getTime() - Date.now()) / 86_400_000));
          return {
            id: w.warrantyId,
            vendor: w.vendor,
            type: w.kind,
            assets:
              typeof w.equipmentId === "object" && w.equipmentId
                ? ((w.equipmentId as { name?: string }).name ?? "1 asset")
                : "1 asset",
            days,
            expires: endDate.toLocaleDateString(),
            value: w.value || "$0",
          };
        })
      : warranties.slice(0, 3);

  return (
    <Panel>
      <PanelHead
        title="Upcoming warranty"
        subtitle={loading ? "Loading contracts…" : `${displayWarranties.length} active contracts`}
        icon={<ShieldCheck className="size-4" />}
      />
      <div className="space-y-3 px-6 pb-6">
        {loading && (
          <div className="flex items-center justify-center py-6 text-muted-foreground">
            <Loader2 className="mr-2 size-4 animate-spin" /> Loading…
          </div>
        )}
        {!loading && displayWarranties.length === 0 && (
          <div className="py-6 text-center text-[13px] text-muted-foreground">
            No active contracts
          </div>
        )}
        {!loading &&
          displayWarranties.map((w) => (
            <div
              key={w.id}
              className="rounded-2xl border border-border bg-surface-muted/60 p-4 transition-colors hover:bg-surface"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-semibold">{w.vendor}</p>
                  <p className="mt-0.5 text-[11.5px] text-muted-foreground">
                    {w.type} · {w.assets}
                  </p>
                </div>
                <Pill tone={w.days < 30 ? "danger" : w.days < 120 ? "warning" : "success"}>
                  {w.days}d
                </Pill>
              </div>
              <div className="mt-3 flex items-center justify-between text-[11.5px]">
                <span className="text-muted-foreground">Expires {w.expires}</span>
                <span className="font-semibold tabular-nums">{w.value}</span>
              </div>
            </div>
          ))}
      </div>
    </Panel>
  );
}

function AiInsights() {
  const items = [
    {
      t: "Predictive failure risk",
      d: "Dräger Perseus A500 shows a 78% probability of valve failure within 14 days.",
      tone: "danger",
    },
    {
      t: "Cost optimisation",
      d: "Consolidating Philips AMC contracts could save an estimated $42K annually.",
      tone: "success",
    },
    {
      t: "Workload imbalance",
      d: "Tomás Herrera is at 91% capacity — reassign 2 tickets to Priya Nair.",
      tone: "warning",
    },
  ];
  return (
    <Panel className="lg:col-span-2 relative">
      <div className="absolute inset-x-0 top-0 h-32 gradient-mesh opacity-70" />
      <div className="relative">
        <PanelHead
          title="AI insights"
          subtitle="Generated 6 minutes ago from 2,486 assets"
          icon={<Sparkles className="size-4" />}
          action={<Pill tone="violet">Copilot</Pill>}
        />
        <div className="grid gap-3 px-6 pb-6 md:grid-cols-3">
          {items.map((i) => (
            <div key={i.t} className="glass-card hover-lift p-5">
              <span
                className={cn(
                  "inline-block size-2 rounded-full",
                  i.tone === "danger"
                    ? "bg-danger"
                    : i.tone === "success"
                      ? "bg-success"
                      : "bg-warning",
                )}
              />
              <p className="mt-3 text-[13px] font-semibold">{i.t}</p>
              <p className="mt-1.5 text-[12px] leading-relaxed text-muted-foreground">{i.d}</p>
              <button className="mt-4 inline-flex items-center gap-1 text-[12px] font-semibold text-primary">
                Take action <ArrowUpRight className="size-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </Panel>
  );
}

function QuickActions() {
  const acts = [
    { l: "Register asset", i: Plus },
    { l: "Raise complaint", i: CircleAlert },
    { l: "Schedule PM", i: CalendarDays },
    { l: "Export report", i: FileText },
  ];
  return (
    <Panel>
      <PanelHead
        title="Quick actions"
        subtitle="Most used by administrators"
        icon={<Zap className="size-4" />}
      />
      <div className="grid grid-cols-2 gap-3 px-6 pb-6">
        {acts.map((a) => (
          <button
            key={a.l}
            className="group flex flex-col items-start gap-3 rounded-2xl border border-border bg-surface p-4 text-left transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-soft"
          >
            <span className="grid size-9 place-items-center rounded-xl bg-primary-soft text-primary transition-colors group-hover:gradient-primary group-hover:text-white">
              <a.i className="size-4" />
            </span>
            <span className="text-[12.5px] font-semibold leading-tight">{a.l}</span>
          </button>
        ))}
      </div>
    </Panel>
  );
}

function DepartmentPerformance() {
  const [liveDepts, setLiveDepts] = useState<ApiDepartment[] | null>(null);
  const [loading, setLoading] = useState(apiEnabled);

  useEffect(() => {
    if (!apiEnabled) return;
    departmentsApi
      .list()
      .then(setLiveDepts)
      .catch(() => setLiveDepts(null))
      .finally(() => setLoading(false));
  }, []);

  const displayDepts =
    apiEnabled && liveDepts
      ? liveDepts.map((d) => ({
          name: d.name,
          assets: (d as unknown as { equipmentCount?: number }).equipmentCount ?? 0,
          complaints: 0,
          staff: 12,
          uptime: 99.1,
          score: 95,
        }))
      : departments;

  return (
    <Panel className="lg:col-span-2">
      <PanelHead
        title="Department performance"
        subtitle={loading ? "Loading departments…" : "Uptime, complaints and operational score"}
        icon={<TrendingUp className="size-4" />}
      />
      <div className="space-y-2 px-4 pb-6">
        {loading && (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Loader2 className="mr-2 size-4 animate-spin" /> Loading…
          </div>
        )}
        {!loading &&
          displayDepts.map((d) => (
            <div
              key={d.name}
              className="grid grid-cols-[minmax(0,1.4fr)_auto] items-center gap-4 rounded-2xl px-3 py-3 transition-colors hover:bg-surface-muted sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto]"
            >
              <div className="min-w-0">
                <p className="truncate text-[13px] font-semibold">{d.name}</p>
                <p className="mt-0.5 text-[11.5px] text-muted-foreground">
                  {d.assets} assets · {d.complaints} open · {d.staff} staff
                </p>
              </div>
              <div className="hidden sm:block">
                <Meter
                  value={d.score}
                  tone={d.score >= 92 ? "success" : d.score >= 86 ? "primary" : "warning"}
                />
              </div>
              <div className="flex shrink-0 items-center gap-4">
                <span className="text-[12.5px] font-semibold tabular-nums">{d.uptime}%</span>
                <Pill tone={d.score >= 92 ? "success" : d.score >= 86 ? "primary" : "warning"}>
                  {d.score}
                </Pill>
              </div>
            </div>
          ))}
      </div>
    </Panel>
  );
}

function EngineerWorkload({ analytics }: { analytics: DashboardAnalytics | null }) {
  const displayEngineers = apiEnabled && analytics?.engineers ? analytics.engineers : engineers;
  return (
    <Panel>
      <PanelHead
        title="Engineer workload"
        subtitle="Live capacity across 5 engineers"
        icon={<Cpu className="size-4" />}
      />
      <div className="space-y-4 px-6 pb-6">
        {displayEngineers.map((e) => (
          <div key={e.name} className="flex items-center gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-surface-muted text-[11px] font-bold text-foreground">
              {e.avatar}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-[12.5px] font-semibold">{e.name}</p>
                <span className="shrink-0 text-[11px] font-semibold tabular-nums text-muted-foreground">
                  {e.load}%
                </span>
              </div>
              <div className="mt-1.5">
                <Meter
                  value={e.load}
                  tone={e.load > 85 ? "danger" : e.load > 60 ? "warning" : "success"}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function RecentActivities() {
  const [logs, setLogs] = useState<ApiAuditLog[] | null>(null);
  const [loading, setLoading] = useState(apiEnabled);

  useEffect(() => {
    if (!apiEnabled) return;
    auditApi
      .logs({ page: 1 })
      .then((res) => setLogs(res.items))
      .catch(() => setLogs(null))
      .finally(() => setLoading(false));
  }, []);

  const dot: Record<string, string> = {
    success: "bg-success",
    danger: "bg-danger",
    info: "bg-primary",
    violet: "bg-violet",
    warning: "bg-warning",
  };

  const displayActivities =
    apiEnabled && logs
      ? logs.map((l) => ({
          who: l.userName || "System",
          what: l.description || "Updated record",
          when: new Date(l.timestamp).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
          tone:
            l.action.includes("FAIL") || l.action.includes("DECOMMISSION")
              ? "danger"
              : l.action.includes("CREATE")
                ? "success"
                : "info",
        }))
      : activities;

  return (
    <Panel>
      <PanelHead
        title="Recent activity"
        subtitle={loading ? "Loading audit logs…" : "Across the workspace"}
        icon={<BellRing className="size-4" />}
      />
      <ul className="space-y-4 px-7 pb-7">
        {loading && (
          <li className="flex items-center justify-center py-6 text-muted-foreground">
            <Loader2 className="mr-2 size-4 animate-spin" /> Loading…
          </li>
        )}
        {!loading &&
          displayActivities.map((a, i) => (
            <li key={i} className="flex gap-3">
              <span
                className={cn("mt-1.5 size-2 shrink-0 rounded-full", dot[a.tone] || "bg-primary")}
              />
              <p className="text-[12.5px] leading-relaxed text-muted-foreground">
                <span className="font-semibold text-foreground">{a.who}</span> {a.what}
                <span className="mt-0.5 block text-[11px] text-muted-foreground/80">{a.when}</span>
              </p>
            </li>
          ))}
      </ul>
    </Panel>
  );
}

function MaintenanceCalendar() {
  const load = [
    0, 2, 5, 1, 3, 0, 4, 6, 2, 1, 0, 3, 5, 2, 4, 1, 0, 2, 6, 3, 1, 0, 2, 4, 5, 1, 3, 0, 2, 1,
  ];
  const shade = (n: number) =>
    n === 0
      ? "bg-surface-muted text-muted-foreground/50"
      : n < 2
        ? "bg-primary/15 text-primary"
        : n < 4
          ? "bg-primary/35 text-primary"
          : n < 6
            ? "bg-primary/60 text-white"
            : "bg-primary text-white";
  return (
    <Panel>
      <PanelHead
        title="Maintenance calendar"
        subtitle="August 2026 workload density"
        icon={<CalendarDays className="size-4" />}
      />
      <div className="px-6 pb-6">
        <div className="grid grid-cols-7 gap-1.5 text-center text-[10px] font-semibold text-muted-foreground">
          {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
            <span key={i}>{d}</span>
          ))}
        </div>
        <div className="mt-2 grid grid-cols-7 gap-1.5">
          {load.map((n, i) => (
            <div
              key={i}
              title={`${n} work orders`}
              className={cn(
                "grid aspect-square place-items-center rounded-xl text-[11px] font-semibold transition-transform hover:scale-110",
                shade(n),
              )}
            >
              {i + 1}
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-center justify-between text-[11px] text-muted-foreground">
          <span>Less</span>
          <div className="flex gap-1">
            {[
              "bg-surface-muted",
              "bg-primary/15",
              "bg-primary/35",
              "bg-primary/60",
              "bg-primary",
            ].map((c) => (
              <span key={c} className={cn("size-3 rounded", c)} />
            ))}
          </div>
          <span>More</span>
        </div>
      </div>
    </Panel>
  );
}

function AnalyticsCharts({ analytics }: { analytics: DashboardAnalytics | null }) {
  const activeCostSplit = apiEnabled && analytics?.costSplit ? analytics.costSplit : costSplit;
  const activeComplaintFlow = apiEnabled && analytics?.complaintFlow ? analytics.complaintFlow : complaintFlowData;

  return (
    <Panel className="lg:col-span-2">
      <PanelHead
        title="Operational analytics"
        subtitle="Cost distribution and complaint velocity"
        icon={<TrendingUp className="size-4" />}
      />
      <div className="grid gap-6 px-6 pb-7 md:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
        <div>
          <p className="text-[12px] font-semibold text-muted-foreground">Cost distribution</p>
          <div className="h-[190px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={activeCostSplit}
                  dataKey="value"
                  innerRadius={48}
                  outerRadius={72}
                  paddingAngle={4}
                  stroke="none"
                >
                  {activeCostSplit.map((_, i) => (
                    <Cell key={i} fill={pieColors[i]} />
                  ))}
                </Pie>
                <Tooltip {...chartTip} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {costSplit.map((c, i) => (
              <div
                key={c.name}
                className="flex items-center gap-2 text-[11.5px] text-muted-foreground"
              >
                <span className="size-2 rounded-full" style={{ background: pieColors[i] }} />
                {c.name} <span className="ml-auto font-semibold text-foreground">{c.value}%</span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <p className="text-[12px] font-semibold text-muted-foreground">
            Complaints raised vs resolved
          </p>
          <div className="mt-2 h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={activeComplaintFlow} barGap={6}>
                <CartesianGrid strokeDasharray="4 6" vertical={false} stroke="var(--border)" />
                <XAxis
                  dataKey="day"
                  tickLine={false}
                  axisLine={false}
                  fontSize={11}
                  stroke="var(--muted-foreground)"
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  fontSize={11}
                  width={28}
                  stroke="var(--muted-foreground)"
                />
                <Tooltip {...chartTip} cursor={{ fill: "var(--surface-muted)", radius: 8 }} />
                <Bar dataKey="raised" fill="var(--chart-1)" radius={[6, 6, 0, 0]} maxBarSize={16} />
                <Bar
                  dataKey="resolved"
                  fill="var(--chart-3)"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={16}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </Panel>
  );
}

function RightRail() {
  const { notifications: liveNotifs, loading: notifsLoading } = useNotifications();

  const dot: Record<string, string> = {
    success: "bg-success",
    danger: "bg-danger",
    info: "bg-primary",
    violet: "bg-violet",
    warning: "bg-warning",
  };

  const displayNotifications =
    apiEnabled && liveNotifs && liveNotifs.length > 0
      ? liveNotifs.slice(0, 4).map((n) => ({
          title: n.title,
          meta: n.message,
          tone:
            n.severity === "DANGER"
              ? "danger"
              : n.severity === "WARNING"
                ? "warning"
                : n.severity === "SUCCESS"
                  ? "success"
                  : "info",
        }))
      : notifications;

  return (
    <div className="space-y-6">
      <Panel>
        <PanelHead
          title="Today's schedule"
          subtitle="5 events"
          icon={<CalendarDays className="size-4" />}
        />
        <ul className="space-y-1 px-4 pb-5">
          {schedule.map((s) => (
            <li
              key={s.time}
              className="flex gap-3 rounded-2xl px-3 py-2.5 transition-colors hover:bg-surface-muted"
            >
              <span className="w-11 shrink-0 pt-0.5 text-[11.5px] font-semibold tabular-nums text-muted-foreground">
                {s.time}
              </span>
              <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", dot[s.tone])} />
              <div className="min-w-0">
                <p className="truncate text-[12.5px] font-semibold">{s.title}</p>
                <p className="truncate text-[11px] text-muted-foreground">{s.where}</p>
              </div>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel>
        <PanelHead
          title="Notifications"
          subtitle={notifsLoading ? "Loading alerts…" : `${displayNotifications.length} alerts`}
          icon={<BellRing className="size-4" />}
        />
        <ul className="space-y-3 px-6 pb-6">
          {notifsLoading && (
            <li className="flex items-center justify-center py-6 text-muted-foreground">
              <Loader2 className="mr-2 size-4 animate-spin" /> Loading…
            </li>
          )}
          {!notifsLoading &&
            displayNotifications.map((n, i) => (
              <li
                key={i}
                className="rounded-2xl border border-border p-3.5 transition-colors hover:bg-surface-muted"
              >
                <div className="flex gap-2.5">
                  <span
                    className={cn(
                      "mt-1.5 size-2 shrink-0 rounded-full",
                      dot[n.tone] || "bg-primary",
                    )}
                  />
                  <div className="min-w-0">
                    <p className="text-[12.5px] font-medium leading-snug">{n.title}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">{n.meta}</p>
                  </div>
                </div>
              </li>
            ))}
        </ul>
      </Panel>

      <Panel>
        <PanelHead
          title="System status"
          subtitle="All services nominal"
          icon={<ShieldCheck className="size-4" />}
        />
        <div className="flex items-center gap-5 px-7 pb-3">
          <Ring value={97} sub="Platform" />
          <div className="min-w-0 flex-1 space-y-2.5">
            {[
              { l: "IoT telemetry", v: 99 },
              { l: "Sync engine", v: 96 },
              { l: "Reporting", v: 92 },
            ].map((s) => (
              <div key={s.l}>
                <div className="flex justify-between text-[11.5px]">
                  <span className="text-muted-foreground">{s.l}</span>
                  <span className="font-semibold tabular-nums">{s.v}%</span>
                </div>
                <div className="mt-1">
                  <Meter value={s.v} tone="success" />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="h-[170px] px-2 pb-4">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={radarData} outerRadius={58}>
              <PolarGrid stroke="var(--border)" />
              <PolarAngleAxis dataKey="axis" fontSize={10} stroke="var(--muted-foreground)" />
              <Radar
                dataKey="A"
                stroke="var(--chart-1)"
                fill="var(--chart-1)"
                fillOpacity={0.22}
                strokeWidth={2}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      <Panel>
        <PanelHead
          title="Decommission queue"
          subtitle="Nothing pending"
          icon={<FileText className="size-4" />}
        />
        <EmptyState
          icon={<FileText className="size-5" />}
          title="Queue is clear"
          hint="Assets flagged for retirement will appear here for approval."
          action={
            <button className="rounded-xl border border-border px-4 py-2 text-[12px] font-semibold transition-colors hover:bg-surface-muted">
              Review policy
            </button>
          }
        />
      </Panel>
    </div>
  );
}

function MiniTrend({ analytics }: { analytics: DashboardAnalytics | null }) {
  const activeHealthTrend = apiEnabled && analytics?.healthTrend ? analytics.healthTrend : healthTrend;

  return (
    <Panel className="lg:col-span-3">
      <div className="grid gap-6 p-7 md:grid-cols-4">
        {[
          { l: "Mean time to repair", v: "3.2 h", d: "-18%", tone: "success" },
          { l: "Preventive compliance", v: "94.6%", d: "+3.1%", tone: "success" },
          { l: "Spare part turnover", v: "12.4 d", d: "+0.6", tone: "warning" },
          { l: "Asset utilisation", v: "81.3%", d: "+2.4%", tone: "success" },
        ].map((m, idx) => (
          <div
            key={m.l}
            className={cn("min-w-0", idx > 0 && "md:border-l md:border-border md:pl-6")}
          >
            <p className="text-[11.5px] font-medium text-muted-foreground">{m.l}</p>
            <div className="mt-2 flex items-end gap-2">
              <p className="text-[24px] font-bold leading-none tabular-nums">{m.v}</p>
              <span
                className={cn(
                  "pb-0.5 text-[11.5px] font-semibold",
                  m.tone === "success" ? "text-success" : "text-warning",
                )}
              >
                {m.d}
              </span>
            </div>
            <div className="mt-3 h-[42px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={activeHealthTrend}>
                  <Line
                    type="monotone"
                    dataKey="health"
                    stroke={m.tone === "success" ? "var(--success)" : "var(--warning)"}
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function Dashboard() {
  const { data: analytics, loading } = useDashboardAnalytics();

  return (
    <div className="mx-auto max-w-[1600px] space-y-6">
      <HeroBanner analytics={analytics} loading={loading} />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="grid gap-6 lg:grid-cols-3">
          <EquipmentHealth analytics={analytics} />
          <OpenComplaints />
          <MiniTrend analytics={analytics} />
          <AiInsights />
          <QuickActions />
          <MaintenanceToday />
          <UpcomingWarranty />
          <MaintenanceCalendar />
          <DepartmentPerformance />
          <EngineerWorkload analytics={analytics} />
          <AnalyticsCharts analytics={analytics} />
          <RecentActivities />
        </div>
        <RightRail />
      </div>
    </div>
  );
}
