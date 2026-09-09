import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
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
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowUpRight,
  Download,
  Gauge,
  PieChart as PieIcon,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { Panel, PanelHead, Pill } from "@/components/ui/primitives";
import {
  categories as mockCategories,
  complaintFlow as mockComplaintFlow,
  costSplit as mockCostSplit,
  departments as mockDepartments,
  healthTrend as mockHealthTrend,
} from "@/lib/mock-data";
import { useDashboardAnalytics } from "@/lib/api/useAnalytics";
import { apiEnabled } from "@/lib/api/client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/analytics")({
  head: () => ({
    meta: [
      { title: "Executive Analytics — Medixa" },
      {
        name: "description",
        content:
          "Executive analytics across equipment, maintenance, complaints, departments and cost.",
      },
      { property: "og:title", content: "Executive Analytics — Medixa" },
      {
        property: "og:description",
        content: "Board-ready hospital asset analytics with exportable insights.",
      },
    ],
  }),
  component: Analytics,
});

const tip = {
  contentStyle: {
    borderRadius: 14,
    fontSize: 12,
    border: "1px solid var(--border)",
    boxShadow: "var(--shadow-float)",
  },
};
const pieColors = ["var(--chart-1)", "var(--chart-5)", "var(--chart-2)", "var(--chart-4)"];

