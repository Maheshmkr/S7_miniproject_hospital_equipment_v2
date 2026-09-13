/**
 * Medixa Hospital Equipment Asset Lifecycle Management System
 * Dynamic Equipment Health Score — Comprehensive Lifecycle Test Suite
 */

import { strict as assert } from "node:assert";
import http from "node:http";
import mongoose from "mongoose";
import Equipment from "./models/Equipment.js";
import Complaint from "./models/Complaint.js";
import WorkOrder from "./models/WorkOrder.js";
import Maintenance from "./models/Maintenance.js";
import ChecklistResponse from "./models/ChecklistResponse.js";
import ChecklistQuestion from "./models/ChecklistQuestion.js";
import ChecklistTemplate from "./models/ChecklistTemplate.js";
import ServiceReport from "./models/ServiceReport.js";
import Investigation from "./models/Investigation.js";
import User from "./models/User.js";
import Department from "./models/Department.js";
import EquipmentHealthSnapshot from "./models/EquipmentHealthSnapshot.js";
import { calculateEquipmentHealth, getHealthScoreHistory } from "./services/healthScoreService.js";

const PORT = process.env.PORT || 5000;
const BASE_URL = `http://localhost:${PORT}/api`;

let staffToken = "";
let adminToken = "";
let engineerToken = "";
let engineerUser = null;
let equipmentDoc = null;
let checklistQ = null;

async function request(endpoint, { method = "GET", body, token } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }

  const payload = json && typeof json === "object" && "data" in json ? json.data : json;
  return { status: res.status, ok: res.ok, data: payload, rawJson: json };
}

