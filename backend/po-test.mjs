import { setupTestDb } from "./test-db-helper.js";
await setupTestDb("hospital_equipment_po_test");
process.env.JWT_SECRET = "test-only-secret";
process.env.PORT = "5089";
await import("./server.js");
await new Promise((r) => setTimeout(r, 3000));
const B = "http://localhost:5089";
let pass = 0, fail = 0;
const j = async (p, o = {}) => { const r = await fetch(B + p, { ...o, headers: { "content-type": "application/json", ...(o.headers || {}) } }); return [r.status, await r.json()]; };
const t = (name, cond, extra = "") => { cond ? (pass++, console.log("PASS", name)) : (fail++, console.log("FAIL", name, extra)); };
const auth = (tk) => ({ Authorization: "Bearer " + tk });
const reg = async (name, email, role, departmentId) => (await j("/api/auth/register", { method: "POST", body: JSON.stringify({ name, email, password: "medixa123", role, departmentId }) }))[1].data.token;
const post = (p, tk, body) => j(p, { method: "POST", headers: auth(tk), body: JSON.stringify(body) });
const put = (p, tk, body) => j(p, { method: "PUT", headers: auth(tk), body: JSON.stringify(body) });
const patch = (p, tk, body) => j(p, { method: "PATCH", headers: auth(tk), body: JSON.stringify(body ?? {}) });
const getj = (p, tk) => j(p, { headers: auth(tk) });

const admin = await reg("Admin", "a@t.io", "ADMINISTRATOR");
const admin2 = await reg("Admin Two", "a2@t.io", "ADMINISTRATOR");
const [, d1] = await post("/api/departments", admin, { code: "RAD", name: "Radiology" });
const [, d2] = await post("/api/departments", admin, { code: "ICU", name: "Intensive Care" });
const rad = d1.data._id, icu = d2.data._id;
const eng = await reg("Eng", "e@t.io", "BIOMEDICAL_ENGINEER", rad);
const eng2 = await reg("Eng Two", "e2@t.io", "BIOMEDICAL_ENGINEER", rad);
const staffRad = await reg("Staff Rad", "s@t.io", "DEPARTMENT_STAFF", rad);
const staffIcu = await reg("Staff Icu", "s2@t.io", "DEPARTMENT_STAFF", icu);

const [, ven] = await post("/api/vendors", admin, { name: "Siemens Healthineers", category: "MANUFACTURER" });
const [, ven2] = await post("/api/vendors", admin, { name: "Dormant Supplies", category: "OTHER", status: "INACTIVE" });
const vendorCode = ven.data.vendorId;

const baseItems = [
  { description: "Gradient coil", quantity: 2, unitPrice: 1000, taxRate: 10, discountRate: 0 },
  { description: "Coolant pump", quantity: 1, unitPrice: 500, taxRate: 0, discountRate: 10 },
];

/* ------------------------------ create + totals ----------------------------- */
const [cs, cb] = await post("/api/purchase-orders", admin, {
  vendorId: vendorCode, departmentId: "RAD", title: "MRI spares", items: baseItems, shippingCost: 50,
});
t("create PO 201", cs === 201, JSON.stringify(cb));
t("auto code PO-0001", cb.data?.purchaseOrderId === "PO-0001", String(cb.data?.purchaseOrderId));
t("poNumber defaults to code", cb.data?.poNumber === "PO-0001");
t("default status DRAFT", cb.data?.status === "DRAFT");
t("default priority MEDIUM", cb.data?.priority === "MEDIUM");
t("vendor populated", cb.data?.vendorId?.name === "Siemens Healthineers");
t("department populated", cb.data?.departmentId?.code === "RAD");
t("requestedBy populated", cb.data?.requestedBy?.email === "a@t.io");
// item 1: gross 2000, discount 0, tax 200 -> 2200 ; item 2: gross 500, disc 50, tax 0 -> 450
t("item 1 total 2200", cb.data?.items?.[0]?.total === 2200, String(cb.data?.items?.[0]?.total));
t("item 2 discount 50", cb.data?.items?.[1]?.discountAmount === 50, String(cb.data?.items?.[1]?.discountAmount));
t("item 2 total 450", cb.data?.items?.[1]?.total === 450, String(cb.data?.items?.[1]?.total));
t("subtotal 2500", cb.data?.subtotal === 2500, String(cb.data?.subtotal));
t("discount 50", cb.data?.discount === 50, String(cb.data?.discount));
t("tax 200", cb.data?.tax === 200, String(cb.data?.tax));
t("total 2700 incl shipping", cb.data?.totalAmount === 2700, String(cb.data?.totalAmount));
const po1 = cb.data.purchaseOrderId;

const [, cb2] = await post("/api/purchase-orders", eng, { vendorId: vendorCode, departmentId: "RAD", items: [{ description: "Filter", quantity: 1, unitPrice: 100 }] });
t("second PO code PO-0002", cb2.data?.purchaseOrderId === "PO-0002", String(cb2.data?.purchaseOrderId));
const po2 = cb2.data.purchaseOrderId;

