import { complaints, equipment, maintenance, schedule } from "@/lib/mock-data";

export type Tone = "neutral" | "primary" | "success" | "warning" | "danger" | "violet";

export const engineerProfile = {
  name: "Daniel Okafor",
  handle: "@d.okafor",
  avatar: "DO",
  role: "Senior Biomedical Engineer",
  zone: "ICU · Level 4",
  employeeId: "BME-2207",
  email: "daniel.okafor@medixa.health",
  phone: "+44 7700 900 118",
  shift: "Morning · 07:00 – 15:30",
  certifications: [
    {
      name: "CBET — Certified Biomedical Equipment Technician",
      issued: "Mar 2021",
      expires: "Mar 2027",
      tone: "success" as Tone,
    },
    {
      name: "IEC 60601-1 Electrical Safety",
      issued: "Sep 2024",
      expires: "Sep 2026",
      tone: "warning" as Tone,
    },
    {
      name: "GE CARESCAPE R860 Vendor Training",
      issued: "Jan 2025",
      expires: "Jan 2028",
      tone: "success" as Tone,
    },
    {
      name: "Medical Gas Systems (HTM 02-01)",
      issued: "Jun 2023",
      expires: "Jun 2026",
      tone: "danger" as Tone,
    },
  ],
  skills: [
    "Ventilators",
    "Dialysis",
    "Patient monitoring",
    "Electrical safety",
    "Calibration",
    "Infusion pumps",
  ],
};

export type EngineerTask = {
  id: string;
  title: string;
  type: "Preventive" | "Corrective" | "Calibration" | "Inspection";
  equipmentId: string;
  equipment: string;
  dept: string;
  location: string;
  priority: "Critical" | "High" | "Medium" | "Low";
  status: "Scheduled" | "In Progress" | "Awaiting Parts" | "Completed";
  progress: number;
  due: string;
  slot: string;
  estimate: string;
  sla: number;
  complaintId?: string;
  summary: string;
  steps: { label: string; done: boolean; note?: string }[];
  parts: { part: string; code: string; qty: number; status: string }[];
  activity: { when: string; who: string; what: string; tone: Tone }[];
};

const eqByName = (fragment: string) => equipment.find((e) => e.name.includes(fragment))!;

const act = (who: string) => [
  {
    when: "Today · 08:04",
    who,
    what: "accepted the work order and travelled to site",
    tone: "primary" as Tone,
  },
  {
    when: "Today · 07:41",
    who: "Dispatch",
    what: "assigned the work order to the biomedical queue",
    tone: "neutral" as Tone,
  },
  {
    when: "Yesterday · 18:22",
    who: "System",
    what: "raised a predictive alert on the asset",
    tone: "violet" as Tone,
  },
  {
    when: "Yesterday · 16:10",
    who: "Ward Nurse",
    what: "reported abnormal behaviour during use",
    tone: "warning" as Tone,
  },
];

