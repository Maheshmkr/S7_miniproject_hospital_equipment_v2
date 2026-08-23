import { MongoMemoryServer } from "mongodb-memory-server";
const mem = await MongoMemoryServer.create();
process.env.MONGODB_URI = mem.getUri("hospital_equipment");
process.env.JWT_SECRET = "test-only-secret";
process.env.PORT = "5098";
await import("./server.js");
await new Promise((r) => setTimeout(r, 3000));
const B = "http://localhost:5098";
let pass = 0, fail = 0;
const j = async (p, o = {}) => { const r = await fetch(B + p, { ...o, headers: { "content-type": "application/json", ...(o.headers || {}) } }); return [r.status, await r.json()]; };
const t = (name, cond, extra = "") => { cond ? (pass++, console.log("PASS", name)) : (fail++, console.log("FAIL", name, extra)); };
const auth = (tk) => ({ Authorization: "Bearer " + tk });
const reg = async (name, email, role, departmentId) => (await j("/api/auth/register", { method: "POST", body: JSON.stringify({ name, email, password: "medixa123", role, departmentId }) }))[1].data.token;
const day = 86400000;
const post = (p, tk, body) => j(p, { method: "POST", headers: auth(tk), body: JSON.stringify(body) });
const put = (p, tk, body) => j(p, { method: "PUT", headers: auth(tk), body: JSON.stringify(body) });

const admin = await reg("Admin", "a@t.io", "ADMINISTRATOR");
const [, d] = await post("/api/departments", admin, { code: "RAD", name: "Radiology" });
const dept = d.data._id;
const eng = await reg("Eng", "e@t.io", "BIOMEDICAL_ENGINEER", dept);
const staff = await reg("Staff", "s@t.io", "DEPARTMENT_STAFF", dept);

// ---------- create ----------
const [cs, cb] = await post("/api/vendors", admin, {
  name: "Siemens Healthineers", legalName: "Siemens Healthineers AG", category: "manufacturer",
  contactPerson: "Klaus Berger", email: "service@siemens.com", phone: "+49 9131 84 0",
  city: "Erlangen", state: "Bavaria", country: "Germany", specialization: "MRI, CT", rating: 5,
});
t("create vendor 201", cs === 201, JSON.stringify(cb));
t("auto vendor code VEN-0001", cb.data?.vendorId === "VEN-0001", JSON.stringify(cb.data?.vendorId));
t("category upper-cased", cb.data?.category === "MANUFACTURER");
t("default status ACTIVE", cb.data?.status === "ACTIVE");
const vid = cb.data._id;

const [, v2] = await post("/api/vendors", admin, { name: "GE Healthcare", category: "SERVICE_PROVIDER", city: "Chicago", rating: 4 });
t("second vendor VEN-0002", v2.data?.vendorId === "VEN-0002");
const [, v3] = await post("/api/vendors", admin, { name: "Hamilton Medical", category: "OTHER", status: "INACTIVE" });
t("explicit status honoured", v3.data?.status === "INACTIVE");

// ---------- validation ----------
t("missing name 400", (await post("/api/vendors", admin, { category: "OTHER" }))[0] === 400);
t("duplicate name 409", (await post("/api/vendors", admin, { name: "siemens healthineers" }))[0] === 409);
t("bad category 400", (await post("/api/vendors", admin, { name: "X Corp", category: "ROBOTS" }))[0] === 400);
t("bad status 400", (await post("/api/vendors", admin, { name: "Y Corp", status: "PAUSED" }))[0] === 400);
t("bad email 400", (await post("/api/vendors", admin, { name: "Z Corp", email: "not-an-email" }))[0] === 400);
t("bad phone 400", (await post("/api/vendors", admin, { name: "W Corp", phone: "abc" }))[0] === 400);
t("bad rating 400", (await post("/api/vendors", admin, { name: "R Corp", rating: 9 }))[0] === 400);

