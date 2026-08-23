import { useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Bar,
  BarChart,
  CartesianGrid,
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
  Activity,
  Building2,
  CircleAlert,
  Cpu,
  Plus,
  TrendingUp,
  Users,
  Wrench,
} from "lucide-react";
import { Meter, Panel, PanelHead, Pill, Ring } from "@/components/ui/primitives";
import { activities, departments as fallbackDepartments, radarData } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { useDepartmentList } from "@/lib/api/useDepartments";

export const Route = createFileRoute("/departments/")({
  head: () => ({
    meta: [
      { title: "Department Workspace — Medixa" },
      {
        name: "description",
        content:
          "Compare hospital department health, equipment load, complaints and staffing performance.",
      },
      { property: "og:title", content: "Department Workspace — Medixa" },
      {
        property: "og:description",
        content: "Department-level operational intelligence for hospital leadership.",
      },
    ],
  }),
  component: DepartmentWorkspace,
});

function DepartmentWorkspace() {
  const live = useDepartmentList();

  const deptCards = useMemo(() => {
    if (!live.enabled || !live.items || live.items.length === 0) {
      return fallbackDepartments;
    }
    return live.items.map((d, index) => {
      const fallback = fallbackDepartments.find(
        (f) =>
          f.name.toLowerCase() === d.name.toLowerCase() ||
          d.name.toLowerCase().includes(f.name.toLowerCase()),
      );
      return {
        id: d.code || d._id,
        name: d.name,
        assets: fallback?.assets ?? 300 + index * 40,
        uptime: fallback?.uptime ?? 98.5 + (index % 3) * 0.4,
        complaints: fallback?.complaints ?? 2 + (index % 5),
        staff: fallback?.staff ?? 35 + index * 8,
        score: fallback?.score ?? 90 + (index % 8),
        spend: fallback?.spend ?? 25 + index * 5,
      };
    });
  }, [live.enabled, live.items]);

  return (
    <div className="mx-auto max-w-[1600px] space-y-6">
      <section className="relative overflow-hidden rounded-[28px] border border-border bg-surface p-8 shadow-float rise-in">
        <div className="absolute inset-0 gradient-mesh" />
        <div className="relative grid grid-cols-[minmax(0,1fr)_auto] items-end gap-6">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
              Management
            </p>
            <h1 className="mt-2 text-[32px] font-bold leading-tight">Department Workspace</h1>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              {deptCards.length} clinical departments · Live asset load, uptime and personnel
              tracking.
            </p>
          </div>
          <Link
            to="/departments/new"
            className="inline-flex shrink-0 items-center gap-2 rounded-xl gradient-primary px-4 py-2.5 text-[13px] font-semibold text-white shadow-glow transition-transform hover:-translate-y-0.5"
          >
            <Plus className="size-4" /> Add Department
          </Link>
        </div>
      </section>

      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
        {deptCards.map((d) => (
          <Panel key={d.name}>
            <div className="p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid size-11 shrink-0 place-items-center rounded-2xl gradient-primary text-white">
                    <Building2 className="size-5" />
                  </span>
                  <div className="min-w-0">
                    <Link
                      to={`/departments/${d.id || d.name.toLowerCase()}` as never}
                      className="truncate text-[14px] font-semibold hover:text-primary transition-colors block"
                    >
                      {d.name}
                    </Link>
                    <p className="text-[11.5px] text-muted-foreground">{d.staff} staff members</p>
                  </div>
                </div>
                <Ring value={d.score} size={58} />
              </div>
              <div className="mt-5 grid grid-cols-3 gap-2 text-center">
                {[
                  { l: "Assets", v: d.assets, i: Cpu },
                  { l: "Open", v: d.complaints, i: CircleAlert },
                  { l: "Uptime", v: `${d.uptime}%`, i: Wrench },
                ].map((s) => (
                  <div key={s.l} className="rounded-2xl bg-surface-muted/70 py-3">
                    <s.i className="mx-auto size-3.5 text-muted-foreground" />
                    <p className="mt-1.5 text-[15px] font-bold tabular-nums">{s.v}</p>
                    <p className="text-[10.5px] text-muted-foreground">{s.l}</p>
                  </div>
                ))}
              </div>
              <div className="mt-5">
                <div className="flex justify-between text-[11.5px]">
                  <span className="text-muted-foreground">Performance</span>
                  <span className="font-semibold tabular-nums">{d.score}/100</span>
                </div>
                <div className="mt-1.5">
                  <Meter
                    value={d.score}
                    tone={d.score >= 92 ? "success" : d.score >= 86 ? "primary" : "warning"}
                  />
                </div>
              </div>
            </div>
          </Panel>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Panel className="lg:col-span-2">
          <PanelHead
            title="Department analytics"
            subtitle="Assets vs monthly spend ($K)"
            icon={<TrendingUp className="size-4" />}
            action={
              <Link to="/departments/list" className="text-[12px] font-semibold text-primary">
                View register
              </Link>
            }
          />
          <div className="h-[260px] px-2 pb-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={deptCards} barGap={6}>
                <CartesianGrid strokeDasharray="4 6" vertical={false} stroke="var(--border)" />
                <XAxis
                  dataKey="name"
                  tickLine={false}
                  axisLine={false}
                  fontSize={10.5}
                  stroke="var(--muted-foreground)"
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  fontSize={11}
                  width={34}
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
                <Bar dataKey="assets" fill="var(--chart-1)" radius={[6, 6, 0, 0]} maxBarSize={18} />
                <Bar dataKey="spend" fill="var(--chart-4)" radius={[6, 6, 0, 0]} maxBarSize={18} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel>
          <PanelHead
            title="Department health"
            subtitle="Balanced scorecard"
            icon={<Activity className="size-4" />}
          />
          <div className="h-[240px] px-2 pb-4">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} outerRadius={82}>
                <PolarGrid stroke="var(--border)" />
                <PolarAngleAxis dataKey="axis" fontSize={10.5} stroke="var(--muted-foreground)" />
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
            title="Staff distribution"
            subtitle="Headcount by department"
            icon={<Users className="size-4" />}
          />
          <div className="space-y-3.5 px-6 pb-6">
            {deptCards.map((d) => (
              <div key={d.name}>
                <div className="flex justify-between text-[12px]">
                  <span className="truncate">{d.name}</span>
                  <span className="shrink-0 font-semibold tabular-nums">{d.staff}</span>
                </div>
                <div className="mt-1.5">
                  <Meter value={(d.staff / 80) * 100} />
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel>
          <PanelHead
            title="Complaint load"
            subtitle="Open tickets per department"
            icon={<CircleAlert className="size-4" />}
          />
          <ul className="space-y-2 px-6 pb-6">
            {deptCards.map((d) => (
              <li
                key={d.name}
                className="flex items-center justify-between gap-3 rounded-2xl border border-border px-4 py-3"
              >
                <span className="min-w-0 truncate text-[12.5px] font-medium">{d.name}</span>
                <Pill tone={d.complaints > 8 ? "danger" : d.complaints > 4 ? "warning" : "success"}>
                  {d.complaints} open
                </Pill>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel>
          <PanelHead
            title="Recent activity"
            subtitle="Across departments"
            icon={<Activity className="size-4" />}
          />
          <ul className="space-y-4 px-7 pb-7">
            {activities.slice(0, 5).map((a) => (
              <li key={a.what} className="flex gap-3">
                <span
                  className={cn(
                    "mt-1.5 size-2 shrink-0 rounded-full",
                    a.tone === "success"
                      ? "bg-success"
                      : a.tone === "danger"
                        ? "bg-danger"
                        : a.tone === "warning"
                          ? "bg-warning"
                          : a.tone === "violet"
                            ? "bg-violet"
                            : "bg-primary",
                  )}
                />
                <p className="text-[12.5px] leading-relaxed text-muted-foreground">
                  <span className="font-semibold text-foreground">{a.who}</span> {a.what}
                  <span className="mt-0.5 block text-[11px] text-muted-foreground/80">
                    {a.when}
                  </span>
                </p>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  );
}