export const engineerTasks: EngineerTask[] = [
  {
    id: "WO-4472",
    title: "Ventilator flow sensor replacement",
    type: "Corrective",
    equipmentId: eqByName("CARESCAPE").id,
    equipment: eqByName("CARESCAPE").name,
    dept: "ICU",
    location: "ICU · Level 4 · Bay 6",
    priority: "High",
    status: "In Progress",
    progress: 65,
    due: "Today · 15:00",
    slot: "10:15 – 12:00",
    estimate: "1.75 h",
    sla: 38,
    complaintId: "CMP-8836",
    summary:
      "Humidifier alarm fires intermittently under high minute volume. Replace the proximal flow sensor, re-run the full system check and verify the alarm no longer triggers across three ventilation modes.",
    steps: [
      { label: "Isolate ventilator and transfer patient to standby unit", done: true },
      {
        label: "Verify alarm log and capture error codes",
        done: true,
        note: "E-114 / E-118 logged 6× in 24 h",
      },
      { label: "Replace proximal flow sensor assembly", done: true },
      { label: "Run internal leak and compliance test", done: false },
      { label: "Verify alarm silence across PC / VC / SIMV modes", done: false },
      { label: "Return to service and update asset log", done: false },
    ],
    parts: [
      { part: "Proximal flow sensor", code: "GE-2106318-001", qty: 1, status: "Fitted" },
      { part: "Expiratory valve gasket", code: "GE-2050912-002", qty: 2, status: "Fitted" },
      { part: "Inline bacterial filter", code: "GE-6800200-003", qty: 1, status: "Issued" },
    ],
    activity: act("Daniel Okafor"),
  },
  {
    id: "WO-4473",
    title: "Anesthesia gas calibration",
    type: "Calibration",
    equipmentId: eqByName("Perseus").id,
    equipment: eqByName("Perseus").name,
    dept: "Operating Theatre",
    location: "Operating Theatre · Level 5 · OT 3",
    priority: "Critical",
    status: "In Progress",
    progress: 30,
    due: "Today · 17:00",
    slot: "12:00 – 14:30",
    estimate: "2.5 h",
    sla: 88,
    complaintId: "CMP-8829",
    summary:
      "Agent concentration drifts by 0.4% against the reference analyser. Perform full gas bench calibration, replace the O₂ cell if response time exceeds spec, and re-certify before the afternoon list.",
    steps: [
      { label: "Lock out theatre and notify anaesthetic lead", done: true },
      { label: "Connect reference gas analyser", done: true },
      { label: "Run 21% / 100% O₂ two-point calibration", done: false },
      { label: "Replace O₂ sensor cell if T90 > 12 s", done: false },
      { label: "Agent bench calibration (Sevo / Des / Iso)", done: false },
      { label: "Leak test circuit at 30 cmH₂O", done: false },
      { label: "Issue calibration certificate", done: false },
    ],
    parts: [
      { part: "Galvanic O₂ sensor cell", code: "DR-6850645", qty: 1, status: "Issued" },
      { part: "Water trap cartridge", code: "DR-8290956", qty: 1, status: "Issued" },
    ],
    activity: act("Daniel Okafor"),
  },
  {
    id: "WO-4474",
    title: "Analyzer probe alignment",
    type: "Corrective",
    equipmentId: eqByName("cobas").id,
    equipment: eqByName("cobas").name,
    dept: "Laboratory",
    location: "Laboratory · Level 1 · Core Lab",
    priority: "Medium",
    status: "Scheduled",
    progress: 0,
    due: "Today · 18:00",
    slot: "14:45 – 16:00",
    estimate: "1.25 h",
    sla: 24,
    complaintId: "CMP-8814",
    summary:
      "Sample probe strikes the rack edge on positions 7–12. Re-teach probe coordinates, inspect for tip deflection and run 20 QC samples before releasing the module back to routine testing.",
    steps: [
      { label: "Place c702 module in standby", done: false },
      { label: "Inspect probe tip for deflection or crimping", done: false },
      { label: "Re-teach X/Y/Z rack coordinates", done: false },
      { label: "Run probe crash-detect self test", done: false },
      { label: "Process 20 QC samples across two levels", done: false },
      { label: "Release module to routine testing", done: false },
    ],
    parts: [{ part: "Sample probe assembly", code: "RO-05172060001", qty: 1, status: "In stores" }],
    activity: act("Daniel Okafor"),
  },
  {
    id: "WO-4475",
    title: "Battery load test",
    type: "Preventive",
    equipmentId: eqByName("BeneVision").id,
    equipment: eqByName("BeneVision").name,
    dept: "Emergency",
    location: "Emergency · Level 0 · Resus Bay 2",
    priority: "Low",
    status: "Scheduled",
    progress: 0,
    due: "Tomorrow · 12:00",
    slot: "16:30 – 17:15",
    estimate: "0.75 h",
    sla: 12,
    summary:
      "Scheduled quarterly battery capacity verification. Discharge under simulated load, confirm ≥ 80% of rated runtime and log the cycle count against the asset record.",
    steps: [
      { label: "Disconnect mains and start discharge timer", done: false },
      { label: "Verify runtime ≥ 4 h at standard monitoring load", done: false },
      { label: "Record cycle count and internal resistance", done: false },
      { label: "Recharge to 100% and confirm charge rate", done: false },
      { label: "Apply next-test label", done: false },
    ],
    parts: [
      {
        part: "Li-ion battery pack (spare)",
        code: "MR-115-018012-00",
        qty: 1,
        status: "In stores",
      },
    ],
    activity: act("Daniel Okafor"),
  },
  {
    id: "WO-4478",
    title: "Dialysis pump seal inspection",
    type: "Inspection",
    equipmentId: eqByName("Prismaflex").id,
    equipment: eqByName("Prismaflex").name,
    dept: "ICU",
    location: "ICU · Level 4 · Renal Bay",
    priority: "High",
    status: "Awaiting Parts",
    progress: 45,
    due: "Fri · 11:00",
    slot: "09:00 – 10:30",
    estimate: "1.5 h",
    sla: 54,
    summary:
      "Minor effluent seepage detected at the blood pump raceway. Seal kit ordered from Baxter; inspect raceway wear and complete replacement on delivery.",
    steps: [
      { label: "Document seepage location with photos", done: true },
      { label: "Isolate machine and drain circuit", done: true },
      {
        label: "Inspect raceway for scoring",
        done: true,
        note: "Light scoring at 4 o'clock position",
      },
      { label: "Fit replacement seal kit", done: false },
      { label: "Pressure-hold test at 300 mmHg", done: false },
    ],
    parts: [
      { part: "Blood pump seal kit", code: "BX-114978", qty: 1, status: "On order · ETA Thu" },
    ],
    activity: act("Daniel Okafor"),
  },
  {
    id: "WO-4471",
    title: "Quarterly preventive service",
    type: "Preventive",
    equipmentId: eqByName("MAGNETOM").id,
    equipment: eqByName("MAGNETOM").name,
    dept: "Radiology",
    location: "Radiology · Level 2 · Scan Room A",
    priority: "Medium",
    status: "Completed",
    progress: 100,
    due: "Today · 10:00",
    slot: "08:30 – 10:00",
    estimate: "1.5 h",
    sla: 44,
    summary:
      "Quarterly PPM completed on schedule. Helium level, gradient cooling, RF coil integrity and emergency stop circuits all verified within manufacturer tolerance.",
    steps: [
      { label: "Helium level and boil-off rate check", done: true, note: "68% · 0.02%/day" },
      { label: "Chiller and gradient cooling inspection", done: true },
      { label: "RF coil integrity and SNR phantom scan", done: true, note: "SNR 214 (spec ≥ 190)" },
      { label: "Emergency stop and quench button test", done: true },
      { label: "Electrical safety verification", done: true },
      { label: "Update asset log and close order", done: true },
    ],
    parts: [{ part: "Chiller filter element", code: "SI-10485221", qty: 2, status: "Fitted" }],
    activity: [
      {
        when: "Today · 09:58",
        who: "Daniel Okafor",
        what: "closed the work order and signed the service report",
        tone: "success" as Tone,
      },
      {
        when: "Today · 09:31",
        who: "Daniel Okafor",
        what: "uploaded phantom scan results",
        tone: "primary" as Tone,
      },
      {
        when: "Today · 08:32",
        who: "Daniel Okafor",
        what: "started the preventive checklist",
        tone: "primary" as Tone,
      },
      {
        when: "Today · 07:50",
        who: "Dispatch",
        what: "released the scheduled PPM",
        tone: "neutral" as Tone,
      },
    ],
  },
];

