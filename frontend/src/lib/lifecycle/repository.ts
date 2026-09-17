/**
 * Client-side repository for the lifecycle domain.
 *
 * Every mutation is expressed as a pure `(state, payload) => state` reducer so the
 * same call signatures can later be backed by HTTP:
 *   `await axios.post('/api/complaints', payload)` → returns the updated record.
 */
import {
  canTransition,
  complaintTransitions,
  equipmentTransitions,
  type Actor,
  type AuditEvent,
  type AuditInstance,
  type AuditQuestion,
  type AuditTemplate,
  type ChecklistItem,
  type ChecklistQuestion,
  type ChecklistTemplate,
  type ComplaintStatus,
  type MaintenanceType,
  type EquipmentStatus,
  type LifecycleComplaint,
  type LifecycleState,
  type LifecycleWorkOrder,
  type PartUsed,
  type Priority,
  type RootCause,
  type ServiceReport,
  type WorkOrderStage,
} from "./types";

export const nowISO = () => new Date().toISOString();

export function formatWhen(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })} · ${d.toLocaleTimeString(
    "en-GB",
    { hour: "2-digit", minute: "2-digit" },
  )}`;
}

let seq = 1000;
const uid = (prefix: string) => `${prefix}-${(seq += 1)}`;

/* ------------------ Administrator-configured checklist resolution ------------------ */

/**
 * Resolve the questions that apply to an asset: every active question on an active
 * template for the asset's category, plus questions configured for that asset alone.
 * Category questions come first, then equipment-specific additions.
 */
export function resolveChecklistQuestions(
  state: LifecycleState,
  equipmentId: string,
  maintenanceType?: MaintenanceType,
): ChecklistQuestion[] {
  const asset = state.equipment.find(
    (e) => e.id === equipmentId || (e as any).equipmentId === equipmentId,
  );
  if (!asset) return [];
  const templates = new Set(
    (state.checklistTemplates ?? [])
      .filter((t) => t.active && t.category?.toLowerCase() === asset.category?.toLowerCase())
      .map((t) => t.id),
  );
  return (state.checklistQuestions ?? [])
    .filter(
      (q) =>
        q.active &&
        (templates.has(q.templateId) ||
          q.equipmentId === equipmentId ||
          (asset && q.equipmentId === asset.id)) &&
        (!q.equipmentId ||
          q.equipmentId === equipmentId ||
          (asset && q.equipmentId === asset.id)) &&
        (q.maintenanceType === "All" || !maintenanceType || q.maintenanceType === maintenanceType),
    )
    .sort((a, b) => (a.equipmentId ? 1 : 0) - (b.equipmentId ? 1 : 0) || a.order - b.order);
}

function itemFromQuestion(q: ChecklistQuestion): ChecklistItem {
  return {
    id: q.id,
    questionId: q.id,
    templateId: q.templateId,
    label: q.text,
    responseType: q.responseType,
    ...(q.options ? { options: q.options } : {}),
    required: q.required,
    priority: q.priority,
    ...(q.helpText ? { helpText: q.helpText } : {}),
    scope: q.equipmentId ? "equipment" : "category",
  };
}

/**
 * Build the checklist an engineer works through: configured questions merged with
 * any answers already recorded on the work order.
 */
export function buildChecklist(
  state: LifecycleState,
  equipmentId: string,
  maintenanceType?: MaintenanceType,
  existing: ChecklistItem[] = [],
): ChecklistItem[] {
  const questions = resolveChecklistQuestions(state, equipmentId, maintenanceType);
  const answered = new Map(existing.map((i) => [i.questionId ?? i.id, i]));
  const merged = questions.map((q) => {
    const prev = answered.get(q.id);
    return prev
      ? { ...itemFromQuestion(q), ...prev, ...itemFromQuestion(q), ...pickAnswer(prev) }
      : itemFromQuestion(q);
  });
  // keep answered legacy / ad-hoc items that no longer map to a configured question
  const configured = new Set(questions.map((q) => q.id));
  const orphans = existing.filter((i) => !configured.has(i.questionId ?? i.id) && isAnswered(i));
  return [...merged, ...orphans];
}

/** Apply the current checklist configuration to every work order in the state. */
export function withResolvedChecklists(state: LifecycleState): LifecycleState {
  return {
    ...state,
    checklistTemplates: state.checklistTemplates ?? [],
    checklistQuestions: state.checklistQuestions ?? [],
    workOrders: state.workOrders.map((w) => ({
      ...w,
      checklist: buildChecklist(state, w.equipmentId, w.type, w.checklist),
    })),
  };
}

function pickAnswer(item: ChecklistItem): Partial<ChecklistItem> {
  return {
    ...(item.result ? { result: item.result } : {}),
    ...(item.value ? { value: item.value } : {}),
    ...(item.note ? { note: item.note } : {}),
    ...(item.answeredBy ? { answeredBy: item.answeredBy } : {}),
    ...(item.answeredAt ? { answeredAt: item.answeredAt } : {}),
  };
}

/** A checklist is complete when every required question has an answer. */
export function checklistGaps(items: ChecklistItem[]): ChecklistItem[] {
  return items.filter((i) => i.required && !isAnswered(i));
}

export function isAnswered(item: ChecklistItem): boolean {
  if (item.responseType && item.responseType !== "passfail" && item.responseType !== "yesno") {
    return Boolean(item.value && item.value.trim());
  }
  return Boolean(item.result);
}

function logEvent(
  state: LifecycleState,
  event: Omit<AuditEvent, "id" | "at"> & { at?: string },
): LifecycleState {
  const entry: AuditEvent = { id: uid("EV"), at: event.at ?? nowISO(), ...event };
  return { ...state, events: [entry, ...state.events] };
}

function setEquipmentStatus(
  state: LifecycleState,
  equipmentId: string,
  next: EquipmentStatus,
  actor: Actor,
  description: string,
): LifecycleState {
  const asset = state.equipment.find((e) => e.id === equipmentId);
  if (!asset) return state;
  if (!canTransition(equipmentTransitions, asset.status, next)) return state;
  const equipment = state.equipment.map((e) => (e.id === equipmentId ? { ...e, status: next } : e));
  return logEvent(
    { ...state, equipment },
    {
      user: actor.name,
      role: actor.role,
      action: `Equipment status → ${next}`,
      module: "Equipment",
      recordId: equipmentId,
      equipmentId,
      previousStatus: asset.status,
      newStatus: next,
      description,
    },
  );
}

function setComplaintStatus(
  state: LifecycleState,
  complaintId: string,
  next: ComplaintStatus,
  actor: Actor,
  description: string,
): LifecycleState {
  const complaint = state.complaints.find((c) => c.id === complaintId);
  if (!complaint) return state;
  if (!canTransition(complaintTransitions, complaint.status, next)) return state;
  const complaints = state.complaints.map((c) =>
    c.id === complaintId ? { ...c, status: next } : c,
  );
  return logEvent(
    { ...state, complaints },
    {
      user: actor.name,
      role: actor.role,
      action: `Complaint status → ${next}`,
      module: "Complaint",
      recordId: complaintId,
      equipmentId: complaint.equipmentId,
      previousStatus: complaint.status,
      newStatus: next,
      description,
    },
  );
}

function patchWorkOrder(
  state: LifecycleState,
  id: string,
  patch: Partial<LifecycleWorkOrder>,
): LifecycleState {
  return {
    ...state,
    workOrders: state.workOrders.map((w) => (w.id === id ? { ...w, ...patch } : w)),
  };
}

/* --------------------------------- Actions ----------------------------------- */

export const actions = {
  createComplaint(
    state: LifecycleState,
    actor: Actor,
    input: {
      equipmentId: string;
      title: string;
      description: string;
      priority: Priority;
      evidence?: { name: string; kind: string; when: string }[];
    },
  ): LifecycleState {
    const asset = state.equipment.find((e) => e.id === input.equipmentId);
    const id = `CMP-${new Date().getFullYear()}-${String(state.complaints.length + 46).padStart(4, "0")}`;
    const complaint: LifecycleComplaint = {
      id,
      equipmentId: input.equipmentId,
      title: input.title,
      description: input.description,
      department: asset?.department ?? "Unassigned",
      priority: input.priority,
      status: "Open",
      reportedBy: actor.name,
      reportedAt: nowISO(),
      evidence: input.evidence ?? [],
      messages: [
        { who: actor.name, role: actor.role, when: formatWhen(nowISO()), body: input.description },
      ],
    };
    let next: LifecycleState = { ...state, complaints: [complaint, ...state.complaints] };
    next = logEvent(next, {
      user: actor.name,
      role: actor.role,
      action: "Created complaint",
      module: "Complaint",
      recordId: id,
      equipmentId: input.equipmentId,
      newStatus: "Open",
      description: input.title,
    });
    if (asset && input.priority === "Critical") {
      next = setEquipmentStatus(
        next,
        asset.id,
        "Under Breakdown",
        { name: "Medixa", role: "admin" },
        `Critical complaint ${id} raised.`,
      );
    }
    return next;
  },

  reviewComplaint(
    state: LifecycleState,
    actor: Actor,
    complaintId: string,
    note: string,
  ): LifecycleState {
    let next = setComplaintStatus(
      state,
      complaintId,
      "Under Review",
      actor,
      note || "Complaint triaged by administrator.",
    );
    next = {
      ...next,
      complaints: next.complaints.map((c) =>
        c.id === complaintId
          ? {
              ...c,
              messages: [
                ...c.messages,
                {
                  who: actor.name,
                  role: actor.role,
                  when: formatWhen(nowISO()),
                  body: note || "Complaint reviewed.",
                },
              ],
            }
          : c,
      ),
    };
    return next;
  },

  assignEngineer(
    state: LifecycleState,
    actor: Actor,
    complaintId: string,
    engineer: string,
    scheduledFor: string,
  ): LifecycleState {
    const complaint = state.complaints.find((c) => c.id === complaintId);
    if (!complaint) return state;
    let next = state;
    if (complaint.status === "Open")
      next = setComplaintStatus(
        next,
        complaintId,
        "Under Review",
        actor,
        "Auto-triaged on assignment.",
      );
    const woId =
      complaint.workOrderId ??
      `WO-${new Date().getFullYear()}-${String(state.workOrders.length + 113).padStart(4, "0")}`;
    if (!complaint.workOrderId) {
      const wo: LifecycleWorkOrder = {
        id: woId,
        equipmentId: complaint.equipmentId,
        complaintId,
        title: `Investigate ${complaint.title}`,
        type: "Breakdown",
        engineer,
        department: complaint.department,
        scheduledFor,
        stage: "Assigned",
        checklist: buildChecklist(state, complaint.equipmentId, "Breakdown"),
        parts: [],
        tools: [],
        evidence: [],
        testResults: [],
      };
      next = { ...next, workOrders: [wo, ...next.workOrders] };
    } else {
      next = patchWorkOrder(next, woId, { engineer, scheduledFor });
    }
    next = {
      ...next,
      complaints: next.complaints.map((c) =>
        c.id === complaintId
          ? {
              ...c,
              assignedEngineer: engineer,
              assignedAt: nowISO(),
              workOrderId: woId,
              messages: [
                ...c.messages,
                {
                  who: actor.name,
                  role: actor.role,
                  when: formatWhen(nowISO()),
                  body: `${engineer} assigned · work order ${woId} raised.`,
                },
              ],
            }
          : c,
      ),
    };
    next = setComplaintStatus(
      next,
      complaintId,
      "Assigned",
      actor,
      `${engineer} assigned to ${complaintId}.`,
    );
    next = logEvent(next, {
      user: actor.name,
      role: actor.role,
      action: "Assigned biomedical engineer",
      module: "Maintenance",
      recordId: woId,
      equipmentId: complaint.equipmentId,
      newStatus: "Assigned",
      description: `${engineer} assigned to ${complaintId}.`,
    });
    return next;
  },

  startInvestigation(state: LifecycleState, actor: Actor, workOrderId: string): LifecycleState {
    const wo = state.workOrders.find((w) => w.id === workOrderId);
    if (!wo) return state;
    let next = patchWorkOrder(state, workOrderId, { stage: "Investigation", startedAt: nowISO() });
    next = setEquipmentStatus(
      next,
      wo.equipmentId,
      "Under Maintenance",
      actor,
      `Investigation started under ${workOrderId}.`,
    );
    if (wo.complaintId)
      next = setComplaintStatus(
        next,
        wo.complaintId,
        "Investigation",
        actor,
        "Engineer began on-site investigation.",
      );
    next = logEvent(next, {
      user: actor.name,
      role: actor.role,
      action: "Started maintenance",
      module: "Maintenance",
      recordId: workOrderId,
      equipmentId: wo.equipmentId,
      newStatus: "Investigation",
      description: "Engineer started the investigation and isolated the asset.",
    });
    return next;
  },

  saveChecklist(
    state: LifecycleState,
    actor: Actor,
    workOrderId: string,
    checklist: LifecycleWorkOrder["checklist"],
  ): LifecycleState {
    const wo = state.workOrders.find((w) => w.id === workOrderId);
    if (!wo) return state;
    const stamped = checklist.map((item) =>
      isAnswered(item) && !item.answeredAt
        ? { ...item, answeredBy: actor.name, answeredAt: nowISO() }
        : item,
    );
    let next = patchWorkOrder(state, workOrderId, { checklist: stamped, stage: "Checklist" });
    const failed = stamped.filter((c) => c.result === "fail");
    const gaps = checklistGaps(stamped);
    next = logEvent(next, {
      user: actor.name,
      role: actor.role,
      action: "Diagnostic checklist recorded",
      module: "Maintenance",
      recordId: workOrderId,
      equipmentId: wo.equipmentId,
      description: `${stamped.filter(isAnswered).length} of ${stamped.length} answered · ${failed.length} failed${gaps.length ? ` · ${gaps.length} required question(s) outstanding` : ""}.`,
    });

    return next;
  },

  saveRootCause(
    state: LifecycleState,
    actor: Actor,
    workOrderId: string,
    rootCause: RootCause,
  ): LifecycleState {
    const wo = state.workOrders.find((w) => w.id === workOrderId);
    if (!wo) return state;
    let next = patchWorkOrder(state, workOrderId, {
      rootCause: { ...rootCause, recordedAt: nowISO(), recordedBy: actor.name },
      stage: "Root Cause",
    });
    if (wo.complaintId)
      next = setComplaintStatus(
        next,
        wo.complaintId,
        "Maintenance In Progress",
        actor,
        "Root cause identified, repair underway.",
      );
    next = logEvent(next, {
      user: actor.name,
      role: actor.role,
      action: "Root cause recorded",
      module: "Maintenance",
      recordId: workOrderId,
      equipmentId: wo.equipmentId,
      description: `${rootCause.category} — ${rootCause.description}`,
    });
    return next;
  },

  saveCorrectiveAction(
    state: LifecycleState,
    actor: Actor,
    workOrderId: string,
    input: { parts: PartUsed[]; tools: string[]; durationMins: number; awaitingParts: boolean },
  ): LifecycleState {
    const wo = state.workOrders.find((w) => w.id === workOrderId);
    if (!wo) return state;
    let next = patchWorkOrder(state, workOrderId, {
      parts: input.parts,
      tools: input.tools,
      durationMins: input.durationMins,
      stage: "Corrective Action",
    });
    if (input.awaitingParts) {
      next = setEquipmentStatus(
        next,
        wo.equipmentId,
        "Awaiting Parts",
        actor,
        "Repair paused pending spare parts.",
      );
      if (wo.complaintId)
        next = setComplaintStatus(
          next,
          wo.complaintId,
          "Awaiting Parts",
          actor,
          "Awaiting spare parts delivery.",
        );
    }
    next = logEvent(next, {
      user: actor.name,
      role: actor.role,
      action: "Corrective action recorded",
      module: "Maintenance",
      recordId: workOrderId,
      equipmentId: wo.equipmentId,
      description: `${input.parts.length} part(s) used · ${input.durationMins} min on task.`,
    });
    return next;
  },

  addEvidence(
    state: LifecycleState,
    actor: Actor,
    workOrderId: string,
    evidence: LifecycleWorkOrder["evidence"],
  ): LifecycleState {
    const wo = state.workOrders.find((w) => w.id === workOrderId);
    if (!wo) return state;
    let next = patchWorkOrder(state, workOrderId, {
      evidence: [...wo.evidence, ...evidence],
      stage: "Evidence",
    });
    next = logEvent(next, {
      user: actor.name,
      role: actor.role,
      action: "Evidence uploaded",
      module: "Maintenance",
      recordId: workOrderId,
      equipmentId: wo.equipmentId,
      description: evidence.map((e) => e.name).join(", "),
    });
    return next;
  },

  saveTesting(
    state: LifecycleState,
    actor: Actor,
    workOrderId: string,
    input: { testResults: LifecycleWorkOrder["testResults"]; safetyVerified: boolean },
  ): LifecycleState {
    const wo = state.workOrders.find((w) => w.id === workOrderId);
    if (!wo) return state;
    let next = patchWorkOrder(state, workOrderId, {
      testResults: input.testResults,
      safetyVerified: input.safetyVerified,
      stage: "Testing",
    });
    next = setEquipmentStatus(
      next,
      wo.equipmentId,
      "Maintenance Completed",
      actor,
      "Repair complete, entering verification.",
    );
    next = setEquipmentStatus(
      next,
      wo.equipmentId,
      "Under Verification",
      actor,
      "Post-repair verification in progress.",
    );
    if (wo.complaintId)
      next = setComplaintStatus(
        next,
        wo.complaintId,
        "Testing",
        actor,
        "Post-repair testing in progress.",
      );
    next = logEvent(next, {
      user: actor.name,
      role: actor.role,
      action: "Equipment tested",
      module: "Maintenance",
      recordId: workOrderId,
      equipmentId: wo.equipmentId,
      newStatus: "Under Verification",
      description: `${input.testResults.filter((t) => t.pass).length}/${input.testResults.length} tests passed · safety ${input.safetyVerified ? "verified" : "not verified"}.`,
    });
    return next;
  },

  submitServiceReport(
    state: LifecycleState,
    actor: Actor,
    workOrderId: string,
    summary: string,
  ): LifecycleState {
    const wo = state.workOrders.find((w) => w.id === workOrderId);
    if (!wo) return state;
    const id =
      wo.serviceReportId ??
      `SR-${new Date().getFullYear()}-${String(state.reports.length + 88).padStart(4, "0")}`;
    const report: ServiceReport = {
      id,
      workOrderId,
      equipmentId: wo.equipmentId,
      ...(wo.complaintId ? { complaintId: wo.complaintId } : {}),
      engineer: actor.name,
      summary,
      submittedAt: nowISO(),
      decision: "Submitted",
    };
    let next: LifecycleState = {
      ...state,
      reports: [report, ...state.reports.filter((r) => r.id !== id)],
    };
    next = patchWorkOrder(next, workOrderId, {
      serviceReportId: id,
      stage: "Submitted",
      completedAt: nowISO(),
      finalCondition: "Under Verification",
    });
    next = logEvent(next, {
      user: actor.name,
      role: actor.role,
      action: "Service report submitted",
      module: "Service Report",
      recordId: id,
      equipmentId: wo.equipmentId,
      description: summary.slice(0, 140),
    });
    return next;
  },

  reviewServiceReport(
    state: LifecycleState,
    actor: Actor,
    reportId: string,
    decision: "Approved" | "Rejected",
    note: string,
  ): LifecycleState {
    const report = state.reports.find((r) => r.id === reportId);
    if (!report) return state;
    let next: LifecycleState = {
      ...state,
      reports: state.reports.map((r) =>
        r.id === reportId
          ? { ...r, decision, reviewNote: note, reviewedAt: nowISO(), reviewedBy: actor.name }
          : r,
      ),
    };
    if (decision === "Approved") {
      next = patchWorkOrder(next, report.workOrderId, {
        stage: "Approved",
        finalCondition: "Operational",
      });
      next = setEquipmentStatus(
        next,
        report.equipmentId,
        "Operational",
        actor,
        "Asset returned to clinical service after approval.",
      );
      if (report.complaintId) {
        next = setComplaintStatus(
          next,
          report.complaintId,
          "Resolved",
          actor,
          "Service report approved.",
        );
        next = setComplaintStatus(
          next,
          report.complaintId,
          "Closed",
          actor,
          "Complaint closed after verification.",
        );
      }
    } else {
      next = patchWorkOrder(next, report.workOrderId, { stage: "Testing" });
    }
    next = logEvent(next, {
      user: actor.name,
      role: actor.role,
      action: `Service report ${decision.toLowerCase()}`,
      module: "Service Report",
      recordId: reportId,
      equipmentId: report.equipmentId,
      newStatus: decision === "Approved" ? "Operational" : "Under Maintenance",
      description: note || `Report ${decision.toLowerCase()} by ${actor.name}.`,
    });
    return next;
  },

  /* --------------------------------- Audits ---------------------------------- */

  createTemplate(
    state: LifecycleState,
    actor: Actor,
    input: { name: string; scope: string; description: string; questions: AuditQuestion[] },
  ): LifecycleState {
    const id = `AT-${String(state.templates.length + 1).padStart(3, "0")}`;
    const template: AuditTemplate = {
      id,
      name: input.name,
      scope: input.scope,
      description: input.description,
      createdBy: actor.name,
      createdAt: nowISO(),
      active: true,
      questions: input.questions,
    };
    return logEvent(
      { ...state, templates: [template, ...state.templates] },
      {
        user: actor.name,
        role: actor.role,
        action: "Audit template created",
        module: "Audit",
        recordId: id,
        description: `${input.name} · ${input.questions.length} questions.`,
      },
    );
  },

  updateTemplateQuestions(
    state: LifecycleState,
    actor: Actor,
    templateId: string,
    questions: AuditQuestion[],
  ): LifecycleState {
    return logEvent(
      {
        ...state,
        templates: state.templates.map((t) => (t.id === templateId ? { ...t, questions } : t)),
      },
      {
        user: actor.name,
        role: actor.role,
        action: "Audit questions updated",
        module: "Audit",
        recordId: templateId,
        description: `${questions.length} questions on the template.`,
      },
    );
  },

  assignAudit(
    state: LifecycleState,
    actor: Actor,
    input: {
      templateId: string;
      equipmentId: string;
      assignedTo: string;
      dueBy: string;
      workOrderId?: string;
    },
  ): LifecycleState {
    const id = `AU-${new Date().getFullYear()}-${String(state.audits.length + 35).padStart(4, "0")}`;
    const audit: AuditInstance = {
      id,
      templateId: input.templateId,
      equipmentId: input.equipmentId,
      ...(input.workOrderId ? { workOrderId: input.workOrderId } : {}),
      assignedTo: input.assignedTo,
      assignedBy: actor.name,
      assignedAt: nowISO(),
      dueBy: input.dueBy,
      status: "Assigned",
      answers: [],
    };
    return logEvent(
      { ...state, audits: [audit, ...state.audits] },
      {
        user: actor.name,
        role: actor.role,
        action: "Audit assigned",
        module: "Audit",
        recordId: id,
        equipmentId: input.equipmentId,
        newStatus: "Assigned",
        description: `${input.assignedTo} assigned audit on ${input.equipmentId}.`,
      },
    );
  },

  saveAuditAnswers(
    state: LifecycleState,
    actor: Actor,
    auditId: string,
    answers: AuditInstance["answers"],
    submit: boolean,
  ): LifecycleState {
    const audit = state.audits.find((a) => a.id === auditId);
    if (!audit) return state;
    const nextAudit: AuditInstance = {
      ...audit,
      answers,
      status: submit ? "Submitted" : "In Progress",
      ...(submit ? { submittedAt: nowISO() } : {}),
    };
    return logEvent(
      { ...state, audits: state.audits.map((a) => (a.id === auditId ? nextAudit : a)) },
      {
        user: actor.name,
        role: actor.role,
        action: submit ? "Audit submitted" : "Audit progress saved",
        module: "Audit",
        recordId: auditId,
        equipmentId: audit.equipmentId,
        previousStatus: audit.status,
        newStatus: nextAudit.status,
        description: `${answers.length} answered question(s).`,
      },
    );
  },

  reviewAudit(
    state: LifecycleState,
    actor: Actor,
    auditId: string,
    decision: "Approved" | "Rejected",
    note: string,
  ): LifecycleState {
    const audit = state.audits.find((a) => a.id === auditId);
    if (!audit) return state;
    return logEvent(
      {
        ...state,
        audits: state.audits.map((a) =>
          a.id === auditId
            ? {
                ...a,
                status: decision,
                reviewNote: note,
                reviewedAt: nowISO(),
                reviewedBy: actor.name,
              }
            : a,
        ),
      },
      {
        user: actor.name,
        role: actor.role,
        action: `Audit ${decision.toLowerCase()}`,
        module: "Audit",
        recordId: auditId,
        equipmentId: audit.equipmentId,
        previousStatus: audit.status,
        newStatus: decision,
        description: note || `Audit ${decision.toLowerCase()} by ${actor.name}.`,
      },
    );
  },

  /* ------------------- Checklist configuration (administrator) ------------------- */

  saveChecklistTemplate(
    state: LifecycleState,
    actor: Actor,
    input: {
      id?: string;
      name: string;
      category: string;
      description: string;
      maintenanceType: ChecklistTemplate["maintenanceType"];
      active: boolean;
    },
  ): LifecycleState {
    const existing = input.id
      ? (state.checklistTemplates ?? []).find((t) => t.id === input.id)
      : undefined;
    const template: ChecklistTemplate = existing
      ? { ...existing, ...input }
      : {
          id: uid("CT"),
          name: input.name,
          category: input.category,
          description: input.description,
          maintenanceType: input.maintenanceType,
          active: input.active,
          createdBy: actor.name,
          createdAt: nowISO(),
        };
    const checklistTemplates = existing
      ? (state.checklistTemplates ?? []).map((t) => (t.id === template.id ? template : t))
      : [template, ...(state.checklistTemplates ?? [])];
    return logEvent(
      { ...state, checklistTemplates },
      {
        user: actor.name,
        role: actor.role,
        action: existing ? "Checklist template updated" : "Checklist template created",
        module: "Maintenance",
        recordId: template.id,
        description: `${template.name} · ${template.category}`,
      },
    );
  },

  saveChecklistQuestion(
    state: LifecycleState,
    actor: Actor,
    input: Omit<ChecklistQuestion, "id" | "order"> & { id?: string; order?: number },
  ): LifecycleState {
    const list = state.checklistQuestions ?? [];
    const existing = input.id ? list.find((q) => q.id === input.id) : undefined;
    const scopeCount = list.filter(
      (q) =>
        q.templateId === input.templateId && (q.equipmentId ?? "") === (input.equipmentId ?? ""),
    ).length;
    const question: ChecklistQuestion = existing
      ? { ...existing, ...input, id: existing.id, order: existing.order }
      : ({ ...input, id: uid("CQ"), order: input.order ?? scopeCount + 1 } as ChecklistQuestion);
    const checklistQuestions = existing
      ? list.map((q) => (q.id === question.id ? question : q))
      : [...list, question];
    return logEvent(
      { ...state, checklistQuestions },
      {
        user: actor.name,
        role: actor.role,
        action: existing ? "Checklist question updated" : "Checklist question added",
        module: "Maintenance",
        recordId: question.equipmentId ?? question.templateId,
        ...(question.equipmentId ? { equipmentId: question.equipmentId } : {}),
        description: `${question.text} (${question.responseType}${question.required ? " · required" : ""}).`,
      },
    );
  },

  deleteChecklistQuestion(state: LifecycleState, actor: Actor, questionId: string): LifecycleState {
    const list = state.checklistQuestions ?? [];
    const question = list.find((q) => q.id === questionId);
    if (!question) return state;
    return logEvent(
      { ...state, checklistQuestions: list.filter((q) => q.id !== questionId) },
      {
        user: actor.name,
        role: actor.role,
        action: "Checklist question removed",
        module: "Maintenance",
        recordId: question.equipmentId ?? question.templateId,
        ...(question.equipmentId ? { equipmentId: question.equipmentId } : {}),
        description: question.text,
      },
    );
  },

  moveChecklistQuestion(
    state: LifecycleState,
    _actor: Actor,
    questionId: string,
    direction: -1 | 1,
  ): LifecycleState {
    const list = [...(state.checklistQuestions ?? [])];
    const question = list.find((q) => q.id === questionId);
    if (!question) return state;
    const siblings = list
      .filter(
        (q) =>
          q.templateId === question.templateId &&
          (q.equipmentId ?? "") === (question.equipmentId ?? ""),
      )
      .sort((a, b) => a.order - b.order);
    const idx = siblings.findIndex((q) => q.id === questionId);
    const swap = siblings[idx + direction];
    if (!swap) return state;
    const a = question.order;
    const b = swap.order;
    return {
      ...state,
      checklistQuestions: list.map((q) =>
        q.id === question.id ? { ...q, order: b } : q.id === swap.id ? { ...q, order: a } : q,
      ),
    };
  },

  /** Refresh a work order's checklist from the current configuration. */
  syncWorkOrderChecklist(state: LifecycleState, actor: Actor, workOrderId: string): LifecycleState {
    const wo = state.workOrders.find((w) => w.id === workOrderId);
    if (!wo) return state;
    const checklist = buildChecklist(state, wo.equipmentId, wo.type, wo.checklist);
    return logEvent(patchWorkOrder(state, workOrderId, { checklist }), {
      user: actor.name,
      role: actor.role,
      action: "Checklist synced with configuration",
      module: "Maintenance",
      recordId: workOrderId,
      equipmentId: wo.equipmentId,
      description: `${checklist.length} configured question(s) applied.`,
    });
  },
};

export type StageIndex = Record<WorkOrderStage, number>;
