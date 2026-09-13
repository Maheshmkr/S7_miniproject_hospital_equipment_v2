import ServiceReport from "../models/ServiceReport.js";
import Maintenance from "../models/Maintenance.js";
import WorkOrder from "../models/WorkOrder.js";
import Complaint from "../models/Complaint.js";
import Equipment from "../models/Equipment.js";
import { ApiError, asyncHandler, ok } from "../services/apiError.js";
import { findByAnyId, paginate } from "../services/validate.js";
import { logAudit } from "../services/auditService.js";
import { setEquipmentStatus } from "../services/lifecycleService.js";
import { recalculateEquipmentEhs } from "../services/ehsService.js";

export const listServiceReports = asyncHandler(async (req, res) => {
  const { equipmentId, engineerId, status, departmentId } = req.query;
  const { page, limit, skip } = paginate(req.query);
  const filter = {};
  if (equipmentId) filter.equipmentId = equipmentId;
  if (engineerId) filter.engineerId = engineerId;
  if (status) filter.status = status;
  if (req.user.role === "BIOMEDICAL_ENGINEER") filter.engineerId = req.user._id;

  let query = ServiceReport.find(filter)
    .populate({ path: "equipmentId", select: "equipmentId name category departmentId" })
    .populate("engineerId", "name initials")
    .populate("workOrderId", "workOrderId title")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  let [items, total] = await Promise.all([query, ServiceReport.countDocuments(filter)]);
  if (departmentId) {
    items = items.filter((r) => String(r.equipmentId?.departmentId) === String(departmentId));
    total = items.length;
  }
  return ok(res, { items, total, page, limit });
});

export const getServiceReport = asyncHandler(async (req, res) => {
  const report = await findByAnyId(ServiceReport, req.params.id, "serviceReportId");
  if (!report) throw new ApiError(404, "Service report not found");
  await report.populate([
    { path: "equipmentId" },
    { path: "workOrderId" },
    { path: "complaintId" },
    { path: "engineerId", select: "name initials title" },
    { path: "evidence" },
  ]);
  return ok(res, report);
});

export const updateServiceReport = asyncHandler(async (req, res) => {
  const report = await findByAnyId(ServiceReport, req.params.id, "serviceReportId");
  if (!report) throw new ApiError(404, "Service report not found");
  const wasStatus = report.status;
  const wasVerification = report.verificationStatus;

  Object.assign(report, req.body);

  const isApproved = req.body.status === "APPROVED" || req.body.verificationStatus === "VERIFIED";

  if (["APPROVED", "REJECTED"].includes(req.body.status) || isApproved) {
    report.reviewedBy = req.user._id;
    report.reviewedAt = new Date();
    if (req.body.status === "APPROVED") {
      report.verificationStatus = "VERIFIED";
    }
  }

  await report.save();

  // Cascade lifecycle state changes on approval
  if (isApproved) {
    // 1. Complete Maintenance
    const maintenanceId = report.maintenanceId;
    if (maintenanceId) {
      const maintenance = await Maintenance.findById(maintenanceId);
      if (maintenance && maintenance.status !== "COMPLETED") {
        maintenance.status = "COMPLETED";
        if (!maintenance.endTime) maintenance.endTime = new Date();
        maintenance.finalCondition = report.finalCondition || maintenance.finalCondition || "OPERATIONAL";
        maintenance.verification = {
          safetyVerified: true,
          performanceVerified: true,
          verifiedBy: req.user._id,
          verifiedAt: new Date(),
        };
        await maintenance.save();
      }
    }

    // 2. Complete Work Order
    const workOrderId = report.workOrderId;
    if (workOrderId) {
      const wo = await WorkOrder.findById(workOrderId);
      if (wo && wo.status !== "COMPLETED") {
        const prevWoStatus = wo.status;
        wo.status = "COMPLETED";
        if (!wo.completedAt) wo.completedAt = new Date();
        await wo.save();

        await logAudit({
          user: req.user,
          action: "WORK_ORDER_STATUS_CHANGED",
          module: "WorkOrder",
          recordId: wo.workOrderId,
          workOrderId: wo._id,
          equipmentId: wo.equipmentId,
          previousStatus: prevWoStatus,
          newStatus: "COMPLETED",
          description: `${wo.workOrderId} marked COMPLETED via approved service report ${report.serviceReportId}`,
        });
      }
    }

    // 3. Resolve Complaint
    const complaintId = report.complaintId;
    if (complaintId) {
      const complaint = await Complaint.findById(complaintId);
      if (complaint && !["RESOLVED", "CLOSED"].includes(complaint.status)) {
        complaint.status = "RESOLVED";
        if (!complaint.resolvedAt) complaint.resolvedAt = new Date();
        if (!complaint.resolution) {
          complaint.resolution =
            report.summaryOfWork ||
            report.correctiveAction ||
            report.engineerRemarks ||
            `Resolved via Service Report ${report.serviceReportId}`;
        }
        await complaint.save();
      }
    }

    // 4. Update Equipment to OPERATIONAL
    const equipmentId = report.equipmentId;
    if (equipmentId) {
      const equipment = await Equipment.findById(equipmentId);
      if (equipment) {
        await setEquipmentStatus(
          equipment,
          "OPERATIONAL",
          req.user,
          `Service Report ${report.serviceReportId} approved`,
        );
        // 5. Recalculate EHS
        await recalculateEquipmentEhs(equipment._id);
      }
    }
  }

  await logAudit({
    user: req.user,
    action: "SERVICE_REPORT_REVIEWED",
    module: "ServiceReport",
    recordId: report.serviceReportId,
    equipmentId: report.equipmentId,
    workOrderId: report.workOrderId,
    previousStatus: wasStatus,
    newStatus: report.status,
    description: `${report.serviceReportId} ${wasStatus} → ${report.status} (verification: ${wasVerification} → ${report.verificationStatus})`,
  });

  return ok(res, report);
});
