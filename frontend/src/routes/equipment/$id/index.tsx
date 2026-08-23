import { useMemo } from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Area, AreaChart, ResponsiveContainer, Tooltip } from "recharts";
import {
  ArrowLeft,
  Building2,
  CalendarClock,
  ChevronRight,
  CircleAlert,
  FileText,
  Paperclip,
  QrCode,
  ShieldCheck,
  Sparkles,
  StickyNote,
  Truck,
  Wrench,
} from "lucide-react";
import { EmptyState, Meter, Panel, PanelHead, Pill, Ring } from "@/components/ui/primitives";
import { equipment, healthTrend, statusTone, type Status } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { ActionButton } from "@/components/workflow/pages";
import { apiEnabled } from "@/lib/api/client";
import { useEquipmentList, useEquipmentRecord } from "@/lib/api/useEquipment";
import { departmentName } from "@/lib/api/equipmentRecords";
import type { ApiEquipment } from "@/lib/api/types";

type DetailAsset = (typeof equipment)[number] & { status: Status };

const shown = (v?: string) => (v && v.trim() ? v : "—");
const shownDate = (v?: string) =>
  v
    ? new Date(v).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
    : "—";

/** Map a backend asset onto the shape this page already renders. */
function toDetailAsset(e: ApiEquipment): DetailAsset {
  const operational = e.status === "ACTIVE" || e.status === "OPERATIONAL";
  const critical = e.status === "UNDER_BREAKDOWN" || e.status === "OUT_OF_SERVICE";
  return {
    id: e.equipmentId,
    name: e.name,
    category: e.category,
    dept: departmentName(e.departmentId),
    vendor: shown(e.vendor || e.manufacturer),
    status: (critical ? "critical" : operational ? "operational" : "maintenance") as Status,
    health: e.healthScore ?? 100,
    warranty: shownDate(e.warrantyExpiry),
    cost: shown(e.cost),
    specs: {
      model: shown(e.model),
      serial: shown(e.serialNumber),
      manufactured: shownDate(e.purchaseDate),
      installed: shownDate(e.installationDate),
      location: shown(e.location),
      owner: shown(e.owner),
      power: shown(e.power),
      weight: "—",
      dimensions: "—",
      software: shown(e.softwareVersion),
      riskClass: shown(e.riskClass),
      usageHours: "—",
      lastService: shownDate(e.lastPreventiveDate),
      nextService: shownDate(e.nextPreventiveDate),
      amc: "—",
      compliance: shown(e.criticality),
    },
  } as DetailAsset;
}

