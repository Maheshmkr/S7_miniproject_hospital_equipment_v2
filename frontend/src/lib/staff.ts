import { equipment as globalEquipment, type EquipmentSpecs } from "@/lib/mock-data";

export type Tone = "neutral" | "primary" | "success" | "warning" | "danger" | "violet";

/* ------------------------------- Department ------------------------------- */

export const staffDepartment = {
  name: "Radiology",
  code: "RAD-02",
  head: "Dr. Lucie Fontaine",
  headTitle: "Head of Radiology",
  email: "radiology@medixa.health",
  phone: "+44 7700 900 412",
  extension: "Ext. 2204",
  location: "Tower B · Level 2 · Imaging Wing",
  hours: "24 / 7 · 3 shifts",
  staffCount: 48,
  beds: "6 scan rooms · 2 control suites",
};

export const staffProfile = {
  name: "Clara Whitfield",
  handle: "@c.whitfield",
  avatar: "CW",
  role: "Department Staff",
  title: "Radiology Department Coordinator",
  employeeId: "DPT-4419",
  email: "clara.whitfield@medixa.health",
  phone: "+44 7700 900 233",
  shift: "Morning · 07:30 – 16:00",
  joined: "14 Aug 2022",
  reportsTo: "Dr. Lucie Fontaine",
  department: staffDepartment.name,
};

/* -------------------------------- Equipment -------------------------------- */

export type StaffEquipment = {
  id: string;
  name: string;
  category: string;
  manufacturer: string;
  dept: string;
  location: string;
  status: "Operational" | "Under Maintenance" | "Critical" | "Idle";
  health: number;
  warranty: string;
  warrantyStatus: "Active" | "Expiring" | "Expired";
  amc: string;
  amcStatus: "Comprehensive" | "Basic" | "None";
  purchased: string;
  installed: string;
  lastService: string;
  nextService: string;
  specs: EquipmentSpecs;
  documents: { name: string; type: string; size: string; updated: string }[];
  service: { date: string; engineer: string; type: string; outcome: string; hours: string }[];
  timeline: { when: string; who: string; what: string; tone: Tone }[];
};

const vida = globalEquipment.find((e) => e.id === "EQ-1042")!;

const docs = (model: string) => [
  {
    name: `${model} — Operator Manual.pdf`,
    type: "Manual",
    size: "8.4 MB",
    updated: "12 Jan 2026",
  },
  {
    name: `${model} — Quick Reference Guide.pdf`,
    type: "Guide",
    size: "1.2 MB",
    updated: "12 Jan 2026",
  },
  {
    name: `${model} — Daily QA Checklist.pdf`,
    type: "Checklist",
    size: "420 KB",
    updated: "03 Mar 2026",
  },
  {
    name: `${model} — Safety Datasheet.pdf`,
    type: "Compliance",
    size: "760 KB",
    updated: "22 Nov 2025",
  },
];

