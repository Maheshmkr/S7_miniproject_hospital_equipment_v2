import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  ClipboardCheck,
  FlaskConical,
  Image as ImageIcon,
  Microscope,
  Package,
  PlayCircle,
  Search,
  ShieldCheck,
  Stethoscope,
} from "lucide-react";
import { toast } from "sonner";
import { Panel, PanelHead, PageHeader, Pill, Meter, EmptyState } from "@/components/ui/primitives";
import {
  ActionBtn,
  AuditTrail,
  Crumbs,
  DefRow,
  Field,
  StageTracker,
  StatusPill,
  inputCls,
} from "./kit";
import { useLifecycle, useResolvedChecklist, useWorkOrder } from "@/lib/lifecycle/store";
import { actions, checklistGaps, isAnswered } from "@/lib/lifecycle/repository";
import {
  rootCauseCategories,
  type ChecklistItem,
  type PartUsed,
  type RootCause,
} from "@/lib/lifecycle/types";

function useWo(id: string) {
  const { state, run } = useLifecycle();
  const { workOrder, asset, complaint, report } = useWorkOrder(id);
  const events = useMemo(
    () =>
      state.events.filter(
        (e) => e.recordId === id || (workOrder && e.equipmentId === workOrder.equipmentId),
      ),
    [state.events, id, workOrder],
  );
  return { workOrder, asset, complaint, report, events, run };
}

function Missing({ id }: { id: string }) {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Maintenance"
        title="Work order not found"
        description={`No work order matches ${id}.`}
      />
      <Panel>
        <EmptyState
          icon={<Search className="size-6" />}
          title="Nothing to show"
          hint="Return to the maintenance register and pick an active work order."
          action={<ActionBtn to="/maintenance/list">Maintenance register</ActionBtn>}
        />
      </Panel>
    </div>
  );
}

