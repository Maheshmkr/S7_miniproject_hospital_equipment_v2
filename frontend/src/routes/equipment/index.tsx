import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowUpRight,
  Boxes,
  CircleAlert,
  Cpu,
  Download,
  Filter,
  LayoutGrid,
  Loader2,
  Plus,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Wrench,
} from "lucide-react";
import { Meter, Panel, PanelHead, Pill, Ring } from "@/components/ui/primitives";
import {
  categories as fallbackCategories,
  equipment as fallbackEquipment,
  healthTrend,
  maintenance,
  statusTone,
  warranties,
} from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { WorkflowStrip } from "@/components/workflow/pages";
import { useEquipmentList } from "@/lib/api/useEquipment";
import { usePdfExport, generateReportFilename } from "@/lib/exportPdf";
import { departmentName } from "@/lib/api/equipmentRecords";

export const Route = createFileRoute("/equipment/")({
  head: () => ({
    meta: [
      { title: "Equipment Workspace — Medixa" },
      {
        name: "description",
        content:
          "Monitor hospital equipment health, categories, lifecycle timeline and maintenance history.",
      },
      { property: "og:title", content: "Equipment Workspace — Medixa" },
      {
        property: "og:description",
        content: "Widget-based workspace for hospital equipment intelligence.",
      },
    ],
  }),
  component: EquipmentWorkspace,
});

const chartTip = {
  contentStyle: {
    borderRadius: 14,
    border: "1px solid var(--border)",
    boxShadow: "var(--shadow-float)",
    fontSize: 12,
  },
};

