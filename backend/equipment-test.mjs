import { setupTestDb } from "./test-db-helper.js";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";

await setupTestDb("hospital_equipment_equip_test");
process.env.JWT_SECRET = "test-only-secret-equipment-2026";
process.env.PORT = "5096";

const { default: app } = await import("./server.js");
await new Promise((r) => setTimeout(r, 2000));
const B = "http://localhost:5096";

const req = async (path, options = {}) => {
  const res = await fetch(B + path, options);
  const json = await res.json().catch(() => null);
  return { status: res.status, ok: res.ok, body: json };
};

console.log("=== STARTING PHASE 3: EQUIPMENT TEST SUITE ===");

// 1. Health check
const health = await req("/api/health");
assert.equal(health.status, 200, "Health check must return 200");
console.log("✔ /api/health ok");

// 2. Register Admin User
const adminReg = await req("/api/auth/register", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    name: "Emilia Greene",
    email: "emilia.greene@medixa.health",
    password: "AdminPassword#2026",
    role: "ADMINISTRATOR",
    employeeId: "ADM-001",
  }),
});
assert.equal(adminReg.status, 201);
const adminToken = adminReg.body.data.token;
const adminHeaders = {
  "content-type": "application/json",
  authorization: `Bearer ${adminToken}`,
};

// 3. Create ICU & Radiology departments
const icuDept = await req("/api/departments", {
  method: "POST",
  headers: adminHeaders,
  body: JSON.stringify({
    code: "ICU",
    name: "Intensive Care Unit",
    building: "Tower B",
    floor: "Level 4",
    headName: "Dr. Peter Han",
  }),
});
assert.equal(icuDept.status, 201);
const icuId = icuDept.body.data._id;

const radDept = await req("/api/departments", {
  method: "POST",
  headers: adminHeaders,
  body: JSON.stringify({
    code: "RAD",
    name: "Radiology",
    building: "Tower A",
    floor: "Level 2",
    headName: "Dr. Alice Roy",
  }),
});
assert.equal(radDept.status, 201);
const radId = radDept.body.data._id;
console.log("✔ Seeded ICU and RAD departments");

