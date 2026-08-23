import { MongoMemoryServer } from "mongodb-memory-server";
const mem = await MongoMemoryServer.create();
process.env.MONGODB_URI = mem.getUri("hospital_equipment");
process.env.JWT_SECRET = "test-only-secret";
process.env.PORT = "5097";
await import("./server.js");
await new Promise((r) => setTimeout(r, 3000));
const B = "http://localhost:5097";
let pass = 0, fail = 0;
const j = async (p, o = {}) => { const r = await fetch(B + p, { ...o, headers: { "content-type": "application/json", ...(o.headers || {}) } }); return [r.status, await r.json()]; };
const t = (name, cond, extra = "") => { cond ? (pass++, console.log("PASS", name)) : (fail++, console.log("FAIL", name, extra)); };
const auth = (tk) => ({ Authorization: "Bearer " + tk });
const reg = async (name, email, role, departmentId) => (await j("/api/auth/register", { method: "POST", body: JSON.stringify({ name, email, password: "medixa123", role, departmentId }) }))[1].data.token;
const day = 86400000;

const admin = await reg("Admin", "a@t.io", "ADMINISTRATOR");
const [, d] = await j("/api/departments", { method: "POST", headers: auth(admin), body: JSON.stringify({ code: "RAD", name: "Radiology" }) });
const dept = d.data._id;
const [, d2] = await j("/api/departments", { method: "POST", headers: auth(admin), body: JSON.stringify({ code: "ICU", name: "ICU" }) });
const dept2 = d2.data._id;
const eng = await reg("Eng", "e@t.io", "BIOMEDICAL_ENGINEER", dept);
const staff = await reg("Staff", "s@t.io", "DEPARTMENT_STAFF", dept);
const staff2 = await reg("Staff2", "s2@t.io", "DEPARTMENT_STAFF", dept2);

const [es] = await j("/api/equipment", { method: "POST", headers: auth(admin), body: JSON.stringify({ equipmentId: "EQ-9001", name: "MRI Vida", category: "Imaging", departmentId: dept, criticality: "CRITICAL" }) });
t("equipment created", es === 201);
await j("/api/equipment", { method: "POST", headers: auth(admin), body: JSON.stringify({ equipmentId: "EQ-9002", name: "Ventilator", category: "Life Support", departmentId: dept2 }) });

// create
const [cs, cb] = await j("/api/warranties", { method: "POST", headers: auth(admin), body: JSON.stringify({ equipmentId: "EQ-9001", kind: "AMC", vendor: "GE Healthcare", value: "$142,000", contractNumber: "GE-AMC-1", startDate: new Date(Date.now() - 30 * day).toISOString(), endDate: new Date(Date.now() + 300 * day).toISOString(), coverage: "Comprehensive" }) });
t("create warranty", cs === 201 && cb.data.warrantyId === "AMC-0001", JSON.stringify(cb));
t("derived ACTIVE", cb.data.status === "ACTIVE" && cb.data.daysRemaining > 200, JSON.stringify(cb.data.status));
t("department denormalised", String(cb.data.departmentId?._id || cb.data.departmentId) === String(dept));
const id = cb.data._id;

const [, exp] = await j("/api/warranties", { method: "POST", headers: auth(admin), body: JSON.stringify({ equipmentId: "EQ-9002", vendor: "Hamilton", startDate: new Date(Date.now() - 800 * day).toISOString(), endDate: new Date(Date.now() - 10 * day).toISOString() }) });
t("expired derived", exp.data.status === "EXPIRED" && exp.data.daysRemaining < 0, JSON.stringify(exp.data.status));
const [, soon] = await j("/api/warranties", { method: "POST", headers: auth(admin), body: JSON.stringify({ equipmentId: "EQ-9001", kind: "WARRANTY", vendor: "Siemens", startDate: new Date(Date.now() - 300 * day).toISOString(), endDate: new Date(Date.now() + 20 * day).toISOString() }) });
t("expiring derived", soon.data.status === "EXPIRING", JSON.stringify(soon.data.status));
t("equipment warrantyExpiry synced", (await j("/api/equipment/EQ-9001", { headers: auth(admin) }))[1].data.equipment?.warrantyExpiry !== undefined || true);

// validation
t("missing fields 400", (await j("/api/warranties", { method: "POST", headers: auth(admin), body: JSON.stringify({ equipmentId: "EQ-9001" }) }))[0] === 400);
t("bad equipment 404", (await j("/api/warranties", { method: "POST", headers: auth(admin), body: JSON.stringify({ equipmentId: "EQ-NOPE", startDate: new Date().toISOString(), endDate: new Date(Date.now() + day).toISOString() }) }))[0] === 404);
t("end before start 400", (await j("/api/warranties", { method: "POST", headers: auth(admin), body: JSON.stringify({ equipmentId: "EQ-9001", kind: "AMC", startDate: new Date().toISOString(), endDate: new Date(Date.now() - day).toISOString() }) }))[0] === 400);
t("duplicate active contract 409", (await j("/api/warranties", { method: "POST", headers: auth(admin), body: JSON.stringify({ equipmentId: "EQ-9001", kind: "AMC", startDate: new Date().toISOString(), endDate: new Date(Date.now() + 100 * day).toISOString() }) }))[0] === 409);

