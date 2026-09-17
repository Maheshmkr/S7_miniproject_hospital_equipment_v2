import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  ArrowRight,
  Building2,
  CalendarClock,
  CircleAlert,
  CircleCheck,
  Cpu,
  Download,
  FileText,
  Filter,
  Gauge,
  Grid2x2,
  HeartPulse,
  Images,
  LayoutList,
  MapPin,
  Phone,
  QrCode,
  Search,
  ShieldCheck,
  Sparkles,
  Wrench,
  Loader2,
} from "lucide-react";
import { Meter, Panel, PanelHead, Pill, Ring, EmptyState } from "@/components/ui/primitives";
import { apiEnabled } from "@/lib/api/client";
import { analyticsApi, type DashboardAnalytics } from "@/lib/api/analyticsApi";
import { useEquipmentList, useEquipmentRecord } from "@/lib/api/useEquipment";
import { useAuth } from "@/lib/auth";
import { useComplaintList } from "@/lib/api/useComplaints";
import { useMaintenanceList } from "@/lib/api/useMaintenance";
import {
  ActionLink,
  DefRow,
  StaffCrumbs,
  StaffHero,
  StaffTabs,
  StaffTimeline,
  StatCard,
  TagPills,
} from "@/components/staff/kit";
import {
  complaintStatusTone,
  equipmentById,
  equipmentStatusTone,
  priorityTone,
  serviceReports,
  staffActivities,
  staffComplaints,
  staffComplaintTrend,
  staffDepartment,
  staffEquipment,
  staffHealthTrend,
  staffMaintenance,
  staffProfile,
  staffStats,
  upcomingMaintenance,
  type StaffEquipment,
  type StaffComplaint,
} from "@/lib/staff";
import { cn } from "@/lib/utils";

const chartTip = {
  contentStyle: { borderRadius: 14, fontSize: 12, border: "1px solid var(--border)" },
};

/* ================= Dashboard ================= */

function useStaffDashboardAnalytics() {
  const [data, setData] = useState<DashboardAnalytics | null>(null);
  const [loading, setLoading] = useState(apiEnabled);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!apiEnabled) return;
    setLoading(true);
    analyticsApi
      .dashboard()
      .then(setData)
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Failed to load dashboard data"),
      )
      .finally(() => setLoading(false));
  }, []);

  return { data, loading, error };
}

