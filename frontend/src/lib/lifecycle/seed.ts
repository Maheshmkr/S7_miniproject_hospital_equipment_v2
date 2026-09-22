import { equipment as baseEquipment } from "@/lib/mock-data";
import type {
  AuditEvent,
  AuditInstance,
  AuditTemplate,
  ChecklistQuestion,
  ChecklistTemplate,
  LifecycleComplaint,
  LifecycleEquipment,
  LifecycleState,
  LifecycleWorkOrder,
  ServiceReport,
} from "./types";

const statusMap: Record<string, LifecycleEquipment["status"]> = {
  operational: "Operational",
  maintenance: "Under Maintenance",
  critical: "Under Breakdown",
  idle: "Active",
};

/** Equipment master derived from the existing shared mock registry — no duplicates. */
const getDerivedEquipment = (): LifecycleEquipment[] =>
  (baseEquipment || []).map((e) => ({
    id: e.id,
    name: e.name,
    category: e.category,
    department: e.dept,
    vendor: e.vendor,
    model: e.specs?.model || "",
    serial: e.specs?.serial || "",
    status: (statusMap[e.status] ?? "Active") as LifecycleEquipment["status"],
    health: e.health,
    installed: e.specs?.installed || "",
    location: e.specs?.location || "",
    cost: e.cost,
    lastPreventive: e.specs?.lastService || "",
    nextPreventive: e.specs?.nextService || "",
    preventiveOverdue: (e.specs?.nextService || "").toLowerCase().includes("overdue"),
    documents: [
      { name: `${e.id}-user-manual.pdf`, kind: "Manual", when: e.specs?.installed || "" },
      {
        name: `${e.id}-installation-certificate.pdf`,
        kind: "Certificate",
        when: e.specs?.installed || "",
      },
      {
        name: `${e.id}-last-calibration.pdf`,
        kind: "Calibration",
        when: e.specs?.lastService || "",
      },
    ],
  }));

const scenarioAsset: LifecycleEquipment = {
  id: "EQ-1001",
  name: "GE SIGNA Premier 3T MRI Scanner",
  category: "Imaging",
  department: "Radiology",
  vendor: "GE Healthcare",
  model: "SIGNA Premier 3T",
  serial: "SN-SIGNA-100174",
  status: "Under Breakdown",
  health: 62,
  installed: "18 Mar 2022",
  location: "Radiology · Level 2 · Scan Room B",
  cost: "$2.10M",
  amcId: "AMC-2288",
  lastPreventive: "02 Feb 2026",
  nextPreventive: "Overdue · 02 May 2026",
  preventiveOverdue: true,
  documents: [
    { name: "EQ-1001-user-manual.pdf", kind: "Manual", when: "18 Mar 2022" },
    { name: "EQ-1001-amc-contract.pdf", kind: "Contract", when: "18 Mar 2022" },
    { name: "EQ-1001-calibration-2026-02.pdf", kind: "Calibration", when: "02 Feb 2026" },
  ],
};