export const staffEquipment: StaffEquipment[] = [
  {
    id: vida.id,
    name: vida.name,
    category: "Imaging",
    manufacturer: "Siemens Healthineers",
    dept: "Radiology",
    location: vida.specs.location,
    status: "Operational",
    health: vida.health,
    warranty: vida.warranty,
    warrantyStatus: "Active",
    amc: vida.specs.amc,
    amcStatus: "Comprehensive",
    purchased: "28 Nov 2023",
    installed: vida.specs.installed,
    lastService: vida.specs.lastService,
    nextService: vida.specs.nextService,
    specs: vida.specs,
    documents: docs("MAGNETOM Vida 3T"),
    service: [
      {
        date: "22 Nov 2025",
        engineer: "Anita Raghavan",
        type: "Preventive",
        outcome: "Passed all QA phantom tests",
        hours: "3.5 h",
      },
      {
        date: "14 Jun 2025",
        engineer: "Anita Raghavan",
        type: "Corrective",
        outcome: "Replaced gradient coil cooling hose",
        hours: "5.0 h",
      },
      {
        date: "09 Feb 2025",
        engineer: "Mei Lin Chan",
        type: "Calibration",
        outcome: "Recalibrated B0 shim within tolerance",
        hours: "2.0 h",
      },
    ],
    timeline: [
      {
        when: "Today · 09:12",
        who: "Anita Raghavan",
        what: "acknowledged complaint CMP-8842 on this asset",
        tone: "primary",
      },
      {
        when: "Yesterday · 17:40",
        who: "Clara Whitfield",
        what: "reported coil overheating during long scans",
        tone: "warning",
      },
      {
        when: "22 Nov 2025",
        who: "Anita Raghavan",
        what: "completed quarterly preventive service",
        tone: "success",
      },
    ],
  },
  {
    id: "EQ-1108",
    name: "Siemens SOMATOM X.cite CT",
    category: "Imaging",
    manufacturer: "Siemens Healthineers",
    dept: "Radiology",
    location: "Radiology · Level 2 · CT Suite 1",
    status: "Operational",
    health: 93,
    warranty: "08 Oct 2027",
    warrantyStatus: "Active",
    amc: "Comprehensive · $31.2K / yr",
    amcStatus: "Comprehensive",
    purchased: "22 Jul 2024",
    installed: "08 Oct 2024",
    lastService: "16 Apr 2026",
    nextService: "16 Oct 2026",
    specs: {
      model: "SOMATOM X.cite 128",
      serial: "SN-XCITE-110842",
      manufactured: "Jun 2024",
      installed: "08 Oct 2024",
      location: "Radiology · Level 2 · CT Suite 1",
      owner: "Dr. L. Fontaine",
      power: "400 V · 60 kVA · 3-phase",
      weight: "2,180 kg",
      dimensions: "2.30 × 1.05 × 1.98 m",
      software: "syngo CT VB20",
      riskClass: "Class IIb",
      usageHours: "3,204 h",
      lastService: "16 Apr 2026",
      nextService: "16 Oct 2026",
      amc: "Comprehensive · $31.2K / yr",
      compliance: "IEC 60601-1 · CE · FDA 510(k)",
    },
    documents: docs("SOMATOM X.cite"),
    service: [
      {
        date: "16 Apr 2026",
        engineer: "Anita Raghavan",
        type: "Preventive",
        outcome: "Tube output within spec",
        hours: "2.5 h",
      },
      {
        date: "12 Dec 2025",
        engineer: "Priya Nair",
        type: "Calibration",
        outcome: "Air calibration completed",
        hours: "1.5 h",
      },
    ],
    timeline: [
      {
        when: "16 Apr 2026",
        who: "Anita Raghavan",
        what: "completed half-yearly preventive service",
        tone: "success",
      },
      {
        when: "12 Dec 2025",
        who: "Priya Nair",
        what: "ran full air calibration cycle",
        tone: "primary",
      },
    ],
  },
  {
    id: "EQ-1215",
    name: "GE Discovery RF180 X-Ray",
    category: "Imaging",
    manufacturer: "GE Healthcare",
    dept: "Radiology",
    location: "Radiology · Level 2 · X-Ray Room 3",
    status: "Under Maintenance",
    health: 71,
    warranty: "02 Sep 2026",
    warrantyStatus: "Expiring",
    amc: "Basic · $6.8K / yr",
    amcStatus: "Basic",
    purchased: "11 Jun 2022",
    installed: "02 Sep 2022",
    lastService: "20 May 2026",
    nextService: "18 Aug 2026",
    specs: {
      model: "Discovery RF180",
      serial: "SN-RF180-121533",
      manufactured: "Apr 2022",
      installed: "02 Sep 2022",
      location: "Radiology · Level 2 · X-Ray Room 3",
      owner: "Dr. L. Fontaine",
      power: "400 V · 32 kVA · 3-phase",
      weight: "980 kg",
      dimensions: "2.10 × 0.95 × 2.20 m",
      software: "RF180 SW 4.7",
      riskClass: "Class IIb",
      usageHours: "11,430 h",
      lastService: "20 May 2026",
      nextService: "18 Aug 2026",
      amc: "Basic · $6.8K / yr",
      compliance: "IEC 60601-1 · IEC 60601-2-54",
    },
    documents: docs("Discovery RF180"),
    service: [
      {
        date: "20 May 2026",
        engineer: "Daniel Okafor",
        type: "Corrective",
        outcome: "Collimator lamp replaced",
        hours: "1.5 h",
      },
      {
        date: "09 Jan 2026",
        engineer: "Daniel Okafor",
        type: "Preventive",
        outcome: "Detector cleaned, dose verified",
        hours: "2.0 h",
      },
    ],
    timeline: [
      {
        when: "Today · 10:20",
        who: "Daniel Okafor",
        what: "started work order WO-4482 on this asset",
        tone: "primary",
      },
      {
        when: "Yesterday · 08:55",
        who: "Clara Whitfield",
        what: "reported grid line artefacts on chest films",
        tone: "warning",
      },
    ],
  },
  {
    id: "EQ-1322",
    name: "Philips Affiniti 70 Ultrasound",
    category: "Imaging",
    manufacturer: "Philips",
    dept: "Radiology",
    location: "Radiology · Level 2 · US Room 1",
    status: "Operational",
    health: 88,
    warranty: "19 May 2027",
    warrantyStatus: "Active",
    amc: "Comprehensive · $4.9K / yr",
    amcStatus: "Comprehensive",
    purchased: "02 Mar 2024",
    installed: "19 May 2024",
    lastService: "21 Feb 2026",
    nextService: "21 Aug 2026",
    specs: {
      model: "Affiniti 70 G",
      serial: "SN-AF70-132217",
      manufactured: "Jan 2024",
      installed: "19 May 2024",
      location: "Radiology · Level 2 · US Room 1",
      owner: "Dr. L. Fontaine",
      power: "230 V · 700 VA",
      weight: "118 kg",
      dimensions: "0.58 × 1.05 × 1.55 m",
      software: "Affiniti R6.2",
      riskClass: "Class IIa",
      usageHours: "5,120 h",
      lastService: "21 Feb 2026",
      nextService: "21 Aug 2026",
      amc: "Comprehensive · $4.9K / yr",
      compliance: "IEC 60601-1 · IEC 60601-2-37",
    },
    documents: docs("Affiniti 70"),
    service: [
      {
        date: "21 Feb 2026",
        engineer: "Mei Lin Chan",
        type: "Preventive",
        outcome: "Transducer integrity verified",
        hours: "1.0 h",
      },
    ],
    timeline: [
      {
        when: "21 Feb 2026",
        who: "Mei Lin Chan",
        what: "completed probe integrity testing",
        tone: "success",
      },
    ],
  },
  {
    id: "EQ-1436",
    name: "Hologic Selenia Dimensions Mammography",
    category: "Imaging",
    manufacturer: "Hologic",
    dept: "Radiology",
    location: "Radiology · Level 2 · Mammo Suite",
    status: "Operational",
    health: 90,
    warranty: "30 Jan 2027",
    warrantyStatus: "Active",
    amc: "Comprehensive · $12.4K / yr",
    amcStatus: "Comprehensive",
    purchased: "04 Nov 2023",
    installed: "30 Jan 2024",
    lastService: "10 Mar 2026",
    nextService: "10 Sep 2026",
    specs: {
      model: "Selenia Dimensions 3Dimensions",
      serial: "SN-SEL3D-143619",
      manufactured: "Sep 2023",
      installed: "30 Jan 2024",
      location: "Radiology · Level 2 · Mammo Suite",
      owner: "Dr. L. Fontaine",
      power: "230 V · 8 kVA",
      weight: "540 kg",
      dimensions: "1.20 × 1.24 × 2.28 m",
      software: "SecurView 11.2",
      riskClass: "Class IIb",
      usageHours: "2,880 h",
      lastService: "10 Mar 2026",
      nextService: "10 Sep 2026",
      amc: "Comprehensive · $12.4K / yr",
      compliance: "IEC 60601-1 · MQSA · CE",
    },
    documents: docs("Selenia Dimensions"),
    service: [
      {
        date: "10 Mar 2026",
        engineer: "Priya Nair",
        type: "Calibration",
        outcome: "AEC calibration within tolerance",
        hours: "2.0 h",
      },
    ],
    timeline: [
      {
        when: "10 Mar 2026",
        who: "Priya Nair",
        what: "completed AEC calibration and phantom scoring",
        tone: "success",
      },
    ],
  },
  {
    id: "EQ-1544",
    name: "Canon Aquilion Lightning CT",
    category: "Imaging",
    manufacturer: "Canon Medical",
    dept: "Radiology",
    location: "Radiology · Level 2 · CT Suite 2",
    status: "Critical",
    health: 54,
    warranty: "18 Jun 2026",
    warrantyStatus: "Expiring",
    amc: "Basic · $9.1K / yr",
    amcStatus: "Basic",
    purchased: "22 Feb 2021",
    installed: "18 Jun 2021",
    lastService: "02 Feb 2026",
    nextService: "Overdue · 12 Jul 2026",
    specs: {
      model: "Aquilion Lightning 80",
      serial: "SN-AQL-154402",
      manufactured: "Dec 2020",
      installed: "18 Jun 2021",
      location: "Radiology · Level 2 · CT Suite 2",
      owner: "Dr. L. Fontaine",
      power: "400 V · 50 kVA · 3-phase",
      weight: "1,900 kg",
      dimensions: "1.88 × 1.02 × 1.79 m",
      software: "Aquilion SW 8.1",
      riskClass: "Class IIb",
      usageHours: "14,760 h",
      lastService: "02 Feb 2026",
      nextService: "Overdue · 12 Jul 2026",
      amc: "Basic · $9.1K / yr",
      compliance: "IEC 60601-1 · CE",
    },
    documents: docs("Aquilion Lightning"),
    service: [
      {
        date: "02 Feb 2026",
        engineer: "Tomás Herrera",
        type: "Corrective",
        outcome: "Gantry rotation fault cleared",
        hours: "6.0 h",
      },
      {
        date: "11 Aug 2025",
        engineer: "Tomás Herrera",
        type: "Preventive",
        outcome: "Tube nearing end of life — flagged",
        hours: "3.0 h",
      },
    ],
    timeline: [
      {
        when: "Today · 07:50",
        who: "System",
        what: "flagged the asset as critical health (54%)",
        tone: "danger",
      },
      {
        when: "2 days ago",
        who: "Clara Whitfield",
        what: "reported repeated gantry stop errors",
        tone: "warning",
      },
    ],
  },
  {
    id: "EQ-1663",
    name: "Fujifilm FDR Go PLUS Mobile X-Ray",
    category: "Imaging",
    manufacturer: "Fujifilm",
    dept: "Radiology",
    location: "Radiology · Level 2 · Mobile Bay",
    status: "Idle",
    health: 86,
    warranty: "21 Apr 2027",
    warrantyStatus: "Active",
    amc: "Basic · $2.4K / yr",
    amcStatus: "Basic",
    purchased: "02 Jan 2024",
    installed: "21 Apr 2024",
    lastService: "11 Jan 2026",
    nextService: "11 Oct 2026",
    specs: {
      model: "FDR Go PLUS",
      serial: "SN-FDRGO-166341",
      manufactured: "Nov 2023",
      installed: "21 Apr 2024",
      location: "Radiology · Level 2 · Mobile Bay",
      owner: "Dr. L. Fontaine",
      power: "Battery · 24 V sealed lead-acid",
      weight: "298 kg",
      dimensions: "0.55 × 1.24 × 1.99 m",
      software: "FDR SW 3.4",
      riskClass: "Class IIa",
      usageHours: "1,940 h",
      lastService: "11 Jan 2026",
      nextService: "11 Oct 2026",
      amc: "Basic · $2.4K / yr",
      compliance: "IEC 60601-1 · IEC 60601-2-54",
    },
    documents: docs("FDR Go PLUS"),
    service: [
      {
        date: "11 Jan 2026",
        engineer: "Priya Nair",
        type: "Preventive",
        outcome: "Battery pack load tested",
        hours: "1.0 h",
      },
    ],
    timeline: [
      {
        when: "11 Jan 2026",
        who: "Priya Nair",
        what: "load tested and reconditioned the battery pack",
        tone: "success",
      },
    ],
  },
  {
    id: "EQ-1771",
    name: "Bayer MEDRAD Stellant Injector",
    category: "Diagnostics",
    manufacturer: "Bayer",
    dept: "Radiology",
    location: "Radiology · Level 2 · CT Suite 1",
    status: "Operational",
    health: 92,
    warranty: "09 Nov 2026",
    warrantyStatus: "Active",
    amc: "Comprehensive · $3.1K / yr",
    amcStatus: "Comprehensive",
    purchased: "18 Aug 2023",
    installed: "09 Nov 2023",
    lastService: "30 May 2026",
    nextService: "30 Nov 2026",
    specs: {
      model: "MEDRAD Stellant FLEX",
      serial: "SN-STEL-177108",
      manufactured: "Jul 2023",
      installed: "09 Nov 2023",
      location: "Radiology · Level 2 · CT Suite 1",
      owner: "Dr. L. Fontaine",
      power: "230 V · 300 VA",
      weight: "48 kg",
      dimensions: "0.42 × 0.42 × 1.35 m",
      software: "Stellant SW 22.1",
      riskClass: "Class IIb",
      usageHours: "4,010 h",
      lastService: "30 May 2026",
      nextService: "30 Nov 2026",
      amc: "Comprehensive · $3.1K / yr",
      compliance: "IEC 60601-1 · CE",
    },
    documents: docs("MEDRAD Stellant"),
    service: [
      {
        date: "30 May 2026",
        engineer: "Mei Lin Chan",
        type: "Preventive",
        outcome: "Syringe drive verified, no leaks",
        hours: "1.0 h",
      },
    ],
    timeline: [
      {
        when: "30 May 2026",
        who: "Mei Lin Chan",
        what: "verified syringe drive and pressure limits",
        tone: "success",
      },
    ],
  },
];