function Analytics() {
  const { data: liveData } = useDashboardAnalytics();

  const activeHealthTrend =
    apiEnabled && liveData?.healthTrend ? liveData.healthTrend : mockHealthTrend;
  const activeCostSplit = apiEnabled && liveData?.costSplit ? liveData.costSplit : mockCostSplit;
  const activeComplaintFlow =
    apiEnabled && liveData?.complaintFlow ? liveData.complaintFlow : mockComplaintFlow;
  const activeDepartments =
    apiEnabled && liveData?.departments ? liveData.departments : mockDepartments;
  const activeCategories =
    apiEnabled && liveData?.categories ? liveData.categories : mockCategories;

  const kpiItems = [
    {
      l: "Total cost of ownership",
      v: liveData
        ? `$${(liveData.stats?.maintenanceCost ? (liveData.stats.maintenanceCost * 1.5) / 1000000 : 8.42).toFixed(2)}M`
        : "$8.42M",
      d: "-4.1% YoY",
    },
    {
      l: "Clinical availability",
      v: liveData ? `${liveData.availability?.overall || 98.4}%` : "98.4%",
      d: "+0.9%",
    },
    {
      l: "Service efficiency",
      v: liveData
        ? liveData.kpis?.mtbfHours
          ? (liveData.kpis.mtbfHours / 500).toFixed(2)
          : "1.34"
        : "1.34",
      d: "+0.12",
    },
    {
      l: "Compliance index",
      v: liveData ? `${liveData.compliance?.ppmCompliance || 96.2}%` : "96.2%",
      d: "+2.4",
    },
  ];

  return (
    <div className="mx-auto max-w-[1600px] space-y-6">
      <section className="relative overflow-hidden rounded-[28px] border border-border bg-surface p-8 shadow-float rise-in">
        <div className="absolute inset-0 gradient-mesh" />
        <div className="relative grid grid-cols-[minmax(0,1fr)_auto] items-end gap-6">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
              Analytics
            </p>
            <h1 className="mt-2 text-[32px] font-bold leading-tight">Executive Analytics</h1>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              Board-level view of asset performance, service economics and clinical availability —
              updated hourly.
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <button className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2.5 text-[13px] font-semibold shadow-xs transition-all hover:-translate-y-0.5 hover:shadow-soft">
              <Download className="size-4" /> Export PDF
            </button>
            <button className="inline-flex items-center gap-2 rounded-xl gradient-primary px-4 py-2.5 text-[13px] font-semibold text-white shadow-glow transition-transform hover:-translate-y-0.5">
              <Sparkles className="size-4" /> Generate summary
            </button>
          </div>
        </div>
        <div className="relative mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {kpiItems.map((k) => (
            <div key={k.l} className="glass-card hover-lift p-5">
              <p className="text-[11.5px] text-muted-foreground">{k.l}</p>
              <p className="mt-2 text-[24px] font-bold leading-none tabular-nums">{k.v}</p>
              <p className="mt-2 inline-flex items-center gap-1 text-[11.5px] font-semibold text-success">
                <TrendingUp className="size-3.5" /> {k.d}
              </p>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <Panel className="lg:col-span-2">
          <PanelHead
            title="Equipment analytics"
            subtitle="Health and uptime trajectory"
            icon={<Gauge className="size-4" />}
            action={<Pill tone="primary">8 months</Pill>}
          />
          <div className="h-[280px] px-2 pb-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={activeHealthTrend}
                margin={{ top: 10, right: 24, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="aH" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.32} />
                    <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="aU" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--chart-3)" stopOpacity={0.24} />
                    <stop offset="100%" stopColor="var(--chart-3)" stopOpacity={0} />
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
                <Tooltip {...tip} />
                <Area
                  type="monotone"
                  dataKey="health"
                  stroke="var(--chart-1)"
                  strokeWidth={2.5}
                  fill="url(#aH)"
                />
                <Area
                  type="monotone"
                  dataKey="uptime"
                  stroke="var(--chart-3)"
                  strokeWidth={2}
                  fill="url(#aU)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel>
          <PanelHead
            title="Cost analysis"
            subtitle="Spend distribution"
            icon={<PieIcon className="size-4" />}
          />
          <div className="h-[210px] px-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={activeCostSplit}
                  dataKey="value"
                  innerRadius={52}
                  outerRadius={80}
                  paddingAngle={4}
                  stroke="none"
                >
                  {activeCostSplit.map((_, i) => (
                    <Cell key={i} fill={pieColors[i]} />
                  ))}
                </Pie>
                <Tooltip {...tip} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-2 px-6 pb-6">
            {activeCostSplit.map((c, i) => (
              <div
                key={c.name}
                className="flex items-center gap-2 text-[11.5px] text-muted-foreground"
              >
                <span className="size-2 rounded-full" style={{ background: pieColors[i] }} />
                {c.name} <span className="ml-auto font-semibold text-foreground">{c.value}%</span>
              </div>
            ))}
          </div>
        </Panel>

        <Panel>
          <PanelHead
            title="Maintenance analytics"
            subtitle="Incidents avoided per month"
            icon={<TrendingUp className="size-4" />}
          />
          <div className="h-[210px] px-2 pb-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={activeHealthTrend} margin={{ top: 10, right: 20, left: 0 }}>
                <CartesianGrid strokeDasharray="4 6" vertical={false} stroke="var(--border)" />
                <XAxis
                  dataKey="month"
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
                <Tooltip {...tip} />
                <Line
                  type="monotone"
                  dataKey="incidents"
                  stroke="var(--chart-4)"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: "var(--chart-4)" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel>
          <PanelHead
            title="Complaint analytics"
            subtitle="Weekly raised vs resolved"
            icon={<TrendingUp className="size-4" />}
          />
          <div className="h-[210px] px-2 pb-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={activeComplaintFlow} barGap={5}>
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
                <Tooltip {...tip} cursor={{ fill: "var(--surface-muted)" }} />
                <Bar dataKey="raised" fill="var(--chart-1)" radius={[6, 6, 0, 0]} maxBarSize={14} />
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
            title="Department analytics"
            subtitle="Score ranking"
            icon={<Gauge className="size-4" />}
          />
          <div className="h-[210px] px-2 pb-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={activeDepartments} layout="vertical" margin={{ left: 16, right: 20 }}>
                <CartesianGrid strokeDasharray="4 6" horizontal={false} stroke="var(--border)" />
                <XAxis
                  type="number"
                  domain={[70, 100]}
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
                  fontSize={10.5}
                  width={96}
                  stroke="var(--muted-foreground)"
                />
                <Tooltip {...tip} cursor={{ fill: "var(--surface-muted)" }} />
                <Bar dataKey="score" fill="var(--chart-5)" radius={[0, 8, 8, 0]} maxBarSize={14} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel className="lg:col-span-2 relative">
          <div className="absolute inset-x-0 top-0 h-28 gradient-mesh opacity-70" />
          <div className="relative">
            <PanelHead
              title="Insights"
              subtitle="Auto-generated from this quarter"
              icon={<Sparkles className="size-4" />}
              action={<Pill tone="violet">Copilot</Pill>}
            />
            <div className="grid gap-3 px-6 pb-6 md:grid-cols-3">
              {[
                {
                  t: "Imaging drives 38% of spend",
                  d: "Yet delivers the highest availability at 98.9% — consider extending the model to Surgical.",
                },
                {
                  t: "Corrective work is falling",
                  d: "Down 22% QoQ as predictive alerts route issues into preventive windows.",
                },
                {
                  t: "Emergency needs staffing",
                  d: "Complaint load per engineer is 2.4× the hospital average this quarter.",
                },
              ].map((i) => (
                <div key={i.t} className="glass-card hover-lift p-5">
                  <p className="text-[13px] font-semibold">{i.t}</p>
                  <p className="mt-1.5 text-[12px] leading-relaxed text-muted-foreground">{i.d}</p>
                  <button className="mt-4 inline-flex items-center gap-1 text-[12px] font-semibold text-primary">
                    Open analysis <ArrowUpRight className="size-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </Panel>

        <Panel>
          <PanelHead
            title="Export"
            subtitle="Board reporting pack"
            icon={<Download className="size-4" />}
          />
          <div className="space-y-2 px-6 pb-6">
            {[
              "Executive summary (PDF)",
              "Asset register (XLSX)",
              "Cost breakdown (CSV)",
              "Compliance pack (PDF)",
            ].map((f) => (
              <button
                key={f}
                className={cn(
                  "group flex w-full items-center justify-between rounded-2xl border border-border px-4 py-3 text-left text-[12.5px] font-semibold transition-all hover:border-primary/40 hover:bg-primary-soft/50",
                )}
              >
                {f}
                <Download className="size-4 text-muted-foreground group-hover:text-primary" />
              </button>
            ))}
          </div>
        </Panel>

        <Panel className="lg:col-span-3">
          <PanelHead
            title="Category performance matrix"
            subtitle="Volume, health and cost contribution"
            icon={<Gauge className="size-4" />}
          />
          <div className="grid gap-3 px-6 pb-7 sm:grid-cols-2 xl:grid-cols-5">
            {activeCategories.map((c) => (
              <div
                key={c.name}
                className="rounded-2xl border border-border p-5 transition-all hover:-translate-y-0.5 hover:shadow-soft"
              >
                <span
                  className="block size-8 rounded-xl"
                  style={{ background: c.color, opacity: 0.2 }}
                />
                <p className="mt-4 text-[13px] font-semibold">{c.name}</p>
                <p className="mt-1 text-[22px] font-bold leading-none tabular-nums">{c.count}</p>
                <p className="mt-2 text-[11.5px] text-muted-foreground">Health {c.health}%</p>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}