function EquipmentWorkspace() {
  const live = useEquipmentList({ limit: 100 });
  const [selectedCategory, setSelectedCategory] = useState("All assets");
  const [searchTerm, setSearchTerm] = useState("");

  const equipmentRows = useMemo(() => {
    if (!live.enabled || !live.items || live.items.length === 0) {
      return fallbackEquipment;
    }
    return live.items.map((e) => {
      const operational = e.status === "ACTIVE" || e.status === "OPERATIONAL";
      const critical = e.status === "UNDER_BREAKDOWN" || e.status === "OUT_OF_SERVICE";
      const statusKey = critical ? "critical" : operational ? "operational" : "maintenance";
      return {
        id: e.equipmentId,
        name: e.name,
        category: e.category,
        dept: departmentName(e.departmentId),
        status: statusKey,
        health: e.healthScore ?? 100,
        warranty: e.warrantyExpiry
          ? new Date(e.warrantyExpiry).toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })
          : "—",
        cost: e.cost || "—",
      };
    });
  }, [live.enabled, live.items]);

  const filteredRows = useMemo(() => {
    return equipmentRows.filter((e) => {
      const matchCat =
        selectedCategory === "All assets" ||
        e.category.toLowerCase() === selectedCategory.toLowerCase();
      const matchSearch =
        !searchTerm ||
        e.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.dept.toLowerCase().includes(searchTerm.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [equipmentRows, selectedCategory, searchTerm]);

  const stats = useMemo(() => {
    if (!live.enabled || !live.items || live.items.length === 0) {
      return [
        { l: "Total assets", v: "2,486", s: "+62 this quarter", i: Boxes },
        { l: "Operational", v: "2,318", s: "93.2% of fleet", i: Cpu },
        { l: "Under service", v: "128", s: "42 preventive", i: Wrench },
        { l: "Critical", v: "40", s: "9 need escalation", i: CircleAlert },
      ];
    }
    const total = live.items.length;
    const op = live.items.filter((e) => e.status === "ACTIVE" || e.status === "OPERATIONAL").length;
    const maint = live.items.filter(
      (e) =>
        e.status === "UNDER_MAINTENANCE" ||
        e.status === "AWAITING_PARTS" ||
        e.status === "UNDER_VERIFICATION",
    ).length;
    const crit = live.items.filter(
      (e) => e.status === "UNDER_BREAKDOWN" || e.status === "OUT_OF_SERVICE",
    ).length;

    return [
      { l: "Total assets", v: String(total), s: "Registered assets", i: Boxes },
      {
        l: "Operational",
        v: String(op),
        s: `${Math.round((op / (total || 1)) * 100)}% of fleet`,
        i: Cpu,
      },
      { l: "Under service", v: String(maint), s: "In maintenance", i: Wrench },
      { l: "Critical", v: String(crit), s: "Needs attention", i: CircleAlert },
    ];
  }, [live.enabled, live.items]);

  const categoryBreakdown = useMemo(() => {
    if (!live.enabled || !live.items || live.items.length === 0) {
      return fallbackCategories;
    }
    const catMap = new Map<string, { count: number; totalHealth: number }>();
    for (const item of live.items) {
      const cat = item.category || "General";
      const curr = catMap.get(cat) ?? { count: 0, totalHealth: 0 };
      curr.count += 1;
      curr.totalHealth += item.healthScore ?? 100;
      catMap.set(cat, curr);
    }
    const colors = [
      "var(--chart-1)",
      "var(--chart-2)",
      "var(--chart-3)",
      "var(--chart-4)",
      "var(--chart-5)",
    ];
    let idx = 0;
    return Array.from(catMap.entries()).map(([name, data]) => ({
      name,
      count: data.count,
      health: Math.round(data.totalHealth / data.count),
      color: colors[idx++ % colors.length],
    }));
  }, [live.enabled, live.items]);

  const { exporting, handleExport } = usePdfExport();

  const onExport = () => {
    const filename = generateReportFilename("Equipment-Workspace");
    void handleExport({
      filename,
      title: "Equipment Workspace",
      subtitle: `${equipmentRows.length} registered assets, monitored in real time with predictive health scoring.`,
      metadata: {
        "Total Assets": String(equipmentRows.length),
        Operational: String(stats[0]?.v ?? "—"),
        Maintenance: String(stats[1]?.v ?? "—"),
        Critical: String(stats[2]?.v ?? "—"),
      },
    });
  };

  return (
    <div className="mx-auto max-w-[1600px] space-y-6">
      <section className="relative overflow-hidden rounded-[28px] border border-border bg-surface p-8 shadow-float rise-in lg:p-10">
        <div className="absolute inset-0 gradient-mesh" />
        <div className="relative grid grid-cols-[minmax(0,1fr)_auto] items-end gap-6">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
              Assets
            </p>
            <h1 className="mt-2 text-[32px] font-bold leading-tight">Equipment Workspace</h1>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              {equipmentRows.length} registered assets, monitored in real time with predictive
              health scoring.
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <button
              disabled={exporting}
              onClick={onExport}
              className={cn(
                "inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2.5 text-[13px] font-semibold shadow-xs transition-all",
                exporting
                  ? "opacity-60 cursor-not-allowed pointer-events-none"
                  : "hover:-translate-y-0.5 hover:shadow-soft",
              )}
            >
              {exporting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Download className="size-4" />
              )}
              {exporting ? "Exporting..." : "Export PDF"}
            </button>
            <Link
              to="/equipment/list"
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2.5 text-[13px] font-semibold shadow-xs transition-all hover:-translate-y-0.5 hover:shadow-soft"
            >
              <Download className="size-4" /> View register
            </Link>
            <Link
              to="/equipment/new"
              className="inline-flex items-center gap-2 rounded-xl gradient-primary px-4 py-2.5 text-[13px] font-semibold text-white shadow-glow transition-transform hover:-translate-y-0.5"
            >
              <Plus className="size-4" /> Register asset
            </Link>
          </div>
        </div>
        <div className="relative mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((k) => (
            <div key={k.l} className="glass-card hover-lift flex items-center gap-4 p-5">
              <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary-soft text-primary">
                <k.i className="size-5" />
              </span>
              <div className="min-w-0">
                <p className="text-[22px] font-bold leading-none tabular-nums">{k.v}</p>
                <p className="mt-1 truncate text-[11.5px] text-muted-foreground">
                  {k.l} · {k.s}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <WorkflowStrip moduleKey="equipment" />

      <div className="grid gap-6 lg:grid-cols-3">
        <Panel className="lg:col-span-2">
          <PanelHead
            title="Equipment health"
            subtitle="Composite condition index over time"
            icon={<Cpu className="size-4" />}
          />
          <div className="h-[230px] px-2 pb-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={healthTrend} margin={{ top: 10, right: 24, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="eqH" x1="0" y1="0" x2="0" y2="1">
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
                  domain={[85, 100]}
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
                  strokeWidth={2.5}
                  fill="url(#eqH)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel>
          <PanelHead
            title="Equipment status"
            subtitle="Live distribution"
            icon={<LayoutGrid className="size-4" />}
          />
          <div className="flex items-center gap-6 px-7 pb-7">
            <Ring value={93} size={104} sub="Healthy" />
            <div className="min-w-0 flex-1 space-y-3">
              {[
                { l: "Operational", v: stats[1]?.v ?? "2318", t: "success" },
                { l: "In service", v: stats[2]?.v ?? "128", t: "warning" },
                { l: "Critical", v: stats[3]?.v ?? "40", t: "danger" },
              ].map((s) => (
                <div key={s.l}>
                  <div className="flex justify-between text-[12px]">
                    <span className="text-muted-foreground">{s.l}</span>
                    <span className="font-semibold tabular-nums">{s.v}</span>
                  </div>
                  <div className="mt-1.5">
                    <Meter
                      value={Math.min(100, (Number(s.v) / Math.max(1, equipmentRows.length)) * 100)}
                      tone={s.t as never}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Panel>

        <Panel className="lg:col-span-2">
          <PanelHead
            title="Equipment categories"
            subtitle="Fleet composition and category health"
            icon={<Boxes className="size-4" />}
          />
          <div className="grid gap-3 px-6 pb-6 sm:grid-cols-2 xl:grid-cols-3">
            {categoryBreakdown.map((c) => (
              <div
                key={c.name}
                className="group rounded-2xl border border-border p-5 transition-all hover:-translate-y-0.5 hover:shadow-soft"
              >
                <div className="flex items-start justify-between">
                  <span
                    className="size-9 rounded-xl"
                    style={{ background: c.color, opacity: 0.18 }}
                  />
                  <Pill tone={c.health >= 93 ? "success" : "warning"}>{c.health}%</Pill>
                </div>
                <p className="mt-4 text-[13.5px] font-semibold">{c.name}</p>
                <p className="mt-0.5 text-[11.5px] text-muted-foreground">{c.count} assets</p>
                <div className="mt-3">
                  <Meter value={c.health} tone={c.health >= 93 ? "success" : "warning"} />
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel>
          <PanelHead
            title="Quick actions"
            subtitle="Asset operations"
            icon={<SlidersHorizontal className="size-4" />}
          />
          <div className="space-y-2 px-6 pb-6">
            {[
              "Bulk import assets",
              "Print QR labels",
              "Schedule calibration",
              "Flag for decommission",
            ].map((a) => (
              <button
                key={a}
                className="group flex w-full items-center justify-between rounded-2xl border border-border px-4 py-3 text-left text-[12.5px] font-semibold transition-all hover:border-primary/40 hover:bg-primary-soft/50"
              >
                {a}
                <ArrowUpRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
              </button>
            ))}
          </div>
        </Panel>

        <Panel>
          <PanelHead
            title="Recent equipment"
            subtitle="Latest registrations"
            icon={<Plus className="size-4" />}
          />
          <ul className="space-y-1 px-4 pb-5">
            {equipmentRows.slice(0, 4).map((e) => (
              <li key={e.id}>
                <Link
                  to="/equipment/$id"
                  params={{ id: e.id }}
                  className="flex items-center gap-3 rounded-2xl px-3 py-3 transition-colors hover:bg-surface-muted"
                >
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-surface-muted text-primary">
                    <Cpu className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12.5px] font-semibold">{e.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {e.id} · {e.dept}
                    </p>
                  </div>
                  <Pill tone={e.health >= 88 ? "success" : e.health >= 70 ? "warning" : "danger"}>
                    {e.health}
                  </Pill>
                </Link>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel>
          <PanelHead
            title="Equipment timeline"
            subtitle="Lifecycle events this week"
            icon={<Wrench className="size-4" />}
          />
          <ol className="relative space-y-5 px-7 pb-7">
            <span className="absolute left-[38px] top-1 bottom-8 w-px bg-border" />
            {maintenance.slice(0, 4).map((m) => (
              <li key={m.id} className="relative flex gap-4">
                <span className="relative z-10 mt-1 size-2.5 shrink-0 rounded-full bg-primary ring-4 ring-primary-soft" />
                <div className="min-w-0">
                  <p className="truncate text-[12.5px] font-semibold">{m.task}</p>
                  <p className="mt-0.5 truncate text-[11.5px] text-muted-foreground">
                    {m.equipment} · {m.time}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </Panel>

        <Panel>
          <PanelHead
            title="Warranty summary"
            subtitle="Coverage by vendor"
            icon={<ShieldCheck className="size-4" />}
          />
          <div className="space-y-3.5 px-6 pb-6">
            {warranties.slice(0, 4).map((w) => (
              <div key={w.id}>
                <div className="flex justify-between text-[12px]">
                  <span className="truncate font-medium">{w.vendor}</span>
                  <span className="shrink-0 font-semibold tabular-nums text-muted-foreground">
                    {w.coverage}%
                  </span>
                </div>
                <div className="mt-1.5">
                  <Meter
                    value={w.coverage}
                    tone={w.coverage > 85 ? "success" : w.coverage > 60 ? "warning" : "danger"}
                  />
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel className="lg:col-span-2">
          <PanelHead
            title="Equipment analytics"
            subtitle="Downtime hours by category"
            icon={<Filter className="size-4" />}
          />
          <div className="h-[220px] px-2 pb-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryBreakdown} layout="vertical" margin={{ left: 24, right: 24 }}>
                <CartesianGrid strokeDasharray="4 6" horizontal={false} stroke="var(--border)" />
                <XAxis
                  type="number"
                  tickLine={false}
                  axisLine={false}
                  fontSize={11}
                  stroke="var(--muted-foreground)"
                />
                <YAxis
                  dataKey="name"
                  type="category"
                  tickLine={false}
                  axisLine={false}
                  fontSize={11}
                  width={90}
                  stroke="var(--muted-foreground)"
                />
                <Tooltip {...chartTip} cursor={{ fill: "var(--surface-muted)" }} />
                <Bar dataKey="count" fill="var(--chart-1)" radius={[0, 8, 8, 0]} maxBarSize={18} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel>
          <PanelHead
            title="Maintenance history"
            subtitle="Last 30 days"
            icon={<Wrench className="size-4" />}
          />
          <div className="space-y-3 px-6 pb-6">
            {[
              { l: "Preventive completed", v: 142, t: "success" },
              { l: "Corrective completed", v: 68, t: "primary" },
              { l: "Calibrations", v: 34, t: "warning" },
              { l: "Escalated", v: 7, t: "danger" },
            ].map((r) => (
              <div
                key={r.l}
                className="flex items-center gap-3 rounded-2xl bg-surface-muted/70 px-4 py-3"
              >
                <span className="min-w-0 flex-1 truncate text-[12.5px] font-medium">{r.l}</span>
                <Pill tone={r.t as never}>{r.v}</Pill>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <Panel interactive={false}>
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-6 pt-6 sm:px-7">
          <div className="min-w-0">
            <h2 className="text-[15px] font-semibold">Asset register</h2>
            <p className="mt-0.5 text-[13px] text-muted-foreground">
              {filteredRows.length} of {equipmentRows.length} assets shown
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <div className="h-9 flex items-center gap-2 rounded-xl border border-border px-3 text-[12.5px] text-muted-foreground">
              <Search className="size-3.5" />
              <input
                type="text"
                placeholder="Filter assets…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-28 sm:w-44 bg-transparent outline-none text-foreground placeholder:text-muted-foreground text-[12px]"
              />
            </div>
            <Link
              to="/equipment/list"
              className="inline-flex h-9 items-center gap-2 rounded-xl border border-border px-3 text-[12.5px] font-semibold transition-colors hover:bg-surface-muted"
            >
              <Filter className="size-3.5" /> Full Register
            </Link>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 px-6 py-4 sm:px-7">
          {["All assets", "Imaging", "Life Support", "Surgical", "Diagnostics", "Monitoring"].map(
            (t) => (
              <button
                key={t}
                onClick={() => setSelectedCategory(t)}
                className={cn(
                  "rounded-full px-3.5 py-1.5 text-[12px] font-semibold transition-colors",
                  selectedCategory === t
                    ? "bg-primary-soft text-primary"
                    : "bg-surface-muted text-muted-foreground hover:text-foreground",
                )}
              >
                {t}
              </button>
            ),
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] border-collapse text-left">
            <thead>
              <tr className="border-y border-border bg-surface-muted/60 text-[11px] uppercase tracking-wider text-muted-foreground">
                {["Asset", "Category", "Department", "Health", "Status", "Warranty", "Value"].map(
                  (h) => (
                    <th key={h} className="px-6 py-3 font-semibold">
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((e) => {
                const tone =
                  statusTone[e.status as keyof typeof statusTone] ?? statusTone.operational;
                return (
                  <tr
                    key={e.id}
                    className="border-b border-border transition-colors last:border-0 hover:bg-surface-muted/70"
                  >
                    <td className="px-6 py-4">
                      <Link to="/equipment/$id" params={{ id: e.id }} className="block min-w-0">
                        <p className="truncate text-[13px] font-semibold hover:text-primary">
                          {e.name}
                        </p>
                        <p className="text-[11px] tabular-nums text-muted-foreground">{e.id}</p>
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-[12.5px] text-muted-foreground">{e.category}</td>
                    <td className="px-6 py-4 text-[12.5px] text-muted-foreground">{e.dept}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-16">
                          <Meter
                            value={e.health}
                            tone={
                              e.health >= 88 ? "success" : e.health >= 70 ? "warning" : "danger"
                            }
                          />
                        </div>
                        <span className="text-[12px] font-semibold tabular-nums">{e.health}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Pill className={tone.cls}>{tone.label}</Pill>
                    </td>
                    <td className="px-6 py-4 text-[12.5px] tabular-nums text-muted-foreground">
                      {e.warranty}
                    </td>
                    <td className="px-6 py-4 text-[12.5px] font-semibold tabular-nums">{e.cost}</td>
                  </tr>
                );
              })}
              {filteredRows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-sm text-muted-foreground">
                    No equipment matching your filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