function Shell({
  id,
  step,
  title,
  description,
  children,
}: {
  id: string;
  step: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  const { workOrder, asset, complaint } = useWo(id);
  if (!workOrder) return <Missing id={id} />;
  return (
    <div className="space-y-6">
      <Crumbs
        trail={[
          { label: "Maintenance", to: "/maintenance" },
          { label: workOrder.id, to: `/maintenance/${workOrder.id}` },
          { label: step },
        ]}
      />
      <PageHeader
        eyebrow={`${workOrder.type} · ${workOrder.id}`}
        title={title}
        description={description}
        actions={
          <div className="flex items-center gap-2">
            {asset ? <StatusPill status={asset.status} /> : null}
            {complaint ? <Pill tone="primary">{complaint.id}</Pill> : null}
          </div>
        }
      />
      <StageTracker stage={workOrder.stage} workOrderId={workOrder.id} />
      {children}
    </div>
  );
}

function ContextPanel({ id }: { id: string }) {
  const { workOrder, asset, complaint } = useWo(id);
  if (!workOrder || !asset) return null;
  return (
    <Panel>
      <PanelHead
        title="Linked records"
        subtitle="One shared dataset across equipment, complaint and maintenance."
        icon={<Stethoscope className="size-4" />}
      />
      <dl className="px-6 pb-6 sm:px-7">
        <DefRow label="Equipment" value={`${asset.id} · ${asset.name}`} />
        <DefRow label="Department" value={asset.department} />
        <DefRow label="Current status" value={<StatusPill status={asset.status} />} />
        <DefRow
          label="Complaint"
          value={complaint ? `${complaint.id} · ${complaint.title}` : "Preventive — no complaint"}
        />
        <DefRow label="Reported by" value={complaint?.reportedBy ?? "Scheduled by system"} />
        <DefRow label="Engineer" value={workOrder.engineer} />
        <DefRow label="Preventive due" value={asset.nextPreventive} />
      </dl>
    </Panel>
  );
}

/* ------------------------------- Investigation -------------------------------- */

export function InvestigationPage({ id }: { id: string }) {
  const { workOrder, asset, events, run } = useWo(id);
  const navigate = useNavigate();
  const [isolated, setIsolated] = useState(false);
  const [ppe, setPpe] = useState(false);
  const [observed, setObserved] = useState("");

  if (!workOrder) return <Missing id={id} />;
  const started = workOrder.startedAt;

  return (
    <Shell
      id={id}
      step="Investigation"
      title="Start investigation"
      description="Confirm safe isolation, capture the observed problem and put the asset under maintenance."
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Panel>
          <PanelHead
            title="Safety attestation & observed problem"
            subtitle="Required before any technical work begins."
            icon={<PlayCircle className="size-4" />}
          />
          <div className="space-y-5 px-6 pb-6 sm:px-7">
            {[
              {
                on: isolated,
                set: setIsolated,
                label: "Asset isolated from patient use and electrically safe",
              },
              { on: ppe, set: setPpe, label: "PPE worn and infection-control clearance obtained" },
            ].map((c) => (
              <button
                key={c.label}
                onClick={() => c.set(!c.on)}
                className="flex w-full items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 text-left text-[13px] transition-colors hover:bg-surface-muted"
              >
                <span
                  className={`grid size-5 place-items-center rounded-md border ${c.on ? "border-primary bg-primary text-white" : "border-border-strong"}`}
                >
                  {c.on ? "✓" : ""}
                </span>
                {c.label}
              </button>
            ))}
            <Field
              label="Observed problem"
              hint="What the engineer sees on arrival — this feeds the root cause analysis."
            >
              <textarea
                rows={4}
                className={inputCls}
                value={observed}
                onChange={(e) => setObserved(e.target.value)}
                placeholder="e.g. Visible banding and signal loss on T2 sequences reproduced on phantom scan."
              />
            </Field>
            <div className="flex flex-wrap gap-2">
              <ActionBtn
                disabled={!isolated || !ppe || observed.trim().length < 8}
                onClick={() => {
                  run((s, a) => {
                    let next = actions.startInvestigation(s, a, id);
                    const wo = next.workOrders.find((w) => w.id === id);
                    if (wo) {
                      next = {
                        ...next,
                        workOrders: next.workOrders.map((w) =>
                          w.id === id
                            ? {
                                ...w,
                                rootCause: {
                                  ...(w.rootCause ?? {
                                    diagnosticFindings: "",
                                    category: "Calibration drift",
                                    description: "",
                                    contributingFactor: "",
                                    evidenceNote: "",
                                    correctiveAction: "",
                                    preventiveAction: "",
                                  }),
                                  problemObserved: observed,
                                } as RootCause,
                              }
                            : w,
                        ),
                      };
                    }
                    return next;
                  });
                  toast.success("Investigation started — asset moved to Under Maintenance");
                  void navigate({ to: `/maintenance/${id}/checklist` as never });
                }}
              >
                Start investigation
              </ActionBtn>
              <ActionBtn variant="ghost" to={`/maintenance/${id}/checklist`}>
                Skip to checklist
              </ActionBtn>
            </div>
            {started ? (
              <p className="text-[12px] text-muted-foreground">
                Investigation already started. Equipment status: <strong>{asset?.status}</strong>.
              </p>
            ) : null}
          </div>
        </Panel>
        <ContextPanel id={id} />
      </div>
      <AuditTrail events={events.slice(0, 8)} />
    </Shell>
  );
}

/* -------------------------------- Checklist ---------------------------------- */

const priorityTone: Record<string, "neutral" | "primary" | "warning" | "danger"> = {
  Low: "neutral",
  Medium: "primary",
  High: "warning",
  Critical: "danger",
};

function ChecklistAnswer({
  item,
  onChange,
}: {
  item: ChecklistItem;
  onChange: (patch: Partial<ChecklistItem>) => void;
}) {
  const type = item.responseType ?? "passfail";
  if (type === "passfail" || type === "yesno") {
    const opts =
      type === "passfail"
        ? ([
            ["pass", "Pass"],
            ["fail", "Fail"],
            ["na", "N/A"],
          ] as const)
        : ([
            ["pass", "Yes"],
            ["fail", "No"],
            ["na", "N/A"],
          ] as const);
    return (
      <div className="mt-3 flex flex-wrap gap-2">
        {opts.map(([r, label]) => (
          <button
            key={r}
            onClick={() => onChange({ result: r, value: label })}
            className={`rounded-xl px-3 py-1.5 text-[12px] font-semibold transition-colors ${
              item.result === r
                ? r === "pass"
                  ? "bg-success-soft text-success"
                  : r === "fail"
                    ? "bg-danger-soft text-danger"
                    : "bg-muted text-muted-foreground"
                : "border border-border text-muted-foreground hover:bg-surface-muted"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    );
  }
  if (type === "dropdown") {
    return (
      <select
        className={`${inputCls} mt-3`}
        value={item.value ?? ""}
        onChange={(e) => onChange({ value: e.target.value, result: "pass" })}
      >
        <option value="">Select a response…</option>
        {(item.options ?? []).map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    );
  }
  if (type === "evidence") {
    return (
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <input
          className={`${inputCls} flex-1`}
          placeholder="Evidence file name (e.g. qa-phantom-log.pdf)"
          value={item.value ?? ""}
          onChange={(e) => onChange({ value: e.target.value, result: "pass" })}
        />
        <span className="text-[11.5px] text-muted-foreground">Attach in the Evidence step</span>
      </div>
    );
  }
  return (
    <input
      type={type === "number" ? "number" : type === "date" ? "date" : "text"}
      className={`${inputCls} mt-3`}
      placeholder={type === "number" ? "Measured value" : "Recorded response"}
      value={item.value ?? ""}
      onChange={(e) => onChange({ value: e.target.value, result: "pass" })}
    />
  );
}

export function ChecklistPage({ id }: { id: string }) {
  const { workOrder, run } = useWo(id);
  const configured = useResolvedChecklist(
    workOrder?.equipmentId ?? "",
    workOrder?.type,
    workOrder?.checklist ?? [],
  );
  const navigate = useNavigate();
  const [items, setItems] = useState<ChecklistItem[]>(configured);
  if (!workOrder) return <Missing id={id} />;

  const answered = items.filter(isAnswered).length;
  const failed = items.filter((i) => i.result === "fail").length;
  const gaps = checklistGaps(items);
  const patch = (itemId: string, p: Partial<ChecklistItem>) =>
    setItems((prev) => prev.map((x) => (x.id === itemId ? { ...x, ...p } : x)));

  return (
    <Shell
      id={id}
      step="Checklist"
      title="Diagnostic checklist"
      description="Questions are defined by the administrator for this equipment category and asset. Record every observation."
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Panel>
          <PanelHead
            title="Configured diagnostic steps"
            subtitle={`${answered} of ${items.length} recorded · ${failed} failed · ${gaps.length} required outstanding`}
            icon={<ClipboardCheck className="size-4" />}
            action={
              <Pill tone={failed ? "danger" : "success"}>
                {failed ? `${failed} fault(s) found` : "No faults yet"}
              </Pill>
            }
          />
          <div className="space-y-4 px-6 pb-6 sm:px-7">
            <Meter
              value={items.length ? (answered / items.length) * 100 : 0}
              tone={failed ? "warning" : "success"}
            />
            {items.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-border p-6 text-center text-[13px] text-muted-foreground">
                No checklist questions are configured for this equipment category. An administrator
                can add them from the equipment maintenance configuration page.
              </p>
            ) : null}
            {items.map((item, i) => (
              <div
                key={item.id}
                className={`rounded-2xl border p-4 ${
                  item.required && !isAnswered(item)
                    ? "border-warning/50 bg-warning-soft/30"
                    : "border-border"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="text-[13px] font-semibold text-foreground">
                    {i + 1}. {item.label}
                    {item.required ? <span className="ml-1 text-danger">*</span> : null}
                  </p>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {item.priority ? (
                      <Pill tone={priorityTone[item.priority] ?? "neutral"}>{item.priority}</Pill>
                    ) : null}
                    <Pill tone={item.scope === "equipment" ? "violet" : "neutral"}>
                      {item.scope === "equipment" ? "Asset specific" : "Category"}
                    </Pill>
                  </div>
                </div>
                {item.helpText ? (
                  <p className="mt-1 text-[11.5px] text-muted-foreground">{item.helpText}</p>
                ) : null}
                <ChecklistAnswer item={item} onChange={(p) => patch(item.id, p)} />
                <input
                  className={`${inputCls} mt-3`}
                  placeholder="Observation / measured value"
                  value={item.note ?? ""}
                  onChange={(e) => patch(item.id, { note: e.target.value })}
                />
              </div>
            ))}
            {gaps.length ? (
              <p className="text-[12px] font-semibold text-warning">
                {gaps.length} required question(s) still need a response before the checklist can be
                completed.
              </p>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <ActionBtn
                disabled={answered === 0 || gaps.length > 0}
                onClick={() => {
                  run((s, a) => actions.saveChecklist(s, a, id, items));
                  toast.success("Diagnostic checklist recorded");
                  void navigate({ to: `/maintenance/${id}/root-cause` as never });
                }}
              >
                Save & continue to root cause
              </ActionBtn>
              <ActionBtn
                variant="ghost"
                onClick={() => {
                  run((s, a) => actions.saveChecklist(s, a, id, items));
                  toast.success("Progress saved");
                }}
              >
                Save progress
              </ActionBtn>
              <ActionBtn variant="ghost" to={`/maintenance/${id}`}>
                Back to work order
              </ActionBtn>
            </div>
          </div>
        </Panel>
        <ContextPanel id={id} />
      </div>
    </Shell>
  );
}

/* -------------------------------- Root cause ---------------------------------- */

const emptyRootCause: RootCause = {
  problemObserved: "",
  diagnosticFindings: "",
  category: "Calibration drift",
  description: "",
  contributingFactor: "",
  evidenceNote: "",
  correctiveAction: "",
  preventiveAction: "",
};

export function RootCausePage({ id }: { id: string }) {
  const { workOrder, run } = useWo(id);
  const navigate = useNavigate();
  const [form, setForm] = useState<RootCause>(workOrder?.rootCause ?? emptyRootCause);
  if (!workOrder) return <Missing id={id} />;

  const set = (k: keyof RootCause, v: string) => setForm((p) => ({ ...p, [k]: v }) as RootCause);
  const failedChecks = workOrder.checklist.filter((c) => c.result === "fail");

  return (
    <Shell
      id={id}
      step="Root cause"
      title="Root cause analysis"
      description="Record why the failure happened, what contributed to it, and the corrective and preventive actions."
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Panel>
          <PanelHead
            title="Structured RCA"
            subtitle="All fields feed the service report, audit and analytics."
            icon={<Microscope className="size-4" />}
          />
          <div className="grid gap-5 px-6 pb-6 sm:px-7">
            <Field label="Problem observed">
              <textarea
                rows={2}
                className={inputCls}
                value={form.problemObserved}
                onChange={(e) => set("problemObserved", e.target.value)}
                placeholder="MRI image quality degraded."
              />
            </Field>
            <Field
              label="Diagnostic findings"
              hint={
                failedChecks.length
                  ? `Failed checks: ${failedChecks.map((c) => c.label).join("; ")}`
                  : undefined
              }
            >
              <textarea
                rows={2}
                className={inputCls}
                value={form.diagnosticFindings}
                onChange={(e) => set("diagnosticFindings", e.target.value)}
                placeholder="Calibration drift detected on centre frequency."
              />
            </Field>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Root cause category">
                <select
                  className={inputCls}
                  value={form.category}
                  onChange={(e) => set("category", e.target.value)}
                >
                  {rootCauseCategories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Contributing factor">
                <input
                  className={inputCls}
                  value={form.contributingFactor}
                  onChange={(e) => set("contributingFactor", e.target.value)}
                  placeholder="Preventive calibration overdue."
                />
              </Field>
            </div>
            <Field label="Root cause description">
              <textarea
                rows={2}
                className={inputCls}
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                placeholder="Gradient calibration drifted outside tolerance."
              />
            </Field>
            <Field label="Supporting evidence">
              <input
                className={inputCls}
                value={form.evidenceNote}
                onChange={(e) => set("evidenceNote", e.target.value)}
                placeholder="Phantom QA log, before/after scan images."
              />
            </Field>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Corrective action">
                <textarea
                  rows={2}
                  className={inputCls}
                  value={form.correctiveAction}
                  onChange={(e) => set("correctiveAction", e.target.value)}
                  placeholder="Calibration performed."
                />
              </Field>
              <Field label="Preventive action">
                <textarea
                  rows={2}
                  className={inputCls}
                  value={form.preventiveAction}
                  onChange={(e) => set("preventiveAction", e.target.value)}
                  placeholder="Move calibration to a 6-month cycle."
                />
              </Field>
            </div>
            <div className="flex flex-wrap gap-2">
              <ActionBtn
                disabled={!form.problemObserved || !form.description || !form.correctiveAction}
                onClick={() => {
                  run((s, a) => actions.saveRootCause(s, a, id, form));
                  toast.success("Root cause recorded");
                  void navigate({ to: `/maintenance/${id}/corrective-action` as never });
                }}
              >
                Save root cause
              </ActionBtn>
              <ActionBtn variant="ghost" to={`/maintenance/${id}/checklist`}>
                Back to checklist
              </ActionBtn>
            </div>
          </div>
        </Panel>
        <ContextPanel id={id} />
      </div>
    </Shell>
  );
}

/* ----------------------------- Corrective action ------------------------------ */

export function CorrectiveActionPage({ id }: { id: string }) {
  const { workOrder, run } = useWo(id);
  const navigate = useNavigate();
  const [parts, setParts] = useState<PartUsed[]>(workOrder?.parts ?? []);
  const [tools, setTools] = useState((workOrder?.tools ?? []).join(", "));
  const [duration, setDuration] = useState(String(workOrder?.durationMins ?? 90));
  const [awaiting, setAwaiting] = useState(false);
  const [draft, setDraft] = useState<PartUsed>({ name: "", partNo: "", qty: 1, cost: 0 });
  if (!workOrder) return <Missing id={id} />;

  return (
    <Shell
      id={id}
      step="Corrective action"
      title="Corrective action, parts & materials"
      description="Log the repair carried out, the spares consumed, tools used and time on task."
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <Panel>
            <PanelHead
              title="Parts & materials used"
              subtitle="Consumption feeds maintenance cost analytics."
              icon={<Package className="size-4" />}
            />
            <div className="space-y-4 px-6 pb-6 sm:px-7">
              {parts.length ? (
                <div className="overflow-hidden rounded-2xl border border-border">
                  <table className="w-full text-[12.5px]">
                    <thead className="bg-surface-muted text-muted-foreground">
                      <tr>
                        <th className="px-4 py-2.5 text-left font-semibold">Part</th>
                        <th className="px-4 py-2.5 text-left font-semibold">Part no.</th>
                        <th className="px-4 py-2.5 text-right font-semibold">Qty</th>
                        <th className="px-4 py-2.5 text-right font-semibold">Cost</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parts.map((p, i) => (
                        <tr key={i} className="border-t border-border">
                          <td className="px-4 py-2.5 font-medium text-foreground">{p.name}</td>
                          <td className="px-4 py-2.5 text-muted-foreground">{p.partNo}</td>
                          <td className="px-4 py-2.5 text-right tabular-nums">{p.qty}</td>
                          <td className="px-4 py-2.5 text-right tabular-nums">
                            ${(p.cost * p.qty).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-[12.5px] text-muted-foreground">No parts recorded yet.</p>
              )}
              <div className="grid gap-3 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_80px_100px_auto]">
                <input
                  className={inputCls}
                  placeholder="Part name"
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                />
                <input
                  className={inputCls}
                  placeholder="Part no."
                  value={draft.partNo}
                  onChange={(e) => setDraft({ ...draft, partNo: e.target.value })}
                />
                <input
                  className={inputCls}
                  type="number"
                  min={1}
                  value={draft.qty}
                  onChange={(e) => setDraft({ ...draft, qty: Number(e.target.value) })}
                />
                <input
                  className={inputCls}
                  type="number"
                  min={0}
                  value={draft.cost}
                  onChange={(e) => setDraft({ ...draft, cost: Number(e.target.value) })}
                />
                <ActionBtn
                  variant="ghost"
                  onClick={() => {
                    if (!draft.name) return;
                    setParts((p) => [...p, draft]);
                    setDraft({ name: "", partNo: "", qty: 1, cost: 0 });
                  }}
                >
                  Add
                </ActionBtn>
              </div>
            </div>
          </Panel>
          <Panel>
            <PanelHead title="Work performed" subtitle="Tools, duration and parts availability." />
            <div className="grid gap-5 px-6 pb-6 sm:px-7 sm:grid-cols-2">
              <Field label="Tools used">
                <input
                  className={inputCls}
                  value={tools}
                  onChange={(e) => setTools(e.target.value)}
                  placeholder="Torque set, calibration phantom"
                />
              </Field>
              <Field label="Maintenance duration (minutes)">
                <input
                  className={inputCls}
                  type="number"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                />
              </Field>
              <label className="flex items-center gap-3 text-[13px]">
                <input
                  type="checkbox"
                  checked={awaiting}
                  onChange={(e) => setAwaiting(e.target.checked)}
                />
                Repair paused — awaiting spare parts
              </label>
              <div className="flex items-end gap-2">
                <ActionBtn
                  onClick={() => {
                    run((s, a) =>
                      actions.saveCorrectiveAction(s, a, id, {
                        parts,
                        tools: tools
                          .split(",")
                          .map((t) => t.trim())
                          .filter(Boolean),
                        durationMins: Number(duration) || 0,
                        awaitingParts: awaiting,
                      }),
                    );
                    toast.success("Corrective action recorded");
                    void navigate({ to: `/maintenance/${id}/uploads` as never });
                  }}
                >
                  Save & upload evidence
                </ActionBtn>
              </div>
            </div>
          </Panel>
        </div>
        <ContextPanel id={id} />
      </div>
    </Shell>
  );
}

/* --------------------------------- Evidence ----------------------------------- */

export function UploadsPage({ id }: { id: string }) {
  const { workOrder, run } = useWo(id);
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [phase, setPhase] = useState<"before" | "after" | "document">("before");
  if (!workOrder) return <Missing id={id} />;

  return (
    <Shell
      id={id}
      step="Evidence"
      title="Upload photos & documents"
      description="Attach before/after imagery, instrument printouts and vendor paperwork."
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Panel>
          <PanelHead
            title="Evidence library"
            subtitle={`${workOrder.evidence.length} item(s) attached to ${workOrder.id}`}
            icon={<ImageIcon className="size-4" />}
          />
          <div className="space-y-4 px-6 pb-6 sm:px-7">
            <div className="grid gap-3 sm:grid-cols-3">
              {workOrder.evidence.map((e, i) => (
                <div key={i} className="rounded-2xl border border-border p-4">
                  <Pill
                    tone={
                      e.phase === "before" ? "warning" : e.phase === "after" ? "success" : "neutral"
                    }
                  >
                    {e.phase}
                  </Pill>
                  <p className="mt-2 truncate text-[13px] font-semibold text-foreground">
                    {e.name}
                  </p>
                  <p className="text-[11.5px] text-muted-foreground">{e.when}</p>
                </div>
              ))}
              {workOrder.evidence.length === 0 ? (
                <p className="text-[12.5px] text-muted-foreground">No evidence uploaded yet.</p>
              ) : null}
            </div>
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_auto]">
              <input
                className={inputCls}
                placeholder="File name e.g. mri-coil-after.jpg"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <select
                className={inputCls}
                value={phase}
                onChange={(e) => setPhase(e.target.value as typeof phase)}
              >
                <option value="before">Before</option>
                <option value="after">After</option>
                <option value="document">Document</option>
              </select>
              <ActionBtn
                disabled={!name.trim()}
                onClick={() => {
                  run((s, a) =>
                    actions.addEvidence(s, a, id, [
                      {
                        name,
                        kind: phase === "document" ? "Document" : "Image",
                        when: new Date().toLocaleDateString("en-GB"),
                        phase,
                      },
                    ]),
                  );
                  setName("");
                  toast.success("Evidence attached");
                }}
              >
                Attach
              </ActionBtn>
            </div>
            <ActionBtn
              variant="ghost"
              onClick={() => void navigate({ to: `/maintenance/${id}/testing` as never })}
            >
              Continue to testing
            </ActionBtn>
          </div>
        </Panel>
        <ContextPanel id={id} />
      </div>
    </Shell>
  );
}

/* ------------------------------ Testing / verify ------------------------------- */

export function TestingPage({ id }: { id: string }) {
  const { workOrder, run } = useWo(id);
  const navigate = useNavigate();
  const [rows, setRows] = useState(
    workOrder?.testResults.length
      ? workOrder.testResults
      : [
          {
            name: "Functional performance test",
            expected: "Within specification",
            actual: "",
            pass: true,
          },
          { name: "Electrical safety (IEC 62353)", expected: "Pass", actual: "", pass: true },
        ],
  );
  const [safety, setSafety] = useState(workOrder?.safetyVerified ?? false);
  if (!workOrder) return <Missing id={id} />;

  return (
    <Shell
      id={id}
      step="Testing"
      title="Testing & verification"
      description="Verify performance and safety before the asset can be returned to clinical service."
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Panel>
          <PanelHead
            title="Test results"
            subtitle="Recorded against the manufacturer's acceptance criteria."
            icon={<FlaskConical className="size-4" />}
          />
          <div className="space-y-4 px-6 pb-6 sm:px-7">
            {rows.map((r, i) => (
              <div
                key={i}
                className="grid gap-3 rounded-2xl border border-border p-4 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)_auto]"
              >
                <input
                  className={inputCls}
                  value={r.name}
                  onChange={(e) =>
                    setRows((p) => p.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))
                  }
                />
                <input
                  className={inputCls}
                  value={r.expected}
                  onChange={(e) =>
                    setRows((p) =>
                      p.map((x, j) => (j === i ? { ...x, expected: e.target.value } : x)),
                    )
                  }
                />
                <input
                  className={inputCls}
                  placeholder="Actual result"
                  value={r.actual}
                  onChange={(e) =>
                    setRows((p) =>
                      p.map((x, j) => (j === i ? { ...x, actual: e.target.value } : x)),
                    )
                  }
                />
                <button
                  onClick={() =>
                    setRows((p) => p.map((x, j) => (j === i ? { ...x, pass: !x.pass } : x)))
                  }
                  className={`rounded-xl px-3 py-2 text-[12px] font-semibold ${r.pass ? "bg-success-soft text-success" : "bg-danger-soft text-danger"}`}
                >
                  {r.pass ? "Pass" : "Fail"}
                </button>
              </div>
            ))}
            <ActionBtn
              variant="ghost"
              onClick={() =>
                setRows((p) => [...p, { name: "", expected: "", actual: "", pass: true }])
              }
            >
              Add test
            </ActionBtn>
            <label className="flex items-center gap-3 text-[13px]">
              <input
                type="checkbox"
                checked={safety}
                onChange={(e) => setSafety(e.target.checked)}
              />
              Safety verification complete — equipment is safe for clinical use
            </label>
            <ActionBtn
              disabled={!safety || rows.some((r) => !r.actual)}
              onClick={() => {
                run((s, a) =>
                  actions.saveTesting(s, a, id, { testResults: rows, safetyVerified: safety }),
                );
                toast.success("Testing recorded — asset under verification");
                void navigate({ to: `/maintenance/${id}/report` as never });
              }}
            >
              Save & write service report
            </ActionBtn>
          </div>
        </Panel>
        <ContextPanel id={id} />
      </div>
    </Shell>
  );
}

/* ------------------------------- Service report -------------------------------- */

export function ServiceReportPage({ id }: { id: string }) {
  const { workOrder, asset, complaint, report, run } = useWo(id);
  const navigate = useNavigate();
  const [summary, setSummary] = useState(report?.summary ?? "");
  if (!workOrder) return <Missing id={id} />;
  const rc = workOrder.rootCause;

  return (
    <Shell
      id={id}
      step="Service report"
      title="Service report"
      description="A formal record assembled from the shared work order data, submitted to the administrator for review."
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Panel>
          <PanelHead
            title={`Report for ${workOrder.id}`}
            subtitle={`${asset?.id} · ${asset?.name}`}
            icon={<ShieldCheck className="size-4" />}
            action={
              report ? (
                <Pill tone={report.decision === "Approved" ? "success" : "warning"}>
                  {report.decision}
                </Pill>
              ) : null
            }
          />
          <dl className="px-6 sm:px-7">
            <DefRow
              label="Complaint"
              value={complaint ? `${complaint.id} · ${complaint.title}` : "Preventive service"}
            />
            <DefRow label="Problem observed" value={rc?.problemObserved || "—"} />
            <DefRow label="Diagnostic findings" value={rc?.diagnosticFindings || "—"} />
            <DefRow label="Root cause" value={rc ? `${rc.category} — ${rc.description}` : "—"} />
            <DefRow label="Contributing factor" value={rc?.contributingFactor || "—"} />
            <DefRow label="Corrective action" value={rc?.correctiveAction || "—"} />
            <DefRow label="Preventive action" value={rc?.preventiveAction || "—"} />
            <DefRow
              label="Parts replaced"
              value={
                workOrder.parts.length
                  ? workOrder.parts.map((p) => `${p.name} ×${p.qty}`).join(", ")
                  : "None"
              }
            />
            <DefRow label="Tools used" value={workOrder.tools.join(", ") || "—"} />
            <DefRow
              label="Duration"
              value={workOrder.durationMins ? `${workOrder.durationMins} min` : "—"}
            />
            <DefRow
              label="Evidence"
              value={workOrder.evidence.map((e) => e.name).join(", ") || "—"}
            />
            <DefRow
              label="Test results"
              value={
                workOrder.testResults.length
                  ? workOrder.testResults
                      .map((t) => `${t.name}: ${t.actual} (${t.pass ? "pass" : "fail"})`)
                      .join(" · ")
                  : "—"
              }
            />
            <DefRow
              label="Safety verification"
              value={workOrder.safetyVerified ? "Verified — safe for clinical use" : "Not verified"}
            />
            <DefRow
              label="Final condition"
              value={asset ? <StatusPill status={asset.status} /> : "—"}
            />
          </dl>
          <div className="space-y-4 px-6 pb-6 sm:px-7">
            <Field label="Engineer summary">
              <textarea
                rows={4}
                className={inputCls}
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="Calibration performed, test scan successful, asset ready to return to service."
              />
            </Field>
            <div className="flex flex-wrap gap-2">
              <ActionBtn
                disabled={summary.trim().length < 10}
                onClick={() => {
                  run((s, a) => actions.submitServiceReport(s, a, id, summary));
                  toast.success("Service report submitted for administrator review");
                  void navigate({ to: `/maintenance/${id}/complete` as never });
                }}
              >
                Submit for review
              </ActionBtn>
              <ActionBtn variant="ghost" to={`/maintenance/${id}/testing`}>
                Back to testing
              </ActionBtn>
            </div>
          </div>
        </Panel>
        <ContextPanel id={id} />
      </div>
    </Shell>
  );
}

/* --------------------------------- Complete ------------------------------------ */

export function CompletePage({ id }: { id: string }) {
  const { workOrder, asset, report, events, run } = useWo(id);
  const [note, setNote] = useState("");
  const { actor } = useLifecycle();
  if (!workOrder) return <Missing id={id} />;
  const isAdmin = actor.role === "admin";

  return (
    <Shell
      id={id}
      step="Complete"
      title="Complete & return to service"
      description="Administrator review closes the loop: approval returns the asset to clinical service and updates history and analytics."
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <Panel>
            <PanelHead
              title="Completion summary"
              subtitle={
                report ? `${report.id} · ${report.decision}` : "No service report submitted yet"
              }
            />
            <dl className="px-6 pb-6 sm:px-7">
              <DefRow
                label="Work order stage"
                value={<Pill tone="primary">{workOrder.stage}</Pill>}
              />
              <DefRow
                label="Equipment status"
                value={asset ? <StatusPill status={asset.status} /> : "—"}
              />
              <DefRow label="Engineer" value={workOrder.engineer} />
              <DefRow label="Report summary" value={report?.summary ?? "—"} />
              <DefRow
                label="Reviewed by"
                value={report?.reviewedBy ?? "Pending administrator review"}
              />
              <DefRow label="Review note" value={report?.reviewNote ?? "—"} />
            </dl>
          </Panel>
          {report && report.decision === "Submitted" ? (
            <Panel>
              <PanelHead
                title="Administrator review"
                subtitle={
                  isAdmin
                    ? "Approve to return the asset to service."
                    : "Only the administrator can approve this report."
                }
              />
              <div className="space-y-4 px-6 pb-6 sm:px-7">
                <Field label="Review note">
                  <textarea
                    rows={3}
                    className={inputCls}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    disabled={!isAdmin}
                  />
                </Field>
                <div className="flex flex-wrap gap-2">
                  <ActionBtn
                    disabled={!isAdmin}
                    onClick={() => {
                      run((s, a) => actions.reviewServiceReport(s, a, report.id, "Approved", note));
                      toast.success("Report approved — equipment returned to service");
                    }}
                  >
                    Approve & return to service
                  </ActionBtn>
                  <ActionBtn
                    variant="ghost"
                    disabled={!isAdmin}
                    onClick={() => {
                      run((s, a) =>
                        actions.reviewServiceReport(
                          s,
                          a,
                          report.id,
                          "Rejected",
                          note || "Further work required.",
                        ),
                      );
                      toast.message("Report rejected — sent back to the engineer");
                    }}
                  >
                    Reject
                  </ActionBtn>
                </div>
              </div>
            </Panel>
          ) : null}
          <AuditTrail events={events.slice(0, 12)} title="Lifecycle audit trail" />
        </div>
        <ContextPanel id={id} />
      </div>
    </Shell>
  );
}