const complaints: LifecycleComplaint[] = [
  {
    id: "CMP-2026-0045",
    equipmentId: "EQ-1001",
    title: "MRI image quality degradation on T2 sequences",
    description:
      "Radiographers report visible banding and signal loss on T2 weighted sequences since Thursday. Repeat scans show the same artefact on multiple patients.",
    department: "Radiology",
    priority: "Critical",
    status: "Assigned",
    reportedBy: "Clara Whitfield",
    reportedAt: "2026-08-08T09:42:00Z",
    assignedEngineer: "Daniel Okafor",
    assignedAt: "2026-08-08T09:58:00Z",
    workOrderId: "WO-2026-0112",
    evidence: [
      { name: "artefact-scan-01.jpg", kind: "Image", when: "08 Aug 2026" },
      { name: "qa-phantom-log.pdf", kind: "Document", when: "08 Aug 2026" },
    ],
    messages: [
      {
        who: "Clara Whitfield",
        role: "staff",
        when: "08 Aug 2026 · 09:42",
        body: "Raised the complaint with phantom images attached. Scanning has been paused for elective cases.",
      },
      {
        who: "Emilia Greene",
        role: "admin",
        when: "08 Aug 2026 · 09:58",
        body: "Reviewed and assigned to Daniel Okafor. Priority raised to Critical given clinical impact.",
      },
    ],
  },
  {
    id: "CMP-2026-0044",
    equipmentId: "EQ-2210",
    title: "Ventilator humidifier alarm intermittently firing",
    description:
      "Humidifier alarm triggers roughly every two hours with no fault indication on the display.",
    department: "ICU",
    priority: "High",
    status: "Under Review",
    reportedBy: "ICU Charge Nurse",
    reportedAt: "2026-08-07T22:15:00Z",
    evidence: [],
    messages: [
      {
        who: "ICU Charge Nurse",
        role: "staff",
        when: "07 Aug 2026 · 22:15",
        body: "Alarm woke the bay twice overnight. Unit still ventilating normally.",
      },
    ],
  },
  {
    id: "CMP-2026-0041",
    equipmentId: "EQ-4127",
    title: "Anesthesia machine gas calibration drift",
    description:
      "Agent concentration reads 0.4% above the reference analyser during pre-use checks.",
    department: "Operating Theatre",
    priority: "Critical",
    status: "Maintenance In Progress",
    reportedBy: "OT Coordinator",
    reportedAt: "2026-08-06T07:05:00Z",
    assignedEngineer: "Tomás Herrera",
    assignedAt: "2026-08-06T08:10:00Z",
    workOrderId: "WO-2026-0108",
    evidence: [{ name: "pre-use-check.pdf", kind: "Document", when: "06 Aug 2026" }],
    messages: [],
  },
];

const workOrders: LifecycleWorkOrder[] = [
  {
    id: "WO-2026-0112",
    equipmentId: "EQ-1001",
    complaintId: "CMP-2026-0045",
    title: "Investigate MRI image quality degradation",
    type: "Breakdown",
    engineer: "Daniel Okafor",
    department: "Radiology",
    scheduledFor: "08 Aug 2026 · 10:30",
    stage: "Assigned",
    checklist: [
      { id: "c1", label: "Visual inspection of gradient and RF cabinets" },
      { id: "c2", label: "Verify chiller and helium levels within range" },
      { id: "c3", label: "Run daily QA phantom sequence" },
      { id: "c4", label: "Check RF coil connectors and cabling" },
      { id: "c5", label: "Review scanner error and event logs" },
      { id: "c6", label: "Confirm shim and centre-frequency calibration" },
      { id: "c7", label: "Electrical safety test (IEC 62353)" },
    ],
    parts: [],
    tools: [],
    evidence: [],
    testResults: [],
  },
  {
    id: "WO-2026-0108",
    equipmentId: "EQ-4127",
    complaintId: "CMP-2026-0041",
    title: "Anesthesia gas calibration",
    type: "Calibration",
    engineer: "Tomás Herrera",
    department: "Operating Theatre",
    scheduledFor: "06 Aug 2026 · 12:00",
    stage: "Corrective Action",
    startedAt: "2026-08-06T08:40:00Z",
    checklist: [
      { id: "c1", label: "Leak test breathing circuit", result: "pass" },
      { id: "c2", label: "Compare agent analyser to reference", result: "fail", note: "0.4% high" },
      { id: "c3", label: "Verify O2 cell calibration", result: "pass" },
    ],
    rootCause: {
      problemObserved: "Agent concentration reads 0.4% above reference analyser.",
      diagnosticFindings: "Analyser bench drift confirmed against calibrated reference gas.",
      category: "Calibration drift",
      description:
        "Gas bench calibration drifted beyond tolerance after 12 months of continuous use.",
      contributingFactor: "Annual calibration was deferred during the theatre refurbishment.",
      evidenceNote: "Reference gas comparison log attached.",
      correctiveAction: "Full gas bench calibration with certified reference mixture.",
      preventiveAction: "Move calibration to a 6-month cycle for high-utilisation theatres.",
      recordedAt: "2026-08-06T10:20:00Z",
      recordedBy: "Tomás Herrera",
    },
    parts: [{ name: "O2 sensor cell", partNo: "DR-6850645", qty: 1, cost: 180 }],
    tools: ["Reference gas kit", "Calibration analyser"],
    evidence: [{ name: "bench-before.jpg", kind: "Image", when: "06 Aug 2026", phase: "before" }],
    testResults: [],
  },
  {
    id: "WO-2026-0096",
    equipmentId: "EQ-3381",
    title: "Quarterly preventive service — Cath Lab",
    type: "Preventive",
    engineer: "Anita Raghavan",
    department: "Cardiology",
    scheduledFor: "22 Jul 2026 · 08:30",
    stage: "Approved",
    startedAt: "2026-07-22T08:30:00Z",
    completedAt: "2026-07-22T11:10:00Z",
    durationMins: 160,
    checklist: [
      { id: "c1", label: "Detector calibration", result: "pass" },
      { id: "c2", label: "Table motion safety interlocks", result: "pass" },
      { id: "c3", label: "Dose output verification", result: "pass" },
    ],
    parts: [],
    tools: ["Dose meter", "Torque set"],
    evidence: [{ name: "cathlab-after.jpg", kind: "Image", when: "22 Jul 2026", phase: "after" }],
    testResults: [
      { name: "Dose output", expected: "≤ 10% deviation", actual: "3.2%", pass: true },
      { name: "Image uniformity", expected: "Pass", actual: "Pass", pass: true },
    ],
    safetyVerified: true,
    finalCondition: "Operational",
    serviceReportId: "SR-2026-0087",
  },
];

