/**
 * Development seed for hospital_equipment.
 *
 * Mirrors the demo scenario the frontend already ships with:
 *   • Radiology MRI EQ-1001 (calibration drift complaint CMP-2026-0045 / WO-2026-0112)
 *   • ICU Ventilator EQ-2210 flow sensor failure → WO-4472 "Ventilator flow sensor replacement"
 * Safe to re-run: it clears the collections it owns first.
 */
import "dotenv/config";
import mongoose from "mongoose";
import { connectDB } from "../config/db.js";

import User from "../models/User.js";
import Department from "../models/Department.js";
import Equipment from "../models/Equipment.js";
import Complaint from "../models/Complaint.js";
import WorkOrder from "../models/WorkOrder.js";
import Warranty from "../models/Warranty.js";
import ChecklistTemplate from "../models/ChecklistTemplate.js";
import ChecklistQuestion from "../models/ChecklistQuestion.js";
import Maintenance from "../models/Maintenance.js";
import ChecklistResponse from "../models/ChecklistResponse.js";
import Investigation from "../models/Investigation.js";
import Evidence from "../models/Evidence.js";
import ServiceReport from "../models/ServiceReport.js";
import AuditLog from "../models/AuditLog.js";
import AuditInstance, { AuditTemplate } from "../models/AuditInstance.js";

const DEMO_PASSWORD = process.env.SEED_PASSWORD || "Medixa#2026";