export const equipmentById = (id: string) => staffEquipment.find((e) => e.id === id);

export const equipmentStatusTone: Record<StaffEquipment["status"], Tone> = {
  Operational: "success",
  "Under Maintenance": "warning",
  Critical: "danger",
  Idle: "neutral",
};

/* -------------------------------- Engineers -------------------------------- */

export const deptEngineers = [
  {
    name: "Anita Raghavan",
    initials: "AR",
    role: "Biomedical Lead",
    phone: "+44 7700 900 101",
    email: "anita.r@medixa.health",
    zone: "Radiology",
  },
  {
    name: "Daniel Okafor",
    initials: "DO",
    role: "Senior Biomedical Engineer",
    phone: "+44 7700 900 118",
    email: "daniel.okafor@medixa.health",
    zone: "ICU · Radiology cover",
  },
  {
    name: "Priya Nair",
    initials: "PN",
    role: "Calibration Specialist",
    phone: "+44 7700 900 176",
    email: "priya.nair@medixa.health",
    zone: "Cardiology · Imaging",
  },
  {
    name: "Mei Lin Chan",
    initials: "MC",
    role: "Field Engineer",
    phone: "+44 7700 900 144",
    email: "meilin@medixa.health",
    zone: "Laboratory · Imaging",
  },
];

/* -------------------------------- Complaints -------------------------------- */

