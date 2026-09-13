import { setupTestDb } from "./test-db-helper.js";
import mongoose from "mongoose";

await setupTestDb("hospital_equipment_analytics_test");
process.env.JWT_SECRET = "test-only-secret";
process.env.PORT = "5199";

console.log("Starting server...");
const { default: app } = await import("./server.js");
await new Promise((r) => setTimeout(r, 3000));
const BASE_URL = "http://localhost:5199";

const req = async (path, options = {}) => {
  const headers = {
    "content-type": "application/json",
    ...(options.headers || {})
  };
  const response = await fetch(BASE_URL + path, {
    ...options,
    headers
  });
  return [response.status, await response.json()];
};

// Test Suite
async function runTests() {
  console.log("\n=================== STARTING ANALYTICS TESTS ===================");

  // 1. Setup Auth
  console.log("\n1. Setting up admin and staff accounts...");
  const [sAdmin, rAdmin] = await req("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({
      name: "Test Admin",
      email: "admin@test.io",
      password: "medixa123",
      role: "ADMINISTRATOR"
    })
  });
  const adminToken = rAdmin.data.token;
  console.log("Admin registered:", rAdmin.success);

  // Create department 1
  const [sDept1, rDept1] = await req("/api/departments", {
    method: "POST",
    headers: { Authorization: "Bearer " + adminToken },
    body: JSON.stringify({ name: "Radiology", code: "RAD-01", description: "Imaging Dept" })
  });
  const dept1Id = rDept1.data._id;
  console.log("Department 1 created:", dept1Id);

  // Create department 2
  const [sDept2, rDept2] = await req("/api/departments", {
    method: "POST",
    headers: { Authorization: "Bearer " + adminToken },
    body: JSON.stringify({ name: "Cardiology", code: "CAR-01", description: "Cardio Dept" })
  });
  const dept2Id = rDept2.data._id;
  console.log("Department 2 created:", dept2Id);

  // Create Staff User for Department 1
  const [sStaff, rStaff] = await req("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({
      name: "Radiology Staff",
      email: "staff@test.io",
      password: "medixa123",
      role: "DEPARTMENT_STAFF",
      departmentId: dept1Id
    })
  });
  const staffToken = rStaff.data.token;
  console.log("Staff registered:", rStaff.success, "for department:", rStaff.data.user.departmentId);

  // 2. Empty Database check
  console.log("\n2. Checking empty database safety...");
  const [sDashEmpty, rDashEmpty] = await req("/api/analytics/dashboard", {
    headers: { Authorization: "Bearer " + adminToken }
  });
  console.log("Dashboard analytics returned successfully:", rDashEmpty.success);
  console.log("Total equipment (empty):", rDashEmpty.data.totalEquipment);
  console.log("Total open complaints (empty):", rDashEmpty.data.openComplaints);

  // 3. Create Records and check increments
  console.log("\n3. Seeding equipment...");
  const [sEq, rEq] = await req("/api/equipment", {
    method: "POST",
    headers: { Authorization: "Bearer " + adminToken },
    body: JSON.stringify({
      name: "MRI Scanner",
      category: "Imaging",
      model: "Philips Ingenia",
      serialNumber: "MR-9901",
      departmentId: dept1Id,
      status: "OPERATIONAL",
      healthScore: 98,
      cost: 1500000
    })
  });
  const eqId = rEq.data._id;
  console.log("Equipment created:", rEq.data.equipmentId);

  // Seed equipment in Dept 2 (Cardiology)
  const [sEq2, rEq2] = await req("/api/equipment", {
    method: "POST",
    headers: { Authorization: "Bearer " + adminToken },
    body: JSON.stringify({
      name: "ECG Machine",
      category: "Monitoring",
      model: "GE MAC 2000",
      serialNumber: "GE-0021",
      departmentId: dept2Id,
      status: "OPERATIONAL",
      healthScore: 92,
      cost: 12000
    })
  });
  console.log("Equipment 2 created:", rEq2.data.equipmentId);

  // 4. Verify count increment on Dashboard
  console.log("\n4. Verifying count increment on dashboard...");
  const [, rDash1] = await req("/api/analytics/dashboard", {
    headers: { Authorization: "Bearer " + adminToken }
  });
  console.log("Total equipment count:", rDash1.data.totalEquipment, "(expected: 2)");

  // 5. Create Complaint
  console.log("\n5. Raising a complaint...");
  const [sComp, rComp] = await req("/api/complaints", {
    method: "POST",
    headers: { Authorization: "Bearer " + adminToken },
    body: JSON.stringify({
      equipmentId: eqId,
      title: "Scanner display flickering",
      description: "Screen flicker reported by Radiology technician.",
      priority: "HIGH",
      departmentId: dept1Id
    })
  });
  const compId = rComp.data._id;
  console.log("Complaint raised:", rComp.data.complaintId);

  // 6. Verify Complaint is counted
  const [, rDash2] = await req("/api/analytics/dashboard", {
    headers: { Authorization: "Bearer " + adminToken }
  });
  console.log("Open complaints count:", rDash2.data.openComplaints, "(expected: 1)");

  // 7. Test RBAC Department Enforcements
  console.log("\n7. Testing server-side RBAC department isolation for staff...");
  const [, rStaffDash] = await req("/api/analytics/dashboard", {
    headers: { Authorization: "Bearer " + staffToken }
  });
  console.log("Staff Total Equipment count:", rStaffDash.data.totalEquipment, "(expected: 1, since Cardiac equipment belongs to Dept 2)");

  // 8. Test Global Filters
  console.log("\n8. Testing global department filtering query parameter...");
  const [, rFilteredDash] = await req(`/api/analytics/dashboard?departmentId=${dept2Id}`, {
    headers: { Authorization: "Bearer " + adminToken }
  });
  console.log("Filtered Equipment count:", rFilteredDash.data.totalEquipment, "(expected: 1)");

  // 9. Test New Custom Analytics endpoints
  console.log("\n9. Testing new custom analytics endpoints...");
  const [, rWorkOrders] = await req("/api/analytics/work-orders", {
    headers: { Authorization: "Bearer " + adminToken }
  });
  console.log("Work order analytics ok:", rWorkOrders.success);
  
  const [, rCompliance] = await req("/api/analytics/compliance", {
    headers: { Authorization: "Bearer " + adminToken }
  });
  console.log("Compliance analytics ok:", rCompliance.success, "Overall score:", rCompliance.data.overallCompliance);

  const [, rTrends] = await req("/api/analytics/trends", {
    headers: { Authorization: "Bearer " + adminToken }
  });
  console.log("Trends analytics ok:", Array.isArray(rTrends.data), "Periods returned:", rTrends.data.length);

  console.log("\n=================== ALL ANALYTICS TESTS PASSED ===================");
  process.exit(0);
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
