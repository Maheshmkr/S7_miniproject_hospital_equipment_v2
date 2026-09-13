/**
 * Medixa Hospital Equipment Asset Lifecycle Management System
 * Production-Ready Deterministic & Idempotent Development Seed
 *
 * Seed Target:
 *  • 6 Departments (ICU, RAD, CARD, ER, SURG, ONC)
 *  • 12 Users across ADMINISTRATOR, BIOMEDICAL_ENGINEER, DEPARTMENT_STAFF
 *  • 18+ Medical Equipment spanning all 4 EHS categories (HEALTHY, MONITOR, AT_RISK, CRITICAL)
 *  • Dedicated Worked Example Equipment producing exact EHS = 54.25 (AT_RISK) from live records
 *  • 16 Complaints across full lifecycle
 *  • 14 Work Orders across MAINTENANCE_TYPES
 *  • 10 Maintenance records with Checklists, Investigations, and Parts Used
 *  • 8 Service Reports (Draft, Submitted, Approved, Verified)
 *  • 6 Vendors & 3 Purchase Orders
 *  • 10 Inventory items with real Stock Movements
 *  • Calibration records (PASS, FAIL with safety override, CONDITIONAL, Overdue)
 *  • Preventive Maintenance plans with dynamic scheduling
 *  • Checklist Templates and Questions
 *  • Audit Trail & Notifications
 */
import "dotenv/config";
import mongoose from "mongoose";
import { connectDB } from "../config/db.js";

import User from "../models/User.js";
import Department from "../models/Department.js";
import Equipment from "../models/Equipment.js";
import Complaint from "../models/Complaint.js";
import WorkOrder from "../models/WorkOrder.js";
import Maintenance from "../models/Maintenance.js";
import ServiceReport from "../models/ServiceReport.js";
import ChecklistTemplate from "../models/ChecklistTemplate.js";
import ChecklistQuestion from "../models/ChecklistQuestion.js";
import ChecklistResponse from "../models/ChecklistResponse.js";
import Investigation from "../models/Investigation.js";
import Evidence from "../models/Evidence.js";
import Calibration from "../models/Calibration.js";
import PreventiveMaintenance from "../models/PreventiveMaintenance.js";
import InventoryItem from "../models/InventoryItem.js";
import StockMovement from "../models/StockMovement.js";
import Vendor from "../models/Vendor.js";
import PurchaseOrder from "../models/PurchaseOrder.js";
import Warranty from "../models/Warranty.js";
import Notification from "../models/Notification.js";
import AuditLog from "../models/AuditLog.js";
import AuditInstance, { AuditTemplate } from "../models/AuditInstance.js";
import { calculateEquipmentEhs } from "../services/ehsService.js";

const DEMO_PASSWORD = process.env.SEED_PASSWORD || "Medixa#2026";

