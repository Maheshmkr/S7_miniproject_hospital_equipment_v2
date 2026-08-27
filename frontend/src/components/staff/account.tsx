import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Bell,
  BellRing,
  CheckCircle2,
  CircleAlert,
  Clock,
  Cpu,
  Download,
  FileText,
  Filter,
  Globe,
  KeyRound,
  Lock,
  LogOut,
  Mail,
  Megaphone,
  Phone,
  Search,
  ShieldCheck,
  Smartphone,
  UserRound,
  Wrench,
} from "lucide-react";
import { EmptyState, Meter, Panel, PanelHead, Pill } from "@/components/ui/primitives";
import {
  ActionButton,
  ActionLink,
  DefRow,
  StaffCrumbs,
  StaffHero,
  StaffTabs,
  StatCard,
  TagPills,
} from "@/components/staff/kit";
import {
  equipmentById,
  reportById,
  serviceReports as mockServiceReports,
  staffDepartment,
  staffNotifications,
  staffProfile,
} from "@/lib/staff";
import { apiEnabled } from "@/lib/api/client";
import { serviceReportsApi } from "@/lib/api/serviceReportsApi";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

/* ============================== Service reports ============================== */

export function ServiceReportsList() {
  const [query, setQuery] = useState("");
  const [type, setType] = useState("All");
  const [liveReports, setLiveReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(apiEnabled);

  useEffect(() => {
    if (!apiEnabled) return;
    serviceReportsApi.list({ page: 1, limit: 100 })
      .then((res) => {
        if (res && res.items) {
          const mapped = res.items.map((r: any) => {
            const dateStr = r.createdAt ? new Date(r.createdAt).toLocaleDateString("en-US", {
              day: "2-digit",
              month: "short",
              year: "numeric"
            }) : "";
            return {
              id: r.serviceReportId || r._id,
              complaintId: r.complaintId?.complaintId || r.complaintId || "",
              equipmentId: r.equipmentId?.equipmentId || r.equipmentId || "",
              engineer: r.engineerId?.name || "Biomedical Engineer",
              completed: dateStr,
              type: r.maintenanceId?.maintenanceType === "PREVENTIVE" ? "Preventive" : "Corrective",
              summary: r.summary || "",
              findings: r.findings || "",
              actions: r.actions || []
            };
          });
          setLiveReports(mapped);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const displayReports = apiEnabled ? liveReports : mockServiceReports;

  const rows = useMemo(
    () =>
      displayReports.filter((r) => {
        const q = query.trim().toLowerCase();
        const eq = equipmentById(r.equipmentId);
        const matchQ =
          !q ||
          [r.id, r.complaintId, r.engineer, eq?.name ?? ""].some((v) =>
            v.toLowerCase().includes(q),
          );
        return matchQ && (type === "All" || r.type === type);
      }),
    [displayReports, query, type],
  );

  return (
    <div className="mx-auto max-w-[1600px] space-y-6">
      <StaffCrumbs trail={[{ label: "Service reports" }]} />
      <StaffHero
        eyebrow="Reports"
        title="Service reports"
        description="Signed reports issued after every completed intervention on your department's equipment."
        actions={
          <ActionLink
            to="/staff/maintenance"
            variant="primary"
            icon={<Wrench className="size-4" />}
          >
            Maintenance status
          </ActionLink>
        }
      />
      <StaffTabs active="reports" />

      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total reports"
          value={displayReports.length}
          hint="Available to download"
          tone="primary"
          icon={<FileText className="size-4" />}
        />
        <StatCard
          label="Corrective"
          value={displayReports.filter((r) => r.type === "Corrective").length}
          hint="Breakdown repairs"
          tone="warning"
          icon={<Wrench className="size-4" />}
        />
        <StatCard
          label="Preventive"
          value={displayReports.filter((r) => r.type === "Preventive").length}
          hint="Planned servicing"
          tone="success"
          icon={<CheckCircle2 className="size-4" />}
        />
        <StatCard
          label="Calibration"
          value={serviceReports.filter((r) => r.type === "Calibration").length}
          hint="Certificates issued"
          tone="violet"
          icon={<ShieldCheck className="size-4" />}
        />
      </div>

      <Panel>
        <PanelHead
          title="All service reports"
          subtitle={`${rows.length} of ${serviceReports.length} shown`}
          icon={<Filter className="size-4" />}
        />
        <div className="grid gap-3 px-6 pb-5 sm:px-7 md:grid-cols-[minmax(0,1fr)_auto]">
          <label className="flex h-10 items-center gap-2.5 rounded-xl border border-border bg-surface px-3.5 text-[13px] shadow-xs">
            <Search className="size-4 shrink-0 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search report, complaint, equipment or engineer…"
              className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
            />
          </label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="h-10 rounded-xl border border-border bg-surface px-3 text-[12.5px] font-medium shadow-xs outline-none"
          >
            {["All", "Corrective", "Preventive", "Calibration"].map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </div>

        {rows.length === 0 ? (
          <EmptyState
            icon={<FileText className="size-6" />}
            title="No reports match your search"
            hint="Try a different report ID, engineer or equipment name."
          />
        ) : (
          <div className="overflow-x-auto px-2 pb-6">
            <table className="w-full min-w-[980px] border-collapse">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                  {[
                    "Report ID",
                    "Equipment",
                    "Engineer",
                    "Complaint",
                    "Completed",
                    "Parts used",
                    "Time taken",
                    "Action",
                  ].map((h) => (
                    <th key={h} className="px-4 py-3 font-semibold">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr
                    key={r.id}
                    className="border-t border-border transition-colors hover:bg-surface-muted/60"
                  >
                    <td className="px-4 py-3.5">
                      <Link
                        to={`/staff/reports/${r.id}` as never}
                        className="text-[12.5px] font-semibold hover:text-primary"
                      >
                        {r.id}
                      </Link>
                      <p className="text-[11px] text-muted-foreground">{r.type}</p>
                    </td>
                    <td className="px-4 py-3.5 text-[12.5px] text-muted-foreground">
                      {equipmentById(r.equipmentId)?.name}
                    </td>
                    <td className="px-4 py-3.5 text-[12.5px] text-muted-foreground">
                      {r.engineer}
                    </td>
                    <td className="px-4 py-3.5">
                      <Link
                        to={`/staff/complaints/${r.complaintId}` as never}
                        className="text-[12.5px] hover:text-primary"
                      >
                        {r.complaintId}
                      </Link>
                    </td>
                    <td className="px-4 py-3.5 text-[12px] text-muted-foreground">{r.completed}</td>
                    <td className="px-4 py-3.5 text-[12.5px] tabular-nums text-muted-foreground">
                      {r.parts.length}
                    </td>
                    <td className="px-4 py-3.5 text-[12.5px] tabular-nums text-muted-foreground">
                      {r.timeTaken}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <ActionLink to={`/staff/reports/${r.id}` as never}>View</ActionLink>
                        <ActionButton icon={<Download className="size-3.5" />}>PDF</ActionButton>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}

export function ServiceReportDetails({ id }: { id: string }) {
  const report = reportById(id);

  if (!report) {
    return (
      <div className="mx-auto max-w-[1600px] space-y-6">
        <StaffCrumbs trail={[{ label: "Service reports", to: "/staff/reports" }, { label: id }]} />
        <Panel>
          <EmptyState
            icon={<FileText className="size-6" />}
            title="Report not found"
            hint="This report may not have been published yet."
            action={
              <ActionLink to="/staff/reports" variant="primary">
                Back to reports
              </ActionLink>
            }
          />
        </Panel>
      </div>
    );
  }

  const eq = equipmentById(report.equipmentId);

  return (
    <div className="mx-auto max-w-[1600px] space-y-6">
      <StaffCrumbs
        trail={[{ label: "Service reports", to: "/staff/reports" }, { label: report.id }]}
      />
      <StaffHero
        eyebrow={`${report.type} service`}
        title={`${report.id} — ${eq?.name ?? ""}`}
        description={`Completed ${report.completed} by ${report.engineer} · outcome ${report.outcome}`}
        actions={
          <>
            <ActionButton variant="primary" icon={<Download className="size-4" />}>
              Download PDF
            </ActionButton>
            <ActionLink
              to={`/staff/complaints/${report.complaintId}` as never}
              icon={<CircleAlert className="size-4" />}
            >
              {report.complaintId}
            </ActionLink>
            <ActionLink
              to={`/staff/equipment/${report.equipmentId}` as never}
              icon={<Cpu className="size-4" />}
            >
              Equipment
            </ActionLink>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Panel className="lg:col-span-2">
          <PanelHead
            title="Report summary"
            subtitle="What the engineer did"
            icon={<FileText className="size-4" />}
          />
          <div className="px-6 pb-6 sm:px-7">
            <p className="text-[13px] leading-relaxed text-muted-foreground">{report.summary}</p>
            <p className="mt-4 text-[12px] font-semibold">Findings</p>
            <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">
              {report.findings}
            </p>
            <p className="mt-4 text-[12px] font-semibold">Actions performed</p>
            <ul className="mt-2 space-y-2">
              {report.actions.map((a) => (
                <li
                  key={a}
                  className="flex items-start gap-2.5 text-[12.5px] text-muted-foreground"
                >
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" />
                  {a}
                </li>
              ))}
            </ul>
          </div>
        </Panel>

        <Panel>
          <PanelHead
            title="Report metadata"
            subtitle="Sign-off details"
            icon={<ShieldCheck className="size-4" />}
          />
          <dl className="px-6 pb-6 sm:px-7">
            <DefRow label="Report ID" value={report.id} />
            <DefRow label="Type" value={report.type} />
            <DefRow label="Engineer" value={report.engineer} />
            <DefRow label="Completion date" value={report.completed} />
            <DefRow label="Time taken" value={report.timeTaken} />
            <DefRow label="Downtime" value={report.downtime} />
            <DefRow label="Outcome" value={<Pill tone="success">{report.outcome}</Pill>} />
            <DefRow label="Signed by" value={report.signedBy} />
            <DefRow label="Verified by" value={report.verifiedBy} />
          </dl>
        </Panel>

        <Panel className="lg:col-span-2">
          <PanelHead
            title="Parts used"
            subtitle="Components consumed on this job"
            icon={<Cpu className="size-4" />}
          />
          {report.parts.length === 0 ? (
            <EmptyState
              icon={<Cpu className="size-6" />}
              title="No parts consumed"
              hint="This intervention required no replacement components."
            />
          ) : (
            <div className="overflow-x-auto px-2 pb-6">
              <table className="w-full min-w-[520px] border-collapse">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                    {["Part", "Part code", "Quantity"].map((h) => (
                      <th key={h} className="px-4 py-3 font-semibold">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {report.parts.map((p) => (
                    <tr key={p.code} className="border-t border-border">
                      <td className="px-4 py-3.5 text-[12.5px] font-medium">{p.part}</td>
                      <td className="px-4 py-3.5 text-[12.5px] text-muted-foreground">{p.code}</td>
                      <td className="px-4 py-3.5 text-[12.5px] tabular-nums text-muted-foreground">
                        {p.qty}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        <Panel>
          <PanelHead
            title="Equipment"
            subtitle="Asset serviced"
            icon={<Cpu className="size-4" />}
          />
          <div className="px-6 pb-7 sm:px-7">
            <dl>
              <DefRow label="Asset" value={eq?.name ?? "—"} />
              <DefRow label="Asset ID" value={report.equipmentId} />
              <DefRow label="Location" value={eq?.location ?? "—"} />
              <DefRow label="Health after service" value={`${eq?.health ?? 0}%`} />
            </dl>
            <div className="mt-3">
              <Meter value={eq?.health ?? 0} tone="success" />
            </div>
            <div className="mt-4">
              <ActionLink to={`/staff/equipment/${report.equipmentId}` as never} variant="primary">
                Open equipment
              </ActionLink>
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}

/* ================================ Notifications ============================== */

const kindIcon = {
  Complaint: CircleAlert,
  Assignment: UserRound,
  Maintenance: Wrench,
  Warranty: ShieldCheck,
  Announcement: Megaphone,
};

export function StaffNotifications() {
  const [kind, setKind] = useState("All");
  const rows = staffNotifications.filter((n) => kind === "All" || n.kind === kind);
  const unread = staffNotifications.filter((n) => n.unread).length;

  const dot: Record<string, string> = {
    neutral: "bg-muted-foreground",
    primary: "bg-primary",
    success: "bg-success",
    warning: "bg-warning",
    danger: "bg-danger",
    violet: "bg-violet",
  };

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <StaffCrumbs trail={[{ label: "Notifications" }]} />
      <StaffHero
        eyebrow="Inbox"
        title="Notifications"
        description={`${unread} unread updates across complaints, maintenance, warranty alerts and hospital announcements.`}
        actions={
          <ActionButton variant="primary" icon={<BellRing className="size-4" />}>
            Mark all as read
          </ActionButton>
        }
      />
      <StaffTabs active="notifications" />

      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Unread"
          value={unread}
          hint="Needs your attention"
          tone="danger"
          icon={<Bell className="size-4" />}
        />
        <StatCard
          label="Complaint updates"
          value={staffNotifications.filter((n) => n.kind === "Complaint").length}
          hint="Status changes"
          tone="primary"
          icon={<CircleAlert className="size-4" />}
        />
        <StatCard
          label="Maintenance"
          value={staffNotifications.filter((n) => n.kind === "Maintenance").length}
          hint="Started and completed"
          tone="warning"
          icon={<Wrench className="size-4" />}
        />
        <StatCard
          label="Announcements"
          value={staffNotifications.filter((n) => n.kind === "Announcement").length}
          hint="Hospital-wide"
          tone="violet"
          icon={<Megaphone className="size-4" />}
        />
      </div>

      <Panel>
        <PanelHead
          title="All notifications"
          subtitle={`${rows.length} shown`}
          icon={<Bell className="size-4" />}
        />
        <div className="flex flex-wrap gap-2 px-6 pb-5 sm:px-7">
          {["All", "Complaint", "Assignment", "Maintenance", "Warranty", "Announcement"].map(
            (k) => (
              <button
                key={k}
                onClick={() => setKind(k)}
                className={cn(
                  "rounded-full border px-3.5 py-1.5 text-[12px] font-semibold transition-colors",
                  kind === k
                    ? "border-primary bg-primary-soft text-primary"
                    : "border-border bg-surface text-muted-foreground hover:text-foreground",
                )}
              >
                {k}
              </button>
            ),
          )}
        </div>
        <ul className="space-y-2.5 px-6 pb-7 sm:px-7">
          {rows.map((n) => {
            const Icon = kindIcon[n.kind];
            const body = (
              <div
                className={cn(
                  "flex gap-3 rounded-2xl border px-4 py-4 transition-all hover:-translate-y-0.5 hover:shadow-soft",
                  n.unread ? "border-primary/30 bg-primary-soft/25" : "border-border bg-surface",
                )}
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-surface-muted text-muted-foreground">
                  <Icon className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className={cn("size-2 shrink-0 rounded-full", dot[n.tone])} />
                    <p className="truncate text-[13px] font-semibold">{n.title}</p>
                    {n.unread ? <Pill tone="primary">New</Pill> : null}
                  </div>
                  <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">
                    {n.body}
                  </p>
                  <p className="mt-1.5 text-[11px] text-muted-foreground/80">
                    {n.kind} · {n.when}
                  </p>
                </div>
              </div>
            );
            return (
              <li key={n.id}>
                {n.to ? (
                  <Link to={n.to} className="block">
                    {body}
                  </Link>
                ) : (
                  body
                )}
              </li>
            );
          })}
        </ul>
      </Panel>
    </div>
  );
}

/* ================================= My profile ================================ */

export function StaffProfilePage() {
  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <StaffCrumbs trail={[{ label: "My profile" }]} />
      <StaffHero
        eyebrow="Account"
        title="My profile"
        description="Your personal details, department assignment and account security."
        actions={
          <ActionLink to="/staff/settings" variant="primary">
            Open settings
          </ActionLink>
        }
      />
      <StaffTabs active="profile" />

      <div className="grid gap-6 lg:grid-cols-3">
        <Panel>
          <div className="flex flex-col items-center gap-4 p-8 text-center">
            <span className="grid size-24 place-items-center rounded-[28px] gradient-primary text-2xl font-bold text-white shadow-glow">
              {staffProfile.avatar}
            </span>
            <div>
              <p className="text-[17px] font-bold">{staffProfile.name}</p>
              <p className="text-[12.5px] text-muted-foreground">{staffProfile.title}</p>
            </div>
            <Pill tone="primary">{staffProfile.role}</Pill>
            <div className="grid w-full grid-cols-2 gap-2 pt-2 text-center">
              <div className="rounded-2xl bg-surface-muted/70 py-3">
                <p className="text-[14px] font-bold">{staffProfile.employeeId}</p>
                <p className="text-[10.5px] text-muted-foreground">Employee ID</p>
              </div>
              <div className="rounded-2xl bg-surface-muted/70 py-3">
                <p className="text-[14px] font-bold">{staffDepartment.code}</p>
                <p className="text-[10.5px] text-muted-foreground">Department</p>
              </div>
            </div>
          </div>
        </Panel>

        <Panel className="lg:col-span-2">
          <PanelHead
            title="Personal details"
            subtitle="Visible to the biomedical team"
            icon={<UserRound className="size-4" />}
          />
          <div className="grid gap-x-8 px-6 pb-6 sm:px-7 md:grid-cols-2">
            <dl>
              <DefRow label="Full name" value={staffProfile.name} />
              <DefRow label="Employee ID" value={staffProfile.employeeId} />
              <DefRow label="Department" value={staffProfile.department} />
              <DefRow label="Reports to" value={staffProfile.reportsTo} />
            </dl>
            <dl>
              <DefRow label="Email" value={staffProfile.email} />
              <DefRow label="Phone" value={staffProfile.phone} />
              <DefRow label="Shift" value={staffProfile.shift} />
              <DefRow label="Joined" value={staffProfile.joined} />
            </dl>
          </div>
        </Panel>

        <Panel className="lg:col-span-2">
          <PanelHead
            title="Change password"
            subtitle="Use at least 12 characters"
            icon={<KeyRound className="size-4" />}
          />
          <div className="grid gap-4 px-6 pb-7 sm:px-7 md:grid-cols-3">
            {["Current password", "New password", "Confirm new password"].map((l) => (
              <div key={l}>
                <p className="text-[12px] font-semibold text-muted-foreground">{l}</p>
                <input
                  type="password"
                  placeholder="••••••••••••"
                  className="mt-2 h-11 w-full rounded-xl border border-border bg-surface px-3.5 text-[13px] shadow-xs outline-none focus:border-primary"
                />
              </div>
            ))}
            <div className="md:col-span-3">
              <ActionButton variant="primary" icon={<Lock className="size-4" />}>
                Update password
              </ActionButton>
            </div>
          </div>
        </Panel>

        <Panel>
          <PanelHead
            title="Security"
            subtitle="Account protection"
            icon={<ShieldCheck className="size-4" />}
          />
          <ul className="space-y-2.5 px-6 pb-7">
            {[
              {
                label: "Two-factor authentication",
                value: "Enabled · Authenticator app",
                icon: Smartphone,
                tone: "success" as const,
              },
              {
                label: "Last sign-in",
                value: "Today · 07:12 · Radiology desk",
                icon: Clock,
                tone: "neutral" as const,
              },
              {
                label: "Recovery email",
                value: staffProfile.email,
                icon: Mail,
                tone: "neutral" as const,
              },
              {
                label: "Trusted devices",
                value: "2 devices",
                icon: Lock,
                tone: "primary" as const,
              },
            ].map((s) => (
              <li
                key={s.label}
                className="flex items-center gap-3 rounded-2xl border border-border px-4 py-3"
              >
                <s.icon className="size-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12.5px] font-semibold">{s.label}</p>
                  <p className="truncate text-[11.5px] text-muted-foreground">{s.value}</p>
                </div>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel className="lg:col-span-3">
          <PanelHead
            title="Department contact"
            subtitle="Where colleagues can reach you"
            icon={<Phone className="size-4" />}
          />
          <div className="px-6 pb-7 sm:px-7">
            <TagPills
              items={[
                staffDepartment.name,
                staffDepartment.code,
                staffDepartment.extension,
                staffProfile.shift,
              ]}
              tone="primary"
            />
          </div>
        </Panel>
      </div>
    </div>
  );
}

/* ================================== Settings ================================= */

function Toggle({ label, hint, on }: { label: string; hint: string; on?: boolean }) {
  const [value, setValue] = useState(!!on);
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-border px-4 py-3.5">
      <div className="min-w-0 flex-1">
        <p className="text-[12.5px] font-semibold">{label}</p>
        <p className="mt-0.5 text-[11.5px] text-muted-foreground">{hint}</p>
      </div>
      <button
        type="button"
        onClick={() => setValue((v) => !v)}
        aria-pressed={value}
        className={cn(
          "relative h-6 w-11 shrink-0 rounded-full transition-colors",
          value ? "bg-primary" : "bg-surface-muted",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 size-5 rounded-full bg-white shadow-xs transition-all",
            value ? "left-[22px]" : "left-0.5",
          )}
        />
      </button>
    </div>
  );
}

export function StaffSettings() {
  const { signOut } = useAuth();

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <StaffCrumbs trail={[{ label: "Settings" }]} />
      <StaffHero
        eyebrow="Preferences"
        title="Settings"
        description="Control how Medixa notifies you, the language you work in, and your privacy and security options."
      />
      <StaffTabs active="settings" />

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel>
          <PanelHead
            title="Notification preferences"
            subtitle="Choose what reaches you"
            icon={<Bell className="size-4" />}
          />
          <div className="space-y-2.5 px-6 pb-7 sm:px-7">
            <Toggle
              label="Complaint status updates"
              hint="Every time a complaint you raised changes state"
              on
            />
            <Toggle
              label="Engineer assigned"
              hint="When a biomedical engineer picks up your complaint"
              on
            />
            <Toggle
              label="Maintenance started and completed"
              hint="Live work order milestones"
              on
            />
            <Toggle
              label="Warranty and AMC alerts"
              hint="Expiry warnings for department assets"
              on
            />
            <Toggle
              label="Hospital announcements"
              hint="Facility-wide notices and planned downtime"
            />
            <Toggle label="Weekly department digest" hint="A Monday summary of equipment health" />
          </div>
        </Panel>

        <Panel>
          <PanelHead
            title="Language & region"
            subtitle="Display formats"
            icon={<Globe className="size-4" />}
          />
          <div className="grid gap-4 px-6 pb-7 sm:px-7 md:grid-cols-2">
            {[
              {
                l: "Language",
                opts: ["English (UK)", "English (US)", "Français", "Deutsch", "Español"],
              },
              {
                l: "Time zone",
                opts: ["Europe/London (GMT+1)", "Europe/Berlin", "Asia/Kolkata", "UTC"],
              },
              { l: "Date format", opts: ["DD MMM YYYY", "MM/DD/YYYY", "YYYY-MM-DD"] },
              { l: "Time format", opts: ["24-hour", "12-hour"] },
            ].map((f) => (
              <div key={f.l}>
                <p className="text-[12px] font-semibold text-muted-foreground">{f.l}</p>
                <select className="mt-2 h-11 w-full rounded-xl border border-border bg-surface px-3.5 text-[13px] shadow-xs outline-none focus:border-primary">
                  {f.opts.map((o) => (
                    <option key={o}>{o}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </Panel>

        <Panel>
          <PanelHead
            title="Privacy"
            subtitle="How your information is shared"
            icon={<Lock className="size-4" />}
          />
          <div className="space-y-2.5 px-6 pb-7 sm:px-7">
            <Toggle
              label="Show my contact number to engineers"
              hint="Engineers can call you directly about a complaint"
              on
            />
            <Toggle
              label="Show my activity in the department feed"
              hint="Colleagues see complaints you raise"
              on
            />
            <Toggle
              label="Allow analytics on my usage"
              hint="Helps improve the workspace experience"
            />
          </div>
        </Panel>

        <Panel>
          <PanelHead
            title="Security"
            subtitle="Session and access"
            icon={<ShieldCheck className="size-4" />}
          />
          <div className="space-y-2.5 px-6 pb-7 sm:px-7">
            <Toggle
              label="Two-factor authentication"
              hint="Require a code from your authenticator app"
              on
            />
            <Toggle
              label="Sign out on browser close"
              hint="End the session when you close the tab"
            />
            <div className="flex flex-wrap items-center gap-2 pt-2">
              <ActionLink to="/staff/profile" icon={<KeyRound className="size-4" />}>
                Change password
              </ActionLink>
              <ActionButton>Sign out other devices</ActionButton>
            </div>
          </div>
        </Panel>

        <Panel className="lg:col-span-2">
          <PanelHead
            title="Session"
            subtitle="Signed in as Department Staff"
            icon={<LogOut className="size-4" />}
          />
          <div className="flex flex-wrap items-center justify-between gap-4 px-6 pb-7 sm:px-7">
            <div className="flex items-center gap-3">
              <span className="grid size-11 place-items-center rounded-2xl gradient-primary text-[13px] font-bold text-white">
                {staffProfile.avatar}
              </span>
              <div>
                <p className="text-[13px] font-semibold">{staffProfile.name}</p>
                <p className="text-[11.5px] text-muted-foreground">
                  {staffProfile.email} · {staffDepartment.name}
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                signOut();
                window.location.href = "/login";
              }}
              className="inline-flex items-center gap-2 rounded-xl border border-danger/30 bg-danger-soft px-4 py-2.5 text-[12.5px] font-semibold text-danger transition-all hover:-translate-y-0.5"
            >
              <LogOut className="size-4" /> Log out
            </button>
          </div>
        </Panel>
      </div>
    </div>
  );
}