export type StaffComplaint = {
  id: string;
  title: string;
  equipmentId: string;
  category: "Mechanical" | "Electrical" | "Software" | "Calibration" | "Accessory" | "Safety";
  priority: "Critical" | "High" | "Medium" | "Low";
  status: "Submitted" | "Assigned" | "In Progress" | "Awaiting Parts" | "Resolved" | "Closed";
  progress: number;
  engineer: string;
  created: string;
  updated: string;
  expected: string;
  raisedBy: string;
  contact: string;
  description: string;
  symptoms: string[];
  stage: string;
  parts: { part: string; code: string; qty: number; status: string }[];
  remarks: string;
  notes: { who: string; when: string; text: string }[];
  messages: { who: string; when: string; text: string; self?: boolean }[];
  photos: { label: string; when: string }[];
  attachments: { name: string; size: string }[];
  timeline: { when: string; who: string; what: string; tone: Tone }[];
  reportId?: string;
};

export const staffComplaints: StaffComplaint[] = [
  {
    id: "CMP-8842",
    title: "MRI coil overheating during long scans",
    equipmentId: "EQ-1042",
    category: "Mechanical",
    priority: "Critical",
    status: "In Progress",
    progress: 62,
    engineer: "Anita Raghavan",
    created: "Today · 07:40",
    updated: "Today · 11:05",
    expected: "Today · 18:00",
    raisedBy: "Clara Whitfield",
    contact: "+44 7700 900 233",
    description:
      "The 18-channel body coil becomes hot to touch after roughly 25 minutes of continuous scanning. Two patient sessions were interrupted and rescheduled. The console reports no fault code but scan quality degrades noticeably in the last sequences.",
    symptoms: ["Overheating", "Interrupted scans", "Image degradation", "No console error"],
    stage: "Diagnosis complete · repair in progress",
    parts: [
      { part: "Body coil cooling fan", code: "SIE-1044921", qty: 1, status: "Fitted" },
      { part: "Thermal interface pad", code: "SIE-1088340", qty: 2, status: "Issued" },
    ],
    remarks:
      "Cooling loop restriction confirmed. Fan replaced; thermal soak test running before release.",
    notes: [
      {
        who: "Anita Raghavan",
        when: "Today · 11:05",
        text: "Cooling fan replaced. Running a 40-minute thermal soak with a phantom before handing the scanner back.",
      },
      {
        who: "Anita Raghavan",
        when: "Today · 09:12",
        text: "Confirmed restricted airflow in the coil cooling duct. Ordering a replacement fan from local stores.",
      },
    ],
    messages: [
      {
        who: "Clara Whitfield",
        when: "Today · 07:41",
        text: "Two patients rescheduled — can we get an estimate for today?",
        self: true,
      },
      {
        who: "Anita Raghavan",
        when: "Today · 08:05",
        text: "On site now. Initial look suggests the coil cooling path. Will confirm within the hour.",
      },
      {
        who: "Clara Whitfield",
        when: "Today · 10:30",
        text: "Thanks. We will hold the 14:00 slot free for testing.",
        self: true,
      },
      {
        who: "Anita Raghavan",
        when: "Today · 11:06",
        text: "Fan replaced. Thermal soak underway, expect release by 18:00.",
      },
    ],
    photos: [
      { label: "Coil surface thermal reading", when: "Today · 08:20" },
      { label: "Cooling duct obstruction", when: "Today · 09:05" },
      { label: "Replacement fan fitted", when: "Today · 10:58" },
    ],
    attachments: [
      { name: "console-scan-log-0807.txt", size: "128 KB" },
      { name: "thermal-reading-report.pdf", size: "640 KB" },
    ],
    timeline: [
      {
        when: "Today · 11:05",
        who: "Anita Raghavan",
        what: "started thermal soak verification",
        tone: "primary",
      },
      {
        when: "Today · 10:58",
        who: "Anita Raghavan",
        what: "fitted the replacement cooling fan",
        tone: "primary",
      },
      {
        when: "Today · 09:12",
        who: "Anita Raghavan",
        what: "completed diagnosis — restricted cooling duct",
        tone: "violet",
      },
      {
        when: "Today · 08:02",
        who: "Dispatch",
        what: "assigned the complaint to Anita Raghavan",
        tone: "neutral",
      },
      {
        when: "Today · 07:40",
        who: "Clara Whitfield",
        what: "registered the complaint",
        tone: "warning",
      },
    ],
  },
  {
    id: "CMP-8839",
    title: "Grid line artefacts on chest radiographs",
    equipmentId: "EQ-1215",
    category: "Software",
    priority: "High",
    status: "Assigned",
    progress: 30,
    engineer: "Daniel Okafor",
    created: "Yesterday · 08:55",
    updated: "Today · 10:20",
    expected: "Tomorrow · 12:00",
    raisedBy: "Clara Whitfield",
    contact: "+44 7700 900 233",
    description:
      "Faint horizontal grid lines appear across chest radiographs taken in X-Ray Room 3. Reprocessing the study does not remove the artefact and radiologists have flagged three studies for repeat.",
    symptoms: ["Image artefact", "Repeat exposures", "Affects all chest protocols"],
    stage: "Engineer on site · investigation started",
    parts: [
      { part: "Detector grid assembly", code: "GE-5540118", qty: 1, status: "Awaiting quote" },
    ],
    remarks:
      "Detector firmware and grid alignment being checked before recommending a grid replacement.",
    notes: [
      {
        who: "Daniel Okafor",
        when: "Today · 10:20",
        text: "Started WO-4482. Capturing flat-field images to isolate detector vs grid.",
      },
    ],
    messages: [
      {
        who: "Clara Whitfield",
        when: "Yesterday · 08:56",
        text: "Radiologists are rejecting studies — is a temporary room swap possible?",
        self: true,
      },
      {
        who: "Daniel Okafor",
        when: "Yesterday · 09:40",
        text: "Use Room 1 for chest work today. I'll be with you tomorrow morning.",
      },
    ],
    photos: [
      { label: "Chest film with grid lines", when: "Yesterday · 08:52" },
      { label: "Flat field test image", when: "Today · 10:18" },
    ],
    attachments: [{ name: "rejected-studies-summary.pdf", size: "1.1 MB" }],
    timeline: [
      {
        when: "Today · 10:20",
        who: "Daniel Okafor",
        what: "started work order WO-4482",
        tone: "primary",
      },
      {
        when: "Yesterday · 09:31",
        who: "Dispatch",
        what: "assigned the complaint to Daniel Okafor",
        tone: "neutral",
      },
      {
        when: "Yesterday · 08:55",
        who: "Clara Whitfield",
        what: "registered the complaint",
        tone: "warning",
      },
    ],
  },
  {
    id: "CMP-8831",
    title: "Repeated gantry stop errors on Aquilion CT",
    equipmentId: "EQ-1544",
    category: "Mechanical",
    priority: "Critical",
    status: "Awaiting Parts",
    progress: 48,
    engineer: "Tomás Herrera",
    created: "2 days ago · 14:22",
    updated: "Today · 08:15",
    expected: "12 Aug 2026",
    raisedBy: "Sam Okonkwo",
    contact: "+44 7700 900 288",
    description:
      "Gantry halts mid-rotation with error G-204 roughly once every eight studies. The scanner recovers after a power cycle but the fault frequency is increasing week over week.",
    symptoms: ["Error G-204", "Mid-scan halt", "Increasing frequency", "Recovers on restart"],
    stage: "Parts ordered from vendor",
    parts: [
      {
        part: "Gantry rotation encoder",
        code: "CAN-2210443",
        qty: 1,
        status: "On order · ETA 11 Aug",
      },
      { part: "Slip ring brush set", code: "CAN-2210871", qty: 2, status: "In stores" },
    ],
    remarks:
      "Encoder confirmed faulty. Scanner restricted to urgent cases only until the replacement lands.",
    notes: [
      {
        who: "Tomás Herrera",
        when: "Today · 08:15",
        text: "Vendor confirmed encoder dispatch for 11 Aug. Keeping the scanner on restricted use.",
      },
      {
        who: "Tomás Herrera",
        when: "Yesterday · 15:02",
        text: "Slip ring brushes cleaned; error persisted, so the encoder is the likely root cause.",
      },
    ],
    messages: [
      {
        who: "Sam Okonkwo",
        when: "2 days ago · 14:30",
        text: "We can hold urgent cases only — please prioritise.",
      },
      {
        who: "Tomás Herrera",
        when: "Yesterday · 15:05",
        text: "Understood. Encoder ordered, ETA 11 Aug.",
      },
    ],
    photos: [
      { label: "Console error G-204", when: "2 days ago · 14:18" },
      { label: "Slip ring inspection", when: "Yesterday · 14:44" },
    ],
    attachments: [{ name: "gantry-error-log.csv", size: "310 KB" }],
    timeline: [
      {
        when: "Today · 08:15",
        who: "Tomás Herrera",
        what: "confirmed vendor dispatch of the encoder",
        tone: "warning",
      },
      {
        when: "Yesterday · 15:02",
        who: "Tomás Herrera",
        what: "ruled out slip ring contamination",
        tone: "violet",
      },
      {
        when: "2 days ago · 14:40",
        who: "Dispatch",
        what: "escalated to Tomás Herrera",
        tone: "danger",
      },
      {
        when: "2 days ago · 14:22",
        who: "Sam Okonkwo",
        what: "registered the complaint",
        tone: "warning",
      },
    ],
  },
  {
    id: "CMP-8820",
    title: "Ultrasound probe intermittently loses signal",
    equipmentId: "EQ-1322",
    category: "Accessory",
    priority: "Medium",
    status: "Resolved",
    progress: 100,
    engineer: "Mei Lin Chan",
    created: "4 days ago · 11:10",
    updated: "2 days ago · 16:35",
    expected: "Completed",
    raisedBy: "Clara Whitfield",
    contact: "+44 7700 900 233",
    description:
      "The C5-1 curved array probe drops signal when the cable is flexed near the connector. Sonographers reported three dropouts during abdominal studies.",
    symptoms: ["Signal dropout", "Cable-dependent", "Single probe affected"],
    stage: "Closed · probe replaced",
    parts: [
      {
        part: "C5-1 curved array probe",
        code: "PHI-989605-394",
        qty: 1,
        status: "Replaced under AMC",
      },
    ],
    remarks:
      "Faulty probe swapped under comprehensive AMC. Old probe returned to Philips for analysis.",
    notes: [
      {
        who: "Mei Lin Chan",
        when: "2 days ago · 16:35",
        text: "Replacement probe fitted and imaged against a phantom. All planes clean.",
      },
    ],
    messages: [
      {
        who: "Mei Lin Chan",
        when: "3 days ago · 09:12",
        text: "Confirmed cable fault at the strain relief. Requesting AMC replacement.",
      },
      {
        who: "Clara Whitfield",
        when: "3 days ago · 09:30",
        text: "Great, thank you — we have a spare probe in the meantime.",
        self: true,
      },
    ],
    photos: [
      { label: "Damaged strain relief", when: "3 days ago · 09:08" },
      { label: "Replacement probe fitted", when: "2 days ago · 16:22" },
    ],
    attachments: [{ name: "amc-replacement-form.pdf", size: "480 KB" }],
    timeline: [
      {
        when: "2 days ago · 16:35",
        who: "Mei Lin Chan",
        what: "closed the complaint after phantom verification",
        tone: "success",
      },
      {
        when: "3 days ago · 09:12",
        who: "Mei Lin Chan",
        what: "raised an AMC replacement request",
        tone: "primary",
      },
      {
        when: "4 days ago · 11:10",
        who: "Clara Whitfield",
        what: "registered the complaint",
        tone: "warning",
      },
    ],
    reportId: "SR-3312",
  },
  {
    id: "CMP-8808",
    title: "Mammography paddle compression drift",
    equipmentId: "EQ-1436",
    category: "Calibration",
    priority: "Medium",
    status: "Closed",
    progress: 100,
    engineer: "Priya Nair",
    created: "8 days ago · 09:45",
    updated: "6 days ago · 13:20",
    expected: "Completed",
    raisedBy: "Ruth Alvarez",
    contact: "+44 7700 900 260",
    description:
      "Displayed compression force drifted approximately 8 N against the reference gauge, causing inconsistent patient comfort settings across shifts.",
    symptoms: ["Force reading drift", "Inconsistent between shifts"],
    stage: "Closed · recalibrated",
    parts: [],
    remarks: "Compression sensor recalibrated to within 1 N of reference. QA passed.",
    notes: [
      {
        who: "Priya Nair",
        when: "6 days ago · 13:20",
        text: "Recalibrated and verified against the reference gauge across three force points.",
      },
    ],
    messages: [
      {
        who: "Priya Nair",
        when: "7 days ago · 10:05",
        text: "Booked calibration for tomorrow morning before the first list.",
      },
    ],
    photos: [{ label: "Reference gauge comparison", when: "6 days ago · 12:40" }],
    attachments: [{ name: "compression-calibration-certificate.pdf", size: "520 KB" }],
    timeline: [
      {
        when: "6 days ago · 13:20",
        who: "Priya Nair",
        what: "closed the complaint with a calibration certificate",
        tone: "success",
      },
      {
        when: "8 days ago · 09:45",
        who: "Ruth Alvarez",
        what: "registered the complaint",
        tone: "warning",
      },
    ],
    reportId: "SR-3298",
  },
  {
    id: "CMP-8795",
    title: "Contrast injector low-pressure warning",
    equipmentId: "EQ-1771",
    category: "Electrical",
    priority: "Low",
    status: "Closed",
    progress: 100,
    engineer: "Mei Lin Chan",
    created: "12 days ago · 15:30",
    updated: "10 days ago · 11:15",
    expected: "Completed",
    raisedBy: "Clara Whitfield",
    contact: "+44 7700 900 233",
    description:
      "Injector displayed a low-pressure warning at the start of two CT angiography studies. No injection failure occurred but the warning delayed both lists.",
    symptoms: ["Low pressure warning", "Startup only", "No injection failure"],
    stage: "Closed · seal kit replaced",
    parts: [{ part: "Syringe seal kit", code: "BAY-33119", qty: 1, status: "Fitted" }],
    remarks: "Worn syringe seal replaced and pressure profile verified over five test injections.",
    notes: [
      {
        who: "Mei Lin Chan",
        when: "10 days ago · 11:15",
        text: "Seal kit fitted; five verification injections all within pressure envelope.",
      },
    ],
    messages: [
      {
        who: "Mei Lin Chan",
        when: "11 days ago · 08:40",
        text: "Will attend before the morning CT list tomorrow.",
      },
    ],
    photos: [{ label: "Worn syringe seal", when: "10 days ago · 10:20" }],
    attachments: [{ name: "injector-pressure-test.pdf", size: "390 KB" }],
    timeline: [
      {
        when: "10 days ago · 11:15",
        who: "Mei Lin Chan",
        what: "closed the complaint after pressure verification",
        tone: "success",
      },
      {
        when: "12 days ago · 15:30",
        who: "Clara Whitfield",
        what: "registered the complaint",
        tone: "warning",
      },
    ],
    reportId: "SR-3281",
  },
];

