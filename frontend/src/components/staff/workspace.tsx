import { useMemo, useState } from "react";
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
} from "lucide-react";
import { Meter, Panel, PanelHead, Pill, Ring, EmptyState } from "@/components/ui/primitives";
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
} from "@/lib/staff";
import { cn } from "@/lib/utils";

const chartTip = {
  contentStyle: { borderRadius: 14, fontSize: 12, border: "1px solid var(--border)" },
};

/* ================================= Dashboard ================================= */

export function StaffDashboard() {
  return (
    <div className="mx-auto max-w-[1600px] space-y-6">
      <StaffCrumbs trail={[{ label: "Dashboard" }]} />
      <StaffHero
        eyebrow={`${staffDepartment.name} · ${staffDepartment.code}`}
        title={`Welcome back, ${staffProfile.name.split(" ")[0]}`}
        description={`${staffStats.total} assets under your department, ${staffStats.open} open complaints and ${staffStats.upcoming} maintenance visits scheduled. Department health score is ${staffStats.health}%.`}
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
          value={staffStats.total}
          hint="Assigned to Radiology"
          tone="primary"
          to="/staff/equipment"
          icon={<Cpu className="size-4" />}
        />
        <StatCard
          label="Active equipment"
          value={staffStats.active}
          hint="Operational right now"
          tone="success"
          to="/staff/equipment"
          icon={<CircleCheck className="size-4" />}
        />
        <StatCard
          label="Under maintenance"
          value={staffStats.maintenance}
          hint="Being serviced or critical"
          tone="warning"
          to="/staff/maintenance"
          icon={<Wrench className="size-4" />}
        />
        <StatCard
          label="Open complaints"
          value={staffStats.open}
          hint="Awaiting resolution"
          tone="danger"
          to="/staff/complaints"
          icon={<CircleAlert className="size-4" />}
        />
      </div>

      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Completed complaints"
          value={staffStats.completed}
          hint="Resolved and closed"
          tone="success"
          to="/staff/complaints"
          icon={<CircleCheck className="size-4" />}
        />
        <StatCard
          label="Upcoming maintenance"
          value={staffStats.upcoming}
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
          value={`${staffStats.health}%`}
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
              <AreaChart data={staffHealthTrend}>
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
            <Ring value={staffStats.health} size={132} sub="health" />
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
              <BarChart data={staffComplaintTrend} barGap={6}>
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
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<(typeof statuses)[number]>("All");
  const [category, setCategory] = useState("All");
  const [view, setView] = useState<"table" | "cards">("table");

  const categories = useMemo(
    () => ["All", ...Array.from(new Set(staffEquipment.map((e) => e.category)))],
    [],
  );

  const rows = useMemo(
    () =>
      staffEquipment.filter((e) => {
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
    [query, status, category],
  );

  return (
    <div className="mx-auto max-w-[1600px] space-y-6">
      <StaffCrumbs trail={[{ label: "Department equipment" }]} />
      <StaffHero
        eyebrow="Equipment"
        title="Department equipment"
        description={`Every asset assigned to ${staffDepartment.name}. You have read access — report an issue to request service.`}
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
          value={staffStats.total}
          hint="Radiology register"
          tone="primary"
          icon={<Cpu className="size-4" />}
        />
        <StatCard
          label="Operational"
          value={staffStats.active}
          hint="Available for clinical use"
          tone="success"
          icon={<CircleCheck className="size-4" />}
        />
        <StatCard
          label="Needs attention"
          value={staffStats.maintenance}
          hint="Maintenance or critical"
          tone="warning"
          icon={<Wrench className="size-4" />}
        />
        <StatCard
          label="Avg health"
          value={`${staffStats.health}%`}
          hint="Across all assets"
          tone="violet"
          icon={<HeartPulse className="size-4" />}
        />
      </div>

      <Panel>
        <PanelHead
          title="Asset register"
          subtitle={`${rows.length} of ${staffEquipment.length} assets shown`}
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
  const asset = equipmentById(id);

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

  const linkedComplaints = staffComplaints.filter((c) => c.equipmentId === asset.id);
  const linkedWork = staffMaintenance.filter((m) => m.equipmentId === asset.id);

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
          value={staffStats.total}
          hint="Assets on register"
          tone="primary"
          icon={<Cpu className="size-4" />}
        />
        <StatCard
          label="Active complaints"
          value={staffStats.open}
          hint="Currently open"
          tone="warning"
          icon={<CircleAlert className="size-4" />}
        />
        <StatCard
          label="Completed complaints"
          value={staffStats.completed}
          hint="Last 30 days"
          tone="success"
          icon={<CircleCheck className="size-4" />}
        />
        <StatCard
          label="Health score"
          value={`${staffStats.health}%`}
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
