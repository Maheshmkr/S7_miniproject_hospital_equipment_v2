import { createFileRoute } from "@tanstack/react-router";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CalendarClock, FileSignature, ShieldCheck, Truck } from "lucide-react";
import { Meter, Panel, PanelHead, Pill, Ring } from "@/components/ui/primitives";
import { healthTrend, warranties } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { useWarrantyList } from "@/lib/api/useWarranty";
import { equipmentCode } from "@/lib/api/warrantyRecords";

export const Route = createFileRoute("/warranty/")({
  head: () => ({
    meta: [
      { title: "Warranty & AMC Workspace — Medixa" },
      {
        name: "description",
        content:
          "Track hospital equipment warranties, AMC contracts, vendor coverage and renewals.",
      },
      { property: "og:title", content: "Warranty & AMC Workspace — Medixa" },
      {
        property: "og:description",
        content: "Contract health, renewal timeline and vendor analytics in one workspace.",
      },
    ],
  }),
  component: WarrantyWorkspace,
});

function WarrantyWorkspace() {
  const live = useWarrantyList({ limit: 200 });
  const stats = live.enabled ? live.stats : null;
  const summary = stats
    ? [
        { l: "Active contracts", v: String(stats.active) },
        { l: `Expiring ≤${stats.expiringWindowDays}d`, v: String(stats.expiring) },
        { l: "Expired contracts", v: String(stats.expired) },
      ]
    : [
        { l: "Active contracts", v: "42" },
        { l: "Expiring ≤30d", v: "2" },
        { l: "Uncovered assets", v: "168" },
      ];
  const coverageRing = stats && stats.total ? Math.round((stats.active / stats.total) * 100) : 82;
  const headline = stats
    ? `${stats.total} registered contracts covering ${stats.equipmentCovered} assets · ${stats.expiring} require renewal soon.`
    : "$1.34M in active coverage across 5 vendors · 2 contracts require renewal within 30 days.";

  const cards =
    live.enabled && live.items
      ? live.items.map((w) => {
          const days = w.daysRemaining ?? 0;
          return {
            id: w.warrantyId,
            vendor: w.vendor || w.warrantyId,
            type: w.kind === "AMC" ? "Comprehensive AMC" : "Warranty",
            assets: equipmentCode(w.equipmentId) || "—",
            value: w.value || "—",
            coverage: days <= 0 ? 0 : Math.max(5, Math.min(100, Math.round((days / 365) * 100))),
            days,
            expires: new Date(w.endDate).toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            }),
          };
        })
      : warranties.map((w) => ({ ...w, assets: String(w.assets) }));

  return (
    <div className="mx-auto max-w-[1600px] space-y-6">
      <section className="relative overflow-hidden rounded-[28px] border border-border bg-surface p-8 shadow-float rise-in">
        <div className="absolute inset-0 gradient-mesh" />
        <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1fr)_auto]">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
              Assets
            </p>
            <h1 className="mt-2 text-[32px] font-bold leading-tight">Warranty & AMC</h1>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">{headline}</p>
          </div>
          <div className="flex items-center gap-6 self-center">
            <Ring value={coverageRing} size={104} sub="Coverage" />
            <div className="space-y-1.5">
              {summary.map((s) => (
                <div key={s.l} className="flex items-baseline gap-3">
                  <span className="w-10 text-[18px] font-bold tabular-nums">{s.v}</span>
                  <span className="text-[11.5px] text-muted-foreground">{s.l}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <Panel className="lg:col-span-2">
          <PanelHead
            title="Vendor coverage"
            subtitle="Contract portfolio by partner"
            icon={<Truck className="size-4" />}
          />
          <div className="grid gap-3 px-6 pb-6 sm:grid-cols-2">
            {cards.map((w) => (
              <div
                key={w.id}
                className="group rounded-2xl border border-border p-5 transition-all hover:-translate-y-0.5 hover:shadow-soft"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-[13.5px] font-semibold">{w.vendor}</p>
                    <p className="mt-0.5 text-[11.5px] text-muted-foreground">{w.type}</p>
                  </div>
                  <Pill tone={w.days < 30 ? "danger" : w.days < 120 ? "warning" : "success"}>
                    {w.days}d left
                  </Pill>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  {[
                    { l: "Assets", v: w.assets },
                    { l: "Value", v: w.value },
                    { l: "Coverage", v: `${w.coverage}%` },
                  ].map((s) => (
                    <div key={s.l} className="rounded-xl bg-surface-muted/70 py-2.5">
                      <p className="text-[13px] font-bold tabular-nums">{s.v}</p>
                      <p className="text-[10.5px] text-muted-foreground">{s.l}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-4">
                  <Meter
                    value={w.coverage}
                    tone={w.coverage > 85 ? "success" : w.coverage > 60 ? "warning" : "danger"}
                  />
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel>
          <PanelHead
            title="Upcoming renewals"
            subtitle="Next 12 months"
            icon={<CalendarClock className="size-4" />}
          />
          <ol className="relative space-y-6 px-7 pb-8">
            <span className="absolute left-[35px] top-2 bottom-8 w-px bg-border" />
            {cards.map((w) => (
              <li key={w.id} className="relative flex gap-4">
                <span
                  className={cn(
                    "relative z-10 mt-1 size-3 shrink-0 rounded-full ring-4",
                    w.days < 30
                      ? "bg-danger ring-danger-soft"
                      : w.days < 120
                        ? "bg-warning ring-warning-soft"
                        : "bg-success ring-success-soft",
                  )}
                />
                <div className="min-w-0">
                  <p className="truncate text-[12.5px] font-semibold">{w.vendor}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {w.expires} · {w.value}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </Panel>

        <Panel>
          <PanelHead
            title="AMC summary"
            subtitle="Contract mix"
            icon={<FileSignature className="size-4" />}
          />
          <div className="space-y-3 px-6 pb-6">
            {[
              { l: "Comprehensive AMC", v: 62, t: "success" },
              { l: "Non-comprehensive", v: 21, t: "warning" },
              { l: "Warranty only", v: 17, t: "primary" },
            ].map((s) => (
              <div key={s.l} className="rounded-2xl border border-border p-4">
                <div className="flex justify-between text-[12.5px]">
                  <span className="font-medium">{s.l}</span>
                  <span className="font-semibold tabular-nums">{s.v}%</span>
                </div>
                <div className="mt-2.5">
                  <Meter value={s.v} tone={s.t} />
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel className="lg:col-span-2">
          <PanelHead
            title="Contract analytics"
            subtitle="Coverage trend and spend efficiency"
            icon={<ShieldCheck className="size-4" />}
          />
          <div className="h-[240px] px-2 pb-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={healthTrend} margin={{ top: 10, right: 24, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="wG" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--chart-5)" stopOpacity={0.32} />
                    <stop offset="100%" stopColor="var(--chart-5)" stopOpacity={0} />
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
                  dataKey="health"
                  stroke="var(--chart-5)"
                  strokeWidth={2.5}
                  fill="url(#wG)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>
    </div>
  );
}