// 4. Register Department Staff in RAD
const staffReg = await req("/api/auth/register", {
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
assert.equal(staffReg.status, 201);
const staffToken = staffReg.body.data.token;
const staffHeaders = {
  "content-type": "application/json",
  authorization: `Bearer ${staffToken}`,
};

// 5. Register critical EQ-2210 Hamilton C6 ICU Ventilator
const create2210 = await req("/api/equipment", {
  method: "POST",
  headers: adminHeaders,
  body: JSON.stringify({
    equipmentId: "EQ-2210",
    name: "Hamilton C6 ICU Ventilator",
    category: "Life Support",
    manufacturer: "Hamilton Medical",
    model: "HAMILTON-C6",
    serialNumber: "SN-C6-221045",
    departmentId: icuId,
    location: "ICU · Level 4 · Bay 7",
    status: "UNDER_BREAKDOWN",
    criticality: "CRITICAL",
    healthScore: 71,
    purchaseDate: "2023-05-02",
    installationDate: "2023-06-11",
    cost: "$38,500",
  }),
});
assert.equal(create2210.status, 201);
assert.equal(create2210.body.data.equipmentId, "EQ-2210");
assert.equal(create2210.body.data.name, "Hamilton C6 ICU Ventilator");
assert.equal(create2210.body.data.departmentId._id, icuId);
assert.equal(create2210.body.data.departmentId.code, "ICU");
console.log("✔ EQ-2210 Hamilton C6 ICU Ventilator registered and linked to ICU");

// 6. Test GET /api/equipment/:id using EQ-2210
const get2210 = await req("/api/equipment/EQ-2210", { headers: adminHeaders });
assert.equal(get2210.status, 200);
assert.equal(get2210.body.data.name, "Hamilton C6 ICU Ventilator");
assert.equal(get2210.body.data.departmentId.name, "Intensive Care Unit");
assert.equal(get2210.body.data.departmentId.code, "ICU");
console.log("✔ GET /api/equipment/EQ-2210 populated department details");

// 7. Test POST /api/equipment with department code resolution
const createRadEquip = await req("/api/equipment", {
  method: "POST",
  headers: adminHeaders,
  body: JSON.stringify({
    equipmentId: "EQ-1001",
    name: "GE SIGNA Premier 3T MRI Scanner",
    category: "Imaging",
    manufacturer: "GE Healthcare",
    model: "SIGNA Premier 3T",
    serialNumber: "SN-SIGNA-100174",
    departmentId: "RAD", // resolved by code
    location: "Radiology · Level 2 · Scan Room B",
    status: "OPERATIONAL",
    criticality: "CRITICAL",
    cost: "$2.10M",
  }),
});
assert.equal(createRadEquip.status, 201);
assert.equal(createRadEquip.body.data.equipmentId, "EQ-1001");
assert.equal(createRadEquip.body.data.departmentId._id, radId);
console.log("✔ POST /api/equipment created asset and resolved department code 'RAD'");

// 8. Test duplicate equipmentId (409)
const dupIdRes = await req("/api/equipment", {
  method: "POST",
  headers: adminHeaders,
  body: JSON.stringify({
    equipmentId: "EQ-2210",
    name: "Duplicate Ventilator",
    category: "Life Support",
  }),
});
assert.equal(dupIdRes.status, 409);
console.log("✔ Duplicate equipmentId rejected with 409 Conflict");

// 9. Test duplicate serialNumber (409)
const dupSerialRes = await req("/api/equipment", {
  method: "POST",
  headers: adminHeaders,
  body: JSON.stringify({
    equipmentId: "EQ-9999",
    name: "Another Device",
    category: "Life Support",
    serialNumber: "SN-C6-221045", // duplicate of EQ-2210
  }),
});
assert.equal(dupSerialRes.status, 409);
console.log("✔ Duplicate serialNumber rejected with 409 Conflict");

// 10. Test Search and Filtering on GET /api/equipment
const searchRes = await req("/api/equipment?search=hamilton", { headers: adminHeaders });
assert.equal(searchRes.status, 200);
assert.equal(searchRes.body.data.items.length, 1);
assert.equal(searchRes.body.data.items[0].equipmentId, "EQ-2210");

const filterCategory = await req("/api/equipment?category=Imaging", { headers: adminHeaders });
assert.equal(filterCategory.status, 200);
assert.equal(filterCategory.body.data.items.length, 1);
assert.equal(filterCategory.body.data.items[0].equipmentId, "EQ-1001");

const filterDept = await req("/api/equipment?departmentId=ICU", { headers: adminHeaders });
assert.equal(filterDept.status, 200);
assert.equal(filterDept.body.data.items.length, 1);
assert.equal(filterDept.body.data.items[0].equipmentId, "EQ-2210");
console.log("✔ GET /api/equipment search and filtering verified");

// 11. Test PUT /api/equipment/:id (edit fields, resolve department name, preserve untouched)
const updateRes = await req("/api/equipment/EQ-1001", {
  method: "PUT",
  headers: adminHeaders,
  body: JSON.stringify({
    name: "GE SIGNA Premier 3T MRI Scanner (Upgraded)",
    location: "Radiology · Suite 2B",
    departmentId: "Radiology", // resolved by name
  }),
});
assert.equal(updateRes.status, 200);
assert.equal(updateRes.body.data.name, "GE SIGNA Premier 3T MRI Scanner (Upgraded)");
assert.equal(updateRes.body.data.location, "Radiology · Suite 2B");
assert.equal(updateRes.body.data.serialNumber, "SN-SIGNA-100174"); // untouched preserved
assert.equal(updateRes.body.data.departmentId._id, radId);
console.log("✔ PUT /api/equipment/:id updated fields without erasing untouched properties");

// 12. Test RBAC: Department staff scoping
const staffList = await req("/api/equipment", { headers: staffHeaders });
assert.equal(staffList.status, 200);
assert.equal(staffList.body.data.items.every((e) => (e.departmentId?._id || e.departmentId) === radId), true);

const staffBlocked = await req("/api/equipment/EQ-2210", { headers: staffHeaders });
assert.equal(staffBlocked.status, 403);
console.log("✔ Department staff RBAC properly scoped (403 for other departments' assets)");

// 13. Test DELETE unreferenced equipment
const createTemp = await req("/api/equipment", {
  method: "POST",
  headers: adminHeaders,
  body: JSON.stringify({
    equipmentId: "EQ-TEMP",
    name: "Temporary Pulse Oximeter",
    category: "Monitoring",
    serialNumber: "SN-TEMP-001",
  }),
});
assert.equal(createTemp.status, 201);

const deleteTemp = await req("/api/equipment/EQ-TEMP", {
  method: "DELETE",
  headers: adminHeaders,
});
assert.equal(deleteTemp.status, 200);

const getDeleted = await req("/api/equipment/EQ-TEMP", { headers: adminHeaders });
assert.equal(getDeleted.status, 404);
console.log("✔ DELETE /api/equipment/:id succeeded for unreferenced equipment");

console.log("=== ALL PHASE 3 EQUIPMENT BACKEND TESTS PASSED ===");
process.exit(0);
