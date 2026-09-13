import { setupTestDb } from "./test-db-helper.js";
import assert from "node:assert/strict";

await setupTestDb("hospital_equipment_complaint_test");
process.env.JWT_SECRET = "test-only-secret-complaint-2026";
process.env.PORT = "5095";

const { default: app } = await import("./server.js");
await new Promise((r) => setTimeout(r, 2000));
const B = "http://localhost:5095";

const req = async (path, options = {}) => {
  const res = await fetch(B + path, options);
  const json = await res.json().catch(() => null);
  return { status: res.status, ok: res.ok, body: json };
};

console.log("=== STARTING PHASE 4: COMPLAINT INTEGRATION TEST SUITE ===");

// 1. Health check
const health = await req("/api/health");
assert.equal(health.status, 200);
console.log("✔ /api/health ok");

// 2. Register Admin
const adminReg = await req("/api/auth/register", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    name: "Emilia Greene",
    email: "admin@medixa.health",
    password: "AdminPassword#2026",
    role: "ADMINISTRATOR",
    employeeId: "ADM-001",
  }),
});
assert.equal(adminReg.status, 201);
const adminToken = adminReg.body.data.token;
const adminHeaders = { "content-type": "application/json", authorization: `Bearer ${adminToken}` };

// 3. Create Departments (ICU and RAD)
const icuDept = await req("/api/departments", {
  method: "POST",
  headers: adminHeaders,
  body: JSON.stringify({ code: "ICU", name: "Intensive Care Unit", building: "Tower B", floor: "Level 4" }),
});
assert.equal(icuDept.status, 201);
const icuId = icuDept.body.data._id;

const radDept = await req("/api/departments", {
  method: "POST",
  headers: adminHeaders,
  body: JSON.stringify({ code: "RAD", name: "Radiology", building: "Tower A", floor: "Level 2" }),
});
assert.equal(radDept.status, 201);
const radId = radDept.body.data._id;
console.log("✔ Created ICU and RAD departments");

// 4. Register Staff and Engineer
const icuStaffReg = await req("/api/auth/register", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    name: "Marco Silva",
    email: "marco.silva@medixa.health",
    password: "StaffPassword#2026",
    role: "DEPARTMENT_STAFF",
    employeeId: "EMP-0104",
    departmentId: icuId,
  }),
});
assert.equal(icuStaffReg.status, 201);
const icuStaffToken = icuStaffReg.body.data.token;
const icuStaffHeaders = { "content-type": "application/json", authorization: `Bearer ${icuStaffToken}` };

const radStaffReg = await req("/api/auth/register", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    name: "Clara Whitfield",
    email: "clara.whitfield@medixa.health",
    password: "StaffPassword#2026",
    role: "DEPARTMENT_STAFF",
    employeeId: "EMP-0118",
    departmentId: radId,
  }),
});
assert.equal(radStaffReg.status, 201);
const radStaffToken = radStaffReg.body.data.token;
const radStaffHeaders = { "content-type": "application/json", authorization: `Bearer ${radStaffToken}` };

const engineerReg = await req("/api/auth/register", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    name: "Daniel Okafor",
    email: "daniel.okafor@medixa.health",
    password: "EngineerPassword#2026",
    role: "BIOMEDICAL_ENGINEER",
    employeeId: "EMP-0072",
  }),
});
assert.equal(engineerReg.status, 201);
const engineerId = engineerReg.body.data.user._id;
const engineerToken = engineerReg.body.data.token;
const engineerHeaders = { "content-type": "application/json", authorization: `Bearer ${engineerToken}` };
console.log("✔ Created ICU Staff, RAD Staff, and Biomedical Engineer");

// 5. Create Equipment EQ-2210 in ICU and EQ-1001 in RAD
const eq2210Res = await req("/api/equipment", {
  method: "POST",
  headers: adminHeaders,
  body: JSON.stringify({
    equipmentId: "EQ-2210",
    name: "Hamilton C6 ICU Ventilator",
    category: "Life Support",
    model: "HAMILTON-C6",
    serialNumber: "SN-C6-221045",
    departmentId: icuId,
    criticality: "CRITICAL",
  }),
});
assert.equal(eq2210Res.status, 201);
const eq2210DbId = eq2210Res.body.data._id;