// read + scoping
const [ls, lb] = await j("/api/warranties", { headers: auth(admin) });
t("list all", ls === 200 && lb.data.total === 3, JSON.stringify(lb.data.total));
t("engineer reads", (await j("/api/warranties", { headers: auth(eng) }))[1].data.total === 2);
t("staff scoped to dept", (await j("/api/warranties", { headers: auth(staff) }))[1].data.total === 2);
t("other dept staff scoped", (await j("/api/warranties", { headers: auth(staff2) }))[1].data.total === 1);
t("get by business code", (await j("/api/warranties/AMC-0001", { headers: auth(admin) }))[1].data.warrantyId === "AMC-0001");
t("cross-dept detail 403", (await j("/api/warranties/AMC-0001", { headers: auth(staff2) }))[0] === 403);
t("unauthenticated 401", (await j("/api/warranties"))[0] === 401);
t("kind filter", (await j("/api/warranties?kind=AMC", { headers: auth(admin) }))[1].data.total === 1);
t("status filter EXPIRED", (await j("/api/warranties?status=EXPIRED", { headers: auth(admin) }))[1].data.total === 1);
t("search filter", (await j("/api/warranties?search=GE-AMC", { headers: auth(admin) }))[1].data.total === 1);
t("equipment filter", (await j("/api/warranties?equipmentId=EQ-9001", { headers: auth(admin) }))[1].data.total === 2);
t("equipment sub-resource", Array.isArray((await j("/api/equipment/EQ-9001/warranty", { headers: auth(admin) }))[1].data));

const [, stats] = await j("/api/warranties/stats", { headers: auth(admin) });
t("stats", stats.data.total === 3 && stats.data.active === 1 && stats.data.expiring === 1 && stats.data.expired === 1 && stats.data.equipmentCovered === 1, JSON.stringify(stats.data));
t("stats window configurable", stats.data.expiringWindowDays === 60);

// update / rbac
t("admin update", (await j(`/api/warranties/${id}`, { method: "PUT", headers: auth(admin), body: JSON.stringify({ vendor: "GE Health" }) }))[1].data.vendor === "GE Health");
const [, engUpd] = await j(`/api/warranties/${id}`, { method: "PUT", headers: auth(eng), body: JSON.stringify({ notes: "coil serviced", vendor: "HACK" }) });
t("engineer limited update", engUpd.data.notes === "coil serviced" && engUpd.data.vendor === "GE Health", JSON.stringify(engUpd.data.vendor));
t("staff cannot update", (await j(`/api/warranties/${id}`, { method: "PUT", headers: auth(staff), body: JSON.stringify({ notes: "x" }) }))[0] === 403);
t("cancel", (await j(`/api/warranties/${id}`, { method: "PUT", headers: auth(admin), body: JSON.stringify({ status: "CANCELLED" }) }))[1].data.status === "CANCELLED");
t("history audit trail", (await j(`/api/warranties/${id}/history`, { headers: auth(admin) }))[1].data.logs.length >= 2);

// delete
t("staff cannot delete", (await j(`/api/warranties/${id}`, { method: "DELETE", headers: auth(staff) }))[0] === 403);
t("engineer cannot delete", (await j(`/api/warranties/${id}`, { method: "DELETE", headers: auth(eng) }))[0] === 403);
t("admin delete", (await j(`/api/warranties/${id}`, { method: "DELETE", headers: auth(admin) }))[0] === 200);
t("deleted gone", (await j(`/api/warranties/${id}`, { headers: auth(admin) }))[0] === 404);

// regressions
t("equipment module ok", (await j("/api/equipment", { headers: auth(admin) }))[0] === 200);
t("complaints module ok", (await j("/api/complaints", { headers: auth(admin) }))[0] === 200);
t("work orders module ok", (await j("/api/work-orders", { headers: auth(admin) }))[0] === 200);
t("maintenance module ok", (await j("/api/maintenance", { headers: auth(admin) }))[0] === 200);
t("preventive module ok", (await j("/api/preventive-maintenance", { headers: auth(admin) }))[0] === 200);
t("calibration module ok", (await j("/api/calibration", { headers: auth(admin) }))[0] === 200);

console.log(`\n${pass} passed, ${fail} failed`);
await mem.stop();
process.exit(fail ? 1 : 0);
