import { useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  ChartPie,
  CheckCircle2,
  ClipboardList,
  Download,
  Filter,
  History,
  LayoutGrid,
  ListFilter,
  PencilLine,
  Plus,
  Save,
  Search,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import {
  Meter,
  Panel,
  PanelHead,
  PageHeader,
  Pill,
  Ring,
  EmptyState,
} from "@/components/ui/primitives";
import { apiEnabled } from "@/lib/api/client";
import { useModuleAnalytics } from "@/lib/api/useAnalytics";
import { useEquipmentList } from "@/lib/api/useEquipment";
import { useComplaintList } from "@/lib/api/useComplaints";
import { useMaintenanceList } from "@/lib/api/useMaintenance";
import { useWarrantyList } from "@/lib/api/useWarranty";
import { useInventoryList } from "@/lib/api/useInventory";
import { usePurchaseOrderList } from "@/lib/api/usePurchaseOrders";
import { useVendorList } from "@/lib/api/useVendors";
import { useDepartmentList } from "@/lib/api/useDepartments";
import { useUserList } from "@/lib/api/useUsers";
import { cn } from "@/lib/utils";
import {
  findRecord,
  getModule,
  type FieldDef,
  type ModuleKey,
  type ModuleRecord,
} from "@/lib/modules";

const chartColors = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

/* --------------------------------- Building blocks --------------------------------- */

export function ActionButton({
  to,
  params,
  children,
  icon: Icon,
  variant = "primary",
  onClick,
  type = "button",
}: {
  to?: string;
  params?: Record<string, string>;
  children: React.ReactNode;
  icon?: React.ElementType;
  variant?: "primary" | "ghost";
  onClick?: () => void;
  type?: "button" | "submit";
}) {
  const cls = cn(
    "inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-[13px] font-semibold transition-all duration-200 hover:-translate-y-0.5",
    variant === "primary"
      ? "gradient-primary text-white shadow-glow"
      : "border border-border bg-surface text-foreground shadow-xs hover:shadow-soft",
  );
  if (to) {
    return (
      <Link to={to as never} params={params as never} className={cls}>
        {Icon ? <Icon className="size-4" /> : null}
        {children}
      </Link>
    );
  }

  return (
    <button type={type} onClick={onClick} className={cls}>
      {Icon ? <Icon className="size-4" /> : null}
      {children}
    </button>
  );
}

export function WorkflowTabs({ moduleKey, active }: { moduleKey: ModuleKey; active: string }) {
  const m = getModule(moduleKey);
  const tabs = [
    { key: "dashboard", label: "Dashboard", to: m.base, icon: LayoutGrid },
    { key: "list", label: "List", to: `${m.base}/list`, icon: ListFilter },
    { key: "create", label: "Create", to: `${m.base}/new`, icon: Plus },
    { key: "analytics", label: "Analytics", to: `${m.base}/analytics`, icon: ChartPie },
  ];
  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-2xl border border-border bg-surface p-1.5 shadow-xs">
      {tabs.map((t) => (
        <Link
          key={t.key}
          to={t.to}
          className={cn(
            "inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-[12.5px] font-semibold transition-all",
            active === t.key
              ? "bg-primary-soft text-primary"
              : "text-muted-foreground hover:bg-surface-muted hover:text-foreground",
          )}
        >
          <t.icon className="size-3.5" />
          {t.label}
        </Link>
      ))}
    </div>
  );
}

function StatCards({
  moduleKey,
  stats,
}: {
  moduleKey: ModuleKey;
  stats?: { label: string; value: string; delta: string }[];
}) {
  const m = getModule(moduleKey);
  const displayStats = stats ?? m.stats;
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {displayStats.map((s) => (
        <Link key={s.label} to={`${m.base}/analytics` as never} className="block">
          <Panel className="h-full">
            <div className="p-6">
              <div className="flex items-start justify-between gap-3">
                <p className="text-[12px] font-medium text-muted-foreground">{s.label}</p>
                <ArrowUpRight className="size-4 text-muted-foreground" />
              </div>
              <p className="mt-3 text-[26px] font-bold leading-none tabular-nums">{s.value}</p>
              <p className="mt-2 text-[11.5px] font-semibold text-primary">
                {s.delta} vs last period
              </p>
            </div>
          </Panel>
        </Link>
      ))}
    </div>
  );
}

