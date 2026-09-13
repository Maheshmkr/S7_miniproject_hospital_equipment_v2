import { setupTestDb } from "./test-db-helper.js";
await setupTestDb("hospital_equipment_calib_test");
process.env.JWT_SECRET = "test-only-secret";
process.env.PORT = "5094";
await import("./server.js");
await new Promise((r) => setTimeout(r, 3000));
const B = "http://localhost:5094";
let pass=0, fail=0;
const j = async (p, o={}) => { const r = await fetch(B+p, {...o, headers:{"content-type":"application/json", ...(o.headers||{})}}); return [r.status, await r.json()]; };
const t = (name, cond, extra="") => { cond ? (pass++, console.log("PASS", name)) : (fail++, console.log("FAIL", name, extra)); };
const auth = (tk) => ({ Authorization: "Bearer " + tk });
const reg = async (name,email,role,departmentId) => (await j("/api/auth/register",{method:"POST",body:JSON.stringify({name,email,password:"medixa123",role,departmentId})}))[1].data.token;

const admin = await reg("Admin","a@t.io","ADMINISTRATOR");
let [,d] = await j("/api/departments",{method:"POST",headers:auth(admin),body:JSON.stringify({code:"RAD",name:"Radiology"})});
const dept = d.data._id;
let [,d2] = await j("/api/departments",{method:"POST",headers:auth(admin),body:JSON.stringify({code:"ICU",name:"ICU"})});
const dept2 = d2.data._id;
const eng = await reg("Eng","e@t.io","BIOMEDICAL_ENGINEER",dept);
const staff = await reg("Staff","s@t.io","DEPARTMENT_STAFF",dept);
const staff2 = await reg("Staff2","s2@t.io","DEPARTMENT_STAFF",dept2);
const [,me] = await j("/api/auth/me",{headers:auth(eng)});
const engId = me.data.user._id;

let [st, eq] = await j("/api/equipment",{method:"POST",headers:auth(admin),body:JSON.stringify({equipmentId:"EQ-9001",name:"MRI Vida",category:"Imaging",departmentId:dept,criticality:"CRITICAL"})});
t("equipment created", st===201, JSON.stringify(eq));
const eqId = eq.data._id;

// create
let [cs, cb] = await j("/api/calibration",{method:"POST",headers:auth(admin),body:JSON.stringify({equipmentId:"EQ-9001",scheduledDate:new Date(Date.now()-86400000).toISOString(),frequency:"QUARTERLY",calibrationStandard:"IEC 62353",assignedEngineerId:engId})});
t("create calibration", cs===201 && cb.data.calibrationId==="CAL-0001", JSON.stringify(cb));
t("derived overdue", cb.data.scheduleState==="OVERDUE" && cb.data.daysUntilDue===-1, JSON.stringify(cb.data.scheduleState));
const calId = cb.data._id;

t("staff cannot create", (await j("/api/calibration",{method:"POST",headers:auth(staff),body:JSON.stringify({equipmentId:"EQ-9001",scheduledDate:new Date().toISOString()})}))[0]===403);
t("unauthenticated rejected", (await j("/api/calibration"))[0]===401);
t("bad equipment 404", (await j("/api/calibration",{method:"POST",headers:auth(admin),body:JSON.stringify({equipmentId:"EQ-NOPE",scheduledDate:new Date().toISOString()})}))[0]===404);
t("bad frequency 400", (await j("/api/calibration",{method:"POST",headers:auth(admin),body:JSON.stringify({equipmentId:"EQ-9001",scheduledDate:new Date().toISOString(),frequency:"WEEKLY"})}))[0]===400);

// list / get / stats
let [ls, lb] = await j("/api/calibration",{headers:auth(admin)});
t("list", ls===200 && lb.data.total===1);
t("engineer sees assigned", (await j("/api/calibration",{headers:auth(eng)}))[1].data.total===1);
t("staff sees own dept", (await j("/api/calibration",{headers:auth(staff)}))[1].data.total===1);
t("other dept staff scoped out", (await j("/api/calibration",{headers:auth(staff2)}))[1].data.total===0);
t("get by business code", (await j("/api/calibration/CAL-0001",{headers:auth(admin)}))[1].data.calibration.calibrationId==="CAL-0001");
t("other dept staff 403 on detail", (await j("/api/calibration/CAL-0001",{headers:auth(staff2)}))[0]===403);
let [,stt] = await j("/api/calibration/stats",{headers:auth(admin)});
t("stats", stt.data.total===1 && stt.data.scheduled===1 && stt.data.overdue===1, JSON.stringify(stt.data));
t("schedule endpoint", Array.isArray((await j("/api/calibration/schedule",{headers:auth(admin)}))[1].data));
t("overdue filter", (await j("/api/calibration?overdue=true",{headers:auth(admin)}))[1].data.items.length===1);
t("search filter", (await j("/api/calibration?search=IEC",{headers:auth(admin)}))[1].data.items.length===1);

