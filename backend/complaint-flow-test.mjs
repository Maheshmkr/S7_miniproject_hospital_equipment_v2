import http from 'http';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.TEST_PORT || process.env.PORT || 5000);
const BASE_URL = `http://localhost:${PORT}`;

function httpRequest(method, urlPath, data = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlPath, BASE_URL);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(body);
        } catch {
          json = body;
        }
        resolve({ status: res.statusCode, headers: res.headers, body: json });
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

function wait(ms) {
  return new Promise((res) => setTimeout(res, ms));
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
}

async function runComplaintLifecycleTest() {
  console.log('========================================================================');
  console.log('  MEDIXA COMPLAINT LIFECYCLE END-TO-END VERIFICATION SUITE');
  console.log('========================================================================\n');

  let serverProcess = null;
  let ready = false;
  try {
    const health = await httpRequest('GET', '/api/health');
    if (health.status === 200) {
      ready = true;
      console.log(`[BOOT] Connected to existing server at ${BASE_URL}\n`);
    }
  } catch {}

  if (!ready) {
    console.log(`[BOOT] Launching backend server on port ${PORT}...`);
    serverProcess = spawn('node', ['server.js'], {
      cwd: __dirname,
      env: { ...process.env, PORT: String(PORT), NODE_ENV: 'test' },
      stdio: 'inherit',
    });

    for (let i = 0; i < 20; i++) {
      await wait(500);
      try {
        const health = await httpRequest('GET', '/api/health');
        if (health.status === 200) {
          ready = true;
          break;
        }
      } catch {}
    }

    if (!ready) {
      serverProcess?.kill();
      throw new Error('Server failed to start in time on port ' + PORT);
    }
    console.log(`[BOOT] Server ready at ${BASE_URL}\n`);
  }

  try {
    // -------------------------------------------------------------------------
    // Step 1: Login Department Staff (Clara Whitfield)
    // -------------------------------------------------------------------------
    console.log('[STEP 1] Logging in Department Staff (clara.whitfield@medixa.health)...');
    const staffLogin = await httpRequest('POST', '/api/auth/login', {
      email: 'clara.whitfield@medixa.health',
      password: 'Medixa#2026',
    });
    assert(staffLogin.status === 200, `Staff login failed with status ${staffLogin.status}`);
    const staffToken = staffLogin.body.data?.token || staffLogin.body.token;
    const staffUser = staffLogin.body.data?.user || staffLogin.body.user;
    assert(staffToken, 'Staff auth token missing');
    console.log(`  -> Staff authenticated: ${staffUser.name} (${staffUser.role}, Dept: ${staffUser.departmentId?.name || staffUser.departmentId})\n`);

    // -------------------------------------------------------------------------
    // Step 2: Fetch Equipment for Department
    // -------------------------------------------------------------------------
    console.log('[STEP 2] Querying Equipment list for department...');
    const equipRes = await httpRequest('GET', '/api/equipment?limit=100', null, staffToken);
    assert(equipRes.status === 200, `Equipment query failed: ${equipRes.status}`);
    const equipList = equipRes.body.data?.items || equipRes.body.data || equipRes.body.items || equipRes.body;
    assert(Array.isArray(equipList) && equipList.length > 0, 'No equipment found in database for department');

    const ventilator = equipList.find(
      (e) => (e.equipmentId === 'EQ-2210' || e.equipmentCode === 'EQ-2210' || (e.name && e.name.toLowerCase().includes('hamilton')))
    ) || equipList[0];

    console.log(`  -> Target Equipment: ${ventilator.name} [ID: ${ventilator.equipmentId || ventilator.equipmentCode || ventilator._id}]`);
    const deptId = typeof ventilator.departmentId === 'object' ? ventilator.departmentId._id : (ventilator.departmentId || staffUser.departmentId);
    console.log(`  -> Department ID: ${deptId}\n`);

    // -------------------------------------------------------------------------
    // Step 3: Staff creates a new Complaint for the target Equipment
    // -------------------------------------------------------------------------
    console.log(`[STEP 3] Staff submitting Complaint for ${ventilator.name}...`);
    const complaintPayload = {
      title: `${ventilator.name} Calibration & Pressure Sensor Drift`,
      equipmentId: ventilator._id,
      departmentId: deptId,
      priority: 'CRITICAL',
      description: 'Persistent oxygen blending pressure drop alarms during operation. Requires immediate biomedical recalibration and sensor check.',
      issueDescription: 'Persistent oxygen blending pressure drop alarms during operation. Requires immediate biomedical recalibration and sensor check.',
      location: 'Suite 3 / Bay 4',
    };

    const createCompRes = await httpRequest('POST', '/api/complaints', complaintPayload, staffToken);
    assert(createCompRes.status === 201 || createCompRes.status === 200, `Complaint creation failed: ${createCompRes.status} ${JSON.stringify(createCompRes.body)}`);
    const createdComplaint = createCompRes.body.data || createCompRes.body;
    console.log(`  -> Complaint Created! ID: ${createdComplaint.complaintId || createdComplaint._id}`);
    console.log(`  -> Status: ${createdComplaint.status}`);
    console.log(`  -> Priority: ${createdComplaint.priority}`);

    // -------------------------------------------------------------------------
    // Step 4: Verify Sequential ID Format (CMP-YYYY-XXXX)
    // -------------------------------------------------------------------------
    console.log('[STEP 4] Verifying Sequential ID format CMP-YYYY-XXXX (not duplicated year)...');
    const complaintCode = createdComplaint.complaintId;
    assert(complaintCode, 'complaintId is missing from returned payload');
    const codePattern = /^CMP-\d{4}-\d{4,6}$/;
    assert(codePattern.test(complaintCode), `Complaint code "${complaintCode}" does not match pattern CMP-YYYY-XXXX`);
    // Ensure year is not repeated like CMP-2026-20260001
    const parts = complaintCode.split('-');
    assert(parts.length === 3, `Expected 3 parts in ${complaintCode}`);
    assert(!parts[2].startsWith(parts[1]), `Duplicated year prefix detected in code suffix: ${parts[2]}`);
    assert(createdComplaint.status === 'OPEN', `Initial status should be OPEN, got ${createdComplaint.status}`);
    console.log(`  -> Sequential ID Verified: ${complaintCode} (Clean format, valid counter)\n`);

    // -------------------------------------------------------------------------
    // Step 5: Verify Staff sees Complaint in history
    // -------------------------------------------------------------------------
    console.log('[STEP 5] Verifying Staff Complaint list & history query...');
    const staffCompList = await httpRequest('GET', '/api/complaints', null, staffToken);
    assert(staffCompList.status === 200, `Staff complaints query failed: ${staffCompList.status}`);
    const staffItems = staffCompList.body.data?.items || staffCompList.body.data || staffCompList.body;
    const foundInStaff = Array.isArray(staffItems) && staffItems.find((c) => (c._id === createdComplaint._id || c.complaintId === complaintCode));
    assert(foundInStaff, `Created complaint ${complaintCode} not found in Staff's own complaints`);
    console.log(`  -> Found complaint in Staff records with status: ${foundInStaff.status}\n`);

    // -------------------------------------------------------------------------
    // Step 6: Login Admin (Emilia Greene)
    // -------------------------------------------------------------------------
    console.log('[STEP 6] Logging in Admin (emilia.greene@medixa.health)...');
    const adminLogin = await httpRequest('POST', '/api/auth/login', {
      email: 'emilia.greene@medixa.health',
      password: 'Medixa#2026',
    });
    assert(adminLogin.status === 200, `Admin login failed: ${adminLogin.status}`);
    const adminToken = adminLogin.body.data?.token || adminLogin.body.token;
    const adminUser = adminLogin.body.data?.user || adminLogin.body.user;
    assert(adminToken, 'Admin auth token missing');
    console.log(`  -> Admin authenticated: ${adminUser.name} (${adminUser.role})\n`);

    // -------------------------------------------------------------------------
    // Step 7: Admin queries triage queue and finds complaint
    // -------------------------------------------------------------------------
    console.log('[STEP 7] Admin querying Complaint triage queue...');
    const adminCompList = await httpRequest('GET', '/api/complaints?limit=100', null, adminToken);
    assert(adminCompList.status === 200, `Admin complaint query failed: ${adminCompList.status}`);
    const allComplaints = adminCompList.body.data?.items || adminCompList.body.data || adminCompList.body;
    const foundInAdmin = Array.isArray(allComplaints) && allComplaints.find((c) => (c._id === createdComplaint._id || c.complaintId === complaintCode));
    assert(foundInAdmin, `Complaint ${complaintCode} not found in Admin triage queue`);
    console.log(`  -> Admin verified complaint in queue: ${foundInAdmin.title} [Status: ${foundInAdmin.status}]\n`);

    // -------------------------------------------------------------------------
    // Step 8: Fetch Biomedical Engineer (Daniel Okafor)
    // -------------------------------------------------------------------------
    console.log('[STEP 8] Finding Biomedical Engineer for assignment...');
    const engLogin = await httpRequest('POST', '/api/auth/login', {
      email: 'daniel.okafor@medixa.health',
      password: 'Medixa#2026',
    });
    assert(engLogin.status === 200, `Engineer login failed: ${engLogin.status}`);
    const engToken = engLogin.body.data?.token || engLogin.body.token;
    const engUser = engLogin.body.data?.user || engLogin.body.user;
    console.log(`  -> Engineer identified: ${engUser.name} [ID: ${engUser._id}]\n`);

    // -------------------------------------------------------------------------
    // Step 9: Admin creates Work Order from Complaint and assigns to Engineer
    // -------------------------------------------------------------------------
    console.log('[STEP 9] Admin creating Work Order and assigning to Biomedical Engineer...');
    const woPayload = {
      title: `Emergency Repair: ${complaintCode} - ${ventilator.name}`,
      equipmentId: ventilator._id,
      departmentId: deptId,
      complaintId: createdComplaint._id,
      engineerId: engUser._id,
      assignedEngineerId: engUser._id,
      priority: 'CRITICAL',
      description: 'Perform complete diagnostic on ventilator oxygen sensor, replace faulty transducer, and conduct pressure test.',
      scheduledDate: new Date().toISOString(),
    };

    const createWoRes = await httpRequest('POST', '/api/work-orders', woPayload, adminToken);
    assert(createWoRes.status === 201 || createWoRes.status === 200, `Work Order creation failed: ${createWoRes.status} ${JSON.stringify(createWoRes.body)}`);
    const createdWo = createWoRes.body.data || createWoRes.body;
    console.log(`  -> Work Order Created! ID: ${createdWo.workOrderId || createdWo._id}`);
    console.log(`  -> Linked Complaint ID: ${createdWo.complaintId}`);
    console.log(`  -> Assigned Engineer ID: ${createdWo.engineerId || createdWo.assignedEngineerId}\n`);

    // -------------------------------------------------------------------------
    // Step 10: Verify Complaint status transitioned to ASSIGNED
    // -------------------------------------------------------------------------
    console.log('[STEP 10] Verifying Complaint status cascaded to ASSIGNED with links...');
    const checkCompAfterWo = await httpRequest('GET', `/api/complaints/${createdComplaint._id}`, null, adminToken);
    assert(checkCompAfterWo.status === 200, `Failed to fetch complaint: ${checkCompAfterWo.status}`);
    const compAfterWo = checkCompAfterWo.body.data || checkCompAfterWo.body;
    console.log(`  -> Complaint status: ${compAfterWo.status}`);
    assert(compAfterWo.status === 'ASSIGNED' || compAfterWo.status === 'UNDER_REVIEW', `Expected ASSIGNED/UNDER_REVIEW, got ${compAfterWo.status}`);
    const linkedWoId = compAfterWo.workOrderId?._id || compAfterWo.workOrderId;
    assert(linkedWoId, 'Complaint workOrderId is not linked');
    console.log(`  -> Verified Work Order linkage: ${linkedWoId}\n`);

    // -------------------------------------------------------------------------
    // Step 11: Engineer verifies assigned Work Order
    // -------------------------------------------------------------------------
    console.log('[STEP 11] Engineer querying assigned Work Orders...');
    const engWoList = await httpRequest('GET', '/api/engineers/me/work-orders', null, engToken);
    assert(engWoList.status === 200, `Engineer Work Order query failed: ${engWoList.status}`);
    const engWos = engWoList.body.data?.items || engWoList.body.data || engWoList.body;
    const foundEngWo = Array.isArray(engWos) && engWos.find((w) => (w._id === createdWo._id || w.workOrderId === createdWo.workOrderId));
    assert(foundEngWo, 'Work order not found in Engineer assigned tasks');
    console.log(`  -> Engineer confirmed assignment: ${foundEngWo.workOrderId || foundEngWo._id} [Status: ${foundEngWo.status}]\n`);

    // -------------------------------------------------------------------------
    // Step 12: Engineer starts Work Order / Maintenance execution
    // -------------------------------------------------------------------------
    console.log('[STEP 12] Engineer executing start action on Work Order...');
    const startWoRes = await httpRequest('POST', `/api/work-orders/${createdWo._id}/start`, {}, engToken);
    assert(startWoRes.status === 200, `Work Order start failed: ${startWoRes.status} ${JSON.stringify(startWoRes.body)}`);
    console.log(`  -> Work Order Start successful\n`);

    // -------------------------------------------------------------------------
    // Step 13: Verify Status Cascades on Start
    // -------------------------------------------------------------------------
    console.log('[STEP 13] Verifying Multi-Entity Status Cascades:');
    // Work Order -> IN_PROGRESS
    const woAfterStart = await httpRequest('GET', `/api/work-orders/${createdWo._id}`, null, engToken);
    const woData = woAfterStart.body.data?.workOrder || woAfterStart.body.data || woAfterStart.body;
    console.log(`  -> Work Order Status: ${woData.status} (Expected: IN_PROGRESS)`);
    assert(woData.status === 'IN_PROGRESS', `Expected WO IN_PROGRESS, got ${woData.status}`);

    // Complaint -> MAINTENANCE_IN_PROGRESS
    const compAfterStart = await httpRequest('GET', `/api/complaints/${createdComplaint._id}`, null, engToken);
    const compData = compAfterStart.body.data || compAfterStart.body;
    console.log(`  -> Complaint Status: ${compData.status} (Expected: MAINTENANCE_IN_PROGRESS)`);
    assert(compData.status === 'MAINTENANCE_IN_PROGRESS', `Expected Complaint MAINTENANCE_IN_PROGRESS, got ${compData.status}`);

    // Equipment -> UNDER_MAINTENANCE
    const equipAfterStart = await httpRequest('GET', `/api/equipment/${ventilator._id}`, null, engToken);
    const equipData = equipAfterStart.body.data || equipAfterStart.body;
    console.log(`  -> Equipment Status: ${equipData.status} (Expected: UNDER_MAINTENANCE)`);
    assert(equipData.status === 'UNDER_MAINTENANCE', `Expected Equipment UNDER_MAINTENANCE, got ${equipData.status}`);

    // Maintenance record created
    const maintListRes = await httpRequest('GET', `/api/maintenance?workOrderId=${createdWo._id}`, null, engToken);
    const maintList = maintListRes.body.data?.items || maintListRes.body.data || maintListRes.body;
    assert(Array.isArray(maintList) && maintList.length > 0, 'No Maintenance record linked to work order');
    const maintRecord = maintList[0];
    console.log(`  -> Maintenance Record: ${maintRecord.maintenanceCode || maintRecord._id} [Status: ${maintRecord.status}]\n`);

    // -------------------------------------------------------------------------
    // Step 14: Engineer executes step-by-step checklist
    // -------------------------------------------------------------------------
    console.log('[STEP 14] Engineer loading and submitting maintenance checklist...');
    const clGetRes = await httpRequest('GET', `/api/maintenance/${maintRecord._id}/checklist`, null, engToken);
    assert(clGetRes.status === 200, `Failed to load checklist: ${clGetRes.status}`);
    const clData = clGetRes.body.data || clGetRes.body;
    const questions = clData.questions || [];
    console.log(`  -> Loaded ${questions.length} checklist questions`);

    if (questions.length > 0) {
      const answers = questions.map((q) => ({
        questionId: q._id,
        response: 'PASS',
        notes: 'Inspected and verified within operating tolerance',
      }));
      const checkRes = await httpRequest('POST', `/api/maintenance/${maintRecord._id}/checklist`, { answers }, engToken);
      assert(checkRes.status === 200, `Checklist submission failed: ${checkRes.status} ${JSON.stringify(checkRes.body)}`);
      console.log(`  -> ${answers.length} Checklist items submitted successfully\n`);
    } else {
      console.log(`  -> No checklist template configured for this equipment; skipping\n`);
    }

    // -------------------------------------------------------------------------
    // Step 15: Engineer updates breakdown / root cause investigation & service report
    // -------------------------------------------------------------------------
    console.log('[STEP 15] Engineer recording breakdown root-cause analysis and service report...');
    const investigationPayload = {
      rootCause: 'Galvanic oxygen sensor electrolyte degradation caused intermittent millivolt drop during high flow delivery.',
      correctiveAction: 'Replaced electrochemical O2 cell (P/N HAM-7201), flushed gas path, and recalibrated 2-point reference.',
      preventiveAction: 'Scheduled routine 6-month sensor cell proactive replacement.',
      laborHours: 2.5,
    };
    const invRes = await httpRequest('POST', `/api/maintenance/${maintRecord._id}/investigation`, investigationPayload, engToken);
    assert(invRes.status === 200, `Investigation update failed: ${invRes.status} ${JSON.stringify(invRes.body)}`);
    console.log(`  -> Root cause analysis registered`);

    const serviceReportPayload = {
      summaryOfWork: 'Complete overhaul, sensor replacement and 2-point calibration.',
      finalCondition: 'OPERATIONAL',
      engineerRemarks: 'Equipment passed electrical safety, pneumatic leak test, and flow calibration.',
    };
    const srRes = await httpRequest('POST', `/api/maintenance/${maintRecord._id}/service-report`, serviceReportPayload, engToken);
    assert(srRes.status === 201 || srRes.status === 200, `Service report creation failed: ${srRes.status} ${JSON.stringify(srRes.body)}`);
    console.log(`  -> Service report filed and attached\n`);

    // -------------------------------------------------------------------------
    // Step 16: Engineer completes Maintenance
    // -------------------------------------------------------------------------
    console.log('[STEP 16] Engineer completing maintenance with safety verification...');
    const completePayload = {
      verification: {
        safetyVerified: true,
        functionVerified: true,
        calibrationVerified: true,
      },
      finalCondition: 'OPERATIONAL',
      remarks: 'Ventilator fully overhauled, recalibrated, and verified ready for clinical ICU operation.',
      nextServiceDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(),
    };
    const completeRes = await httpRequest('POST', `/api/maintenance/${maintRecord._id}/complete`, completePayload, engToken);
    assert(completeRes.status === 200, `Maintenance completion failed: ${completeRes.status} ${JSON.stringify(completeRes.body)}`);
    console.log(`  -> Maintenance Completed!\n`);

    // -------------------------------------------------------------------------
    // Step 17: Verify Status Cascades on Completion
    // -------------------------------------------------------------------------
    console.log('[STEP 17] Verifying Completion Multi-Entity Status Cascades:');
    // Maintenance -> COMPLETED
    const maintAfterComplete = await httpRequest('GET', `/api/maintenance/${maintRecord._id}`, null, engToken);
    const mData = maintAfterComplete.body.data?.maintenance || maintAfterComplete.body.data || maintAfterComplete.body;
    console.log(`  -> Maintenance Status: ${mData.status} (Expected: COMPLETED)`);
    assert(mData.status === 'COMPLETED', `Expected Maintenance COMPLETED, got ${mData.status}`);

    // Work Order -> COMPLETED
    const woAfterComplete = await httpRequest('GET', `/api/work-orders/${createdWo._id}`, null, engToken);
    const wData = woAfterComplete.body.data?.workOrder || woAfterComplete.body.data || woAfterComplete.body;
    console.log(`  -> Work Order Status: ${wData.status} (Expected: COMPLETED)`);
    assert(wData.status === 'COMPLETED', `Expected Work Order COMPLETED, got ${wData.status}`);

    // Equipment -> OPERATIONAL
    const equipAfterComplete = await httpRequest('GET', `/api/equipment/${ventilator._id}`, null, engToken);
    const eData = equipAfterComplete.body.data || equipAfterComplete.body;
    console.log(`  -> Equipment Status: ${eData.status} (Expected: OPERATIONAL)`);
    assert(eData.status === 'OPERATIONAL', `Expected Equipment OPERATIONAL, got ${eData.status}`);

    // Complaint -> RESOLVED
    const compAfterComplete = await httpRequest('GET', `/api/complaints/${createdComplaint._id}`, null, engToken);
    const cData = compAfterComplete.body.data || compAfterComplete.body;
    console.log(`  -> Complaint Status: ${cData.status} (Expected: RESOLVED)`);
    console.log(`  -> Resolution Note: ${cData.resolution}`);
    console.log(`  -> Resolved At: ${cData.resolvedAt}`);
    assert(cData.status === 'RESOLVED' || cData.status === 'CLOSED', `Expected Complaint RESOLVED/CLOSED, got ${cData.status}`);
    assert(cData.resolvedAt, 'Complaint resolvedAt timestamp was not set');
    assert(cData.resolution, 'Complaint resolution notes were not populated');
    console.log(`  -> All cascades verified successfully!\n`);

    // -------------------------------------------------------------------------
    // Step 18: Verify Complaint Timeline Endpoint
    // -------------------------------------------------------------------------
    console.log('[STEP 18] Querying /api/complaints/:id/timeline endpoint...');
    const timelineRes = await httpRequest('GET', `/api/complaints/${createdComplaint._id}/timeline`, null, adminToken);
    assert(timelineRes.status === 200, `Timeline endpoint failed: ${timelineRes.status}`);
    const timelineEvents = timelineRes.body.data || timelineRes.body;
    assert(Array.isArray(timelineEvents) && timelineEvents.length >= 3, `Expected at least 3 timeline events, got ${timelineEvents.length}`);
    console.log(`  -> Timeline contains ${timelineEvents.length} events:`);
    timelineEvents.forEach((ev, idx) => {
      const actorName = typeof ev.actor === 'object' && ev.actor ? (ev.actor.name || ev.actor.role || 'System') : String(ev.actor || 'System');
      console.log(`     ${idx + 1}. [${ev.status}] ${ev.title} (${actorName}) - ${ev.timestamp}`);
    });
    console.log('');

    // -------------------------------------------------------------------------
    // Step 19: Verify Complaint History / Audit Endpoint
    // -------------------------------------------------------------------------
    console.log('[STEP 19] Querying /api/complaints/:id/history endpoint...');
    const histRes = await httpRequest('GET', `/api/complaints/${createdComplaint._id}/history`, null, adminToken);
    assert(histRes.status === 200, `History endpoint failed: ${histRes.status}`);
    const histData = histRes.body.data || histRes.body;
    assert(histData.complaint, 'History response missing complaint record');
    assert(Array.isArray(histData.events) && histData.events.length > 0, 'History response missing audit events');
    console.log(`  -> Found ${histData.events.length} audit trail entries across Complaint, Work Order & Maintenance.\n`);

    // -------------------------------------------------------------------------
    // Step 20: Cross-Role Persistence Verification (Staff, Admin, Engineer)
    // -------------------------------------------------------------------------
    console.log('[STEP 20] Cross-Role Persistence Verification against MongoDB:');
    // Staff View
    const staffRecheck = await httpRequest('GET', `/api/complaints/${createdComplaint._id}`, null, staffToken);
    assert(staffRecheck.body.data?.status === 'RESOLVED' || staffRecheck.body.data?.status === 'CLOSED', 'Staff does not see RESOLVED state');
    console.log(`  -> Staff re-check: Complaint ${complaintCode} is RESOLVED`);

    // Admin View
    const adminRecheck = await httpRequest('GET', `/api/complaints/${createdComplaint._id}`, null, adminToken);
    assert(adminRecheck.body.data?.status === 'RESOLVED' || adminRecheck.body.data?.status === 'CLOSED', 'Admin does not see RESOLVED state');
    console.log(`  -> Admin re-check: Complaint ${complaintCode} is RESOLVED`);

    // Engineer View
    const engRecheck = await httpRequest('GET', `/api/complaints/${createdComplaint._id}`, null, engToken);
    assert(engRecheck.body.data?.status === 'RESOLVED' || engRecheck.body.data?.status === 'CLOSED', 'Engineer does not see RESOLVED state');
    console.log(`  -> Engineer re-check: Complaint ${complaintCode} is RESOLVED`);

    console.log('\n========================================================================');
    console.log('  ALL 20 COMPLAINT LIFECYCLE VERIFICATION CHECKS PASSED (100% SUCCESS)');
    console.log('========================================================================\n');
  } finally {
    serverProcess?.kill();
  }
}

runComplaintLifecycleTest().catch((err) => {
  console.error('\n❌ TEST SUITE FAILED:', err);
  process.exit(1);
});