const eq1001Res = await req("/api/equipment", {
  method: "POST",
  headers: adminHeaders,
  body: JSON.stringify({
    equipmentId: "EQ-1001",
    name: "GE SIGNA Premier 3T MRI Scanner",
    category: "Imaging",
    model: "SIGNA Premier 3T",
    serialNumber: "SN-SIGNA-100174",
    departmentId: radId,
    criticality: "CRITICAL",
  }),
});
assert.equal(eq1001Res.status, 201);
const eq1001DbId = eq1001Res.body.data._id;
console.log("✔ Registered EQ-2210 (ICU) and EQ-1001 (RAD)");

// 6. Test Create Complaint by ICU Staff for EQ-2210
const createCmpRes = await req("/api/complaints", {
  method: "POST",
  headers: icuStaffHeaders,
  body: JSON.stringify({
    equipmentId: eq2210DbId,
    title: "Ventilator flow sensor malfunction",
    description: "Flow sensor readings fluctuate during volume-controlled ventilation and the device raises intermittent flow alarms.",
    priority: "CRITICAL",
  }),
});
assert.equal(createCmpRes.status, 201);
assert.equal(createCmpRes.body.data.equipmentId._id, eq2210DbId);
assert.equal(createCmpRes.body.data.departmentId._id, icuId);
assert.equal(createCmpRes.body.data.status, "OPEN");
assert.equal(createCmpRes.body.data.priority, "CRITICAL");
const cmpId = createCmpRes.body.data.complaintId;
console.log(`✔ Complaint created: ${cmpId} correctly linked to EQ-2210, ICU department, and reporter`);

// 7. Test Department Staff Security (ICU staff cannot raise complaint on RAD equipment EQ-1001)
const crossDeptCreate = await req("/api/complaints", {
  method: "POST",
  headers: icuStaffHeaders,
  body: JSON.stringify({
    equipmentId: eq1001DbId,
    title: "Unauthorized MRI ticket",
    description: "ICU staff should not be able to raise a ticket for Radiology.",
    priority: "HIGH",
  }),
});
assert.equal(crossDeptCreate.status, 403);
console.log("✔ Department staff blocked from creating complaint for another department (403)");

// 8. Test Department Staff Read Scoping
const radStaffGetIcuCmp = await req(`/api/complaints/${cmpId}`, { headers: radStaffHeaders });
assert.equal(radStaffGetIcuCmp.status, 403);
console.log("✔ Department staff blocked from reading another department's complaint (403)");

const icuStaffList = await req("/api/complaints", { headers: icuStaffHeaders });
assert.equal(icuStaffList.status, 200);
assert.equal(icuStaffList.body.data.items.length, 1);
assert.equal(icuStaffList.body.data.items[0].complaintId, cmpId);
console.log("✔ ICU staff list correctly scoped to ICU complaints");

// 9. Test Admin Access & Population
const adminGetCmp = await req(`/api/complaints/${cmpId}`, { headers: adminHeaders });
assert.equal(adminGetCmp.status, 200);
assert.equal(adminGetCmp.body.data.equipmentId.name, "Hamilton C6 ICU Ventilator");
assert.equal(adminGetCmp.body.data.departmentId.name, "Intensive Care Unit");
assert.equal(adminGetCmp.body.data.reportedBy.name, "Marco Silva");
console.log("✔ Admin GET /api/complaints/:id populated equipment, department, and reporter");

// 10. Test Search & Filters
const searchRes = await req("/api/complaints?search=sensor", { headers: adminHeaders });
assert.equal(searchRes.status, 200);
assert.equal(searchRes.body.data.items.length, 1);
assert.equal(searchRes.body.data.items[0].complaintId, cmpId);

const filterPriority = await req("/api/complaints?priority=CRITICAL", { headers: adminHeaders });
assert.equal(filterPriority.status, 200);
assert.equal(filterPriority.body.data.items.length, 1);

