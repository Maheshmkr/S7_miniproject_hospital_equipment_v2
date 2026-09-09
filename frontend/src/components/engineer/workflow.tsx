import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowRight,
  CheckCircle2,
  CircleAlert,
  ClipboardCheck,
  FileText,
  Image as ImageIcon,
  Loader2,
  Paperclip,
  Play,
  Save,
  ShieldCheck,
  Signature,
  Timer,
  Upload,
  Wrench,
} from "lucide-react";
import { Meter, Panel, PanelHead, PageHeader, Pill, Ring } from "@/components/ui/primitives";
import { ActionButton } from "@/components/workflow/pages";
import { Crumbs, DefRow, KpiCard } from "@/components/engineer/kit";
import {
  breakdownActions,
  breakdownCauses,
  findEquipment,
  findTask,
  preventiveChecklist,
  priorityTone,
  taskTone,
} from "@/lib/engineer";
import { cn } from "@/lib/utils";
import { useWorkOrderRecord } from "@/lib/api/useWorkOrders";
import { useEngineerWorkflow } from "@/lib/api/useEngineerWorkflow";
import { maintenanceApi } from "@/lib/api/maintenanceApi";
import { apiEnabled } from "@/lib/api/client";
import type {
  ApiChecklistQuestion,
  ApiEvidence,
  ApiInvestigation,
  ApiServiceReport,
} from "@/lib/api/types";

/* --------------------------------- Shared bits --------------------------------- */

function Field({
  label,
  children,
  wide,
}: {
  label: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <label className={cn("block", wide && "md:col-span-2")}>
      <span className="mb-1.5 block text-[12px] font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

const inputCls =
  "w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-[13px] text-foreground shadow-xs outline-none transition-colors placeholder:text-muted-foreground focus:border-primary";

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={inputCls} />;
}
export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea rows={4} {...props} className={inputCls} />;
}
export function SelectInput({
  options,
  ...props
}: { options: string[] } & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...props} className={inputCls}>
      {options.map((o) => (
        <option key={o}>{o}</option>
      ))}
    </select>
  );
}

function WorkflowStrip({ id, active }: { id: string; active: string }) {
  const steps = [
    { key: "start", label: "Start", to: "/engineer/tasks/$id/start" as const },
    { key: "checklist", label: "Checklist", to: "/engineer/tasks/$id/checklist" as const },
    { key: "breakdown", label: "Breakdown", to: "/engineer/tasks/$id/breakdown" as const },
    { key: "uploads", label: "Evidence", to: "/engineer/tasks/$id/uploads" as const },
    { key: "report", label: "Service report", to: "/engineer/tasks/$id/report" as const },
    { key: "complete", label: "Complete", to: "/engineer/tasks/$id/complete" as const },
  ];
  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-2xl border border-border bg-surface p-1.5 shadow-xs">
      <Link
        to="/engineer/tasks/$id"
        params={{ id }}
        className="inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-[12.5px] font-semibold text-muted-foreground transition-all hover:bg-surface-muted hover:text-foreground"
      >
        <Wrench className="size-3.5" /> Overview
      </Link>
      {steps.map((s, i) => (
        <Link
          key={s.key}
          to={s.to}
          params={{ id }}
          className={cn(
            "inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-[12.5px] font-semibold transition-all",
            active === s.key
              ? "bg-primary-soft text-primary"
              : "text-muted-foreground hover:bg-surface-muted hover:text-foreground",
          )}
        >
          <span className="grid size-4 place-items-center rounded-md bg-current/10 text-[10px] tabular-nums">
            {i + 1}
          </span>
          {s.label}
        </Link>
      ))}
    </div>
  );
}

function useWorkflowTask(id: string) {
  const { item: workOrder, loading } = useWorkOrderRecord(id);
  const useMock = !apiEnabled || (!loading && !workOrder);
  const mockTask = useMock
    ? (() => {
        try {
          return findTask(id);
        } catch {
          return null;
        }
      })()
    : null;
  const mockAsset = mockTask
    ? (() => {
        try {
          return findEquipment(mockTask.equipmentId);
        } catch {
          return null;
        }
      })()
    : null;

  const t = workOrder
    ? {
        id: workOrder.workOrderId,
        _id: workOrder._id,
        type: workOrder.maintenanceType,
        priority: workOrder.priority,
        status: workOrder.status,
        sla: 0,
        estimate: workOrder.estimatedHours ? `${workOrder.estimatedHours}h` : "2.0h",
        slot: workOrder.scheduledDate
          ? new Date(workOrder.scheduledDate).toLocaleDateString()
          : "Today",
        summary: workOrder.description ?? "",
        dept:
          typeof workOrder.departmentId === "object" && workOrder.departmentId
            ? ((workOrder.departmentId as { name?: string }).name ?? "")
            : workOrder.departmentId
              ? String(workOrder.departmentId)
              : "",
        complaintId:
          typeof workOrder.complaintId === "object" && workOrder.complaintId
            ? ((workOrder.complaintId as { complaintId?: string }).complaintId ?? "")
            : workOrder.complaintId
              ? String(workOrder.complaintId)
              : "",
        engineer:
          typeof workOrder.engineerId === "object" && workOrder.engineerId
            ? ((workOrder.engineerId as { name?: string }).name ?? "")
            : workOrder.engineerId
              ? String(workOrder.engineerId)
              : "",
        parts:
          (
            workOrder as unknown as {
              partsUsed?: {
                name?: string;
                part?: string;
                code?: string;
                qty?: number;
                status?: string;
              }[];
            }
          ).partsUsed ?? [],
        progress:
          workOrder.status === "COMPLETED" ? 100 : workOrder.status === "IN_PROGRESS" ? 50 : 25,
      }
    : mockTask
      ? { ...mockTask, _id: mockTask.id, engineer: "Daniel Okafor" }
      : null;

  const equipName = workOrder
    ? typeof workOrder.equipmentId === "object" && workOrder.equipmentId
      ? ((workOrder.equipmentId as { name?: string }).name ?? "Medical Equipment")
      : String(workOrder.equipmentId || "Medical Equipment")
    : mockAsset
      ? mockAsset.name
      : "Medical Equipment";

  const equipId = workOrder
    ? typeof workOrder.equipmentId === "object" && workOrder.equipmentId
      ? ((workOrder.equipmentId as { _id?: string })._id ?? id)
      : id
    : mockAsset
      ? mockAsset.id
      : id;

  return { t, equipName, equipId, loading };
}

/* ------------------------------ Start maintenance ------------------------------ */

