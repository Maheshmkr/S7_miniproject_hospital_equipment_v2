import assert from "node:assert/strict";

const BASE_URL = "http://localhost:5000/api";

async function api(path, options = {}) {
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  const data = await res.json().catch(() => null);
  return { status: res.status, ok: res.ok, data };
}

async function runTest() {
  console.log("========================================================================");
  console.log("  SENIOR MERN STACK DEBUGGING — FULL END-TO-END VERIFICATION FLOW");
  console.log("========================================================================\n");

  // Step 1: Health check
  console.log("[STEP 1] Checking Backend API Health...");
  const health = await api("/health");
  assert.equal(health.status, 200, "Health endpoint returned non-200");
  assert.equal(health.data.data.database, "connected", "Database is not connected");
  console.log("  ✓ Backend API running on http://localhost:5000 with live MongoDB\n");

  // Step 2: Admin Login
  console.log("[STEP 2] Admin Login (Emilia Greene)...");
  const adminLogin = await api("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email: "emilia.greene@medixa.health", password: "Medixa#2026" }),
  });
  assert.equal(adminLogin.status, 200, "Admin login failed");
  const adminToken = adminLogin.data.data.token;
  const adminHeaders = { Authorization: `Bearer ${adminToken}` };
  console.log("  ✓ Admin logged in successfully\n");

  // Step 3: Admin Creates Equipment
  console.log("[STEP 3] Admin Creates New Equipment in MongoDB...");
  const timestamp = Date.now().toString().slice(-4);
  const equipPayload = {
    name: `Philips IntelliVue Patient Monitor MX${timestamp}`,
    category: "Monitoring",
    model: `MX-${timestamp}`,
    serialNumber: `SN-MX-${timestamp}`,
    location: "ICU / Bed 4",
    criticality: "HIGH",
    status: "ACTIVE",
    cost: "$18,500",
  };
  const equipRes = await api("/equipment", {
    method: "POST",
    headers: adminHeaders,
    body: JSON.stringify(equipPayload),
  });
  assert.equal(equipRes.status, 201, `Equipment creation failed: ${JSON.stringify(equipRes.data)}`);
  const equipment = equipRes.data.data;
  const equipmentId = equipment._id;
  const equipmentCode = equipment.equipmentId;
  console.log(`  ✓ Equipment Created: ${equipment.name} [ID: ${equipmentCode}]`);
  
  // Verify Equipment List & Detail
  const equipDetail = await api(`/equipment/${equipmentCode}`, { headers: adminHeaders });
  assert.equal(equipDetail.status, 200, "Equipment lookup failed");
  assert.equal(equipDetail.data.data.name, equipPayload.name);
  console.log("  ✓ Verified Equipment persisted in MongoDB and retrieved via API\n");

  // Step 4: Staff Login & Complaint Creation
  console.log("[STEP 4] Staff Login (Clara Whitfield) & Create Complaint...");
  const staffLogin = await api("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email: "clara.whitfield@medixa.health", password: "Medixa#2026" }),
  });
  assert.equal(staffLogin.status, 200, "Staff login failed");
  const staffToken = staffLogin.data.data.token;
  const staffHeaders = { Authorization: `Bearer ${staffToken}` };

  const compPayload = {
    equipmentId: equipmentId,
    title: `SpO2 Cable Disconnect Error on ${equipmentCode}`,
    description: "Display intermittently showing lead fault alarm. Needs probe replacement.",
    priority: "HIGH",
  };
  const compRes = await api("/complaints", {
    method: "POST",
    headers: staffHeaders,
    body: JSON.stringify(compPayload),
  });
  assert.equal(compRes.status, 201, `Complaint creation failed: ${JSON.stringify(compRes.data)}`);
  const complaint = compRes.data.data;
  const complaintId = complaint._id;
  const complaintCode = complaint.complaintId;
  console.log(`  ✓ Complaint Created: ${complaintCode} (Status: ${complaint.status}, Priority: ${complaint.priority})`);
  assert.match(complaintCode, /^CMP-\d{4}-\d{4}$/, "Complaint code has invalid format");
  console.log("  ✓ Complaint ID format verified: " + complaintCode + "\n");

  // Step 5: Admin Assigns Engineer to Complaint
  console.log("[STEP 5] Admin Assigns Biomedical Engineer (Daniel Okafor)...");
  // Get Engineer ID
  const engLogin = await api("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email: "daniel.okafor@medixa.health", password: "Medixa#2026" }),
  });
  assert.equal(engLogin.status, 200, "Engineer login failed");
  const engineerUser = engLogin.data.data.user;
  const engToken = engLogin.data.data.token;
  const engHeaders = { Authorization: `Bearer ${engToken}` };
  const engineerId = engineerUser._id;

  const assignRes = await api(`/complaints/${complaintCode}/assign`, {
    method: "PATCH",
    headers: adminHeaders,
    body: JSON.stringify({ engineerId }),
  });
  assert.equal(assignRes.status, 200, `Assignment failed: ${JSON.stringify(assignRes.data)}`);
  const assignedComp = assignRes.data.data;
  console.log(`  ✓ Complaint assigned to ${engineerUser.name}. Status: ${assignedComp.status}`);
  assert.equal(assignedComp.status, "ASSIGNED");
  assert.ok(assignedComp.workOrderId, "Work order link is missing from assigned complaint");
  const linkedWorkOrderId = typeof assignedComp.workOrderId === "object" ? assignedComp.workOrderId._id : assignedComp.workOrderId;
  console.log(`  ✓ Linked Work Order generated in MongoDB: ${linkedWorkOrderId}\n`);

  // Step 6: Engineer Views Assigned Tasks
  console.log("[STEP 6] Engineer (Daniel Okafor) queries Assigned Tasks (/api/engineers/me/work-orders)...");
  const myTasks = await api("/engineers/me/work-orders", { headers: engHeaders });
  assert.equal(myTasks.status, 200, "Failed to query engineer work orders");
  const tasks = myTasks.data.data.items;
  const myTask = tasks.find(t => String(t._id) === String(linkedWorkOrderId) || String(t.complaintId?._id || t.complaintId) === String(complaintId));
  assert.ok(myTask, "Assigned task was not found in Engineer's task list!");
  console.log(`  ✓ Task found in Engineer queue: ${myTask.workOrderId} [${myTask.title}] Status: ${myTask.status}`);
  assert.equal(myTask.status, "ASSIGNED");
  assert.equal(myTask.priority, "HIGH");
  console.log("  ✓ Verified: Engineer sees correct equipment, priority, and linked complaint\n");

  // Step 7: Engineer Starts Task
  console.log("[STEP 7] Engineer clicks 'Start Task' (POST /api/work-orders/:id/start)...");
  const startRes = await api(`/work-orders/${myTask._id}/start`, {
    method: "POST",
    headers: engHeaders,
    body: JSON.stringify({ initialCondition: "Faulty SpO2 connector pins observed." }),
  });
  assert.equal(startRes.status, 200, `Start work order failed: ${JSON.stringify(startRes.data)}`);
  console.log("  ✓ Task started successfully. Verifying multi-entity status cascades:");

  // Check WorkOrder status -> IN_PROGRESS
  const woCheck = await api(`/work-orders/${myTask._id}`, { headers: engHeaders });
  assert.equal(woCheck.data.data.workOrder.status, "IN_PROGRESS", "Work order status should be IN_PROGRESS");
  console.log("    -> Work Order: IN_PROGRESS");

  // Check Complaint status -> MAINTENANCE_IN_PROGRESS
  const compCheck = await api(`/complaints/${complaintCode}`, { headers: engHeaders });
  assert.equal(compCheck.data.data.status, "MAINTENANCE_IN_PROGRESS", "Complaint status should be MAINTENANCE_IN_PROGRESS");
  console.log("    -> Complaint: MAINTENANCE_IN_PROGRESS");

  // Check Equipment status -> UNDER_MAINTENANCE
  const equipCheck = await api(`/equipment/${equipmentCode}`, { headers: engHeaders });
  assert.equal(equipCheck.data.data.status, "UNDER_MAINTENANCE", "Equipment status should be UNDER_MAINTENANCE");
  console.log("    -> Equipment: UNDER_MAINTENANCE\n");

  // Step 8: Database Persistence & Cross-Role Refresh Verification
  console.log("[STEP 8] Verifying Database Persistence across all personas after actions...");
  const adminCompCheck = await api(`/complaints/${complaintCode}`, { headers: adminHeaders });
  assert.equal(adminCompCheck.data.data.status, "MAINTENANCE_IN_PROGRESS");
  
  const staffCompCheck = await api(`/complaints/${complaintCode}`, { headers: staffHeaders });
  assert.equal(staffCompCheck.data.data.status, "MAINTENANCE_IN_PROGRESS");
  console.log("  ✓ MongoDB state is consistent and persistent across Admin, Staff, and Engineer\n");

  console.log("========================================================================");
  console.log("  ALL END-TO-END CRITICAL FLOWS VERIFIED 100% OPERATIONAL");
  console.log("========================================================================\n");
}

runTest().catch((err) => {
  console.error("❌ E2E VERIFICATION FAILED:", err);
  process.exit(1);
});