// update + assign
t("update", (await j(`/api/calibration/${calId}`,{method:"PUT",headers:auth(eng),body:JSON.stringify({tolerance:"±2%"})}))[1].data.tolerance==="±2%");
t("staff cannot update", (await j(`/api/calibration/${calId}`,{method:"PUT",headers:auth(staff),body:JSON.stringify({tolerance:"x"})}))[0]===403);
t("assign non-engineer rejected", (await j(`/api/calibration/${calId}/assign`,{method:"PATCH",headers:auth(admin),body:JSON.stringify({engineerId:(await j("/api/auth/me",{headers:auth(staff)}))[1].data.user._id})}))[0]===400);
t("assign engineer", (await j(`/api/calibration/${calId}/assign`,{method:"PATCH",headers:auth(admin),body:JSON.stringify({engineerId:engId})}))[0]===200);

// transitions
t("invalid transition SCHEDULED→PASSED", (await j(`/api/calibration/${calId}/status`,{method:"PATCH",headers:auth(eng),body:JSON.stringify({status:"PASSED"})}))[0]===422);
t("valid transition SCHEDULED→IN_PROGRESS", (await j(`/api/calibration/${calId}/status`,{method:"PATCH",headers:auth(eng),body:JSON.stringify({status:"IN_PROGRESS"})}))[1].data.status==="IN_PROGRESS");

// complete
let [ks, kb] = await j(`/api/calibration/${calId}/complete`,{method:"POST",headers:auth(eng),body:JSON.stringify({result:"PASS",certificateNumber:"CERT-77",measuredValues:[{parameter:"Field",measured:"3.0T",reference:"3.0T",withinTolerance:true}],findings:"Within tolerance"})});
t("complete", ks===200 && kb.data.calibration.status==="PASSED" && kb.data.calibration.result==="PASS", JSON.stringify(kb).slice(0,300));
t("work order reused/created COMPLETED", kb.data.workOrder.status==="COMPLETED" && kb.data.workOrder.maintenanceType==="CALIBRATION");
t("maintenance completed", kb.data.maintenance.status==="COMPLETED" && kb.data.maintenance.maintenanceType==="CALIBRATION");
const next = new Date(kb.data.calibration.nextCalibrationDate);
const cal = new Date(kb.data.calibration.calibrationDate);
t("next due +3 months", Math.round((next-cal)/86400000) >= 89, String(next));
t("equipment calibration dates updated", Boolean(kb.data.equipment.lastCalibrationDate && kb.data.equipment.nextCalibrationDate));
t("completed state derived", (await j("/api/calibration/CAL-0001",{headers:auth(admin)}))[1].data.calibration.scheduleState==="COMPLETED");
t("no duplicate work orders", (await j("/api/work-orders",{headers:auth(admin)}))[1].data.total===1, JSON.stringify((await j("/api/work-orders",{headers:auth(admin)}))[1].data.total));
t("edit blocked once PASSED", (await j(`/api/calibration/${calId}`,{method:"PUT",headers:auth(eng),body:JSON.stringify({notes:"x"})}))[0]===422);
t("delete blocked once completed", (await j(`/api/calibration/${calId}`,{method:"DELETE",headers:auth(admin)}))[0]===422);

// history / audit
let [hs, hb] = await j(`/api/calibration/${calId}/history`,{headers:auth(admin)});
t("history logs", hs===200 && hb.data.logs.length>=4, JSON.stringify(hb.data.logs.map(l=>l.action)));
t("checklist endpoint", (await j(`/api/calibration/${calId}/checklist`,{headers:auth(eng)}))[0]===200);

// fail path + delete rules
let [,f] = await j("/api/calibration",{method:"POST",headers:auth(admin),body:JSON.stringify({equipmentId:"EQ-9001",scheduledDate:new Date().toISOString(),frequency:"CUSTOM",frequencyDays:30})});
t("due today derived", f.data.scheduleState==="DUE_TODAY");
const c2 = f.data._id;
let [,ff] = await j(`/api/calibration/${c2}/complete`,{method:"POST",headers:auth(eng),body:JSON.stringify({result:"FAIL",findings:"Drift beyond tolerance"})});
t("fail result", ff.data.calibration.status==="FAILED" && ff.data.calibration.result==="FAIL");
t("custom interval +30d", Math.round((new Date(ff.data.calibration.nextCalibrationDate)-new Date(ff.data.calibration.calibrationDate))/86400000)===30);
t("FAILED→IN_PROGRESS allowed", (await j(`/api/calibration/${c2}/status`,{method:"PATCH",headers:auth(eng),body:JSON.stringify({status:"IN_PROGRESS"})}))[0]===200);
let [,c3] = await j("/api/calibration",{method:"POST",headers:auth(admin),body:JSON.stringify({equipmentId:"EQ-9001",scheduledDate:new Date().toISOString()})});
t("staff cannot delete", (await j(`/api/calibration/${c3.data._id}`,{method:"DELETE",headers:auth(staff)}))[0]===403);
t("admin deletes scheduled", (await j(`/api/calibration/${c3.data._id}`,{method:"DELETE",headers:auth(admin)}))[0]===200);
// regression
t("equipment list still ok", (await j("/api/equipment",{headers:auth(admin)}))[0]===200);
t("complaints list still ok", (await j("/api/complaints",{headers:auth(admin)}))[0]===200);
t("maintenance list still ok", (await j("/api/maintenance",{headers:auth(admin)}))[0]===200);
t("preventive list still ok", (await j("/api/preventive-maintenance",{headers:auth(admin)}))[0]===200);
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail?1:0);