const reports: ServiceReport[] = [
  {
    id: "SR-2026-0087",
    workOrderId: "WO-2026-0096",
    equipmentId: "EQ-3381",
    engineer: "Anita Raghavan",
    summary:
      "Quarterly preventive service completed. All safety interlocks and dose output within specification. Asset returned to clinical service.",
    submittedAt: "2026-07-22T11:30:00Z",
    reviewedAt: "2026-07-22T14:05:00Z",
    reviewedBy: "Emilia Greene",
    decision: "Approved",
    reviewNote: "Approved. Next preventive scheduled per AMC.",
  },
];

const templates: AuditTemplate[] = [
  {
    id: "AT-001",
    name: "Post-maintenance corrective audit",
    scope: "Breakdown & corrective work orders",
    description:
      "Verifies that an equipment failure was investigated, root-caused, corrected, evidenced and safely returned to clinical service.",
    createdBy: "Emilia Greene",
    createdAt: "2026-06-02T09:00:00Z",
    active: true,
    questions: [
      { id: "q1", prompt: "Was the equipment inspected on site?", type: "yesno", required: true },
      { id: "q2", prompt: "What fault was observed?", type: "text", required: true },
      { id: "q3", prompt: "What diagnostic tests were performed?", type: "text", required: true },
      {
        id: "q4",
        prompt: "What was the root cause?",
        type: "dropdown",
        required: true,
        options: [
          "Calibration drift",
          "Component wear",
          "Electrical fault",
          "Software fault",
          "User error",
          "Environmental",
          "Consumable depletion",
          "Overdue preventive maintenance",
        ],
      },
      {
        id: "q5",
        prompt: "Was preventive maintenance performed on schedule?",
        type: "yesno",
        required: true,
      },
      { id: "q6", prompt: "Were any parts replaced?", type: "text", required: false },
      { id: "q7", prompt: "Was evidence uploaded?", type: "evidence", required: true },
      { id: "q8", prompt: "Was corrective action completed?", type: "yesno", required: true },
      { id: "q9", prompt: "Was the equipment tested after repair?", type: "yesno", required: true },
      {
        id: "q10",
        prompt: "Is the equipment safe for clinical use?",
        type: "yesno",
        required: true,
      },
      {
        id: "q11",
        prompt: "When was the equipment returned to service?",
        type: "date",
        required: true,
      },
      { id: "q12", prompt: "Total downtime in hours", type: "number", required: false },
    ],
  },
  {
    id: "AT-002",
    name: "Annual electrical safety audit",
    scope: "All Class II / IIb assets",
    description: "IEC 62353 aligned electrical safety verification carried out annually per asset.",
    createdBy: "Emilia Greene",
    createdAt: "2026-01-14T09:00:00Z",
    active: true,
    questions: [
      { id: "q1", prompt: "Protective earth resistance (Ω)", type: "number", required: true },
      {
        id: "q2",
        prompt: "Equipment leakage current within limits?",
        type: "yesno",
        required: true,
      },
      { id: "q3", prompt: "Visual inspection findings", type: "text", required: true },
      { id: "q4", prompt: "Test certificate uploaded", type: "evidence", required: true },
      { id: "q5", prompt: "Test date", type: "date", required: true },
    ],
  },
];