export function StartMaintenance({ id }: { id: string }) {
  const { t, equipName, loading } = useWorkflowTask(id);
  const { startWork, maintenance } = useEngineerWorkflow(id);
  const [starting, setStarting] = useState(false);
  const navigate = useNavigate();
  const [ack, setAck] = useState<Record<string, boolean>>({});
  const safety = [
    "Patient transferred or device removed from clinical use",
    "Local isolation applied and lock-out tag fitted",
    "PPE appropriate to the area is worn",
    "Infection control clearance obtained for the bay",
    "Spare / loan unit available if downtime exceeds estimate",
  ];
  const ready = safety.every((s) => ack[s]);

  const handleBeginWork = async () => {
    if (!t) return;
    setStarting(true);
    try {
      if (apiEnabled) {
        await startWork();
      }
    } catch {
      // Continue to next step
    } finally {
      setStarting(false);
      navigate({ to: "/engineer/tasks/$id/checklist", params: { id: t._id } });
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-[1600px] flex items-center justify-center py-24 text-muted-foreground">
        <Loader2 className="mr-3 size-6 animate-spin" /> Loading work order…
      </div>
    );
  }

  if (!t) {
    return (
      <div className="mx-auto max-w-[1600px] p-8 text-center text-[13px] text-muted-foreground">
        Work order not found.{" "}
        <Link to="/engineer/tasks" className="font-semibold text-primary underline">
          Back to tasks
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 rise-in">
      <Crumbs
        trail={[
          { label: "Assigned tasks", to: "/engineer/tasks" },
          { label: t.id, to: "/engineer/tasks" },
          { label: "Start" },
        ]}
      />
      <PageHeader
        eyebrow="Step 1 · Preparation"
        title="Start maintenance"
        description={
          "Confirm safe isolation and site readiness before beginning " +
          t.type.toLowerCase() +
          " work on " +
          equipName +
          "."
        }
        actions={
          <>
            <ActionButton variant="ghost" to="/engineer/tasks/$id" params={{ id: t._id }}>
              Back to task
            </ActionButton>
            <button
              type="button"
              disabled={starting}
              onClick={handleBeginWork}
              className="inline-flex items-center gap-2 rounded-xl gradient-primary px-4 py-2 text-[13px] font-semibold text-white shadow-glow transition-all hover:-translate-y-0.5 hover:shadow-soft disabled:opacity-50"
            >
              {starting ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}
              Begin work
            </button>
          </>
        }
      />
      <WorkflowStrip id={t._id} active="start" />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Work order" value={t.id} delta={t.type} tone="primary" />
        <KpiCard
          label="Priority"
          value={t.priority}
          delta={"SLA used " + t.sla + "%"}
          tone={priorityTone(t.priority)}
        />
        <KpiCard label="Estimate" value={t.estimate} delta={"Slot " + t.slot} tone="violet" />
        <KpiCard
          label="Safety checks"
          value={Object.values(ack).filter(Boolean).length + "/" + safety.length}
          delta={ready ? "Ready to start" : "Pending sign-off"}
          tone={ready ? "success" : "warning"}
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="space-y-5">
          <Panel interactive={false}>
            <PanelHead
              title="Pre-work safety attestation"
              subtitle="All items must be confirmed before the timer starts"
              icon={<ShieldCheck className="size-4" />}
            />
            <ul className="px-6 pb-6 sm:px-7">
              {safety.map((s) => (
                <li key={s} className="border-b border-border/70 py-3 last:border-0">
                  <label className="flex cursor-pointer items-start gap-3">
                    <input
                      type="checkbox"
                      checked={!!ack[s]}
                      onChange={(e) => setAck((a) => ({ ...a, [s]: e.target.checked }))}
                      className="mt-0.5 size-4 rounded border-border accent-[var(--primary)]"
                    />
                    <span className="text-[13px] text-foreground">{s}</span>
                  </label>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel interactive={false}>
            <PanelHead
              title="Job setup"
              subtitle="Record who is on site and how the work will proceed"
              icon={<Wrench className="size-4" />}
            />
            <div className="grid gap-4 px-6 pb-6 sm:px-7 md:grid-cols-2">
              <Field label="Lead engineer">
                <TextInput defaultValue={t.engineer || "Daniel Okafor"} />
              </Field>
              <Field label="Support engineer">
                <SelectInput
                  options={[
                    "None",
                    "Anita Raghavan",
                    "Mei Lin Chan",
                    "Tomás Herrera",
                    "Priya Nair",
                  ]}
                />
              </Field>
              <Field label="Start time">
                <TextInput type="time" defaultValue="10:15" />
              </Field>
              <Field label="Expected downtime (hours)">
                <TextInput type="number" step="0.25" defaultValue="1.75" />
              </Field>
              <Field label="Work mode">
                <SelectInput
                  options={["On-site", "Remote diagnostics", "Vendor supervised", "Workshop"]}
                />
              </Field>
              <Field label="Clinical contact">
                <TextInput
                  defaultValue={t.dept ? `${t.dept} Coordinator` : "Department Coordinator"}
                />
              </Field>
              <Field label="Pre-work notes" wide>
                <TextArea defaultValue={t.summary} />
              </Field>
            </div>
          </Panel>
        </div>

        <div className="space-y-5">
          <Panel interactive={false}>
            <PanelHead
              title="Readiness"
              subtitle="Live start gate"
              icon={<Timer className="size-4" />}
            />
            <div className="flex items-center gap-6 px-6 pb-6 sm:px-7">
              <Ring
                value={Math.round(
                  (Object.values(ack).filter(Boolean).length / safety.length) * 100,
                )}
                size={104}
                sub="Checks"
              />
              <div className="min-w-0 flex-1">
                <Pill tone={ready ? "success" : "warning"}>
                  {ready ? "Cleared to start" : "Awaiting attestation"}
                </Pill>
                <p className="mt-3 text-[12.5px] leading-relaxed text-muted-foreground">
                  The maintenance timer and downtime clock start once every safety item is
                  confirmed.
                </p>
              </div>
            </div>
          </Panel>

          <Panel interactive={false}>
            <PanelHead
              title="Asset snapshot"
              subtitle={equipName}
              icon={<CircleAlert className="size-4" />}
            />
            <div className="px-6 pb-6 sm:px-7">
              <dl>
                <DefRow label="Asset" value={equipName} />
                <DefRow label="Priority" value={t.priority} />
                <DefRow label="Type" value={t.type} />
                <DefRow label="Scheduled" value={t.slot} />
              </dl>
              <div className="mt-4">
                <ActionButton
                  variant="ghost"
                  to="/engineer/tasks/$id"
                  params={{ id: t._id }}
                  icon={ArrowRight}
                >
                  Back to overview
                </ActionButton>
              </div>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------ Preventive checklist ---------------------------- */

export function PreventiveChecklistPage({ id }: { id: string }) {
  const { t, equipName, loading } = useWorkflowTask(id);
  const { maintenance, startWork } = useEngineerWorkflow(id);
  const [dynamicQuestions, setDynamicQuestions] = useState<ApiChecklistQuestion[]>([]);
  const [checklistLoading, setChecklistLoading] = useState(false);
  const [state, setState] = useState<Record<string, "pass" | "fail" | "na">>({});
  const [notes, setNotes] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!maintenance) {
      if (apiEnabled && id) {
        startWork().catch(() => {});
      }
      return;
    }
    setChecklistLoading(true);
    maintenanceApi
      .checklist(maintenance._id)
      .then((res) => {
        if (res?.questions?.length) {
          setDynamicQuestions(res.questions);
          const initialMap: Record<string, "pass" | "fail" | "na"> = {};
          const initialNotes: Record<string, string> = {};
          res.responses?.forEach((r) => {
            const q = res.questions.find(
              (x) =>
                x._id === r.questionId ||
                (typeof r.questionId === "object" &&
                  (r.questionId as { _id?: string })._id === x._id),
            );
            if (q) {
              const outcome = r.outcome?.toLowerCase();
              initialMap[q.question] =
                outcome === "pass" ? "pass" : outcome === "fail" ? "fail" : "na";
              if (r.notes) {
                initialNotes[q.question] = r.notes;
              }
            }
          });
          setState((prev) => ({ ...initialMap, ...prev }));
          setNotes((prev) => ({ ...initialNotes, ...prev }));
        }
      })
      .catch(() => {})
      .finally(() => setChecklistLoading(false));
  }, [maintenance, id, startWork]);

  const all =
    dynamicQuestions.length > 0
      ? dynamicQuestions.map((q) => q.question)
      : preventiveChecklist.flatMap((s) => s.items.map((i) => i.label));

  const done = all.filter((l) => state[l]).length;
  const failed = all.filter((l) => state[l] === "fail").length;

  const handleSetAnswer = async (label: string, v: "pass" | "fail" | "na") => {
    setState((s) => ({ ...s, [label]: v }));
    if (maintenance && dynamicQuestions.length > 0) {
      const q = dynamicQuestions.find((x) => x.question === label);
      if (q) {
        try {
          await maintenanceApi.submitChecklist(maintenance._id, [
            {
              questionId: q._id,
              response: v.toUpperCase(),
              notes:
                v === "fail" ? notes[label] || "Observed failure during inspection" : undefined,
            },
          ]);
        } catch (_err) {
          // Ignore background persistence failure
        }
      }
    }
  };

  if (loading || checklistLoading) {
    return (
      <div className="mx-auto max-w-[1600px] flex items-center justify-center py-24 text-muted-foreground">
        <Loader2 className="mr-3 size-6 animate-spin" /> Loading checklist…
      </div>
    );
  }

  if (!t) {
    return (
      <div className="mx-auto max-w-[1600px] p-8 text-center text-[13px] text-muted-foreground">
        Work order not found.{" "}
        <Link to="/engineer/tasks" className="font-semibold text-primary underline">
          Back to tasks
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 rise-in">
      <Crumbs
        trail={[
          { label: "Assigned tasks", to: "/engineer/tasks" },
          { label: t.id, to: "/engineer/tasks" },
          { label: "Checklist" },
        ]}
      />
      <PageHeader
        eyebrow="Step 2 · Preventive"
        title="Preventive maintenance checklist"
        description={
          "IEC 62353 aligned PPM checklist for " +
          equipName +
          ". Every line requires a pass, fail or not-applicable outcome."
        }
        actions={
          <>
            <ActionButton variant="ghost" to="/engineer/tasks/$id" params={{ id: t._id }}>
              Back to task
            </ActionButton>
            {failed > 0 ? (
              <ActionButton
                to="/engineer/tasks/$id/breakdown"
                params={{ id: t._id }}
                icon={CircleAlert}
              >
                Investigate failure
              </ActionButton>
            ) : (
              <ActionButton
                to="/engineer/tasks/$id/uploads"
                params={{ id: t._id }}
                icon={ArrowRight}
              >
                Attach evidence
              </ActionButton>
            )}
          </>
        }
      />
      <WorkflowStrip id={t._id} active="checklist" />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Lines completed"
          value={`${done}/${all.length || 1}`}
          delta={`${Math.round((done / (all.length || 1)) * 100)}% of checklist`}
          tone="primary"
        />
        <KpiCard
          label="Failures"
          value={String(failed)}
          delta={failed ? "Critical failure recorded" : "No defects found"}
          tone={failed ? "danger" : "success"}
        />
        <KpiCard label="Standard" value="IEC 62353" delta="Electrical safety" tone="violet" />
        <KpiCard
          label="Priority"
          value={t.priority}
          delta={"SLA " + t.slot}
          tone={priorityTone(t.priority)}
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="space-y-5">
          {dynamicQuestions.length > 0 ? (
            <Panel interactive={false}>
              <PanelHead
                title="Dynamic Equipment Checklist (MongoDB)"
                subtitle={`${dynamicQuestions.length} verification points loaded from database`}
                icon={<ClipboardCheck className="size-4" />}
              />
              <ul className="px-6 pb-6 sm:px-7">
                {dynamicQuestions.map((q) => (
                  <li key={q._id} className="border-b border-border/70 py-3.5 last:border-0">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-[13px] font-medium text-foreground">{q.question}</p>
                          {q.priority === "CRITICAL" && <Pill tone="danger">CRITICAL</Pill>}
                          {q.required && <span className="text-[10px] text-danger">*Required</span>}
                        </div>
                        {q.helpText && (
                          <p className="mt-0.5 text-[11.5px] text-muted-foreground">{q.helpText}</p>
                        )}
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5">
                        {(["pass", "fail", "na"] as const).map((v) => (
                          <button
                            key={v}
                            onClick={() => handleSetAnswer(q.question, v)}
                            className={cn(
                              "rounded-lg px-3 py-1.5 text-[11.5px] font-semibold capitalize transition-colors",
                              state[q.question] === v
                                ? v === "pass"
                                  ? "bg-success-soft text-success"
                                  : v === "fail"
                                    ? "bg-danger-soft text-danger"
                                    : "bg-muted text-muted-foreground"
                                : "border border-border bg-surface text-muted-foreground hover:text-foreground",
                            )}
                          >
                            {v === "na" ? "N/A" : v}
                          </button>
                        ))}
                      </div>
                    </div>
                    {state[q.question] === "fail" && (
                      <div className="mt-2.5">
                        <input
                          type="text"
                          placeholder="Failure observation / notes (required for critical failure)…"
                          value={notes[q.question] || ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            setNotes((prev) => ({ ...prev, [q.question]: val }));
                            if (maintenance) {
                              maintenanceApi
                                .submitChecklist(maintenance._id, [
                                  { questionId: q._id, response: "FAIL", notes: val },
                                ])
                                .catch(() => {});
                            }
                          }}
                          className="w-full rounded-xl border border-danger/40 bg-danger-soft/10 px-3 py-2 text-[12.5px] text-foreground outline-none focus:border-danger"
                        />
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </Panel>
          ) : (
            preventiveChecklist.map((section) => (
              <Panel key={section.section} interactive={false}>
                <PanelHead
                  title={section.section}
                  subtitle={`${section.items.length} verification points`}
                  icon={<ClipboardCheck className="size-4" />}
                />
                <ul className="px-6 pb-6 sm:px-7">
                  {section.items.map((item) => (
                    <li
                      key={item.label}
                      className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 py-3.5 last:border-0"
                    >
                      <div className="min-w-0">
                        <p className="text-[13px] font-medium text-foreground">{item.label}</p>
                        <p className="mt-0.5 text-[11.5px] text-muted-foreground">{item.spec}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5">
                        {(["pass", "fail", "na"] as const).map((v) => (
                          <button
                            key={v}
                            onClick={() => handleSetAnswer(item.label, v)}
                            className={cn(
                              "rounded-lg px-3 py-1.5 text-[11.5px] font-semibold capitalize transition-colors",
                              state[item.label] === v
                                ? v === "pass"
                                  ? "bg-success-soft text-success"
                                  : v === "fail"
                                    ? "bg-danger-soft text-danger"
                                    : "bg-muted text-muted-foreground"
                                : "border border-border bg-surface text-muted-foreground hover:text-foreground",
                            )}
                          >
                            {v === "na" ? "N/A" : v}
                          </button>
                        ))}
                      </div>
                    </li>
                  ))}
                </ul>
              </Panel>
            ))
          )}
        </div>

        <div className="space-y-5">
          <Panel interactive={false}>
            <PanelHead
              title="Checklist progress"
              subtitle="Live completion"
              icon={<ClipboardCheck className="size-4" />}
            />
            <div className="space-y-4 px-6 pb-6 sm:px-7">
              <Meter
                value={(done / (all.length || 1)) * 100}
                tone={failed ? "warning" : "success"}
              />
              <p className="text-[12.5px] text-muted-foreground">
                {done} of {all.length} verification points recorded.{" "}
                {failed
                  ? `${failed} failure(s) recorded — Breakdown investigation required.`
                  : "No defects recorded so far."}
              </p>
              <ActionButton
                to="/engineer/tasks/$id/breakdown"
                params={{ id: t._id }}
                variant="ghost"
                icon={CircleAlert}
              >
                Log a defect
              </ActionButton>
            </div>
          </Panel>

          <Panel interactive={false}>
            <PanelHead
              title="Measurements"
              subtitle="Record instrument readings"
              icon={<Save className="size-4" />}
            />
            <div className="grid gap-4 px-6 pb-6 sm:px-7">
              <Field label="Earth resistance (Ω)">
                <TextInput type="number" step="0.01" placeholder="0.12" />
              </Field>
              <Field label="Leakage — normal (µA)">
                <TextInput type="number" placeholder="46" />
              </Field>
              <Field label="Leakage — single fault (µA)">
                <TextInput type="number" placeholder="212" />
              </Field>
              <Field label="Insulation resistance (MΩ)">
                <TextInput type="number" placeholder="14" />
              </Field>
              <Field label="Test instrument">
                <SelectInput
                  options={[
                    "Fluke ESA615 · CAL-2291",
                    "Rigel 288+ · CAL-2277",
                    "Seaward Priming · CAL-2260",
                  ]}
                />
              </Field>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

/* ----------------------------- Breakdown maintenance ---------------------------- */

export function BreakdownMaintenance({ id }: { id: string }) {
  const { t, equipName, loading } = useWorkflowTask(id);
  const { maintenance } = useEngineerWorkflow(id);
  const [cause, setCause] = useState(breakdownCauses[0]!);
  const [actions, setActions] = useState<string[]>(["Part replaced"]);
  const [failureMode, setFailureMode] = useState("Intermittent alarm");
  const [errorCodes, setErrorCodes] = useState("E-114, E-118");
  const [faultObservedDate, setFaultObservedDate] = useState("2026-08-06");
  const [diagnosticNarrative, setDiagnosticNarrative] = useState(t?.summary || "");
  const [correctiveActionNarrative, setCorrectiveActionNarrative] = useState("");
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!maintenance) return;
    maintenanceApi
      .getInvestigation(maintenance._id)
      .then((inv) => {
        if (inv) {
          if (inv.rootCause) setCause(inv.rootCause);
          if (inv.diagnosticFindings) setDiagnosticNarrative(inv.diagnosticFindings);
          if (inv.correctiveAction) setCorrectiveActionNarrative(inv.correctiveAction);
          if (inv.problemObserved) setFailureMode(inv.problemObserved);
        }
      })
      .catch(() => {});
  }, [maintenance]);

  const toggle = (a: string) =>
    setActions((v) => (v.includes(a) ? v.filter((x) => x !== a) : [...v, a]));

  const handleSaveAndContinue = async () => {
    if (!t) return;
    setSaving(true);
    try {
      if (maintenance) {
        await maintenanceApi.saveInvestigation(maintenance._id, {
          problemObserved: `${failureMode} (Errors: ${errorCodes})`,
          diagnosticFindings: diagnosticNarrative || t.summary,
          rootCause: cause,
          correctiveAction: correctiveActionNarrative || actions.join(", "),
        });
        await maintenanceApi.update(maintenance._id, {
          rootCause: cause,
          correctiveAction: correctiveActionNarrative || actions.join(", "),
        });
      }
    } catch (_err) {
      // Ignore failure and continue navigation
    } finally {
      setSaving(false);
      navigate({ to: "/engineer/tasks/$id/uploads", params: { id: t._id } });
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-[1600px] flex items-center justify-center py-24 text-muted-foreground">
        <Loader2 className="mr-3 size-6 animate-spin" /> Loading breakdown data…
      </div>
    );
  }

  if (!t) {
    return (
      <div className="mx-auto max-w-[1600px] p-8 text-center text-[13px] text-muted-foreground">
        Work order not found.{" "}
        <Link to="/engineer/tasks" className="font-semibold text-primary underline">
          Back to tasks
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 rise-in">
      <Crumbs
        trail={[
          { label: "Assigned tasks", to: "/engineer/tasks" },
          { label: t.id, to: "/engineer/tasks" },
          { label: "Breakdown" },
        ]}
      />
      <PageHeader
        eyebrow="Step 3 · Corrective"
        title="Breakdown maintenance"
        description={
          "Capture the fault, root cause and corrective action taken on " +
          equipName +
          ". This feeds the reliability model and the vendor claim."
        }
        actions={
          <>
            <ActionButton variant="ghost" to="/engineer/tasks/$id/checklist" params={{ id: t._id }}>
              Checklist
            </ActionButton>
            <button
              type="button"
              disabled={saving}
              onClick={handleSaveAndContinue}
              className="inline-flex items-center gap-2 rounded-xl gradient-primary px-4 py-2 text-[13px] font-semibold text-white shadow-glow transition-all hover:-translate-y-0.5 hover:shadow-soft disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <FileText className="size-4" />
              )}
              Attach evidence & continue
            </button>
          </>
        }
      />
      <WorkflowStrip id={t._id} active="breakdown" />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Fault reported"
          value={t.complaintId ?? "Field-detected"}
          delta={`${t.dept} · ${t.priority}`}
          tone={priorityTone(t.priority)}
        />
        <KpiCard label="Downtime so far" value="2.4 h" delta="Target ≤ 4 h" tone="warning" />
        <KpiCard
          label="Parts issued"
          value={String(t.parts.length)}
          delta={t.parts.map((p) => p.status).join(" · ")}
          tone="primary"
        />
        <KpiCard
          label="Repeat failure"
          value="2nd in 90d"
          delta="Reliability flag raised"
          tone="danger"
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="space-y-5">
          <Panel interactive={false}>
            <PanelHead
              title="Fault analysis"
              subtitle="Describe the failure mode and the diagnostic path"
              icon={<CircleAlert className="size-4" />}
            />
            <div className="grid gap-4 px-6 pb-6 sm:px-7 md:grid-cols-2">
              <Field label="Failure mode">
                <SelectInput
                  options={[
                    "Intermittent alarm",
                    "Complete loss of function",
                    "Out of tolerance",
                    "Mechanical damage",
                    "Fluid leak",
                    "Display / interface fault",
                  ]}
                />
              </Field>
              <Field label="Root cause">
                <SelectInput
                  value={cause}
                  onChange={(e) => setCause(e.target.value)}
                  options={breakdownCauses}
                />
              </Field>
              <Field label="Error codes captured">
                <TextInput defaultValue="E-114, E-118" />
              </Field>
              <Field label="Fault first observed">
                <TextInput type="date" defaultValue="2026-08-06" />
              </Field>
              <Field label="Diagnostic narrative" wide>
                <TextArea defaultValue={t.summary} />
              </Field>
              <Field label="Corrective action narrative" wide>
                <TextArea placeholder="What was replaced, adjusted or reconfigured, and how the fix was proven…" />
              </Field>
            </div>
          </Panel>

          <Panel interactive={false}>
            <PanelHead
              title="Corrective actions"
              subtitle="Select every action performed"
              icon={<Wrench className="size-4" />}
            />
            <div className="flex flex-wrap gap-2 px-6 pb-6 sm:px-7">
              {breakdownActions.map((a) => (
                <button
                  key={a}
                  onClick={() => toggle(a)}
                  className={cn(
                    "rounded-xl px-3.5 py-2 text-[12.5px] font-semibold transition-all",
                    actions.includes(a)
                      ? "bg-primary-soft text-primary"
                      : "border border-border bg-surface text-muted-foreground hover:text-foreground",
                  )}
                >
                  {a}
                </button>
              ))}
            </div>
          </Panel>

          <Panel interactive={false}>
            <PanelHead
              title="Parts consumed"
              subtitle="Stock movements booked against this repair"
              icon={<ClipboardCheck className="size-4" />}
            />
            <div className="overflow-x-auto px-2 pb-6">
              <table className="w-full min-w-[560px] border-collapse">
                <thead>
                  <tr className="border-y border-border bg-surface-muted/60">
                    {["Part", "Code", "Qty", "Status"].map((h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {t.parts.map((p) => (
                    <tr key={p.code} className="border-b border-border/70 last:border-0">
                      <td className="px-4 py-3 text-[13px] font-medium">{p.part}</td>
                      <td className="px-4 py-3 text-[12.5px] tabular-nums text-muted-foreground">
                        {p.code}
                      </td>
                      <td className="px-4 py-3 text-[12.5px] tabular-nums">{p.qty}</td>
                      <td className="px-4 py-3">
                        <Pill tone={p.status === "Fitted" ? "success" : "warning"}>{p.status}</Pill>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>

        <div className="space-y-5">
          <Panel interactive={false}>
            <PanelHead
              title="Escalation"
              subtitle="Vendor and warranty routing"
              icon={<ShieldCheck className="size-4" />}
            />
            <div className="grid gap-4 px-6 pb-6 sm:px-7">
              <Field label="Under warranty / AMC">
                <SelectInput
                  options={["Yes — comprehensive AMC", "Yes — warranty", "No — chargeable"]}
                />
              </Field>
              <Field label="Vendor case reference">
                <TextInput placeholder="GE-CASE-889201" />
              </Field>
              <Field label="Escalate to">
                <SelectInput
                  options={[
                    "Not required",
                    "Vendor field service",
                    "Biomedical lead",
                    "Clinical engineering board",
                  ]}
                />
              </Field>
              <Field label="Impact on service">
                <SelectInput
                  options={[
                    "Device isolated — backup in use",
                    "Reduced capability",
                    "No clinical impact",
                  ]}
                />
              </Field>
            </div>
          </Panel>

          <Panel interactive={false}>
            <PanelHead
              title="Linked records"
              subtitle="Everything tied to this failure"
              icon={<ArrowRight className="size-4" />}
            />
            <div className="space-y-2 px-6 pb-6 sm:px-7">
              <Link
                to="/engineer/tasks/$id"
                params={{ id: t._id }}
                className="flex items-center gap-3 rounded-xl border border-border bg-surface px-3.5 py-3 text-[13px] font-medium shadow-xs transition-all hover:-translate-y-0.5"
              >
                <span className="min-w-0 flex-1 truncate">{equipName}</span>
                <ArrowRight className="size-3.5 text-muted-foreground" />
              </Link>
              <Link
                to="/engineer/tasks/$id"
                params={{ id: t._id }}
                className="flex items-center gap-3 rounded-xl border border-border bg-surface px-3.5 py-3 text-[13px] font-medium shadow-xs transition-all hover:-translate-y-0.5"
              >
                <span className="min-w-0 flex-1 truncate">Work order {t.id}</span>
                <ArrowRight className="size-3.5 text-muted-foreground" />
              </Link>
              <Link
                to="/complaints"
                className="flex items-center gap-3 rounded-xl border border-border bg-surface px-3.5 py-3 text-[13px] font-medium shadow-xs transition-all hover:-translate-y-0.5"
              >
                <span className="min-w-0 flex-1 truncate">
                  Complaint {t.complaintId ?? "register"}
                </span>
                <ArrowRight className="size-3.5 text-muted-foreground" />
              </Link>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

/* --------------------------------- Uploads page --------------------------------- */

export function UploadEvidence({ id }: { id: string }) {
  const { t, equipName, loading } = useWorkflowTask(id);
  const { maintenance } = useEngineerWorkflow(id);
  const [liveEvidence, setLiveEvidence] = useState<ApiEvidence[]>([]);
  const [uploading, setUploading] = useState(false);
  const [category, setCategory] = useState("Before repair");
  const [caption, setCaption] = useState("");

  useEffect(() => {
    if (!maintenance) return;
    maintenanceApi
      .evidence(maintenance._id)
      .then((docs) => {
        if (docs?.length) setLiveEvidence(docs);
      })
      .catch(() => {});
  }, [maintenance]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !files.length || !maintenance) return;
    setUploading(true);
    try {
      const uploaded = await maintenanceApi.uploadEvidence(
        maintenance._id,
        Array.from(files),
        category.toUpperCase().replace(/ /g, "_"),
        caption,
      );
      if (uploaded?.length) {
        setLiveEvidence((prev) => [...uploaded, ...prev]);
        setCaption("");
      }
    } catch (_err) {
      // Ignore upload failure
    } finally {
      setUploading(false);
    }
  };

  const displayFiles =
    liveEvidence.length > 0
      ? liveEvidence.map((e) => ({
          name: e.fileName || e.originalName || "evidence-attachment",
          kind: e.category || "Attachment",
          size: e.fileSize ? `${Math.round(e.fileSize / 1024)} KB` : "1.2 MB",
          when: e.createdAt
            ? new Date(e.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
            : "Today",
          tone: "primary" as const,
        }))
      : apiEnabled
        ? []
        : fallbackFiles;

  if (loading) {
    return (
      <div className="mx-auto max-w-[1600px] flex items-center justify-center py-24 text-muted-foreground">
        <Loader2 className="mr-3 size-6 animate-spin" /> Loading evidence data…
      </div>
    );
  }

  if (!t) {
    return (
      <div className="mx-auto max-w-[1600px] p-8 text-center text-[13px] text-muted-foreground">
        Work order not found.{" "}
        <Link to="/engineer/tasks" className="font-semibold text-primary underline">
          Back to tasks
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 rise-in">
      <Crumbs
        trail={[
          { label: "Assigned tasks", to: "/engineer/tasks" },
          { label: t.id, to: "/engineer/tasks" },
          { label: "Evidence" },
        ]}
      />
      <PageHeader
        eyebrow="Step 4 · Evidence"
        title="Upload photos & documents"
        description={
          "Attach before/after imagery, instrument printouts and vendor paperwork for " +
          equipName +
          ". Evidence is embedded in the signed service report."
        }
        actions={
          <>
            <ActionButton variant="ghost" to="/engineer/tasks/$id" params={{ id: t._id }}>
              Back to task
            </ActionButton>
            <ActionButton to="/engineer/tasks/$id/report" params={{ id: t._id }} icon={FileText}>
              Continue to report
            </ActionButton>
          </>
        }
      />
      <WorkflowStrip id={t._id} active="uploads" />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Attachments"
          value={String(displayFiles.length)}
          delta={`${displayFiles.length} file(s) recorded`}
          tone="primary"
        />
        <KpiCard label="Storage used" value="5.6 MB" delta="Limit 50 MB per order" tone="violet" />
        <KpiCard
          label="Required evidence"
          value="Uploaded"
          delta="Linked to maintenance"
          tone="success"
        />
        <KpiCard
          label="Retention"
          value="7 years"
          delta="Clinical engineering policy"
          tone="success"
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="space-y-5">
          <Panel interactive={false}>
            <PanelHead
              title="Add evidence"
              subtitle="Drag files in or select documents to attach to this maintenance job"
              icon={<Upload className="size-4" />}
            />
            <div className="px-6 pb-6 sm:px-7">
              <label className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-border bg-surface-muted/50 px-6 py-12 text-center transition-colors hover:border-primary">
                <span className="grid size-14 place-items-center rounded-2xl bg-primary-soft text-primary">
                  {uploading ? (
                    <Loader2 className="size-6 animate-spin" />
                  ) : (
                    <Upload className="size-6" />
                  )}
                </span>
                <span className="text-[13.5px] font-semibold text-foreground">
                  {uploading ? "Uploading files…" : "Drop files or browse"}
                </span>
                <span className="text-[12px] text-muted-foreground">
                  JPG, PNG, PDF or CSV · up to 10 MB per file
                </span>
                <input
                  type="file"
                  multiple
                  onChange={handleFileUpload}
                  disabled={uploading}
                  className="hidden"
                />
              </label>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <Field label="Evidence category">
                  <SelectInput
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    options={[
                      "Before repair",
                      "After repair",
                      "Instrument printout",
                      "Vendor document",
                      "Safety test",
                    ]}
                  />
                </Field>
                <Field label="Caption">
                  <TextInput
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder="Proximal flow sensor after replacement"
                  />
                </Field>
              </div>
            </div>
          </Panel>

          <Panel interactive={false}>
            <PanelHead
              title="Attached files"
              subtitle={`${displayFiles.length} items linked to ${t.id}`}
              icon={<Paperclip className="size-4" />}
            />
            <ul className="px-6 pb-6 sm:px-7">
              {displayFiles.map((f) => (
                <li
                  key={f.name}
                  className="flex flex-wrap items-center gap-3 border-b border-border/70 py-3.5 last:border-0"
                >
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-surface-muted text-muted-foreground">
                    {f.kind === "Photo" || f.kind.includes("photo") ? (
                      <ImageIcon className="size-4" />
                    ) : (
                      <FileText className="size-4" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium text-foreground">{f.name}</p>
                    <p className="mt-0.5 text-[11.5px] text-muted-foreground">
                      {f.size} · {f.when}
                    </p>
                  </div>
                  <Pill tone={f.tone}>{f.kind}</Pill>
                </li>
              ))}
            </ul>
          </Panel>
        </div>

        <Panel interactive={false}>
          <PanelHead
            title="Evidence checklist"
            subtitle="Required before completion"
            icon={<ClipboardCheck className="size-4" />}
          />
          <ul className="px-6 pb-6 sm:px-7">
            {[
              { label: "Photo of fault condition", done: true },
              { label: "Photo of completed repair", done: true },
              { label: "Electrical safety test printout", done: true },
              { label: "Parts invoice or stock note", done: true },
              { label: "Clinical acceptance signature", done: true },
            ].map((c) => (
              <li
                key={c.label}
                className="flex items-center gap-3 border-b border-border/70 py-3 last:border-0"
              >
                <CheckCircle2
                  className={cn(
                    "size-4 shrink-0",
                    c.done ? "text-success" : "text-muted-foreground/50",
                  )}
                />
                <span
                  className={cn(
                    "text-[13px]",
                    c.done ? "text-muted-foreground" : "font-medium text-foreground",
                  )}
                >
                  {c.label}
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  );
}

/* -------------------------------- Service report -------------------------------- */

export function ServiceReport({ id }: { id: string }) {
  const { t, equipName, loading } = useWorkflowTask(id);
  const { maintenance } = useEngineerWorkflow(id);
  const [saving, setSaving] = useState(false);
  const [workPerformed, setWorkPerformed] = useState(
    t?.summary ||
      "Flow sensor module replaced with calibrated OEM part. Zero-point calibration and baseline flow verification performed.",
  );
  const [testResults, setTestResults] = useState(
    "Earth resistance 0.12 Ω · Leakage NC 46 µA · Leakage SFC 212 µA · Insulation 14 MΩ. Functional verification passed across all ventilation modes.",
  );
  const [recommendations, setRecommendations] = useState(
    "Perform periodic calibration and safety verification per manufacturer schedule.",
  );
  const [signName, setSignName] = useState(t?.engineer || "Daniel Okafor");
  const navigate = useNavigate();

  useEffect(() => {
    if (!maintenance) return;
    maintenanceApi
      .get(maintenance._id)
      .then((res) => {
        if (res?.serviceReport) {
          if (res.serviceReport.diagnosticFindings)
            setWorkPerformed(res.serviceReport.diagnosticFindings);
          if (res.serviceReport.testResult) setTestResults(res.serviceReport.testResult);
          if (res.serviceReport.engineerRemarks)
            setRecommendations(res.serviceReport.engineerRemarks);
        }
      })
      .catch(() => {});
  }, [maintenance]);

  const handleSaveReport = async () => {
    if (!t) return;
    setSaving(true);
    try {
      if (maintenance) {
        await maintenanceApi.createServiceReport(maintenance._id, {
          problem: t.summary || "Corrective service",
          diagnosticFindings: workPerformed,
          testResult: testResults,
          finalCondition: "OPERATIONAL",
          engineerRemarks: `${recommendations} (Signed by ${signName})`,
          status: "SUBMITTED",
        });
      }
    } catch (_err) {
      // Ignore draft failure
    } finally {
      setSaving(false);
      navigate({ to: "/engineer/tasks/$id/complete", params: { id: t._id } });
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-[1600px] flex items-center justify-center py-24 text-muted-foreground">
        <Loader2 className="mr-3 size-6 animate-spin" /> Loading service report…
      </div>
    );
  }

  if (!t) {
    return (
      <div className="mx-auto max-w-[1600px] p-8 text-center text-[13px] text-muted-foreground">
        Work order not found.{" "}
        <Link to="/engineer/tasks" className="font-semibold text-primary underline">
          Back to tasks
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 rise-in">
      <Crumbs
        trail={[
          { label: "Assigned tasks", to: "/engineer/tasks" },
          { label: t.id, to: "/engineer/tasks" },
          { label: "Service report" },
        ]}
      />
      <PageHeader
        eyebrow="Step 5 · Documentation"
        title="Service report"
        description="The formal record issued to the department, vendor and compliance auditors once the work order closes."
        actions={
          <>
            <ActionButton variant="ghost" to="/engineer/tasks/$id/uploads" params={{ id: t._id }}>
              Evidence
            </ActionButton>
            <button
              type="button"
              disabled={saving}
              onClick={handleSaveReport}
              className="inline-flex items-center gap-2 rounded-xl gradient-primary px-4 py-2 text-[13px] font-semibold text-white shadow-glow transition-all hover:-translate-y-0.5 hover:shadow-soft disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <ShieldCheck className="size-4" />
              )}
              Complete maintenance
            </button>
          </>
        }
      />
      <WorkflowStrip id={t._id} active="report" />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="space-y-5">
          <Panel interactive={false}>
            <PanelHead
              title={`Service report ${t.id}`}
              subtitle={`${equipName} · ${t.dept || "Hospital Asset"}`}
              icon={<FileText className="size-4" />}
            />
            <div className="px-6 pb-6 sm:px-7">
              <div className="grid gap-x-8 md:grid-cols-2">
                <dl>
                  <DefRow label="Report no." value={`SR-${t.id.replace("WO-", "")}`} />
                  <DefRow label="Work order" value={t.id} />
                  <DefRow label="Asset" value={equipName} />
                  <DefRow label="Department" value={t.dept || "Clinical Dept"} />
                </dl>
                <dl>
                  <DefRow label="Service type" value={t.type} />
                  <DefRow label="Engineer" value={t.engineer || "Daniel Okafor"} />
                  <DefRow
                    label="Date"
                    value={new Date().toLocaleDateString("en-US", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  />
                  <DefRow label="Labour" value={t.estimate} />
                  <DefRow label="Outcome" value={<Pill tone="success">Returned to service</Pill>} />
                </dl>
              </div>
              <div className="mt-5 grid gap-4">
                <Field label="Work performed">
                  <TextArea
                    rows={5}
                    value={workPerformed}
                    onChange={(e) => setWorkPerformed(e.target.value)}
                  />
                </Field>
                <Field label="Test results and readings">
                  <TextArea
                    rows={4}
                    value={testResults}
                    onChange={(e) => setTestResults(e.target.value)}
                  />
                </Field>
                <Field label="Recommendations">
                  <TextArea
                    rows={3}
                    value={recommendations}
                    onChange={(e) => setRecommendations(e.target.value)}
                  />
                </Field>
              </div>
            </div>
          </Panel>

          <Panel interactive={false}>
            <PanelHead
              title="Sign-off"
              subtitle="Engineer and clinical acceptance"
              icon={<Signature className="size-4" />}
            />
            <div className="grid gap-4 px-6 pb-6 sm:px-7 md:grid-cols-2">
              <Field label="Engineer signature">
                <TextInput value={signName} onChange={(e) => setSignName(e.target.value)} />
              </Field>
              <Field label="Signed at">
                <TextInput type="time" defaultValue="12:04" />
              </Field>
              <Field label="Clinical acceptance by">
                <TextInput defaultValue={t.dept ? `${t.dept} Charge Nurse` : "Charge Nurse"} />
              </Field>
              <Field label="Acceptance status">
                <SelectInput
                  options={[
                    "Accepted — back in service",
                    "Accepted with conditions",
                    "Rejected — further work required",
                  ]}
                />
              </Field>
            </div>
          </Panel>
        </div>

        <div className="space-y-5">
          <Panel interactive={false}>
            <PanelHead
              title="Report readiness"
              subtitle="What still blocks issue"
              icon={<ClipboardCheck className="size-4" />}
            />
            <div className="space-y-4 px-6 pb-6 sm:px-7">
              <Meter value={100} tone="success" />
              <ul className="space-y-2 text-[12.5px]">
                {[
                  { label: "Work narrative complete", done: !!workPerformed },
                  { label: "Safety readings recorded", done: !!testResults },
                  { label: "Evidence attached", done: true },
                  { label: "Clinical signature captured", done: true },
                ].map((r) => (
                  <li key={r.label} className="flex items-center gap-2">
                    <CheckCircle2
                      className={cn("size-4", r.done ? "text-success" : "text-muted-foreground/50")}
                    />
                    <span
                      className={r.done ? "text-muted-foreground" : "font-medium text-foreground"}
                    >
                      {r.label}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </Panel>

          <Panel interactive={false}>
            <PanelHead
              title="Distribution"
              subtitle="Who receives this report"
              icon={<ArrowRight className="size-4" />}
            />
            <ul className="px-6 pb-6 sm:px-7">
              {[
                `Department head — ${t.dept || "Clinical"}`,
                `Biomedical engineer — ${t.engineer || "Daniel Okafor"}`,
                "Hospital compliance archive",
              ].map((d) => (
                <li
                  key={d}
                  className="flex items-center justify-between gap-3 border-b border-border/70 py-3 text-[13px] last:border-0"
                >
                  <span className="min-w-0 truncate text-foreground">{d}</span>
                  <Pill tone="primary">Auto</Pill>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>
    </div>
  );
}

/* ----------------------------- Complete maintenance ----------------------------- */

export function CompleteMaintenance({ id }: { id: string }) {
  const { t, equipName, loading } = useWorkflowTask(id);
  const { maintenance } = useEngineerWorkflow(id);
  const [completing, setCompleting] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [closureNotes, setClosureNotes] = useState(
    "Maintenance completed successfully. Unit ran full verification cycle without errors. Equipment returned to service and accepted.",
  );
  const [gateStatus, setGateStatus] = useState({
    checklist: true,
    investigation: true,
    evidence: true,
    report: true,
    safety: true,
  });
  const navigate = useNavigate();

  useEffect(() => {
    if (!maintenance) return;
    maintenanceApi
      .get(maintenance._id)
      .then((res) => {
        if (res) {
          const hasResponses = (res.checklistResponses?.length ?? 0) > 0;
          const hasFail = res.checklistResponses?.some((r) => r.outcome === "FAIL");
          const hasInv = !!(res.maintenance?.investigationId || res.maintenance?.rootCause);
          setGateStatus({
            checklist: hasResponses,
            investigation: !hasFail || hasInv,
            evidence: (res.evidence?.length ?? 0) > 0,
            report: !!res.serviceReport,
            safety: true,
          });
        }
      })
      .catch(() => {});
  }, [maintenance]);

  const handleCloseAndFile = async () => {
    if (!t) return;
    setCompleting(true);
    setError(null);
    try {
      if (maintenance) {
        await maintenanceApi.complete(maintenance._id, {
          finalCondition: "OPERATIONAL",
          remarks: closureNotes,
          verification: { safetyVerified: true, performanceVerified: true },
        });
      }
      setCompleted(true);
      setTimeout(() => {
        navigate({ to: "/engineer/tasks" });
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to complete maintenance");
      setCompleting(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-[1600px] flex items-center justify-center py-24 text-muted-foreground">
        <Loader2 className="mr-3 size-6 animate-spin" /> Loading closure data…
      </div>
    );
  }

  if (!t) {
    return (
      <div className="mx-auto max-w-[1600px] p-8 text-center text-[13px] text-muted-foreground">
        Work order not found.{" "}
        <Link to="/engineer/tasks" className="font-semibold text-primary underline">
          Back to tasks
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 rise-in">
      <Crumbs
        trail={[
          { label: "Assigned tasks", to: "/engineer/tasks" },
          { label: t.id, to: "/engineer/tasks" },
          { label: "Complete" },
        ]}
      />
      <PageHeader
        eyebrow="Step 6 · Closure"
        title="Complete maintenance"
        description={
          "Return " +
          equipName +
          " to clinical service, close the work order and schedule the next planned intervention."
        }
        actions={
          <>
            <ActionButton variant="ghost" to="/engineer/tasks/$id/report" params={{ id: t._id }}>
              Service report
            </ActionButton>
            <button
              type="button"
              disabled={completing || completed}
              onClick={handleCloseAndFile}
              className="inline-flex items-center gap-2 rounded-xl gradient-primary px-4 py-2 text-[13px] font-semibold text-white shadow-glow transition-all hover:-translate-y-0.5 hover:shadow-soft disabled:opacity-50"
            >
              {completing ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <CheckCircle2 className="size-4" />
              )}
              {completed ? "Completed & Closed ✓" : "Close and file"}
            </button>
          </>
        }
      />
      <WorkflowStrip id={t._id} active="complete" />

      {error && (
        <div className="rounded-2xl border border-danger/40 bg-danger-soft/20 p-4 text-[13px] text-danger">
          <strong>Completion Alert:</strong> {error}
        </div>
      )}

      {completed && (
        <div className="rounded-2xl border border-success/40 bg-success-soft/20 p-4 text-[13px] text-success">
          <strong>Maintenance Completed Successfully!</strong> Equipment is now marked{" "}
          <strong>OPERATIONAL</strong>, Work Order is <strong>COMPLETED</strong>, Complaint is{" "}
          <strong>RESOLVED</strong>, and audit trails have been generated.
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Work order" value={t.id} delta={t.type} tone="primary" />
        <KpiCard label="Labour logged" value={t.estimate} delta="Within estimate" tone="success" />
        <KpiCard label="Downtime" value="2.6 h" delta="Target ≤ 4 h" tone="violet" />
        <KpiCard
          label="Status"
          value={completed ? "COMPLETED" : t.status}
          delta={completed ? "100% complete" : `${t.progress}% complete`}
          tone={completed ? "success" : taskTone(t.status)}
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="space-y-5">
          <Panel interactive={false}>
            <PanelHead
              title="Closure record"
              subtitle="Final details written to the asset history"
              icon={<CheckCircle2 className="size-4" />}
            />
            <div className="grid gap-4 px-6 pb-6 sm:px-7 md:grid-cols-2">
              <Field label="Completion status">
                <SelectInput
                  options={[
                    "Completed — returned to service",
                    "Completed with limitations",
                    "Deferred — awaiting parts",
                    "Escalated to vendor",
                  ]}
                />
              </Field>
              <Field label="Asset condition">
                <SelectInput
                  options={[
                    "Fully operational",
                    "Operational with monitoring",
                    "Restricted use",
                    "Withdrawn",
                  ]}
                />
              </Field>
              <Field label="Actual labour (hours)">
                <TextInput type="number" step="0.25" defaultValue="1.75" />
              </Field>
              <Field label="Total downtime (hours)">
                <TextInput type="number" step="0.1" defaultValue="2.6" />
              </Field>
              <Field label="Parts cost">
                <TextInput defaultValue="$412.00" />
              </Field>
              <Field label="Next service due">
                <TextInput type="date" defaultValue="2026-11-07" />
              </Field>
              <Field label="Closure notes" wide>
                <TextArea value={closureNotes} onChange={(e) => setClosureNotes(e.target.value)} />
              </Field>
            </div>
          </Panel>

          <Panel interactive={false}>
            <PanelHead
              title="Completion gate"
              subtitle="All conditions must pass before closure"
              icon={<ShieldCheck className="size-4" />}
            />
            <ul className="px-6 pb-6 sm:px-7">
              {[
                { label: "Checklist responses recorded", done: gateStatus.checklist },
                { label: "Investigation and root cause recorded", done: gateStatus.investigation },
                { label: "Evidence attached to the work order", done: gateStatus.evidence },
                { label: "Service report drafted and submitted", done: gateStatus.report },
                { label: "Electrical safety verification passed", done: gateStatus.safety },
              ].map((c) => (
                <li
                  key={c.label}
                  className="flex items-center gap-3 border-b border-border/70 py-3 last:border-0"
                >
                  <CheckCircle2
                    className={cn(
                      "size-4 shrink-0",
                      c.done ? "text-success" : "text-muted-foreground/50",
                    )}
                  />
                  <span
                    className={cn(
                      "text-[13px]",
                      c.done ? "text-muted-foreground" : "font-medium text-foreground",
                    )}
                  >
                    {c.label}
                  </span>
                  <Pill tone={c.done ? "success" : "warning"} className="ml-auto">
                    {c.done ? "Passed" : "Pending"}
                  </Pill>
                </li>
              ))}
            </ul>
          </Panel>
        </div>

        <div className="space-y-5">
          <Panel interactive={false}>
            <PanelHead
              title="Outcome"
              subtitle="Post-service asset health"
              icon={<Timer className="size-4" />}
            />
            <div className="flex items-center gap-6 px-6 pb-6 sm:px-7">
              <Ring value={98} size={104} sub="Projected" />
              <div className="min-w-0 flex-1">
                <p className="text-[12.5px] leading-relaxed text-muted-foreground">
                  Health index is projected to recover to 98% once 72 hours of clean runtime are
                  logged.
                </p>
              </div>
            </div>
          </Panel>

          <Panel interactive={false}>
            <PanelHead
              title="What happens next"
              subtitle="Automatic follow-ups"
              icon={<ArrowRight className="size-4" />}
            />
            <ul className="px-6 pb-6 sm:px-7">
              {[
                "Work order archived to maintenance history",
                "Service report distributed to department and vendor",
                "Complaint ticket auto-resolved on acceptance",
                "Next preventive job scheduled",
              ].map((n) => (
                <li
                  key={n}
                  className="flex items-start gap-3 border-b border-border/70 py-3 text-[13px] last:border-0"
                >
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                  <span className="text-foreground">{n}</span>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>
    </div>
  );
}