// ---------- RBAC ----------
t("unauthenticated list 401", (await j("/api/vendors"))[0] === 401);
t("engineer cannot create 403", (await post("/api/vendors", eng, { name: "Engineer Corp" }))[0] === 403);
t("staff cannot create 403", (await post("/api/vendors", staff, { name: "Staff Corp" }))[0] === 403);
t("staff can read", (await j("/api/vendors", { headers: auth(staff) }))[0] === 200);
t("engineer can read", (await j("/api/vendors", { headers: auth(eng) }))[0] === 200);
t("staff cannot update 403", (await put(`/api/vendors/VEN-0001`, staff, { notes: "hi" }))[0] === 403);
t("staff cannot delete 403", (await j("/api/vendors/VEN-0003", { method: "DELETE", headers: auth(staff) }))[0] === 403);
t("engineer cannot delete 403", (await j("/api/vendors/VEN-0003", { method: "DELETE", headers: auth(eng) }))[0] === 403);
t("engineer cannot patch status 403", (await j("/api/vendors/VEN-0003/status", { method: "PATCH", headers: auth(eng), body: JSON.stringify({ status: "ACTIVE" }) }))[0] === 403);

// ---------- list / filter / paginate ----------
const [ls, lb] = await j("/api/vendors", { headers: auth(admin) });
t("list all", ls === 200 && lb.data.total === 3, JSON.stringify(lb.data.total));
t("sorted by name", lb.data.items[0].name === "GE Healthcare", lb.data.items[0]?.name);
t("category filter", (await j("/api/vendors?category=MANUFACTURER", { headers: auth(admin) }))[1].data.total === 1);
t("status filter", (await j("/api/vendors?status=INACTIVE", { headers: auth(admin) }))[1].data.total === 1);
t("city filter", (await j("/api/vendors?city=erlangen", { headers: auth(admin) }))[1].data.total === 1);
t("specialization filter", (await j("/api/vendors?specialization=MRI", { headers: auth(admin) }))[1].data.total === 1);
t("search by code", (await j("/api/vendors?search=VEN-0002", { headers: auth(admin) }))[1].data.total === 1);
t("search by contact", (await j("/api/vendors?search=Berger", { headers: auth(admin) }))[1].data.total === 1);
t("pagination limit", (await j("/api/vendors?page=1&limit=2", { headers: auth(admin) }))[1].data.items.length === 2);
t("page 2", (await j("/api/vendors?page=2&limit=2", { headers: auth(admin) }))[1].data.items.length === 1);

// ---------- stats ----------
const [ss, sb] = await j("/api/vendors/stats", { headers: auth(admin) });
t("stats 200", ss === 200);
t("stats totals", sb.data.total === 3 && sb.data.active === 2 && sb.data.inactive === 1, JSON.stringify(sb.data));
t("stats byCategory", sb.data.byCategory.MANUFACTURER === 1);

// ---------- detail ----------
const [gs, gb] = await j("/api/vendors/VEN-0001", { headers: auth(admin) });
t("get by business code", gs === 200 && gb.data.vendor.vendorId === "VEN-0001");
t("get by object id", (await j(`/api/vendors/${vid}`, { headers: auth(admin) }))[1].data.vendor.vendorId === "VEN-0001");
t("detail includes references", Array.isArray(gb.data.warranties) && Array.isArray(gb.data.equipment));
t("unknown vendor 404", (await j("/api/vendors/VEN-9999", { headers: auth(admin) }))[0] === 404);

// ---------- update ----------
const [us, ub] = await put("/api/vendors/VEN-0002", admin, { contactPerson: "Dana Reyes", city: "Boston", rating: 3 });
t("admin update 200", us === 200 && ub.data.contactPerson === "Dana Reyes" && ub.data.city === "Boston");
const [es2, eb] = await put("/api/vendors/VEN-0002", eng, { notes: "Fast SLA", city: "Nowhere" });
t("engineer may annotate notes", es2 === 200 && eb.data.notes === "Fast SLA");
t("engineer cannot change city", eb.data.city === "Boston", eb.data.city);
t("vendorId immutable", (await put("/api/vendors/VEN-0002", admin, { vendorId: "VEN-XXXX" }))[1].data.vendorId === "VEN-0002");
t("rename clash 409", (await put("/api/vendors/VEN-0002", admin, { name: "Siemens Healthineers" }))[0] === 409);