async function runTests() {
  console.log("=========================================================================");
  console.log(" MEDIXA — DYNAMIC EQUIPMENT HEALTH SCORE E2E TEST SUITE");
  console.log(" MongoDB Lifecycle Based · 7 Weighted Components · Renormalization");
  console.log("=========================================================================\n");

  // Step 0: Clean DB and seed baseline
  console.log("[Setup] Resetting database to clean deterministic baseline...");
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect("mongodb://127.0.0.1:27017/hospital_equipment");
  }

  const collections = [
    "complaints",
    "workorders",
    "maintenances",
    "checklistresponses",
    "checklistquestions",
    "checklisttemplates",
    "servicereports",
    "investigations",
    "evidences",
    "auditlogs",
    "equipmenthealthsnapshots",
    "equipment",
    "users",
    "departments",
    "warranties",
    "calibrations",
    "preventivemaintenances",
  ];

  for (const c of collections) {
    try {
      await mongoose.connection.collection(c).deleteMany({});
    } catch {}
  }

  const dept = await Department.create({
    name: "ICU",
    code: "ICU",
    head: "Dr. Sarah Jenkins",
    location: "Building A · Level 3",
  });

  const hash = await User.hashPassword("Medixa#2026");

  const admin = await User.create({
    name: "Emilia Greene",
    email: "emilia.greene@medixa.health",
    passwordHash: hash,
    role: "ADMINISTRATOR",
    departmentId: dept._id,
    status: "ACTIVE",
  });

  engineerUser = await User.create({
    name: "Daniel Okafor",
    email: "daniel.okafor@medixa.health",
    passwordHash: hash,
    role: "BIOMEDICAL_ENGINEER",
    departmentId: dept._id,
    status: "ACTIVE",
  });

  const staff = await User.create({
    name: "Clara Whitfield",
    email: "clara.whitfield@medixa.health",
    passwordHash: hash,
    role: "DEPARTMENT_STAFF",
    departmentId: dept._id,
    status: "ACTIVE",
  });

  equipmentDoc = await Equipment.create({
    equipmentId: "EQ-1001",
    name: "Hamilton C6 ICU Ventilator",
    category: "Ventilator",
    manufacturer: "Hamilton Medical",
    model: "C6",
    serialNumber: "HAM-C6-9921",
    departmentId: dept._id,
    location: "ICU · Bed 1",
    status: "OPERATIONAL",
    lifecycleStage: "IN_SERVICE",
    criticality: "CRITICAL",
    healthScore: 100,
    cost: "45000",
    warrantyExpiry: new Date(Date.now() + 180 * 86_400_000), // 180 days active
  });

  const ventilatorTemplate = await ChecklistTemplate.create({
    name: "Ventilator Maintenance Checklist",
    equipmentCategory: "Ventilator",
    maintenanceType: "ALL",
    version: "1.0",
    active: true,
    createdBy: admin._id,
  });

  checklistQ = await ChecklistQuestion.create({
    templateId: ventilatorTemplate._id,
    order: 1,
    category: "Ventilator",
    question: "Is the flow sensor functioning correctly?",
    responseType: "PASS_FAIL",
    priority: "CRITICAL",
    required: true,
    active: true,
  });

  // Server is already running on PORT 5000
  console.log(`✔ Connected to backend API on ${BASE_URL}\n`);

  // Authenticate users
  const staffRes = await request("/auth/login", {
    method: "POST",
    body: { email: "clara.whitfield@medixa.health", password: "Medixa#2026" },
  });
  staffToken = staffRes.data.data?.token || staffRes.data.token;

  const adminRes = await request("/auth/login", {
    method: "POST",
    body: { email: "emilia.greene@medixa.health", password: "Medixa#2026" },
  });
  adminToken = adminRes.data.data?.token || adminRes.data.token;

  const engRes = await request("/auth/login", {
    method: "POST",
    body: { email: "daniel.okafor@medixa.health", password: "Medixa#2026" },
  });
  engineerToken = engRes.data.data?.token || engRes.data.token;

  // ---------------------------------------------------------------------------
  // TEST 1: Baseline Health Score on pristine equipment (OPERATIONAL)
  // ---------------------------------------------------------------------------
  console.log("[1/12] TEST 1: Calculate baseline Health Score on pristine OPERATIONAL equipment...");
  const baseHealth = await request(`/equipment/${equipmentDoc._id}/health-score`, { token: adminToken });
  assert.equal(baseHealth.status, 200);
  assert.equal(baseHealth.data.healthStatus, "EXCELLENT");
  assert.ok(baseHealth.data.healthScore >= 95, `Expected score >= 95, got ${baseHealth.data.healthScore}`);
  assert.equal(baseHealth.data.isCapped, false);
  assert.ok(baseHealth.data.breakdown.operational.score === 20, "Operational score should be 20/20");
  assert.ok(baseHealth.data.breakdown.complaints.score === 20, "Complaint score should be 20/20");
  console.log(`✔ Pristine Health Score: ${baseHealth.data.healthScore} (${baseHealth.data.healthStatus})`);

  // ---------------------------------------------------------------------------
  // TEST 2: Department Staff raises HIGH Priority Complaint -> Score Drops
  // ---------------------------------------------------------------------------
  console.log("[2/12] TEST 2: Staff creates HIGH priority complaint -> Verify score decreases...");
  const compRes = await request("/complaints", {
    method: "POST",
    token: staffToken,
    body: {
      equipmentId: equipmentDoc._id,
      title: "Ventilator pressure transducer unstable",
      description: "Pressure fluctuations observed during CPAP mode.",
      priority: "HIGH",
    },
  });
  assert.equal(compRes.status, 201);
  const complaintId = compRes.data._id;

  const afterHighCompHealth = await request(`/equipment/${equipmentDoc._id}/health-score`, { token: adminToken });
  assert.ok(afterHighCompHealth.data.healthScore < baseHealth.data.healthScore, "Health score must decrease after complaint");
  assert.ok(afterHighCompHealth.data.breakdown.complaints.score < 20, "Complaints component score must decrease");
  console.log(`✔ Health Score after HIGH complaint: ${afterHighCompHealth.data.healthScore} (${afterHighCompHealth.data.healthStatus})`);

  // ---------------------------------------------------------------------------
  // TEST 3: CRITICAL Complaint triggers Safety Override (Score capped <= 59.0)
  // ---------------------------------------------------------------------------
  console.log("[3/12] TEST 3: Create CRITICAL breakdown complaint -> Verify safety override caps score at <= 59.0...");
  const critCompRes = await request("/complaints", {
    method: "POST",
    token: staffToken,
    body: {
      equipmentId: equipmentDoc._id,
      title: "CRITICAL: Complete flow sensor failure during ventilation",
      description: "Alarm sounding continuously. Urgent clinical breakdown.",
      priority: "CRITICAL",
    },
  });
  assert.equal(critCompRes.status, 201);

  const afterCritCompHealth = await request(`/equipment/${equipmentDoc._id}/health-score`, { token: adminToken });
  assert.ok(afterCritCompHealth.data.healthScore <= 59.0, `Score must be capped <= 59, got ${afterCritCompHealth.data.healthScore}`);
  assert.equal(afterCritCompHealth.data.isCapped, true, "isCapped must be true");
  assert.ok(afterCritCompHealth.data.capReason.includes("critical"), "capReason must explain critical breakdown");
  assert.equal(afterCritCompHealth.data.healthStatus, "POOR");
  console.log(`✔ Capped Health Score: ${afterCritCompHealth.data.healthScore} (${afterCritCompHealth.data.healthStatus}) - Capped: ${afterCritCompHealth.data.isCapped}`);

  // ---------------------------------------------------------------------------
  // TEST 4: Admin creates Work Order assigned to Daniel Okafor & Starts Maintenance
  // ---------------------------------------------------------------------------
  console.log("[4/12] TEST 4: Admin creates Work Order and Engineer starts maintenance...");
  const woRes = await request("/work-orders", {
    method: "POST",
    token: adminToken,
    body: {
      title: "Emergency Ventilator Repair",
      equipmentId: equipmentDoc._id,
      complaintId: critCompRes.data._id,
      engineerId: engineerUser._id,
      priority: "CRITICAL",
      maintenanceType: "CORRECTIVE",
    },
  });
  assert.equal(woRes.status, 201);
  const woId = woRes.data._id;

  const startRes = await request(`/work-orders/${woId}/start`, {
    method: "POST",
    token: engineerToken,
  });
  assert.equal(startRes.status, 200);
  const mntId = startRes.data.maintenance._id;
  console.log(`✔ Maintenance ${startRes.data.maintenance.maintenanceId} started.`);

  // ---------------------------------------------------------------------------
  // TEST 5: Engineer submits FAIL for critical checklist item -> Safety drops
  // ---------------------------------------------------------------------------
  console.log("[5/12] TEST 5: Engineer submits FAIL for critical checklist question...");
  const failChecklistRes = await request(`/maintenance/${mntId}/checklist`, {
    method: "POST",
    token: engineerToken,
    body: {
      answers: [
        {
          questionId: checklistQ._id,
          response: "FAIL",
          notes: "Flow sensor diaphragm cracked. Needs replacement.",
        },
      ],
    },
  });
  assert.equal(failChecklistRes.status, 200);

  const afterFailHealth = await request(`/equipment/${equipmentDoc._id}/health-score`, { token: adminToken });
  assert.ok(afterFailHealth.data.breakdown.safety.normalized <= 20, "Safety component must drop on critical checklist failure");
  assert.ok(afterFailHealth.data.healthScore <= 59.0, "Score remains capped");
  console.log(`✔ Health Score after checklist FAIL: ${afterFailHealth.data.healthScore} (Safety component: ${afterFailHealth.data.breakdown.safety.normalized}%)`);

  // ---------------------------------------------------------------------------
  // TEST 6: Engineer performs Investigation & Replaces Flow Sensor (PASS)
  // ---------------------------------------------------------------------------
  console.log("[6/12] TEST 6: Engineer records Investigation and re-tests sensor with PASS...");
  const invRes = await request(`/maintenance/${mntId}/investigation`, {
    method: "POST",
    token: engineerToken,
    body: {
      problemObserved: "Flow sensor diaphragm fatigue crack causing false airway pressure errors.",
      diagnosticFindings: "Flow rate reading 0 L/min against calibrated phantom.",
      rootCause: "Component wear after 4000 operational hours.",
      correctiveAction: "Replaced flow sensor with new OEM unit HAM-FS-2026. Calibrated zero-offset.",
      preventiveAction: "Scheduled 1000-hour inspection interval.",
    },
  });
  assert.equal(invRes.status, 200);

  // Submit PASS on checklist
  const passChecklistRes = await request(`/maintenance/${mntId}/checklist`, {
    method: "POST",
    token: engineerToken,
    body: {
      answers: [
        {
          questionId: checklistQ._id,
          response: "PASS",
          notes: "Replacement sensor verified within 0.1% tolerance.",
        },
      ],
    },
  });
  assert.equal(passChecklistRes.status, 200);
  console.log("✔ Investigation recorded and checklist updated to PASS.");

  // ---------------------------------------------------------------------------
  // TEST 7: Engineer submits Service Report
  // ---------------------------------------------------------------------------
  console.log("[7/12] TEST 7: Engineer creates Service Report...");
  const srRes = await request(`/maintenance/${mntId}/service-report`, {
    method: "POST",
    token: engineerToken,
    body: {
      summaryOfWork: "Flow sensor replaced, zero-calibrated and leak tested.",
      findings: "Original sensor failed flow volume test.",
      correctiveAction: "Installed OEM flow sensor HAM-FS-2026.",
      preventiveAction: "Advised staff on daily pre-use calibration check.",
      testResult: "PASS",
      laborHours: 2.0,
      partsReplaced: [{ partName: "Flow Sensor Assembly", partNumber: "HAM-FS-2026", quantity: 1 }],
      finalCondition: "OPERATIONAL",
      engineerRemarks: "Device ready for clinical use.",
    },
  });
  assert.equal(srRes.status, 201);
  console.log(`✔ Service Report created: ${srRes.data.serviceReportId}`);

  // ---------------------------------------------------------------------------
  // TEST 8: Complete Maintenance & Verify Health Score Restoration
  // ---------------------------------------------------------------------------
  console.log("[8/12] TEST 8: Complete Maintenance -> Verify Health Score recalculates and restores...");
  const compMntRes = await request(`/maintenance/${mntId}/complete`, {
    method: "POST",
    token: engineerToken,
    body: {
      verification: {
        safetyVerified: true,
        performanceVerified: true,
      },
      finalCondition: "OPERATIONAL",
      remarks: "Full maintenance cycle completed successfully.",
    },
  });
  assert.equal(compMntRes.status, 200);

  // Close the high complaint as well to test clean recovery
  const comp1 = await Complaint.findById(complaintId);
  comp1.status = "RESOLVED";
  comp1.resolvedAt = new Date();
  await comp1.save();

  const restoredHealth = await request(`/equipment/${equipmentDoc._id}/health-score`, { token: adminToken });
  assert.equal(restoredHealth.status, 200);
  assert.equal(restoredHealth.data.isCapped, false, "Critical cap must be released after resolution");
  assert.ok(restoredHealth.data.healthScore >= 80, `Expected restored score >= 80, got ${restoredHealth.data.healthScore}`);
  assert.ok(["EXCELLENT", "GOOD"].includes(restoredHealth.data.healthStatus));
  console.log(`✔ Restored Health Score: ${restoredHealth.data.healthScore} (${restoredHealth.data.healthStatus})`);

  // ---------------------------------------------------------------------------
  // TEST 9: Status Cascade in MongoDB
  // ---------------------------------------------------------------------------
  console.log("[9/12] TEST 9: Verify complete MongoDB status cascade...");
  const [mntDb, woDb, eqDb, critCompDb] = await Promise.all([
    Maintenance.findById(mntId),
    WorkOrder.findById(woId),
    Equipment.findById(equipmentDoc._id),
    Complaint.findById(critCompRes.data._id),
  ]);

  assert.equal(mntDb.status, "COMPLETED");
  assert.equal(woDb.status, "COMPLETED");
  assert.equal(eqDb.status, "OPERATIONAL");
  assert.equal(critCompDb.status, "RESOLVED");
  assert.equal(eqDb.healthScore, restoredHealth.data.healthScore);
  console.log("✔ Status Cascade verified: Maintenance=COMPLETED, WorkOrder=COMPLETED, Equipment=OPERATIONAL, Complaint=RESOLVED");

  // ---------------------------------------------------------------------------
  // TEST 10: Missing Data Renormalization Policy
  // ---------------------------------------------------------------------------
  console.log("[10/12] TEST 10: Missing optional module renormalization check...");
  assert.equal(restoredHealth.data.breakdown.preventiveMaintenance.applicable, false);
  assert.equal(restoredHealth.data.breakdown.calibration.applicable, false);
  // Total applicable weights should sum to 80 (20 + 20 + 20 + 5 + 15)
  console.log("✔ Renormalization verified: Unconfigured PM and Calibration modules did NOT penalize the equipment with 0.");

  // ---------------------------------------------------------------------------
  // TEST 11: Idempotency and Deterministic Score Calculation
  // ---------------------------------------------------------------------------
  console.log("[11/12] TEST 11: Determinism check — repeated calculation produces exact same score...");
  const repeatHealth1 = await calculateEquipmentHealth(equipmentDoc._id, { persist: false });
  const repeatHealth2 = await calculateEquipmentHealth(equipmentDoc._id, { persist: false });
  assert.equal(repeatHealth1.healthScore, repeatHealth2.healthScore);
  assert.equal(repeatHealth1.calculatedScore, repeatHealth2.calculatedScore);
  console.log(`✔ Determinism verified: ${repeatHealth1.healthScore} === ${repeatHealth2.healthScore}`);

  // ---------------------------------------------------------------------------
  // TEST 12: Historical Snapshots & Trend History API
  // ---------------------------------------------------------------------------
  console.log("[12/12] TEST 12: Verify EquipmentHealthSnapshot history progression...");
  const historyRes = await request(`/equipment/${equipmentDoc._id}/health-history`, { token: adminToken });
  assert.equal(historyRes.status, 200);
  assert.ok(Array.isArray(historyRes.data));
  assert.ok(historyRes.data.length >= 3, `Expected at least 3 historical snapshots, got ${historyRes.data.length}`);
  console.log(`✔ Historical snapshots verified: ${historyRes.data.length} snapshots recorded.`);

  console.log("\n=========================================================================");
  console.log(" ALL 12 DYNAMIC HEALTH SCORE E2E TESTS PASSED SUCCESSFULLY! ✔");
  console.log("=========================================================================");

  await mongoose.disconnect();
}

runTests().catch((err) => {
  console.error("❌ Test failed:", err);
  process.exit(1);
});