/* -------------------------------- validation -------------------------------- */
t("client totals ignored", (await post("/api/purchase-orders", admin, { vendorId: vendorCode, items: [{ description: "X", quantity: 1, unitPrice: 10 }], totalAmount: 999999 }))[1].data.totalAmount === 10);
t("missing vendor 400", (await post("/api/purchase-orders", admin, { items: baseItems }))[0] === 400);
t("unknown vendor 404", (await post("/api/purchase-orders", admin, { vendorId: "VEN-9999", items: baseItems }))[0] === 404);
t("inactive vendor 400", (await post("/api/purchase-orders", admin, { vendorId: ven2.data.vendorId, items: baseItems }))[0] === 400);
t("no items 400/422", [400, 422].includes((await post("/api/purchase-orders", admin, { vendorId: vendorCode, items: [] }))[0]));
t("negative qty rejected", [400, 422].includes((await post("/api/purchase-orders", admin, { vendorId: vendorCode, items: [{ description: "X", quantity: -1, unitPrice: 5 }] }))[0]));
t("negative price rejected", [400, 422].includes((await post("/api/purchase-orders", admin, { vendorId: vendorCode, items: [{ description: "X", quantity: 1, unitPrice: -5 }] }))[0]));
t("bad priority 400", (await post("/api/purchase-orders", admin, { vendorId: vendorCode, priority: "YESTERDAY", items: baseItems }))[0] === 400);
t("bad status on create 422", [400, 422].includes((await post("/api/purchase-orders", admin, { vendorId: vendorCode, status: "RECEIVED", items: baseItems }))[0]));
t("bad date 400", (await post("/api/purchase-orders", admin, { vendorId: vendorCode, orderDate: "not-a-date", items: baseItems }))[0] === 400);

/* ----------------------------------- RBAC ----------------------------------- */
t("unauthenticated list 401", (await j("/api/purchase-orders"))[0] === 401);
t("staff cannot create 403", (await post("/api/purchase-orders", staffRad, { vendorId: vendorCode, items: baseItems }))[0] === 403);
t("engineer can create", (await post("/api/purchase-orders", eng, { vendorId: vendorCode, items: baseItems }))[0] === 201);
t("staff can read list", (await getj("/api/purchase-orders", staffRad))[0] === 200);
t("staff cannot update 403", (await put(`/api/purchase-orders/${po1}`, staffRad, { notes: "hi" }))[0] === 403);
t("staff cannot delete 403", (await j(`/api/purchase-orders/${po1}`, { method: "DELETE", headers: auth(staffRad) }))[0] === 403);
t("engineer cannot delete 403", (await j(`/api/purchase-orders/${po1}`, { method: "DELETE", headers: auth(eng) }))[0] === 403);
t("engineer cannot approve 403", (await patch(`/api/purchase-orders/${po1}/approve`, eng))[0] === 403);
t("engineer cannot edit others' PO 403", (await put(`/api/purchase-orders/${po2}`, eng2, { notes: "nope" }))[0] === 403);

/* ------------------------------ dept scoping ------------------------------- */
const [, icuPo] = await post("/api/purchase-orders", admin, { vendorId: vendorCode, departmentId: "ICU", items: [{ description: "Vent sensor", quantity: 1, unitPrice: 200 }] });
const [, radList] = await getj("/api/purchase-orders?limit=100", staffRad);
t("staff sees only own department", radList.data.items.every((p) => p.departmentId?.code === "RAD"), JSON.stringify(radList.data.items.map((p) => p.departmentId?.code)));
t("staff blocked from other dept PO", (await getj(`/api/purchase-orders/${icuPo.data.purchaseOrderId}`, staffRad))[0] === 403);
t("icu staff sees own PO", (await getj(`/api/purchase-orders/${icuPo.data.purchaseOrderId}`, staffIcu))[0] === 200);
t("admin sees all departments", (await getj("/api/purchase-orders?limit=100", admin))[1].data.items.length >= 5);

/* -------------------------------- update ---------------------------------- */
const [us, ub] = await put(`/api/purchase-orders/${po1}`, admin, { items: [{ description: "Gradient coil", quantity: 3, unitPrice: 1000, taxRate: 10 }], shippingCost: 0, notes: "revised" });
t("update 200", us === 200, JSON.stringify(ub));
t("totals recalculated on update", ub.data?.totalAmount === 3300, String(ub.data?.totalAmount));
t("notes saved", ub.data?.notes === "revised");

