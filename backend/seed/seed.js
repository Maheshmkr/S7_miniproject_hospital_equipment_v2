/**
 * Deterministic Seed for Medixa Hospital Equipment Asset Lifecycle Management System.
 *
 * Baseline:
 *   • ONE Department: ICU
 *   • ONE Equipment: EQ-1001 "Hamilton C6 ICU Ventilator" (Category: Ventilator, Status: OPERATIONAL)
 *   • THREE Users:
 *       1. Emilia Greene (ADMINISTRATOR)
 *       2. Daniel Okafor (BIOMEDICAL_ENGINEER)
 *       3. Clara Whitfield (DEPARTMENT_STAFF)
 *   • Checklist Template for category "Ventilator" with question:
 *       "Is the flow sensor functioning correctly?" (required, CRITICAL, PASS_FAIL)
 *   • ZERO old complaints, work orders, maintenance tasks, checklist responses.
 */
import "dotenv/config";
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

export async function seedDatabase() {
  await connectDB();
  console.log("[seed] clearing all operational and asset collections…");
  await Promise.all([
    User.deleteMany({}),
    Department.deleteMany({}),
    Equipment.deleteMany({}),
    Complaint.deleteMany({}),
    WorkOrder.deleteMany({}),
    Warranty.deleteMany({}),
    ChecklistTemplate.deleteMany({}),
    ChecklistQuestion.deleteMany({}),
    Maintenance.deleteMany({}),
    ChecklistResponse.deleteMany({}),
    Investigation.deleteMany({}),
    Evidence.deleteMany({}),
    ServiceReport.deleteMany({}),
    AuditLog.deleteMany({}),
    AuditInstance.deleteMany({}),
    AuditTemplate.deleteMany({}),
  ]);

  /* ------------------------------ Exactly ONE Department ----------------------------- */
  const icu = await Department.create({
    code: "ICU",
    name: "ICU",
    building: "Tower B",
    floor: "Level 4",
    headName: "Dr. Peter Han",
    contactEmail: "icu@medixa.health",
    contactPhone: "+1 (555) 201-1002",
  });
  console.log(`[seed] Created 1 department: ${icu.name} (${icu._id})`);

  /* -------------------------------- Exactly THREE Users -------------------------------- */
  const hash = await User.hashPassword(DEMO_PASSWORD);
  const [admin, engineer, staff] = await User.create([
    {
      name: "Emilia Greene",
      email: "emilia.greene@medixa.health",
      passwordHash: hash,
      role: "ADMINISTRATOR",
      title: "Administrator",
      initials: "EG",
      employeeId: "EMP-0001",
      phone: "+1 (555) 010-0001",
      departmentId: icu._id,
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
      title: "ICU Department Coordinator",
      initials: "CW",
      employeeId: "EMP-0118",
      phone: "+1 (555) 010-0118",
      departmentId: icu._id,
      status: "ACTIVE",
    },
  ]);
  console.log(`[seed] Created 3 users: admin (${admin.email}), engineer (${engineer.email}), staff (${staff.email})`);

  /* ------------------------------- Exactly ONE Equipment ------------------------------ */
  const ventilator = await Equipment.create({
    equipmentId: "EQ-1001",
    name: "Hamilton C6 ICU Ventilator",
    category: "Ventilator",
    manufacturer: "Hamilton Medical",
    model: "HAMILTON-C6",
    serialNumber: "SN-C6-100100",
    departmentId: icu._id,
    location: "ICU · Bed 1",
    status: "OPERATIONAL",
    criticality: "CRITICAL",
    healthScore: 100,
    purchaseDate: new Date("2024-01-15"),
    installationDate: new Date("2024-02-01"),
    cost: "$38,500",
    createdBy: admin._id,
  });
  console.log(`[seed] Created 1 equipment: ${ventilator.equipmentId} - ${ventilator.name} (${ventilator.status})`);

  /* ------------------- Checklist configuration for Ventilator ------------------ */
  const ventilatorTemplate = await ChecklistTemplate.create({
    name: "Ventilator Maintenance Checklist",
    equipmentCategory: "Ventilator",
    maintenanceType: "ALL",
    version: "1.0",
    active: true,
    createdBy: admin._id,
  });

  const question = await ChecklistQuestion.create({
    templateId: ventilatorTemplate._id,
    order: 1,
    question: "Is the flow sensor functioning correctly?",
    helpText: "Inspect proximal flow sensor calibration, membrane integrity and baseline flow curve.",
    responseType: "PASS_FAIL",
    priority: "CRITICAL",
    required: true,
    active: true,
  });

  console.log(`[seed] Created checklist template with question: "${question.question}"`);
  console.log("[seed] Deterministic database reset completed successfully!");

  return { icu, admin, engineer, staff, ventilator, ventilatorTemplate, question };
}

if (process.argv[1]?.endsWith("seed.js")) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("[seed] error:", err);
      process.exit(1);
    });
}