export const complaintById = (id: string) => staffComplaints.find((c) => c.id === id);

export const complaintStatusTone: Record<StaffComplaint["status"], Tone> = {
  Submitted: "neutral",
  Assigned: "primary",
  "In Progress": "primary",
  "Awaiting Parts": "warning",
  Resolved: "success",
  Closed: "success",
};

export const priorityTone: Record<StaffComplaint["priority"], Tone> = {
  Critical: "danger",
  High: "warning",
  Medium: "primary",
  Low: "neutral",
};

export const complaintCategories: StaffComplaint["category"][] = [
  "Mechanical",
  "Electrical",
  "Software",
  "Calibration",
  "Accessory",
  "Safety",
];

/* ------------------------------- Maintenance ------------------------------- */

export type StaffMaintenance = {
  id: string;
  complaintId?: string;
  equipmentId: string;
  engineer: string;
  type: "Preventive" | "Corrective" | "Calibration";
  stage: string;
  status: "Scheduled" | "In Progress" | "Awaiting Parts" | "Completed";
  progress: number;
  started: string;
  expected: string;
  parts: { part: string; code: string; qty: number; status: string }[];
  remarks: string;
  images: { label: string; when: string }[];
  steps: { label: string; done: boolean }[];
  timeline: { when: string; who: string; what: string; tone: Tone }[];
};

