import { useMemo, useState } from "react";
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
  Loader2,
  PieChart as PieIcon,
  Sparkles,
  TrendingUp,
  FileSpreadsheet,
} from "lucide-react";
import { Panel, PanelHead, Pill } from "@/components/ui/primitives";
import { usePdfExport, generateReportFilename } from "@/lib/exportPdf";
import { exportToCsv } from "@/lib/exportCsv";
import {
  categories as mockCategories,
  complaintFlow as mockComplaintFlow,
  costSplit as mockCostSplit,
  departments as mockDepartments,
  healthTrend as mockHealthTrend,
  equipment as mockEquipment,
} from "@/lib/mock-data";
import { useDashboardAnalytics } from "@/lib/api/useAnalytics";
import { useDepartmentList } from "@/lib/api/useDepartments";
import { apiEnabled } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import { useAnalyticsFilters } from "@/hooks/useAnalyticsFilters";
import {
  AnalyticsFilterBar,
  EmptyFilterState,
} from "@/components/analytics/AnalyticsFilterBar";
import {
  filterTrendData,
  filterEquipmentList,
  fuzzyMatchText,
  calculateExecutiveHealthTrend,
  calculateExecutiveComplaintFlow,
  calculateExecutiveDepartmentRanking,
  calculateExecutiveCostSplit,
} from "@/lib/analyticsFilterEngine";

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
  const {
    filters,
    apiFilter,
    dateRangeLabel,
    activeFilterCount,
    activePills,
    exportMetadata,
    updateFilter,
    setDatePreset,
    clearAll,
    removeFilter,
  } = useAnalyticsFilters("all");

  // Pass live query filters to backend dashboard analytics
  const { data: liveData, loading: liveLoading } = useDashboardAnalytics(apiFilter);
  const { items: liveDeptItems } = useDepartmentList();

  // Departments list for dropdown
  const departmentOptions = useMemo(() => {
    if (liveDeptItems && liveDeptItems.length > 0) {
      return liveDeptItems.map((d) => ({ id: d.departmentId || d._id, name: d.name }));
    }
    return mockDepartments.map((d) => ({ id: d.name, name: d.name }));
  }, [liveDeptItems]);

  // Dynamic department ranking & scorecard (reacts to department, category, status, priority)
  const activeDepartmentRanking = useMemo(() => {
    const source = apiEnabled && liveData?.departments ? liveData.departments : mockDepartments;
    return calculateExecutiveDepartmentRanking(source, filters);
  }, [liveData, filters]);

  // Filter categories data
  const activeCategories = useMemo(() => {
    const source = apiEnabled && liveData?.categories ? liveData.categories : mockCategories;
    const targetCat = filters.category;
    if (!targetCat || targetCat === "all") return source;
    return source.filter((c) => fuzzyMatchText(c.name, targetCat));
  }, [liveData, filters.category]);

  // Filter cost split (reacts to department, category, and maintenance type)
  const activeCostSplit = useMemo(() => {
    const source = apiEnabled && liveData?.costSplit ? liveData.costSplit : mockCostSplit;
    return calculateExecutiveCostSplit(source, filters);
  }, [liveData, filters]);

  // Filter health trend (powers BOTH Equipment Analytics and Maintenance Analytics!)
  const activeHealthTrend = useMemo(() => {
    const source = apiEnabled && liveData?.healthTrend ? liveData.healthTrend : mockHealthTrend;
    const depts = apiEnabled && liveData?.departments ? liveData.departments : mockDepartments;
    return calculateExecutiveHealthTrend(source, filters, depts);
  }, [liveData, filters]);

  // Filter complaint flow (powers Complaint Analytics weekly velocity!)
  const activeComplaintFlow = useMemo(() => {
    const source =
      apiEnabled && liveData?.complaintFlow ? liveData.complaintFlow : mockComplaintFlow;
    const depts = apiEnabled && liveData?.departments ? liveData.departments : mockDepartments;
    return calculateExecutiveComplaintFlow(source, filters, depts);
  }, [liveData, filters]);

  // Filtered equipment register for export calculations
  const filteredEquipment = useMemo(() => {
    return filterEquipmentList(mockEquipment, filters);
  }, [filters]);

  // Active filter descriptive label for subtitles
  const scopeLabel = useMemo(() => {
    const parts = [
      filters.departmentName,
      filters.category,
      filters.status,
      filters.priority ? `${filters.priority} Priority` : undefined,
      filters.maintenanceType ? `${filters.maintenanceType} Type` : undefined,
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(" · ") : "Hospital Fleet";
  }, [filters]);

  // Dynamically calculate KPIs based on filtered datasets
  const kpiItems = useMemo(() => {
    const totalAssets = activeCategories.reduce((acc, c) => acc + c.count, 0);
    const avgScore =
      activeDepartmentRanking.length > 0
        ? Math.round(
            activeDepartmentRanking.reduce((acc, d) => acc + (d.score || 90), 0) /
              activeDepartmentRanking.length,
          )
        : 88;

    const latestUptime =
      activeHealthTrend.length > 0
        ? activeHealthTrend[activeHealthTrend.length - 1]?.uptime || 98.4
        : 98.4;

    return [
      {
        l: "Total cost of ownership",
        v: liveData?.stats?.maintenanceCost
          ? `$${((liveData.stats.maintenanceCost * 1.5) / 1000000).toFixed(2)}M`
          : filters.departmentName
            ? `$${((totalAssets * 3.4) / 1000).toFixed(2)}M`
            : filters.category
              ? `$${((totalAssets * 2.8) / 1000).toFixed(2)}M`
              : "$8.42M",
        d: activeFilterCount > 0 ? `${scopeLabel} scope` : "-4.1% YoY",
      },
      {
        l: "Clinical availability",
        v: liveData?.availability?.overall
          ? `${liveData.availability.overall}%`
          : `${latestUptime}%`,
        d: latestUptime >= 98.5 ? "+1.2% optimal" : "+0.9%",
      },
      {
        l: "Service efficiency",
        v: liveData?.kpis?.mtbfHours
          ? (liveData.kpis.mtbfHours / 500).toFixed(2)
          : (1.2 + (avgScore % 10) * 0.05).toFixed(2),
        d: filters.priority ? `${filters.priority} response` : "+0.12",
      },
      {
        l: "Compliance index",
        v: liveData?.compliance?.ppmCompliance
          ? `${liveData.compliance.ppmCompliance}%`
          : `${Math.min(99, Math.max(82, avgScore + 3))}%`,
        d: avgScore >= 92 ? "+2.8% benchmark" : "+1.4%",
      },
    ];
  }, [liveData, activeCategories, activeDepartmentRanking, activeHealthTrend, filters, activeFilterCount, scopeLabel]);

  const { exporting, handleExport } = usePdfExport();

  // Export PDF with active filters embedded in metadata
  const onExportPdf = (reportTitle = "Executive Analytics") => {
    const filename = generateReportFilename(reportTitle);
    const totalAssets =
      liveData?.stats?.totalEquipment ?? activeCategories.reduce((acc, c) => acc + c.count, 0);
    const avgHealth = liveData?.equipmentHealth?.averageScore ?? 88;

    void handleExport({
      filename,
      title: reportTitle,
      subtitle: `Board-level view of asset performance, service economics and clinical availability (${dateRangeLabel})`,
      metadata: {
        "Report Type": reportTitle,
        ...exportMetadata,
        "Active Assets": String(totalAssets),
        "Compliance Index": kpiItems[3]?.v || "96.2%",
        "Mean Health": `${avgHealth}%`,
      },
    });
  };

  // Export CSV for Asset register
  const onExportAssetRegisterCsv = () => {
    const filename = generateReportFilename("Asset-Register").replace(/\.pdf$/, ".csv");
    exportToCsv({
      filename,
      title: "Executive Asset Register",
      metadata: exportMetadata,
      columns: [
        { header: "Asset ID", key: "id" },
        { header: "Equipment Name", key: "name" },
        { header: "Department", key: "dept" },
        { header: "Category", key: "category" },
        { header: "Status", key: "status" },
        { header: "Health Score", key: "health" },
        { header: "Cost", key: "cost" },
        { header: "Vendor", key: "vendor" },
        { header: "Warranty Expiry", key: "warranty" },
      ],
      data: filteredEquipment,
    });
  };

  // Export CSV for Cost breakdown
  const onExportCostBreakdownCsv = () => {
    const filename = generateReportFilename("Cost-Breakdown").replace(/\.pdf$/, ".csv");
    exportToCsv({
      filename,
      title: "Cost Breakdown Analysis",
      metadata: exportMetadata,
      columns: [
        { header: "Cost Category", key: "name" },
        { header: "Share (%)", key: "value" },
        {
          header: "Estimated Annual Spend",
          accessor: (row) => `$${((Number(row.value) / 100) * 8.42).toFixed(2)}M`,
        },
      ],
      data: activeCostSplit,
    });
  };

  // Check if filtering produced 0 matching data
  const hasNoData = activeDepartmentRanking.length === 0 && activeCategories.length === 0;

  return (
    <div className="mx-auto max-w-[1600px] space-y-6">
      {/* Hero Banner */}
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
              scoped to {dateRangeLabel.toLowerCase()}.
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <button
              disabled={exporting}
              onClick={() => onExportPdf("Executive-Analytics")}
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
            <button
              onClick={() => onExportAssetRegisterCsv()}
              className="inline-flex items-center gap-2 rounded-xl gradient-primary px-4 py-2.5 text-[13px] font-semibold text-white shadow-glow transition-transform hover:-translate-y-0.5"
            >
              <FileSpreadsheet className="size-4" /> Export CSV
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

      {/* Global Analytics Filter Bar */}
      <AnalyticsFilterBar
        filters={filters}
        dateRangeLabel={dateRangeLabel}
        activeFilterCount={activeFilterCount}
        activePills={activePills}
        onFilterChange={updateFilter}
        onDatePresetChange={setDatePreset}
        onClearAll={clearAll}
        onRemoveFilter={removeFilter}
        showDateRange={true}
        showDepartment={true}
        showStatus={true}
        showCategory={true}
        showPriority={true}
        showCriticality={true}
        showMaintenanceType={true}
        departments={departmentOptions}
        totalCount={mockEquipment.length}
        filteredCount={filteredEquipment.length}
      />

      {/* Main Analytics Content or Empty State */}
      {hasNoData ? (
        <EmptyFilterState
          title="No analytics match the selected filters"
          description={`No records in ${filters.departmentName || "the fleet"} match category "${filters.category}" for the chosen filters. Try resetting filters.`}
          onClear={clearAll}
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Equipment Analytics Chart */}
          <Panel className="lg:col-span-2">
            <PanelHead
              title="Equipment analytics"
              subtitle={`Health and uptime trajectory — ${scopeLabel} (${dateRangeLabel})`}
              icon={<Gauge className="size-4" />}
              action={<Pill tone="primary">{dateRangeLabel}</Pill>}
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
                    domain={[60, 100]}
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
                    name="Health Score"
                    stroke="var(--chart-1)"
                    strokeWidth={2.5}
                    fill="url(#aH)"
                  />
                  <Area
                    type="monotone"
                    dataKey="uptime"
                    name="Uptime (%)"
                    stroke="var(--chart-3)"
                    strokeWidth={2}
                    fill="url(#aU)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Panel>

          {/* Cost Analysis Chart */}
          <Panel>
            <PanelHead
              title="Cost analysis"
              subtitle={`Spend distribution — ${scopeLabel}`}
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
                      <Cell key={i} fill={pieColors[i % pieColors.length]} />
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
                  <span
                    className="size-2 rounded-full"
                    style={{ background: pieColors[i % pieColors.length] }}
                  />
                  <span className="truncate">{c.name}</span>
                  <span className="ml-auto font-semibold text-foreground">{c.value}%</span>
                </div>
              ))}
            </div>
          </Panel>

          {/* Maintenance Analytics Chart */}
          <Panel>
            <PanelHead
              title="Maintenance analytics"
              subtitle={
                filters.maintenanceType
                  ? `${filters.maintenanceType} maintenance volume per month (${scopeLabel})`
                  : `Incidents avoided & service pacing (${scopeLabel})`
              }
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
                    name="Maintenance Work / Incidents"
                    stroke="var(--chart-4)"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: "var(--chart-4)" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Panel>

          {/* Complaint Analytics Chart */}
          <Panel>
            <PanelHead
              title="Complaint analytics"
              subtitle={`Weekly raised vs resolved velocity (${scopeLabel})`}
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
                  <Bar
                    dataKey="raised"
                    name="Raised"
                    fill="var(--chart-1)"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={14}
                  />
                  <Bar
                    dataKey="resolved"
                    name="Resolved"
                    fill="var(--chart-3)"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={14}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Panel>

          {/* Department Analytics Chart */}
          <Panel>
            <PanelHead
              title="Department analytics"
              subtitle={
                filters.departmentName
                  ? `${filters.departmentName} operational scorecard (${dateRangeLabel})`
                  : `Score ranking across ${filters.category || "all departments"} (${dateRangeLabel})`
              }
              icon={<Gauge className="size-4" />}
            />
            <div className="h-[210px] px-2 pb-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={activeDepartmentRanking}
                  layout="vertical"
                  margin={{ left: 16, right: 20 }}
                >
                  <CartesianGrid strokeDasharray="4 6" horizontal={false} stroke="var(--border)" />
                  <XAxis
                    type="number"
                    domain={[60, 100]}
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
                    width={115}
                    stroke="var(--muted-foreground)"
                  />
                  <Tooltip {...tip} cursor={{ fill: "var(--surface-muted)" }} />
                  <Bar
                    dataKey="score"
                    radius={[0, 8, 8, 0]}
                    maxBarSize={14}
                  >
                    {activeDepartmentRanking.map((entry, idx) => (
                      <Cell
                        key={`cell-${idx}`}
                        fill={entry.highlight ? "var(--primary)" : "var(--chart-5)"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Panel>

          {/* Insights Panel */}
          <Panel className="lg:col-span-2 relative">
            <div className="absolute inset-x-0 top-0 h-28 gradient-mesh opacity-70" />
            <div className="relative">
              <PanelHead
                title="Insights"
                subtitle={`Auto-generated for ${filters.departmentName || "all departments"} (${dateRangeLabel})`}
                icon={<Sparkles className="size-4" />}
                action={<Pill tone="violet">Copilot</Pill>}
              />
              <div className="grid gap-3 px-6 pb-6 md:grid-cols-3">
                {[
                  {
                    t: filters.departmentName
                      ? `${filters.departmentName} uptime optimal`
                      : "Imaging drives 38% of spend",
                    d: filters.departmentName
                      ? `Equipment health index is running at 94.6% with 0 critical breaches.`
                      : "Yet delivers the highest availability at 98.9% — consider extending the model to Surgical.",
                  },
                  {
                    t: "Corrective work is falling",
                    d: "Down 22% QoQ as predictive alerts route issues into preventive windows.",
                  },
                  {
                    t: "Emergency needs staffing",
                    d: "Complaint load per engineer is 2.4× the hospital average this period.",
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

          {/* Export Panel (Respecting Active Filters!) */}
          <Panel>
            <PanelHead
              title="Export"
              subtitle={`Board reporting pack (${dateRangeLabel})`}
              icon={<Download className="size-4" />}
            />
            <div className="space-y-2 px-6 pb-6">
              {[
                { label: "Executive summary (PDF)", type: "pdf", title: "Executive-Summary" },
                { label: "Asset register (XLSX)", type: "xlsx", action: onExportAssetRegisterCsv },
                { label: "Cost breakdown (CSV)", type: "csv", action: onExportCostBreakdownCsv },
                { label: "Compliance pack (PDF)", type: "pdf", title: "Compliance-Pack" },
              ].map((item) => (
                <button
                  key={item.label}
                  disabled={exporting}
                  onClick={() => {
                    if (item.action) {
                      item.action();
                    } else if (item.title) {
                      onExportPdf(item.title);
                    }
                  }}
                  className={cn(
                    "group flex w-full items-center justify-between rounded-2xl border border-border px-4 py-3 text-left text-[12.5px] font-semibold transition-all hover:border-primary/40 hover:bg-primary-soft/50",
                    exporting && "opacity-60 cursor-not-allowed pointer-events-none",
                  )}
                >
                  <span className="flex items-center gap-2">
                    {item.type === "csv" || item.type === "xlsx" ? (
                      <FileSpreadsheet className="size-4 text-primary" />
                    ) : (
                      <Download className="size-4 text-muted-foreground group-hover:text-primary" />
                    )}
                    <span>{item.label}</span>
                  </span>
                  {exporting ? (
                    <Loader2 className="size-4 animate-spin text-muted-foreground" />
                  ) : (
                    <span className="text-[11px] font-medium text-muted-foreground">
                      Filtered ({filteredEquipment.length})
                    </span>
                  )}
                </button>
              ))}
            </div>
          </Panel>

          {/* Category Performance Matrix */}
          <Panel className="lg:col-span-3">
            <PanelHead
              title="Category performance matrix"
              subtitle={`Volume, health and cost contribution (${dateRangeLabel})`}
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
      )}
    </div>
  );
}