const audits: AuditInstance[] = [
  {
    id: "AU-2026-0031",
    templateId: "AT-001",
    equipmentId: "EQ-3381",
    workOrderId: "WO-2026-0096",
    assignedTo: "Anita Raghavan",
    assignedBy: "Emilia Greene",
    assignedAt: "2026-07-23T09:00:00Z",
    dueBy: "30 Jul 2026",
    status: "Approved",
    answers: [
      { questionId: "q1", value: "Yes" },
      { questionId: "q2", value: "No fault — scheduled preventive service." },
      { questionId: "q3", value: "Dose output and image uniformity verification." },
      { questionId: "q4", value: "Component wear" },
      { questionId: "q5", value: "Yes" },
      { questionId: "q6", value: "None" },
      { questionId: "q7", value: "cathlab-after.jpg", evidence: "cathlab-after.jpg" },
      { questionId: "q8", value: "Yes" },
      { questionId: "q9", value: "Yes" },
      { questionId: "q10", value: "Yes" },
      { questionId: "q11", value: "2026-07-22" },
      { questionId: "q12", value: "3" },
    ],
    submittedAt: "2026-07-24T10:12:00Z",
    reviewedAt: "2026-07-24T15:40:00Z",
    reviewedBy: "Emilia Greene",
    reviewNote: "Complete and consistent with the service report.",
  },
  {
    id: "AU-2026-0034",
    templateId: "AT-002",
    equipmentId: "EQ-2210",
    assignedTo: "Daniel Okafor",
    assignedBy: "Emilia Greene",
    assignedAt: "2026-08-05T08:30:00Z",
    dueBy: "15 Aug 2026",
    status: "Assigned",
    answers: [],
  },
];

const events: AuditEvent[] = [
  {
    id: "EV-0001",
    at: "2026-03-18T09:00:00Z",
    user: "Emilia Greene",
    role: "admin",
    action: "Equipment registered",
    module: "Equipment",
    recordId: "EQ-1001",
    equipmentId: "EQ-1001",
    newStatus: "Active",
    description: "GE SIGNA Premier 3T registered to Radiology and commissioned.",
  },
  {
    id: "EV-0002",
    at: "2026-02-02T08:30:00Z",
    user: "Anita Raghavan",
    role: "engineer",
    action: "Preventive maintenance performed",
    module: "Maintenance",
    recordId: "WO-2026-0031",
    equipmentId: "EQ-1001",
    description: "Scheduled preventive service and coil calibration completed.",
  },
  {
    id: "EV-0003",
    at: "2026-08-08T09:42:00Z",
    user: "Clara Whitfield",
    role: "staff",
    action: "Created complaint",
    module: "Complaint",
    recordId: "CMP-2026-0045",
    equipmentId: "EQ-1001",
    previousStatus: "Active",
    newStatus: "Open",
    description: "Image quality degradation reported on T2 sequences.",
  },
  {
    id: "EV-0004",
    at: "2026-08-08T09:50:00Z",
    user: "Emilia Greene",
    role: "admin",
    action: "Complaint reviewed",
    module: "Complaint",
    recordId: "CMP-2026-0045",
    equipmentId: "EQ-1001",
    previousStatus: "Open",
    newStatus: "Under Review",
    description: "Clinical impact confirmed, priority set to Critical.",
  },
  {
    id: "EV-0005",
    at: "2026-08-08T09:58:00Z",
    user: "Emilia Greene",
    role: "admin",
    action: "Assigned biomedical engineer",
    module: "Complaint",
    recordId: "CMP-2026-0045",
    equipmentId: "EQ-1001",
    previousStatus: "Under Review",
    newStatus: "Assigned",
    description: "Daniel Okafor assigned · work order WO-2026-0112 raised.",
  },
  {
    id: "EV-0006",
    at: "2026-07-22T11:30:00Z",
    user: "Anita Raghavan",
    role: "engineer",
    action: "Service report submitted",
    module: "Service Report",
    recordId: "SR-2026-0087",
    equipmentId: "EQ-3381",
    description: "Quarterly preventive service report submitted for review.",
  },
  {
    id: "EV-0007",
    at: "2026-07-22T14:05:00Z",
    user: "Emilia Greene",
    role: "admin",
    action: "Service report approved",
    module: "Service Report",
    recordId: "SR-2026-0087",
    equipmentId: "EQ-3381",
    previousStatus: "Under Verification",
    newStatus: "Operational",
    description: "Report approved, Azurion 7 returned to clinical service.",
  },
];

