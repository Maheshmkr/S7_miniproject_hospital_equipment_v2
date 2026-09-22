import { useCallback, useEffect, useMemo, useState } from "react";
import { ClipboardList, ArrowDown, ArrowUp, Layers, Plus, Trash2, Wrench } from "lucide-react";
import { toast } from "sonner";
import { Panel, PanelHead, PageHeader, Pill, EmptyState } from "@/components/ui/primitives";
import { ActionBtn, Crumbs, Field, inputCls } from "./kit";
import { useChecklistConfig, useLifecycle } from "@/lib/lifecycle/store";
import { actions } from "@/lib/lifecycle/repository";
import { apiEnabled } from "@/lib/api/client";
import { equipmentApi } from "@/lib/api/equipmentApi";
import { checklistsApi } from "@/lib/api/checklistsApi";
import { useEquipmentRecord } from "@/lib/api/useEquipment";
import {
  checklistResponseLabels,
  checklistResponseTypes,
  type ChecklistPriority,
  type ChecklistQuestion,
  type ChecklistResponseType,
} from "@/lib/lifecycle/types";

const priorities: ChecklistPriority[] = ["Low", "Medium", "High", "Critical"];
const priorityTone: Record<ChecklistPriority, "neutral" | "primary" | "warning" | "danger"> = {
  Low: "neutral",
  Medium: "primary",
  High: "warning",
  Critical: "danger",
};

type Draft = {
  text: string;
  responseType: ChecklistResponseType;
  priority: ChecklistPriority;
  required: boolean;
  options: string;
  helpText: string;
};

const emptyDraft: Draft = {
  text: "",
  responseType: "passfail",
  priority: "Medium",
  required: true,
  options: "",
  helpText: "",
};

function QuestionRow({
  question,
  index,
  onMove,
  onDelete,
  onToggle,
}: {
  question: ChecklistQuestion;
  index: number;
  onMove: (dir: -1 | 1) => void;
  onDelete: () => void;
  onToggle: () => void;
}) {
  return (
    <div className="flex flex-wrap items-start gap-3 rounded-2xl border border-border p-4">
      <span className="grid size-7 shrink-0 place-items-center rounded-full bg-surface-muted text-[11px] font-bold text-muted-foreground">
        {index + 1}
      </span>
      <div className="min-w-0 flex-1">
        <p
          className={`text-[13px] font-semibold ${question.active ? "text-foreground" : "text-muted-foreground line-through"}`}
        >
          {question.text}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <Pill tone="neutral">{checklistResponseLabels[question.responseType]}</Pill>
          <Pill tone={priorityTone[question.priority]}>{question.priority}</Pill>
          {question.required ? (
            <Pill tone="danger">Required</Pill>
          ) : (
            <Pill tone="neutral">Optional</Pill>
          )}
          {question.equipmentId ? <Pill tone="violet">Asset specific</Pill> : null}
          {question.maintenanceType !== "All" ? (
            <Pill tone="primary">{question.maintenanceType}</Pill>
          ) : null}
        </div>
        {question.helpText ? (
          <p className="mt-1.5 text-[11.5px] text-muted-foreground">{question.helpText}</p>
        ) : null}
        {question.options?.length ? (
          <p className="mt-1.5 text-[11.5px] text-muted-foreground">
            Options: {question.options.join(" · ")}
          </p>
        ) : null}
      </div>
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => onMove(-1)}
          className="grid size-8 place-items-center rounded-xl border border-border text-muted-foreground transition-colors hover:bg-surface-muted"
          aria-label="Move up"
        >
          <ArrowUp className="size-3.5" />
        </button>
        <button
          onClick={() => onMove(1)}
          className="grid size-8 place-items-center rounded-xl border border-border text-muted-foreground transition-colors hover:bg-surface-muted"
          aria-label="Move down"
        >
          <ArrowDown className="size-3.5" />
        </button>
        <button
          onClick={onToggle}
          className="rounded-xl border border-border px-3 py-1.5 text-[11.5px] font-semibold text-muted-foreground transition-colors hover:bg-surface-muted"
        >
          {question.active ? "Disable" : "Enable"}
        </button>
        <button
          onClick={onDelete}
          className="grid size-8 place-items-center rounded-xl border border-border text-danger transition-colors hover:bg-danger-soft"
          aria-label="Delete question"
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>
    </div>
  );
}