/* ------------------------------- transitions -------------------------------- */
t("cannot approve a DRAFT", [403, 422].includes((await patch(`/api/purchase-orders/${po1}/approve`, admin2))[0]));
t("submit for approval", (await patch(`/api/purchase-orders/${po1}/status`, admin, { status: "PENDING_APPROVAL" }))[0] === 200);
t("self-approval blocked", (await patch(`/api/purchase-orders/${po1}/approve`, admin))[0] === 403);
const [as, ab] = await patch(`/api/purchase-orders/${po1}/approve`, admin2, { reason: "budget cleared" });
t("other admin approves 200", as === 200, JSON.stringify(ab));
t("approvedBy recorded", ab.data?.approvedBy?.email === "a2@t.io");
t("approvedAt recorded", Boolean(ab.data?.approvedAt));
t("approved PO locked for edit", [403, 422].includes((await put(`/api/purchase-orders/${po1}`, admin, { notes: "late change" }))[0]));
t("illegal jump APPROVED->RECEIVED 422", (await patch(`/api/purchase-orders/${po1}/status`, admin, { status: "RECEIVED" }))[0] === 422);
t("APPROVED -> ORDERED", (await patch(`/api/purchase-orders/${po1}/status`, admin, { status: "ORDERED" }))[0] === 200);
const [rs, rb] = await patch(`/api/purchase-orders/${po1}/status`, admin, { status: "RECEIVED" });
t("ORDERED -> RECEIVED", rs === 200, JSON.stringify(rb));
t("deliveryDate stamped", Boolean(rb.data?.deliveryDate));
t("RECEIVED is terminal", (await patch(`/api/purchase-orders/${po1}/status`, admin, { status: "CANCELLED" }))[0] === 422);
t("staff cannot change status 403", (await patch(`/api/purchase-orders/${po2}/status`, staffRad, { status: "PENDING_APPROVAL" }))[0] === 403);

// rejection path
await patch(`/api/purchase-orders/${po2}/status`, eng, { status: "PENDING_APPROVAL" });
const [js, jb] = await patch(`/api/purchase-orders/${po2}/reject`, admin, { reason: "over budget" });
t("reject 200", js === 200, JSON.stringify(jb));
t("rejection reason stored", jb.data?.rejectionReason === "over budget");
t("rejectedBy recorded", jb.data?.rejectedBy?.email === "a@t.io");

/* ---------------------------------- stats ---------------------------------- */
const [ss, sb] = await getj("/api/purchase-orders/stats", admin);
t("stats 200", ss === 200);
t("stats has byStatus", typeof sb.data?.byStatus?.RECEIVED === "number");
t("committed value counted", sb.data?.committedValue >= 3300, String(sb.data?.committedValue));
t("staff stats scoped", (await getj("/api/purchase-orders/stats", staffIcu))[1].data.total === 1);

/* --------------------------------- history --------------------------------- */
const [hs, hb] = await getj(`/api/purchase-orders/${po1}/history`, admin);
t("history 200", hs === 200);
t("history logs created + approved", hb.data.logs.some((l) => l.action === "PO_CREATED") && hb.data.logs.some((l) => l.action === "PO_APPROVED"), JSON.stringify(hb.data.logs.map((l) => l.action)));

/* --------------------------------- filters --------------------------------- */
t("filter by status", (await getj("/api/purchase-orders?status=RECEIVED", admin))[1].data.items.every((p) => p.status === "RECEIVED"));
t("filter by vendor", (await getj(`/api/purchase-orders?vendorId=${vendorCode}&limit=100`, admin))[1].data.total >= 5);
t("search by item description", (await getj("/api/purchase-orders?search=Gradient", admin))[1].data.total >= 1);
t("bad status filter 400", (await getj("/api/purchase-orders?status=NOPE", admin))[0] === 400);
t("unknown PO 404", (await getj("/api/purchase-orders/PO-9999", admin))[0] === 404);

/* --------------------------------- delete ---------------------------------- */
t("cannot delete non-draft 422", (await j(`/api/purchase-orders/${po1}`, { method: "DELETE", headers: auth(admin) }))[0] === 422);
const [, draft] = await post("/api/purchase-orders", admin, { vendorId: vendorCode, items: [{ description: "Scrap", quantity: 1, unitPrice: 1 }] });
t("delete draft 200", (await j(`/api/purchase-orders/${draft.data.purchaseOrderId}`, { method: "DELETE", headers: auth(admin) }))[0] === 200);
t("deleted PO gone", (await getj(`/api/purchase-orders/${draft.data.purchaseOrderId}`, admin))[0] === 404);

/* ------------------------------- regressions -------------------------------- */
t("equipment module ok", (await getj("/api/equipment", admin))[0] === 200);
t("complaints module ok", (await getj("/api/complaints", admin))[0] === 200);
t("work orders module ok", (await getj("/api/work-orders", admin))[0] === 200);
t("maintenance module ok", (await getj("/api/maintenance", admin))[0] === 200);
t("preventive module ok", (await getj("/api/preventive-maintenance", admin))[0] === 200);
t("calibration module ok", (await getj("/api/calibration", admin))[0] === 200);
t("warranty stats ok", (await getj("/api/warranties/stats", admin))[0] === 200);
t("vendors module ok", (await getj("/api/vendors", admin))[0] === 200);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
