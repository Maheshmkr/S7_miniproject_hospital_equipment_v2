import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import {
  Activity,
  Check,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Shield,
  Sparkles,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { Meter, Panel, PanelHead, Pill } from "@/components/ui/primitives";
import { users as fallbackUsers, departments as fallbackDepartments } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { useUserList, useUserMutations } from "@/lib/api/useUsers";
import { useDepartmentList } from "@/lib/api/useDepartments";
import { toUserPayload, userDepartmentName, USER_ROLE_LABELS } from "@/lib/api/userRecords";

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
  const { items: departmentItems } = useDepartmentList();
  const { create: createUser } = useUserMutations();

  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [createdUser, setCreatedUser] = useState<{
    email: string;
    pass: string;
    name: string;
    role: string;
    dept: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSubmitting, setInviteSubmitting] = useState(false);

  // Form inputs
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formRole, setFormRole] = useState("Biomedical Lead");
  const [formDept, setFormDept] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [formShift, setFormShift] = useState("Morning");
  const [formNotes, setFormNotes] = useState("");

  const deptOptions = useMemo(() => {
    if (departmentItems && departmentItems.length > 0) {
      return departmentItems.map((d) => d.name);
    }
    return fallbackDepartments.map((d) => d.name);
  }, [departmentItems]);

  const handleGenerateRandomPassword = () => {
    const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$";
    let pwd = "Medixa#";
    for (let i = 0; i < 4; i++) {
      pwd += chars[Math.floor(Math.random() * chars.length)];
    }
    setFormPassword(pwd);
    setShowPassword(true);
  };

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError(null);

    const effectivePassword = formPassword.trim() || "Medixa#2026";
    if (effectivePassword.length < 6) {
      setInviteError("Password must be at least 6 characters long.");
      return;
    }

    setInviteSubmitting(true);
    try {
      const selectedDept = formDept || deptOptions[0] || "General";
      const payload = toUserPayload({
        name: formName,
        email: formEmail,
        role: formRole,
        dept: selectedDept,
        shift: formShift,
        notes: formNotes,
        password: effectivePassword,
      });

      payload.password = effectivePassword;

      await createUser(payload as Parameters<typeof createUser>[0]);
      setCreatedUser({
        name: formName,
        email: formEmail,
        pass: effectivePassword,
        role: formRole,
        dept: selectedDept,
      });
      live.reload();
      // Reset form
      setFormName("");
      setFormEmail("");
      setFormPassword("");
      setFormNotes("");
    } catch (err: unknown) {
      setInviteError(err instanceof Error ? err.message : "Failed to create user. Please try again.");
    } finally {
      setInviteSubmitting(false);
    }
  };

  const copyCredentials = () => {
    if (!createdUser) return;
    const text = `Medixa Hospital System Credentials:\nName: ${createdUser.name}\nEmail: ${createdUser.email}\nPassword: ${createdUser.pass}\nRole: ${createdUser.role}\nDepartment: ${createdUser.dept}`;
    void navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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
          <div className="flex items-center gap-3 shrink-0">
            <Link
              to="/users/new"
              className="hidden sm:inline-flex items-center gap-1.5 rounded-xl border border-border px-3.5 py-2.5 text-[12.5px] font-semibold text-muted-foreground hover:text-foreground hover:bg-surface-muted transition-colors"
            >
              <ExternalLink className="size-3.5" /> Full form
            </Link>
            <button
              type="button"
              onClick={() => {
                setInviteModalOpen(true);
                setCreatedUser(null);
                setInviteError(null);
              }}
              className="inline-flex shrink-0 items-center gap-2 rounded-xl gradient-primary px-4 py-2.5 text-[13px] font-semibold text-white shadow-glow transition-transform hover:-translate-y-0.5"
            >
              <UserPlus className="size-4" /> Invite member
            </button>
          </div>
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

      {/* Invite Member Modal with Password Creation */}
      {inviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-xl max-h-[92vh] overflow-y-auto rounded-3xl border border-border bg-surface p-6 sm:p-7 shadow-float rise-in">
            <button
              type="button"
              onClick={() => setInviteModalOpen(false)}
              className="absolute right-5 top-5 grid size-8 place-items-center rounded-xl text-muted-foreground hover:bg-surface-muted hover:text-foreground transition-colors"
            >
              <X className="size-4" />
            </button>

            {createdUser ? (
              <div className="space-y-6 py-2">
                <div className="flex items-start gap-4">
                  <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-success/15 text-success">
                    <Check className="size-6" />
                  </span>
                  <div>
                    <h3 className="text-xl font-bold text-foreground">User Enrolled Successfully</h3>
                    <p className="mt-1 text-[13px] text-muted-foreground">
                      The account is created in the Medixa directory. Share these credentials with the team member.
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl border border-border bg-surface-muted p-5 space-y-3.5">
                  <div className="flex items-center justify-between pb-3 border-b border-border">
                    <span className="text-[12px] font-medium text-muted-foreground">Full Name</span>
                    <span className="text-[13px] font-semibold text-foreground">{createdUser.name}</span>
                  </div>
                  <div className="flex items-center justify-between pb-3 border-b border-border">
                    <span className="text-[12px] font-medium text-muted-foreground">Work Email</span>
                    <span className="text-[13px] font-semibold text-foreground">{createdUser.email}</span>
                  </div>
                  <div className="flex items-center justify-between pb-3 border-b border-border">
                    <span className="text-[12px] font-medium text-muted-foreground">Role</span>
                    <span className="text-[13px] font-semibold text-primary">{createdUser.role}</span>
                  </div>
                  <div className="flex items-center justify-between pb-3 border-b border-border">
                    <span className="text-[12px] font-medium text-muted-foreground">Department</span>
                    <span className="text-[13px] font-semibold text-foreground">{createdUser.dept}</span>
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[12px] font-medium text-muted-foreground">Login Password</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[13px] font-bold text-foreground px-2 py-0.5 rounded bg-surface border border-border">
                        {createdUser.pass}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 pt-2">
                  <button
                    type="button"
                    onClick={copyCredentials}
                    className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2.5 text-[13px] font-semibold text-foreground hover:bg-surface-muted transition-colors"
                  >
                    {copied ? <Check className="size-4 text-success" /> : <Copy className="size-4" />}
                    {copied ? "Copied to clipboard!" : "Copy credentials"}
                  </button>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setCreatedUser(null);
                        setInviteError(null);
                      }}
                      className="rounded-xl border border-border px-4 py-2.5 text-[13px] font-semibold text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Add another
                    </button>
                    <button
                      type="button"
                      onClick={() => setInviteModalOpen(false)}
                      className="rounded-xl gradient-primary px-5 py-2.5 text-[13px] font-semibold text-white shadow-glow transition-transform hover:-translate-y-0.5"
                    >
                      Done
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <form onSubmit={handleInviteSubmit} className="space-y-5">
                <div className="flex items-start gap-3.5">
                  <span className="grid size-10 shrink-0 place-items-center rounded-2xl gradient-primary text-white shadow-glow">
                    <UserPlus className="size-5" />
                  </span>
                  <div>
                    <h3 className="text-lg font-bold text-foreground">Invite Workspace Member</h3>
                    <p className="mt-0.5 text-[12.5px] text-muted-foreground">
                      Fill out user details and set initial login password.
                    </p>
                  </div>
                </div>

                {inviteError && (
                  <div className="rounded-xl bg-danger/10 border border-danger/20 p-3 text-[12.5px] font-medium text-danger">
                    {inviteError}
                  </div>
                )}

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-[12px] font-semibold text-foreground block">
                      Full name <span className="text-danger">*</span>
                    </label>
                    <input
                      required
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder="e.g. Emilia Greene"
                      className="mt-1.5 w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-[13px] outline-none transition-all placeholder:text-muted-foreground focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="text-[12px] font-semibold text-foreground block">
                      Work email <span className="text-danger">*</span>
                    </label>
                    <input
                      required
                      type="email"
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                      placeholder="emilia.greene@medixa.health"
                      className="mt-1.5 w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-[13px] outline-none transition-all placeholder:text-muted-foreground focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="text-[12px] font-semibold text-foreground block">
                      Role <span className="text-danger">*</span>
                    </label>
                    <select
                      value={formRole}
                      onChange={(e) => setFormRole(e.target.value)}
                      className="mt-1.5 w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-[13px] outline-none transition-all focus:border-primary"
                    >
                      <option value="Administrator">Administrator (Full Access)</option>
                      <option value="Biomedical Lead">Biomedical Lead</option>
                      <option value="Engineer">Biomedical Engineer</option>
                      <option value="Technician">Technician</option>
                      <option value="Specialist">Specialist / Department Staff</option>
                      <option value="Auditor">Auditor (Compliance)</option>
                      <option value="Procurement">Procurement</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[12px] font-semibold text-foreground block">
                      Department <span className="text-danger">*</span>
                    </label>
                    <select
                      value={formDept || deptOptions[0] || ""}
                      onChange={(e) => setFormDept(e.target.value)}
                      className="mt-1.5 w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-[13px] outline-none transition-all focus:border-primary"
                    >
                      {deptOptions.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Create Password Field */}
                  <div className="sm:col-span-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[12px] font-semibold text-foreground">
                        Create Password <span className="text-danger">*</span>
                      </label>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setFormPassword("Medixa#2026")}
                          className="text-[11px] font-medium text-muted-foreground hover:text-primary transition-colors underline"
                        >
                          Use Medixa#2026
                        </button>
                        <span className="text-muted-foreground/40 text-[10px]">·</span>
                        <button
                          type="button"
                          onClick={handleGenerateRandomPassword}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline transition-colors"
                        >
                          <Sparkles className="size-3" /> Generate random
                        </button>
                      </div>
                    </div>
                    <div className="relative mt-1.5">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={formPassword}
                        onChange={(e) => setFormPassword(e.target.value)}
                        placeholder="Min. 6 characters (defaults to Medixa#2026 if blank)"
                        className="w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 pr-10 text-[13px] outline-none transition-all placeholder:text-muted-foreground focus:border-primary"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        title={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>
                    <p className="mt-1.5 text-[11px] text-muted-foreground">
                      Initial password for staff authentication. Must be at least 6 characters (e.g. Medixa#2026).
                    </p>
                  </div>

                  <div>
                    <label className="text-[12px] font-semibold text-foreground block">
                      Primary shift
                    </label>
                    <select
                      value={formShift}
                      onChange={(e) => setFormShift(e.target.value)}
                      className="mt-1.5 w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-[13px] outline-none transition-all focus:border-primary"
                    >
                      <option value="Morning">Morning (07:00 – 15:30)</option>
                      <option value="Evening">Evening (15:00 – 23:30)</option>
                      <option value="Night">Night (23:00 – 07:30)</option>
                      <option value="Rotating">Rotating Schedule</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[12px] font-semibold text-foreground block">
                      Access notes (optional)
                    </label>
                    <input
                      value={formNotes}
                      onChange={(e) => setFormNotes(e.target.value)}
                      placeholder="e.g. Authorized for ICU equipment"
                      className="mt-1.5 w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-[13px] outline-none transition-all placeholder:text-muted-foreground focus:border-primary"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border">
                  <Link
                    to="/users/new"
                    className="inline-flex items-center gap-1.5 text-[12px] font-medium text-muted-foreground hover:text-primary transition-colors"
                  >
                    <ExternalLink className="size-3.5" /> Open dedicated register page
                  </Link>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setInviteModalOpen(false)}
                      className="rounded-xl border border-border px-4 py-2.5 text-[13px] font-semibold text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={inviteSubmitting}
                      className="inline-flex items-center gap-2 rounded-xl gradient-primary px-5 py-2.5 text-[13px] font-semibold text-white shadow-glow transition-transform hover:-translate-y-0.5 disabled:opacity-70"
                    >
                      {inviteSubmitting ? (
                        <>
                          <Loader2 className="size-4 animate-spin" /> Enrolling…
                        </>
                      ) : (
                        <>
                          <UserPlus className="size-4" /> Create user account
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