export function StaffDashboard() {
  const { user } = useAuth();
  const activeDeptName = user?.departmentName || staffDepartment.name;
  const firstName = user?.name ? user.name.split(" ")[0] : staffProfile.name.split(" ")[0];
  const { data: analytics, loading: analyticsLoading } = useStaffDashboardAnalytics();
  const { total: liveComplaintsCount } = useComplaintList(
    apiEnabled ? { status: "OPEN" } : { limit: 0 },
  );
  const { total: liveCompletedCount } = useComplaintList(
    apiEnabled ? { status: "RESOLVED" } : { limit: 0 },
  );
  const { total: liveMaintenanceCount } = useMaintenanceList(apiEnabled ? {} : { limit: 0 });
  const { items: liveEquipment } = useEquipmentList(apiEnabled ? {} : { limit: 0 });

  const stats = useMemo(() => {
    if (!apiEnabled || !analytics) return staffStats;
    const total = analytics.totalEquipment;
    const active = analytics.operational;
    const maintenance = analytics.underMaintenance + analytics.breakdown;
    const open = liveComplaintsCount ?? analytics.openComplaints;
    const completed = liveCompletedCount ?? analytics.resolvedComplaints;
    const upcoming = liveMaintenanceCount ?? analytics.workOrders - analytics.completedWorkOrders;

    const health =
      analytics.healthTrend && analytics.healthTrend.length > 0
        ? analytics.healthTrend[analytics.healthTrend.length - 1].health
        : total > 0
          ? Math.round((active / total) * 100)
          : 100;

    return {
      total,
      active,
      maintenance,
      open,
      completed,
      upcoming,
      health,
    };
  }, [analytics, liveComplaintsCount, liveCompletedCount, liveMaintenanceCount]);

  const activeHealthTrend =
    apiEnabled && analytics?.healthTrend ? analytics.healthTrend : staffHealthTrend;

  const activeComplaintTrend = useMemo(() => {
    if (apiEnabled && analytics?.complaintFlow) {
      return analytics.complaintFlow.map((f, idx) => ({
        week: `Wk ${idx + 1}`,
        raised: f.raised,
        resolved: f.resolved,
      }));
    }
    return staffComplaintTrend;
  }, [analytics]);

  if (apiEnabled && analyticsLoading) {
    return (
      <div className="mx-auto max-w-[1600px] flex items-center justify-center py-24 text-muted-foreground">
        <Loader2 className="mr-3 size-6 animate-spin" /> Loading department dashboard…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1600px] space-y-6">
      <StaffCrumbs trail={[{ label: "Dashboard" }]} />
      <StaffHero
        eyebrow={`${activeDeptName} · Clinical Register`}
        title={`Welcome back, ${firstName}`}
        description={`${stats.total} assets under your department, ${stats.open} open complaints and ${stats.upcoming} maintenance visits scheduled. Department health score is ${stats.health}%.`}
        actions={
          <>
            <ActionLink
              to="/staff/complaints/new"
              variant="primary"
              icon={<CircleAlert className="size-4" />}
            >
              Register complaint
            </ActionLink>
            <ActionLink to="/staff/equipment" icon={<Cpu className="size-4" />}>
              View equipment
            </ActionLink>
          </>
        }
      />
      <StaffTabs active="dashboard" />

      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total equipment"
          value={stats.total}
          hint={`Assigned to ${activeDeptName}`}
          tone="primary"
          to="/staff/equipment"
          icon={<Cpu className="size-4" />}
        />
        <StatCard
          label="Active equipment"
          value={stats.active}
          hint="Operational right now"
          tone="success"
          to="/staff/equipment"
          icon={<CircleCheck className="size-4" />}
        />
        <StatCard
          label="Under maintenance"
          value={stats.maintenance}
          hint="Being serviced or critical"
          tone="warning"
          to="/staff/maintenance"
          icon={<Wrench className="size-4" />}
        />
        <StatCard
          label="Open complaints"
          value={stats.open}
          hint="Awaiting resolution"
          tone="danger"
          to="/staff/complaints"
          icon={<CircleAlert className="size-4" />}
        />
      </div>

      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Completed complaints"
          value={stats.completed}
          hint="Resolved and closed"
          tone="success"
          to="/staff/complaints"
          icon={<CircleCheck className="size-4" />}
        />
        <StatCard
          label="Upcoming maintenance"
          value={stats.upcoming}
          hint="Next 90 days"
          tone="violet"
          to="/staff/maintenance"
          icon={<CalendarClock className="size-4" />}
        />
        <StatCard
          label="Service reports"
          value={serviceReports.length}
          hint="Available to download"
          tone="primary"
          to="/staff/reports"
          icon={<FileText className="size-4" />}
        />
        <StatCard
          label="Department health"
          value={`${stats.health}%`}
          hint="Weighted asset score"
          tone="success"
          to="/staff/department"
          icon={<HeartPulse className="size-4" />}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Panel className="lg:col-span-2">
          <PanelHead
            title="Equipment health trend"
            subtitle="Department health score and uptime over 6 months"
            icon={<Activity className="size-4" />}
            action={<ActionLink to="/staff/department">Department analytics</ActionLink>}
          />
          <div className="h-[280px] px-2 pb-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={activeHealthTrend}>
                <defs>
                  <linearGradient id="staffHealth" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
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
                  domain={[80, 100]}
                  tickLine={false}
                  axisLine={false}
                  fontSize={11}
                  width={34}
                  stroke="var(--muted-foreground)"
                />
                <Tooltip {...chartTip} />
                <Area
                  type="monotone"
                  dataKey="health"
                  stroke="var(--chart-1)"
                  strokeWidth={2.4}
                  fill="url(#staffHealth)"
                />
                <Area
                  type="monotone"
                  dataKey="uptime"
                  stroke="var(--chart-4)"
                  strokeWidth={2}
                  fillOpacity={0}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel>
          <PanelHead
            title="Department score"
            subtitle="Composite asset health"
            icon={<Gauge className="size-4" />}
          />
          <div className="flex flex-col items-center gap-4 px-6 pb-7">
            <Ring value={stats.health} size={132} sub="health" />
            <div className="grid w-full grid-cols-2 gap-2 text-center">
              <div className="rounded-2xl bg-surface-muted/70 py-3">
                <p className="text-[17px] font-bold tabular-nums">98%</p>
                <p className="text-[11px] text-muted-foreground">Uptime</p>
              </div>
              <div className="rounded-2xl bg-surface-muted/70 py-3">
                <p className="text-[17px] font-bold tabular-nums">4.2 h</p>
                <p className="text-[11px] text-muted-foreground">Avg response</p>
              </div>
            </div>
          </div>
        </Panel>

        <Panel className="lg:col-span-2">
          <PanelHead
            title="Complaint trend"
            subtitle="Raised vs resolved · last 6 weeks"
            icon={<CircleAlert className="size-4" />}
          />
          <div className="h-[240px] px-2 pb-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={activeComplaintTrend} barGap={6}>
                <CartesianGrid strokeDasharray="4 6" vertical={false} stroke="var(--border)" />
                <XAxis
                  dataKey="week"
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
                <Tooltip {...chartTip} cursor={{ fill: "var(--surface-muted)" }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="raised" fill="var(--chart-3)" radius={[6, 6, 0, 0]} maxBarSize={18} />
                <Bar
                  dataKey="resolved"
                  fill="var(--chart-2)"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={18}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel>
          <PanelHead
            title="Quick actions"
            subtitle="Everything you can do today"
            icon={<Sparkles className="size-4" />}
          />
          <div className="space-y-2.5 px-6 pb-7">
            {[
              { label: "View department equipment", to: "/staff/equipment", icon: Cpu },
              { label: "Register a complaint", to: "/staff/complaints/new", icon: CircleAlert },
              { label: "Track complaint status", to: "/staff/complaints", icon: Activity },
              { label: "View service reports", to: "/staff/reports", icon: FileText },
              { label: "Maintenance progress", to: "/staff/maintenance", icon: Wrench },
            ].map((a) => (
              <Link
                key={a.to}
                to={a.to}
                className="flex items-center gap-3 rounded-2xl border border-border px-4 py-3 text-[13px] font-medium transition-all hover:-translate-y-0.5 hover:shadow-soft"
              >
                <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
                  <a.icon className="size-4" />
                </span>
                <span className="min-w-0 flex-1 truncate">{a.label}</span>
                <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
              </Link>
            ))}
          </div>
        </Panel>

        <Panel className="lg:col-span-2">
          <PanelHead
            title="Recent activity"
            subtitle="Latest updates across your department"
            icon={<Activity className="size-4" />}
          />
          <StaffTimeline items={staffActivities} />
        </Panel>

        <Panel>
          <PanelHead
            title="Upcoming maintenance"
            subtitle="Planned visits"
            icon={<CalendarClock className="size-4" />}
          />
          <ul className="space-y-2.5 px-6 pb-7">
            {upcomingMaintenance.map((u) => {
              const eq = equipmentById(u.equipmentId);
              return (
                <li key={u.id} className="rounded-2xl border border-border px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[12.5px] font-semibold">{u.id}</span>
                    <Pill tone={u.type === "Corrective" ? "warning" : "primary"}>{u.type}</Pill>
                  </div>
                  <p className="mt-1 truncate text-[12px] text-muted-foreground">{eq?.name}</p>
                  <p className="mt-1 text-[11.5px] text-muted-foreground">
                    {u.when} · {u.engineer}
                  </p>
                </li>
              );
            })}
          </ul>
        </Panel>
      </div>
    </div>
  );
}

/* ============================ Department equipment =========================== */

const statuses = ["All", "Operational", "Under Maintenance", "Critical", "Idle"] as const;

export function StaffEquipmentWorkspace() {
  const { user } = useAuth();
  const activeDeptName = user?.departmentName || staffDepartment.name;
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<(typeof statuses)[number]>("All");
  const [category, setCategory] = useState("All");
  const [view, setView] = useState<"table" | "cards">("table");

  const { items: liveEquipment, loading: equipLoading } = useEquipmentList(
    apiEnabled ? {} : { limit: 0 },
  );

  const displayEquipment = useMemo(() => {
    if (!apiEnabled || !liveEquipment) return staffEquipment;
    return liveEquipment.map((e) => {
      let staffStatus: "Operational" | "Under Maintenance" | "Critical" | "Idle" = "Operational";
      if (e.status === "UNDER_MAINTENANCE") staffStatus = "Under Maintenance";
      else if (e.status === "UNDER_BREAKDOWN" || e.status === "CRITICAL") staffStatus = "Critical";
      else if (e.status === "IDLE") staffStatus = "Idle";

      return {
        id: e.equipmentId,
        _id: e._id,
        name: e.name,
        category: e.category,
        manufacturer: e.manufacturer || "Unknown",
        dept:
          typeof e.departmentId === "object" && e.departmentId ? e.departmentId.name : "Radiology",
        location: e.location || "Main Clinic",
        status: staffStatus,
        health: e.healthScore ?? 100,
        warranty: e.warrantyExpiry ? new Date(e.warrantyExpiry).toLocaleDateString() : "Active",
        warrantyStatus: "Active" as const,
        amc: "Comprehensive",
        amcStatus: "Comprehensive" as const,
        purchased: e.purchaseDate ? new Date(e.purchaseDate).toLocaleDateString() : "10 Jan 2022",
        installed: e.installationDate
          ? new Date(e.installationDate).toLocaleDateString()
          : "12 Jan 2022",
        lastService: "03 Mar 2026",
        nextService: e.nextPreventiveDate
          ? new Date(e.nextPreventiveDate).toLocaleDateString()
          : "03 Sep 2026",
        specs: {
          model: e.model || "Standard",
          serial: e.serialNumber || "SN-1000",
          manufactured: "2021",
          installed: e.installationDate
            ? new Date(e.installationDate).toLocaleDateString()
            : "12 Jan 2022",
          location: e.location || "Main Clinic",
          owner: "Hospital",
          power: "240V",
          weight: "120kg",
          dimensions: "1.2m x 0.8m x 1.5m",
          software: "v4.2.1",
          riskClass: e.criticality || "High",
          usageHours: "1,240 h",
          lastService: "03 Mar 2026",
          nextService: e.nextPreventiveDate
            ? new Date(e.nextPreventiveDate).toLocaleDateString()
            : "03 Sep 2026",
          amc: "Active",
          compliance: "100%",
        },
        documents: [],
        service: [],
        timeline: [],
      };
    });
  }, [liveEquipment]);

  const categories = useMemo(
    () => ["All", ...Array.from(new Set(displayEquipment.map((e) => e.category)))],
    [displayEquipment],
  );

  const rows = useMemo(
    () =>
      displayEquipment.filter((e) => {
        const q = query.trim().toLowerCase();
        const matchQ =
          !q ||
          [e.id, e.name, e.manufacturer, e.location, e.category].some((v) =>
            v.toLowerCase().includes(q),
          );
        return (
          matchQ &&
          (status === "All" || e.status === status) &&
          (category === "All" || e.category === category)
        );
      }),
    [query, status, category, displayEquipment],
  );

  const stats = useMemo(() => {
    const total = displayEquipment.length;
    const active = displayEquipment.filter((e) => e.status === "Operational").length;
    const maintenance = displayEquipment.filter(
      (e) => e.status === "Under Maintenance" || e.status === "Critical",
    ).length;
    const health =
      total > 0 ? Math.round(displayEquipment.reduce((a, e) => a + e.health, 0) / total) : 100;
    return { total, active, maintenance, health };
  }, [displayEquipment]);

  if (apiEnabled && equipLoading) {
    return (
      <div className="mx-auto max-w-[1600px] flex items-center justify-center py-24 text-muted-foreground">
        <Loader2 className="mr-3 size-6 animate-spin" /> Loading equipment register…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1600px] space-y-6">
      <StaffCrumbs trail={[{ label: "Department equipment" }]} />
      <StaffHero
        eyebrow="Equipment"
        title="Department equipment"
        description={`Every asset assigned to ${activeDeptName}. You have read access — report an issue to request service.`}
        actions={
          <ActionLink
            to="/staff/complaints/new"
            variant="primary"
            icon={<CircleAlert className="size-4" />}
          >
            Register complaint
          </ActionLink>
        }
      />
      <StaffTabs active="equipment" />

      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total assets"
          value={stats.total}
          hint={`${activeDeptName} register`}
          tone="primary"
          icon={<Cpu className="size-4" />}
        />
        <StatCard
          label="Operational"
          value={stats.active}
          hint="Available for clinical use"
          tone="success"
          icon={<CircleCheck className="size-4" />}
        />
        <StatCard
          label="Needs attention"
          value={stats.maintenance}
          hint="Maintenance or critical"
          tone="warning"
          icon={<Wrench className="size-4" />}
        />
        <StatCard
          label="Avg health"
          value={`${stats.health}%`}
          hint="Across all assets"
          tone="violet"
          icon={<HeartPulse className="size-4" />}
        />
      </div>

      <Panel>
        <PanelHead
          title="Asset register"
          subtitle={`${rows.length} of ${displayEquipment.length} assets shown`}
          icon={<Filter className="size-4" />}
          action={
            <div className="flex items-center gap-1.5 rounded-xl border border-border bg-surface p-1">
              {[
                { key: "table" as const, icon: LayoutList },
                { key: "cards" as const, icon: Grid2x2 },
              ].map((v) => (
                <button
                  key={v.key}
                  onClick={() => setView(v.key)}
                  aria-label={v.key}
                  className={cn(
                    "grid size-8 place-items-center rounded-lg transition-colors",
                    view === v.key
                      ? "bg-primary-soft text-primary"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <v.icon className="size-4" />
                </button>
              ))}
            </div>
          }
        />

        <div className="grid gap-3 px-6 pb-5 sm:px-7 md:grid-cols-[minmax(0,1fr)_auto_auto]">
          <label className="flex h-10 items-center gap-2.5 rounded-xl border border-border bg-surface px-3.5 text-[13px] shadow-xs">
            <Search className="size-4 shrink-0 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by ID, name, manufacturer or location…"
              className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
            />
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as (typeof statuses)[number])}
            className="h-10 rounded-xl border border-border bg-surface px-3 text-[12.5px] font-medium shadow-xs outline-none"
          >
            {statuses.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="h-10 rounded-xl border border-border bg-surface px-3 text-[12.5px] font-medium shadow-xs outline-none"
          >
            {categories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>

        {rows.length === 0 ? (
          <EmptyState
            icon={<Cpu className="size-6" />}
            title="No equipment matches your filters"
            hint="Try clearing the search box or switching the status filter back to All."
          />
        ) : view === "table" ? (
          <div className="overflow-x-auto px-2 pb-6">
            <table className="w-full min-w-[1080px] border-collapse">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                  {[
                    "Equipment ID",
                    "Equipment name",
                    "Category",
                    "Department",
                    "Location",
                    "Status",
                    "Health",
                    "Warranty",
                    "Action",
                  ].map((h) => (
                    <th key={h} className="px-4 py-3 font-semibold">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((e) => (
                  <tr
                    key={e.id}
                    className="border-t border-border transition-colors hover:bg-surface-muted/60"
                  >
                    <td className="px-4 py-3.5 text-[12.5px] font-semibold tabular-nums">{e.id}</td>
                    <td className="px-4 py-3.5">
                      <Link
                        to={`/staff/equipment/${e.id}` as never}
                        className="text-[13px] font-medium hover:text-primary"
                      >
                        {e.name}
                      </Link>
                      <p className="text-[11.5px] text-muted-foreground">{e.manufacturer}</p>
                    </td>
                    <td className="px-4 py-3.5 text-[12.5px] text-muted-foreground">
                      {e.category}
                    </td>
                    <td className="px-4 py-3.5 text-[12.5px] text-muted-foreground">{e.dept}</td>
                    <td className="px-4 py-3.5 text-[12px] text-muted-foreground">{e.location}</td>
                    <td className="px-4 py-3.5">
                      <Pill tone={equipmentStatusTone[e.status]}>{e.status}</Pill>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="w-[92px]">
                        <div className="flex justify-between text-[11px] tabular-nums">
                          <span className="font-semibold">{e.health}%</span>
                        </div>
                        <div className="mt-1">
                          <Meter
                            value={e.health}
                            tone={
                              e.health >= 85 ? "success" : e.health >= 65 ? "warning" : "danger"
                            }
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <Pill
                        tone={
                          e.warrantyStatus === "Active"
                            ? "success"
                            : e.warrantyStatus === "Expiring"
                              ? "warning"
                              : "danger"
                        }
                      >
                        {e.warranty}
                      </Pill>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <ActionLink to={`/staff/equipment/${e.id}` as never}>View</ActionLink>
                        <ActionLink to="/staff/complaints/new">Report</ActionLink>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid gap-4 px-6 pb-7 sm:px-7 md:grid-cols-2 xl:grid-cols-3">
            {rows.map((e) => (
              <EquipmentCard key={e.id} item={e} />
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}

function EquipmentCard({ item }: { item: StaffEquipment }) {
  return (
    <Panel>
      <div className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-2xl gradient-primary text-white">
              <Cpu className="size-5" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-[14px] font-semibold">{item.name}</p>
              <p className="text-[11.5px] text-muted-foreground">
                {item.id} · {item.category}
              </p>
            </div>
          </div>
          <Ring value={item.health} size={54} />
        </div>
        <p className="mt-4 flex items-center gap-1.5 text-[12px] text-muted-foreground">
          <MapPin className="size-3.5" /> {item.location}
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Pill tone={equipmentStatusTone[item.status]}>{item.status}</Pill>
          <Pill tone={item.warrantyStatus === "Active" ? "success" : "warning"}>
            Warranty {item.warrantyStatus}
          </Pill>
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <ActionLink to={`/staff/equipment/${item.id}` as never} variant="primary">
            View details
          </ActionLink>
          <ActionLink to="/staff/complaints/new">Report issue</ActionLink>
        </div>
      </div>
    </Panel>
  );
}

/* ============================= Equipment details ============================= */

export function StaffEquipmentDetails({ id }: { id: string }) {
  const { item: liveAsset, loading: assetLoading } = useEquipmentRecord(id);

  const asset = useMemo(() => {
    if (!apiEnabled || !liveAsset) return equipmentById(id);
    return {
      id: liveAsset.equipmentId,
      _id: liveAsset._id,
      name: liveAsset.name,
      category: liveAsset.category,
      manufacturer: liveAsset.manufacturer || "Unknown",
      dept:
        typeof liveAsset.departmentId === "object" && liveAsset.departmentId
          ? liveAsset.departmentId.name
          : "Radiology",
      location: liveAsset.location || "Main Clinic",
      status:
        liveAsset.status === "OPERATIONAL"
          ? "Operational"
          : liveAsset.status === "UNDER_MAINTENANCE"
            ? "Under Maintenance"
            : liveAsset.status === "UNDER_BREAKDOWN" || liveAsset.status === "CRITICAL"
              ? "Critical"
              : ("Idle" as const),
      health: liveAsset.healthScore ?? 100,
      warranty: liveAsset.warrantyExpiry
        ? new Date(liveAsset.warrantyExpiry).toLocaleDateString()
        : "Active",
      warrantyStatus: "Active" as const,
      amcStatus: "Comprehensive" as const,
      nextService: liveAsset.nextPreventiveDate
        ? new Date(liveAsset.nextPreventiveDate).toLocaleDateString()
        : "03 Sep 2026",
      specs: {
        model: liveAsset.model || "Unknown",
        serial: liveAsset.serialNumber || "Unknown",
        power: "220V",
        weight: "12 kg",
      },
      purchased: liveAsset.purchaseDate
        ? new Date(liveAsset.purchaseDate).toLocaleDateString()
        : "01 Jan 2024",
      installed: liveAsset.installationDate
        ? new Date(liveAsset.installationDate).toLocaleDateString()
        : "01 Jan 2024",
      amc: "Comprehensive AMC",
      lastService: "01 Jun 2026",
      timeline: [],
      service: [],
      documents: [],
    };
  }, [liveAsset, id]);

  const complaintQuery =
    apiEnabled && liveAsset?._id ? { equipmentId: liveAsset._id } : { limit: 0 };
  const { items: liveComplaints } = useComplaintList(complaintQuery);

  const maintenanceQuery =
    apiEnabled && liveAsset?._id ? { equipmentId: liveAsset._id } : { limit: 0 };
  const { items: liveMaintenance } = useMaintenanceList(maintenanceQuery);

  const linkedComplaints = useMemo(() => {
    if (!apiEnabled || !liveComplaints) {
      return asset ? staffComplaints.filter((c) => c.equipmentId === asset.id) : [];
    }
    return liveComplaints.map((c) => {
      let staffStatus: StaffComplaint["status"] = "Submitted";
      if (c.status === "OPEN") staffStatus = "Submitted";
      else if (c.status === "ASSIGNED") staffStatus = "Assigned";
      else if (c.status === "MAINTENANCE_IN_PROGRESS") staffStatus = "In Progress";
      else if (c.status === "AWAITING_PARTS") staffStatus = "Awaiting Parts";
      else if (c.status === "RESOLVED") staffStatus = "Resolved";
      else if (c.status === "CLOSED") staffStatus = "Closed";

      return {
        id: c.complaintId || c._id,
        title: c.title,
        equipmentId: liveAsset?.equipmentId || "",
        category: "Software" as const,
        priority: (c.priority === "CRITICAL"
          ? "Critical"
          : c.priority === "HIGH"
            ? "High"
            : c.priority === "LOW"
              ? "Low"
              : "Medium") as StaffComplaint["priority"],
        description: c.description,
        status: staffStatus,
        progress: c.status === "RESOLVED" || c.status === "CLOSED" ? 100 : 30,
        engineer:
          typeof c.assignedEngineerId === "object" && c.assignedEngineerId
            ? c.assignedEngineerId.name
            : "Unassigned",
        reportedBy: typeof c.reportedBy === "object" && c.reportedBy ? c.reportedBy.name : "Staff",
        created: new Date(c.createdAt).toLocaleDateString(),
        updated: new Date(c.updatedAt || c.createdAt).toLocaleDateString(),
        expected: "1 working day",
        raisedBy: typeof c.reportedBy === "object" && c.reportedBy ? c.reportedBy.name : "Staff",
        contact:
          typeof c.reportedBy === "object" && c.reportedBy
            ? c.reportedBy.email || "Staff"
            : "Staff",
        stage:
          c.status === "OPEN" ? "Submitted" : c.status === "ASSIGNED" ? "Scheduled" : "In Progress",
        parts: [],
        remarks: c.resolution || "",
        notes: [],
        messages: [],
        photos: [],
        attachments: [],
        symptoms: c.description.includes("Symptoms:")
          ? c.description
              .split("Symptoms:")[1]
              .split(",")
              .map((s: string) => s.trim())
          : [],
        timeline: [],
        reportId: c.workOrderId ? String(c.workOrderId) : undefined,
      };
    });
  }, [liveComplaints, liveAsset, asset]);

  const linkedWork = useMemo(() => {
    if (!apiEnabled || !liveMaintenance) {
      return asset ? staffMaintenance.filter((m) => m.equipmentId === asset.id) : [];
    }
    return liveMaintenance.map((m) => {
      return {
        id: m.maintenanceId || m._id,
        equipmentId: liveAsset?.equipmentId || "",
        type:
          m.maintenanceType === "PREVENTIVE" ? ("Preventive" as const) : ("Corrective" as const),
        stage: m.status === "COMPLETED" ? "Verification" : "In Progress",
        status:
          m.status === "COMPLETED"
            ? ("Completed" as const)
            : m.status === "AWAITING_PARTS"
              ? ("Awaiting Parts" as const)
              : m.status === "SCHEDULED"
                ? ("Scheduled" as const)
                : ("In Progress" as const),
        progress: m.status === "COMPLETED" ? 100 : 50,
        engineer:
          typeof m.engineerId === "object" && m.engineerId ? m.engineerId.name : "Unassigned",
        started: m.createdAt ? new Date(m.createdAt).toLocaleDateString() : "",
        expected: "Today",
        timeline: [],
        parts: [],
        remarks: "",
        images: [],
        steps: [],
      };
    });
  }, [liveMaintenance, liveAsset, asset]);

  if (apiEnabled && assetLoading) {
    return (
      <div className="mx-auto max-w-[1600px] flex items-center justify-center py-24 text-muted-foreground">
        <Loader2 className="mr-3 size-6 animate-spin" /> Loading equipment details…
      </div>
    );
  }

  if (!asset) {
    return (
      <div className="mx-auto max-w-[1600px] space-y-6">
        <StaffCrumbs trail={[{ label: "Equipment", to: "/staff/equipment" }, { label: id }]} />
        <Panel>
          <EmptyState
            icon={<Cpu className="size-6" />}
            title="Asset not found in your department"
            hint="This asset either belongs to another department or has been retired from the register."
            action={
              <ActionLink to="/staff/equipment" variant="primary">
                Back to equipment
              </ActionLink>
            }
          />
        </Panel>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1600px] space-y-6">
      <StaffCrumbs trail={[{ label: "Equipment", to: "/staff/equipment" }, { label: asset.id }]} />
      <StaffHero
        eyebrow={`${asset.category} · ${asset.manufacturer}`}
        title={asset.name}
        description={`${asset.id} · ${asset.location} · next service ${asset.nextService}`}
        actions={
          <>
            <ActionLink
              to="/staff/complaints/new"
              variant="primary"
              icon={<CircleAlert className="size-4" />}
            >
              Register complaint
            </ActionLink>
            <ActionLink to="/staff/maintenance" icon={<Wrench className="size-4" />}>
              Track maintenance
            </ActionLink>
            <ActionLink to="/staff/reports" icon={<Download className="size-4" />}>
              Download manual
            </ActionLink>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Panel>
          <div className="p-6">
            <div className="grid h-[190px] place-items-center rounded-2xl bg-surface-muted/70">
              <Cpu className="size-16 text-muted-foreground/50" strokeWidth={1.2} />
            </div>
            <div className="mt-5 flex items-center gap-4">
              <span className="grid size-[86px] shrink-0 place-items-center rounded-2xl border border-border bg-surface">
                <QrCode className="size-14 text-foreground" strokeWidth={1.1} />
              </span>
              <div className="min-w-0">
                <p className="text-[12px] font-semibold">Asset QR code</p>
                <p className="mt-1 text-[11.5px] leading-relaxed text-muted-foreground">
                  Scan at the bedside to open this asset record and report a fault in seconds.
                </p>
              </div>
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <Pill tone={equipmentStatusTone[asset.status]}>{asset.status}</Pill>
              <Pill tone={asset.warrantyStatus === "Active" ? "success" : "warning"}>
                Warranty {asset.warrantyStatus}
              </Pill>
              <Pill tone={asset.amcStatus === "Comprehensive" ? "primary" : "neutral"}>
                AMC {asset.amcStatus}
              </Pill>
            </div>
          </div>
        </Panel>

        <Panel className="lg:col-span-2">
          <PanelHead
            title="Asset information"
            subtitle="Register and identity"
            icon={<Cpu className="size-4" />}
          />
          <div className="grid gap-x-8 px-6 pb-6 sm:px-7 md:grid-cols-2">
            <dl>
              <DefRow label="Equipment ID" value={asset.id} />
              <DefRow label="Equipment name" value={asset.name} />
              <DefRow label="Category" value={asset.category} />
              <DefRow label="Manufacturer" value={asset.manufacturer} />
              <DefRow label="Model" value={asset.specs.model} />
              <DefRow label="Serial number" value={asset.specs.serial} />
              <DefRow label="Department" value={asset.dept} />
              <DefRow label="Location" value={asset.location} />
            </dl>
            <dl>
              <DefRow label="Purchase date" value={asset.purchased} />
              <DefRow label="Installation date" value={asset.installed} />
              <DefRow
                label="Warranty status"
                value={`${asset.warrantyStatus} · until ${asset.warranty}`}
              />
              <DefRow label="AMC status" value={asset.amc} />
              <DefRow label="Current status" value={asset.status} />
              <DefRow label="Health score" value={`${asset.health}%`} />
              <DefRow label="Last maintenance" value={asset.lastService} />
              <DefRow label="Next maintenance" value={asset.nextService} />
            </dl>
          </div>
        </Panel>

        <Panel className="lg:col-span-2">
          <PanelHead
            title="Complaint history"
            subtitle={`${linkedComplaints.length} complaint(s) raised on this asset`}
            icon={<CircleAlert className="size-4" />}
            action={<ActionLink to="/staff/complaints">All complaints</ActionLink>}
          />
          {linkedComplaints.length === 0 ? (
            <EmptyState
              icon={<CircleCheck className="size-6" />}
              title="No complaints on record"
              hint="This asset has had a clean run — report an issue if something changes."
            />
          ) : (
            <div className="overflow-x-auto px-2 pb-6">
              <table className="w-full min-w-[640px] border-collapse">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                    {["Complaint", "Priority", "Status", "Engineer", "Created"].map((h) => (
                      <th key={h} className="px-4 py-3 font-semibold">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {linkedComplaints.map((c) => (
                    <tr
                      key={c.id}
                      className="border-t border-border transition-colors hover:bg-surface-muted/60"
                    >
                      <td className="px-4 py-3.5">
                        <Link
                          to={`/staff/complaints/${c.id}` as never}
                          className="text-[13px] font-medium hover:text-primary"
                        >
                          {c.id}
                        </Link>
                        <p className="truncate text-[11.5px] text-muted-foreground">{c.title}</p>
                      </td>
                      <td className="px-4 py-3.5">
                        <Pill tone={priorityTone[c.priority]}>{c.priority}</Pill>
                      </td>
                      <td className="px-4 py-3.5">
                        <Pill tone={complaintStatusTone[c.status]}>{c.status}</Pill>
                      </td>
                      <td className="px-4 py-3.5 text-[12.5px] text-muted-foreground">
                        {c.engineer}
                      </td>
                      <td className="px-4 py-3.5 text-[12px] text-muted-foreground">{c.created}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        <Panel>
          <PanelHead
            title="Maintenance timeline"
            subtitle="Recent asset events"
            icon={<Activity className="size-4" />}
          />
          <StaffTimeline items={asset.timeline} />
        </Panel>

        <Panel className="lg:col-span-2">
          <PanelHead
            title="Service history"
            subtitle="Completed interventions"
            icon={<Wrench className="size-4" />}
          />
          <div className="overflow-x-auto px-2 pb-6">
            <table className="w-full min-w-[640px] border-collapse">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                  {["Date", "Engineer", "Type", "Outcome", "Time"].map((h) => (
                    <th key={h} className="px-4 py-3 font-semibold">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {asset.service.map((s) => (
                  <tr key={s.date} className="border-t border-border">
                    <td className="px-4 py-3.5 text-[12.5px] font-medium">{s.date}</td>
                    <td className="px-4 py-3.5 text-[12.5px] text-muted-foreground">
                      {s.engineer}
                    </td>
                    <td className="px-4 py-3.5">
                      <Pill tone={s.type === "Corrective" ? "warning" : "primary"}>{s.type}</Pill>
                    </td>
                    <td className="px-4 py-3.5 text-[12.5px] text-muted-foreground">{s.outcome}</td>
                    <td className="px-4 py-3.5 text-[12.5px] tabular-nums text-muted-foreground">
                      {s.hours}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel>
          <PanelHead
            title="Documents"
            subtitle="Manuals and compliance files"
            icon={<FileText className="size-4" />}
          />
          <ul className="space-y-2.5 px-6 pb-7">
            {asset.documents.map((d) => (
              <li
                key={d.name}
                className="flex items-center gap-3 rounded-2xl border border-border px-4 py-3"
              >
                <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
                  <FileText className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12.5px] font-medium">{d.name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {d.type} · {d.size} · {d.updated}
                  </p>
                </div>
                <Download className="size-4 shrink-0 text-muted-foreground" />
              </li>
            ))}
          </ul>
        </Panel>

        <Panel className="lg:col-span-2">
          <PanelHead
            title="Technical specifications"
            subtitle="Manufacturer data sheet"
            icon={<ShieldCheck className="size-4" />}
          />
          <div className="grid gap-x-8 px-6 pb-6 sm:px-7 md:grid-cols-2">
            <dl>
              <DefRow label="Power" value={asset.specs.power} />
              <DefRow label="Weight" value={asset.specs.weight} />
              <DefRow label="Dimensions" value={asset.specs.dimensions} />
              <DefRow label="Software" value={asset.specs.software} />
            </dl>
            <dl>
              <DefRow label="Risk class" value={asset.specs.riskClass} />
              <DefRow label="Usage hours" value={asset.specs.usageHours} />
              <DefRow label="Accountable owner" value={asset.specs.owner} />
              <DefRow label="Compliance" value={asset.specs.compliance} />
            </dl>
          </div>
        </Panel>

        <Panel>
          <PanelHead
            title="Active work orders"
            subtitle="Live maintenance on this asset"
            icon={<Wrench className="size-4" />}
          />
          {linkedWork.length === 0 ? (
            <EmptyState
              icon={<CircleCheck className="size-6" />}
              title="No active work orders"
              hint="Nothing is currently scheduled for this asset."
            />
          ) : (
            <ul className="space-y-2.5 px-6 pb-7">
              {linkedWork.map((m) => (
                <li key={m.id} className="rounded-2xl border border-border px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <Link
                      to={`/staff/maintenance/${m.id}` as never}
                      className="text-[12.5px] font-semibold hover:text-primary"
                    >
                      {m.id}
                    </Link>
                    <Pill
                      tone={
                        m.status === "Completed"
                          ? "success"
                          : m.status === "Awaiting Parts"
                            ? "warning"
                            : "primary"
                      }
                    >
                      {m.status}
                    </Pill>
                  </div>
                  <p className="mt-1 text-[11.5px] text-muted-foreground">
                    {m.stage} · {m.engineer}
                  </p>
                  <div className="mt-2">
                    <Meter value={m.progress} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}

/* ============================ Department profile ============================= */

const pieColors = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

export function StaffDepartmentProfile() {
  const { data: analytics, loading: analyticsLoading } = useStaffDashboardAnalytics();

  const stats = useMemo(() => {
    if (!apiEnabled || !analytics) return staffStats;
    const total = analytics.totalEquipment;
    const active = analytics.operational;
    const maintenance = analytics.underMaintenance + analytics.breakdown;
    const open = analytics.openComplaints;
    const completed = analytics.resolvedComplaints;
    const upcoming = analytics.workOrders - analytics.completedWorkOrders;

    const health =
      analytics.healthTrend && analytics.healthTrend.length > 0
        ? analytics.healthTrend[analytics.healthTrend.length - 1].health
        : total > 0
          ? Math.round((active / total) * 100)
          : 100;

    return {
      total,
      active,
      maintenance,
      open,
      completed,
      upcoming,
      health,
    };
  }, [analytics]);

  if (apiEnabled && analyticsLoading) {
    return (
      <div className="mx-auto max-w-[1600px] flex items-center justify-center py-24 text-muted-foreground">
        <Loader2 className="mr-3 size-6 animate-spin" /> Loading department profile…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1600px] space-y-6">
      <StaffCrumbs trail={[{ label: "Department profile" }]} />
      <StaffHero
        eyebrow="Department"
        title={`${staffDepartment.name} · ${staffDepartment.code}`}
        description={`Led by ${staffDepartment.head} · ${staffDepartment.location} · ${staffDepartment.staffCount} staff across ${staffDepartment.hours}.`}
        actions={
          <ActionLink to="/staff/equipment" variant="primary" icon={<Cpu className="size-4" />}>
            Department equipment
          </ActionLink>
        }
      />
      <StaffTabs active="department" />

      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total equipment"
          value={stats.total}
          hint="Assets on register"
          tone="primary"
          icon={<Cpu className="size-4" />}
        />
        <StatCard
          label="Active complaints"
          value={stats.open}
          hint="Currently open"
          tone="warning"
          icon={<CircleAlert className="size-4" />}
        />
        <StatCard
          label="Completed complaints"
          value={stats.completed}
          hint="Last 30 days"
          tone="success"
          icon={<CircleCheck className="size-4" />}
        />
        <StatCard
          label="Health score"
          value={`${stats.health}%`}
          hint="Composite department score"
          tone="violet"
          icon={<HeartPulse className="size-4" />}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Panel>
          <PanelHead
            title="Department details"
            subtitle="Contact and ownership"
            icon={<Building2 className="size-4" />}
          />
          <dl className="px-6 pb-6 sm:px-7">
            <DefRow label="Department name" value={staffDepartment.name} />
            <DefRow label="Department code" value={staffDepartment.code} />
            <DefRow
              label="Department head"
              value={`${staffDepartment.head} · ${staffDepartment.headTitle}`}
            />
            <DefRow label="Email" value={staffDepartment.email} />
            <DefRow
              label="Phone"
              value={`${staffDepartment.phone} · ${staffDepartment.extension}`}
            />
            <DefRow label="Location" value={staffDepartment.location} />
            <DefRow label="Operating hours" value={staffDepartment.hours} />
            <DefRow label="Capacity" value={staffDepartment.beds} />
          </dl>
        </Panel>

        <Panel className="lg:col-span-2">
          <PanelHead
            title="Equipment health analytics"
            subtitle="Health score by asset"
            icon={<Gauge className="size-4" />}
          />
          <div className="h-[280px] px-2 pb-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={staffEquipment.map((e) => ({ name: e.id, health: e.health }))}>
                <CartesianGrid strokeDasharray="4 6" vertical={false} stroke="var(--border)" />
                <XAxis
                  dataKey="name"
                  tickLine={false}
                  axisLine={false}
                  fontSize={10.5}
                  stroke="var(--muted-foreground)"
                />
                <YAxis
                  domain={[0, 100]}
                  tickLine={false}
                  axisLine={false}
                  fontSize={11}
                  width={30}
                  stroke="var(--muted-foreground)"
                />
                <Tooltip {...chartTip} cursor={{ fill: "var(--surface-muted)" }} />
                <Bar dataKey="health" radius={[6, 6, 0, 0]} maxBarSize={26}>
                  {staffEquipment.map((e) => (
                    <Cell
                      key={e.id}
                      fill={
                        e.health >= 85
                          ? "var(--success)"
                          : e.health >= 65
                            ? "var(--warning)"
                            : "var(--danger)"
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel>
          <PanelHead
            title="Complaint categories"
            subtitle="Share of reported issues"
            icon={<Images className="size-4" />}
          />
          <div className="h-[250px] px-2 pb-4">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={staffCategoryData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={52}
                  outerRadius={82}
                  paddingAngle={3}
                >
                  {staffCategoryData.map((_, i) => (
                    <Cell key={i} fill={pieColors[i % pieColors.length]} />
                  ))}
                </Pie>
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Tooltip {...chartTip} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel className="lg:col-span-2">
          <PanelHead
            title="Maintenance summary"
            subtitle="Work orders touching this department"
            icon={<Wrench className="size-4" />}
          />
          <div className="overflow-x-auto px-2 pb-6">
            <table className="w-full min-w-[680px] border-collapse">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                  {["Work order", "Equipment", "Engineer", "Stage", "Status", "Progress"].map(
                    (h) => (
                      <th key={h} className="px-4 py-3 font-semibold">
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {staffMaintenance.map((m) => (
                  <tr
                    key={m.id}
                    className="border-t border-border transition-colors hover:bg-surface-muted/60"
                  >
                    <td className="px-4 py-3.5">
                      <Link
                        to={`/staff/maintenance/${m.id}` as never}
                        className="text-[12.5px] font-semibold hover:text-primary"
                      >
                        {m.id}
                      </Link>
                    </td>
                    <td className="px-4 py-3.5 text-[12.5px] text-muted-foreground">
                      {equipmentById(m.equipmentId)?.name}
                    </td>
                    <td className="px-4 py-3.5 text-[12.5px] text-muted-foreground">
                      {m.engineer}
                    </td>
                    <td className="px-4 py-3.5 text-[12.5px] text-muted-foreground">{m.stage}</td>
                    <td className="px-4 py-3.5">
                      <Pill
                        tone={
                          m.status === "Completed"
                            ? "success"
                            : m.status === "Awaiting Parts"
                              ? "warning"
                              : "primary"
                        }
                      >
                        {m.status}
                      </Pill>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="w-[110px]">
                        <Meter value={m.progress} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel>
          <PanelHead
            title="Biomedical contacts"
            subtitle="Engineers covering Radiology"
            icon={<Phone className="size-4" />}
          />
          <ul className="space-y-2.5 px-6 pb-7">
            {deptEngineerList.map((e) => (
              <li
                key={e.name}
                className="flex items-center gap-3 rounded-2xl border border-border px-4 py-3"
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-xl gradient-primary text-[11px] font-bold text-white">
                  {e.initials}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12.5px] font-semibold">{e.name}</p>
                  <p className="truncate text-[11.5px] text-muted-foreground">{e.role}</p>
                </div>
                <span className="shrink-0 text-[11.5px] text-muted-foreground">{e.phone}</span>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel className="lg:col-span-2">
          <PanelHead
            title="Department activity"
            subtitle="Most recent events"
            icon={<Activity className="size-4" />}
          />
          <StaffTimeline items={staffActivities} />
        </Panel>

        <Panel>
          <PanelHead title="Asset mix" subtitle="Status distribution" icon={<TagIcon />} />
          <div className="space-y-3.5 px-6 pb-7">
            {(["Operational", "Under Maintenance", "Critical", "Idle"] as const).map((s) => {
              const count = staffEquipment.filter((e) => e.status === s).length;
              return (
                <div key={s}>
                  <div className="flex justify-between text-[12px]">
                    <span className="text-muted-foreground">{s}</span>
                    <span className="font-semibold tabular-nums">{count}</span>
                  </div>
                  <div className="mt-1.5">
                    <Meter
                      value={(count / staffEquipment.length) * 100}
                      tone={
                        s === "Critical" ? "danger" : s === "Operational" ? "success" : "warning"
                      }
                    />
                  </div>
                </div>
              );
            })}
            <div className="pt-2">
              <TagPills items={["Imaging", "Diagnostics", "Mobile", "Contrast"]} tone="primary" />
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}

function TagIcon() {
  return <Grid2x2 className="size-4" />;
}

const staffCategoryData = [
  { name: "Mechanical", value: 34 },
  { name: "Electrical", value: 21 },
  { name: "Software", value: 18 },
  { name: "Calibration", value: 15 },
  { name: "Accessory", value: 12 },
];

const deptEngineerList = [
  { name: "Anita Raghavan", initials: "AR", role: "Biomedical Lead", phone: "Ext. 4101" },
  { name: "Daniel Okafor", initials: "DO", role: "Senior Biomedical Engineer", phone: "Ext. 4118" },
  { name: "Priya Nair", initials: "PN", role: "Calibration Specialist", phone: "Ext. 4176" },
  { name: "Mei Lin Chan", initials: "MC", role: "Field Engineer", phone: "Ext. 4144" },
];
