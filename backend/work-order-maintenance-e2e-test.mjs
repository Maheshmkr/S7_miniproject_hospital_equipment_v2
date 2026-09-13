import http from "http";
import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import assert from "node:assert/strict";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 5098;
const BASE_URL = `http://localhost:${PORT}`;

function httpRequest(method, urlPath, data = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlPath, BASE_URL);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        "Content-Type": "application/json",
      },
    };

    if (token) {
      options.headers["Authorization"] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => {
        let json = null;
        try {
          json = JSON.parse(body);
        } catch {
          json = body;
        }
        resolve({ status: res.statusCode, headers: res.headers, body: json });
      });
    });

    req.on("error", reject);

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

function wait(ms) {
  return new Promise((res) => setTimeout(res, ms));
}

async function runE2ETests() {
  console.log("=========================================================================");
  console.log(" MEDIXA — END-TO-END WORKFLOW & SECURITY TEST");
  console.log(" Complaint → Work Order → Assigned Task → Maintenance → Checklist → Complete");
  console.log("=========================================================================\n");

  console.log("[Setup] Resetting database to clean deterministic baseline...");
  const seedProcess = spawn("node", ["seed/seed.js"], { cwd: __dirname, stdio: "inherit" });
  await new Promise((res, rej) => {
    seedProcess.on("exit", (code) => (code === 0 ? res() : rej(new Error(`Seed failed with code ${code}`))));
  });

  console.log("[Setup] Booting test backend server on port " + PORT + "...");
  const serverProcess = spawn("node", ["server.js"], {
    cwd: __dirname,
    env: { ...process.env, PORT: String(PORT), NODE_ENV: "test" },
    stdio: "inherit",
  });

  let ready = false;
  for (let i = 0; i < 25; i++) {
    await wait(400);
    try {
      const health = await httpRequest("GET", "/api/health");
      if (health.status === 200) {
        ready = true;
        break;
      }
    } catch {
      // Waiting for server startup
    }
  }

  if (!ready) {
    serverProcess.kill();
    throw new Error("Server failed to start in time on port " + PORT);
  }
  console.log("✔ Backend test server is ready.\n");

  try {
    // 1. Authenticate Department Staff
    console.log("[1/18] TEST 1: Login as Department Staff (clara.whitfield@medixa.health)...");
    const staffLogin = await httpRequest("POST", "/api/auth/login", {
      email: "clara.whitfield@medixa.health",
      password: "Medixa#2026",
    });
    assert.equal(staffLogin.status, 200, "Staff login must succeed");
    const staffToken = staffLogin.body.data?.token || staffLogin.body.token;
    assert.ok(staffToken, "Staff token must be returned");
    console.log("✔ Staff authenticated successfully.");

    // 2. Fetch single equipment EQ-1001
    console.log("[2/18] TEST 2: Fetch single equipment EQ-1001 (Hamilton C6 ICU Ventilator)...");
    const eqRes = await httpRequest("GET", "/api/equipment", null, staffToken);
    assert.equal(eqRes.status, 200);
    const eqList = eqRes.body.data?.items || eqRes.body.data || [];
    assert.ok(eqList.length >= 1, "Equipment records must exist in database");
    const equip = eqList.find((e) => e.equipmentId === "EQ-1001");
    assert.ok(equip, "EQ-1001 must exist in the seeded database");
    assert.equal(equip.equipmentId, "EQ-1001");
    assert.equal(equip.name, "Hamilton C6 ICU Ventilator");
    assert.equal(equip.category, "Ventilator");
    console.log("✔ EQ-1001 verified: " + equip.name + " (" + equip.status + ")");

    // 3. Staff creates complaint against EQ-1001
    console.log("[3/18] TEST 3: Department Staff creates complaint against EQ-1001...");
    const complaintRes = await httpRequest(
      "POST",
      "/api/complaints",
      {
        equipmentId: equip._id,
        title: "Ventilator flow sensor calibration alarm",
        description: "Flow sensor failure alarm triggered during pre-use check. Proximal sensor needs calibration or replacement.",
        priority: "CRITICAL",
      },
      staffToken
    );
    assert.equal(complaintRes.status, 201, "Complaint creation must return 201");
    const complaint = complaintRes.body.data;
    assert.ok(complaint.complaintId, "Complaint ID must be generated");
    assert.equal(complaint.status, "OPEN", "Initial complaint status must be OPEN");
    assert.equal(String(complaint.equipmentId?._id || complaint.equipmentId), String(equip._id));
    console.log("✔ Complaint created: " + complaint.complaintId + " (Status: " + complaint.status + ")");

    // 4. Authenticate Admin
    console.log("[4/18] TEST 4: Login as Administrator (emilia.greene@medixa.health)...");
    const adminLogin = await httpRequest("POST", "/api/auth/login", {
      email: "emilia.greene@medixa.health",
      password: "Medixa#2026",
    });
    assert.equal(adminLogin.status, 200, "Admin login must succeed");
    const adminToken = adminLogin.body.data?.token || adminLogin.body.token;
    assert.ok(adminToken, "Admin token must be returned");
    console.log("✔ Admin authenticated successfully.");

    // 5. Fetch Engineer Daniel Okafor
    console.log("[5/18] TEST 5: Lookup Biomedical Engineer Daniel Okafor...");
    const engLookup = await httpRequest("GET", "/api/users?role=BIOMEDICAL_ENGINEER", null, adminToken);
    assert.equal(engLookup.status, 200);
    const engineers = engLookup.body.data?.items || engLookup.body.data || [];
    const daniel = engineers.find((u) => u.email === "daniel.okafor@medixa.health");
    assert.ok(daniel, "Daniel Okafor must exist");
    console.log("✔ Found engineer: " + daniel.name + " (ID: " + daniel._id + ")");

    // 6. Admin creates Work Order and assigns to Daniel Okafor
    console.log("[6/18] TEST 6: Admin creates Work Order linked to Complaint and assigns Daniel Okafor...");
    const woRes = await httpRequest(
      "POST",
      "/api/work-orders",
      {
        title: "Ventilator flow sensor inspection & calibration",
        equipmentId: equip._id,
        complaintId: complaint._id,
        engineerId: daniel._id,
        maintenanceType: "CORRECTIVE",
        priority: "CRITICAL",
        description: "Perform flow sensor diagnostic, check baseline flow, replace if defective.",
      },
      adminToken
    );
    assert.equal(woRes.status, 201, "Work Order creation must return 201");
    const workOrder = woRes.body.data;
    assert.ok(workOrder.workOrderId, "Work Order ID must be generated");
    assert.equal(workOrder.status, "ASSIGNED", "Initial work order status must be ASSIGNED");
    assert.equal(String(workOrder.engineerId), String(daniel._id), "Assigned engineer must match Daniel");
    assert.equal(String(workOrder.complaintId), String(complaint._id), "Complaint ID must be linked");
    console.log("✔ Work order created: " + workOrder.workOrderId + " assigned to Daniel Okafor");

    // 7. Authenticate Daniel Okafor
    console.log("[7/18] TEST 7: Login as Biomedical Engineer Daniel Okafor...");
    const engLogin = await httpRequest("POST", "/api/auth/login", {
      email: "daniel.okafor@medixa.health",
      password: "Medixa#2026",
    });
    assert.equal(engLogin.status, 200, "Engineer login must succeed");
    const engToken = engLogin.body.data?.token || engLogin.body.token;
    assert.ok(engToken, "Engineer token must be returned");
    console.log("✔ Engineer Daniel Okafor logged in.");

    // 8. Engineer fetches assigned tasks
    console.log("[8/18] TEST 8: Engineer fetches Assigned Tasks (/api/work-orders)...");
    const tasksRes = await httpRequest("GET", "/api/work-orders", null, engToken);
    assert.equal(tasksRes.status, 200);
    const taskItems = tasksRes.body.data?.items || tasksRes.body.data || [];
    const assignedWo = taskItems.find((w) => w._id === workOrder._id || w.workOrderId === workOrder.workOrderId);
    assert.ok(assignedWo, "Work order must appear in Engineer's task list");
    assert.equal(assignedWo.status, "ASSIGNED");
    console.log("✔ Assigned task verified in Engineer list: " + assignedWo.workOrderId + " · " + assignedWo.title);

    // 9. Start Maintenance
    console.log("[9/18] TEST 9: Engineer starts Maintenance on Work Order...");
    const startRes = await httpRequest("POST", `/api/work-orders/${workOrder._id}/start`, {}, engToken);
    assert.equal(startRes.status, 200, "Start work order must return 200");
    const startData = startRes.body.data;
    assert.equal(startData.workOrder.status, "IN_PROGRESS");
    assert.ok(startData.maintenance, "Maintenance document must be created/returned");
    const maintenanceId = startData.maintenance._id;
    console.log("✔ Work order moved to IN_PROGRESS. Maintenance ID: " + startData.maintenance.maintenanceId);

    // 10. Idempotency test on start
    console.log("[10/18] TEST 10: Idempotency check — starting maintenance again returns existing record...");
    const startAgainRes = await httpRequest("POST", `/api/work-orders/${workOrder._id}/start`, {}, engToken);
    assert.equal(startAgainRes.status, 200);
    assert.equal(String(startAgainRes.body.data.maintenance._id), String(maintenanceId));
    console.log("✔ Idempotency verified: exactly one maintenance record active.");

    // 11. Fetch Checklist from MongoDB
    console.log("[11/18] TEST 11: Fetch Checklist for Maintenance record...");
    const checklistRes = await httpRequest("GET", `/api/maintenance/${maintenanceId}/checklist`, null, engToken);
    assert.equal(checklistRes.status, 200);
    const questions = checklistRes.body.data?.questions || [];
    assert.ok(questions.length > 0, "Checklist questions must be returned from MongoDB");
    const flowSensorQ = questions.find((q) => q.question.includes("flow sensor"));
    assert.ok(flowSensorQ, "Checklist must contain the required flow sensor question");
    assert.equal(flowSensorQ.required, true, "Flow sensor question must be required");
    assert.equal(flowSensorQ.priority, "CRITICAL", "Flow sensor question priority must be CRITICAL");
    console.log("✔ Checklist question loaded from DB: \"" + flowSensorQ.question + "\"");

    // 12. Negative Test: Attempt complete before checklist / service report
    console.log("[12/18] TEST 12: Negative Test — Attempt completion before completing workflow requirements...");
    const prematureComplete = await httpRequest(
      "POST",
      `/api/maintenance/${maintenanceId}/complete`,
      { verification: { safetyVerified: true } },
      engToken
    );
    assert.equal(prematureComplete.status, 422, "Premature completion must be rejected with 422");
    console.log("✔ Premature completion correctly blocked by backend gate: " + prematureComplete.body.message);

    // 13. Submit Checklist response (PASS)
    console.log("[13/18] TEST 13: Engineer submits PASS for checklist questions...");
    const submitChecklistRes = await httpRequest(
      "POST",
      `/api/maintenance/${maintenanceId}/checklist`,
      {
        answers: questions.map((q) => ({
          questionId: q._id,
          response: "PASS",
          notes: String(q._id) === String(flowSensorQ._id)
            ? "Flow sensor calibrated per manufacturer baseline, zero drift within 0.2%"
            : "Verification test passed per hospital protocol",
        })),
      },
      engToken
    );
    assert.equal(submitChecklistRes.status, 200, "Checklist submission must succeed");
    console.log("✔ Checklist response recorded in MongoDB.");

    // 14. Submit Investigation / Diagnostics
    console.log("[14/18] TEST 14: Engineer records diagnostic findings and corrective action...");
    const invRes = await httpRequest(
      "POST",
      `/api/maintenance/${maintenanceId}/investigation`,
      {
        problemObserved: "Intermittent baseline flow alarm",
        diagnosticFindings: "Slight residue on flow sensor mesh. Cleaned and recalibrated.",
        rootCause: "Minor sensor surface contamination",
        correctiveAction: "Cleaned mesh, verified zero calibration and pressure baseline.",
      },
      engToken
    );
    assert.equal(invRes.status, 200, "Investigation submission must succeed");
    console.log("✔ Investigation persisted in MongoDB.");

    // 15. Submit Service Report
    console.log("[15/18] TEST 15: Engineer drafts and submits Service Report...");
    const reportRes = await httpRequest(
      "POST",
      `/api/maintenance/${maintenanceId}/service-report`,
      {
        problem: "Ventilator flow sensor calibration alarm",
        diagnosticFindings: "Cleaned sensor and calibrated zero-point offset.",
        testResult: "Earth resistance 0.11 Ω · Leakage NC 42 µA · Flow curve verified normal.",
        finalCondition: "OPERATIONAL",
        engineerRemarks: "Device passed all diagnostic self-checks and is safe for clinical operation.",
        status: "SUBMITTED",
      },
      engToken
    );
    assert.equal(reportRes.status, 201, "Service report submission must succeed");
    const report = reportRes.body.data;
    console.log("✔ Service report created: " + report.serviceReportId);

    // 16. Complete Maintenance
    console.log("[16/18] TEST 16: Engineer completes maintenance workflow...");
    const completeRes = await httpRequest(
      "POST",
      `/api/maintenance/${maintenanceId}/complete`,
      {
        finalCondition: "OPERATIONAL",
        remarks: "Maintenance and calibration complete. Returned to ICU service.",
        verification: { safetyVerified: true, performanceVerified: true },
      },
      engToken
    );
    assert.equal(completeRes.status, 200, "Maintenance completion must return 200");
    console.log("✔ Maintenance completed successfully.");

    // 17. Verify status cascade in database
    console.log("[17/18] TEST 17: Verifying status cascade in MongoDB...");
    const [finalMaintRes, finalWoRes, finalEqRes, finalCompRes] = await Promise.all([
      httpRequest("GET", `/api/maintenance/${maintenanceId}`, null, adminToken),
      httpRequest("GET", `/api/work-orders/${workOrder._id}`, null, adminToken),
      httpRequest("GET", `/api/equipment/${equip._id}`, null, adminToken),
      httpRequest("GET", `/api/complaints/${complaint._id}`, null, adminToken),
    ]);

    const finalMaint = finalMaintRes.body.data.maintenance || finalMaintRes.body.data;
    const finalWo = finalWoRes.body.data.workOrder || finalWoRes.body.data;
    const finalEq = finalEqRes.body.data;
    const finalComp = finalCompRes.body.data;

    assert.equal(finalMaint.status, "COMPLETED", "Maintenance must be COMPLETED");
    assert.equal(finalWo.status, "COMPLETED", "Work Order must be COMPLETED");
    assert.equal(finalEq.status, "OPERATIONAL", "Equipment must be OPERATIONAL");
    assert.equal(finalComp.status, "RESOLVED", "Complaint must be RESOLVED");

    console.log("✔ Final Status Cascade Verified:");
    console.log("   • Maintenance:  " + finalMaint.status);
    console.log("   • Work Order:   " + finalWo.status);
    console.log("   • Equipment:    " + finalEq.status);
    console.log("   • Complaint:    " + finalComp.status);

    // 18. Security Role Test: Staff cannot access engineer-only maintenance complete
    console.log("[18/18] TEST 18: Security Test — Department Staff cannot complete maintenance...");
    const staffUnauthorized = await httpRequest(
      "POST",
      `/api/maintenance/${maintenanceId}/complete`,
      { verification: { safetyVerified: true } },
      staffToken
    );
    assert.equal(staffUnauthorized.status, 403, "Staff must receive 403 Forbidden");
    console.log("✔ Role security enforced (403 Forbidden).");

    console.log("\n=========================================================================");
    console.log(" ALL 18 AUTOMATED E2E TESTS PASSED SUCCESSFULLY! ✔");
    console.log("=========================================================================");
  } finally {
    serverProcess.kill();
  }
}

runE2ETests().catch((err) => {
  console.error("\n❌ E2E TEST FAILED:", err);
  process.exit(1);
});