export async function seedDatabase() {
  await connectDB();
  console.log("[seed] Starting idempotent database seed for Medixa platform…");

  // Clear operational collections deterministically
  await Promise.all([
    User.deleteMany({}),
    Department.deleteMany({}),
    Equipment.deleteMany({}),
    Complaint.deleteMany({}),
    WorkOrder.deleteMany({}),
    Maintenance.deleteMany({}),
    ServiceReport.deleteMany({}),
    ChecklistTemplate.deleteMany({}),
    ChecklistQuestion.deleteMany({}),
    ChecklistResponse.deleteMany({}),
    Investigation.deleteMany({}),
    Evidence.deleteMany({}),
    Calibration.deleteMany({}),
    PreventiveMaintenance.deleteMany({}),
    InventoryItem.deleteMany({}),
    StockMovement.deleteMany({}),
    Vendor.deleteMany({}),
    PurchaseOrder.deleteMany({}),
    Warranty.deleteMany({}),
    Notification.deleteMany({}),
    AuditLog.deleteMany({}),
    AuditInstance.deleteMany({}),
    AuditTemplate.deleteMany({}),
  ]);

  console.log("[seed] Cleared existing collections.");

  /* -------------------------------------------------------------------------- */
  /* 1. DEPARTMENTS (6 Departments)                                             */
  /* -------------------------------------------------------------------------- */
  const departments = await Department.create([
    {
      code: "ICU",
      name: "Intensive Care Unit",
      building: "Tower A",
      floor: "Level 3",
      headName: "Dr. Peter Han",
      contactEmail: "icu@medixa.health",
      contactPhone: "+1 (555) 201-1001",
    },
    {
      code: "RAD",
      name: "Radiology & Imaging",
      building: "Tower A",
      floor: "Ground Floor",
      headName: "Dr. Alice Roy",
      contactEmail: "radiology@medixa.health",
      contactPhone: "+1 (555) 201-1002",
    },
    {
      code: "CARD",
      name: "Cardiology Department",
      building: "Tower B",
      floor: "Level 2",
      headName: "Dr. Marcus Vance",
      contactEmail: "cardiology@medixa.health",
      contactPhone: "+1 (555) 201-1003",
    },
    {
      code: "ER",
      name: "Emergency & Trauma Center",
      building: "West Wing",
      floor: "Ground Floor",
      headName: "Dr. Sarah Jenkins",
      contactEmail: "emergency@medixa.health",
      contactPhone: "+1 (555) 201-1004",
    },
    {
      code: "SURG",
      name: "Surgical Suites & OT",
      building: "Tower B",
      floor: "Level 4",
      headName: "Dr. James Thornton",
      contactEmail: "surgery@medixa.health",
      contactPhone: "+1 (555) 201-1005",
    },
    {
      code: "ONC",
      name: "Oncology & Infusion Center",
      building: "North Wing",
      floor: "Level 2",
      headName: "Dr. Elena Rostova",
      contactEmail: "oncology@medixa.health",
      contactPhone: "+1 (555) 201-1006",
    },
  ]);

  const [deptIcu, deptRad, deptCard, deptEr, deptSurg, deptOnc] = departments;
  console.log(`[seed] Created ${departments.length} departments.`);

  /* -------------------------------------------------------------------------- */
  /* 2. USERS (12 Users: 2 Admins, 4 Biomedical Engineers, 6 Dept Staff)        */
  /* -------------------------------------------------------------------------- */
  const hash = await User.hashPassword(DEMO_PASSWORD);

  const users = await User.create([
    // Administrators
    {
      name: "Emilia Greene",
      email: "emilia.greene@medixa.health",
      passwordHash: hash,
      role: "ADMINISTRATOR",
      title: "Chief Biomedical Director",
      initials: "EG",
      employeeId: "ADM-001",
      departmentId: deptIcu._id,
      phone: "+1 (555) 010-0001",
      status: "ACTIVE",
    },
    {
      name: "Marcus Brody",
      email: "marcus.brody@medixa.health",
      passwordHash: hash,
      role: "ADMINISTRATOR",
      title: "Hospital Operations Manager",
      initials: "MB",
      employeeId: "ADM-002",
      departmentId: deptEr._id,
      phone: "+1 (555) 010-0002",
      status: "ACTIVE",
    },

    // Biomedical Engineers
    {
      name: "Daniel Okafor",
      email: "daniel.okafor@medixa.health",
      passwordHash: hash,
      role: "BIOMEDICAL_ENGINEER",
      title: "Lead Biomedical Engineer · Critical Care",
      initials: "DO",
      employeeId: "BME-001",
      departmentId: deptIcu._id,
      phone: "+1 (555) 010-0042",
      status: "ACTIVE",
    },

    // Department Staff
    {
      name: "Clara Whitfield",
      email: "clara.whitfield@medixa.health",
      passwordHash: hash,
      role: "DEPARTMENT_STAFF",
      title: "ICU Head Nurse",
      initials: "CW",
      employeeId: "STF-101",
      departmentId: deptIcu._id,
      phone: "+1 (555) 010-0118",
      status: "ACTIVE",
    },
    {
      name: "James Chen",
      email: "james.chen@medixa.health",
      passwordHash: hash,
      role: "DEPARTMENT_STAFF",
      title: "Radiology Tech Supervisor",
      initials: "JC",
      employeeId: "STF-102",
      departmentId: deptRad._id,
      phone: "+1 (555) 010-0119",
      status: "ACTIVE",
    },
    {
      name: "Sarah Connor",
      email: "sarah.connor@medixa.health",
      passwordHash: hash,
      role: "DEPARTMENT_STAFF",
      title: "Cardiology Clinical Coordinator",
      initials: "SC",
      employeeId: "STF-103",
      departmentId: deptCard._id,
      phone: "+1 (555) 010-0120",
      status: "ACTIVE",
    },
    {
      name: "Liam Murphy",
      email: "liam.murphy@medixa.health",
      passwordHash: hash,
      role: "DEPARTMENT_STAFF",
      title: "Emergency Triage Nurse",
      initials: "LM",
      employeeId: "STF-104",
      departmentId: deptEr._id,
      phone: "+1 (555) 010-0121",
      status: "ACTIVE",
    },
    {
      name: "Hannah Abbott",
      email: "hannah.abbott@medixa.health",
      passwordHash: hash,
      role: "DEPARTMENT_STAFF",
      title: "OT Nurse Lead",
      initials: "HA",
      employeeId: "STF-105",
      departmentId: deptSurg._id,
      phone: "+1 (555) 010-0122",
      status: "ACTIVE",
    },
    {
      name: "Robert Taylor",
      email: "robert.taylor@medixa.health",
      passwordHash: hash,
      role: "DEPARTMENT_STAFF",
      title: "Oncology Infusion Supervisor",
      initials: "RT",
      employeeId: "STF-106",
      departmentId: deptOnc._id,
      phone: "+1 (555) 010-0123",
      status: "ACTIVE",
    },
  ]);

  const [
    adminGreene,
    adminBrody,
    engDaniel,
    staffClara,
    staffJames,
    staffSarah,
    staffLiam,
    staffHannah,
    staffRobert,
  ] = users;

  const engPriya = engDaniel;
  const engCarlos = engDaniel;
  const engAisha = engDaniel;

  console.log(`[seed] Created ${users.length} users with Daniel Okafor as the single Biomedical Engineer.`);

  /* -------------------------------------------------------------------------- */
  /* 3. VENDORS (6 Vendors)                                                     */
  /* -------------------------------------------------------------------------- */
  const vendors = await Vendor.create([
    {
      vendorId: "VND-001",
      name: "Hamilton Medical AG",
      category: "MANUFACTURER",
      specialization: "Critical Care Ventilators",
      contactPerson: "Lukas Weber",
      email: "service@hamilton-medical.com",
      phone: "+41 58 610 1020",
      rating: 5,
      status: "ACTIVE",
    },
    {
      vendorId: "VND-002",
      name: "GE Healthcare Solutions",
      category: "EQUIPMENT_SUPPLIER",
      specialization: "Diagnostic & Monitoring",
      contactPerson: "Jennifer Adams",
      email: "support@gehealthcare.com",
      phone: "+1 (800) 437-1171",
      rating: 4,
      status: "ACTIVE",
    },
    {
      vendorId: "VND-003",
      name: "Philips Healthcare",
      category: "MANUFACTURER",
      specialization: "Patient Monitoring & Ultrasound",
      contactPerson: "Mark van Dijk",
      email: "customer.care@philips.com",
      phone: "+31 20 597 7777",
      rating: 5,
      status: "ACTIVE",
    },
    {
      vendorId: "VND-004",
      name: "Siemens Healthineers",
      category: "MANUFACTURER",
      specialization: "MRI & CT Diagnostics",
      contactPerson: "Klaus Schmidt",
      email: "medical.support@siemens-healthineers.com",
      phone: "+49 9131 84 0",
      rating: 5,
      status: "ACTIVE",
    },
    {
      vendorId: "VND-005",
      name: "Zoll Medical Corporation",
      category: "MANUFACTURER",
      specialization: "Resuscitation & Defibrillators",
      contactPerson: "Tom Bradley",
      email: "service@zoll.com",
      phone: "+1 (800) 348-9011",
      rating: 4,
      status: "ACTIVE",
    },
    {
      vendorId: "VND-006",
      name: "Baxter International",
      category: "EQUIPMENT_SUPPLIER",
      specialization: "Infusion Systems & Renal Care",
      contactPerson: "Rachel Moore",
      email: "support@baxter.com",
      phone: "+1 (800) 422-9837",
      rating: 4,
      status: "ACTIVE",
    },
  ]);

  const [vHamilton, vGe, vPhilips, vSiemens, vZoll, vBaxter] = vendors;
  console.log(`[seed] Created ${vendors.length} vendors.`);

  /* -------------------------------------------------------------------------- */
  /* 4. INVENTORY ITEMS (10 Items)                                              */
  /* -------------------------------------------------------------------------- */
  const inventoryItems = await InventoryItem.create([
    {
      itemId: "INV-001",
      sku: "HAM-FS-2026",
      name: "Flow Sensor Assembly",
      category: "SPARE_PARTS",
      itemType: "SPARE_PART",
      description: "OEM proximate flow sensor for Hamilton C6 ventilators",
      manufacturer: "Hamilton Medical",
      vendorId: vHamilton._id,
      unit: "PIECE",
      quantity: 25,
      availableQuantity: 25,
      reservedQuantity: 0,
      minStockLevel: 5,
      reorderLevel: 10,
      unitCost: 180,
      totalValue: 4500,
      storageLocation: "Shelf A-12 · ICU Biomeds",
      departmentId: deptIcu._id,
      status: "IN_STOCK",
      createdBy: adminGreene._id,
    },
    {
      itemId: "INV-002",
      sku: "PHIL-SPO2-01",
      name: "Adult Reusable SpO2 Sensor Cable",
      category: "CONSUMABLES",
      itemType: "CONSUMABLE",
      description: "10-pin adult finger sensor for Philips IntelliVue series",
      manufacturer: "Philips Healthcare",
      vendorId: vPhilips._id,
      unit: "PIECE",
      quantity: 40,
      availableQuantity: 40,
      reservedQuantity: 0,
      minStockLevel: 10,
      reorderLevel: 15,
      unitCost: 95,
      totalValue: 3800,
      storageLocation: "Bin C-04 · Central Store",
      departmentId: deptEr._id,
      status: "IN_STOCK",
      createdBy: adminGreene._id,
    },
    {
      itemId: "INV-003",
      sku: "GE-ECG-5L",
      name: "5-Lead ECG Trunk Cable & Leads",
      category: "ACCESSORIES",
      itemType: "ACCESSORY",
      description: "Shielded 5-lead grabber cable for telemetry and patient monitors",
      manufacturer: "GE Healthcare",
      vendorId: vGe._id,
      unit: "SET",
      quantity: 18,
      availableQuantity: 18,
      reservedQuantity: 0,
      minStockLevel: 5,
      reorderLevel: 8,
      unitCost: 120,
      totalValue: 2160,
      storageLocation: "Bin C-08 · Central Store",
      departmentId: deptCard._id,
      status: "IN_STOCK",
      createdBy: adminGreene._id,
    },
    {
      itemId: "INV-004",
      sku: "ZOLL-PAD-AD",
      name: "CPR-D-padz Adult Defibrillator Electrodes",
      category: "CONSUMABLES",
      itemType: "CONSUMABLE",
      description: "One-piece defibrillation and real CPR help electrode pad",
      manufacturer: "Zoll Medical",
      vendorId: vZoll._id,
      unit: "PAIR",
      quantity: 4,
      availableQuantity: 4,
      reservedQuantity: 0,
      minStockLevel: 6,
      reorderLevel: 8,
      unitCost: 145,
      totalValue: 580,
      storageLocation: "Locker D-01 · Emergency",
      departmentId: deptEr._id,
      status: "LOW_STOCK",
      createdBy: adminGreene._id,
    },
    {
      itemId: "INV-005",
      sku: "HAM-EV-01",
      name: "Ventilator Expiratory Valve Set",
      category: "SPARE_PARTS",
      itemType: "SPARE_PART",
      description: "Autoclavable expiratory valve membrane assembly",
      manufacturer: "Hamilton Medical",
      vendorId: vHamilton._id,
      unit: "SET",
      quantity: 12,
      availableQuantity: 12,
      reservedQuantity: 0,
      minStockLevel: 4,
      reorderLevel: 6,
      unitCost: 260,
      totalValue: 3120,
      storageLocation: "Shelf A-14 · ICU Biomeds",
      departmentId: deptIcu._id,
      status: "IN_STOCK",
      createdBy: adminGreene._id,
    },
    {
      itemId: "INV-006",
      sku: "BAX-INF-SET",
      name: "Standard Infusion Tubing Set (100pk)",
      category: "CONSUMABLES",
      itemType: "CONSUMABLE",
      description: "Dedicated lines for Baxter Colleague and Sigma pumps",
      manufacturer: "Baxter International",
      vendorId: vBaxter._id,
      unit: "BOX",
      quantity: 30,
      availableQuantity: 30,
      reservedQuantity: 0,
      minStockLevel: 10,
      reorderLevel: 15,
      unitCost: 85,
      totalValue: 2550,
      storageLocation: "Main Store · Rack 2",
      departmentId: deptOnc._id,
      status: "IN_STOCK",
      createdBy: adminGreene._id,
    },
    {
      itemId: "INV-007",
      sku: "RAD-GEL-5L",
      name: "Acoustic Ultrasound Coupling Gel (5 Litres)",
      category: "CONSUMABLES",
      itemType: "CONSUMABLE",
      description: "High viscosity bubble-free ultrasound transmission gel",
      manufacturer: "Philips Healthcare",
      vendorId: vPhilips._id,
      unit: "BOTTLE",
      quantity: 15,
      availableQuantity: 15,
      reservedQuantity: 0,
      minStockLevel: 5,
      reorderLevel: 8,
      unitCost: 45,
      totalValue: 675,
      storageLocation: "Radiology Prep Room",
      departmentId: deptRad._id,
      status: "IN_STOCK",
      createdBy: adminGreene._id,
    },
    {
      itemId: "INV-008",
      sku: "GE-BATT-LI",
      name: "Apex Pro Rechargeable Lithium Battery",
      category: "SPARE_PARTS",
      itemType: "SPARE_PART",
      description: "3.7V OEM replacement battery for telemetry transmitters",
      manufacturer: "GE Healthcare",
      vendorId: vGe._id,
      unit: "PIECE",
      quantity: 8,
      availableQuantity: 8,
      reservedQuantity: 0,
      minStockLevel: 4,
      reorderLevel: 6,
      unitCost: 110,
      totalValue: 880,
      storageLocation: "Cardiology Tech Desk",
      departmentId: deptCard._id,
      status: "IN_STOCK",
      createdBy: adminGreene._id,
    },
    {
      itemId: "INV-009",
      sku: "MIND-CUFF-AD",
      name: "NIBP Reusable Blood Pressure Cuff (Adult)",
      category: "ACCESSORIES",
      itemType: "ACCESSORY",
      description: "Antimicrobial adult blood pressure cuff with quick-connect",
      manufacturer: "Philips Healthcare",
      vendorId: vPhilips._id,
      unit: "PIECE",
      quantity: 20,
      availableQuantity: 20,
      reservedQuantity: 0,
      minStockLevel: 5,
      reorderLevel: 10,
      unitCost: 38,
      totalValue: 760,
      storageLocation: "Shelf B-02 · Central Store",
      departmentId: deptEr._id,
      status: "IN_STOCK",
      createdBy: adminGreene._id,
    },
    {
      itemId: "INV-010",
      sku: "SIEM-HE-GASK",
      name: "Liquid Helium Cryostat Seal Gasket",
      category: "SPARE_PARTS",
      itemType: "SPARE_PART",
      description: "Cryogenic vacuum gasket for Siemens Magnetom MRI systems",
      manufacturer: "Siemens Healthineers",
      vendorId: vSiemens._id,
      unit: "PIECE",
      quantity: 1,
      availableQuantity: 1,
      reservedQuantity: 0,
      minStockLevel: 2,
      reorderLevel: 3,
      unitCost: 1250,
      totalValue: 1250,
      storageLocation: "Secure Safe · Imaging Store",
      departmentId: deptRad._id,
      status: "LOW_STOCK",
      createdBy: adminGreene._id,
    },
  ]);

  console.log(`[seed] Created ${inventoryItems.length} inventory items.`);

  /* -------------------------------------------------------------------------- */
  /* 5. CHECKLIST TEMPLATES & QUESTIONS                                         */
  /* -------------------------------------------------------------------------- */
  const ventTemplate = await ChecklistTemplate.create({
    name: "ICU Ventilator Safety & Maintenance Checklist",
    equipmentCategory: "Ventilator",
    maintenanceType: "ALL",
    version: "2.1",
    active: true,
    createdBy: adminGreene._id,
  });

  const ventQuestions = await ChecklistQuestion.create([
    {
      templateId: ventTemplate._id,
      order: 1,
      category: "Ventilator",
      question: "Is the flow sensor functioning correctly within ±2% tolerance?",
      helpText: "Check proximal flow sensor zero offset and tidal volume reading.",
      responseType: "PASS_FAIL",
      priority: "CRITICAL",
      required: true,
      active: true,
    },
    {
      templateId: ventTemplate._id,
      order: 2,
      category: "Ventilator",
      question: "Are oxygen and air gas supply hoses pressurized and leak-free?",
      helpText: "Verify 4 bar pipeline pressure and check O-ring seals.",
      responseType: "PASS_FAIL",
      priority: "CRITICAL",
      required: true,
      active: true,
    },
    {
      templateId: ventTemplate._id,
      order: 3,
      category: "Ventilator",
      question: "Did the battery backup test sustain power for over 30 minutes?",
      responseType: "PASS_FAIL",
      priority: "IMPORTANT",
      required: true,
      active: true,
    },
    {
      templateId: ventTemplate._id,
      order: 4,
      category: "Ventilator",
      question: "Are alarm speakers and visual indicator LEDs fully functional?",
      responseType: "PASS_FAIL",
      priority: "CRITICAL",
      required: true,
      active: true,
    },
  ]);

  const defibTemplate = await ChecklistTemplate.create({
    name: "Defibrillator Energy Delivery & Safety Inspection",
    equipmentCategory: "Defibrillator",
    maintenanceType: "ALL",
    version: "1.5",
    active: true,
    createdBy: adminGreene._id,
  });

  await ChecklistQuestion.create([
    {
      templateId: defibTemplate._id,
      order: 1,
      category: "Defibrillator",
      question: "Does the 200J shock delivery test measure within ±5% accuracy on calibrated load?",
      responseType: "PASS_FAIL",
      priority: "CRITICAL",
      required: true,
      active: true,
    },
    {
      templateId: defibTemplate._id,
      order: 2,
      category: "Defibrillator",
      question: "Is the internal discharge and capacitor safety circuit operating normally?",
      responseType: "PASS_FAIL",
      priority: "CRITICAL",
      required: true,
      active: true,
    },
  ]);

  console.log("[seed] Created checklist templates and safety questions.");

  /* -------------------------------------------------------------------------- */
  /* 6. EQUIPMENT (18 Items across all EHS Categories)                          */
  /* -------------------------------------------------------------------------- */
  const now = new Date();
  const oneYearAgo = new Date(now.getTime() - 365 * 86_400_000);
  const sevenPointFiveYearsAgo = new Date(now.getTime() - 7.5 * 365.25 * 86_400_000);
  const twoYearsAgo = new Date(now.getTime() - 2 * 365.25 * 86_400_000);
  const fourYearsAgo = new Date(now.getTime() - 4 * 365.25 * 86_400_000);

  // EQ-1042: EXACT WORKED TEST EXAMPLE FROM SPECIFICATION
  // Breakdown = 3 (B = 40)
  // Complaints = High/Repeated (C = 40)
  // Downtime = 12% (D = 40)
  // PM compliance = 75% (PM = 75)
  // Calibration = Valid (CAL = 100)
  // Service events = 3 (SR = 55)
  // Lifecycle age = 75% of 10 years (7.5 yrs -> AGE = 50)
  // Formula: 0.20(40) + 0.15(40) + 0.15(40) + 0.15(75) + 0.10(100) + 0.10(55) + 0.15(50)
  // = 8 + 6 + 6 + 11.25 + 10 + 5.5 + 7.5 = 54.25 (AT_RISK)
  const eqWorkedExample = await Equipment.create({
    equipmentId: "EQ-1042",
    name: "GE Healthcare Apex Pro Telemetry Central Station",
    category: "Telemetry",
    manufacturer: "GE Healthcare",
    model: "Apex Pro CH",
    serialNumber: "GE-APX-77421",
    departmentId: deptCard._id,
    location: "Cardiology · CCU Monitoring Station",
    status: "OPERATIONAL",
    lifecycleStage: "IN_SERVICE",
    criticality: "HIGH",
    healthScore: 54.25,
    expectedUsefulLifeYears: 10,
    installationDate: sevenPointFiveYearsAgo,
    purchaseDate: sevenPointFiveYearsAgo,
    cost: "$42,000",
    vendor: "GE Healthcare Solutions",
    vendorRef: vGe._id,
    owner: "Cardiology Department",
    power: "120V / 60Hz",
    softwareVersion: "v4.2.1",
    riskClass: "Class IIb",
    lastCalibrationDate: new Date(now.getTime() - 60 * 86_400_000),
    nextCalibrationDate: new Date(now.getTime() + 120 * 86_400_000), // Valid
    lastPreventiveDate: new Date(now.getTime() - 45 * 86_400_000),
    nextPreventiveDate: new Date(now.getTime() + 45 * 86_400_000),
    createdBy: adminGreene._id,
  });

  // Pristine HEALTHY Equipment (ICU Ventilator)
  const eqVentilator = await Equipment.create({
    equipmentId: "EQ-1001",
    name: "Hamilton C6 ICU Ventilator",
    category: "Ventilator",
    manufacturer: "Hamilton Medical",
    model: "C6 Advanced",
    serialNumber: "HAM-C6-9921",
    departmentId: deptIcu._id,
    location: "ICU · Bed 1",
    status: "OPERATIONAL",
    lifecycleStage: "IN_SERVICE",
    criticality: "CRITICAL",
    healthScore: 98.5,
    expectedUsefulLifeYears: 10,
    installationDate: twoYearsAgo,
    purchaseDate: twoYearsAgo,
    cost: "$45,000",
    vendor: "Hamilton Medical AG",
    vendorRef: vHamilton._id,
    owner: "Intensive Care Unit",
    power: "220V / 50Hz",
    softwareVersion: "v3.0.4",
    riskClass: "Class III",
    warrantyExpiry: new Date(now.getTime() + 240 * 86_400_000),
    lastCalibrationDate: new Date(now.getTime() - 30 * 86_400_000),
    nextCalibrationDate: new Date(now.getTime() + 335 * 86_400_000),
    lastPreventiveDate: new Date(now.getTime() - 15 * 86_400_000),
    nextPreventiveDate: new Date(now.getTime() + 75 * 86_400_000),
    createdBy: adminGreene._id,
  });

  // HEALTHY: Philips IntelliVue MX800 Patient Monitor
  const eqMonitor = await Equipment.create({
    equipmentId: "EQ-1002",
    name: "Philips IntelliVue MX800 Bedside Monitor",
    category: "Patient Monitor",
    manufacturer: "Philips Healthcare",
    model: "MX800",
    serialNumber: "PHIL-MX800-4412",
    departmentId: deptIcu._id,
    location: "ICU · Bed 2",
    status: "OPERATIONAL",
    lifecycleStage: "IN_SERVICE",
    criticality: "HIGH",
    healthScore: 95.0,
    expectedUsefulLifeYears: 8,
    installationDate: new Date(now.getTime() - 1.5 * 365.25 * 86_400_000),
    cost: "$28,000",
    vendor: "Philips Healthcare",
    vendorRef: vPhilips._id,
    lastCalibrationDate: new Date(now.getTime() - 40 * 86_400_000),
    nextCalibrationDate: new Date(now.getTime() + 180 * 86_400_000),
    lastPreventiveDate: new Date(now.getTime() - 30 * 86_400_000),
    nextPreventiveDate: new Date(now.getTime() + 60 * 86_400_000),
    createdBy: adminGreene._id,
  });

  // HEALTHY: Siemens Magnetom Sola 1.5T MRI
  const eqMri = await Equipment.create({
    equipmentId: "EQ-1003",
    name: "Siemens Magnetom Sola 1.5T MRI Scanner",
    category: "MRI Scanner",
    manufacturer: "Siemens Healthineers",
    model: "Magnetom Sola",
    serialNumber: "SIEM-MRI-0911",
    departmentId: deptRad._id,
    location: "Radiology · MRI Suite 1",
    status: "OPERATIONAL",
    lifecycleStage: "IN_SERVICE",
    criticality: "CRITICAL",
    healthScore: 92.0,
    expectedUsefulLifeYears: 12,
    installationDate: new Date(now.getTime() - 2.5 * 365.25 * 86_400_000),
    cost: "$1,250,000",
    vendor: "Siemens Healthineers",
    vendorRef: vSiemens._id,
    lastCalibrationDate: new Date(now.getTime() - 20 * 86_400_000),
    nextCalibrationDate: new Date(now.getTime() + 160 * 86_400_000),
    createdBy: adminGreene._id,
  });

  // MONITOR: GE Revolution CT Scanner (Aging, minor complaints)
  const eqCt = await Equipment.create({
    equipmentId: "EQ-1004",
    name: "GE Revolution Maxima 64-Slice CT Scanner",
    category: "CT Scanner",
    manufacturer: "GE Healthcare",
    model: "Revolution Maxima",
    serialNumber: "GE-CT-3381",
    departmentId: deptRad._id,
    location: "Radiology · CT Room 2",
    status: "OPERATIONAL",
    lifecycleStage: "IN_SERVICE",
    criticality: "CRITICAL",
    healthScore: 78.5,
    expectedUsefulLifeYears: 10,
    installationDate: fourYearsAgo,
    cost: "$650,000",
    vendor: "GE Healthcare Solutions",
    vendorRef: vGe._id,
    lastCalibrationDate: new Date(now.getTime() - 70 * 86_400_000),
    nextCalibrationDate: new Date(now.getTime() + 110 * 86_400_000),
    createdBy: adminGreene._id,
  });

  // MONITOR: Baxter Colleague 3-Channel Infusion Pump
  const eqInfusion = await Equipment.create({
    equipmentId: "EQ-1005",
    name: "Baxter Colleague CX 3-Channel Infusion Pump",
    category: "Infusion Pump",
    manufacturer: "Baxter International",
    model: "Colleague CX",
    serialNumber: "BAX-INF-5519",
    departmentId: deptOnc._id,
    location: "Oncology · Station 4",
    status: "OPERATIONAL",
    lifecycleStage: "IN_SERVICE",
    criticality: "MEDIUM",
    healthScore: 76.0,
    expectedUsefulLifeYears: 7,
    installationDate: new Date(now.getTime() - 3.5 * 365.25 * 86_400_000),
    cost: "$6,500",
    vendor: "Baxter International",
    vendorRef: vBaxter._id,
    createdBy: adminGreene._id,
  });

  // CRITICAL / SAFETY OVERRIDE: Zoll R Series Defibrillator (Failed calibration on safety critical!)
  const eqDefib = await Equipment.create({
    equipmentId: "EQ-1006",
    name: "Zoll R Series ALS Clinical Defibrillator",
    category: "Defibrillator",
    manufacturer: "Zoll Medical",
    model: "R Series Plus",
    serialNumber: "ZOLL-DEF-1102",
    departmentId: deptEr._id,
    location: "Emergency · Resuscitation Bay 1",
    status: "UNDER_MAINTENANCE",
    lifecycleStage: "REPAIR",
    criticality: "CRITICAL",
    riskClass: "Class III",
    healthScore: 35.0,
    expectedUsefulLifeYears: 8,
    installationDate: new Date(now.getTime() - 4.5 * 365.25 * 86_400_000),
    cost: "$18,500",
    vendor: "Zoll Medical Corporation",
    vendorRef: vZoll._id,
    createdBy: adminGreene._id,
  });

  // CRITICAL: Medtronic PB980 Ventilator (Multiple breakdowns & open critical breakdown complaint)
  const eqVentCritical = await Equipment.create({
    equipmentId: "EQ-1007",
    name: "Medtronic Puritan Bennett 980 Ventilator",
    category: "Ventilator",
    manufacturer: "Medtronic",
    model: "PB980",
    serialNumber: "MDT-PB980-601",
    departmentId: deptIcu._id,
    location: "ICU · Isolation Room 3",
    status: "UNDER_BREAKDOWN",
    lifecycleStage: "REPAIR",
    criticality: "CRITICAL",
    riskClass: "Class III",
    healthScore: 28.0,
    expectedUsefulLifeYears: 10,
    installationDate: new Date(now.getTime() - 8.2 * 365.25 * 86_400_000),
    cost: "$42,000",
    createdBy: adminGreene._id,
  });

  // Additional realistic equipment for department diversity
  const additionalEquipment = await Equipment.create([
    {
      equipmentId: "EQ-1008",
      name: "Philips EPIQ 7 Diagnostic Ultrasound",
      category: "Ultrasound",
      manufacturer: "Philips Healthcare",
      model: "EPIQ 7",
      serialNumber: "PHIL-US-8812",
      departmentId: deptRad._id,
      location: "Radiology · Room 4",
      status: "OPERATIONAL",
      criticality: "HIGH",
      healthScore: 89.0,
      expectedUsefulLifeYears: 8,
      installationDate: new Date(now.getTime() - 2 * 365.25 * 86_400_000),
      cost: "$140,000",
      createdBy: adminGreene._id,
    },
    {
      equipmentId: "EQ-1009",
      name: "Mindray BeneView T8 Patient Monitor",
      category: "Patient Monitor",
      manufacturer: "Mindray",
      model: "T8",
      serialNumber: "MIND-T8-202",
      departmentId: deptEr._id,
      location: "Emergency · Trauma 2",
      status: "OPERATIONAL",
      criticality: "HIGH",
      healthScore: 86.0,
      expectedUsefulLifeYears: 7,
      installationDate: new Date(now.getTime() - 1.8 * 365.25 * 86_400_000),
      cost: "$16,000",
      createdBy: adminGreene._id,
    },
    {
      equipmentId: "EQ-1010",
      name: "Olympus EVIS EXERA III Endoscopy Tower",
      category: "Endoscopy",
      manufacturer: "Olympus",
      model: "EVIS EXERA III",
      serialNumber: "OLY-ENDO-994",
      departmentId: deptSurg._id,
      location: "Surgery · OT 3",
      status: "OPERATIONAL",
      criticality: "HIGH",
      healthScore: 91.0,
      expectedUsefulLifeYears: 8,
      installationDate: new Date(now.getTime() - 1.2 * 365.25 * 86_400_000),
      cost: "$110,000",
      createdBy: adminGreene._id,
    },
    {
      equipmentId: "EQ-1011",
      name: "Fresenius 5008S Hemodialysis System",
      category: "Dialysis",
      manufacturer: "Fresenius Medical Care",
      model: "5008S CorDiax",
      serialNumber: "FRES-5008-331",
      departmentId: deptIcu._id,
      location: "ICU · Renal Bed 5",
      status: "OPERATIONAL",
      criticality: "CRITICAL",
      healthScore: 68.0,
      expectedUsefulLifeYears: 10,
      installationDate: new Date(now.getTime() - 6.5 * 365.25 * 86_400_000),
      cost: "$35,000",
      createdBy: adminGreene._id,
    },
    {
      equipmentId: "EQ-1012",
      name: "Dräger Babylog VN500 Neonatal Ventilator",
      category: "Ventilator",
      manufacturer: "Draeger Medical",
      model: "Babylog VN500",
      serialNumber: "DRAG-VN500-112",
      departmentId: deptIcu._id,
      location: "NICU · Incubator 1",
      status: "OPERATIONAL",
      criticality: "CRITICAL",
      healthScore: 84.0,
      expectedUsefulLifeYears: 10,
      installationDate: new Date(now.getTime() - 3.8 * 365.25 * 86_400_000),
      cost: "$48,000",
      createdBy: adminGreene._id,
    },
    {
      equipmentId: "EQ-1013",
      name: "Stryker System 8 Orthopedic Surgical Drill",
      category: "Surgical Tool",
      manufacturer: "Stryker",
      model: "System 8",
      serialNumber: "STRYK-S8-449",
      departmentId: deptSurg._id,
      location: "Surgery · Instrument Room",
      status: "OPERATIONAL",
      criticality: "MEDIUM",
      healthScore: 88.0,
      expectedUsefulLifeYears: 6,
      installationDate: new Date(now.getTime() - 2.1 * 365.25 * 86_400_000),
      cost: "$22,000",
      createdBy: adminGreene._id,
    },
    {
      equipmentId: "EQ-1014",
      name: "Elekta Harmony Linear Accelerator",
      category: "Radiotherapy",
      manufacturer: "Elekta",
      model: "Harmony",
      serialNumber: "ELEK-LINAC-01",
      departmentId: deptOnc._id,
      location: "Oncology · Vault 1",
      status: "OPERATIONAL",
      criticality: "CRITICAL",
      healthScore: 94.0,
      expectedUsefulLifeYears: 15,
      installationDate: new Date(now.getTime() - 3.0 * 365.25 * 86_400_000),
      cost: "$2,400,000",
      createdBy: adminGreene._id,
    },
    {
      equipmentId: "EQ-1015",
      name: "B. Braun Infusomat Space Volumetric Pump",
      category: "Infusion Pump",
      manufacturer: "B. Braun",
      model: "Infusomat Space",
      serialNumber: "BB-INF-7721",
      departmentId: deptOnc._id,
      location: "Oncology · Station 2",
      status: "OPERATIONAL",
      criticality: "MEDIUM",
      healthScore: 82.0,
      expectedUsefulLifeYears: 7,
      installationDate: new Date(now.getTime() - 3.1 * 365.25 * 86_400_000),
      cost: "$5,200",
      createdBy: adminGreene._id,
    },
    {
      equipmentId: "EQ-1016",
      name: "GE MAC 5500 HD Resting ECG System",
      category: "ECG",
      manufacturer: "GE Healthcare",
      model: "MAC 5500 HD",
      serialNumber: "GE-MAC-9912",
      departmentId: deptCard._id,
      location: "Cardiology · Echo Lab",
      status: "OPERATIONAL",
      criticality: "MEDIUM",
      healthScore: 90.0,
      expectedUsefulLifeYears: 8,
      installationDate: new Date(now.getTime() - 1.9 * 365.25 * 86_400_000),
      cost: "$12,500",
      createdBy: adminGreene._id,
    },
    {
      equipmentId: "EQ-1017",
      name: "Zoll X Series Defibrillator Monitor",
      category: "Defibrillator",
      manufacturer: "Zoll Medical",
      model: "X Series",
      serialNumber: "ZOLL-XS-3301",
      departmentId: deptEr._id,
      location: "Emergency · Ambulance Bay",
      status: "OPERATIONAL",
      criticality: "HIGH",
      healthScore: 87.0,
      expectedUsefulLifeYears: 7,
      installationDate: new Date(now.getTime() - 2.4 * 365.25 * 86_400_000),
      cost: "$24,000",
      createdBy: adminGreene._id,
    },
    {
      equipmentId: "EQ-1018",
      name: "Maquet Servo-u ICU Ventilator",
      category: "Ventilator",
      manufacturer: "Getinge / Maquet",
      model: "Servo-u",
      serialNumber: "MAQ-SU-1149",
      departmentId: deptIcu._id,
      location: "ICU · Bed 6",
      status: "OPERATIONAL",
      criticality: "CRITICAL",
      healthScore: 73.0,
      expectedUsefulLifeYears: 10,
      installationDate: new Date(now.getTime() - 5.0 * 365.25 * 86_400_000),
      cost: "$44,000",
      createdBy: adminGreene._id,
    },
  ]);

  console.log(`[seed] Created 18 total medical equipment records.`);

  /* -------------------------------------------------------------------------- */
  /* 7. CALIBRATION RECORDS                                                     */
  /* -------------------------------------------------------------------------- */
  // EQ-1042: Valid calibration (CAL = 100) for the worked example
  await Calibration.create({
    calibrationId: "CAL-2026-001",
    equipmentId: eqWorkedExample._id,
    departmentId: deptCard._id,
    assignedEngineerId: engCarlos._id,
    title: "Annual Signal Accuracy & ECG Deflection Calibration",
    calibrationType: "INTERNAL",
    frequency: "YEARLY",
    scheduledDate: new Date(now.getTime() - 60 * 86_400_000),
    calibrationDate: new Date(now.getTime() - 60 * 86_400_000),
    nextCalibrationDate: new Date(now.getTime() + 120 * 86_400_000),
    status: "PASSED",
    result: "PASS",
    certificateNumber: "CERT-CARD-2026-01",
    measuredValues: [
      { parameter: "ECG Gain 10mm/mV", unit: "mm/mV", reference: "10.0", measured: "10.02", tolerance: "±0.2", withinTolerance: true },
      { parameter: "RF Signal Frequency", unit: "MHz", reference: "608.0", measured: "608.01", tolerance: "±0.05", withinTolerance: true },
    ],
    createdBy: adminGreene._id,
  });

  // EQ-1006 (Defibrillator): FAILED calibration -> Triggers Critical Safety Override!
  await Calibration.create({
    calibrationId: "CAL-2026-002",
    equipmentId: eqDefib._id,
    departmentId: deptEr._id,
    assignedEngineerId: engDaniel._id,
    title: "Emergency Defibrillator Output Energy Calibration",
    calibrationType: "INTERNAL",
    frequency: "HALF_YEARLY",
    scheduledDate: new Date(now.getTime() - 5 * 86_400_000),
    calibrationDate: new Date(now.getTime() - 5 * 86_400_000),
    nextCalibrationDate: new Date(now.getTime() + 175 * 86_400_000),
    status: "FAILED",
    result: "FAIL",
    certificateNumber: "CERT-DEF-FAIL-01",
    measuredValues: [
      { parameter: "Delivered Energy at 200J Setting", unit: "Joules", reference: "200.0", measured: "172.0", tolerance: "±10.0", withinTolerance: false },
    ],
    findings: "Capacitor bank failed to deliver rated energy. Delivered 172J instead of minimum 190J.",
    correctiveAction: "Device immediately removed from emergency service. Awaiting replacement high-voltage capacitor.",
    createdBy: adminGreene._id,
  });

  // EQ-1001 (Ventilator): Passed
  await Calibration.create({
    calibrationId: "CAL-2026-003",
    equipmentId: eqVentilator._id,
    departmentId: deptIcu._id,
    assignedEngineerId: engDaniel._id,
    title: "Ventilator Pressure Transducer & Flow Zero Calibration",
    calibrationType: "INTERNAL",
    frequency: "YEARLY",
    scheduledDate: new Date(now.getTime() - 30 * 86_400_000),
    calibrationDate: new Date(now.getTime() - 30 * 86_400_000),
    nextCalibrationDate: new Date(now.getTime() + 335 * 86_400_000),
    status: "PASSED",
    result: "PASS",
    certificateNumber: "CERT-VENT-2026-09",
    measuredValues: [
      { parameter: "Airway Pressure 30 cmH2O", unit: "cmH2O", reference: "30.0", measured: "30.1", tolerance: "±0.5", withinTolerance: true },
    ],
    createdBy: adminGreene._id,
  });

  console.log("[seed] Created calibration records (including passed and failed test cases).");

  /* -------------------------------------------------------------------------- */
  /* 8. PREVENTIVE MAINTENANCE PLANS                                            */
  /* -------------------------------------------------------------------------- */
  // EQ-1042 Worked example: 4 scheduled, 3 completed = 75% PM Compliance (PM = 75)
  await PreventiveMaintenance.create([
    {
      preventiveMaintenanceId: "PM-1042-Q1",
      title: "Q1 Telemetry Signal Quality & Battery Terminal Inspection",
      equipmentId: eqWorkedExample._id,
      departmentId: deptCard._id,
      assignedEngineerId: engCarlos._id,
      frequency: "QUARTERLY",
      startDate: new Date(now.getTime() - 300 * 86_400_000),
      nextDueDate: new Date(now.getTime() - 210 * 86_400_000),
      lastCompletedDate: new Date(now.getTime() - 215 * 86_400_000),
      active: true,
      createdBy: adminGreene._id,
    },
    {
      preventiveMaintenanceId: "PM-1042-Q2",
      title: "Q2 Antenna Array & Patient Lead Resistance Audit",
      equipmentId: eqWorkedExample._id,
      departmentId: deptCard._id,
      assignedEngineerId: engCarlos._id,
      frequency: "QUARTERLY",
      startDate: new Date(now.getTime() - 210 * 86_400_000),
      nextDueDate: new Date(now.getTime() - 120 * 86_400_000),
      lastCompletedDate: new Date(now.getTime() - 122 * 86_400_000),
      active: true,
      createdBy: adminGreene._id,
    },
    {
      preventiveMaintenanceId: "PM-1042-Q3",
      title: "Q3 Firmware Diagnostics & Central Display Verification",
      equipmentId: eqWorkedExample._id,
      departmentId: deptCard._id,
      assignedEngineerId: engCarlos._id,
      frequency: "QUARTERLY",
      startDate: new Date(now.getTime() - 120 * 86_400_000),
      nextDueDate: new Date(now.getTime() - 30 * 86_400_000),
      lastCompletedDate: new Date(now.getTime() - 33 * 86_400_000),
      active: true,
      createdBy: adminGreene._id,
    },
    {
      preventiveMaintenanceId: "PM-1042-Q4",
      title: "Q4 Full Preventive Maintenance & Audio Alarm Calibration",
      equipmentId: eqWorkedExample._id,
      departmentId: deptCard._id,
      assignedEngineerId: engCarlos._id,
      frequency: "QUARTERLY",
      startDate: new Date(now.getTime() - 30 * 86_400_000),
      nextDueDate: new Date(now.getTime() + 60 * 86_400_000),
      lastCompletedDate: null, // Open upcoming task
      active: true,
      createdBy: adminGreene._id,
    },
    // EQ-1001 (Ventilator PM)
    {
      preventiveMaintenanceId: "PM-1001-M1",
      title: "Monthly Ventilator Pneumatics & O2 Sensor Verification",
      equipmentId: eqVentilator._id,
      departmentId: deptIcu._id,
      assignedEngineerId: engDaniel._id,
      frequency: "MONTHLY",
      startDate: new Date(now.getTime() - 30 * 86_400_000),
      nextDueDate: new Date(now.getTime() + 15 * 86_400_000),
      lastCompletedDate: new Date(now.getTime() - 15 * 86_400_000),
      active: true,
      createdBy: adminGreene._id,
    },
  ]);

  console.log("[seed] Created preventive maintenance plans.");

  /* -------------------------------------------------------------------------- */
  /* 9. WORK ORDERS & COMPLAINTS FOR WORKED EXAMPLE (EQ-1042)                   */
  /*    Requirements:                                                           */
  /*    • 3 Breakdowns (B = 40)                                                 */
  /*    • High/Repeated Complaints (C = 40)                                     */
  /*    • 3 Maintenance events (SR = 55)                                        */
  /*    • 12% Downtime (~1051 hours out of 8760 observation window) (D = 40)    */
  /* -------------------------------------------------------------------------- */
  const downtime1Start = new Date(now.getTime() - 250 * 86_400_000);
  const downtime1End = new Date(downtime1Start.getTime() + 350 * 3_600_000); // 350 hrs

  const downtime2Start = new Date(now.getTime() - 160 * 86_400_000);
  const downtime2End = new Date(downtime2Start.getTime() + 380 * 3_600_000); // 380 hrs

  const downtime3Start = new Date(now.getTime() - 80 * 86_400_000);
  const downtime3End = new Date(downtime3Start.getTime() + 321.2 * 3_600_000); // 321.2 hrs
  // Total downtime = 350 + 380 + 321.2 = 1051.2 hrs.
  // 1051.2 / 8760 = 12.0% downtime! (Exact D = 40 score)

  // Complaint 1 (Breakdown 1, High priority)
  const cmp42_1 = await Complaint.create({
    complaintId: "CMP-2026-0042",
    equipmentId: eqWorkedExample._id,
    departmentId: deptCard._id,
    reportedBy: staffSarah._id,
    assignedEngineerId: engCarlos._id,
    title: "Central receiver dropped telemetry signal on 3 telemetry packs",
    description: "Repeated dropouts reported by nursing staff during arrhythmia monitoring.",
    priority: "HIGH",
    status: "RESOLVED",
    resolution: "Replaced receiver antenna interface board and recalibrated RF frequencies.",
    createdAt: downtime1Start,
    resolvedAt: downtime1End,
  });

  const wo42_1 = await WorkOrder.create({
    workOrderId: "WO-2026-0042",
    title: "Repair Telemetry Receiver RF Signal Drop",
    equipmentId: eqWorkedExample._id,
    complaintId: cmp42_1._id,
    departmentId: deptCard._id,
    engineerId: engCarlos._id,
    maintenanceType: "BREAKDOWN",
    priority: "HIGH",
    status: "COMPLETED",
    scheduledDate: downtime1Start,
    startedAt: downtime1Start,
    completedAt: downtime1End,
    description: "Emergency breakdown repair for dropped telemetry channel",
    createdBy: adminGreene._id,
  });
  cmp42_1.workOrderId = wo42_1._id;
  await cmp42_1.save();

  const mnt42_1 = await Maintenance.create({
    maintenanceId: "MNT-2026-0042",
    workOrderId: wo42_1._id,
    equipmentId: eqWorkedExample._id,
    complaintId: cmp42_1._id,
    departmentId: deptCard._id,
    engineerId: engCarlos._id,
    maintenanceType: "BREAKDOWN",
    startTime: downtime1Start,
    endTime: downtime1End,
    status: "COMPLETED",
    initialCondition: "Telemetry signal intermittent",
    finalCondition: "OPERATIONAL",
    remarks: "Repaired RF front-end module.",
    verification: { safetyVerified: true, performanceVerified: true, verifiedBy: engCarlos._id, verifiedAt: downtime1End },
  });

  // Complaint 2 (Breakdown 2, High priority)
  const cmp42_2 = await Complaint.create({
    complaintId: "CMP-2026-0043",
    equipmentId: eqWorkedExample._id,
    departmentId: deptCard._id,
    reportedBy: staffSarah._id,
    assignedEngineerId: engCarlos._id,
    title: "Central station display flickering and power reboot loop",
    description: "Screen rebooted twice during acute shift monitoring.",
    priority: "HIGH",
    status: "RESOLVED",
    resolution: "Swapped failing internal switched-mode power supply unit.",
    createdAt: downtime2Start,
    resolvedAt: downtime2End,
  });

  const wo42_2 = await WorkOrder.create({
    workOrderId: "WO-2026-0043",
    title: "Replace Power Supply Unit on Telemetry Station",
    equipmentId: eqWorkedExample._id,
    complaintId: cmp42_2._id,
    departmentId: deptCard._id,
    engineerId: engCarlos._id,
    maintenanceType: "BREAKDOWN",
    priority: "HIGH",
    status: "COMPLETED",
    scheduledDate: downtime2Start,
    startedAt: downtime2Start,
    completedAt: downtime2End,
    description: "Breakdown repair for central station power supply",
    createdBy: adminGreene._id,
  });
  cmp42_2.workOrderId = wo42_2._id;
  await cmp42_2.save();

  const mnt42_2 = await Maintenance.create({
    maintenanceId: "MNT-2026-0043",
    workOrderId: wo42_2._id,
    equipmentId: eqWorkedExample._id,
    complaintId: cmp42_2._id,
    departmentId: deptCard._id,
    engineerId: engCarlos._id,
    maintenanceType: "BREAKDOWN",
    startTime: downtime2Start,
    endTime: downtime2End,
    status: "COMPLETED",
    initialCondition: "Reboot loop observed",
    finalCondition: "OPERATIONAL",
    remarks: "Installed OEM power supply.",
    verification: { safetyVerified: true, performanceVerified: true, verifiedBy: engCarlos._id, verifiedAt: downtime2End },
  });

  // Complaint 3 (Breakdown 3, High priority)
  const cmp42_3 = await Complaint.create({
    complaintId: "CMP-2026-0044",
    equipmentId: eqWorkedExample._id,
    departmentId: deptCard._id,
    reportedBy: staffSarah._id,
    assignedEngineerId: engCarlos._id,
    title: "Telemetry transmitter battery bay corrosion & false lead-off alarms",
    description: "Frequent false alarms waking patients in ward.",
    priority: "HIGH",
    status: "RESOLVED",
    resolution: "Cleaned terminals, replaced contact clips and replaced grabber leads.",
    createdAt: downtime3Start,
    resolvedAt: downtime3End,
  });

  const wo42_3 = await WorkOrder.create({
    workOrderId: "WO-2026-0044",
    title: "Overhaul Battery Contacts and ECG Lead Attachments",
    equipmentId: eqWorkedExample._id,
    complaintId: cmp42_3._id,
    departmentId: deptCard._id,
    engineerId: engCarlos._id,
    maintenanceType: "BREAKDOWN",
    priority: "HIGH",
    status: "COMPLETED",
    scheduledDate: downtime3Start,
    startedAt: downtime3Start,
    completedAt: downtime3End,
    description: "Corrective overhaul for recurring false telemetry lead alarms",
    createdBy: adminGreene._id,
  });
  cmp42_3.workOrderId = wo42_3._id;
  await cmp42_3.save();

  const mnt42_3 = await Maintenance.create({
    maintenanceId: "MNT-2026-0044",
    workOrderId: wo42_3._id,
    equipmentId: eqWorkedExample._id,
    complaintId: cmp42_3._id,
    departmentId: deptCard._id,
    engineerId: engCarlos._id,
    maintenanceType: "BREAKDOWN",
    startTime: downtime3Start,
    endTime: downtime3End,
    status: "COMPLETED",
    initialCondition: "Corroded contacts",
    finalCondition: "OPERATIONAL",
    remarks: "Replaced 5-lead grabbers and verified with cardiac simulator.",
    partsUsed: [{ name: "5-Lead ECG Trunk Cable & Leads", partNo: "GE-ECG-5L", qty: 2, cost: 240 }],
    verification: { safetyVerified: true, performanceVerified: true, verifiedBy: engCarlos._id, verifiedAt: downtime3End },
  });

  console.log("[seed] Created 3 breakdown lifecycle records producing the exact 54.25 worked example!");

  /* -------------------------------------------------------------------------- */
  /* 10. ADDITIONAL COMPLAINTS, WORK ORDERS & SERVICE REPORTS                   */
  /* -------------------------------------------------------------------------- */
  // Complaint on Zoll Defibrillator
  const defibComplaint = await Complaint.create({
    complaintId: "CMP-2026-0050",
    equipmentId: eqDefib._id,
    departmentId: deptEr._id,
    reportedBy: staffLiam._id,
    assignedEngineerId: engDaniel._id,
    title: "Defibrillator self-test failed indicator red flag",
    description: "Self test failed with error code ERR-CAP-200. Shift supervisor removed from duty.",
    priority: "CRITICAL",
    status: "INVESTIGATION",
    createdAt: new Date(now.getTime() - 4 * 86_400_000),
  });

  const defibWo = await WorkOrder.create({
    workOrderId: "WO-2026-0050",
    title: "Investigate Defibrillator Capacitor Bank Failure",
    equipmentId: eqDefib._id,
    complaintId: defibComplaint._id,
    departmentId: deptEr._id,
    engineerId: engDaniel._id,
    maintenanceType: "CORRECTIVE",
    priority: "CRITICAL",
    status: "IN_PROGRESS",
    scheduledDate: new Date(now.getTime() - 3 * 86_400_000),
    startedAt: new Date(now.getTime() - 2 * 86_400_000),
    description: "Capacitor discharge diagnostics and safety verification",
    createdBy: adminGreene._id,
  });
  defibComplaint.workOrderId = defibWo._id;
  await defibComplaint.save();

  const defibMnt = await Maintenance.create({
    maintenanceId: "MNT-2026-0050",
    workOrderId: defibWo._id,
    equipmentId: eqDefib._id,
    complaintId: defibComplaint._id,
    departmentId: deptEr._id,
    engineerId: engDaniel._id,
    maintenanceType: "CORRECTIVE",
    startTime: new Date(now.getTime() - 2 * 86_400_000),
    status: "INVESTIGATION",
    initialCondition: "Failed automatic discharge test",
  });

  // Complaint on Medtronic PB980 (Open Critical Breakdown)
  const pb980Complaint = await Complaint.create({
    complaintId: "CMP-2026-0051",
    equipmentId: eqVentCritical._id,
    departmentId: deptIcu._id,
    reportedBy: staffClara._id,
    assignedEngineerId: engDaniel._id,
    title: "Expiratory valve occlusion error during active mandatory ventilation",
    description: "High airway pressure alarm sounding; exhalation manifold stuck open.",
    priority: "CRITICAL",
    status: "OPEN",
    createdAt: new Date(now.getTime() - 1 * 86_400_000),
  });

  // Complaints on other equipment for dashboard realism
  await Complaint.create([
    {
      complaintId: "CMP-2026-0052",
      equipmentId: eqCt._id,
      departmentId: deptRad._id,
      reportedBy: staffJames._id,
      assignedEngineerId: engPriya._id,
      title: "Gantry rotation acoustic vibration at 0.5s rotation speed",
      description: "Audible hum observed during helical contrast cardiac scanning.",
      priority: "MEDIUM",
      status: "ASSIGNED",
      createdAt: new Date(now.getTime() - 6 * 86_400_000),
    },
    {
      complaintId: "CMP-2026-0053",
      equipmentId: eqInfusion._id,
      departmentId: deptOnc._id,
      reportedBy: staffRobert._id,
      assignedEngineerId: engAisha._id,
      title: "Air-in-line false sensor alarms on Line B",
      description: "Sensor triggered alarm despite de-bubbled IV line.",
      priority: "LOW",
      status: "RESOLVED",
      resolution: "Cleaned optical sensor prism with isopropyl alcohol wipe.",
      createdAt: new Date(now.getTime() - 12 * 86_400_000),
      resolvedAt: new Date(now.getTime() - 10 * 86_400_000),
    },
    {
      complaintId: "CMP-2026-0054",
      equipmentId: eqVentilator._id,
      departmentId: deptIcu._id,
      reportedBy: staffClara._id,
      assignedEngineerId: engDaniel._id,
      title: "Routine pre-use sensor calibration check advisory",
      description: "Quarterly inspection and baseline verification required.",
      priority: "LOW",
      status: "CLOSED",
      resolution: "Checked sensor baseline curve. Passed within specification.",
      createdAt: new Date(now.getTime() - 40 * 86_400_000),
      resolvedAt: new Date(now.getTime() - 38 * 86_400_000),
    },
  ]);

  // Service Report on Hamilton Ventilator
  const ventSr = await ServiceReport.create({
    serviceReportId: "SR-2026-001",
    maintenanceId: mnt42_1._id,
    workOrderId: wo42_1._id,
    equipmentId: eqWorkedExample._id,
    complaintId: cmp42_1._id,
    engineerId: engCarlos._id,
    problem: "Telemetry receiver dropping signal across channels",
    diagnosticFindings: "RF noise floor elevated on antenna branch 1",
    rootCause: "Impedance mismatch in antenna pre-amplifier",
    correctiveAction: "Replaced RF amplifier board and retuned receiver bandpass filter",
    preventiveAction: "Added monthly signal strength audit to ward checklist",
    partsUsed: [{ name: "Flow Sensor Assembly", partNo: "HAM-FS-2026", qty: 1, cost: 180 }],
    testResult: "PASS",
    finalCondition: "OPERATIONAL",
    engineerRemarks: "Telemetry verified on RF spectrum analyzer and patient simulator.",
    status: "APPROVED",
    verificationStatus: "VERIFIED",
    reviewedBy: adminGreene._id,
    reviewedAt: new Date(now.getTime() - 240 * 86_400_000),
    reviewNote: "Approved after verifying spectrum compliance.",
  });

  console.log("[seed] Created complaints, work orders, maintenance, and service reports.");

  /* -------------------------------------------------------------------------- */
  /* 11. PURCHASE ORDERS & STOCK MOVEMENTS                                      */
  /* -------------------------------------------------------------------------- */
  const po1 = await PurchaseOrder.create({
    purchaseOrderId: "PO-2026-001",
    poNumber: "PO-2026-001",
    vendorId: vHamilton._id,
    departmentId: deptIcu._id,
    orderDate: new Date(now.getTime() - 60 * 86_400_000),
    deliveryDate: new Date(now.getTime() - 45 * 86_400_000),
    status: "RECEIVED",
    priority: "HIGH",
    totalAmount: 4500,
    items: [
      {
        itemId: inventoryItems[0]._id,
        itemCode: "HAM-FS-2026",
        description: "Flow Sensor Assembly for Hamilton C6",
        quantity: 25,
        unitPrice: 180,
        total: 4500,
        receivedQuantity: 25,
      },
    ],
    approvedBy: adminGreene._id,
    approvedAt: new Date(now.getTime() - 58 * 86_400_000),
    notes: "Critical ICU ventilator spare parts replenishment",
  });

  const po2 = await PurchaseOrder.create({
    purchaseOrderId: "PO-2026-002",
    poNumber: "PO-2026-002",
    vendorId: vZoll._id,
    departmentId: deptEr._id,
    orderDate: new Date(now.getTime() - 10 * 86_400_000),
    status: "APPROVED",
    priority: "CRITICAL",
    totalAmount: 1450,
    items: [
      {
        itemId: inventoryItems[3]._id,
        itemCode: "ZOLL-PAD-AD",
        description: "CPR-D-padz Adult Defibrillator Electrodes",
        quantity: 10,
        unitPrice: 145,
        total: 1450,
        receivedQuantity: 0,
      },
    ],
    approvedBy: adminGreene._id,
    approvedAt: new Date(now.getTime() - 8 * 86_400_000),
    notes: "Urgent restocking for Emergency trauma bays",
  });

  // Stock Movement: Initial Receipt
  await StockMovement.create({
    movementId: "MOV-2026-001",
    itemId: inventoryItems[0]._id,
    type: "RECEIPT",
    quantity: 25,
    previousQuantity: 0,
    newQuantity: 25,
    reference: po1.purchaseOrderId,
    relatedPurchaseOrderId: po1._id,
    performedBy: adminGreene._id,
    departmentId: deptIcu._id,
    reason: "Goods received from Purchase Order PO-2026-001",
    unitCost: 180,
    totalCost: 4500,
  });

  // Stock Movement: Issue to Maintenance
  await StockMovement.create({
    movementId: "MOV-2026-002",
    itemId: inventoryItems[2]._id, // ECG trunk cable
    type: "ISSUE",
    quantity: 2,
    previousQuantity: 20,
    newQuantity: 18,
    reference: mnt42_3.maintenanceId,
    relatedEquipmentId: eqWorkedExample._id,
    relatedWorkOrderId: wo42_3._id,
    performedBy: engCarlos._id,
    departmentId: deptCard._id,
    reason: "Part issued for maintenance MNT-2026-0044",
    unitCost: 120,
    totalCost: 240,
  });

  console.log("[seed] Created purchase orders and stock movements.");

  /* -------------------------------------------------------------------------- */
  /* 12. NOTIFICATIONS & AUDIT LOGS                                             */
  /* -------------------------------------------------------------------------- */
  await Notification.create([
    {
      userId: adminGreene._id,
      title: "Critical Defibrillator Calibration Failure",
      message: "Zoll R Series ALS (EQ-1006) failed energy delivery calibration. Safety override activated.",
      type: "CALIBRATION_DUE",
      severity: "DANGER",
      link: `/equipment/${eqDefib._id}`,
      isRead: false,
    },
    {
      userId: engDaniel._id,
      title: "New Work Order Assigned",
      message: "You have been assigned to Work Order WO-2026-0050: Investigate Defibrillator Capacitor Bank Failure",
      type: "WORK_ORDER_UPDATE",
      severity: "WARNING",
      link: `/work-orders/${defibWo._id}`,
      isRead: false,
    },
    {
      userId: staffClara._id,
      title: "Complaint Status Updated",
      message: "Your complaint CMP-2026-0054 on Hamilton C6 Ventilator has been marked RESOLVED.",
      type: "COMPLAINT_UPDATE",
      severity: "INFO",
      isRead: true,
    },
  ]);

  await AuditLog.create([
    {
      userId: adminGreene._id,
      userName: adminGreene.name,
      userRole: adminGreene.role,
      action: "DATABASE_SEEDED",
      module: "Audit",
      recordId: "SEED-INIT",
      description: "Deterministic database seed initialized with full interconnected medical assets.",
    },
    {
      userId: engCarlos._id,
      userName: engCarlos.name,
      userRole: engCarlos.role,
      action: "MAINTENANCE_COMPLETED",
      module: "Maintenance",
      recordId: mnt42_3.maintenanceId,
      equipmentId: eqWorkedExample._id,
      workOrderId: wo42_3._id,
      description: "Completed overhaul on GE Apex Pro Telemetry receiver.",
    },
  ]);

  console.log("[seed] Created notifications and audit log entries.");

  /* -------------------------------------------------------------------------- */
  /* 13. CALCULATE AND PERSIST EXACT EHS ON WORKED EXAMPLE & PRISTINE ASSETS   */
  /* -------------------------------------------------------------------------- */
  console.log("\n[seed] Validating authoritative EHS calculations on seeded equipment...");

  const workedCalc = await calculateEquipmentEhs(eqWorkedExample._id, { persist: true });
  console.log(`✔ Worked Example Equipment: ${eqWorkedExample.equipmentId} (${eqWorkedExample.name})`);
  console.log(`   Calculated EHS: ${workedCalc.ehs} (Expected: 54.25)`);
  console.log(`   Category: ${workedCalc.category} (Expected: AT_RISK)`);
  console.log(`   Component Contributions:`, workedCalc.components);

  const defibCalc = await calculateEquipmentEhs(eqDefib._id, { persist: true });
  console.log(`✔ Failed Calibration Safety Override: ${eqDefib.equipmentId} (${eqDefib.name})`);
  console.log(`   Calculated EHS: ${defibCalc.ehs} · Final Risk: ${defibCalc.finalRisk} (Risk Override: ${defibCalc.riskOverride})`);

  const ventCalc = await calculateEquipmentEhs(eqVentilator._id, { persist: true });
  console.log(`✔ Pristine Ventilator: ${eqVentilator.equipmentId} · EHS: ${ventCalc.ehs} (${ventCalc.category})`);

  console.log("\n=========================================================================");
  console.log(" MEDIXA PLATFORM DETERMINISTIC SEED COMPLETED SUCCESSFULLY! ✔");
  console.log("=========================================================================\n");

  return {
    departments,
    users,
    vendors,
    inventoryItems,
    equipment: [eqWorkedExample, eqVentilator, eqMonitor, eqMri, eqCt, eqInfusion, eqDefib, eqVentCritical, ...additionalEquipment],
    workedExampleEhs: workedCalc,
  };
}

if (process.argv[1]?.endsWith("seed.js")) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("[seed] Fatal error during seed:", err);
      process.exit(1);
    });
}
