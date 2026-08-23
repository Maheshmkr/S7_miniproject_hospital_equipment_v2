import { MongoMemoryServer } from "mongodb-memory-server";
import assert from "node:assert/strict";

const mem = await MongoMemoryServer.create();
process.env.MONGODB_URI = mem.getUri("hospital_equipment");
process.env.JWT_SECRET = "test-only-secret-2026";
process.env.PORT = "5098";

const { default: app } = await import("./server.js");
await new Promise((r) => setTimeout(r, 2000));
const B = "http://localhost:5098";

const req = async (path, options = {}) => {
  const res = await fetch(B + path, options);
  const json = await res.json().catch(() => null);
  return { status: res.status, ok: res.ok, body: json };
};

console.log("=== STARTING PHASE 2: USERS & DEPARTMENTS TEST SUITE ===");

// 1. Health check
const health = await req("/api/health");
assert.equal(health.status, 200, "Health check must return 200");
console.log("✔ /api/health ok");

// 2. Register Admin User
const adminReg = await req("/api/auth/register", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    name: "Admin Tester",
    email: "admin.tester@medixa.health",
    password: "AdminPassword#2026",
    role: "ADMINISTRATOR",
    employeeId: "ADM-001",
  }),
});
assert.equal(adminReg.status, 201, "Admin registration should return 201");
const adminToken = adminReg.body?.data?.token;
const adminId = adminReg.body?.data?.user?._id;
assert(adminToken, "Admin token must exist");
console.log("✔ Admin registration ok");

const authHeader = { Authorization: `Bearer ${adminToken}`, "content-type": "application/json" };

// 3. Register Staff User
const staffReg = await req("/api/auth/register", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    name: "Staff Tester",
    email: "staff.tester@medixa.health",
    password: "StaffPassword#2026",
    role: "DEPARTMENT_STAFF",
    employeeId: "STF-001",
  }),
});
const staffToken = staffReg.body?.data?.token;
const staffHeader = { Authorization: `Bearer ${staffToken}`, "content-type": "application/json" };
console.log("✔ Staff registration ok");

// 4. Test Role Protection on /api/users
const staffUsersAccess = await req("/api/users", { headers: staffHeader });
assert.equal(staffUsersAccess.status, 403, "Staff user should be forbidden from accessing /api/users");
console.log("✔ Role protection on /api/users enforced (403 for staff)");

// 5. Create Departments
const radDept = await req("/api/departments", {
  method: "POST",
  headers: authHeader,
  body: JSON.stringify({
    code: "RAD",
    name: "Radiology",
    building: "Tower A",
    floor: "Level 2",
    headName: "Dr. Alice Roy",
    contactEmail: "radiology@medixa.health",
    contactPhone: "+1 555-0100",
  }),
});
assert.equal(radDept.status, 201, "Radiology creation should return 201");
const radId = radDept.body?.data?._id;
console.log("✔ Department created: Radiology (RAD)");

const icuDept = await req("/api/departments", {
  method: "POST",
  headers: authHeader,
  body: JSON.stringify({
    code: "ICU",
    name: "Intensive Care Unit",
    building: "Tower B",
    floor: "Level 4",
    headName: "Dr. Peter Han",
    contactEmail: "icu@medixa.health",
  }),
});
assert.equal(icuDept.status, 201, "ICU creation should return 201");
const icuId = icuDept.body?.data?._id;
console.log("✔ Department created: Intensive Care Unit (ICU)");

// 6. Test Duplicate Department Code (409)
const dupDept = await req("/api/departments", {
  method: "POST",
  headers: authHeader,
  body: JSON.stringify({
    code: "RAD",
    name: "Duplicate Radiology",
  }),
});
assert.equal(dupDept.status, 409, "Duplicate department code should return 409");
console.log("✔ Duplicate department code rejected (409)");

// 7. List Departments
const deptList = await req("/api/departments", { headers: authHeader });
assert.equal(deptList.status, 200);
assert.equal(deptList.body?.data?.length, 2);
console.log("✔ GET /api/departments returns 2 departments");

// 8. Get Department by ID and by Code
const deptById = await req(`/api/departments/${radId}`, { headers: authHeader });
assert.equal(deptById.status, 200);
assert.equal(deptById.body?.data?.name, "Radiology");

const deptByCode = await req("/api/departments/ICU", { headers: authHeader });
assert.equal(deptByCode.status, 200);
assert.equal(deptByCode.body?.data?.name, "Intensive Care Unit");
console.log("✔ GET /api/departments/:id resolves both ObjectId and code");

// 9. Update Department
const deptUpdate = await req(`/api/departments/${radId}`, {
  method: "PUT",
  headers: authHeader,
  body: JSON.stringify({
    floor: "Level 2 — East Wing",
  }),
});
assert.equal(deptUpdate.status, 200);
assert.equal(deptUpdate.body?.data?.floor, "Level 2 — East Wing");
console.log("✔ PUT /api/departments/:id updates department");