export const staffMaintenance: StaffMaintenance[] = [
  {
    id: "WO-4471",
    complaintId: "CMP-8842",
    equipmentId: "EQ-1042",
    engineer: "Anita Raghavan",
    type: "Corrective",
    stage: "Verification",
    status: "In Progress",
    progress: 78,
    started: "Today · 08:30",
    expected: "Today · 18:00",
    parts: [
      { part: "Body coil cooling fan", code: "SIE-1044921", qty: 1, status: "Fitted" },
      { part: "Thermal interface pad", code: "SIE-1088340", qty: 2, status: "Issued" },
    ],
    remarks:
      "Thermal soak test running with a loading phantom. Release expected before the evening list.",
    images: [
      { label: "Cooling duct before service", when: "Today · 09:05" },
      { label: "New fan fitted", when: "Today · 10:58" },
      { label: "Thermal soak console reading", when: "Today · 11:40" },
    ],
    steps: [
      { label: "Isolate scanner and lock out power", done: true },
      { label: "Inspect coil cooling path", done: true },
      { label: "Replace cooling fan assembly", done: true },
      { label: "Run 40-minute thermal soak", done: false },
      { label: "Release to clinical use", done: false },
    ],
    timeline: [
      {
        when: "Today · 11:40",
        who: "Anita Raghavan",
        what: "began the thermal soak verification",
        tone: "primary",
      },
      {
        when: "Today · 10:58",
        who: "Anita Raghavan",
        what: "completed the fan replacement",
        tone: "primary",
      },
      {
        when: "Today · 08:30",
        who: "Anita Raghavan",
        what: "started the work order on site",
        tone: "neutral",
      },
    ],
  },
  {
    id: "WO-4482",
    complaintId: "CMP-8839",
    equipmentId: "EQ-1215",
    engineer: "Daniel Okafor",
    type: "Corrective",
    stage: "Diagnosis",
    status: "In Progress",
    progress: 35,
    started: "Today · 10:20",
    expected: "Tomorrow · 12:00",
    parts: [
      { part: "Detector grid assembly", code: "GE-5540118", qty: 1, status: "Awaiting quote" },
    ],
    remarks: "Flat field captures under review to isolate detector banding from grid misalignment.",
    images: [{ label: "Flat field test capture", when: "Today · 10:42" }],
    steps: [
      { label: "Reproduce the artefact with test exposures", done: true },
      { label: "Capture flat field reference images", done: true },
      { label: "Check grid alignment and detector firmware", done: false },
      { label: "Recommend repair or replacement", done: false },
    ],
    timeline: [
      {
        when: "Today · 10:42",
        who: "Daniel Okafor",
        what: "captured flat field reference images",
        tone: "primary",
      },
      {
        when: "Today · 10:20",
        who: "Daniel Okafor",
        what: "started the work order",
        tone: "neutral",
      },
    ],
  },
  {
    id: "WO-4468",
    complaintId: "CMP-8831",
    equipmentId: "EQ-1544",
    engineer: "Tomás Herrera",
    type: "Corrective",
    stage: "Awaiting parts",
    status: "Awaiting Parts",
    progress: 48,
    started: "2 days ago · 15:10",
    expected: "12 Aug 2026",
    parts: [
      {
        part: "Gantry rotation encoder",
        code: "CAN-2210443",
        qty: 1,
        status: "On order · ETA 11 Aug",
      },
      { part: "Slip ring brush set", code: "CAN-2210871", qty: 2, status: "In stores" },
    ],
    remarks: "Scanner restricted to urgent cases pending encoder delivery from the vendor.",
    images: [{ label: "Encoder housing inspection", when: "Yesterday · 15:20" }],
    steps: [
      { label: "Reproduce the G-204 fault", done: true },
      { label: "Clean and inspect slip ring", done: true },
      { label: "Confirm encoder failure", done: true },
      { label: "Fit replacement encoder", done: false },
      { label: "Run full rotation QA", done: false },
    ],
    timeline: [
      {
        when: "Today · 08:15",
        who: "Tomás Herrera",
        what: "confirmed the vendor dispatch date",
        tone: "warning",
      },
      {
        when: "Yesterday · 15:02",
        who: "Tomás Herrera",
        what: "ruled out slip ring contamination",
        tone: "violet",
      },
      {
        when: "2 days ago · 15:10",
        who: "Tomás Herrera",
        what: "started the work order",
        tone: "neutral",
      },
    ],
  },
  {
    id: "WO-4455",
    equipmentId: "EQ-1108",
    engineer: "Anita Raghavan",
    type: "Preventive",
    stage: "Scheduled",
    status: "Scheduled",
    progress: 0,
    started: "16 Oct 2026 · 08:00",
    expected: "16 Oct 2026 · 11:00",
    parts: [],
    remarks: "Half-yearly preventive service — tube output, dose verification and air calibration.",
    images: [],
    steps: [
      { label: "Confirm room downtime with department", done: true },
      { label: "Tube output and dose verification", done: false },
      { label: "Air calibration", done: false },
      { label: "Electrical safety test", done: false },
    ],
    timeline: [
      {
        when: "16 Apr 2026",
        who: "Dispatch",
        what: "scheduled the next preventive visit",
        tone: "neutral",
      },
    ],
  },
];

