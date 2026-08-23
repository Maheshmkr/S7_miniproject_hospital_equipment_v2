import ServiceReport from "../models/ServiceReport.js";
import { ApiError, asyncHandler, ok } from "../services/apiError.js";
import { findByAnyId, paginate } from "../services/validate.js";
import { logAudit } from "../services/auditService.js";

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
  Object.assign(report, req.body);
  if (["APPROVED", "REJECTED"].includes(req.body.status)) {
    report.reviewedBy = req.user._id;
    report.reviewedAt = new Date();
  }
  await report.save();
  await logAudit({
    user: req.user,
    action: "SERVICE_REPORT_REVIEWED",
    module: "ServiceReport",
    recordId: report.serviceReportId,
    equipmentId: report.equipmentId,
    workOrderId: report.workOrderId,
    previousStatus: wasStatus,
    newStatus: report.status,
    description: `${report.serviceReportId} ${wasStatus} → ${report.status}`,
  });
  return ok(res, report);
});