// 10. Create User as Admin with Department Reference
const newUser = await req("/api/users", {
  method: "POST",
  headers: authHeader,
  body: JSON.stringify({
    name: "Daniel Okafor",
    email: "daniel.okafor@medixa.health",
    password: "Password#123",
    role: "BIOMEDICAL_ENGINEER",
    employeeId: "EMP-0042",
    departmentId: icuId,
    phone: "+1 555-0042",
    title: "Senior Biomedical Engineer",
  }),
});
assert.equal(newUser.status, 201, "Create user should return 201");
const createdUserId = newUser.body?.data?._id;
assert.equal(newUser.body?.data?.departmentId?._id, icuId);
assert.equal(newUser.body?.data?.departmentId?.code, "ICU");
assert.equal(newUser.body?.data?.initials, "DO");
assert.equal(newUser.body?.data?.passwordHash, undefined, "passwordHash must not leak");
console.log("✔ POST /api/users created user with department relationship");

// 11. Duplicate User Email (409)
const dupUser = await req("/api/users", {
  method: "POST",
  headers: authHeader,
  body: JSON.stringify({
    name: "Daniel Duplicate",
    email: "daniel.okafor@medixa.health",
    password: "Password#123",
    role: "BIOMEDICAL_ENGINEER",
  }),
});
assert.equal(dupUser.status, 409, "Duplicate user email must return 409");
console.log("✔ Duplicate user email rejected (409)");

// 12. List Users with Search and Filters
const usersList = await req("/api/users?role=BIOMEDICAL_ENGINEER", { headers: authHeader });
assert.equal(usersList.status, 200);
assert.equal(usersList.body?.data?.items?.length, 1);
assert.equal(usersList.body?.data?.items[0]?.email, "daniel.okafor@medixa.health");

const searchUser = await req("/api/users?search=okafor", { headers: authHeader });
assert.equal(searchUser.status, 200);
assert.equal(searchUser.body?.data?.items?.length, 1);
console.log("✔ GET /api/users search & role filtering verified");

// 13. Get User Details
const userDetail = await req(`/api/users/${createdUserId}`, { headers: authHeader });
assert.equal(userDetail.status, 200);
assert.equal(userDetail.body?.data?.departmentId?.name, "Intensive Care Unit");
console.log("✔ GET /api/users/:id populated department details correctly");

// 14. Update User (Department change & title change, without overwriting password)
const userEdit = await req(`/api/users/${createdUserId}`, {
  method: "PUT",
  headers: authHeader,
  body: JSON.stringify({
    title: "Lead Biomedical Engineer",
    departmentId: "RAD", // test department resolution by code
  }),
});
assert.equal(userEdit.status, 200);
assert.equal(userEdit.body?.data?.title, "Lead Biomedical Engineer");
assert.equal(userEdit.body?.data?.departmentId?.code, "RAD");
console.log("✔ PUT /api/users/:id updated title and resolved department code to ObjectId");

// 15. Verify Login with original password still works after update
const loginVerify = await req("/api/auth/login", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    email: "daniel.okafor@medixa.health",
    password: "Password#123",
  }),
});
assert.equal(loginVerify.status, 200, "User should still be able to log in with original password");
console.log("✔ User password preserved during non-password edit");

// 16. Update User Status
const statusChange = await req(`/api/users/${createdUserId}/status`, {
  method: "PATCH",
  headers: authHeader,
  body: JSON.stringify({ status: "INACTIVE" }),
});
assert.equal(statusChange.status, 200);
assert.equal(statusChange.body?.data?.status, "INACTIVE");
console.log("✔ PATCH /api/users/:id/status updated status to INACTIVE");

// 17. Department Staff endpoint
const radStaff = await req(`/api/departments/${radId}/staff`, { headers: authHeader });
assert.equal(radStaff.status, 200);
assert(radStaff.body?.data?.some((u) => u._id === createdUserId), "Daniel should appear in Radiology staff");
console.log("✔ GET /api/departments/:id/staff returns linked staff");

// 18. Referential integrity: Department cannot be deleted if users are assigned
const deleteDeptFail = await req(`/api/departments/${radId}`, {
  method: "DELETE",
  headers: authHeader,
});
assert.equal(deleteDeptFail.status, 409, "Should prevent deleting department when users are assigned");
console.log("✔ Department delete protected against active user assignments (409)");

// 19. Self-deletion prevention
const selfDelete = await req(`/api/users/${adminId}`, {
  method: "DELETE",
  headers: authHeader,
});
assert.equal(selfDelete.status, 400, "Admin cannot delete own account");
console.log("✔ Self deletion prevented (400)");

// 20. Clean user deletion
const delUser = await req(`/api/users/${createdUserId}`, {
  method: "DELETE",
  headers: authHeader,
});
assert.equal(delUser.status, 200);
console.log("✔ DELETE /api/users/:id succeeded for unreferenced user");

// Now department can be deleted
const deleteDeptOk = await req(`/api/departments/${radId}`, {
  method: "DELETE",
  headers: authHeader,
});
assert.equal(deleteDeptOk.status, 200);
console.log("✔ DELETE /api/departments/:id succeeded after user deletion");

console.log("=== ALL PHASE 2 BACKEND TESTS PASSED SUCCESSFULLY ===");
process.exit(0);
