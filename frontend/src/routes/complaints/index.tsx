import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  CircleAlert,
  Clock,
  Filter,
  Image as ImageIcon,
  Loader2,
  MessageSquare,
  Plus,
  Search,
  ShieldCheck,
  UserCheck,
} from "lucide-react";
import { Meter, Panel, PanelHead, Pill, Ring } from "@/components/ui/primitives";
import { complaintFlow, complaints as fallbackComplaints, engineers } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { useComplaintList } from "@/lib/api/useComplaints";
import { apiEnabled } from "@/lib/api/client";

export const Route = createFileRoute("/complaints/")({
  head: () => ({
    meta: [
      { title: "Complaint Workspace — Medixa" },
      {
        name: "description",
        content: "Triage, assign and resolve hospital equipment complaints with SLA tracking.",
      },
      { property: "og:title", content: "Complaint Workspace — Medixa" },
      {
        property: "og:description",
        content: "Jira-grade ticket workspace for biomedical engineering teams.",
      },
    ],
  }),
  component: ComplaintWorkspace,
});

const tone = (p: string): "danger" | "warning" | "primary" | "neutral" =>
  p === "Critical" || p === "CRITICAL"
    ? "danger"
    : p === "High" || p === "HIGH"
      ? "warning"
      : p === "Medium" || p === "MEDIUM"
        ? "primary"
        : "neutral";