export const Route = createFileRoute("/equipment/$id/")({
  loader: ({ params }) => {
    const asset = equipment.find((e) => e.id === params.id);
    if (!asset && !apiEnabled) throw notFound();
    return asset ?? null;
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.name ?? "Asset"} — Equipment Detail | Medixa` },
      {
        name: "description",
        content: `Health score, warranty, lifecycle timeline and maintenance history for ${loaderData?.name ?? "this asset"}.`,
      },
      { property: "og:title", content: `${loaderData?.name ?? "Asset"} — Medixa` },
      {
        property: "og:description",
        content: "Full asset intelligence profile inside the Medixa workspace.",
      },
    ],
  }),
  component: EquipmentDetail,
});

function EquipmentDetail() {
  const { id } = Route.useParams();
  const mock = Route.useLoaderData() as DetailAsset | null;
  const live = useEquipmentRecord(id);
  const relatedQuery = useEquipmentList(
    live.item?.category ? { category: live.item.category } : {},
  );

  const asset = apiEnabled ? (live.item ? toDetailAsset(live.item) : null) : mock;

  const related = useMemo(() => {
    if (!apiEnabled || !relatedQuery.items) {
      if (!asset) return [];
      return equipment
        .filter((e) => e.id !== asset.id && e.category === asset.category)
        .slice(0, 3);
    }
    if (!asset) return [];
    return relatedQuery.items
      .filter((e) => e.equipmentId !== asset.id)
      .slice(0, 3)
      .map((e) => ({
        id: e.equipmentId,
        name: e.name,
        health: e.healthScore ?? 100,
      }));
  }, [relatedQuery.items, asset]);

  if (!asset) {
    return (
      <div className="mx-auto max-w-[1600px] py-16">
        <EmptyState
          icon={<Wrench className="size-6" />}
          title={
            live.error
              ? "Unable to load this asset"
              : live.loading
                ? "Loading asset…"
                : "Asset not found"
          }
          hint={
            live.error ??
            (live.loading ? "Fetching the latest data from the server." : `No asset matches ${id}.`)
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1600px] space-y-6">
      <div className="flex items-center gap-2 text-[12.5px] text-muted-foreground">
        <Link
          to="/equipment"
          className="inline-flex items-center gap-1.5 font-medium hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" /> Equipment
        </Link>
        <ChevronRight className="size-3.5" />
        <span className="font-semibold text-foreground">{asset.id}</span>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <ActionButton variant="ghost" to="/equipment/list">
            Register
          </ActionButton>
          <ActionButton variant="ghost" to={`/equipment/${asset.id}/history`}>
            History
          </ActionButton>
          <ActionButton variant="ghost" to={`/equipment/${asset.id}/checklist`}>
            Maintenance checklist
          </ActionButton>

          <ActionButton to={`/equipment/${asset.id}/edit`}>Edit asset</ActionButton>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <section className="relative overflow-hidden rounded-[28px] border border-border bg-surface shadow-float rise-in">
            <div className="grid gap-0 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
              <div className="relative min-h-[240px] gradient-primary">
                <div className="absolute inset-0 grid-lines opacity-30" />
                <div className="absolute inset-0 grid place-items-center">
                  <div className="grid size-28 place-items-center rounded-3xl bg-white/15 backdrop-blur-md">
                    <Wrench className="size-12 text-white" strokeWidth={1.4} />
                  </div>
                </div>
                <span className="absolute left-5 top-5 rounded-full bg-white/20 px-3 py-1 text-[11px] font-semibold text-white backdrop-blur">
                  {asset.category}
                </span>
              </div>
              <div className="p-7">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h1 className="text-[24px] font-bold leading-tight">{asset.name}</h1>
                    <p className="mt-1.5 text-[13px] text-muted-foreground">
                      {asset.id} · {asset.dept} · {asset.vendor}
                    </p>
                  </div>
                  <Pill className={statusTone[asset.status].cls}>
                    {statusTone[asset.status].label}
                  </Pill>
                </div>
                <div className="mt-6 flex items-center gap-6">
                  <Ring value={asset.health} size={96} sub="Health" />
                  <div className="min-w-0 flex-1 space-y-3">
                    {[
                      { l: "Utilisation", v: 74 },
                      { l: "Reliability", v: asset.health },
                      { l: "Compliance", v: 92 },
                    ].map((s) => (
                      <div key={s.l}>
                        <div className="flex justify-between text-[11.5px]">
                          <span className="text-muted-foreground">{s.l}</span>
                          <span className="font-semibold tabular-nums">{s.v}%</span>
                        </div>
                        <div className="mt-1">
                          <Meter
                            value={s.v}
                            tone={s.v >= 85 ? "success" : s.v >= 65 ? "warning" : "danger"}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="mt-6 flex flex-wrap gap-2">
                  <button className="rounded-xl gradient-primary px-4 py-2.5 text-[12.5px] font-semibold text-white shadow-glow transition-transform hover:-translate-y-0.5">
                    Schedule service
                  </button>
                  <button className="rounded-xl border border-border px-4 py-2.5 text-[12.5px] font-semibold transition-colors hover:bg-surface-muted">
                    Raise complaint
                  </button>
                </div>
              </div>
            </div>
          </section>

          <div className="grid gap-6 md:grid-cols-2">
            <Panel>
              <PanelHead
                title="Specifications"
                subtitle="Manufacturer datasheet"
                icon={<FileText className="size-4" />}
              />
              <dl className="divide-y divide-border px-7 pb-6 text-[12.5px]">
                {[
                  ["Model", asset.specs.model],
                  ["Serial number", asset.specs.serial],
                  ["Manufactured", asset.specs.manufactured],
                  ["Installed", asset.specs.installed],
                  ["Location", asset.specs.location],
                  ["Accountable owner", asset.specs.owner],
                  ["Power", asset.specs.power],
                  ["Weight", asset.specs.weight],
                  ["Dimensions (W×D×H)", asset.specs.dimensions],
                  ["Software", asset.specs.software],
                  ["Risk class", asset.specs.riskClass],
                  ["Usage hours", asset.specs.usageHours],
                  ["Last service", asset.specs.lastService],
                  ["Next service due", asset.specs.nextService],
                  ["Service contract", asset.specs.amc],
                  ["Compliance", asset.specs.compliance],
                  ["Purchase value", asset.cost],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-4 py-2.5">
                    <dt className="shrink-0 text-muted-foreground">{k}</dt>
                    <dd className="truncate text-right font-semibold">{v}</dd>
                  </div>
                ))}
              </dl>
            </Panel>

            <div className="space-y-6">
              <Panel>
                <div className="flex items-center gap-5 p-7">
                  <div className="grid size-24 shrink-0 place-items-center rounded-2xl border border-border bg-surface-muted">
                    <QrCode className="size-14 text-foreground" strokeWidth={1.2} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold">Asset QR tag</p>
                    <p className="mt-1 text-[11.5px] leading-relaxed text-muted-foreground">
                      Scan on the floor to open this profile, log a fault or start a checklist.
                    </p>
                    <button className="mt-3 rounded-xl border border-border px-3.5 py-2 text-[11.5px] font-semibold transition-colors hover:bg-surface-muted">
                      Print label
                    </button>
                  </div>
                </div>
              </Panel>
              <Panel>
                <PanelHead title="Vendor & department" icon={<Truck className="size-4" />} />
                <div className="space-y-3 px-6 pb-6">
                  <div className="rounded-2xl border border-border p-4">
                    <p className="text-[12.5px] font-semibold">{asset.vendor}</p>
                    <p className="mt-0.5 text-[11.5px] text-muted-foreground">
                      Response SLA 8h · Rating 4.7
                    </p>
                  </div>
                  <div className="rounded-2xl border border-border p-4">
                    <p className="inline-flex items-center gap-2 text-[12.5px] font-semibold">
                      <Building2 className="size-3.5 text-primary" /> {asset.dept}
                    </p>
                    <p className="mt-0.5 text-[11.5px] text-muted-foreground">
                      Owner: Dr. L. Fontaine
                    </p>
                  </div>
                </div>
              </Panel>
            </div>
          </div>

          <Panel>
            <PanelHead
              title="Lifecycle timeline"
              subtitle="From procurement to today"
              icon={<CalendarClock className="size-4" />}
            />
            <ol className="relative space-y-6 px-7 pb-8">
              <span className="absolute left-[35px] top-2 bottom-8 w-px bg-border" />
              {[
                {
                  t: `Manufactured by ${asset.vendor}`,
                  d: asset.specs.manufactured,
                  tone: "neutral",
                },
                { t: "Procured & commissioned", d: asset.specs.installed, tone: "primary" },
                {
                  t: `Software baseline — ${asset.specs.software}`,
                  d: asset.specs.installed,
                  tone: "violet",
                },
                { t: "Last completed service", d: asset.specs.lastService, tone: "success" },
                { t: "Next preventive service due", d: asset.specs.nextService, tone: "warning" },
                { t: "Current health assessment", d: "03 Aug 2026", tone: "primary" },
              ].map((e) => (
                <li key={e.t} className="relative flex gap-4">
                  <span
                    className={cn(
                      "relative z-10 mt-1 size-3 shrink-0 rounded-full ring-4",
                      e.tone === "success"
                        ? "bg-success ring-success-soft"
                        : e.tone === "warning"
                          ? "bg-warning ring-warning-soft"
                          : e.tone === "violet"
                            ? "bg-violet ring-violet-soft"
                            : "bg-primary ring-primary-soft",
                    )}
                  />
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold">{e.t}</p>
                    <p className="mt-0.5 text-[11.5px] text-muted-foreground">{e.d}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Panel>

          <div className="grid gap-6 md:grid-cols-2">
            <Panel>
              <PanelHead
                title="Maintenance history"
                subtitle="Last 6 interventions"
                icon={<Wrench className="size-4" />}
              />
              <ul className="space-y-1 px-4 pb-5">
                {[
                  "Quarterly PM",
                  "Coil replacement",
                  "Calibration",
                  "Firmware patch",
                  "Filter change",
                  "Safety test",
                ].map((m, i) => (
                  <li
                    key={m}
                    className="flex items-center justify-between gap-3 rounded-2xl px-3 py-2.5 hover:bg-surface-muted"
                  >
                    <span className="truncate text-[12.5px] font-medium">{m}</span>
                    <span className="shrink-0 text-[11px] text-muted-foreground">
                      {2 + i} mo ago
                    </span>
                  </li>
                ))}
              </ul>
            </Panel>
            <Panel>
              <PanelHead
                title="Complaint history"
                subtitle="3 tickets in 12 months"
                icon={<CircleAlert className="size-4" />}
              />
              <ul className="space-y-2 px-6 pb-6">
                {[
                  { t: "Coil overheating", p: "Critical" },
                  { t: "Image artefact on axial", p: "High" },
                  { t: "Console reboot loop", p: "Medium" },
                ].map((c) => (
                  <li
                    key={c.t}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-border px-4 py-3"
                  >
                    <span className="truncate text-[12.5px] font-medium">{c.t}</span>
                    <Pill
                      tone={c.p === "Critical" ? "danger" : c.p === "High" ? "warning" : "primary"}
                    >
                      {c.p}
                    </Pill>
                  </li>
                ))}
              </ul>
            </Panel>
          </div>
        </div>

        <div className="space-y-6">
          <Panel className="relative">
            <div className="absolute inset-x-0 top-0 h-28 gradient-mesh opacity-70" />
            <div className="relative">
              <PanelHead
                title="AI recommendation"
                subtitle="Confidence 92%"
                icon={<Sparkles className="size-4" />}
                action={<Pill tone="violet">Copilot</Pill>}
              />
              <div className="px-7 pb-7">
                <p className="text-[13px] leading-relaxed text-muted-foreground">
                  Vibration signature suggests bearing wear on the gantry drive. Scheduling a
                  service window within 10 days avoids an estimated{" "}
                  <span className="font-semibold text-foreground">14 hours</span> of unplanned
                  downtime and <span className="font-semibold text-foreground">$18.4K</span> in lost
                  throughput.
                </p>
                <div className="mt-5 h-[86px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={healthTrend}>
                      <defs>
                        <linearGradient id="aiG" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="var(--violet)" stopOpacity={0.35} />
                          <stop offset="100%" stopColor="var(--violet)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
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
                        stroke="var(--violet)"
                        strokeWidth={2}
                        fill="url(#aiG)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <button className="mt-4 w-full rounded-xl gradient-primary py-2.5 text-[12.5px] font-semibold text-white shadow-glow transition-transform hover:-translate-y-0.5">
                  Create work order
                </button>
              </div>
            </div>
          </Panel>

          <Panel>
            <PanelHead title="Warranty & AMC" icon={<ShieldCheck className="size-4" />} />
            <div className="space-y-3 px-6 pb-6">
              <div className="rounded-2xl border border-border p-4">
                <div className="flex items-center justify-between">
                  <p className="text-[12.5px] font-semibold">Warranty</p>
                  <Pill tone="success">Active</Pill>
                </div>
                <p className="mt-1 text-[11.5px] text-muted-foreground">Expires {asset.warranty}</p>
                <div className="mt-3">
                  <Meter value={68} tone="success" />
                </div>
              </div>
              <div className="rounded-2xl border border-border p-4">
                <div className="flex items-center justify-between">
                  <p className="text-[12.5px] font-semibold">Comprehensive AMC</p>
                  <Pill tone="warning">Renew soon</Pill>
                </div>
                <p className="mt-1 text-[11.5px] text-muted-foreground">
                  $42.6K annual · 4 visits included
                </p>
                <div className="mt-3">
                  <Meter value={34} tone="warning" />
                </div>
              </div>
            </div>
          </Panel>

          <Panel>
            <PanelHead
              title="Attachments"
              subtitle="6 documents"
              icon={<Paperclip className="size-4" />}
            />
            <ul className="space-y-2 px-6 pb-6">
              {[
                "Service manual.pdf",
                "Calibration cert.pdf",
                "Purchase invoice.pdf",
                "Safety audit.pdf",
              ].map((f) => (
                <li
                  key={f}
                  className="flex items-center gap-3 rounded-2xl border border-border px-4 py-3 transition-colors hover:bg-surface-muted"
                >
                  <FileText className="size-4 shrink-0 text-primary" />
                  <span className="min-w-0 flex-1 truncate text-[12.5px] font-medium">{f}</span>
                  <span className="shrink-0 text-[11px] text-muted-foreground">PDF</span>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel>
            <PanelHead title="Related equipment" icon={<Wrench className="size-4" />} />
            <ul className="space-y-1 px-4 pb-5">
              {related.map((r) => (
                <li key={r.id}>
                  <Link
                    to="/equipment/$id"
                    params={{ id: r.id }}
                    className="flex items-center gap-3 rounded-2xl px-3 py-2.5 hover:bg-surface-muted"
                  >
                    <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-surface-muted text-primary">
                      <Wrench className="size-3.5" />
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[12.5px] font-medium">
                      {r.name}
                    </span>
                    <Pill tone={r.health >= 88 ? "success" : "warning"}>{r.health}</Pill>
                  </Link>
                </li>
              ))}
              {related.length === 0 && (
                <li className="px-3 py-6 text-center text-[12.5px] text-muted-foreground">
                  No related assets.
                </li>
              )}
            </ul>
          </Panel>

          <Panel>
            <PanelHead
              title="Notes"
              subtitle="Shared with the biomedical team"
              icon={<StickyNote className="size-4" />}
            />
            <div className="px-6 pb-6">
              <div className="rounded-2xl bg-warning-soft/70 p-4 text-[12.5px] leading-relaxed text-foreground">
                Coil cooling loop was topped up on 22 Jul. Monitor helium boil-off weekly until the
                next PM window.
                <p className="mt-2 text-[11px] font-semibold text-muted-foreground">
                  — Anita Raghavan
                </p>
              </div>
              <textarea
                placeholder="Add a note for the next engineer…"
                className="mt-3 h-20 w-full resize-none rounded-2xl border border-border bg-surface p-3.5 text-[12.5px] outline-none transition-colors placeholder:text-muted-foreground focus:border-primary/50"
              />
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