export const maintenanceById = (id: string) => staffMaintenance.find((m) => m.id === id);

export const maintenanceStatusTone: Record<StaffMaintenance["status"], Tone> = {
  Scheduled: "neutral",
  "In Progress": "primary",
  "Awaiting Parts": "warning",
  Completed: "success",
};

/* ------------------------------ Service reports ----------------------------- */

export type ServiceReport = {
  id: string;
  complaintId: string;
  equipmentId: string;
  engineer: string;
  completed: string;
  type: string;
  summary: string;
  findings: string;
  actions: string[];
  parts: { part: string; code: string; qty: number }[];
  timeTaken: string;
  downtime: string;
  outcome: "Passed" | "Passed with notes";
  signedBy: string;
  verifiedBy: string;
};

export const serviceReports: ServiceReport[] = [
  {
    id: "SR-3312",
    complaintId: "CMP-8820",
    equipmentId: "EQ-1322",
    engineer: "Mei Lin Chan",
    completed: "05 Aug 2026",
    type: "Corrective",
    summary:
      "C5-1 curved array probe replaced under comprehensive AMC after a confirmed cable fault at the strain relief.",
    findings:
      "Continuity testing showed intermittent loss on 4 of 128 elements when the cable was flexed within 60 mm of the connector. Housing and lens were undamaged.",
    actions: [
      "Isolated the fault to the probe cable strain relief",
      "Raised an AMC replacement request with Philips",
      "Fitted the replacement probe and registered the new serial",
      "Verified all imaging planes against a tissue-mimicking phantom",
    ],
    parts: [{ part: "C5-1 curved array probe", code: "PHI-989605-394", qty: 1 }],
    timeTaken: "2.5 h",
    downtime: "1 day (spare probe used)",
    outcome: "Passed",
    signedBy: "Mei Lin Chan",
    verifiedBy: "Clara Whitfield",
  },
  {
    id: "SR-3298",
    complaintId: "CMP-8808",
    equipmentId: "EQ-1436",
    engineer: "Priya Nair",
    completed: "01 Aug 2026",
    type: "Calibration",
    summary:
      "Compression force sensor recalibrated after an 8 N drift against the reference gauge.",
    findings:
      "Measured drift of 7.8 N at 100 N applied force. Sensor linearity remained within specification across the tested range.",
    actions: [
      "Compared displayed force to a certified reference gauge at 60 / 100 / 140 N",
      "Applied factory calibration procedure via service mode",
      "Re-verified across three force points",
      "Issued a calibration certificate for the QA file",
    ],
    parts: [],
    timeTaken: "2.0 h",
    downtime: "3 h",
    outcome: "Passed",
    signedBy: "Priya Nair",
    verifiedBy: "Ruth Alvarez",
  },
  {
    id: "SR-3281",
    complaintId: "CMP-8795",
    equipmentId: "EQ-1771",
    engineer: "Mei Lin Chan",
    completed: "28 Jul 2026",
    type: "Corrective",
    summary: "Syringe seal kit replaced to clear a recurring low-pressure warning on start-up.",
    findings:
      "Worn primary seal allowed a small pressure bleed during the priming cycle, tripping the low-pressure threshold before injection.",
    actions: [
      "Reproduced the warning across two priming cycles",
      "Replaced the syringe seal kit",
      "Ran five verification injections across the pressure envelope",
    ],
    parts: [{ part: "Syringe seal kit", code: "BAY-33119", qty: 1 }],
    timeTaken: "1.5 h",
    downtime: "2 h",
    outcome: "Passed",
    signedBy: "Mei Lin Chan",
    verifiedBy: "Clara Whitfield",
  },
  {
    id: "SR-3264",
    complaintId: "CMP-8770",
    equipmentId: "EQ-1042",
    engineer: "Anita Raghavan",
    completed: "22 Nov 2025",
    type: "Preventive",
    summary:
      "Quarterly preventive service on the MAGNETOM Vida 3T including full QA phantom suite.",
    findings:
      "Signal-to-noise, uniformity and geometric accuracy all within manufacturer tolerance. Helium level at 68% with a stable boil-off rate.",
    actions: [
      "Ran the full ACR phantom QA suite",
      "Inspected the gradient cooling circuit and cold head",
      "Cleaned coil connectors and verified all channels",
      "Updated the asset log and next-service due date",
    ],
    parts: [],
    timeTaken: "3.5 h",
    downtime: "4 h (planned)",
    outcome: "Passed with notes",
    signedBy: "Anita Raghavan",
    verifiedBy: "Dr. Lucie Fontaine",
  },
];

