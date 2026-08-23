import { useMemo, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { ClipboardList, FileCheck2, ListChecks, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Panel, PanelHead, PageHeader, Pill, EmptyState } from "@/components/ui/primitives";
import { ActionBtn, AuditTrail, Crumbs, DefRow, Field, inputCls } from "./kit";
import { useLifecycle, useLifecycleAnalytics } from "@/lib/lifecycle/store";
import { actions, formatWhen } from "@/lib/lifecycle/repository";
import {
  auditResponseTypes,
  type AuditInstance,
  type AuditQuestion,
  type AuditResponseType,
  type AuditStatus,
} from "@/lib/lifecycle/types";
import { auditApi } from "@/lib/api/auditApi";
import { apiEnabled } from "@/lib/api/client";

const statusTone: Record<
  AuditStatus,
  "neutral" | "primary" | "success" | "warning" | "danger" | "violet"
> = {
  Assigned: "primary",
  "In Progress": "warning",
  Submitted: "violet",
  Approved: "success",
  Rejected: "danger",
};

const typeLabel: Record<AuditResponseType, string> = {
  yesno: "Yes / No",
  text: "Text",
  number: "Number",
  date: "Date",
  dropdown: "Dropdown",
  evidence: "File / Evidence",
};

function AuditTabs({ active }: { active: string }) {
  const tabs = [
    { key: "dashboard", label: "Audit dashboard", to: "/audits" },
    { key: "templates", label: "Templates", to: "/audits/templates" },
    { key: "assign", label: "Assign audit", to: "/audits/assign" },
    { key: "history", label: "Audit history", to: "/audits/history" },
  ];
  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-2xl border border-border bg-surface p-1.5 shadow-xs">
      {tabs.map((t) => (
        <Link
          key={t.key}
          to={t.to as never}
          className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-[12.5px] font-semibold transition-all ${
            active === t.key
              ? "bg-primary-soft text-primary"
              : "text-muted-foreground hover:bg-surface-muted hover:text-foreground"
          }`}
        >
          {t.label}
        </Link>
      ))}
    </div>
  );
}

/* ------------------------------ Audit dashboard -------------------------------- */

export function AuditDashboard() {
  const { state } = useLifecycle();
  const analytics = useLifecycleAnalytics();
  const counts = useMemo(() => {
    const by = (s: AuditStatus) => state.audits.filter((a) => a.status === s).length;
    return [
      {
        label: "Active templates",
        value: state.templates.filter((t) => t.active).length,
        tone: "primary" as const,
      },
      {
        label: "Audits assigned",
        value: by("Assigned") + by("In Progress"),
        tone: "warning" as const,
      },
      { label: "Awaiting review", value: by("Submitted"), tone: "violet" as const },
      { label: "Approved", value: by("Approved"), tone: "success" as const },
    ];
  }, [state]);

  const colors = [
    "var(--chart-1)",
    "var(--chart-2)",
    "var(--chart-3)",
    "var(--chart-4)",
    "var(--chart-5)",
  ];

  return (
    <div className="space-y-6">
      <Crumbs trail={[{ label: "Command Center", to: "/" }, { label: "Audit management" }]} />
      <PageHeader
        eyebrow="Governance"
        title="Audit management"
        description="Create audit templates, assign them to biomedical engineers and review the completed evidence."
        actions={
          <>
            <ActionBtn variant="ghost" to="/audits/templates">
              Templates
            </ActionBtn>
            <ActionBtn to="/audits/templates/new">
              <Plus className="size-4" /> New template
            </ActionBtn>
          </>
        }
      />
      <AuditTabs active="dashboard" />

      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
        {counts.map((c) => (
          <Panel key={c.label}>
            <div className="p-6">
              <p className="text-[12px] font-medium text-muted-foreground">{c.label}</p>
              <p className="mt-3 text-[28px] font-bold leading-none tabular-nums">{c.value}</p>
              <Pill tone={c.tone} className="mt-3">
                Live from shared data
              </Pill>
            </div>
          </Panel>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Panel>
          <PanelHead
            title="Open audits"
            subtitle="Assigned, in progress and awaiting administrator review."
            icon={<ClipboardList className="size-4" />}
          />
          <AuditTable audits={state.audits.filter((a) => a.status !== "Approved")} />
        </Panel>
        <Panel>
          <PanelHead
            title="Root cause distribution"
            subtitle="Derived from recorded maintenance RCAs."
          />
          <div className="h-[260px] px-4 pb-6">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={analytics.rootCauseDistribution}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={54}
                  outerRadius={92}
                  paddingAngle={3}
                >
                  {analytics.rootCauseDistribution.map((_, i) => (
                    <Cell key={i} fill={colors[i % colors.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      <Panel>
        <PanelHead
          title="Failure frequency by asset"
          subtitle="Repeated failures are surfaced for audit targeting."
        />
        <div className="h-[260px] px-4 pb-6">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={analytics.failureByEquipment.slice(0, 8)}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="id" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <Tooltip />
              <Bar dataKey="failures" fill="var(--chart-1)" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      <AuditTrail
        events={state.events.filter((e) => e.module === "Audit").slice(0, 10)}
        title="Audit activity"
      />
    </div>
  );
}

function AuditTable({ audits }: { audits: AuditInstance[] }) {
  const { state } = useLifecycle();
  if (!audits.length)
    return (
      <EmptyState
        icon={<ClipboardList className="size-6" />}
        title="No audits"
        hint="Assign a template to an engineer to get started."
        action={<ActionBtn to="/audits/assign">Assign audit</ActionBtn>}
      />
    );
  return (
    <div className="overflow-x-auto px-6 pb-6 sm:px-7">
      <table className="w-full text-[12.5px]">
        <thead className="text-muted-foreground">
          <tr className="border-b border-border">
            <th className="py-2.5 text-left font-semibold">Audit</th>
            <th className="py-2.5 text-left font-semibold">Template</th>
            <th className="py-2.5 text-left font-semibold">Equipment</th>
            <th className="py-2.5 text-left font-semibold">Assigned to</th>
            <th className="py-2.5 text-left font-semibold">Due</th>
            <th className="py-2.5 text-left font-semibold">Status</th>
          </tr>
        </thead>
        <tbody>
          {audits.map((a) => {
            const t = state.templates.find((x) => x.id === a.templateId);
            return (
              <tr
                key={a.id}
                className="border-b border-border/70 transition-colors hover:bg-surface-muted"
              >
                <td className="py-3">
                  <Link to={`/audits/${a.id}` as never} className="font-semibold text-primary">
                    {a.id}
                  </Link>
                </td>
                <td className="py-3 text-muted-foreground">{t?.name ?? a.templateId}</td>
                <td className="py-3">{a.equipmentId}</td>
                <td className="py-3">{a.assignedTo}</td>
                <td className="py-3 text-muted-foreground">{a.dueBy}</td>
                <td className="py-3">
                  <Pill tone={statusTone[a.status]}>{a.status}</Pill>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* -------------------------------- Templates ------------------------------------ */

export function AuditTemplates() {
  const { state } = useLifecycle();
  return (
    <div className="space-y-6">
      <Crumbs trail={[{ label: "Audits", to: "/audits" }, { label: "Templates" }]} />
      <PageHeader
        eyebrow="Governance"
        title="Audit templates"
        description="Administrator-owned question sets. Questions are never hard-coded into the engineer workflow."
        actions={
          <ActionBtn to="/audits/templates/new">
            <Plus className="size-4" /> Create template
          </ActionBtn>
        }
      />
      <AuditTabs active="templates" />
      <div className="grid gap-6 lg:grid-cols-2">
        {state.templates.map((t) => (
          <Panel key={t.id}>
            <PanelHead
              title={t.name}
              subtitle={t.scope}
              icon={<ListChecks className="size-4" />}
              action={
                <Pill tone={t.active ? "success" : "neutral"}>
                  {t.active ? "Active" : "Archived"}
                </Pill>
              }
            />
            <div className="px-6 pb-6 sm:px-7">
              <p className="text-[13px] text-muted-foreground">{t.description}</p>
              <dl className="mt-4">
                <DefRow label="Questions" value={`${t.questions.length}`} />
                <DefRow label="Created by" value={`${t.createdBy} · ${formatWhen(t.createdAt)}`} />
                <DefRow
                  label="In use"
                  value={`${state.audits.filter((a) => a.templateId === t.id).length} audit(s)`}
                />
              </dl>
              <div className="mt-4 flex gap-2">
                <ActionBtn variant="ghost" to={`/audits/templates/${t.id}`}>
                  Open template
                </ActionBtn>
                <ActionBtn to={`/audits/assign?template=${t.id}`}>Assign</ActionBtn>
              </div>
            </div>
          </Panel>
        ))}
      </div>
    </div>
  );
}

function QuestionEditor({
  questions,
  setQuestions,
}: {
  questions: AuditQuestion[];
  setQuestions: (q: AuditQuestion[]) => void;
}) {
  const [draft, setDraft] = useState<{
    prompt: string;
    type: AuditResponseType;
    required: boolean;
    options: string;
  }>({
    prompt: "",
    type: "yesno",
    required: true,
    options: "",
  });
  return (
    <div className="space-y-4">
      {questions.map((q, i) => (
        <div key={q.id} className="flex items-start gap-3 rounded-2xl border border-border p-4">
          <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-lg bg-primary-soft text-[11px] font-bold text-primary">
            {i + 1}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-semibold text-foreground">{q.prompt}</p>
            <div className="mt-1.5 flex flex-wrap gap-2">
              <Pill tone="neutral">{typeLabel[q.type]}</Pill>
              {q.required ? <Pill tone="warning">Required</Pill> : null}
              {q.options?.length ? <Pill tone="violet">{q.options.length} options</Pill> : null}
            </div>
          </div>
          <button
            onClick={() => setQuestions(questions.filter((x) => x.id !== q.id))}
            className="text-muted-foreground transition-colors hover:text-danger"
            aria-label="Remove question"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      ))}
      <div className="grid gap-3 rounded-2xl border border-dashed border-border p-4 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_auto]">
        <input
          className={inputCls}
          placeholder="Question prompt e.g. What was the root cause?"
          value={draft.prompt}
          onChange={(e) => setDraft({ ...draft, prompt: e.target.value })}
        />
        <select
          className={inputCls}
          value={draft.type}
          onChange={(e) => setDraft({ ...draft, type: e.target.value as AuditResponseType })}
        >
          {auditResponseTypes.map((t) => (
            <option key={t} value={t}>
              {typeLabel[t]}
            </option>
          ))}
        </select>
        <ActionBtn
          variant="ghost"
          onClick={() => {
            if (!draft.prompt.trim()) return;
            const opts = draft.options
              .split(",")
              .map((o) => o.trim())
              .filter(Boolean);
            setQuestions([
              ...questions,
              {
                id: `q${questions.length + 1}-${Date.now()}`,
                prompt: draft.prompt,
                type: draft.type,
                required: draft.required,
                ...(opts.length ? { options: opts } : {}),
              },
            ]);
            setDraft({ prompt: "", type: "yesno", required: true, options: "" });
          }}
        >
          Add question
        </ActionBtn>
        {draft.type === "dropdown" ? (
          <input
            className={`${inputCls} sm:col-span-3`}
            placeholder="Dropdown options, comma separated"
            value={draft.options}
            onChange={(e) => setDraft({ ...draft, options: e.target.value })}
          />
        ) : null}
        <label className="flex items-center gap-2 text-[12.5px] text-muted-foreground sm:col-span-3">
          <input
            type="checkbox"
            checked={draft.required}
            onChange={(e) => setDraft({ ...draft, required: e.target.checked })}
          />
          Mandatory response
        </label>
      </div>
    </div>
  );
}

export function CreateAuditTemplate() {
  const { run } = useLifecycle();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [scope, setScope] = useState("");
  const [description, setDescription] = useState("");
  const [questions, setQuestions] = useState<AuditQuestion[]>([]);

  return (
    <div className="space-y-6">
      <Crumbs
        trail={[
          { label: "Audits", to: "/audits" },
          { label: "Templates", to: "/audits/templates" },
          { label: "New" },
        ]}
      />
      <PageHeader
        eyebrow="Governance"
        title="Create audit template"
        description="Define the questions the administrator wants answered after maintenance."
      />
      <AuditTabs active="templates" />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <Panel>
          <PanelHead title="Template details" icon={<ListChecks className="size-4" />} />
          <div className="grid gap-5 px-6 pb-6 sm:px-7">
            <Field label="Template name">
              <input
                className={inputCls}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Post-maintenance corrective audit"
              />
            </Field>
            <Field label="Scope">
              <input
                className={inputCls}
                value={scope}
                onChange={(e) => setScope(e.target.value)}
                placeholder="Breakdown & corrective work orders"
              />
            </Field>
            <Field label="Description">
              <textarea
                rows={3}
                className={inputCls}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </Field>
            <div>
              <p className="mb-3 text-[13px] font-semibold text-foreground">Audit questions</p>
              <QuestionEditor questions={questions} setQuestions={setQuestions} />
            </div>
            <ActionBtn
              disabled={!name || questions.length === 0}
              onClick={async () => {
                if (apiEnabled) {
                  try {
                    await auditApi.createTemplate({ name, scope, description, questions });
                  } catch (_err) {
                    // fall through to local action
                  }
                }
                run((s, a) =>
                  actions.createTemplate(s, a, { name, scope, description, questions }),
                );
                toast.success("Audit template created");
                void navigate({ to: "/audits/templates" });
              }}
            >
              Save template
            </ActionBtn>
          </div>
        </Panel>
        <Panel>
          <PanelHead
            title="What a good audit answers"
            subtitle="Cover these to make the audit conclusive."
          />
          <ul className="space-y-2 px-6 pb-6 text-[12.5px] text-muted-foreground sm:px-7">
            {[
              "What happened and when?",
              "Who reported it and who investigated?",
              "What was found and why did it happen?",
              "Was preventive maintenance overdue?",
              "What corrective action was taken?",
              "What evidence supports the finding?",
              "Was the equipment tested and verified?",
              "When was it returned to service?",
              "Has the same failure happened before?",
            ].map((q) => (
              <li key={q} className="flex gap-2">
                <span className="text-primary">•</span>
                {q}
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  );
}

export function AuditTemplateDetails({ id }: { id: string }) {
  const { state, run } = useLifecycle();
  const template = state.templates.find((t) => t.id === id);
  const [questions, setQuestions] = useState<AuditQuestion[]>(template?.questions ?? []);
  if (!template)
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Audits"
          title="Template not found"
          description={`No template matches ${id}.`}
        />
        <Panel>
          <EmptyState
            icon={<ListChecks className="size-6" />}
            title="Missing template"
            hint="Pick one from the template register."
            action={<ActionBtn to="/audits/templates">Templates</ActionBtn>}
          />
        </Panel>
      </div>
    );

  return (
    <div className="space-y-6">
      <Crumbs
        trail={[
          { label: "Audits", to: "/audits" },
          { label: "Templates", to: "/audits/templates" },
          { label: template.id },
        ]}
      />
      <PageHeader
        eyebrow={template.id}
        title={template.name}
        description={template.description}
        actions={
          <ActionBtn to={`/audits/assign?template=${template.id}`}>Assign to engineer</ActionBtn>
        }
      />
      <AuditTabs active="templates" />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <Panel>
          <PanelHead
            title="Audit questions"
            subtitle="Add or remove questions — engineers answer exactly this set."
          />
          <div className="px-6 pb-6 sm:px-7">
            <QuestionEditor questions={questions} setQuestions={setQuestions} />
            <div className="mt-4">
              <ActionBtn
                onClick={() => {
                  run((s, a) => actions.updateTemplateQuestions(s, a, template.id, questions));
                  toast.success("Questions updated");
                }}
              >
                Save questions
              </ActionBtn>
            </div>
          </div>
        </Panel>
        <Panel>
          <PanelHead title="Template metadata" />
          <dl className="px-6 pb-6 sm:px-7">
            <DefRow label="Scope" value={template.scope} />
            <DefRow label="Created by" value={template.createdBy} />
            <DefRow label="Created" value={formatWhen(template.createdAt)} />
            <DefRow
              label="Audits raised"
              value={`${state.audits.filter((a) => a.templateId === template.id).length}`}
            />
          </dl>
        </Panel>
      </div>
    </div>
  );
}

/* --------------------------------- Assign -------------------------------------- */

export function AssignAudit() {
  const { state, run } = useLifecycle();
  const navigate = useNavigate();
  const engineers = Array.from(new Set(state.workOrders.map((w) => w.engineer)));
  const [templateId, setTemplateId] = useState(state.templates[0]?.id ?? "");
  const [equipmentId, setEquipmentId] = useState(state.equipment[0]?.id ?? "");
  const [assignedTo, setAssignedTo] = useState(engineers[0] ?? "Daniel Okafor");
  const [dueBy, setDueBy] = useState("");
  const [workOrderId, setWorkOrderId] = useState("");
  const linkedWorkOrders = state.workOrders.filter((w) => w.equipmentId === equipmentId);

  return (
    <div className="space-y-6">
      <Crumbs trail={[{ label: "Audits", to: "/audits" }, { label: "Assign" }]} />
      <PageHeader
        eyebrow="Governance"
        title="Assign audit"
        description="Send a template to a biomedical engineer against a specific asset or work order."
      />
      <AuditTabs active="assign" />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Panel>
          <PanelHead title="Assignment" icon={<ShieldCheck className="size-4" />} />
          <div className="grid gap-5 px-6 pb-6 sm:px-7 sm:grid-cols-2">
            <Field label="Template">
              <select
                className={inputCls}
                value={templateId}
                onChange={(e) => setTemplateId(e.target.value)}
              >
                {state.templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Equipment">
              <select
                className={inputCls}
                value={equipmentId}
                onChange={(e) => setEquipmentId(e.target.value)}
              >
                {state.equipment.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.id} · {e.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Biomedical engineer">
              <select
                className={inputCls}
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
              >
                {engineers.map((e) => (
                  <option key={e} value={e}>
                    {e}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Due by">
              <input
                type="date"
                className={inputCls}
                value={dueBy}
                onChange={(e) => setDueBy(e.target.value)}
              />
            </Field>
            <Field label="Linked work order (optional)">
              <select
                className={inputCls}
                value={workOrderId}
                onChange={(e) => setWorkOrderId(e.target.value)}
              >
                <option value="">None</option>
                {linkedWorkOrders.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.id} · {w.title}
                  </option>
                ))}
              </select>
            </Field>
            <div className="flex items-end">
              <ActionBtn
                disabled={!templateId || !equipmentId || !dueBy}
                onClick={async () => {
                  if (apiEnabled) {
                    try {
                      await auditApi.assign({
                        templateId,
                        equipmentId,
                        assignedTo,
                        dueBy: new Date(dueBy).toISOString(),
                      });
                    } catch (_err) {
                      // fall through to local action
                    }
                  }
                  run((s, a) =>
                    actions.assignAudit(s, a, {
                      templateId,
                      equipmentId,
                      assignedTo,
                      dueBy: new Date(dueBy).toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      }),
                      ...(workOrderId ? { workOrderId } : {}),
                    }),
                  );
                  toast.success("Audit assigned");
                  void navigate({ to: "/audits" });
                }}
              >
                Assign audit
              </ActionBtn>
            </div>
          </div>
        </Panel>
        <Panel>
          <PanelHead title="Recent audits" subtitle="Assignment history for context." />
          <AuditTable audits={state.audits.slice(0, 6)} />
        </Panel>
      </div>
    </div>
  );
}

/* --------------------------- Audit details / respond ---------------------------- */

export function AuditDetails({ id }: { id: string }) {
  const { state, actor } = useLifecycle();
  const audit = state.audits.find((a) => a.id === id);
  const template = audit ? state.templates.find((t) => t.id === audit.templateId) : undefined;
  if (!audit || !template)
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Audits"
          title="Audit not found"
          description={`No audit matches ${id}.`}
        />
        <Panel>
          <EmptyState
            icon={<FileCheck2 className="size-6" />}
            title="Missing audit"
            hint="Open one from the audit dashboard."
            action={<ActionBtn to="/audits">Audit dashboard</ActionBtn>}
          />
        </Panel>
      </div>
    );

  const events = state.events.filter(
    (e) => e.recordId === audit.id || e.equipmentId === audit.equipmentId,
  );
  const canRespond = actor.name === audit.assignedTo || actor.role === "engineer";

  return (
    <div className="space-y-6">
      <Crumbs trail={[{ label: "Audits", to: "/audits" }, { label: audit.id }]} />
      <PageHeader
        eyebrow={template.name}
        title={`Audit ${audit.id}`}
        description={`${audit.equipmentId} · assigned to ${audit.assignedTo} · due ${audit.dueBy}`}
        actions={
          <div className="flex items-center gap-2">
            <Pill tone={statusTone[audit.status]}>{audit.status}</Pill>
            {canRespond && audit.status !== "Approved" ? (
              <ActionBtn to={`/audits/${audit.id}/respond`}>Respond</ActionBtn>
            ) : null}
            {actor.role === "admin" && audit.status === "Submitted" ? (
              <ActionBtn to={`/audits/${audit.id}/review`}>Review</ActionBtn>
            ) : null}
          </div>
        }
      />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <Panel>
          <PanelHead
            title="Responses"
            subtitle={`${audit.answers.length} of ${template.questions.length} answered`}
          />
          <dl className="px-6 pb-6 sm:px-7">
            {template.questions.map((q) => {
              const answer = audit.answers.find((a) => a.questionId === q.id);
              return (
                <DefRow
                  key={q.id}
                  label={q.prompt}
                  value={
                    answer?.value || <span className="text-muted-foreground">Not answered</span>
                  }
                />
              );
            })}
          </dl>
        </Panel>
        <div className="space-y-6">
          <Panel>
            <PanelHead title="Audit metadata" />
            <dl className="px-6 pb-6 sm:px-7">
              <DefRow label="Template" value={template.name} />
              <DefRow label="Equipment" value={audit.equipmentId} />
              <DefRow label="Work order" value={audit.workOrderId ?? "—"} />
              <DefRow
                label="Assigned by"
                value={`${audit.assignedBy} · ${formatWhen(audit.assignedAt)}`}
              />
              <DefRow
                label="Submitted"
                value={audit.submittedAt ? formatWhen(audit.submittedAt) : "—"}
              />
              <DefRow
                label="Reviewed"
                value={
                  audit.reviewedAt ? `${audit.reviewedBy} · ${formatWhen(audit.reviewedAt)}` : "—"
                }
              />
              <DefRow label="Review note" value={audit.reviewNote ?? "—"} />
            </dl>
          </Panel>
          <AuditTrail events={events.slice(0, 8)} />
        </div>
      </div>
    </div>
  );
}

export function AuditRespond({ id }: { id: string }) {
  const { state, run } = useLifecycle();
  const navigate = useNavigate();
  const audit = state.audits.find((a) => a.id === id);
  const template = audit ? state.templates.find((t) => t.id === audit.templateId) : undefined;
  const [answers, setAnswers] = useState<Record<string, string>>(
    Object.fromEntries((audit?.answers ?? []).map((a) => [a.questionId, a.value])),
  );
  if (!audit || !template)
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Audits"
          title="Audit not found"
          description={`No audit matches ${id}.`}
        />
      </div>
    );

  const set = (qid: string, v: string) => setAnswers((p) => ({ ...p, [qid]: v }));
  const missing = template.questions.filter((q) => q.required && !answers[q.id]);

  return (
    <div className="space-y-6">
      <Crumbs
        trail={[
          { label: "Audits", to: "/audits" },
          { label: audit.id, to: `/audits/${audit.id}` },
          { label: "Respond" },
        ]}
      />
      <PageHeader
        eyebrow={template.name}
        title="Answer audit"
        description={`Complete the administrator's questions for ${audit.equipmentId}.`}
      />
      <Panel>
        <PanelHead
          title="Questions"
          subtitle={`${template.questions.length} questions · ${missing.length} required outstanding`}
        />
        <div className="grid gap-5 px-6 pb-6 sm:px-7">
          {template.questions.map((q, i) => (
            <Field
              key={q.id}
              label={`${i + 1}. ${q.prompt}${q.required ? " *" : ""}`}
              hint={q.helper}
            >
              {q.type === "yesno" ? (
                <div className="flex gap-2">
                  {["Yes", "No"].map((v) => (
                    <button
                      key={v}
                      onClick={() => set(q.id, v)}
                      className={`rounded-xl px-4 py-2 text-[12.5px] font-semibold transition-colors ${
                        answers[q.id] === v
                          ? "bg-primary-soft text-primary"
                          : "border border-border text-muted-foreground hover:bg-surface-muted"
                      }`}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              ) : q.type === "dropdown" ? (
                <select
                  className={inputCls}
                  value={answers[q.id] ?? ""}
                  onChange={(e) => set(q.id, e.target.value)}
                >
                  <option value="">Select…</option>
                  {(q.options ?? []).map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              ) : q.type === "number" ? (
                <input
                  type="number"
                  className={inputCls}
                  value={answers[q.id] ?? ""}
                  onChange={(e) => set(q.id, e.target.value)}
                />
              ) : q.type === "date" ? (
                <input
                  type="date"
                  className={inputCls}
                  value={answers[q.id] ?? ""}
                  onChange={(e) => set(q.id, e.target.value)}
                />
              ) : q.type === "evidence" ? (
                <input
                  className={inputCls}
                  placeholder="Evidence file name"
                  value={answers[q.id] ?? ""}
                  onChange={(e) => set(q.id, e.target.value)}
                />
              ) : (
                <textarea
                  rows={2}
                  className={inputCls}
                  value={answers[q.id] ?? ""}
                  onChange={(e) => set(q.id, e.target.value)}
                />
              )}
            </Field>
          ))}
          <div className="flex flex-wrap gap-2">
            <ActionBtn
              variant="ghost"
              onClick={async () => {
                const answerList = Object.entries(answers).map(([questionId, value]) => ({
                  questionId,
                  value,
                }));
                if (apiEnabled) {
                  try {
                    await auditApi.respond(audit.id, answerList, false);
                  } catch (_err) {
                    // local action fallback
                  }
                }
                run((s, a) => actions.saveAuditAnswers(s, a, audit.id, answerList, false));
                toast.success("Progress saved");
              }}
            >
              Save progress
            </ActionBtn>
            <ActionBtn
              disabled={missing.length > 0}
              onClick={async () => {
                const answerList = Object.entries(answers).map(([questionId, value]) => ({
                  questionId,
                  value,
                }));
                if (apiEnabled) {
                  try {
                    await auditApi.respond(audit.id, answerList, true);
                  } catch (_err) {
                    // local action fallback
                  }
                }
                run((s, a) => actions.saveAuditAnswers(s, a, audit.id, answerList, true));
                toast.success("Audit submitted for administrator review");
                void navigate({ to: `/audits/${audit.id}` as never });
              }}
            >
              Submit audit
            </ActionBtn>
          </div>
        </div>
      </Panel>
    </div>
  );
}

export function AuditReview({ id }: { id: string }) {
  const { state, run, actor } = useLifecycle();
  const navigate = useNavigate();
  const audit = state.audits.find((a) => a.id === id);
  const template = audit ? state.templates.find((t) => t.id === audit.templateId) : undefined;
  const [note, setNote] = useState("");
  if (!audit || !template)
    return (
      <PageHeader
        eyebrow="Audits"
        title="Audit not found"
        description={`No audit matches ${id}.`}
      />
    );

  return (
    <div className="space-y-6">
      <Crumbs
        trail={[
          { label: "Audits", to: "/audits" },
          { label: audit.id, to: `/audits/${audit.id}` },
          { label: "Review" },
        ]}
      />
      <PageHeader
        eyebrow={template.name}
        title="Review audit"
        description="Confirm the engineer's evidence answers the governance questions before approving."
      />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <Panel>
          <PanelHead
            title="Submitted responses"
            subtitle={audit.submittedAt ? formatWhen(audit.submittedAt) : "Not yet submitted"}
          />
          <dl className="px-6 pb-6 sm:px-7">
            {template.questions.map((q) => (
              <DefRow
                key={q.id}
                label={q.prompt}
                value={audit.answers.find((a) => a.questionId === q.id)?.value || "Not answered"}
              />
            ))}
          </dl>
        </Panel>
        <Panel>
          <PanelHead
            title="Decision"
            subtitle={
              actor.role === "admin" ? "Approve or reject the audit." : "Administrators only."
            }
          />
          <div className="space-y-4 px-6 pb-6 sm:px-7">
            <Field label="Review note">
              <textarea
                rows={4}
                className={inputCls}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                disabled={actor.role !== "admin"}
              />
            </Field>
            <div className="flex gap-2">
              <ActionBtn
                disabled={actor.role !== "admin" || audit.status !== "Submitted"}
                onClick={async () => {
                  if (apiEnabled) {
                    try {
                      await auditApi.review(audit.id, "APPROVED", note);
                    } catch (_err) {
                      // local action fallback
                    }
                  }
                  run((s, a) => actions.reviewAudit(s, a, audit.id, "Approved", note));
                  toast.success("Audit approved");
                  void navigate({ to: "/audits/history" });
                }}
              >
                Approve
              </ActionBtn>
              <ActionBtn
                variant="ghost"
                disabled={actor.role !== "admin" || audit.status !== "Submitted"}
                onClick={async () => {
                  if (apiEnabled) {
                    try {
                      await auditApi.review(
                        audit.id,
                        "REJECTED",
                        note || "Additional evidence required.",
                      );
                    } catch (_err) {
                      // local action fallback
                    }
                  }
                  run((s, a) =>
                    actions.reviewAudit(
                      s,
                      a,
                      audit.id,
                      "Rejected",
                      note || "Additional evidence required.",
                    ),
                  );
                  toast.message("Audit rejected");
                  void navigate({ to: "/audits/history" });
                }}
              >
                Reject
              </ActionBtn>
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}

export function AuditHistory() {
  const { state } = useLifecycle();
  return (
    <div className="space-y-6">
      <Crumbs trail={[{ label: "Audits", to: "/audits" }, { label: "History" }]} />
      <PageHeader
        eyebrow="Governance"
        title="Audit history"
        description="Every audit ever raised, with its decision and reviewer."
      />
      <AuditTabs active="history" />
      <Panel>
        <PanelHead title="All audits" subtitle={`${state.audits.length} record(s)`} />
        <AuditTable audits={state.audits} />
      </Panel>
      <AuditTrail
        events={state.events.filter((e) => e.module === "Audit")}
        title="Audit event log"
      />
    </div>
  );
}
