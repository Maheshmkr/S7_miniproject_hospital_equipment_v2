import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Clock,
  Gauge,
  Loader2,
  Plus,
  Users,
  Wrench,
} from "lucide-react";
import { Meter, Panel, PanelHead, Pill, Ring } from "@/components/ui/primitives";
import {
  engineers,
  equipment,
  healthTrend,
  maintenance as fallbackMaintenance,
} from "@/lib/mock-data";
import { useWorkOrderList } from "@/lib/api/useWorkOrders";
import { useMaintenanceList } from "@/lib/api/useMaintenance";
import { apiEnabled } from "@/lib/api/client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/maintenance/")({
  head: () => ({
    meta: [
      { title: "Maintenance Workspace — Medixa" },
      {
        name: "description",
        content:
          "Plan, dispatch and track preventive and corrective hospital maintenance work orders.",
      },
      { property: "og:title", content: "Maintenance Workspace — Medixa" },
      {
        property: "og:description",
        content: "Live work orders, engineer workload and maintenance analytics.",
      },
    ],
  }),
  component: MaintenanceWorkspace,
});

function MaintenanceWorkspace() {
  const days = Array.from({ length: 28 }, (_, i) => (i * 7) % 5);
  const { items: liveWorkOrders, loading } = useWorkOrderList({ limit: 100 });
  const { items: liveMaintenance } = useMaintenanceList({ limit: 100 });

  const displayList =
    apiEnabled && liveWorkOrders && liveWorkOrders.length > 0
      ? liveWorkOrders.map((wo) => {
          const equip =
            typeof wo.equipmentId === "object" ? wo.equipmentId.name : String(wo.equipmentId);
          const engineer =
            typeof wo.engineerId === "object"
              ? wo.engineerId.name
              : wo.engineerId
                ? String(wo.engineerId)
                : "Unassigned";
          const progress = wo.status === "COMPLETED" ? 100 : wo.status === "IN_PROGRESS" ? 60 : 25;
          const time = wo.scheduledDate
            ? new Date(wo.scheduledDate).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })
            : "08:30";
          return {
            id: wo._id,
            workOrderId: wo.workOrderId,
            task: wo.title,
            type:
              wo.maintenanceType === "PREVENTIVE"
                ? "Preventive"
                : wo.maintenanceType === "CALIBRATION"
                  ? "Calibration"
                  : "Corrective",
            equipment: equip,
            engineer,
            time,
            progress,
          };
        })
      : fallbackMaintenance.map((m) => ({ ...m, workOrderId: m.id }));

  const completedCount = displayList.filter((m) => m.progress === 100).length;
  const progressPercent = displayList.length
    ? Math.round((completedCount / displayList.length) * 100)
    : 39;

  return (
    <div className="mx-auto max-w-[1600px] space-y-6">
      <section className="relative overflow-hidden rounded-[28px] border border-border bg-surface p-8 shadow-float rise-in">
        <div className="absolute inset-0 gradient-mesh" />
        <div className="relative grid grid-cols-[minmax(0,1fr)_auto] items-end gap-6">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
              Operations
            </p>
            <h1 className="mt-2 text-[32px] font-bold leading-tight">Maintenance Workspace</h1>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              {displayList.length} work orders scheduled · 94.6% preventive compliance · 3.2 h mean
              time to repair.
            </p>
          </div>
          <Link
            to="/maintenance/new"
            className="inline-flex shrink-0 items-center gap-2 rounded-xl gradient-primary px-4 py-2.5 text-[13px] font-semibold text-white shadow-glow transition-transform hover:-translate-y-0.5"
          >
            <Plus className="size-4" /> New work order
          </Link>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <Panel className="lg:col-span-2">
          <PanelHead
            title="Today's maintenance"
            subtitle="Live dispatch board"
            icon={<Wrench className="size-4" />}
          />
          <ul className="space-y-2 px-4 pb-6">
            {loading && (
              <li className="flex items-center justify-center py-8 text-muted-foreground">
                <Loader2 className="mr-2 size-4 animate-spin" /> Loading work orders…
              </li>
            )}
            {displayList.map((m) => (
              <li
                key={m.id}
                className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 rounded-2xl border border-border px-4 py-3.5 transition-all hover:-translate-y-0.5 hover:shadow-soft"
              >
                <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary-soft text-[11px] font-bold tabular-nums text-primary">
                  {m.time}
                </span>
                <Link to="/engineer/tasks/$id" params={{ id: m.id }} className="block min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-[13px] font-semibold hover:text-primary">
                      {m.task}
                    </p>
                    <Pill
                      tone={
                        m.type === "Preventive"
                          ? "success"
                          : m.type === "Calibration"
                            ? "warning"
                            : "primary"
                      }
                    >
                      {m.type}
                    </Pill>
                  </div>
                  <p className="mt-0.5 truncate text-[11.5px] text-muted-foreground">
                    {m.equipment} · {m.engineer}
                  </p>
                  <div className="mt-2 max-w-[280px]">
                    <Meter value={m.progress} tone={m.progress === 100 ? "success" : "primary"} />
                  </div>
                </Link>
                <span className="shrink-0 text-[12px] font-semibold tabular-nums text-muted-foreground">
                  {m.progress}%
                </span>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel>
          <PanelHead
            title="Progress"
            subtitle="Today at a glance"
            icon={<Gauge className="size-4" />}
          />
          <div className="flex flex-col items-center gap-4 px-7 pb-7">
            <Ring value={progressPercent} size={130} sub="Completed" />
            <div className="grid w-full grid-cols-3 gap-2 text-center">
              {[
                { l: "Done", v: 1 },
                { l: "Active", v: 2 },
                { l: "Queued", v: 2 },
              ].map((s) => (
                <div key={s.l} className="rounded-2xl bg-surface-muted/70 py-3">
                  <p className="text-[18px] font-bold tabular-nums">{s.v}</p>
                  <p className="text-[11px] text-muted-foreground">{s.l}</p>
                </div>
              ))}
            </div>
          </div>
        </Panel>

        <Panel>
          <PanelHead
            title="Calendar"
            subtitle="August workload"
            icon={<CalendarDays className="size-4" />}
          />
          <div className="px-6 pb-6">
            <div className="grid grid-cols-7 gap-1.5">
              {days.map((n, i) => (
                <div
                  key={i}
                  className={cn(
                    "grid aspect-square place-items-center rounded-xl text-[11px] font-semibold transition-transform hover:scale-110",
                    n === 0
                      ? "bg-surface-muted text-muted-foreground/60"
                      : n < 2
                        ? "bg-primary/15 text-primary"
                        : n < 4
                          ? "bg-primary/40 text-primary"
                          : "bg-primary text-white",
                  )}
                >
                  {i + 1}
                </div>
              ))}
            </div>
          </div>
        </Panel>

        <Panel>
          <PanelHead
            title="Engineer workload"
            subtitle="Capacity distribution"
            icon={<Users className="size-4" />}
          />
          <div className="space-y-4 px-6 pb-6">
            {engineers.map((e) => (
              <div key={e.name} className="flex items-center gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-surface-muted text-[11px] font-bold">
                  {e.avatar}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex justify-between gap-2">
                    <p className="truncate text-[12.5px] font-semibold">{e.name}</p>
                    <span className="shrink-0 text-[11px] font-semibold tabular-nums text-muted-foreground">
                      {e.load}%
                    </span>
                  </div>
                  <div className="mt-1.5">
                    <Meter
                      value={e.load}
                      tone={e.load > 85 ? "danger" : e.load > 60 ? "warning" : "success"}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel>
          <PanelHead
            title="Checklist"
            subtitle="WO-4472 · ventilator sensor"
            icon={<ClipboardList className="size-4" />}
          />
          <div className="space-y-2.5 px-6 pb-6">
            {[
              { l: "Isolate device from patient", d: true },
              { l: "Verify spare part serial", d: true },
              { l: "Replace flow sensor", d: false },
              { l: "Run self-test cycle", d: false },
              { l: "Document and sign off", d: false },
            ].map((c) => (
              <div
                key={c.l}
                className="flex items-center gap-3 rounded-2xl border border-border px-4 py-3"
              >
                <span
                  className={cn(
                    "grid size-5 shrink-0 place-items-center rounded-md border text-[10px] font-bold",
                    c.d ? "border-success bg-success text-white" : "border-border text-transparent",
                  )}
                >
                  ✓
                </span>
                <span
                  className={cn(
                    "truncate text-[12.5px]",
                    c.d ? "text-muted-foreground line-through" : "font-medium",
                  )}
                >
                  {c.l}
                </span>
              </div>
            ))}
          </div>
        </Panel>

        <Panel>
          <PanelHead
            title="Timeline"
            subtitle="Shift activity"
            icon={<Clock className="size-4" />}
          />
          <ol className="relative space-y-5 px-7 pb-7">
            <span className="absolute left-[35px] top-2 bottom-8 w-px bg-border" />
            {[
              "Shift started · 06:00",
              "MRI PM completed · 09:40",
              "Ventilator repair in progress · 10:15",
              "Gas calibration queued · 12:00",
            ].map((t) => (
              <li key={t} className="relative flex gap-4">
                <span className="relative z-10 mt-1 size-3 shrink-0 rounded-full bg-primary ring-4 ring-primary-soft" />
                <p className="min-w-0 truncate text-[12.5px] font-medium">{t}</p>
              </li>
            ))}
          </ol>
        </Panel>

        <Panel className="lg:col-span-2">
          <PanelHead
            title="Maintenance analytics"
            subtitle="Compliance trend and incident volume"
            icon={<Gauge className="size-4" />}
          />
          <div className="h-[230px] px-2 pb-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={healthTrend} margin={{ top: 10, right: 24, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="mG" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--chart-3)" stopOpacity={0.35} />
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
                  tickLine={false}
                  axisLine={false}
                  fontSize={11}
                  width={30}
                  stroke="var(--muted-foreground)"
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 14,
                    fontSize: 12,
                    border: "1px solid var(--border)",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="uptime"
                  stroke="var(--chart-3)"
                  strokeWidth={2.5}
                  fill="url(#mG)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel>
          <PanelHead
            title="Completed tasks"
            subtitle="Last 24 hours"
            icon={<CheckCircle2 className="size-4" />}
          />
          <ul className="space-y-2 px-6 pb-6">
            {equipment.slice(0, 4).map((e) => (
              <li
                key={e.id}
                className="flex items-center gap-3 rounded-2xl bg-success-soft/50 px-4 py-3"
              >
                <CheckCircle2 className="size-4 shrink-0 text-success" />
                <span className="min-w-0 flex-1 truncate text-[12.5px] font-medium">{e.name}</span>
                <span className="shrink-0 text-[11px] text-muted-foreground">{e.dept}</span>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel className="lg:col-span-3">
          <PanelHead
            title="Equipment health after service"
            subtitle="Post-maintenance condition uplift"
            icon={<Wrench className="size-4" />}
          />
          <div className="grid gap-3 px-6 pb-7 sm:grid-cols-2 xl:grid-cols-4">
            {equipment.slice(0, 4).map((e) => (
              <div
                key={e.id}
                className="rounded-2xl border border-border p-5 transition-all hover:-translate-y-0.5 hover:shadow-soft"
              >
                <div className="flex items-center gap-4">
                  <Ring value={e.health} size={64} />
                  <div className="min-w-0">
                    <p className="truncate text-[12.5px] font-semibold">{e.name}</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">{e.dept}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}