async function run() {
  await connectDB();
  console.log("[seed] clearing collections…");
  await Promise.all(
    [
      User,
      Department,
      Equipment,
      Complaint,
      WorkOrder,
      Warranty,
      ChecklistTemplate,
      ChecklistQuestion,
      Maintenance,
      ChecklistResponse,
      Investigation,
      Evidence,
      ServiceReport,
      AuditLog,
      AuditInstance,
      AuditTemplate,
    ].map((M) => M.deleteMany({})),
  );

  /* ------------------------------ Departments ----------------------------- */
  const [radiology, icu, surgery, cardiology, emergency, laboratory] = await Department.create([
    { code: "RAD", name: "Radiology", building: "Tower A", floor: "Level 2", headName: "Dr. Alice Roy", contactEmail: "radiology@medixa.health", contactPhone: "+1 (555) 201-1001" },
    { code: "ICU", name: "Intensive Care Unit", building: "Tower B", floor: "Level 4", headName: "Dr. Peter Han", contactEmail: "icu@medixa.health", contactPhone: "+1 (555) 201-1002" },
    { code: "SUR", name: "Operating Theatre", building: "Tower A", floor: "Level 3", headName: "Dr. Nina Patel", contactEmail: "surgery@medixa.health", contactPhone: "+1 (555) 201-1003" },
    { code: "CAR", name: "Cardiology", building: "Tower C", floor: "Level 1", headName: "Dr. Omar Said", contactEmail: "cardiology@medixa.health", contactPhone: "+1 (555) 201-1004" },
    { code: "EMR", name: "Emergency", building: "Tower B", floor: "Level 0", headName: "Dr. Thomas Herrera", contactEmail: "emergency@medixa.health", contactPhone: "+1 (555) 201-1005" },
    { code: "LAB", name: "Laboratory", building: "Tower C", floor: "Level 2", headName: "Dr. Priya Nair", contactEmail: "laboratory@medixa.health", contactPhone: "+1 (555) 201-1006" },
  ]);

  /* --------------------------------- Users -------------------------------- */
  const hash = await User.hashPassword(DEMO_PASSWORD);
  const [admin, engineer, staff, anita, meilin, tomas, priya] = await User.create([
    {
      name: "Emilia Greene",
      email: "emilia.greene@medixa.health",
      passwordHash: hash,
      role: "ADMINISTRATOR",
      title: "Administrator",
      initials: "EG",
      employeeId: "EMP-0001",
      phone: "+1 (555) 010-0001",
      status: "ACTIVE",
    },
    {
      name: "Daniel Okafor",
      email: "daniel.okafor@medixa.health",
      passwordHash: hash,
      role: "BIOMEDICAL_ENGINEER",
      title: "Senior Biomedical Engineer",
      initials: "DO",
      employeeId: "EMP-0042",
      phone: "+1 (555) 010-0042",
      departmentId: icu._id,
      status: "ACTIVE",
    },
    {
      name: "Clara Whitfield",
      email: "clara.whitfield@medixa.health",
      passwordHash: hash,
      role: "DEPARTMENT_STAFF",
      title: "Radiology Department Coordinator",
      initials: "CW",
      employeeId: "EMP-0118",
      phone: "+1 (555) 010-0118",
      departmentId: radiology._id,
      status: "ACTIVE",
    },
    {
      name: "Anita Raghavan",
      email: "anita.raghavan@medixa.health",
      passwordHash: hash,
      role: "BIOMEDICAL_ENGINEER",
      title: "Biomedical Lead",
      initials: "AR",
      employeeId: "EMP-0012",
      phone: "+1 (555) 010-0012",
      departmentId: radiology._id,
      status: "ACTIVE",
    },
    {
      name: "Mei Lin Chan",
      email: "meilin.chan@medixa.health",
      passwordHash: hash,
      role: "BIOMEDICAL_ENGINEER",
      title: "Field Engineer",
      initials: "MC",
      employeeId: "EMP-0056",
      phone: "+1 (555) 010-0056",
      departmentId: laboratory._id,
      status: "ACTIVE",
    },
    {
      name: "Tomás Herrera",
      email: "tomas.herrera@medixa.health",
      passwordHash: hash,
      role: "BIOMEDICAL_ENGINEER",
      title: "Field Engineer",
      initials: "TH",
      employeeId: "EMP-0089",
      phone: "+1 (555) 010-0089",
      departmentId: emergency._id,
      status: "ACTIVE",
    },
    {
      name: "Priya Nair",
      email: "priya.nair@medixa.health",
      passwordHash: hash,
      role: "BIOMEDICAL_ENGINEER",
      title: "Calibration Specialist",
      initials: "PN",
      employeeId: "EMP-0094",
      phone: "+1 (555) 010-0094",
      departmentId: cardiology._id,
      status: "ACTIVE",
    },
  ]);

  /* ------------------------------- Equipment ------------------------------ */
  const [mri, ventilator, ctScanner, monitor] = await Equipment.create([
    {
      equipmentId: "EQ-1001",
      name: "GE SIGNA Premier 3T MRI Scanner",
      category: "Imaging",
      manufacturer: "GE Healthcare",
      model: "SIGNA Premier 3T",
      serialNumber: "SN-SIGNA-100174",
      departmentId: radiology._id,
      location: "Radiology · Level 2 · Scan Room B",
      status: "UNDER_BREAKDOWN",
      criticality: "CRITICAL",
      healthScore: 62,
      purchaseDate: new Date("2022-01-20"),
      installationDate: new Date("2022-03-18"),
      cost: "$2.10M",
      createdBy: admin._id,
    },
    {
      equipmentId: "EQ-2210",
      name: "Hamilton C6 ICU Ventilator",
      category: "Life Support",
      manufacturer: "Hamilton Medical",
      model: "HAMILTON-C6",
      serialNumber: "SN-C6-221045",
      departmentId: icu._id,
      location: "ICU · Level 4 · Bay 7",
      status: "UNDER_BREAKDOWN",
      criticality: "CRITICAL",
      healthScore: 71,
      purchaseDate: new Date("2023-05-02"),
      installationDate: new Date("2023-06-11"),
      cost: "$38,500",
      createdBy: admin._id,
    },
    {
      equipmentId: "EQ-4127",
      name: "Siemens SOMATOM X.cite CT Scanner",
      category: "Imaging",
      manufacturer: "Siemens Healthineers",
      model: "SOMATOM X.cite",
      serialNumber: "SN-XCITE-412703",
      departmentId: radiology._id,
      location: "Radiology · Level 2 · CT Suite",
      status: "OPERATIONAL",
      criticality: "HIGH",
      healthScore: 91,
      installationDate: new Date("2021-11-04"),
      cost: "$1.35M",
      createdBy: admin._id,
    },
    {
      equipmentId: "EQ-3381",
      name: "Philips IntelliVue MX750 Monitor",
      category: "Monitoring",
      manufacturer: "Philips",
      model: "IntelliVue MX750",
      serialNumber: "SN-MX750-338122",
      departmentId: cardiology._id,
      location: "Cardiology · Level 1 · Bay 3",
      status: "OPERATIONAL",
      criticality: "MEDIUM",
      healthScore: 88,
      installationDate: new Date("2023-02-14"),
      cost: "$18,200",
      createdBy: admin._id,
    },
  ]);

  /* ----------------------------- Warranty / AMC --------------------------- */
  await Warranty.create([
    {
      warrantyId: "AMC-2288",
      kind: "AMC",
      equipmentId: mri._id,
      vendor: "GE Healthcare",
      startDate: new Date("2025-04-01"),
      endDate: new Date("2027-03-31"),
      coverage: "Comprehensive incl. coil replacement",
      contractNumber: "GE-AMC-2288",
      value: "$142,000",
    },
    {
      warrantyId: "WR-0001",
      kind: "WARRANTY",
      equipmentId: ventilator._id,
      vendor: "Hamilton Medical",
      startDate: new Date("2023-06-11"),
      endDate: new Date("2026-06-10"),
      coverage: "Parts and labour",
      contractNumber: "HM-WR-77120",
    },
  ]);

  /* ------------------- Administrator checklist configuration -------------- */
  const lifeSupportTemplate = await ChecklistTemplate.create({
    name: "Ventilator corrective maintenance checklist",
    equipmentCategory: "Life Support",
    maintenanceType: "ALL",
    description: "Baseline safety and performance checks for all life-support assets.",
    createdBy: admin._id,
  });

  const imagingTemplate = await ChecklistTemplate.create({
    name: "Imaging system maintenance checklist",
    equipmentCategory: "Imaging",
    maintenanceType: "ALL",
    description: "Calibration, image quality and electrical safety checks.",
    createdBy: admin._id,
  });

  await ChecklistQuestion.create([
    {
      templateId: lifeSupportTemplate._id,
      question: "Is the flow sensor functioning correctly?",
      responseType: "PASS_FAIL",
      required: true,
      priority: "CRITICAL",
      order: 0,
      helpText: "Run the flow sensor calibration routine and compare against the reference flow meter.",
    },
    {
      templateId: lifeSupportTemplate._id,
      question: "Is the oxygen sensor within calibration tolerance?",
      responseType: "PASS_FAIL",
      required: true,
      priority: "CRITICAL",
      order: 1,
    },
    {
      templateId: lifeSupportTemplate._id,
      question: "Measured earth leakage current (µA)",
      responseType: "NUMBER",
      required: true,
      priority: "IMPORTANT",
      order: 2,
      helpText: "IEC 62353 limit: 500 µA.",
    },
    {
      templateId: lifeSupportTemplate._id,
      question: "Patient circuit leak test result",
      responseType: "DROPDOWN",
      options: ["Within limits", "Marginal", "Out of limits"],
      required: true,
      priority: "IMPORTANT",
      order: 3,
    },
    {
      templateId: lifeSupportTemplate._id,
      question: "Alarm audio and visual verification notes",
      responseType: "TEXT",
      required: false,
      priority: "STANDARD",
      order: 4,
    },
    {
      templateId: imagingTemplate._id,
      question: "Is image uniformity within specification?",
      responseType: "PASS_FAIL",
      required: true,
      priority: "CRITICAL",
      order: 0,
    },
    {
      templateId: imagingTemplate._id,
      question: "Date of last gradient calibration",
      responseType: "DATE",
      required: true,
      priority: "IMPORTANT",
      order: 1,
    },
    {
      templateId: imagingTemplate._id,
      question: "Attach phantom scan evidence",
      responseType: "EVIDENCE",
      required: false,
      priority: "STANDARD",
      order: 2,
    },
  ]);

  /* ------------------------------- Complaints ----------------------------- */
  const ventComplaint = await Complaint.create({
    complaintId: "CMP-2026-0044",
    equipmentId: ventilator._id,
    departmentId: icu._id,
    reportedBy: staff._id,
    assignedEngineerId: engineer._id,
    title: "Ventilator flow sensor malfunction",
    description:
      "Flow sensor readings fluctuate during volume-controlled ventilation and the device raises intermittent flow alarms.",
    priority: "CRITICAL",
    status: "ASSIGNED",
  });

  const mriComplaint = await Complaint.create({
    complaintId: "CMP-2026-0045",
    equipmentId: mri._id,
    departmentId: radiology._id,
    reportedBy: staff._id,
    assignedEngineerId: engineer._id,
    title: "MRI image quality degradation on T2 sequences",
    description:
      "Radiographers report visible banding and signal loss on T2 weighted sequences across multiple patients.",
    priority: "CRITICAL",
    status: "ASSIGNED",
  });

  /* ------------------------------ Work orders ----------------------------- */
  const wo4472 = await WorkOrder.create({
    workOrderId: "WO-4472",
    title: "Ventilator flow sensor replacement",
    equipmentId: ventilator._id,
    complaintId: ventComplaint._id,
    departmentId: icu._id,
    engineerId: engineer._id,
    maintenanceType: "CORRECTIVE",
    priority: "CRITICAL",
    status: "ASSIGNED",
    scheduledDate: new Date(),
    description: "Replace the proximal flow sensor and re-verify ventilation performance.",
    createdBy: admin._id,
  });
  ventComplaint.workOrderId = wo4472._id;
  await ventComplaint.save();

  const wo0112 = await WorkOrder.create({
    workOrderId: "WO-2026-0112",
    title: "MRI gradient calibration and coil inspection",
    equipmentId: mri._id,
    complaintId: mriComplaint._id,
    departmentId: radiology._id,
    engineerId: engineer._id,
    maintenanceType: "CALIBRATION",
    priority: "CRITICAL",
    status: "ASSIGNED",
    scheduledDate: new Date(),
    createdBy: admin._id,
  });
  mriComplaint.workOrderId = wo0112._id;
  await mriComplaint.save();

  await WorkOrder.create({
    workOrderId: "WO-2026-0096",
    title: "Preventive maintenance — patient monitor",
    equipmentId: monitor._id,
    departmentId: cardiology._id,
    engineerId: engineer._id,
    maintenanceType: "PREVENTIVE",
    priority: "MEDIUM",
    status: "ASSIGNED",
    scheduledDate: new Date(Date.now() + 3 * 86_400_000),
    createdBy: admin._id,
  });

  /* ------------------------------ Audit trail ----------------------------- */
  await AuditLog.create([
    {
      userId: admin._id,
      userName: admin.name,
      role: admin.role,
      action: "EQUIPMENT_CREATED",
      module: "Equipment",
      recordId: ventilator.equipmentId,
      equipmentId: ventilator._id,
      description: "EQ-2210 registered in the asset register",
    },
    {
      userId: staff._id,
      userName: staff.name,
      role: staff.role,
      action: "COMPLAINT_CREATED",
      module: "Complaint",
      recordId: ventComplaint.complaintId,
      equipmentId: ventilator._id,
      newStatus: "OPEN",
      description: "Ventilator flow sensor malfunction reported",
    },
    {
      userId: admin._id,
      userName: admin.name,
      role: admin.role,
      action: "WORK_ORDER_CREATED",
      module: "WorkOrder",
      recordId: wo4472.workOrderId,
      equipmentId: ventilator._id,
      workOrderId: wo4472._id,
      description: "WO-4472 raised and assigned to Daniel Okafor",
    },
  ]);

  console.log(`[seed] done. Demo password: ${DEMO_PASSWORD}`);
  console.log("[seed] accounts: emilia.greene@ (admin) · daniel.okafor@ (engineer) · clara.whitfield@ (staff)");
  await mongoose.disconnect();
}

run().catch(async (err) => {
  console.error("[seed] failed:", err);
  await mongoose.disconnect();
  process.exit(1);
});