export function Breadcrumbs({
  moduleKey,
  trail,
}: {
  moduleKey: ModuleKey;
  trail: { label: string; to?: string }[];
}) {
  const m = getModule(moduleKey);
  return (
    <nav className="flex flex-wrap items-center gap-2 text-[12px] text-muted-foreground">
      <Link to={m.base} className="transition-colors hover:text-foreground">
        {m.label}
      </Link>
      {trail.map((t) => (
        <span key={t.label} className="flex items-center gap-2">
          <span className="text-border-strong">/</span>
          {t.to ? (
            <Link to={t.to} className="transition-colors hover:text-foreground">
              {t.label}
            </Link>
          ) : (
            <span className="font-semibold text-foreground">{t.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

/* ------------------------------------ List page ------------------------------------ */

export function ModuleList({
  moduleKey,
  records,
  loading = false,
  error = null,
  onDelete,
}: {
  moduleKey: ModuleKey;
  /** Live records from the API; falls back to the configured records when omitted. */
  records?: ModuleRecord[] | null;
  loading?: boolean;
  error?: string | null;
  onDelete?: (record: ModuleRecord) => void;
}) {
  const m = getModule(moduleKey);
  const [query, setQuery] = useState("");
  const [tone, setTone] = useState<string>("All");

  const source = records ?? m.records;
  const statuses = useMemo(() => ["All", ...new Set(source.map((r) => r.status))], [source]);
  const rows = source.filter(
    (r) =>
      (tone === "All" || r.status === tone) &&
      (r.title + r.id + r.subtitle).toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div className="mx-auto max-w-[1600px] space-y-6">
      <PageHeader
        eyebrow={m.eyebrow}
        title={`${m.label} register`}
        description={m.listDescription}
        actions={
          <>
            <ActionButton variant="ghost" icon={Download}>
              Export
            </ActionButton>
            <ActionButton to={`${m.base}/new` as never} icon={Plus}>
              New {m.singular.toLowerCase()}
            </ActionButton>
          </>
        }
      />
      <WorkflowTabs moduleKey={moduleKey} active="list" />

      <Panel interactive={false}>
        <PanelHead
          title={`All ${m.label.toLowerCase()}`}
          subtitle={`${rows.length} records match the current filters`}
          icon={<ClipboardList className="size-4" />}
          action={
            <div className="flex flex-wrap items-center gap-2">
              <label className="flex h-10 items-center gap-2 rounded-xl border border-border bg-surface px-3 text-[12.5px] shadow-xs">
                <Search className="size-3.5 text-muted-foreground" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={`Search ${m.label.toLowerCase()}…`}
                  className="w-[150px] bg-transparent outline-none placeholder:text-muted-foreground"
                />
              </label>
              <div className="flex h-10 items-center gap-1 rounded-xl border border-border bg-surface px-1.5 shadow-xs">
                <Filter className="ml-1.5 size-3.5 text-muted-foreground" />
                {statuses.slice(0, 4).map((s) => (
                  <button
                    key={s}
                    onClick={() => setTone(s)}
                    className={cn(
                      "rounded-lg px-2.5 py-1.5 text-[11.5px] font-semibold transition-colors",
                      tone === s
                        ? "bg-primary-soft text-primary"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          }
        />
        {error ? (
          <EmptyState
            icon={<Search className="size-6" />}
            title="Unable to load records"
            hint={error}
          />
        ) : loading ? (
          <EmptyState
            icon={<Search className="size-6" />}
            title="Loading records…"
            hint="Fetching the latest data from the server."
          />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={<Search className="size-6" />}
            title="No records found"
            hint="Adjust your search or filters to see more results."
            action={
              <ActionButton
                variant="ghost"
                onClick={() => {
                  setQuery("");
                  setTone("All");
                }}
              >
                Reset filters
              </ActionButton>
            }
          />
        ) : (
          <div className="overflow-x-auto px-2 pb-4">
            <table className="w-full min-w-[880px] border-collapse">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                  {m.columns.map((c) => (
                    <th key={c} className="px-4 py-3 font-semibold">
                      {c}
                    </th>
                  ))}
                  <th className="px-4 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr
                    key={r.id}
                    className="group border-t border-border transition-colors hover:bg-surface-muted/70"
                  >
                    {r.cells.map((cell, i) => (
                      <td key={i} className="px-4 py-3.5 align-middle">
                        <Link
                          to={`${m.base}/${r.id}` as never}
                          className={cn(
                            "block max-w-[280px] truncate text-[12.5px]",
                            i === 0 ? "font-semibold text-foreground" : "text-muted-foreground",
                          )}
                        >
                          {i === m.columns.length - 2 ? <Pill tone={r.tone}>{cell}</Pill> : cell}
                        </Link>
                      </td>
                    ))}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          to={`${m.base}/${r.id}` as never}
                          className="rounded-lg border border-border px-2.5 py-1.5 text-[11.5px] font-semibold text-muted-foreground transition-colors hover:text-foreground"
                        >
                          View
                        </Link>
                        <Link
                          to={`${m.base}/${r.id}/edit` as never}
                          className="rounded-lg border border-border px-2.5 py-1.5 text-[11.5px] font-semibold text-muted-foreground transition-colors hover:text-foreground"
                        >
                          Edit
                        </Link>
                        <Link
                          to={`${m.base}/${r.id}/history` as never}
                          className="rounded-lg border border-border px-2.5 py-1.5 text-[11.5px] font-semibold text-muted-foreground transition-colors hover:text-foreground"
                        >
                          History
                        </Link>
                        {onDelete ? (
                          <button
                            type="button"
                            onClick={() => onDelete(r)}
                            className="rounded-lg border border-border px-2.5 py-1.5 text-[11.5px] font-semibold text-muted-foreground transition-colors hover:text-danger"
                          >
                            Delete
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}

function Field({
  f,
  defaultValue,
  dynamicOptions,
}: {
  f: FieldDef;
  defaultValue?: string | undefined;
  dynamicOptions?: string[] | undefined;
}) {
  const base =
    "mt-2 w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-[13px] text-foreground shadow-xs outline-none transition-all placeholder:text-muted-foreground focus:border-primary focus:shadow-soft";
  const options = dynamicOptions && dynamicOptions.length > 0 ? dynamicOptions : (f.options ?? []);
  return (
    <div className={cn(f.wide && "sm:col-span-2")}>
      <label className="text-[12px] font-semibold text-foreground" htmlFor={f.name}>
        {f.label}
      </label>
      {f.type === "textarea" ? (
        <textarea
          id={f.name}
          name={f.name}
          rows={4}
          placeholder={f.placeholder}
          defaultValue={defaultValue}
          className={base}
        />
      ) : f.type === "select" ? (
        <select id={f.name} name={f.name} defaultValue={defaultValue} className={base}>
          {options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      ) : (
        <input
          id={f.name}
          name={f.name}
          type={f.type === "number" ? "number" : f.type === "date" ? "date" : "text"}
          placeholder={f.placeholder}
          defaultValue={defaultValue}
          className={base}
        />
      )}
    </div>
  );
}

function RecordForm({
  moduleKey,
  mode,
  record,
  onSave,
}: {
  moduleKey: ModuleKey;
  mode: "create" | "edit";
  record?: ModuleRecord;
  /** When provided the form persists through the API before redirecting. */
  onSave?: ((values: Record<string, string>) => Promise<{ id?: string } | void>) | undefined;
}) {
  const m = getModule(moduleKey);
  const navigate = useNavigate();
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { items: liveEquipment } = useEquipmentList(apiEnabled ? { limit: 200 } : { limit: 0 });
  const { items: liveDepartments } = useDepartmentList(apiEnabled ? { limit: 100 } : { limit: 0 });
  const { items: liveUsers } = useUserList(apiEnabled ? { limit: 100 } : { limit: 0 });

  const getDynamicOptions = (fieldName: string) => {
    if (
      (fieldName === "equipment" || fieldName === "equipmentId") &&
      liveEquipment &&
      liveEquipment.length > 0
    ) {
      return liveEquipment.map((e) => e.name);
    }
    if (
      (fieldName === "dept" || fieldName === "department" || fieldName === "departmentId") &&
      liveDepartments &&
      liveDepartments.length > 0
    ) {
      return liveDepartments.map((d) => d.name);
    }
    if (
      (fieldName === "assignee" ||
        fieldName === "engineerId" ||
        fieldName === "owner" ||
        fieldName === "engineer") &&
      liveUsers &&
      liveUsers.length > 0
    ) {
      const engineers = liveUsers
        .filter((u) => u.role === "BIOMEDICAL_ENGINEER")
        .map((u) => u.name);
      return engineers.length > 0 ? engineers : liveUsers.map((u) => u.name);
    }
    return undefined;
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;

    if (!onSave) {
      setSaved(true);
      window.setTimeout(() => {
        navigate({ to: mode === "edit" && record ? `${m.base}/${record.id}` : `${m.base}/list` });
      }, 900);
      return;
    }

    const values = Object.fromEntries(
      Array.from(new FormData(form).entries()).map(([k, v]) => [k, String(v)]),
    ) as Record<string, string>;

    setSaving(true);
    setError(null);
    void onSave(values)
      .then((result) => {
        setSaved(true);
        const nextId = (result && "id" in result ? result.id : undefined) ?? record?.id;
        window.setTimeout(() => {
          navigate({ to: nextId ? `${m.base}/${nextId}` : `${m.base}/list` });
        }, 700);
      })
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : "Unable to save this record."),
      )
      .finally(() => setSaving(false));
  };

  const defaults = (f: FieldDef) =>
    record?.values?.[f.name] ??
    record?.meta.find((x) => x.label.toLowerCase().includes(f.label.toLowerCase()))?.value;

  return (
    <form onSubmit={onSubmit} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <Panel interactive={false}>
        <PanelHead
          title={
            mode === "create"
              ? `New ${m.singular.toLowerCase()} details`
              : `Edit ${record?.title ?? m.singular}`
          }
          subtitle="All fields are validated before the record is committed to the register."
          icon={<PencilLine className="size-4" />}
        />
        <div className="grid gap-5 px-6 pb-6 sm:grid-cols-2 sm:px-7">
          {m.fields.map((f) => (
            <Field
              key={f.name}
              f={f}
              defaultValue={mode === "edit" ? defaults(f) : undefined}
              dynamicOptions={getDynamicOptions(f.name)}
            />
          ))}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-6 py-5 sm:px-7">
          <p className={cn("text-[12px]", error ? "text-danger" : "text-muted-foreground")}>
            {error
              ? error
              : saved
                ? mode === "create"
                  ? "Created — redirecting…"
                  : "Saved — redirecting…"
                : saving
                  ? "Saving…"
                  : "Changes are logged to the audit trail."}
          </p>
          <div className="flex items-center gap-2">
            <ActionButton variant="ghost" to={`${m.base}/list` as never}>
              Cancel
            </ActionButton>
            <ActionButton type="submit" icon={saved ? CheckCircle2 : Save}>
              {mode === "create" ? `Create ${m.singular.toLowerCase()}` : "Save changes"}
            </ActionButton>
          </div>
        </div>
      </Panel>

      <div className="space-y-6">
        <Panel>
          <PanelHead
            title="Guidance"
            subtitle="Best practice for this record"
            icon={<Sparkles className="size-4" />}
          />
          <ul className="space-y-3 px-6 pb-6 text-[12.5px] text-muted-foreground">
            {[
              `Use the standard ${m.singular.toLowerCase()} naming convention.`,
              "Attach vendor documentation where available.",
              "Assign an accountable owner before saving.",
              "Records sync to Analytics within 5 minutes.",
            ].map((t) => (
              <li key={t} className="flex gap-2.5">
                <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-success" />
                <span className="leading-relaxed">{t}</span>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel>
          <PanelHead
            title="Related workflows"
            subtitle="Jump to another step"
            icon={<ArrowRight className="size-4" />}
          />
          <div className="space-y-2 px-6 pb-6">
            {[
              { l: `${m.label} register`, to: `${m.base}/list` },
              { l: `${m.label} analytics`, to: `${m.base}/analytics` },
              { l: `${m.label} dashboard`, to: m.base },
            ].map((x) => (
              <Link
                key={x.to}
                to={x.to}
                className="flex items-center justify-between rounded-xl border border-border px-4 py-3 text-[12.5px] font-medium transition-all hover:-translate-y-0.5 hover:shadow-soft"
              >
                {x.l}
                <ArrowRight className="size-3.5 text-muted-foreground" />
              </Link>
            ))}
          </div>
        </Panel>
      </div>
    </form>
  );
}

export function ModuleCreate({
  moduleKey,
  onSave,
}: {
  moduleKey: ModuleKey;
  onSave?: ((values: Record<string, string>) => Promise<{ id?: string } | void>) | undefined;
}) {
  const m = getModule(moduleKey);
  return (
    <div className="mx-auto max-w-[1600px] space-y-6">
      <Breadcrumbs
        moduleKey={moduleKey}
        trail={[
          { label: "Register", to: `${m.base}/list` },
          { label: `New ${m.singular.toLowerCase()}` },
        ]}
      />
      <PageHeader
        eyebrow={m.eyebrow}
        title={`Create ${m.singular.toLowerCase()}`}
        description={`Add a new ${m.singular.toLowerCase()} to the ${m.label.toLowerCase()} register with full audit tracking.`}
        actions={
          <ActionButton variant="ghost" to={`${m.base}/list` as never} icon={ArrowLeft}>
            Back to register
          </ActionButton>
        }
      />
      <WorkflowTabs moduleKey={moduleKey} active="create" />
      <RecordForm moduleKey={moduleKey} mode="create" onSave={onSave} />
    </div>
  );
}

export function ModuleEdit({
  moduleKey,
  id,
  record: liveRecord,
  loading = false,
  error = null,
  onSave,
}: {
  moduleKey: ModuleKey;
  id: string;
  record?: ModuleRecord | null;
  loading?: boolean;
  error?: string | null;
  onSave?: ((values: Record<string, string>) => Promise<{ id?: string } | void>) | undefined;
}) {
  const m = getModule(moduleKey);
  const fallback = liveRecord === undefined ? findRecord(moduleKey, id) : liveRecord;
  if (!fallback) {
    return (
      <div className="mx-auto max-w-[1600px] py-16">
        <EmptyState
          icon={<PencilLine className="size-6" />}
          title={
            error ? "Unable to load this record" : loading ? "Loading record…" : "Record not found"
          }
          hint={
            error ??
            (loading
              ? "Fetching the latest data from the server."
              : `No ${m.singular.toLowerCase()} matches ${id}.`)
          }
        />
      </div>
    );
  }
  const record = fallback;
  return (
    <div className="mx-auto max-w-[1600px] space-y-6">
      <Breadcrumbs
        moduleKey={moduleKey}
        trail={[
          { label: "Register", to: `${m.base}/list` },
          { label: record.title, to: `${m.base}/${record.id}` },
          { label: "Edit" },
        ]}
      />
      <PageHeader
        eyebrow={m.eyebrow}
        title={`Edit ${record.title}`}
        description={`Update ${m.singular.toLowerCase()} attributes, ownership and coverage. Every change is versioned.`}
        actions={
          <>
            <ActionButton
              variant="ghost"
              to={`${m.base}/${record.id}/history` as never}
              icon={History}
            >
              History
            </ActionButton>
            <ActionButton variant="ghost" to={`${m.base}/${record.id}` as never} icon={ArrowLeft}>
              Back to details
            </ActionButton>
          </>
        }
      />
      <RecordForm moduleKey={moduleKey} mode="edit" record={record} onSave={onSave} />
    </div>
  );
}

/* ---------------------------------- Details page ----------------------------------- */

export function ModuleDetails({
  moduleKey,
  id,
  record: liveRecord,
  loading = false,
  error = null,
}: {
  moduleKey: ModuleKey;
  id: string;
  /** Live record from the API; falls back to the configured record when omitted. */
  record?: ModuleRecord | null;
  loading?: boolean;
  error?: string | null;
}) {
  const m = getModule(moduleKey);
  const record = liveRecord === undefined ? findRecord(moduleKey, id) : liveRecord;
  if (!record) {
    return (
      <div className="mx-auto max-w-[1600px] py-16">
        <EmptyState
          icon={<ClipboardList className="size-6" />}
          title={
            error ? "Unable to load this record" : loading ? "Loading record…" : "Record not found"
          }
          hint={
            error ??
            (loading
              ? "Fetching the latest data from the server."
              : `No ${m.singular.toLowerCase()} matches ${id}.`)
          }
        />
      </div>
    );
  }
  const related = m.records.filter((r) => r.id !== record.id).slice(0, 4);

  return (
    <div className="mx-auto max-w-[1600px] space-y-6">
      <Breadcrumbs
        moduleKey={moduleKey}
        trail={[{ label: "Register", to: `${m.base}/list` }, { label: record.title }]}
      />

      <section className="relative overflow-hidden rounded-[28px] border border-border bg-surface p-8 shadow-float rise-in">
        <div className="absolute inset-0 gradient-mesh" />
        <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1fr)_auto]">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Pill tone={record.tone}>{record.status}</Pill>
              <Pill tone="neutral">{record.id}</Pill>
            </div>
            <h1 className="mt-3 text-[30px] font-bold leading-tight">{record.title}</h1>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">{record.subtitle}</p>
            <div className="mt-6 flex flex-wrap items-center gap-2">
              <ActionButton to={`${m.base}/${record.id}/edit` as never} icon={PencilLine}>
                Edit {m.singular.toLowerCase()}
              </ActionButton>
              <ActionButton
                variant="ghost"
                to={`${m.base}/${record.id}/history` as never}
                icon={History}
              >
                View history
              </ActionButton>
              <ActionButton variant="ghost" to={`${m.base}/analytics` as never} icon={ChartPie}>
                Analytics
              </ActionButton>
            </div>
          </div>
          <div className="self-center">
            <Ring value={record.score} size={116} sub={record.scoreLabel} />
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <Panel className="lg:col-span-2">
          <PanelHead
            title="Record details"
            subtitle="Master data and ownership"
            icon={<ClipboardList className="size-4" />}
          />
          <dl className="grid gap-3 px-6 pb-6 sm:grid-cols-2 sm:px-7">
            {record.meta.map((x) => (
              <div key={x.label} className="rounded-2xl border border-border px-4 py-3.5">
                <dt className="text-[11px] uppercase tracking-[0.1em] text-muted-foreground">
                  {x.label}
                </dt>
                <dd className="mt-1 truncate text-[13.5px] font-semibold">{x.value}</dd>
              </div>
            ))}
          </dl>
        </Panel>

        <Panel>
          <PanelHead
            title={record.scoreLabel}
            subtitle="Live performance index"
            icon={<TrendingUp className="size-4" />}
          />
          <div className="space-y-4 px-6 pb-6">
            <Meter
              value={record.score}
              tone={
                record.tone === "danger"
                  ? "danger"
                  : record.tone === "warning"
                    ? "warning"
                    : "success"
              }
            />
            <div className="h-[150px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={m.trend} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                  <defs>
                    <linearGradient id="detG" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.3} />
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
                  />
                  <Area
                    type="monotone"
                    dataKey="a"
                    name={m.seriesA}
                    stroke="var(--chart-1)"
                    strokeWidth={2.5}
                    fill="url(#detG)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Panel>

        <Panel className="lg:col-span-2">
          <PanelHead
            title="Recent activity"
            subtitle="Latest five audit events"
            icon={<History className="size-4" />}
            action={
              <Link
                to={`${m.base}/${record.id}/history` as never}
                className="text-[12px] font-semibold text-primary"
              >
                Full history
              </Link>
            }
          />
          <ul className="space-y-4 px-7 pb-7">
            {record.timeline.map((t) => (
              <li key={t.when} className="flex gap-3">
                <span
                  className={cn(
                    "mt-1.5 size-2 shrink-0 rounded-full",
                    t.tone === "success"
                      ? "bg-success"
                      : t.tone === "danger"
                        ? "bg-danger"
                        : t.tone === "warning"
                          ? "bg-warning"
                          : t.tone === "violet"
                            ? "bg-violet"
                            : "bg-primary",
                  )}
                />
                <p className="text-[12.5px] leading-relaxed text-muted-foreground">
                  <span className="font-semibold text-foreground">{t.who}</span> {t.what}
                  <span className="mt-0.5 block text-[11px] text-muted-foreground/80">
                    {t.when}
                  </span>
                </p>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel>
          <PanelHead
            title={`Related ${m.label.toLowerCase()}`}
            subtitle="Jump across the register"
            icon={<ArrowRight className="size-4" />}
          />
          <div className="space-y-2 px-6 pb-6">
            {related.map((r) => (
              <Link
                key={r.id}
                to={`${m.base}/${r.id}` as never}
                className="flex items-center justify-between gap-3 rounded-2xl border border-border px-4 py-3 transition-all hover:-translate-y-0.5 hover:shadow-soft"
              >
                <span className="min-w-0">
                  <span className="block truncate text-[12.5px] font-semibold">{r.title}</span>
                  <span className="block truncate text-[11px] text-muted-foreground">
                    {r.subtitle}
                  </span>
                </span>
                <Pill tone={r.tone}>{r.score}</Pill>
              </Link>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}

/* ---------------------------------- History page ----------------------------------- */

export function ModuleHistory({ moduleKey, id }: { moduleKey: ModuleKey; id: string }) {
  const m = getModule(moduleKey);
  const record = findRecord(moduleKey, id);
  const audit = [
    {
      at: "03 Aug 2026 · 09:12",
      actor: "Emilia Greene",
      action: "Field updated",
      detail: "Status changed to " + record.status,
      tone: "primary" as const,
    },
    {
      at: "02 Aug 2026 · 16:40",
      actor: "System",
      action: "Index recalculated",
      detail: `${record.scoreLabel} set to ${record.score}`,
      tone: "violet" as const,
    },
    {
      at: "28 Jul 2026 · 11:05",
      actor: "Sara Aldrin",
      action: "Document attached",
      detail: "vendor-service-report.pdf",
      tone: "success" as const,
    },
    {
      at: "19 Jul 2026 · 08:22",
      actor: "Jonas Weber",
      action: "Compliance review",
      detail: "Passed quarterly audit checklist",
      tone: "warning" as const,
    },
    {
      at: "04 Jul 2026 · 14:58",
      actor: "Anita Raghavan",
      action: "Owner reassigned",
      detail: "Transferred to biomedical team",
      tone: "primary" as const,
    },
    {
      at: "21 Jun 2026 · 10:31",
      actor: "Emilia Greene",
      action: "Record created",
      detail: `${record.title} added to register`,
      tone: "neutral" as const,
    },
  ];

  return (
    <div className="mx-auto max-w-[1600px] space-y-6">
      <Breadcrumbs
        moduleKey={moduleKey}
        trail={[
          { label: "Register", to: `${m.base}/list` },
          { label: record.title, to: `${m.base}/${record.id}` },
          { label: "History" },
        ]}
      />
      <PageHeader
        eyebrow={m.eyebrow}
        title={`${record.title} — history`}
        description="Immutable audit trail of every change, review and attachment for this record."
        actions={
          <>
            <ActionButton variant="ghost" icon={Download}>
              Export log
            </ActionButton>
            <ActionButton to={`${m.base}/${record.id}` as never} icon={ArrowLeft}>
              Back to details
            </ActionButton>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Panel className="lg:col-span-2" interactive={false}>
          <PanelHead
            title="Audit trail"
            subtitle={`${audit.length} events recorded`}
            icon={<History className="size-4" />}
          />
          <ol className="relative space-y-6 px-7 pb-8">
            <span className="absolute left-[35px] top-2 bottom-8 w-px bg-border" />
            {audit.map((a) => (
              <li key={a.at} className="relative flex gap-4">
                <span
                  className={cn(
                    "relative z-10 mt-1 size-3 shrink-0 rounded-full ring-4",
                    a.tone === "success"
                      ? "bg-success ring-success-soft"
                      : a.tone === "warning"
                        ? "bg-warning ring-warning-soft"
                        : a.tone === "violet"
                          ? "bg-violet ring-violet-soft"
                          : a.tone === "neutral"
                            ? "bg-muted-foreground ring-muted"
                            : "bg-primary ring-primary-soft",
                  )}
                />
                <div className="min-w-0 flex-1 rounded-2xl border border-border px-4 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-[13px] font-semibold">{a.action}</p>
                    <span className="text-[11px] text-muted-foreground">{a.at}</span>
                  </div>
                  <p className="mt-1 text-[12.5px] text-muted-foreground">{a.detail}</p>
                  <p className="mt-1.5 text-[11px] text-muted-foreground/80">by {a.actor}</p>
                </div>
              </li>
            ))}
          </ol>
        </Panel>

        <div className="space-y-6">
          <Panel>
            <PanelHead
              title="Change summary"
              subtitle="Last 90 days"
              icon={<TrendingUp className="size-4" />}
            />
            <div className="space-y-3 px-6 pb-6">
              {[
                { l: "Field updates", v: 18, t: "primary" },
                { l: "Reviews passed", v: 6, t: "success" },
                { l: "Escalations", v: 2, t: "warning" },
              ].map((s) => (
                <div key={s.l} className="rounded-2xl border border-border p-4">
                  <div className="flex justify-between text-[12.5px]">
                    <span className="font-medium">{s.l}</span>
                    <span className="font-semibold tabular-nums">{s.v}</span>
                  </div>
                  <div className="mt-2.5">
                    <Meter value={s.v * 5} tone={s.t} />
                  </div>
                </div>
              ))}
            </div>
          </Panel>
          <Panel>
            <PanelHead
              title="Next steps"
              subtitle="Recommended workflow"
              icon={<Sparkles className="size-4" />}
            />
            <div className="space-y-2 px-6 pb-6">
              {[
                { l: `Edit ${m.singular.toLowerCase()}`, to: `${m.base}/${record.id}/edit` },
                { l: "Open analytics", to: `${m.base}/analytics` },
                { l: "Back to register", to: `${m.base}/list` },
              ].map((x) => (
                <Link
                  key={x.to}
                  to={x.to}
                  className="flex items-center justify-between rounded-xl border border-border px-4 py-3 text-[12.5px] font-medium transition-all hover:-translate-y-0.5 hover:shadow-soft"
                >
                  {x.l}
                  <ArrowRight className="size-3.5 text-muted-foreground" />
                </Link>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

/* --------------------------------- Analytics page ---------------------------------- */

export function ModuleAnalytics({ moduleKey }: { moduleKey: ModuleKey }) {
  const m = getModule(moduleKey);

  // Call register list hooks to fetch live records for comparative charts and top performers
  const eqList = useEquipmentList({ limit: 100 });
  const compList = useComplaintList({ limit: 100 });
  const maintList = useMaintenanceList({ limit: 100 });
  const warrList = useWarrantyList({ limit: 100 });
  const invList = useInventoryList({ limit: 100 });
  const poList = usePurchaseOrderList({ limit: 100 });
  const vendList = useVendorList({ limit: 100 });
  const deptList = useDepartmentList();
  const usrList = useUserList();

  const liveRecords = (() => {
    if (!apiEnabled) return null;
    if (moduleKey === "equipment") return eqList.records;
    if (moduleKey === "complaints") return compList.records;
    if (moduleKey === "maintenance") return maintList.records;
    if (moduleKey === "warranty") return warrList.records;
    if (moduleKey === "inventory") return invList.records;
    if (moduleKey === "purchase-orders") return poList.records;
    if (moduleKey === "vendors") return vendList.records;
    if (moduleKey === "departments") return deptList.records;
    if (moduleKey === "users") return usrList.records;
    return null;
  })();

  const activeRecords = apiEnabled && liveRecords ? liveRecords : m.records;
  const activeTop = [...activeRecords].sort((a, b) => b.score - a.score).slice(0, 5);

  // Fetch live stats & distribution breakdowns
  const { mappedData, loading } = useModuleAnalytics(moduleKey);
  const activeStats = apiEnabled && mappedData?.stats ? mappedData.stats : m.stats;
  const activeBreakdown = apiEnabled && mappedData?.breakdown ? mappedData.breakdown : m.breakdown;

  return (
    <div className="mx-auto max-w-[1600px] space-y-6">
      <PageHeader
        eyebrow={m.eyebrow}
        title={`${m.label} analytics`}
        description={`Performance, distribution and trend intelligence for ${m.label.toLowerCase()}.`}
        actions={
          <>
            <ActionButton variant="ghost" icon={Download}>
              Export report
            </ActionButton>
            <ActionButton to={`${m.base}/list` as never} icon={ListFilter}>
              Open register
            </ActionButton>
          </>
        }
      />
      <WorkflowTabs moduleKey={moduleKey} active="analytics" />
      <StatCards moduleKey={moduleKey} stats={activeStats} />

      <div className="grid gap-6 lg:grid-cols-3">
        <Panel className="lg:col-span-2">
          <PanelHead
            title="Trend analysis"
            subtitle={`${m.seriesA} vs ${m.seriesB}`}
            icon={<TrendingUp className="size-4" />}
          />
          <div className="h-[280px] px-2 pb-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={m.trend} margin={{ top: 10, right: 24, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="anaA" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.32} />
                    <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="anaB" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--chart-4)" stopOpacity={0.28} />
                    <stop offset="100%" stopColor="var(--chart-4)" stopOpacity={0} />
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
                  width={34}
                  stroke="var(--muted-foreground)"
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 14,
                    fontSize: 12,
                    border: "1px solid var(--border)",
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area
                  type="monotone"
                  dataKey="a"
                  name={m.seriesA}
                  stroke="var(--chart-1)"
                  strokeWidth={2.5}
                  fill="url(#anaA)"
                />
                <Area
                  type="monotone"
                  dataKey="b"
                  name={m.seriesB}
                  stroke="var(--chart-4)"
                  strokeWidth={2.5}
                  fill="url(#anaB)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel>
          <PanelHead
            title="Distribution"
            subtitle="Composition of the portfolio"
            icon={<ChartPie className="size-4" />}
          />
          <div className="h-[260px] px-2 pb-4">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={activeBreakdown}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={52}
                  outerRadius={82}
                  paddingAngle={3}
                >
                  {m.breakdown.map((_, i) => (
                    <Cell key={i} fill={chartColors[i % chartColors.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    borderRadius: 14,
                    fontSize: 12,
                    border: "1px solid var(--border)",
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel className="lg:col-span-2">
          <PanelHead
            title="Comparative performance"
            subtitle="Score by record"
            icon={<ChartPie className="size-4" />}
          />
          <div className="h-[260px] px-2 pb-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={activeRecords.map((r) => ({ name: r.id, score: r.score }))}
                barGap={6}
              >
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
                <Bar dataKey="score" fill="var(--chart-1)" radius={[6, 6, 0, 0]} maxBarSize={26} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel>
          <PanelHead
            title="Top performers"
            subtitle="Highest scoring records"
            icon={<TrendingUp className="size-4" />}
          />
          <div className="space-y-2 px-6 pb-6">
            {activeTop.map((r) => (
              <Link
                key={r.id}
                to={`${m.base}/${r.id}` as never}
                className="flex items-center justify-between gap-3 rounded-2xl border border-border px-4 py-3 transition-all hover:-translate-y-0.5 hover:shadow-soft"
              >
                <span className="min-w-0">
                  <span className="block truncate text-[12.5px] font-semibold">{r.title}</span>
                  <span className="block truncate text-[11px] text-muted-foreground">
                    {r.subtitle}
                  </span>
                </span>
                <Pill tone={r.tone}>{r.score}</Pill>
              </Link>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}

/* -------------------------- Dashboard workflow strip (reusable) -------------------------- */

export function WorkflowStrip({ moduleKey }: { moduleKey: ModuleKey }) {
  const m = getModule(moduleKey);
  const links = [
    { l: "Register", d: "Browse every record", to: `${m.base}/list`, icon: ListFilter },
    { l: `New ${m.singular.toLowerCase()}`, d: "Create a record", to: `${m.base}/new`, icon: Plus },
    { l: "Analytics", d: "Trends and breakdowns", to: `${m.base}/analytics`, icon: ChartPie },
    {
      l: "Audit history",
      d: "Recent change log",
      to: `${m.base}/${m.records[0]!.id}/history`,
      icon: History,
    },
  ];
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {links.map((x) => (
        <Link key={x.to} to={x.to} className="block">
          <Panel className="h-full">
            <div className="flex items-center gap-3.5 p-5">
              <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary-soft text-primary">
                <x.icon className="size-[18px]" />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[13.5px] font-semibold">{x.l}</span>
                <span className="block truncate text-[11.5px] text-muted-foreground">{x.d}</span>
              </span>
              <ArrowRight className="ml-auto size-4 shrink-0 text-muted-foreground" />
            </div>
          </Panel>
        </Link>
      ))}
    </div>
  );
}