function ComplaintWorkspace() {
  const [statusFilter, setStatusFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const {
    items: liveComplaints,
    loading: listLoading,
    total,
  } = useComplaintList(
    apiEnabled
      ? statusFilter === "All"
        ? { limit: 100 }
        : { status: statusFilter.toUpperCase().replace(/ /g, "_"), limit: 100 }
      : { limit: 0 },
  );

  // Display: live if API on, else static mock
  const displayComplaints = useMemo(() => {
    const raw = apiEnabled ? (liveComplaints ?? []) : fallbackComplaints;
    if (!searchQuery) return raw;
    const q = searchQuery.toLowerCase();
    return raw.filter((c) => {
      const title = (c.title ?? "").toLowerCase();
      const id = (
        (c as { complaintId?: string }).complaintId ??
        (c as { id?: string }).id ??
        ""
      ).toLowerCase();
      return title.includes(q) || id.includes(q);
    });
  }, [liveComplaints, searchQuery]);

  const active = displayComplaints[0];

  return (
    <div className="mx-auto max-w-[1600px] space-y-6">
      <section className="relative overflow-hidden rounded-[28px] border border-border bg-surface p-8 shadow-float rise-in">
        <div className="absolute inset-0 gradient-mesh" />
        <div className="relative grid grid-cols-[minmax(0,1fr)_auto] items-end gap-6">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
              Operations
            </p>
            <h1 className="mt-2 text-[32px] font-bold leading-tight">Complaint Workspace</h1>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              {apiEnabled && total != null
                ? total + " active tickets"
                : "37 active tickets · 4 breaching SLA · median first response 42 minutes."}
            </p>
          </div>
          <Link
            to="/complaints/new"
            className="inline-flex shrink-0 items-center gap-2 rounded-xl gradient-primary px-4 py-2.5 text-[13px] font-semibold text-white shadow-glow transition-transform hover:-translate-y-0.5"
          >
            <Plus className="size-4" /> New complaint
          </Link>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <Panel>
            <div className="grid gap-0 md:grid-cols-[minmax(0,1fr)_220px]">
              <div className="p-7">
                {active ? (
                  <>
                    <div className="flex flex-wrap items-center gap-2">
                      <Pill tone={tone(active.priority)}>{active.priority}</Pill>
                      <Pill tone="primary">{active.status}</Pill>
                      <span className="text-[11.5px] font-semibold tabular-nums text-muted-foreground">
                        {(active as { complaintId?: string; id?: string }).complaintId ??
                          (active as { id?: string }).id ??
                          ""}
                      </span>
                    </div>
                    <h2 className="mt-4 text-[22px] font-bold leading-snug">{active.title}</h2>
                    <p className="mt-2 text-[13px] text-muted-foreground">
                      {typeof (active as { equipmentId?: unknown }).equipmentId === "object"
                        ? (active as { equipmentId: { name?: string } }).equipmentId?.name
                        : ((active as { equipment?: string }).equipment ?? "")}{" "}
                      ·{" "}
                      {typeof (active as { departmentId?: unknown }).departmentId === "object"
                        ? (active as { departmentId: { name?: string } }).departmentId?.name
                        : ((active as { dept?: string }).dept ?? "")}
                    </p>
                    <div className="mt-6 grid gap-4 sm:grid-cols-3">
                      {[
                        {
                          l: "Assigned to",
                          v:
                            typeof (active as { engineerId?: unknown }).engineerId === "object"
                              ? ((active as unknown as { engineerId: { name?: string } }).engineerId
                                  ?.name ?? "Unassigned")
                              : ((active as { assignee?: string }).assignee ?? "Unassigned"),
                        },
                        { l: "Priority", v: active.priority },
                        { l: "Status", v: active.status },
                      ].map((f) => (
                        <div key={f.l} className="rounded-2xl bg-surface-muted/70 p-4">
                          <p className="text-[11px] text-muted-foreground">{f.l}</p>
                          <p className="mt-1 truncate text-[12.5px] font-semibold">{f.v}</p>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-center py-8 text-muted-foreground">
                    <Loader2 className="mr-2 size-4 animate-spin" /> Loading…
                  </div>
                )}
              </div>
              <div className="grid place-items-center border-t border-border p-7 md:border-l md:border-t-0">
                <Ring
                  value={(active as { sla?: number })?.sla ?? 0}
                  size={110}
                  label={((active as { sla?: number })?.sla ?? 0) + "%"}
                  sub="SLA used"
                />
              </div>
            </div>
          </Panel>

          <div className="grid gap-6 md:grid-cols-2">
            <Panel>
              <PanelHead
                title="Timeline"
                subtitle="Ticket lifecycle"
                icon={<Clock className="size-4" />}
              />
              <ol className="relative space-y-5 px-7 pb-7">
                <span className="absolute left-[35px] top-2 bottom-8 w-px bg-border" />
                {[
                  { t: "Reported by radiology", d: "04:12", tone: "primary" },
                  { t: "Auto-triaged as critical", d: "04:13", tone: "danger" },
                  { t: "Assigned to Anita Raghavan", d: "04:31", tone: "violet" },
                  { t: "On-site diagnosis started", d: "05:50", tone: "warning" },
                ].map((e) => (
                  <li key={e.t} className="relative flex gap-4">
                    <span
                      className={cn(
                        "relative z-10 mt-1 size-3 shrink-0 rounded-full ring-4",
                        e.tone === "danger"
                          ? "bg-danger ring-danger-soft"
                          : e.tone === "warning"
                            ? "bg-warning ring-warning-soft"
                            : e.tone === "violet"
                              ? "bg-violet ring-violet-soft"
                              : "bg-primary ring-primary-soft",
                      )}
                    />
                    <div className="min-w-0">
                      <p className="text-[12.5px] font-semibold">{e.t}</p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">{e.d}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </Panel>

            <Panel>
              <PanelHead
                title="Engineer assignment"
                subtitle="Suggested by workload"
                icon={<UserCheck className="size-4" />}
              />
              <div className="space-y-3 px-6 pb-6">
                {engineers.slice(0, 3).map((e) => (
                  <div
                    key={e.name}
                    className="flex items-center gap-3 rounded-2xl border border-border p-3.5 transition-colors hover:bg-surface-muted"
                  >
                    <span className="grid size-9 shrink-0 place-items-center rounded-xl gradient-primary text-[11px] font-bold text-white">
                      {e.avatar}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12.5px] font-semibold">{e.name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {e.zone} · {e.open} open
                      </p>
                    </div>
                    <span className="shrink-0 text-[11.5px] font-semibold tabular-nums text-muted-foreground">
                      {e.load}%
                    </span>
                  </div>
                ))}
              </div>
            </Panel>
          </div>

          <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
            <Panel>
              <PanelHead
                title="Photos"
                subtitle="3 attachments"
                icon={<ImageIcon className="size-4" />}
              />
              <div className="grid grid-cols-3 gap-2 px-6 pb-6">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="grid aspect-square place-items-center rounded-2xl border border-border bg-surface-muted text-muted-foreground transition-transform hover:scale-[1.03]"
                  >
                    <ImageIcon className="size-5" />
                  </div>
                ))}
              </div>
            </Panel>
            <Panel>
              <PanelHead
                title="Comments"
                subtitle="4 messages"
                icon={<MessageSquare className="size-4" />}
              />
              <div className="space-y-4 px-7 pb-7">
                {[
                  {
                    n: "Anita Raghavan",
                    m: "Coil temperature spikes after 40 min of continuous scanning. Ordering replacement sensor.",
                  },
                  {
                    n: "Dr. L. Fontaine",
                    m: "We have shifted afternoon scans to Suite 3 in the meantime.",
                  },
                ].map((c) => (
                  <div key={c.n} className="flex gap-3">
                    <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-surface-muted text-[10.5px] font-bold">
                      {c.n
                        .split(" ")
                        .map((x) => x[0])
                        .join("")}
                    </span>
                    <div className="min-w-0 rounded-2xl bg-surface-muted/70 px-4 py-3">
                      <p className="text-[12px] font-semibold">{c.n}</p>
                      <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">
                        {c.m}
                      </p>
                    </div>
                  </div>
                ))}
                <input
                  placeholder="Write a comment…"
                  className="w-full rounded-2xl border border-border px-4 py-3 text-[12.5px] outline-none transition-colors placeholder:text-muted-foreground focus:border-primary/50"
                />
              </div>
            </Panel>
          </div>

          <Panel interactive={false}>
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-7 pt-6">
              <div className="min-w-0">
                <h2 className="text-[15px] font-semibold">Ticket queue</h2>
                <p className="mt-0.5 text-[13px] text-muted-foreground">
                  Compact list · sorted by SLA risk
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <div className="h-9 flex items-center gap-2 rounded-xl border border-border px-3 text-[12.5px] text-muted-foreground">
                  <Search className="size-3.5" />
                  <input
                    type="text"
                    placeholder="Search tickets…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-28 sm:w-36 bg-transparent outline-none text-foreground placeholder:text-muted-foreground text-[12px]"
                  />
                </div>
                <Link
                  to="/complaints/list"
                  className="inline-flex h-9 items-center gap-2 rounded-xl border border-border px-3 text-[12.5px] font-semibold transition-colors hover:bg-surface-muted"
                >
                  <Filter className="size-3.5" /> Full Register
                </Link>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 px-7 py-4">
              {["All", "Critical", "Escalated", "In Progress", "Triage", "Resolved"].map((t, i) => (
                <button
                  key={t}
                  onClick={() => setStatusFilter(t)}
                  className={cn(
                    "rounded-full px-3.5 py-1.5 text-[12px] font-semibold transition-colors",
                    statusFilter === t || (i === 0 && statusFilter === "All")
                      ? "bg-primary-soft text-primary"
                      : "bg-surface-muted text-muted-foreground hover:text-foreground",
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
            <ul className="border-t border-border">
              {listLoading && (
                <li className="flex items-center justify-center py-8 text-muted-foreground">
                  <Loader2 className="mr-2 size-4 animate-spin" /> Loading tickets…
                </li>
              )}
              {displayComplaints.map((c) => {
                const id =
                  (c as { _id?: string; id?: string })._id ?? (c as { id?: string }).id ?? "";
                const cId =
                  (c as { complaintId?: string }).complaintId ?? (c as { id?: string }).id ?? id;
                const equipName =
                  typeof (c as { equipmentId?: unknown }).equipmentId === "object"
                    ? ((c as { equipmentId: { name?: string } }).equipmentId?.name ?? "")
                    : String((c as { equipment?: string }).equipment ?? "");
                const deptName =
                  typeof (c as { departmentId?: unknown }).departmentId === "object"
                    ? ((c as { departmentId: { name?: string } }).departmentId?.name ?? "")
                    : String((c as { dept?: string }).dept ?? "");
                const assigneeName =
                  typeof (c as { engineerId?: unknown }).engineerId === "object"
                    ? ((c as unknown as { engineerId: { name?: string } }).engineerId?.name ??
                      "Unassigned")
                    : String((c as { assignee?: string }).assignee ?? "Unassigned");
                return (
                  <li
                    key={id}
                    className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-b border-border px-7 py-4 transition-colors last:border-0 hover:bg-surface-muted/70"
                  >
                    <Link to="/complaints/$id" params={{ id: cId }} className="block min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-semibold tabular-nums text-muted-foreground">
                          {cId}
                        </span>
                        <Pill tone={tone(c.priority)}>{c.priority}</Pill>
                        <span className="text-[11px] text-muted-foreground">{c.status}</span>
                      </div>
                      <p className="mt-1.5 truncate text-[13px] font-semibold hover:text-primary">
                        {c.title}
                      </p>
                      <p className="mt-0.5 truncate text-[11.5px] text-muted-foreground">
                        {equipName} · {deptName} · {assigneeName}
                      </p>
                    </Link>
                    <div className="flex shrink-0 items-center gap-4">
                      <span className="w-10 text-right text-[11.5px] font-semibold tabular-nums text-muted-foreground">
                        {(c as { age?: string }).age ?? "—"}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel>
            <PanelHead
              title="Resolution"
              subtitle="Close-out checklist"
              icon={<ShieldCheck className="size-4" />}
            />
            <div className="space-y-2.5 px-6 pb-6">
              {[
                { l: "Root cause identified", done: true },
                { l: "Spare part ordered", done: true },
                { l: "Repair executed", done: false },
                { l: "Safety re-test", done: false },
                { l: "Requester sign-off", done: false },
              ].map((s) => (
                <div
                  key={s.l}
                  className="flex items-center gap-3 rounded-2xl border border-border px-4 py-3"
                >
                  <span
                    className={cn(
                      "grid size-5 shrink-0 place-items-center rounded-md border text-[10px] font-bold",
                      s.done
                        ? "border-success bg-success text-white"
                        : "border-border text-transparent",
                    )}
                  >
                    ✓
                  </span>
                  <span
                    className={cn(
                      "truncate text-[12.5px]",
                      s.done ? "text-muted-foreground line-through" : "font-medium",
                    )}
                  >
                    {s.l}
                  </span>
                </div>
              ))}
            </div>
          </Panel>

          <Panel>
            <PanelHead
              title="Complaint analytics"
              subtitle="Raised vs resolved this week"
              icon={<CircleAlert className="size-4" />}
            />
            <div className="h-[210px] px-2 pb-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={complaintFlow} barGap={5}>
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
                    width={26}
                    stroke="var(--muted-foreground)"
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 14,
                      fontSize: 12,
                      border: "1px solid var(--border)",
                    }}
                    cursor={{ fill: "var(--surface-muted)" }}
                  />
                  <Bar
                    dataKey="raised"
                    fill="var(--chart-1)"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={14}
                  />
                  <Bar
                    dataKey="resolved"
                    fill="var(--chart-3)"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={14}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Panel>

          <Panel>
            <PanelHead
              title="Recent complaints"
              subtitle="Closed in the last 24h"
              icon={<Clock className="size-4" />}
            />
            <ul className="space-y-1 px-4 pb-5">
              {displayComplaints.slice(0, 4).map((c) => {
                const cId =
                  (c as { complaintId?: string }).complaintId ??
                  (c as { id?: string }).id ??
                  (c as { _id?: string })._id ??
                  "";
                const assignee =
                  typeof (c as { engineerId?: unknown }).engineerId === "object"
                    ? ((c as unknown as { engineerId: { name?: string } }).engineerId?.name ??
                      "Unassigned")
                    : String((c as { assignee?: string }).assignee ?? "Unassigned");
                return (
                  <li
                    key={cId}
                    className="rounded-2xl px-3 py-2.5 transition-colors hover:bg-surface-muted"
                  >
                    <Link to="/complaints/$id" params={{ id: cId }}>
                      <p className="truncate text-[12.5px] font-medium hover:text-primary">
                        {c.title}
                      </p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        {cId} · {assignee}
                      </p>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </Panel>
        </div>
      </div>
    </div>
  );
}