export const findTask = (id: string): EngineerTask =>
  engineerTasks.find((t) => t.id.toLowerCase() === id.toLowerCase()) ?? engineerTasks[0]!;

export const findEquipment = (id: string) =>
  equipment.find((e) => e.id.toLowerCase() === id.toLowerCase()) ?? equipment[0]!;

export const taskTone = (status: string): Tone => {
  const s = status?.toLowerCase();
  if (s === "completed" || s === "done") return "success";
  if (s === "in_progress" || s === "in progress" || s === "assigned") return "primary";
  if (s === "awaiting_parts" || s === "awaiting parts" || s === "on_hold") return "warning";
  return "neutral";
};

export const priorityTone = (p: string): Tone => {
  const s = p?.toLowerCase();
  if (s === "critical") return "danger";
  if (s === "high") return "warning";
  if (s === "medium") return "primary";
  return "neutral";
};

/* --------------------------------- Checklists --------------------------------- */

export type ChecklistSection = { section: string; items: { label: string; spec: string }[] };

export const preventiveChecklist: ChecklistSection[] = [
  {
    section: "Visual & mechanical",
    items: [
      {
        label: "Enclosure, casters and mounts intact",
        spec: "No cracks, free movement, brakes hold",
      },
      { label: "Cables, hoses and connectors undamaged", spec: "No abrasion or exposed conductor" },
      { label: "Labels, warnings and asset tag legible", spec: "Asset tag scannable" },
      { label: "Filters clean or replaced", spec: "Replace if > 90 days" },
    ],
  },
  {
    section: "Electrical safety (IEC 62353)",
    items: [
      { label: "Protective earth resistance", spec: "≤ 0.3 Ω" },
      { label: "Equipment leakage current — normal condition", spec: "≤ 100 µA" },
      { label: "Equipment leakage current — single fault", spec: "≤ 500 µA" },
      { label: "Insulation resistance", spec: "≥ 2 MΩ" },
    ],
  },
  {
    section: "Functional performance",
    items: [
      { label: "Power-on self test passes without fault", spec: "No residual error codes" },
      { label: "Delivered parameter accuracy verified", spec: "Within ± 5% of setpoint" },
      { label: "Alarm audibility and escalation", spec: "≥ 65 dB at 1 m" },
      { label: "Battery backup runtime under load", spec: "≥ 80% of rated runtime" },
    ],
  },
  {
    section: "Closure",
    items: [
      { label: "Firmware at approved revision", spec: "Matches vendor baseline" },
      { label: "Device cleaned and disinfected", spec: "Per infection control policy" },
      { label: "PPM sticker applied with next due date", spec: "Next due + 90 days" },
    ],
  },
];

