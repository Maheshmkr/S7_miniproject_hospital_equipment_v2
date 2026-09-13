/**
 * Full Flow Audit and Verification Script for Medixa Hospital Medical Equipment Asset Lifecycle
 * Runs all 7 end-to-end scenarios directly against live MongoDB & Express API.
 */
import dotenv from "dotenv";
dotenv.config();
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_URL = "http://localhost:5000/api";

async function post(url, body, token) {
  const res = await fetch(`${API_URL}${url}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`POST ${url} failed [${res.status}]: ${data.message || JSON.stringify(data)}`);
  return data.data || data;
}

async function get(url, token) {
  const res = await fetch(`${API_URL}${url}`, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`GET ${url} failed [${res.status}]: ${data.message || JSON.stringify(data)}`);
  return data.data || data;
}

async function patch(url, body, token) {
  const res = await fetch(`${API_URL}${url}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`PATCH ${url} failed [${res.status}]: ${data.message || JSON.stringify(data)}`);
  return data.data || data;
}

function assert(cond, msg) {
  if (!cond) {
    console.error(`❌ ASSERTION FAILED: ${msg}`);
    throw new Error(`Assertion Failed: ${msg}`);
  }
}

async function runAudit() {
  console.log("========================================================================");
  console.log("  MEDIXA FULL END-TO-END FLOW AUDIT & TEST SUITE");
  console.log("========================================================================");

  let serverProcess = null;
  let ready = false;
  try {
    const res = await fetch("http://localhost:5000/api/health");
    if (res.ok) ready = true;
  } catch {}

  if (!ready) {
    serverProcess = spawn("node", ["server.js"], {
      cwd: __dirname,
      env: { ...process.env, PORT: "5000", NODE_ENV: "test" },
      stdio: "inherit",
    });
    for (let i = 0; i < 25; i++) {
      await new Promise((r) => setTimeout(r, 400));
      try {
        const res = await fetch("http://localhost:5000/api/health");
        if (res.ok) {
          ready = true;
          break;
        }
      } catch {}
    }
  }

  try {
  // Connect to MongoDB to verify raw database state
  await mongoose.connect("mongodb://127.0.0.1:27017/hospital_equipment");
  const User = (await import("./models/User.js")).default;
  const Department = (await import("./models/Department.js")).default;
  const Equipment = (await import("./models/Equipment.js")).default;
  const Complaint = (await import("./models/Complaint.js")).default;
  const WorkOrder = (await import("./models/WorkOrder.js")).default;
  const Maintenance = (await import("./models/Maintenance.js")).default;

  const { signToken } = await import("./middleware/authMiddleware.js");

  // 1. Authenticate users
  console.log("\n[AUTH] Authenticating test users...");
  const adminUser = await User.findOne({ role: "ADMINISTRATOR" });
  assert(adminUser, "Admin user must exist in MongoDB");
  const adminToken = signToken(adminUser);

  const icuDept = await Department.findOne({ code: "ICU" }) || await Department.findOne({});
  assert(icuDept, "ICU / clinical department must exist");

  const staffUser = await User.findOne({ role: "DEPARTMENT_STAFF" });
  assert(staffUser, "Staff user must exist");
  const staffToken = signToken(staffUser);

  const engUserA = await User.findOne({ role: "BIOMEDICAL_ENGINEER" });
  assert(engUserA, "Biomedical Engineer A must exist");
  const engTokenA = signToken(engUserA);

  const engUserB = await User.findOne({ role: "BIOMEDICAL_ENGINEER", _id: { $ne: engUserA._id } }) || engUserA;
  const engTokenB = signToken(engUserB);

  console.log(`  -> Admin: ${adminUser.name}`);
  console.log(`  -> Staff: ${staffUser.name}`);
  console.log(`  -> Engineer A: ${engUserA.name}`);
  console.log(`  -> Engineer B: ${engUserB.name}`);

  const targetDeptId = staffUser.departmentId || icuDept._id;
  console.log(`  -> Target Department: ${targetDeptId}`);

  // TEST 1: Admin Creates Equipment
  console.log("\n------------------------------------------------------------------------");
  console.log("[TEST 1] Admin Creates Equipment in MongoDB...");
  const testSerial = `SN-AUDIT-${Date.now().toString().slice(-6)}`;
  const eqPayload = {
    name: "Audit Test ICU Ventilator Pro",
    category: "Ventilators",
    manufacturer: "GE Healthcare",
    model: "CARESCAPE R860 Pro",
    serialNumber: testSerial,
    departmentId: targetDeptId.toString(),
    location: "Clinical Ward · Level 2 · Bay 4",
    status: "OPERATIONAL",
    criticality: "HIGH",
    healthScore: 98,
    purchaseDate: "2025-01-15",
    installationDate: "2025-02-01",
  };

  const createdEq = await post("/equipment", eqPayload, adminToken);
  assert(createdEq._id, "Created equipment must return _id");
  assert(createdEq.equipmentId, "Created equipment must have sequential equipmentId");
  console.log(`  ✓ Equipment Created: ${createdEq.name} [${createdEq.equipmentId}]`);

  // Verify in MongoDB directly
  const dbEq = await Equipment.findById(createdEq._id);
  assert(dbEq, "Equipment must be persisted in MongoDB");
  assert(String(dbEq.departmentId) === String(targetDeptId), "Department relationship must match MongoDB");
  console.log(`  ✓ Verified in MongoDB with ID ${dbEq._id}`);

  // Verify in Equipment list API
  const eqList = await get("/equipment?search=" + testSerial, adminToken);
  const foundEq = (eqList.items || eqList).find(e => e.serialNumber === testSerial);
  assert(foundEq, "Equipment must appear in GET /api/equipment list");
  console.log(`  ✓ Verified in Equipment List API`);

  // Verify in Equipment Details API
  const eqDetails = await get(`/equipment/${createdEq._id}`, adminToken);
  assert(eqDetails.name === eqPayload.name, "Equipment details must match created data");
  console.log(`  ✓ Verified Equipment Details API`);

  // TEST 2: Department Staff Creates Complaint
  console.log("\n------------------------------------------------------------------------");
  console.log("[TEST 2] Department Staff Creates Complaint for Test Equipment...");
  const complaintPayload = {
    title: "Flow sensor failure and high pressure alarm",
    description: "Ventilator displays intermittent E-114 error code during spontaneous breathing trial.",
    equipmentId: createdEq._id.toString(),
    departmentId: targetDeptId.toString(),
    priority: "HIGH",
  };

  const createdComplaint = await post("/complaints", complaintPayload, staffToken);
  assert(createdComplaint._id, "Complaint must return _id");
  assert(createdComplaint.complaintId, "Complaint must have sequential complaintId");
  assert(createdComplaint.status === "OPEN", "Initial complaint status must be OPEN");
  assert(String(createdComplaint.equipmentId?._id || createdComplaint.equipmentId) === String(createdEq._id), "Complaint must be linked to equipment");
  console.log(`  ✓ Complaint Created: ${createdComplaint.complaintId} [Status: ${createdComplaint.status}]`);

  // Verify Complaint in MongoDB
  const dbComplaint = await Complaint.findById(createdComplaint._id);
  assert(dbComplaint, "Complaint must be stored in MongoDB");
  assert(String(dbComplaint.reportedBy) === String(staffUser._id), "Complaint must store reportedBy staff user reference");
  console.log(`  ✓ Verified Complaint stored in MongoDB with correct ObjectId relationships`);

  // Verify Complaint appears in Equipment History API
  const eqHistory = await get(`/equipment/${createdEq._id}/history`, adminToken);
  const histComplaint = (eqHistory.complaints || []).find(c => String(c._id) === String(createdComplaint._id));
  assert(histComplaint, "Complaint must appear in Equipment History");
  console.log(`  ✓ Complaint appears in Equipment History`);

  // TEST 3: Admin Reviews and Assigns Biomedical Engineer
  console.log("\n------------------------------------------------------------------------");
  console.log(`[TEST 3] Admin Assigns Complaint to Biomedical Engineer (${engUserA.name})...`);
  const assignedComplaint = await patch(`/complaints/${createdComplaint._id}/assign`, {
    engineerId: engUserA._id.toString(),
  }, adminToken);

  assert(assignedComplaint.status === "ASSIGNED", `Complaint status must become ASSIGNED, got ${assignedComplaint.status}`);
  assert(String(assignedComplaint.assignedEngineerId?._id || assignedComplaint.assignedEngineerId) === String(engUserA._id), "Assigned engineer ID must be saved");
  console.log(`  ✓ Assignment saved in MongoDB. Status: ${assignedComplaint.status}, Assigned Engineer: ${engUserA.name}`);

  // Verify linked WorkOrder was created/updated in MongoDB
  const dbWorkOrder = await WorkOrder.findOne({ complaintId: createdComplaint._id });
  assert(dbWorkOrder, "WorkOrder must exist and be linked to complaint");
  assert(String(dbWorkOrder.engineerId) === String(engUserA._id), "WorkOrder must be assigned to Engineer A");
  console.log(`  ✓ WorkOrder ${dbWorkOrder.workOrderId} linked to Complaint and assigned to Engineer`);

  // TEST 4: Engineer User Sees Assigned Task in Queue & Strict Isolation
  console.log("\n------------------------------------------------------------------------");
  console.log("[TEST 4] Biomedical Engineer Assigned Tasks Query & Isolation...");
  const engTasksA = await get("/engineers/me/work-orders", engTokenA);
  const myTaskA = (engTasksA.items || engTasksA).find(t => String(t._id) === String(dbWorkOrder._id));
  assert(myTaskA, "Assigned task must appear in Engineer A's GET /api/engineers/me/work-orders queue");
  console.log(`  ✓ Engineer A confirms task: ${myTaskA.workOrderId} [${myTaskA.title}] Priority: ${myTaskA.priority}`);

  if (String(engUserA._id) !== String(engUserB._id)) {
    const engTasksB = await get("/engineers/me/work-orders", engTokenB);
    const taskFoundInB = (engTasksB.items || engTasksB).find(t => String(t._id) === String(dbWorkOrder._id));
    assert(!taskFoundInB, "Engineer B must NOT see Engineer A's assigned task (Strict Isolation)");
    console.log(`  ✓ Verified Engineer B cannot see Engineer A's private tasks`);
  }

  // TEST 5: Engineer Starts Task Flow
  console.log("\n------------------------------------------------------------------------");
  console.log("[TEST 5] Engineer Starts Maintenance Task...");
  const startedWo = await post(`/work-orders/${dbWorkOrder._id}/start`, {
    initialCondition: "Flow sensor damaged",
    safetyPrecautions: "Device isolated from clinical line",
  }, engTokenA);

  const freshWo = await WorkOrder.findById(dbWorkOrder._id);
  const freshComp = await Complaint.findById(createdComplaint._id);
  const freshEq = await Equipment.findById(createdEq._id);
  const freshMaint = await Maintenance.findOne({ workOrderId: dbWorkOrder._id });

  assert(freshWo.status === "IN_PROGRESS", `WorkOrder status must be IN_PROGRESS, got ${freshWo.status}`);
  assert(freshComp.status === "MAINTENANCE_IN_PROGRESS", `Complaint status must be MAINTENANCE_IN_PROGRESS, got ${freshComp.status}`);
  assert(freshEq.status === "UNDER_MAINTENANCE", `Equipment status must be UNDER_MAINTENANCE, got ${freshEq.status}`);
  assert(freshMaint, "Maintenance record must be created");
  console.log(`  ✓ Multi-Entity Status Cascade Verified:`);
  console.log(`    - WorkOrder: ${freshWo.status}`);
  console.log(`    - Complaint: ${freshComp.status}`);
  console.log(`    - Equipment: ${freshEq.status}`);
  console.log(`    - Maintenance: ${freshMaint.status}`);

  // TEST 6: Engineer Checklist & Complete Task Flow
  console.log("\n------------------------------------------------------------------------");
  console.log("[TEST 6] Engineer Completes Maintenance & Resolves Complaint...");
  
  // Step 6a: Checklist execution
  const clData = await get(`/maintenance/${freshMaint._id}/checklist`, engTokenA);
  const questions = clData.questions || [];
  if (questions.length > 0) {
    const answers = questions.map((q) => ({
      questionId: q._id,
      response: "PASS",
      notes: "Verified within manufacturer tolerance",
    }));
    await post(`/maintenance/${freshMaint._id}/checklist`, { answers }, engTokenA);
    console.log(`  ✓ Submitted ${answers.length} checklist questions to MongoDB`);
  }

  // Step 6b: Investigation & Service Report
  await post(`/maintenance/${freshMaint._id}/investigation`, {
    rootCause: "Flow sensor contaminated with moisture and particulate buildup",
    correctiveAction: "Replaced flow sensor cartridge, ran self-test and leak compliance check",
  }, engTokenA);
  console.log(`  ✓ Investigation root cause filed`);

  await post(`/maintenance/${freshMaint._id}/service-report`, {
    problem: "Flow sensor failure",
    diagnosticFindings: "Replaced sensor with OEM kit",
    finalCondition: "OPERATIONAL",
    engineerRemarks: "All alarms cleared, verified operational.",
  }, engTokenA);
  console.log(`  ✓ Service report generated and attached`);

  // Step 6c: Submit complete maintenance
  const completedMaint = await post(`/maintenance/${freshMaint._id}/complete`, {
    finalCondition: "OPERATIONAL",
    remarks: "Replaced flow sensor assembly, verified leak tightness and compliance across all ventilation modes.",
    verification: { safetyVerified: true, performanceVerified: true },
  }, engTokenA);

  const finalMaint = await Maintenance.findById(freshMaint._id);
  const finalWo = await WorkOrder.findById(dbWorkOrder._id);
  const finalEq = await Equipment.findById(createdEq._id);
  const finalComp = await Complaint.findById(createdComplaint._id);

  assert(finalMaint.status === "COMPLETED", "Maintenance must be COMPLETED");
  assert(finalWo.status === "COMPLETED", "WorkOrder must be COMPLETED");
  assert(finalEq.status === "OPERATIONAL", "Equipment must be OPERATIONAL");
  assert(finalComp.status === "RESOLVED", "Complaint must be RESOLVED");
  assert(finalComp.resolution, "Complaint must have resolution note recorded");
  assert(finalComp.resolvedAt, "Complaint must have resolvedAt timestamp");

  console.log(`  ✓ Multi-Entity Completion Cascade Verified:`);
  console.log(`    - Maintenance: ${finalMaint.status}`);
  console.log(`    - WorkOrder: ${finalWo.status}`);
  console.log(`    - Equipment: ${finalEq.status}`);
  console.log(`    - Complaint: ${finalComp.status} (${finalComp.resolution})`);

  // TEST 7: Persistence and Refresh Verification
  console.log("\n------------------------------------------------------------------------");
  console.log("[TEST 7] Refresh & Cross-Role Database Persistence Check...");
  const staffView = await get(`/complaints/${createdComplaint._id}`, staffToken);
  const adminView = await get(`/complaints/${createdComplaint._id}`, adminToken);
  const eqFinalHistory = await get(`/equipment/${createdEq._id}/history`, adminToken);

  assert(staffView.status === "RESOLVED", "Staff must see complaint as RESOLVED");
  assert(adminView.status === "RESOLVED", "Admin must see complaint as RESOLVED");
  assert((eqFinalHistory.complaints || []).some(c => c.complaintId === createdComplaint.complaintId), "Complaint must persist in Equipment history");
  assert((eqFinalHistory.workOrders || []).some(w => w.workOrderId === dbWorkOrder.workOrderId), "WorkOrder must persist in Equipment history");

  console.log("  ✓ All data persists across Staff, Admin, Engineer and Equipment History");

  console.log("\n========================================================================");
  console.log("  ALL 7 END-TO-END FLOW AUDIT SCENARIOS PASSED WITH 100% SUCCESS!");
  console.log("========================================================================\n");
  } finally {
    serverProcess?.kill();
    await mongoose.disconnect();
  }
}

runAudit().catch(err => {
  console.error(err);
  process.exit(1);
});