// ---------- status ----------
const [ps, pb] = await j("/api/vendors/VEN-0003/status", { method: "PATCH", headers: auth(admin), body: JSON.stringify({ status: "SUSPENDED" }) });
t("status patch 200", ps === 200 && pb.data.status === "SUSPENDED");
t("bad status patch 400", (await j("/api/vendors/VEN-0003/status", { method: "PATCH", headers: auth(admin), body: JSON.stringify({ status: "NOPE" }) }))[0] === 400);

// ---------- audit trail ----------
const [hs, hb] = await j("/api/vendors/VEN-0003/history", { headers: auth(admin) });
t("history 200", hs === 200);
t("history logs created + status change", hb.data.logs.some((l) => l.action === "VENDOR_CREATED") && hb.data.logs.some((l) => l.action === "VENDOR_STATUS_CHANGED"), JSON.stringify(hb.data.logs.map((l) => l.action)));
t("history logs update", (await j("/api/vendors/VEN-0002/history", { headers: auth(admin) }))[1].data.logs.some((l) => l.action === "VENDOR_UPDATED"));

// ---------- warranty integration + backward compatibility ----------
await post("/api/equipment", admin, { equipmentId: "EQ-9001", name: "MRI Vida", category: "Imaging", departmentId: dept, criticality: "CRITICAL" });
const [ws, wb] = await post("/api/warranties", admin, { equipmentId: "EQ-9001", kind: "AMC", vendorId: "VEN-0001", startDate: new Date(Date.now() - day).toISOString(), endDate: new Date(Date.now() + 300 * day).toISOString() });
t("warranty accepts vendor code", ws === 201, JSON.stringify(wb));
t("warranty resolves vendor ref", String(wb.data.vendorId?._id || wb.data.vendorId) === String(vid), JSON.stringify(wb.data.vendorId));
t("warranty mirrors vendor name", wb.data.vendor === "Siemens Healthineers", wb.data.vendor);

const [lgs, lgb] = await post("/api/warranties", admin, { equipmentId: "EQ-9001", kind: "WARRANTY", vendor: "Unregistered Vendor Ltd", startDate: new Date(Date.now() - day).toISOString(), endDate: new Date(Date.now() + 100 * day).toISOString() });
t("legacy vendor string still accepted", lgs === 201 && lgb.data.vendor === "Unregistered Vendor Ltd", JSON.stringify(lgb));
t("legacy warranty has no vendor ref", !lgb.data.vendorId);
t("existing warranty list unbroken", (await j("/api/warranties", { headers: auth(admin) }))[1].data.total === 2);

// ---------- delete guards ----------
t("delete referenced vendor 409", (await j("/api/vendors/VEN-0001", { method: "DELETE", headers: auth(admin) }))[0] === 409);
const [, tmp] = await post("/api/vendors", admin, { name: "Temp Partner", category: "OTHER" });
t("delete unreferenced vendor 200", (await j(`/api/vendors/${tmp.data.vendorId}`, { method: "DELETE", headers: auth(admin) }))[0] === 200);
t("deleted vendor gone", (await j(`/api/vendors/${tmp.data.vendorId}`, { headers: auth(admin) }))[0] === 404);
t("delete unknown 404", (await j("/api/vendors/VEN-9999", { method: "DELETE", headers: auth(admin) }))[0] === 404);

// ---------- regression: other modules still respond ----------
t("equipment module ok", (await j("/api/equipment", { headers: auth(admin) }))[0] === 200);
t("complaints module ok", (await j("/api/complaints", { headers: auth(admin) }))[0] === 200);
t("work orders module ok", (await j("/api/work-orders", { headers: auth(admin) }))[0] === 200);
t("maintenance module ok", (await j("/api/maintenance", { headers: auth(admin) }))[0] === 200);
t("preventive module ok", (await j("/api/preventive-maintenance", { headers: auth(admin) }))[0] === 200);
t("calibration module ok", (await j("/api/calibration", { headers: auth(admin) }))[0] === 200);
t("warranty stats ok", (await j("/api/warranties/stats", { headers: auth(admin) }))[0] === 200);

console.log(`\n${pass} passed, ${fail} failed`);
await mem.stop();
process.exit(fail ? 1 : 0);