/* ------------------- Administrator-configured maintenance checklists ------------------- */

const checklistTemplates: ChecklistTemplate[] = [
  {
    id: "CT-IMG",
    name: "Imaging systems — diagnostic checklist",
    category: "Imaging",
    maintenanceType: "All",
    description:
      "Standard diagnostic sequence for MRI, CT, cath lab and X-ray systems. Applies to every asset in the Imaging category.",
    createdBy: "Emilia Greene",
    createdAt: "2026-01-08T09:00:00Z",
    active: true,
  },
  {
    id: "CT-LIFE",
    name: "Life support — diagnostic checklist",
    category: "Life Support",
    maintenanceType: "All",
    description: "Ventilators, dialysis and other life-critical assets. ISO 80601 aligned.",
    createdBy: "Emilia Greene",
    createdAt: "2026-01-08T09:10:00Z",
    active: true,
  },
  {
    id: "CT-SURG",
    name: "Surgical & anaesthesia — diagnostic checklist",
    category: "Surgical",
    maintenanceType: "All",
    description: "Theatre assets including anaesthesia machines and powered surgical tools.",
    createdBy: "Emilia Greene",
    createdAt: "2026-01-08T09:20:00Z",
    active: true,
  },
  {
    id: "CT-MON",
    name: "Patient monitoring — diagnostic checklist",
    category: "Monitoring",
    maintenanceType: "All",
    description: "Bedside and central monitoring equipment.",
    createdBy: "Emilia Greene",
    createdAt: "2026-01-08T09:30:00Z",
    active: true,
  },
  {
    id: "CT-DIAG",
    name: "Laboratory diagnostics — checklist",
    category: "Diagnostics",
    maintenanceType: "All",
    description: "Analysers and laboratory diagnostic platforms.",
    createdBy: "Emilia Greene",
    createdAt: "2026-01-08T09:40:00Z",
    active: true,
  },
];

let qSeq = 0;
function q(
  templateId: string,
  category: string,
  text: string,
  responseType: ChecklistQuestion["responseType"],
  opts: Partial<ChecklistQuestion> = {},
): ChecklistQuestion {
  qSeq += 1;
  return {
    id: `CQ-${String(qSeq).padStart(3, "0")}`,
    templateId,
    category,
    maintenanceType: "All",
    text,
    responseType,
    required: true,
    priority: "Medium",
    order: qSeq,
    active: true,
    ...opts,
  };
}