export const reportById = (id: string) => serviceReports.find((r) => r.id === id);

/* ------------------------------- Notifications ------------------------------ */

export type StaffNotification = {
  id: string;
  kind: "Complaint" | "Assignment" | "Maintenance" | "Warranty" | "Announcement";
  title: string;
  body: string;
  when: string;
  tone: Tone;
  unread: boolean;
  to?: string;
};

export const staffNotifications: StaffNotification[] = [
  {
    id: "N-1",
    kind: "Maintenance",
    title: "Maintenance started on MAGNETOM Vida 3T",
    body: "Anita Raghavan began work order WO-4471 for complaint CMP-8842.",
    when: "Today · 08:30",
    tone: "primary",
    unread: true,
    to: "/staff/maintenance/WO-4471",
  },
  {
    id: "N-2",
    kind: "Assignment",
    title: "Engineer assigned to CMP-8839",
    body: "Daniel Okafor has been assigned to the X-Ray grid artefact complaint.",
    when: "Yesterday · 09:31",
    tone: "violet",
    unread: true,
    to: "/staff/complaints/CMP-8839",
  },
  {
    id: "N-3",
    kind: "Complaint",
    title: "CMP-8831 moved to awaiting parts",
    body: "Gantry rotation encoder on order with the vendor, ETA 11 Aug 2026.",
    when: "Today · 08:15",
    tone: "warning",
    unread: true,
    to: "/staff/complaints/CMP-8831",
  },
  {
    id: "N-4",
    kind: "Warranty",
    title: "Warranty expiring for Discovery RF180",
    body: "The warranty on EQ-1215 expires on 02 Sep 2026 — 26 days remaining.",
    when: "2 days ago",
    tone: "danger",
    unread: true,
    to: "/staff/equipment/EQ-1215",
  },
  {
    id: "N-5",
    kind: "Maintenance",
    title: "Maintenance completed on Affiniti 70",
    body: "Service report SR-3312 is ready to review and download.",
    when: "05 Aug 2026",
    tone: "success",
    unread: false,
    to: "/staff/reports/SR-3312",
  },
  {
    id: "N-6",
    kind: "Announcement",
    title: "Imaging wing power test — Sunday 02:00",
    body: "A scheduled generator test will interrupt non-UPS sockets for 20 minutes.",
    when: "04 Aug 2026",
    tone: "neutral",
    unread: false,
  },
  {
    id: "N-7",
    kind: "Announcement",
    title: "New complaint SLA policy in effect",
    body: "Critical complaints now carry a 4-hour first-response target across all departments.",
    when: "01 Aug 2026",
    tone: "neutral",
    unread: false,
  },
  {
    id: "N-8",
    kind: "Complaint",
    title: "CMP-8808 closed",
    body: "Mammography compression drift resolved with a calibration certificate.",
    when: "01 Aug 2026",
    tone: "success",
    unread: false,
    to: "/staff/complaints/CMP-8808",
  },
];

/* ---------------------------------- Charts ---------------------------------- */

export const staffHealthTrend = [
  { month: "Mar", health: 88, uptime: 95 },
  { month: "Apr", health: 90, uptime: 96 },
  { month: "May", health: 91, uptime: 96 },
  { month: "Jun", health: 89, uptime: 94 },
  { month: "Jul", health: 92, uptime: 97 },
  { month: "Aug", health: 94, uptime: 98 },
];

export const staffComplaintTrend = [
  { week: "W27", raised: 5, resolved: 4 },
  { week: "W28", raised: 3, resolved: 5 },
  { week: "W29", raised: 6, resolved: 4 },
  { week: "W30", raised: 4, resolved: 6 },
  { week: "W31", raised: 7, resolved: 5 },
  { week: "W32", raised: 3, resolved: 4 },
];

export const staffCategorySplit = [
  { name: "Mechanical", value: 34 },
  { name: "Electrical", value: 21 },
  { name: "Software", value: 18 },
  { name: "Calibration", value: 15 },
  { name: "Accessory", value: 12 },
];

/* -------------------------------- Activities -------------------------------- */

export const staffActivities: { who: string; what: string; when: string; tone: Tone }[] = [
  {
    who: "Anita Raghavan",
    what: "started the thermal soak on MAGNETOM Vida 3T",
    when: "Today · 11:40",
    tone: "primary",
  },
  {
    who: "Daniel Okafor",
    what: "began diagnosis on Discovery RF180 (WO-4482)",
    when: "Today · 10:20",
    tone: "primary",
  },
  {
    who: "System",
    what: "flagged Aquilion Lightning CT as critical health",
    when: "Today · 07:50",
    tone: "danger",
  },
  {
    who: "Clara Whitfield",
    what: "registered complaint CMP-8842 on the MRI scanner",
    when: "Today · 07:40",
    tone: "warning",
  },
  {
    who: "Mei Lin Chan",
    what: "published service report SR-3312 for the Affiniti 70",
    when: "05 Aug 2026",
    tone: "success",
  },
  {
    who: "Priya Nair",
    what: "closed the mammography calibration complaint",
    when: "01 Aug 2026",
    tone: "success",
  },
];

export const upcomingMaintenance = [
  {
    id: "WO-4455",
    equipmentId: "EQ-1108",
    when: "16 Oct 2026 · 08:00",
    type: "Preventive",
    engineer: "Anita Raghavan",
  },
  {
    id: "WO-4491",
    equipmentId: "EQ-1436",
    when: "10 Sep 2026 · 09:30",
    type: "Preventive",
    engineer: "Priya Nair",
  },
  {
    id: "WO-4494",
    equipmentId: "EQ-1322",
    when: "21 Aug 2026 · 14:00",
    type: "Preventive",
    engineer: "Mei Lin Chan",
  },
  {
    id: "WO-4482",
    equipmentId: "EQ-1215",
    when: "Tomorrow · 09:00",
    type: "Corrective",
    engineer: "Daniel Okafor",
  },
];

/* ---------------------------------- Summary --------------------------------- */

export const staffStats = {
  total: staffEquipment.length,
  active: staffEquipment.filter((e) => e.status === "Operational").length,
  maintenance: staffEquipment.filter(
    (e) => e.status === "Under Maintenance" || e.status === "Critical",
  ).length,
  open: staffComplaints.filter((c) => !["Resolved", "Closed"].includes(c.status)).length,
  completed: staffComplaints.filter((c) => ["Resolved", "Closed"].includes(c.status)).length,
  upcoming: upcomingMaintenance.length,
  health: Math.round(staffEquipment.reduce((a, e) => a + e.health, 0) / staffEquipment.length),
};