const filterDept = await req(`/api/complaints?departmentId=${icuId}`, { headers: adminHeaders });
assert.equal(filterDept.status, 200);
assert.equal(filterDept.body.data.items.length, 1);
console.log("✔ Complaint search and filtering verified");

// 11. Test Assign Complaint to Engineer
const assignRes = await req(`/api/complaints/${cmpId}/assign`, {
  method: "PATCH",
  headers: adminHeaders,
  body: JSON.stringify({ engineerId }),
});
assert.equal(assignRes.status, 200);
assert.equal(assignRes.body.data.assignedEngineerId._id, engineerId);
assert.equal(assignRes.body.data.status, "ASSIGNED");
console.log("✔ Assigned complaint to Biomedical Engineer, status transitioned to ASSIGNED");

// 12. Test Valid Lifecycle Transitions (ASSIGNED -> INVESTIGATION -> MAINTENANCE_IN_PROGRESS)
const status1 = await req(`/api/complaints/${cmpId}/status`, {
  method: "PATCH",
  headers: engineerHeaders,
  body: JSON.stringify({ status: "INVESTIGATION" }),
});
assert.equal(status1.status, 200);
assert.equal(status1.body.data.status, "INVESTIGATION");

const status2 = await req(`/api/complaints/${cmpId}/status`, {
  method: "PATCH",
  headers: engineerHeaders,
  body: JSON.stringify({ status: "MAINTENANCE_IN_PROGRESS" }),
});
assert.equal(status2.status, 200);
assert.equal(status2.body.data.status, "MAINTENANCE_IN_PROGRESS");
console.log("✔ Valid lifecycle transitions passed");

// 13. Test Invalid Status Transition Rejection (422)
const invalidStatus = await req(`/api/complaints/${cmpId}/status`, {
  method: "PATCH",
  headers: engineerHeaders,
  body: JSON.stringify({ status: "CLOSED" }), // Cannot jump directly from MAINTENANCE_IN_PROGRESS to CLOSED
});
assert.equal(invalidStatus.status, 422);
console.log("✔ Invalid status transition rejected with 422 Unprocessable Entity");

// 14. Test PUT /api/complaints/:id (edit fields)
const updateRes = await req(`/api/complaints/${cmpId}`, {
  method: "PUT",
  headers: adminHeaders,
  body: JSON.stringify({
    title: "Ventilator flow sensor malfunction (Updated details)",
    resolution: "Calibrated proximal flow sensor and ran 4-hour ventilation leak test.",
  }),
});
assert.equal(updateRes.status, 200);
assert.equal(updateRes.body.data.title, "Ventilator flow sensor malfunction (Updated details)");
assert.equal(updateRes.body.data.resolution, "Calibrated proximal flow sensor and ran 4-hour ventilation leak test.");
assert.equal(updateRes.body.data.priority, "CRITICAL"); // untouched preserved
console.log("✔ PUT /api/complaints/:id updated fields without erasing untouched properties");

// 15. Test Complaint History / Audit Trail
const historyRes = await req(`/api/complaints/${cmpId}/history`, { headers: adminHeaders });
assert.equal(historyRes.status, 200);
assert.equal(historyRes.body.data.events.length >= 3, true);
console.log("✔ Complaint history returned audit log entries");

// 16. Test DELETE Complaint
const tempCmp = await req("/api/complaints", {
  method: "POST",
  headers: adminHeaders,
  body: JSON.stringify({
    equipmentId: eq2210DbId,
    title: "Temporary test complaint",
    description: "Temporary complaint for deletion testing.",
  }),
});
assert.equal(tempCmp.status, 201);
const tempId = tempCmp.body.data.complaintId;

const delRes = await req(`/api/complaints/${tempId}`, { method: "DELETE", headers: adminHeaders });
assert.equal(delRes.status, 200);

const getDel = await req(`/api/complaints/${tempId}`, { headers: adminHeaders });
assert.equal(getDel.status, 404);
console.log("✔ DELETE /api/complaints/:id succeeded and verified 404 on subsequent get");

console.log("=== ALL PHASE 4 COMPLAINT INTEGRATION TESTS PASSED ===");
process.exit(0);