function AddQuestion({ onAdd, label }: { onAdd: (draft: Draft) => void; label: string }) {
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((p) => ({ ...p, [k]: v }));
  return (
    <div className="space-y-4 rounded-2xl border border-dashed border-border p-4">
      <Field label={label}>
        <input
          className={inputCls}
          placeholder="e.g. Verify flow sensor accuracy against reference"
          value={draft.text}
          onChange={(e) => set("text", e.target.value)}
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Response type">
          <select
            className={inputCls}
            value={draft.responseType}
            onChange={(e) => set("responseType", e.target.value as ChecklistResponseType)}
          >
            {checklistResponseTypes.map((t) => (
              <option key={t} value={t}>
                {checklistResponseLabels[t]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Priority">
          <select
            className={inputCls}
            value={draft.priority}
            onChange={(e) => set("priority", e.target.value as ChecklistPriority)}
          >
            {priorities.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Requirement">
          <select
            className={inputCls}
            value={draft.required ? "required" : "optional"}
            onChange={(e) => set("required", e.target.value === "required")}
          >
            <option value="required">Required</option>
            <option value="optional">Optional</option>
          </select>
        </Field>
      </div>
      {draft.responseType === "dropdown" ? (
        <Field label="Dropdown options" hint="Comma separated.">
          <input
            className={inputCls}
            placeholder="Within tolerance, Marginal, Out of tolerance"
            value={draft.options}
            onChange={(e) => set("options", e.target.value)}
          />
        </Field>
      ) : null}
      <Field
        label="Guidance for the engineer"
        hint="Optional helper text shown under the question."
      >
        <input
          className={inputCls}
          placeholder="Reference the IEC 62353 limit table."
          value={draft.helpText}
          onChange={(e) => set("helpText", e.target.value)}
        />
      </Field>
      <ActionBtn
        disabled={!draft.text.trim()}
        onClick={() => {
          onAdd(draft);
          setDraft(emptyDraft);
        }}
      >
        <Plus className="size-4" /> Add question
      </ActionBtn>
    </div>
  );
}

export function ChecklistConfigPage({ equipmentId }: { equipmentId: string }) {
  const { run } = useLifecycle();
  const live = useEquipmentRecord(equipmentId);
  const {
    asset: localAsset,
    templates: localTemplates,
    categoryQuestions: localCatQuestions,
    equipmentQuestions: localEqQuestions,
    resolved: localResolved,
  } = useChecklistConfig(equipmentId);

  // Asset resolved from local state or live backend record
  const asset =
    localAsset ||
    (live.item
      ? {
          id: live.item.equipmentId || live.item._id,
          name: live.item.name,
          category: live.item.category,
          status: (live.item.status as any) || "Active",
        }
      : null);

  const [apiData, setApiData] = useState<{
    templates: any[];
    questions: any[];
  } | null>(null);

  const fetchChecklist = useCallback(async () => {
    if (!apiEnabled || !equipmentId) return;
    try {
      const res = await equipmentApi.checklist(equipmentId);
      if (res) {
        setApiData({ templates: res.templates || [], questions: res.questions || [] });
      }
    } catch {
      // ignore
    }
  }, [equipmentId]);

  useEffect(() => {
    void fetchChecklist();
  }, [fetchChecklist]);

  const questionsFromApi: ChecklistQuestion[] = useMemo(() => {
    if (!apiData?.questions) return [];
    return apiData.questions.map((q: any) => {
      const respType =
        q.responseType?.toLowerCase() === "pass_fail"
          ? "passfail"
          : q.responseType?.toLowerCase() === "yes_no"
            ? "yesno"
            : (q.responseType?.toLowerCase() as ChecklistResponseType) || "passfail";
      const prio =
        q.priority === "CRITICAL" ? "Critical" : q.priority === "IMPORTANT" ? "High" : "Medium";
      return {
        id: q._id || q.id,
        templateId: typeof q.templateId === "object" ? q.templateId?._id : q.templateId,
        equipmentId: q.scope === "equipment" ? equipmentId || asset?.id : undefined,
        category: asset?.category || "",
        text: q.question || q.text || "",
        responseType: respType,
        options: q.options || [],
        priority: prio as ChecklistPriority,
        required: q.required !== false,
        helpText: q.helpText || "",
        order: q.order ?? 0,
        active: q.active !== false,
      };
    });
  }, [apiData, equipmentId, asset]);

  const useLive = apiEnabled && apiData !== null && apiData.questions.length > 0;
  const templates = (useLive ? apiData?.templates : localTemplates) || [];
  const template = templates.find((t) => t.active) ?? templates[0];

  const categoryQuestions = useLive
    ? questionsFromApi.filter((q) => !q.equipmentId).sort((a, b) => a.order - b.order)
    : localCatQuestions;

  const equipmentQuestions = useLive
    ? questionsFromApi.filter((q) => !!q.equipmentId).sort((a, b) => a.order - b.order)
    : localEqQuestions;

  const resolved = useLive
    ? questionsFromApi
        .filter((q) => q.active)
        .sort((a, b) => (a.equipmentId ? 1 : 0) - (b.equipmentId ? 1 : 0) || a.order - b.order)
    : localResolved;

  if (!asset) {
    if (live.loading) {
      return (
        <div className="space-y-6">
          <PageHeader
            eyebrow="Maintenance configuration"
            title="Loading equipment…"
            description="Fetching asset details from the equipment register."
          />
          <Panel>
            <div className="py-16 text-center text-[13px] text-muted-foreground">
              Loading equipment profile…
            </div>
          </Panel>
        </div>
      );
    }
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Maintenance configuration"
          title="Equipment not found"
          description={`No asset matches ${equipmentId}.`}
        />
        <Panel>
          <EmptyState
            icon={<ClipboardList className="size-6" />}
            title="Nothing to configure"
            hint="Pick an asset from the equipment register."
            action={<ActionBtn to="/equipment/list">Equipment register</ActionBtn>}
          />
        </Panel>
      </div>
    );
  }

  const assetId = asset.id || equipmentId;
  const assetName = asset.name || "Equipment";
  const assetCategory = asset.category || "Medical Equipment";

  const add = async (draft: Draft, scope: "category" | "equipment") => {
    if (!asset) return;

    if (apiEnabled) {
      try {
        await equipmentApi.addChecklistQuestion(equipmentId, {
          question: draft.text.trim(),
          responseType: draft.responseType,
          priority: draft.priority,
          required: draft.required,
          options:
            draft.responseType === "dropdown"
              ? draft.options
                  .split(",")
                  .map((o) => o.trim())
                  .filter(Boolean)
              : undefined,
          helpText: draft.helpText.trim() || undefined,
          scope,
        });
        toast.success(
          scope === "equipment"
            ? `Added question specific to ${assetName}`
            : `Added category question for ${assetCategory}`,
        );
        await fetchChecklist();
      } catch (err: any) {
        toast.error(err?.message || "Failed to save checklist question to database.");
      }
    }

    // Auto-create local template if one doesn't exist yet so it never blocks
    let targetTemplateId = template?.id;
    if (!targetTemplateId) {
      const fallbackTemplate = {
        name: `${assetCategory} Diagnostic Checklist`,
        category: assetCategory,
        description: `Checklist for ${assetCategory}`,
        maintenanceType: "All" as const,
        active: true,
      };
      run((s, a) => actions.saveChecklistTemplate(s, a, fallbackTemplate));
      targetTemplateId = `CT-${assetCategory.toUpperCase().replace(/\s+/g, "_")}`;
    }

    run((s, a) =>
      actions.saveChecklistQuestion(s, a, {
        templateId: targetTemplateId,
        category: assetCategory,
        ...(scope === "equipment" ? { equipmentId: assetId } : {}),
        maintenanceType: "All",
        text: draft.text.trim(),
        responseType: draft.responseType,
        ...(draft.responseType === "dropdown"
          ? {
              options: draft.options
                .split(",")
                .map((o) => o.trim())
                .filter(Boolean),
            }
          : {}),
        required: draft.required,
        priority: draft.priority,
        ...(draft.helpText.trim() ? { helpText: draft.helpText.trim() } : {}),
        active: true,
      }),
    );

    if (!apiEnabled) {
      toast.success(
        scope === "equipment"
          ? `Added question specific to ${assetName}`
          : `Added category question for ${assetCategory}`,
      );
    }
  };

  const rowActions = (q: ChecklistQuestion, index: number) => (
    <QuestionRow
      key={q.id}
      question={q}
      index={index}
      onMove={(dir) => run((s, a) => actions.moveChecklistQuestion(s, a, q.id, dir))}
      onDelete={async () => {
        if (apiEnabled && q.id && !q.id.startsWith("CQ-")) {
          try {
            await checklistsApi.deleteQuestion(q.id);
            await fetchChecklist();
          } catch {
            // ignore
          }
        }
        run((s, a) => actions.deleteChecklistQuestion(s, a, q.id));
        toast.success("Question removed");
      }}
      onToggle={async () => {
        if (apiEnabled && q.id && !q.id.startsWith("CQ-")) {
          try {
            await checklistsApi.updateQuestion(q.id, { active: !q.active });
            await fetchChecklist();
          } catch {
            // ignore
          }
        }
        run((s, a) => actions.saveChecklistQuestion(s, a, { ...q, active: !q.active }));
      }}
    />
  );

  return (
    <div className="space-y-6">
      <Crumbs
        trail={[
          { label: "Equipment", to: "/equipment" },
          { label: assetId, to: `/equipment/${assetId}` },
          { label: "Maintenance checklist" },
        ]}
      />
      <PageHeader
        eyebrow={`${assetId} · ${assetCategory}`}
        title="Maintenance checklist configuration"
        description="Questions defined here are what biomedical engineers answer during maintenance. Category questions apply to every asset in the category; asset-specific questions apply to this unit only."
        actions={
          <div className="flex items-center gap-2">
            <Pill tone="primary">{resolved.length} active question(s)</Pill>
            <ActionBtn variant="ghost" to={`/equipment/${assetId}`}>
              Back to asset
            </ActionBtn>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <Panel>
            <PanelHead
              title={`Category checklist — ${assetCategory}`}
              subtitle={
                template
                  ? `${template.name} · inherited by every ${assetCategory} asset`
                  : "No template configured for this category yet."
              }
              icon={<Layers className="size-4" />}
            />
            <div className="space-y-4 px-6 pb-6 sm:px-7">
              {categoryQuestions.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-border p-6 text-center text-[13px] text-muted-foreground">
                  No category questions yet.
                </p>
              ) : (
                categoryQuestions.map((q, i) => rowActions(q, i))
              )}
              <AddQuestion label="New category question" onAdd={(d) => add(d, "category")} />
            </div>
          </Panel>

          <Panel>
            <PanelHead
              title={`Asset-specific checklist — ${assetName}`}
              subtitle="Extra questions that only appear on work orders for this unit."
              icon={<Wrench className="size-4" />}
            />
            <div className="space-y-4 px-6 pb-6 sm:px-7">
              {equipmentQuestions.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-border p-6 text-center text-[13px] text-muted-foreground">
                  No asset-specific questions yet.
                </p>
              ) : (
                equipmentQuestions.map((q, i) => rowActions(q, i))
              )}
              <AddQuestion label="New asset-specific question" onAdd={(d) => add(d, "equipment")} />
            </div>
          </Panel>
        </div>

        <Panel>
          <PanelHead
            title="Engineer preview"
            subtitle="Exactly what the engineer sees on the checklist step of a work order."
            icon={<ClipboardList className="size-4" />}
          />
          <ol className="space-y-3 px-6 pb-6 sm:px-7">
            {resolved.map((q, i) => (
              <li key={q.id} className="rounded-2xl border border-border p-3.5">
                <p className="text-[12.5px] font-semibold text-foreground">
                  {i + 1}. {q.text}
                  {q.required ? <span className="ml-1 text-danger">*</span> : null}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <Pill tone="neutral">{checklistResponseLabels[q.responseType]}</Pill>
                  <Pill tone={priorityTone[q.priority]}>{q.priority}</Pill>
                  {q.equipmentId ? <Pill tone="violet">Asset specific</Pill> : null}
                </div>
              </li>
            ))}
            {resolved.length === 0 ? (
              <li className="py-6 text-center text-[13px] text-muted-foreground">
                Nothing configured yet.
              </li>
            ) : null}
          </ol>
        </Panel>
      </div>
    </div>
  );
}
