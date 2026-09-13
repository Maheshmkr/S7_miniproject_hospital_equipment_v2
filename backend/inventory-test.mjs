import { setupTestDb } from "./test-db-helper.js";
await setupTestDb("hospital_equipment_inv_test");
process.env.JWT_SECRET = "test-only-secret";
process.env.PORT = "5091";
await import("./server.js");
await new Promise((r) => setTimeout(r, 2000));
const B = "http://localhost:5091";
let pass = 0, fail = 0;
const j = async (p, o = {}) => {
  const r = await fetch(B + p, { ...o, headers: { "content-type": "application/json", ...(o.headers || {}) } });
  return [r.status, await r.json()];
};
const t = (name, cond, extra = "") => {
  cond ? (pass++, console.log("PASS:", name)) : (fail++, console.log("FAIL:", name, extra));
};
const auth = (tk) => ({ Authorization: "Bearer " + tk });
const reg = async (name, email, role, departmentId) =>
  (await j("/api/auth/register", { method: "POST", body: JSON.stringify({ name, email, password: "medixa123", role, departmentId }) }))[1].data.token;
const post = (p, tk, body) => j(p, { method: "POST", headers: auth(tk), body: JSON.stringify(body) });
const put = (p, tk, body) => j(p, { method: "PUT", headers: auth(tk), body: JSON.stringify(body) });
const patch = (p, tk, body) => j(p, { method: "PATCH", headers: auth(tk), body: JSON.stringify(body ?? {}) });
const getj = (p, tk) => j(p, { headers: auth(tk) });
const delj = (p, tk) => j(p, { method: "DELETE", headers: auth(tk) });

console.log("\n--- Setting up test users and department ---");
const admin = await reg("Admin User", "admin@medixa.io", "ADMINISTRATOR");
const [, d1] = await post("/api/departments", admin, { code: "RAD", name: "Radiology" });
const rad = d1.data._id;
const eng = await reg("Bio Engineer", "eng@medixa.io", "BIOMEDICAL_ENGINEER", rad);
const tech = await reg("Lab Tech", "tech@medixa.io", "TECHNICIAN", rad);
const staff = await reg("Dept Staff", "staff@medixa.io", "DEPARTMENT_STAFF", rad);

const [, ven] = await post("/api/vendors", admin, { name: "Siemens Healthineers", category: "MANUFACTURER" });
const vendorId = ven.data._id;

const [, eq] = await post("/api/equipment", admin, {
  name: "MAGNETOM Vida MRI 3T",
  category: "Radiology",
  departmentId: rad,
  vendorRef: vendorId,
});
const equipmentCode = eq.data.equipmentId;

console.log("\n--- Step 11: Inventory CRUD & Calculations ---");
const [c1s, c1b] = await post("/api/inventory", eng, {
  name: "MRI RF Coil Connector Cable",
  category: "SPARE_PARTS",
  itemType: "SPARE_PART",
  quantity: 20,
  unitCost: 150,
  minStockLevel: 5,
  reorderLevel: 8,
  unit: "PIECE",
  departmentId: rad,
  vendorId: vendorId,
  storageLocation: "Bay 2 - Shelf A",
});

t("Create inventory item status 201", c1s === 201, JSON.stringify(c1b));
t("Auto code assigned INV-0001", c1b.data?.itemId === "INV-0001", c1b.data?.itemId);
t("Total value calculated correctly (20 * 150 = 3000)", c1b.data?.totalValue === 3000, String(c1b.data?.totalValue));
t("Available quantity equals total quantity", c1b.data?.availableQuantity === 20, String(c1b.data?.availableQuantity));
t("Status is IN_STOCK", c1b.data?.status === "IN_STOCK", c1b.data?.status);

const invId = c1b.data.itemId;

// Stock receiving
console.log("\n--- Stock Receiving ---");
const [r1s, r1b] = await post(`/api/inventory/${invId}/receive`, eng, {
  quantity: 10,
  unitCost: 150,
  batchNumber: "BATCH-2026-A",
  reason: "PO Delivery receipt",
});
t("Receive stock 200", r1s === 200, JSON.stringify(r1b));
t("Quantity increased to 30", r1b.data?.item?.quantity === 30, String(r1b.data?.item?.quantity));
t("Available quantity increased to 30", r1b.data?.item?.availableQuantity === 30, String(r1b.data?.item?.availableQuantity));
t("Total value updated to 4500", r1b.data?.item?.totalValue === 4500, String(r1b.data?.item?.totalValue));
t("Movement created with type RECEIPT", r1b.data?.movement?.type === "RECEIPT", r1b.data?.movement?.type);

// Stock issuing
console.log("\n--- Stock Issuing & Negative Prevention ---");
const [i1s, i1b] = await post(`/api/inventory/${invId}/issue`, tech, {
  quantity: 5,
  equipmentId: equipmentCode,
  reason: "Replacement for MRI preventive maintenance",
});
t("Issue stock 200", i1s === 200, JSON.stringify(i1b));
t("Quantity decreased to 25", i1b.data?.item?.quantity === 25, String(i1b.data?.item?.quantity));
t("Movement created with type ISSUE", i1b.data?.movement?.type === "ISSUE", i1b.data?.movement?.type);