const checklistQuestions: ChecklistQuestion[] = [
  // Imaging
  q("CT-IMG", "Imaging", "Visual inspection of gantry, cabinets and cabling", "passfail", {
    priority: "High",
  }),
  q("CT-IMG", "Imaging", "Chiller / cooling circuit within operating range", "passfail", {
    priority: "Critical",
  }),
  q("CT-IMG", "Imaging", "Daily QA phantom sequence result", "passfail", { priority: "Critical" }),
  q("CT-IMG", "Imaging", "Measured signal-to-noise ratio", "number", {
    required: false,
    helpText: "Record the measured SNR from the QA phantom run.",
  }),
  q("CT-IMG", "Imaging", "Detector / coil connector inspection", "passfail"),
  q("CT-IMG", "Imaging", "System error and event log review", "text", {
    helpText: "Summarise any recurring error codes.",
  }),
  q("CT-IMG", "Imaging", "Electrical safety test (IEC 62353)", "passfail", {
    priority: "Critical",
  }),
  q("CT-IMG", "Imaging", "Calibration certificate uploaded", "evidence", { required: false }),
  // Life support
  q("CT-LIFE", "Life Support", "Visual inspection of enclosure, hoses and filters", "passfail", {
    priority: "High",
  }),
  q("CT-LIFE", "Life Support", "Breathing circuit leak test", "passfail", { priority: "Critical" }),
  q("CT-LIFE", "Life Support", "Flow sensor accuracy verified against reference", "passfail", {
    priority: "Critical",
  }),
  q("CT-LIFE", "Life Support", "Measured delivered tidal volume (mL)", "number", {
    required: false,
  }),
  q("CT-LIFE", "Life Support", "Oxygen cell calibration", "passfail"),
  q("CT-LIFE", "Life Support", "Alarm functionality test", "passfail", { priority: "Critical" }),
  q("CT-LIFE", "Life Support", "Battery backup autonomy check", "passfail"),
  q("CT-LIFE", "Life Support", "Electrical safety test (IEC 62353)", "passfail", {
    priority: "Critical",
  }),
  // Surgical
  q("CT-SURG", "Surgical", "Visual inspection and mechanical integrity", "passfail", {
    priority: "High",
  }),
  q("CT-SURG", "Surgical", "Gas supply and pressure verification", "passfail", {
    priority: "Critical",
  }),
  q("CT-SURG", "Surgical", "Agent analyser compared to reference", "passfail", {
    priority: "Critical",
  }),
  q("CT-SURG", "Surgical", "Vaporiser output deviation (%)", "number", { required: false }),
  q("CT-SURG", "Surgical", "Scavenging system operation", "passfail"),
  q("CT-SURG", "Surgical", "Electrical safety test (IEC 62353)", "passfail", {
    priority: "Critical",
  }),
  // Monitoring
  q("CT-MON", "Monitoring", "Visual inspection of monitor, leads and mounts", "passfail"),
  q("CT-MON", "Monitoring", "ECG / SpO2 simulator accuracy check", "passfail", {
    priority: "High",
  }),
  q("CT-MON", "Monitoring", "NIBP calibration verification", "passfail"),
  q("CT-MON", "Monitoring", "Alarm audibility and escalation test", "passfail", {
    priority: "High",
  }),
  q("CT-MON", "Monitoring", "Network / central station connectivity", "yesno"),
  q("CT-MON", "Monitoring", "Electrical safety test (IEC 62353)", "passfail", {
    priority: "Critical",
  }),
  // Diagnostics
  q("CT-DIAG", "Diagnostics", "Visual inspection and fluidics check", "passfail"),
  q("CT-DIAG", "Diagnostics", "Quality control sample within tolerance", "passfail", {
    priority: "Critical",
  }),
  q("CT-DIAG", "Diagnostics", "Reagent and consumable levels", "passfail"),
  q("CT-DIAG", "Diagnostics", "Calibration run result", "passfail", { priority: "High" }),
  q("CT-DIAG", "Diagnostics", "Electrical safety test (IEC 62353)", "passfail", {
    priority: "Critical",
  }),
  // Equipment-specific additions
  q("CT-IMG", "Imaging", "Helium level and boil-off rate within range", "number", {
    equipmentId: "EQ-1001",
    priority: "Critical",
    helpText: "Magnet-specific check for the SIGNA Premier 3T.",
  }),
  q("CT-IMG", "Imaging", "Shim and centre-frequency calibration", "passfail", {
    equipmentId: "EQ-1001",
    priority: "High",
  }),
  q("CT-LIFE", "Life Support", "Humidifier chamber and heater wire inspection", "passfail", {
    equipmentId: "EQ-2210",
    priority: "High",
  }),
];

export function seedState(): LifecycleState {
  return {
    equipment: [scenarioAsset, ...getDerivedEquipment()],
    complaints,
    workOrders,
    reports,
    templates,
    audits,
    events,
    checklistTemplates,
    checklistQuestions,
  };
}