export const breakdownCauses = [
  "Component failure",
  "Wear and tear",
  "User error",
  "Power or supply fault",
  "Software or firmware",
  "Environmental / installation",
  "Consumable exhausted",
  "Unknown — under investigation",
];

export const breakdownActions = [
  "Part replaced",
  "Recalibrated",
  "Firmware updated",
  "Cleaned and serviced",
  "Reconfigured settings",
  "Escalated to vendor",
];

/* ---------------------------------- History ----------------------------------- */

export const engineerHistory = [
  {
    id: "WO-4471",
    task: "Quarterly preventive service",
    equipment: "Siemens MAGNETOM Vida 3T",
    type: "Preventive",
    dept: "Radiology",
    date: "07 Aug 2026",
    duration: "1.4 h",
    outcome: "Passed",
    tone: "success" as Tone,
  },
  {
    id: "WO-4468",
    task: "Infusion pump flow verification",
    equipment: "B.Braun Infusomat Space",
    type: "Calibration",
    dept: "Oncology",
    date: "06 Aug 2026",
    duration: "0.8 h",
    outcome: "Passed",
    tone: "success" as Tone,
  },
  {
    id: "WO-4462",
    task: "Ventilator turbine replacement",
    equipment: "GE CARESCAPE R860 Ventilator",
    type: "Corrective",
    dept: "ICU",
    date: "04 Aug 2026",
    duration: "3.2 h",
    outcome: "Repaired",
    tone: "primary" as Tone,
  },
  {
    id: "WO-4459",
    task: "Defibrillator energy output test",
    equipment: "Zoll R Series",
    type: "Preventive",
    dept: "Emergency",
    date: "03 Aug 2026",
    duration: "0.6 h",
    outcome: "Passed",
    tone: "success" as Tone,
  },
  {
    id: "WO-4451",
    task: "Anesthesia vaporiser service",
    equipment: "Dräger Perseus A500 Anesthesia",
    type: "Corrective",
    dept: "Operating Theatre",
    date: "31 Jul 2026",
    duration: "2.1 h",
    outcome: "Vendor escalation",
    tone: "warning" as Tone,
  },
  {
    id: "WO-4447",
    task: "Dialysis conductivity calibration",
    equipment: "Baxter Prismaflex Dialysis",
    type: "Calibration",
    dept: "ICU",
    date: "29 Jul 2026",
    duration: "1.6 h",
    outcome: "Passed",
    tone: "success" as Tone,
  },
  {
    id: "WO-4440",
    task: "Monitor module diagnostics",
    equipment: "Mindray BeneVision N22 Monitor",
    type: "Inspection",
    dept: "Emergency",
    date: "27 Jul 2026",
    duration: "0.9 h",
    outcome: "Failed — part ordered",
    tone: "danger" as Tone,
  },
  {
    id: "WO-4434",
    task: "Analyzer annual overhaul",
    equipment: "Roche cobas 8000 Analyzer",
    type: "Preventive",
    dept: "Laboratory",
    date: "24 Jul 2026",
    duration: "4.5 h",
    outcome: "Passed",
    tone: "success" as Tone,
  },
];