// Prevent over-issuing
const [i2s, i2b] = await post(`/api/inventory/${invId}/issue`, tech, {
  quantity: 100, // available is only 25
  reason: "Over-issue attempt",
});
t("Prevent over-issuing with 422", i2s === 422, String(i2s));

// Stock return
console.log("\n--- Stock Return ---");
const [retS, retB] = await post(`/api/inventory/${invId}/return`, tech, {
  quantity: 2,
  reason: "Surplus part returned to inventory",
});
t("Return stock 200", retS === 200, JSON.stringify(retB));
t("Quantity increased to 27", retB.data?.item?.quantity === 27, String(retB.data?.item?.quantity));

// Stock adjustment & Low Stock detection
console.log("\n--- Stock Adjustment & Low Stock Detection ---");
const [adjS, adjB] = await post(`/api/inventory/${invId}/adjust`, eng, {
  newQuantity: 6, // below reorder level (8)
  reason: "Annual audit count",
});
t("Adjust stock 200", adjS === 200, JSON.stringify(adjB));
t("Quantity updated to 6", adjB.data?.item?.quantity === 6, String(adjB.data?.item?.quantity));
t("Status transitioned to LOW_STOCK", adjB.data?.item?.status === "LOW_STOCK", adjB.data?.item?.status);

// Prevent negative stock adjustment
const [adjNegS] = await post(`/api/inventory/${invId}/adjust`, eng, {
  newQuantity: -5,
  reason: "Invalid negative adjustment",
});
t("Prevent negative stock adjustment", adjNegS === 400 || adjNegS === 422, String(adjNegS));

// Inventory stats and alerts
console.log("\n--- Inventory Stats & Alerts ---");
const [statS, statB] = await getj("/api/inventory/stats", eng);
t("Get inventory stats 200", statS === 200, JSON.stringify(statB));
t("Stats count total items >= 1", statB.data?.totalItems >= 1, String(statB.data?.totalItems));
t("Stats count low stock items >= 1", statB.data?.lowStockItems >= 1, String(statB.data?.lowStockItems));

const [alertS, alertB] = await getj("/api/inventory/alerts", eng);
t("Get low stock alerts 200", alertS === 200, JSON.stringify(alertB));
t("Low stock alert includes INV-0001", alertB.data?.lowStock?.some((i) => i.itemId === "INV-0001"), JSON.stringify(alertB.data?.lowStock));

// Inventory movements history
console.log("\n--- Inventory Movement History ---");
const [movS, movB] = await getj(`/api/inventory/${invId}/movements`, eng);
t("Get item movements 200", movS === 200, JSON.stringify(movB));
t("Movements history recorded (>= 4 events)", movB.data?.items?.length >= 4, String(movB.data?.items?.length));

// Step 12: Asset Lifecycle
console.log("\n--- Step 12: Asset Lifecycle ---");
const [lcS, lcB] = await patch(`/api/equipment/${equipmentCode}/lifecycle`, eng, {
  stage: "MAINTENANCE",
  reason: "Scheduled quarterly overhaul",
});
t("Equipment lifecycle transition 200", lcS === 200, JSON.stringify(lcB));
t("Equipment lifecycle stage updated to MAINTENANCE", lcB.data?.lifecycleStage === "MAINTENANCE", lcB.data?.lifecycleStage);
t("Lifecycle history recorded", lcB.data?.lifecycleHistory?.length >= 1, String(lcB.data?.lifecycleHistory?.length));

// Step 13: Notifications
console.log("\n--- Step 13: Notifications ---");
const [notifS, notifB] = await getj("/api/notifications", admin);
t("Get notifications 200", notifS === 200, JSON.stringify(notifB));
t("Dynamic alerts generated for low stock", notifB.data?.items?.some((n) => n.type === "LOW_INVENTORY_STOCK"), JSON.stringify(notifB.data?.items));

const [readAllS] = await patch("/api/notifications/read-all", admin);
t("Mark all notifications as read 200", readAllS === 200, String(readAllS));

// Step 14 & 15: Reports & Analytics & Exports
console.log("\n--- Step 14 & 15: Reports, Analytics & Exports ---");
const [repInvS, repInvB] = await getj("/api/reports/inventory", admin);
t("Inventory report 200", repInvS === 200, JSON.stringify(repInvB));

const csvRes = await fetch(B + "/api/reports/export/inventory", { headers: auth(admin) });
const csvText = await csvRes.text();
t("Export inventory CSV 200", csvRes.status === 200 && csvText.includes("Item ID"), csvText);

const [dashAnS, dashAnB] = await getj("/api/analytics/dashboard", admin);
t("Dashboard analytics includes inventory", dashAnS === 200 && dashAnB.data?.totalInventoryItems >= 1, JSON.stringify(dashAnB.data));

// Step 17: RBAC enforcement
console.log("\n--- Step 17: RBAC Enforcement ---");
const [staffAdjustS] = await post(`/api/inventory/${invId}/adjust`, staff, { newQuantity: 50 });
t("Department staff cannot adjust stock (403 forbidden)", staffAdjustS === 403, String(staffAdjustS));

const [techDeleteS] = await delj(`/api/inventory/${invId}`, tech);
t("Technician cannot delete inventory item (403 forbidden)", techDeleteS === 403, String(techDeleteS));

console.log(`\n========================================`);
console.log(`Inventory & Lifecycle Test Summary: ${pass} passed, ${fail} failed`);
console.log(`========================================\n`);

if (fail > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
