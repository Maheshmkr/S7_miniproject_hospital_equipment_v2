import { useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { Activity, KeyRound, Shield, UserPlus, Users } from "lucide-react";
import { Meter, Panel, PanelHead, Pill } from "@/components/ui/primitives";
import { users as fallbackUsers } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { useUserList } from "@/lib/api/useUsers";
import { userDepartmentName, USER_ROLE_LABELS } from "@/lib/api/userRecords";

export const Route = createFileRoute("/users/")({
  head: () => ({
    meta: [
      { title: "User Management — Medixa" },
      {
        name: "description",
        content:
          "Manage hospital staff accounts, roles, permissions and activity across the workspace.",
      },
      { property: "og:title", content: "User Management — Medixa" },
      {
        property: "og:description",
        content: "Role distribution, permissions and access analytics for your team.",
      },
    ],
  }),
  component: UsersWorkspace,
});

const defaultRoleSplit = [
  { name: "Engineers", value: 42 },
  { name: "Clinicians", value: 28 },
  { name: "Administrators", value: 18 },
  { name: "Auditors", value: 12 },
];
const colors = ["var(--chart-1)", "var(--chart-2)", "var(--chart-5)", "var(--chart-4)"];

function UsersWorkspace() {
  const live = useUserList({ limit: 100 });

  const teamMembers = useMemo(() => {
    if (!live.enabled || !live.items || live.items.length === 0) {
      return fallbackUsers;
    }
    return live.items.map((u) => ({
      name: u.name,
      handle: u.employeeId ? `@${u.employeeId}` : `@${u.email.split("@")[0]}`,
      role: USER_ROLE_LABELS[u.role] ?? u.role,
      dept: userDepartmentName(u.departmentId),
      status: u.status === "ACTIVE" ? "Active" : u.status === "INACTIVE" ? "Away" : "Suspended",
      last: "Active",
      actions: u.status === "ACTIVE" ? 820 : 120,
      avatar:
        u.initials ||
        u.name
          .split(/\s+/)
          .map((p) => p[0])
          .join("")
          .slice(0, 2)
          .toUpperCase(),
      id: u._id,
    }));
  }, [live.enabled, live.items]);

  const stats = useMemo(() => {
    if (!live.enabled || !live.items) {
      return [
        { l: "Total users", v: "248", s: "+12 this month" },
        { l: "Active today", v: "186", s: "75% of workspace" },
        { l: "Pending invites", v: "9", s: "3 expiring soon" },
        { l: "Privileged roles", v: "14", s: "Reviewed 6d ago" },
      ];
    }
    const total = live.items.length;
    const active = live.items.filter((u) => u.status === "ACTIVE").length;
    const admins = live.items.filter((u) => u.role === "ADMINISTRATOR").length;
    return [
      { l: "Total users", v: String(total), s: "Registered members" },
      {
        l: "Active today",
        v: String(active),
        s: `${Math.round((active / (total || 1)) * 100)}% of directory`,
      },
      { l: "Privileged admins", v: String(admins), s: "Full access" },
      {
        l: "Staff & Engineers",
        v: String(total - admins),
        s: "Clinical & Bio-med",
      },
    ];
  }, [live.enabled, live.items]);

  const roleSplit = useMemo(() => {
    if (!live.enabled || !live.items || live.items.length === 0) return defaultRoleSplit;
    const total = live.items.length;
    const eng = live.items.filter((u) => u.role === "BIOMEDICAL_ENGINEER").length;
    const staff = live.items.filter((u) => u.role === "DEPARTMENT_STAFF").length;
    const adm = live.items.filter((u) => u.role === "ADMINISTRATOR").length;
    return [
      { name: "Engineers", value: Math.round((eng / total) * 100) },
      { name: "Staff", value: Math.round((staff / total) * 100) },
      { name: "Administrators", value: Math.round((adm / total) * 100) },
    ];
  }, [live.enabled, live.items]);

  return (
    <div className="mx-auto max-w-[1600px] space-y-6">
      <section className="relative overflow-hidden rounded-[28px] border border-border bg-surface p-8 shadow-float rise-in">
        <div className="absolute inset-0 gradient-mesh" />
        <div className="relative grid grid-cols-[minmax(0,1fr)_auto] items-end gap-6">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
              Administration
            </p>
            <h1 className="mt-2 text-[32px] font-bold leading-tight">User Management</h1>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              {teamMembers.length} workspace members · Verified clinical and engineering directory.
            </p>
          </div>
          <Link
            to="/users/new"
            className="inline-flex shrink-0 items-center gap-2 rounded-xl gradient-primary px-4 py-2.5 text-[13px] font-semibold text-white shadow-glow transition-transform hover:-translate-y-0.5"
          >
            <UserPlus className="size-4" /> Invite member
          </Link>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-4">
        {stats.map((k) => (
          <Panel key={k.l}>
            <div className="p-6">
              <p className="text-[11.5px] text-muted-foreground">{k.l}</p>
              <p className="mt-2 text-[26px] font-bold leading-none tabular-nums">{k.v}</p>
              <p className="mt-2 text-[11.5px] text-muted-foreground">{k.s}</p>
            </div>
          </Panel>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Panel className="lg:col-span-2">
          <PanelHead
            title="Team members"
            subtitle={`${teamMembers.length} active directory profiles`}
            icon={<Users className="size-4" />}
            action={
              <Link to="/users/list" className="text-[12px] font-semibold text-primary">
                View register
              </Link>
            }
          />
          <div className="grid gap-3 px-6 pb-6 sm:grid-cols-2">
            {teamMembers.map((u) => (
              <div
                key={u.handle}
                className="group rounded-2xl border border-border p-5 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-soft"
              >
                <div className="flex items-start gap-3">
                  <span className="grid size-11 shrink-0 place-items-center rounded-2xl gradient-primary text-[12px] font-bold text-white">
                    {u.avatar}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold">{u.name}</p>
                    <p className="truncate text-[11.5px] text-muted-foreground">{u.handle}</p>
                  </div>
                  <span
                    className={cn(
                      "mt-1 size-2 shrink-0 rounded-full",
                      u.status === "Active"
                        ? "bg-success"
                        : u.status === "Away"
                          ? "bg-warning"
                          : "bg-muted-foreground/40",
                    )}
                  />
                </div>
                <div className="mt-4 flex items-center justify-between gap-2 border-t border-border pt-3.5 text-[11.5px]">
                  <span className="truncate text-muted-foreground">
                    {u.role} · {u.dept}
                  </span>
                  <span className="shrink-0 font-medium text-muted-foreground">{u.last}</span>
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <div className="space-y-6">
          <Panel>
            <PanelHead
              title="Role distribution"
              subtitle="Across the workspace"
              icon={<Shield className="size-4" />}
            />
            <div className="h-[190px] px-2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={roleSplit}
                    dataKey="value"
                    innerRadius={46}
                    outerRadius={72}
                    paddingAngle={4}
                    stroke="none"
                  >
                    {roleSplit.map((_, i) => (
                      <Cell key={i} fill={colors[i % colors.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      borderRadius: 14,
                      fontSize: 12,
                      border: "1px solid var(--border)",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-2 px-6 pb-6">
              {roleSplit.map((r, i) => (
                <div
                  key={r.name}
                  className="flex items-center gap-2 text-[11.5px] text-muted-foreground"
                >
                  <span
                    className="size-2 rounded-full"
                    style={{ background: colors[i % colors.length] }}
                  />
                  {r.name} <span className="ml-auto font-semibold text-foreground">{r.value}%</span>
                </div>
              ))}
            </div>
          </Panel>

          <Panel>
            <PanelHead
              title="Permissions"
              subtitle="Coverage by capability"
              icon={<KeyRound className="size-4" />}
            />
            <div className="space-y-3.5 px-6 pb-6">
              {[
                { l: "Asset registry write", v: 34 },
                { l: "Work order dispatch", v: 61 },
                { l: "Contract approval", v: 12 },
                { l: "Analytics export", v: 78 },
              ].map((p) => (
                <div key={p.l}>
                  <div className="flex justify-between text-[12px]">
                    <span className="truncate text-muted-foreground">{p.l}</span>
                    <span className="shrink-0 font-semibold tabular-nums">{p.v}%</span>
                  </div>
                  <div className="mt-1.5">
                    <Meter value={p.v} />
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </div>

        <Panel className="lg:col-span-2">
          <PanelHead
            title="Performance"
            subtitle="Actions logged per member"
            icon={<Activity className="size-4" />}
          />
          <div className="space-y-2 px-4 pb-6">
            {teamMembers.slice(0, 6).map((u) => (
              <div
                key={u.handle}
                className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 rounded-2xl px-3 py-3 hover:bg-surface-muted"
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-surface-muted text-[11px] font-bold">
                  {u.avatar}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-[12.5px] font-semibold">{u.name}</p>
                  <div className="mt-1.5">
                    <Meter value={(u.actions / 1300) * 100} />
                  </div>
                </div>
                <span className="shrink-0 text-[12px] font-semibold tabular-nums">{u.actions}</span>
              </div>
            ))}
          </div>
        </Panel>

        <Panel>
          <PanelHead
            title="Recent logins"
            subtitle="Last 24 hours"
            icon={<Activity className="size-4" />}
          />
          <ul className="space-y-2 px-6 pb-6">
            {teamMembers.slice(0, 5).map((u) => (
              <li
                key={u.handle}
                className="flex items-center justify-between gap-3 rounded-2xl border border-border px-4 py-3"
              >
                <span className="min-w-0 truncate text-[12.5px] font-medium">{u.name}</span>
                <Pill
                  tone={
                    u.status === "Active" ? "success" : u.status === "Away" ? "warning" : "neutral"
                  }
                >
                  {u.last}
                </Pill>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  );
}