/* --------------------------------- Scheduling ---------------------------------- */

export const engineerWeek = [
  {
    day: "Mon",
    date: "03",
    items: [
      { time: "08:30", title: "MRI quarterly PPM", where: "Radiology", tone: "success" as Tone },
      { time: "13:00", title: "Pump verification", where: "Oncology", tone: "primary" as Tone },
    ],
  },
  {
    day: "Tue",
    date: "04",
    items: [{ time: "09:00", title: "Turbine replacement", where: "ICU", tone: "warning" as Tone }],
  },
  {
    day: "Wed",
    date: "05",
    items: [
      { time: "10:00", title: "Defib output test", where: "Emergency", tone: "primary" as Tone },
      {
        time: "15:00",
        title: "Vendor call — Dräger",
        where: "Biomedical Wing",
        tone: "violet" as Tone,
      },
    ],
  },
  {
    day: "Thu",
    date: "06",
    items: [
      { time: "08:00", title: "Seal kit delivery", where: "Stores", tone: "neutral" as Tone },
      { time: "11:00", title: "Prismaflex seal fit", where: "ICU", tone: "warning" as Tone },
    ],
  },
  {
    day: "Fri",
    date: "07",
    items: [
      {
        time: "10:15",
        title: "Flow sensor replacement",
        where: "ICU · Bay 6",
        tone: "primary" as Tone,
      },
      { time: "12:00", title: "Gas calibration", where: "OT 3", tone: "danger" as Tone },
      { time: "14:45", title: "Probe alignment", where: "Core Lab", tone: "primary" as Tone },
    ],
  },
  {
    day: "Sat",
    date: "08",
    items: [
      { time: "09:30", title: "On-call cover", where: "Hospital-wide", tone: "neutral" as Tone },
    ],
  },
  { day: "Sun", date: "09", items: [] },
];

export const engineerAgenda = schedule;

export const workloadTrend = [
  { week: "W27", closed: 14, opened: 16, hours: 31 },
  { week: "W28", closed: 18, opened: 17, hours: 36 },
  { week: "W29", closed: 21, opened: 19, hours: 39 },
  { week: "W30", closed: 17, opened: 15, hours: 33 },
  { week: "W31", closed: 24, opened: 21, hours: 41 },
  { week: "W32", closed: 22, opened: 20, hours: 38 },
];

export const typeSplit = [
  { name: "Preventive", value: 46 },
  { name: "Corrective", value: 31 },
  { name: "Calibration", value: 15 },
  { name: "Inspection", value: 8 },
];

export const performanceRadar = [
  { axis: "First-time fix", A: 92 },
  { axis: "SLA adherence", A: 96 },
  { axis: "Documentation", A: 88 },
  { axis: "Safety", A: 98 },
  { axis: "Utilisation", A: 81 },
  { axis: "Training", A: 86 },
];

export const engineerKpis = [
  { label: "Open assignments", value: "5", delta: "-2 vs last week", tone: "primary" as Tone },
  { label: "Due today", value: "3", delta: "1 critical", tone: "danger" as Tone },
  { label: "First-time fix", value: "92%", delta: "+4.1%", tone: "success" as Tone },
  { label: "Hours logged", value: "38.4", delta: "+2.6 h", tone: "violet" as Tone },
];

export const relatedComplaints = complaints;
export const relatedWorkOrders = maintenance;
