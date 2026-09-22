import {
  Boxes,
  Building2,
  CircleAlert,
  Cpu,
  ReceiptText,
  ShieldCheck,
  Truck,
  Users as UsersIcon,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import {
  complaints,
  departments,
  equipment,
  maintenance,
  statusTone,
  users,
  warranties,
} from "@/lib/mock-data";

export type Tone = "neutral" | "primary" | "success" | "warning" | "danger" | "violet";

export type FieldDef = {
  name: string;
  label: string;
  type: "text" | "textarea" | "select" | "number" | "date";
  options?: string[];
  placeholder?: string;
  wide?: boolean;
};

export type MetaItem = { label: string; value: string };

export type ModuleRecord = {
  id: string;
  title: string;
  subtitle: string;
  status: string;
  tone: Tone;
  score: number;
  scoreLabel: string;
  cells: string[];
  meta: MetaItem[];
  /** Prefill values for the edit form, keyed by field name. */
  values?: Record<string, string>;
  timeline: { when: string; who: string; what: string; tone: Tone }[];
};

export type ModuleConfig = {
  key: string;
  base: string;
  label: string;
  singular: string;
  eyebrow: string;
  icon: LucideIcon;
  description: string;
  listDescription: string;
  columns: string[];
  records: ModuleRecord[];
  fields: FieldDef[];
  stats: { label: string; value: string; delta: string }[];
  trend: { month: string; a: number; b: number }[];
  seriesA: string;
  seriesB: string;
  breakdown: { name: string; value: number }[];
};

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const baseTimeline = (who: string, subject: string) => [
  {
    when: "Today · 09:12",
    who,
    what: `updated the record for ${subject}`,
    tone: "primary" as Tone,
  },
  {
    when: "Yesterday · 16:40",
    who: "System",
    what: "recalculated the health index",
    tone: "violet" as Tone,
  },
  {
    when: "12 Jul · 11:05",
    who: "Sara Aldrin",
    what: "attached a vendor document",
    tone: "success" as Tone,
  },
  {
    when: "04 Jul · 08:22",
    who: "Jonas Weber",
    what: "completed a compliance review",
    tone: "warning" as Tone,
  },
  {
    when: "21 Jun · 14:58",
    who: "Emilia Greene",
    what: `created ${subject} in the register`,
    tone: "neutral" as Tone,
  },
];

/* ---------------------------------- Equipment --------------------------------- */

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/** "12 Feb 2024" -> "2024-02-12" for <input type="date"> defaults. */
export const toISODate = (v: string) => {
  const m = /(\d{1,2})\s+([A-Za-z]{3})\w*\s+(\d{4})/.exec(v);
  if (!m) return "";
  const mi = MONTHS.indexOf(m[2]!.slice(0, 3));
  if (mi < 0) return "";
  return `${m[3]}-${String(mi + 1).padStart(2, "0")}-${m[1]!.padStart(2, "0")}`;
};

const equipmentRecords: ModuleRecord[] = (equipment || []).map((e) => ({
  id: e.id,
  title: e.name,
  subtitle: `${e.dept} · ${e.vendor}`,
  status: statusTone?.[e.status]?.label ?? "Operational",
  tone:
    e.status === "operational"
      ? "success"
      : e.status === "maintenance"
        ? "warning"
        : e.status === "critical"
          ? "danger"
          : "neutral",
  score: e.health,
  scoreLabel: "Health",
  cells: [
    e.id,
    e.name,
    e.category,
    e.dept,
    statusTone?.[e.status]?.label ?? "Operational",
    `${e.health}%`,
  ],
  meta: [
    { label: "Category", value: e.category },
    { label: "Department", value: e.dept },
    { label: "Vendor", value: e.vendor },
    { label: "Model", value: e.specs.model },
    { label: "Serial number", value: e.specs.serial },
    { label: "Location", value: e.specs.location },
    { label: "Accountable owner", value: e.specs.owner },
    { label: "Installed on", value: e.specs.installed },
    { label: "Warranty until", value: e.warranty },
    { label: "Acquisition cost", value: e.cost },
    { label: "Software version", value: e.specs.software },
    { label: "Risk class", value: e.specs.riskClass },
  ],
  values: {
    name: e.name,
    tag: e.id,
    model: e.specs.model,
    serial: e.specs.serial,
    category: e.category,
    dept: e.dept,
    vendor: e.vendor,
    location: e.specs.location,
    owner: e.specs.owner,
    cost: e.cost,
    power: e.specs.power,
    software: e.specs.software,
    riskClass: e.specs.riskClass,
    installed: toISODate(e.specs.installed),
    warranty: toISODate(e.warranty),
    nextService: toISODate(e.specs.nextService),
    notes: `${e.specs.model} commissioned at ${e.specs.location}. Usage ${e.specs.usageHours}; last service ${e.specs.lastService}. Coverage: ${e.specs.amc}. Compliance: ${e.specs.compliance}.`,
  },
  timeline: baseTimeline("Anita Raghavan", e.name),
}));

/* --------------------------------- Complaints --------------------------------- */

const complaintRecords: ModuleRecord[] = (complaints || []).map((c) => ({
  id: c.id,
  title: c.title,
  subtitle: `${c.equipment} · ${c.dept}`,
  status: c.status,
  tone:
    c.status === "Resolved"
      ? "success"
      : c.status === "Escalated"
        ? "danger"
        : c.status === "Triage"
          ? "warning"
          : "primary",
  score: c.sla,
  scoreLabel: "SLA used",
  cells: [c.id, c.title, c.dept, c.priority, c.status, c.assignee],
  meta: [
    { label: "Priority", value: c.priority },
    { label: "Status", value: c.status },
    { label: "Assignee", value: c.assignee },
    { label: "Department", value: c.dept },
    { label: "Equipment", value: c.equipment },
    { label: "Age", value: c.age },
  ],
  timeline: baseTimeline(c.assignee, c.id),
}));

/* -------------------------------- Maintenance --------------------------------- */

const maintenanceRecords: ModuleRecord[] = (maintenance || []).map((m) => ({
  id: m.id,
  title: m.task,
  subtitle: `${m.equipment} · ${m.dept}`,
  status: m.progress === 100 ? "Completed" : m.progress > 0 ? "In Progress" : "Scheduled",
  tone: m.progress === 100 ? "success" : m.progress > 0 ? "primary" : "neutral",
  score: m.progress,
  scoreLabel: "Progress",
  cells: [m.id, m.task, m.type, m.dept, m.engineer, m.time],
  meta: [
    { label: "Work order type", value: m.type },
    { label: "Equipment", value: m.equipment },
    { label: "Department", value: m.dept },
    { label: "Engineer", value: m.engineer },
    { label: "Scheduled", value: `Today · ${m.time}` },
    { label: "Completion", value: `${m.progress}%` },
  ],
  timeline: baseTimeline(m.engineer, m.id),
}));

/* -------------------------------- Departments --------------------------------- */

const departmentRecords: ModuleRecord[] = (departments || []).map((d) => ({
  id: slug(d.name),
  title: d.name,
  subtitle: `${d.staff} staff · ${d.assets} assets`,
  status: d.score >= 92 ? "Excellent" : d.score >= 86 ? "Healthy" : "Needs attention",
  tone: d.score >= 92 ? "success" : d.score >= 86 ? "primary" : "warning",
  score: d.score,
  scoreLabel: "Score",
  cells: [
    d.name,
    String(d.assets),
    String(d.staff),
    `${d.uptime}%`,
    String(d.complaints),
    `$${d.spend}K`,
  ],
  meta: [
    { label: "Assets under management", value: String(d.assets) },
    { label: "Staff headcount", value: String(d.staff) },
    { label: "Uptime", value: `${d.uptime}%` },
    { label: "Open complaints", value: String(d.complaints) },
    { label: "Monthly spend", value: `$${d.spend}K` },
    { label: "Performance score", value: `${d.score}/100` },
  ],
  timeline: baseTimeline("Emilia Greene", d.name),
}));

/* ----------------------------------- Users ------------------------------------ */

const userRecords: ModuleRecord[] = (users || []).map((u) => ({
  id: slug(u.name),
  title: u.name,
  subtitle: `${u.role} · ${u.dept}`,
  status: u.status,
  tone: u.status === "Active" ? "success" : u.status === "Away" ? "warning" : "neutral",
  score: Math.min(100, Math.round(u.actions / 13)),
  scoreLabel: "Activity",
  cells: [u.name, u.handle, u.role, u.dept, u.status, u.last],
  meta: [
    { label: "Handle", value: u.handle },
    { label: "Role", value: u.role },
    { label: "Department", value: u.dept },
    { label: "Status", value: u.status },
    { label: "Last active", value: u.last },
    { label: "Logged actions", value: String(u.actions) },
  ],
  timeline: baseTimeline(u.name, u.name),
}));

/* ---------------------------------- Warranty ---------------------------------- */

const warrantyRecords: ModuleRecord[] = (warranties || []).map((w) => ({
  id: w.id,
  title: w.vendor,
  subtitle: `${w.type} · ${w.assets} assets`,
  status: w.days < 30 ? "Expiring" : w.days < 120 ? "Renewal soon" : "Active",
  tone: w.days < 30 ? "danger" : w.days < 120 ? "warning" : "success",
  score: w.coverage,
  scoreLabel: "Coverage",
  cells: [w.id, w.vendor, w.type, String(w.assets), w.expires, w.value],
  meta: [
    { label: "Contract type", value: w.type },
    { label: "Covered assets", value: String(w.assets) },
    { label: "Contract value", value: w.value },
    { label: "Expires", value: w.expires },
    { label: "Days remaining", value: `${w.days} days` },
    { label: "Coverage", value: `${w.coverage}%` },
  ],
  timeline: baseTimeline("Sara Aldrin", w.id),
}));

/* ----------------------------------- Vendors ---------------------------------- */

const vendorSeed = [
  {
    name: "Siemens Healthineers",
    category: "Manufacturer",
    city: "Erlangen",
    state: "Bavaria",
    contact: "Klaus Berger",
    spec: "MRI, CT, Angiography",
    rating: 5,
  },
  {
    name: "GE Healthcare",
    category: "Manufacturer",
    city: "Chicago",
    state: "Illinois",
    contact: "Dana Reyes",
    spec: "Ventilators, Monitoring",
    rating: 4,
  },
  {
    name: "Philips",
    category: "Equipment Supplier",
    city: "Amsterdam",
    state: "North Holland",
    contact: "Ruud van Dijk",
    spec: "Cath Lab, Imaging",
    rating: 4,
  },
  {
    name: "Dräger",
    category: "Service Provider",
    city: "Lübeck",
    state: "Schleswig-Holstein",
    contact: "Anke Vogt",
    spec: "Anesthesia, Critical Care",
    rating: 3,
  },
  {
    name: "Roche",
    category: "Calibration Provider",
    city: "Basel",
    state: "Basel-Stadt",
    contact: "Marc Suter",
    spec: "Laboratory Analysers",
    rating: 5,
  },
];

const vendorRecords: ModuleRecord[] = vendorSeed.map((v, i) => ({
  id: `VEN-${String(i + 1).padStart(4, "0")}`,
  title: v.name,
  subtitle: `${v.category} · ${v.city}, ${v.state}`,
  status: "Active",
  tone: "success" as Tone,
  score: Math.round((v.rating / 5) * 100),
  scoreLabel: "Rating",
  cells: [
    `VEN-${String(i + 1).padStart(4, "0")}`,
    v.name,
    v.category,
    `${v.city}, ${v.state}`,
    "Active",
    v.contact,
  ],
  meta: [
    { label: "Vendor code", value: `VEN-${String(i + 1).padStart(4, "0")}` },
    { label: "Category", value: v.category },
    { label: "Specialisation", value: v.spec },
    { label: "Contact person", value: v.contact },
    { label: "City", value: v.city },
    { label: "State", value: v.state },
    { label: "Rating", value: `${v.rating}/5` },
  ],
  values: {
    name: v.name,
    category: v.category,
    status: "Active",
    contactPerson: v.contact,
    city: v.city,
    state: v.state,
    specialization: v.spec,
    rating: String(v.rating),
  },
  timeline: baseTimeline(v.contact, v.name),
}));

/* ------------------------------- Purchase orders ------------------------------- */

const poSeed = [
  {
    vendor: "Siemens Healthineers",
    dept: "Radiology",
    item: "MRI gradient coil assembly",
    qty: 1,
    price: 84000,
    status: "Pending approval",
    tone: "warning" as Tone,
    score: 30,
  },
  {
    vendor: "GE Healthcare",
    dept: "Intensive Care",
    item: "Ventilator flow sensors (pack of 10)",
    qty: 4,
    price: 1250,
    status: "Approved",
    tone: "primary" as Tone,
    score: 55,
  },
  {
    vendor: "Philips",
    dept: "Cardiology",
    item: "Cath lab detector service kit",
    qty: 2,
    price: 9600,
    status: "Ordered",
    tone: "violet" as Tone,
    score: 75,
  },
  {
    vendor: "Dräger",
    dept: "Operating Theatre",
    item: "Anaesthesia vaporiser overhaul",
    qty: 3,
    price: 4300,
    status: "Received",
    tone: "success" as Tone,
    score: 100,
  },
  {
    vendor: "Roche",
    dept: "Laboratory",
    item: "Analyser calibration reagents",
    qty: 12,
    price: 380,
    status: "Draft",
    tone: "neutral" as Tone,
    score: 10,
  },
];

const purchaseOrderRecords: ModuleRecord[] = poSeed.map((p, i) => {
  const code = `PO-${String(i + 1).padStart(4, "0")}`;
  const total = p.qty * p.price;
  const fmt = (n: number) =>
    `USD ${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return {
    id: code,
    title: p.item,
    subtitle: `${p.vendor} · ${p.dept} · 1 item(s)`,
    status: p.status,
    tone: p.tone,
    score: p.score,
    scoreLabel: "Progress",
    cells: [code, p.vendor, p.dept, fmt(total), p.status, "18 Aug 2026"],
    meta: [
      { label: "PO number", value: code },
      { label: "Vendor", value: p.vendor },
      { label: "Department", value: p.dept },
      { label: "Priority", value: "MEDIUM" },
      { label: "Items", value: `1. ${p.item} — ${p.qty} × ${fmt(p.price)} = ${fmt(total)}` },
      { label: "Subtotal", value: fmt(total) },
      { label: "Total", value: fmt(total) },
    ],
    values: {
      title: p.item,
      priority: "MEDIUM",
      currency: "USD",
      itemDescription: p.item,
      quantity: String(p.qty),
      unitPrice: String(p.price),
    },
    timeline: baseTimeline("Emilia Greene", code),
  };
});

/* ---------------------------------- Registry ---------------------------------- */

const trend = (a: number[], b: number[]) =>
  ["Mar", "Apr", "May", "Jun", "Jul", "Aug"].map((month, i) => ({ month, a: a[i]!, b: b[i]! }));

export const modules = {
  equipment: {
    key: "equipment",
    base: "/equipment",
    label: "Equipment",
    singular: "Asset",
    eyebrow: "Assets",
    icon: Cpu,
    description: "Full lifecycle intelligence for every clinical asset in the estate.",
    listDescription: "2,486 registered assets across 6 departments and 5 categories.",
    columns: ["Asset ID", "Asset", "Category", "Department", "Status", "Health"],
    records: equipmentRecords,
    fields: [
      { name: "name", label: "Asset name", type: "text", placeholder: "Siemens MAGNETOM Vida 3T" },
      { name: "tag", label: "Asset tag", type: "text", placeholder: "EQ-0000" },
      { name: "model", label: "Model", type: "text", placeholder: "MAGNETOM Vida 3T" },
      { name: "serial", label: "Serial number", type: "text", placeholder: "SN-VIDA-104229" },
      {
        name: "category",
        label: "Category",
        type: "select",
        options: ["Imaging", "Life Support", "Surgical", "Diagnostics", "Monitoring"],
      },
      {
        name: "dept",
        label: "Department",
        type: "select",
        options: (departments || []).map((d) => d.name),
      },
      { name: "vendor", label: "Vendor", type: "text", placeholder: "Siemens Healthineers" },
      {
        name: "location",
        label: "Location",
        type: "text",
        placeholder: "Radiology · Level 2 · Scan Room A",
      },
      { name: "owner", label: "Accountable owner", type: "text", placeholder: "Dr. L. Fontaine" },
      { name: "cost", label: "Acquisition cost", type: "text", placeholder: "$1,840,000" },
      {
        name: "power",
        label: "Power requirement",
        type: "text",
        placeholder: "380 V · 45 kVA · 3-phase",
      },
      {
        name: "software",
        label: "Software version",
        type: "text",
        placeholder: "syngo MR XA50 (v4.2)",
      },
      {
        name: "riskClass",
        label: "Risk class",
        type: "select",
        options: ["Class I", "Class IIa", "Class IIb", "Class III"],
      },
      { name: "installed", label: "Installation date", type: "date" },
      { name: "warranty", label: "Warranty expiry", type: "date" },
      { name: "nextService", label: "Next service due", type: "date" },
      {
        name: "notes",
        label: "Commissioning notes",
        type: "textarea",
        wide: true,
        placeholder: "Calibration baseline, site conditions, accessories…",
      },
    ],
    stats: [
      { label: "Total assets", value: "2,486", delta: "+4.2%" },
      { label: "Fleet health", value: "93.4", delta: "+1.6%" },
      { label: "Critical assets", value: "12", delta: "-3" },
      { label: "Avg. asset age", value: "4.2y", delta: "+0.3y" },
    ],
    trend: trend([91, 94, 96, 95, 97, 98], [27, 18, 14, 16, 11, 9]),
    seriesA: "Health index",
    seriesB: "Incidents",
    breakdown: [
      { name: "Imaging", value: 486 },
      { name: "Life Support", value: 372 },
      { name: "Surgical", value: 298 },
      { name: "Diagnostics", value: 544 },
      { name: "Monitoring", value: 786 },
    ],
  },
  complaints: {
    key: "complaints",
    base: "/complaints",
    label: "Complaints",
    singular: "Ticket",
    eyebrow: "Operations",
    icon: CircleAlert,
    description: "Triage, assign and resolve equipment incidents against SLA.",
    listDescription: "37 open tickets · median first response 42 minutes.",
    columns: ["Ticket", "Summary", "Department", "Priority", "Status", "Assignee"],
    records: complaintRecords,
    fields: [
      {
        name: "title",
        label: "Summary",
        type: "text",
        placeholder: "MRI coil overheating during long scans",
      },
      {
        name: "equipment",
        label: "Equipment",
        type: "select",
        options: (equipment || []).map((e) => e.name),
      },
      {
        name: "dept",
        label: "Department",
        type: "select",
        options: (departments || []).map((d) => d.name),
      },
      {
        name: "priority",
        label: "Priority",
        type: "select",
        options: ["Critical", "High", "Medium", "Low"],
      },
      {
        name: "assignee",
        label: "Assignee",
        type: "select",
        options: ["Daniel Okafor", "Marcus Vance", "Unassigned"],
      },
      { name: "due", label: "SLA due date", type: "date" },
      {
        name: "description",
        label: "Description",
        type: "textarea",
        wide: true,
        placeholder: "What happened, when it started, and any error codes…",
      },
    ],
    stats: [
      { label: "Open tickets", value: "37", delta: "-12%" },
      { label: "SLA compliance", value: "94.1%", delta: "+2.4%" },
      { label: "Avg. resolution", value: "6.4h", delta: "-48m" },
      { label: "Escalated", value: "4", delta: "+1" },
    ],
    trend: trend([48, 42, 39, 41, 34, 31], [44, 45, 41, 46, 38, 36]),
    seriesA: "Raised",
    seriesB: "Resolved",
    breakdown: [
      { name: "Critical", value: 8 },
      { name: "High", value: 14 },
      { name: "Medium", value: 21 },
      { name: "Low", value: 12 },
    ],
  },
  maintenance: {
    key: "maintenance",
    base: "/maintenance",
    label: "Maintenance",
    singular: "Work order",
    eyebrow: "Operations",
    icon: Wrench,
    description: "Plan preventive, corrective and calibration work across the estate.",
    listDescription: "128 work orders this month · 96% completed on schedule.",
    columns: ["Work order", "Task", "Type", "Department", "Engineer", "Slot"],
    records: maintenanceRecords,
    fields: [
      {
        name: "task",
        label: "Task title",
        type: "text",
        placeholder: "Quarterly preventive service",
      },
      {
        name: "equipment",
        label: "Equipment",
        type: "select",
        options: (equipment || []).map((e) => e.name),
      },
      {
        name: "type",
        label: "Work order type",
        type: "select",
        options: ["Preventive", "Corrective", "Calibration", "Inspection"],
      },
      {
        name: "engineer",
        label: "Assigned engineer",
        type: "select",
        options: ["Daniel Okafor", "Marcus Vance", "Unassigned"],
      },
      { name: "date", label: "Scheduled date", type: "date" },
      { name: "duration", label: "Estimated hours", type: "number", placeholder: "2" },
      {
        name: "checklist",
        label: "Checklist instructions",
        type: "textarea",
        wide: true,
        placeholder: "Steps the engineer must confirm before closing the order…",
      },
    ],
    stats: [
      { label: "Open work orders", value: "128", delta: "+6" },
      { label: "On-time rate", value: "96.2%", delta: "+1.1%" },
      { label: "Avg. duration", value: "2.4h", delta: "-12m" },
      { label: "Backlog", value: "9", delta: "-4" },
    ],
    trend: trend([104, 112, 118, 121, 126, 128], [98, 108, 112, 118, 121, 124]),
    seriesA: "Planned",
    seriesB: "Completed",
    breakdown: [
      { name: "Preventive", value: 62 },
      { name: "Corrective", value: 34 },
      { name: "Calibration", value: 21 },
      { name: "Inspection", value: 11 },
    ],
  },
  departments: {
    key: "departments",
    base: "/departments",
    label: "Departments",
    singular: "Department",
    eyebrow: "Management",
    icon: Building2,
    description: "Compare department health, equipment load, complaints and staffing.",
    listDescription: "6 clinical departments · composite performance score 91.2.",
    columns: ["Department", "Assets", "Staff", "Uptime", "Complaints", "Spend"],
    records: departmentRecords,
    fields: [
      { name: "name", label: "Department name", type: "text", placeholder: "Radiology" },
      {
        name: "head",
        label: "Department head",
        type: "select",
        options: (users || []).map((u) => u.name),
      },
      {
        name: "wing",
        label: "Building wing",
        type: "select",
        options: ["North Wing", "South Wing", "East Wing", "West Tower"],
      },
      { name: "staff", label: "Staff headcount", type: "number", placeholder: "48" },
      { name: "budget", label: "Monthly budget", type: "text", placeholder: "$42,000" },
      { name: "opened", label: "Operational since", type: "date" },
      {
        name: "charter",
        label: "Operating charter",
        type: "textarea",
        wide: true,
        placeholder: "Scope of care, escalation policy and service windows…",
      },
    ],
    stats: [
      { label: "Departments", value: "6", delta: "0" },
      { label: "Avg. score", value: "91.2", delta: "+2.1" },
      { label: "Assets managed", value: "1,870", delta: "+58" },
      { label: "Total staff", value: "307", delta: "+9" },
    ],
    trend: trend([86, 88, 89, 90, 91, 92], [93, 94, 95, 96, 97, 98]),
    seriesA: "Score",
    seriesB: "Uptime",
    breakdown: (departments || []).map((d) => ({ name: d.name, value: d.assets })),
  },
  users: {
    key: "users",
    base: "/users",
    label: "User Management",
    singular: "User",
    eyebrow: "Administration",
    icon: UsersIcon,
    description: "Manage people, roles and access across the Medixa workspace.",
    listDescription: "48 workspace members · 6 roles · SSO enforced.",
    columns: ["Name", "Handle", "Role", "Department", "Status", "Last active"],
    records: userRecords,
    fields: [
      { name: "name", label: "Full name", type: "text", placeholder: "Emilia Greene" },
      {
        name: "email",
        label: "Work email",
        type: "text",
        placeholder: "emilia.greene@medixa.health",
      },
      {
        name: "role",
        label: "Role",
        type: "select",
        options: [
          "Administrator",
          "Biomedical Lead",
          "Engineer",
          "Specialist",
          "Auditor",
          "Procurement",
        ],
      },
      {
        name: "dept",
        label: "Department",
        type: "select",
        options: (departments || []).map((d) => d.name),
      },
      {
        name: "shift",
        label: "Primary shift",
        type: "select",
        options: ["Morning", "Evening", "Night", "Rotating"],
      },
      { name: "start", label: "Start date", type: "date" },
      {
        name: "notes",
        label: "Access notes",
        type: "textarea",
        wide: true,
        placeholder: "Systems this member needs, approvals and exceptions…",
      },
    ],
    stats: [
      { label: "Members", value: "48", delta: "+3" },
      { label: "Active today", value: "31", delta: "+5" },
      { label: "Admins", value: "4", delta: "0" },
      { label: "Pending invites", value: "2", delta: "+2" },
    ],
    trend: trend([38, 41, 43, 45, 47, 48], [24, 27, 28, 30, 31, 31]),
    seriesA: "Members",
    seriesB: "Daily active",
    breakdown: [
      { name: "Engineer", value: 21 },
      { name: "Specialist", value: 9 },
      { name: "Administrator", value: 4 },
      { name: "Auditor", value: 6 },
      { name: "Procurement", value: 8 },
    ],
  },
  warranty: {
    key: "warranty",
    base: "/warranty",
    label: "Warranty & AMC",
    singular: "Contract",
    eyebrow: "Assets",
    icon: ShieldCheck,
    description: "Track vendor contracts, coverage and renewals across the estate.",
    listDescription: "42 active contracts · $1.34M in coverage value.",
    columns: ["Contract", "Vendor", "Type", "Assets", "Expires", "Value"],
    records: warrantyRecords,
    fields: [
      {
        name: "equipment",
        label: "Covered asset (Asset ID)",
        type: "text",
        placeholder: "EQ-1001",
      },
      { name: "vendor", label: "Vendor", type: "text", placeholder: "Siemens Healthineers" },
      {
        name: "type",
        label: "Contract type",
        type: "select",
        options: ["Comprehensive AMC", "Non-comprehensive", "Warranty"],
      },
      { name: "assets", label: "Covered assets", type: "number", placeholder: "186" },
      { name: "value", label: "Contract value", type: "text", placeholder: "$412,000" },
      { name: "start", label: "Start date", type: "date" },
      { name: "expires", label: "Expiry date", type: "date" },
      {
        name: "terms",
        label: "Coverage terms",
        type: "textarea",
        wide: true,
        placeholder: "Response times, parts coverage, exclusions and penalties…",
      },
    ],
    stats: [
      { label: "Active contracts", value: "42", delta: "+2" },
      { label: "Coverage value", value: "$1.34M", delta: "+8.4%" },
      { label: "Expiring ≤30d", value: "2", delta: "+1" },
      { label: "Uncovered assets", value: "168", delta: "-24" },
    ],
    trend: trend([74, 76, 79, 80, 81, 82], [61, 64, 66, 68, 71, 74]),
    seriesA: "Coverage %",
    seriesB: "Renewal readiness",
    breakdown: [
      { name: "Comprehensive", value: 62 },
      { name: "Non-comprehensive", value: 21 },
      { name: "Warranty only", value: 17 },
    ],
  },
  vendors: {
    key: "vendors",
    base: "/vendors",
    label: "Vendors",
    singular: "Vendor",
    eyebrow: "Assets",
    icon: Truck,
    description: "Manufacturers, suppliers and service partners behind the estate.",
    listDescription: "Approved vendor register for contracts, service and calibration partners.",
    columns: ["Vendor code", "Vendor", "Category", "Location", "Status", "Contact"],
    records: vendorRecords,
    fields: [
      { name: "name", label: "Vendor name", type: "text", placeholder: "Siemens Healthineers" },
      {
        name: "legalName",
        label: "Legal name",
        type: "text",
        placeholder: "Siemens Healthineers AG",
      },
      {
        name: "category",
        label: "Category",
        type: "select",
        options: [
          "Equipment Supplier",
          "Manufacturer",
          "Service Provider",
          "Calibration Provider",
          "Maintenance Provider",
          "Other",
        ],
      },
      {
        name: "status",
        label: "Status",
        type: "select",
        options: ["Active", "Inactive", "Suspended"],
      },
      { name: "contactPerson", label: "Contact person", type: "text", placeholder: "Klaus Berger" },
      { name: "email", label: "Email", type: "text", placeholder: "service@vendor.com" },
      { name: "phone", label: "Phone", type: "text", placeholder: "+49 9131 84 0" },
      { name: "website", label: "Website", type: "text", placeholder: "https://vendor.com" },
      { name: "address", label: "Address", type: "text", placeholder: "Henkestrasse 127" },
      { name: "city", label: "City", type: "text", placeholder: "Erlangen" },
      { name: "state", label: "State / region", type: "text", placeholder: "Bavaria" },
      { name: "country", label: "Country", type: "text", placeholder: "Germany" },
      { name: "postalCode", label: "Postal code", type: "text", placeholder: "91052" },
      { name: "taxId", label: "Tax ID", type: "text", placeholder: "DE812345678" },
      {
        name: "specialization",
        label: "Specialisation",
        type: "text",
        placeholder: "MRI, CT, Angiography",
      },
      { name: "rating", label: "Rating (0-5)", type: "number", placeholder: "4" },
      {
        name: "notes",
        label: "Notes",
        type: "textarea",
        wide: true,
        placeholder: "Response commitments, escalation contacts, contract history…",
      },
    ],
    stats: [
      { label: "Vendors", value: "5", delta: "+1" },
      { label: "Active", value: "5", delta: "0" },
      { label: "Service partners", value: "2", delta: "+1" },
      { label: "Avg. rating", value: "4.2", delta: "+0.2" },
    ],
    trend: trend([12, 14, 15, 16, 18, 19], [10, 12, 13, 15, 16, 17]),
    seriesA: "Registered",
    seriesB: "Active",
    breakdown: [
      { name: "Manufacturer", value: 2 },
      { name: "Equipment Supplier", value: 1 },
      { name: "Service Provider", value: 1 },
      { name: "Calibration Provider", value: 1 },
    ],
  },
  "purchase-orders": {
    key: "purchase-orders",
    base: "/purchase-orders",
    label: "Purchase Orders",
    singular: "Purchase Order",
    eyebrow: "Procurement",
    icon: ReceiptText,
    description: "Procurement pipeline from draft request through approval to delivery.",
    listDescription: "Every purchase order raised against the approved vendor register.",
    columns: ["PO number", "Vendor", "Department", "Total", "Status", "Order date"],
    records: purchaseOrderRecords,
    fields: [
      {
        name: "title",
        label: "Purchase title",
        type: "text",
        placeholder: "MRI gradient coil assembly",
      },
      { name: "vendorId", label: "Vendor code", type: "text", placeholder: "VEN-0001" },
      { name: "departmentId", label: "Department code", type: "text", placeholder: "RAD" },
      {
        name: "priority",
        label: "Priority",
        type: "select",
        options: ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
      },
      { name: "orderDate", label: "Order date", type: "date" },
      { name: "expectedDeliveryDate", label: "Expected delivery", type: "date" },
      {
        name: "itemDescription",
        label: "Item description",
        type: "text",
        placeholder: "Gradient coil assembly",
      },
      { name: "itemCode", label: "Item code", type: "text", placeholder: "SIE-GC-3T" },
      { name: "quantity", label: "Quantity", type: "number", placeholder: "1" },
      { name: "unitPrice", label: "Unit price", type: "number", placeholder: "84000" },
      { name: "taxRate", label: "Tax rate (%)", type: "number", placeholder: "5" },
      { name: "discountRate", label: "Discount rate (%)", type: "number", placeholder: "0" },
      { name: "shippingCost", label: "Shipping cost", type: "number", placeholder: "750" },
      { name: "currency", label: "Currency", type: "text", placeholder: "USD" },
      { name: "paymentTerms", label: "Payment terms", type: "text", placeholder: "Net 30" },
      {
        name: "specification",
        label: "Specification",
        type: "textarea",
        wide: true,
        placeholder: "Technical specification for the requested item…",
      },
      {
        name: "deliveryAddress",
        label: "Delivery address",
        type: "textarea",
        wide: true,
        placeholder: "Loading bay 2, Radiology, Block C",
      },
      {
        name: "notes",
        label: "Notes",
        type: "textarea",
        wide: true,
        placeholder: "Budget line, justification, urgency…",
      },
    ],
    stats: [
      { label: "Open orders", value: "5", delta: "+2" },
      { label: "Pending approval", value: "1", delta: "+1" },
      { label: "Committed value", value: "USD 154k", delta: "+12%" },
      { label: "Received", value: "1", delta: "0" },
    ],
    trend: trend([6, 8, 9, 11, 12, 14], [4, 6, 7, 9, 10, 12]),
    seriesA: "Raised",
    seriesB: "Approved",
    breakdown: [
      { name: "Draft", value: 1 },
      { name: "Pending approval", value: 1 },
      { name: "Approved", value: 1 },
      { name: "Ordered", value: 1 },
      { name: "Received", value: 1 },
    ],
  },
  inventory: {
    key: "inventory",
    base: "/inventory",
    label: "Inventory",
    singular: "Item",
    eyebrow: "Assets",
    icon: Boxes,
    description: "Manage medical equipment stock, replacement parts, and consumables.",
    listDescription:
      "Hospital medical equipment spare parts, consumables, and accessories register.",
    columns: ["Item ID", "Item Name", "Category", "Stock Level", "Total Value", "Status"],
    records: [],
    fields: [
      {
        name: "name",
        label: "Item name",
        type: "text",
        placeholder: "MRI RF Coil Connector Cable",
      },
      { name: "sku", label: "SKU / Part number", type: "text", placeholder: "SIE-RF-908" },
      {
        name: "category",
        label: "Category",
        type: "select",
        options: [
          "SPARE_PARTS",
          "CONSUMABLES",
          "REAGENTS",
          "ACCESSORIES",
          "TOOLS",
          "IMPLANTS",
          "OTHER",
        ],
      },
      { name: "itemType", label: "Item type", type: "text", placeholder: "Spare Part" },
      {
        name: "manufacturer",
        label: "Manufacturer",
        type: "text",
        placeholder: "Siemens Healthineers",
      },
      { name: "vendorId", label: "Vendor", type: "text", placeholder: "VEN-0001" },
      {
        name: "unit",
        label: "Unit of measure",
        type: "select",
        options: ["PIECE", "BOX", "PACK", "SET", "ROLL", "LITER", "BOTTLE", "KIT", "METER"],
      },
      { name: "quantity", label: "Initial quantity", type: "number", placeholder: "20" },
      { name: "minStockLevel", label: "Min stock level", type: "number", placeholder: "5" },
      { name: "reorderLevel", label: "Reorder level", type: "number", placeholder: "10" },
      { name: "maxStockLevel", label: "Max stock level", type: "number", placeholder: "100" },
      { name: "unitCost", label: "Unit cost ($)", type: "number", placeholder: "150" },
      {
        name: "storageLocation",
        label: "Storage location",
        type: "text",
        placeholder: "Bay 2 - Shelf A",
      },
      {
        name: "departmentId",
        label: "Department",
        type: "select",
        options: (departments || []).map((d) => d.name),
      },
      { name: "batchNumber", label: "Batch number", type: "text", placeholder: "BATCH-2026-01" },
      { name: "serialNumber", label: "Serial number", type: "text", placeholder: "SN-98214" },
      { name: "expiryDate", label: "Expiry date", type: "date" },
      {
        name: "description",
        label: "Description / Specs",
        type: "textarea",
        wide: true,
        placeholder: "Item description, technical specifications, and compatibility details…",
      },
    ],
    stats: [
      { label: "Total Items", value: "24", delta: "+4" },
      { label: "Total Value", value: "$48.5k", delta: "+8.2%" },
      { label: "Low Stock", value: "2", delta: "-1" },
      { label: "Expiring Soon", value: "1", delta: "0" },
    ],
    trend: trend([18, 20, 21, 22, 23, 24], [14, 15, 17, 19, 21, 22]),
    seriesA: "Stock Value ($k)",
    seriesB: "Items count",
    breakdown: [
      { name: "Spare Parts", value: 12 },
      { name: "Consumables", value: 6 },
      { name: "Accessories", value: 4 },
      { name: "Reagents", value: 2 },
    ],
  },
} satisfies Record<string, ModuleConfig>;

export type ModuleKey = keyof typeof modules;

export const getModule = (key: ModuleKey): ModuleConfig => modules[key];

export const findRecord = (key: ModuleKey, id: string): ModuleRecord =>
  modules[key].records.find((r) => r.id.toLowerCase() === id.toLowerCase()) ??
  modules[key].records[0]!;
