import ChecklistTemplate from "../models/ChecklistTemplate.js";
import ChecklistQuestion, { QUESTION_PRIORITIES, RESPONSE_TYPES } from "../models/ChecklistQuestion.js";
import { ApiError, asyncHandler, created, ok } from "../services/apiError.js";
import { assertEnum, requireFields } from "../services/validate.js";
import { logAudit } from "../services/auditService.js";

export const listTemplates = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.category) filter.equipmentCategory = req.query.category;
  if (req.query.equipmentId) filter.equipmentId = req.query.equipmentId;
  if (req.query.active) filter.active = req.query.active === "true";
  const templates = await ChecklistTemplate.find(filter).sort({ createdAt: -1 }).lean();
  const counts = await ChecklistQuestion.aggregate([
    { $match: { templateId: { $in: templates.map((t) => t._id) }, active: true } },
    { $group: { _id: "$templateId", count: { $sum: 1 } } },
  ]);
  const countMap = new Map(counts.map((c) => [String(c._id), c.count]));
  return ok(res, templates.map((t) => ({ ...t, questionCount: countMap.get(String(t._id)) || 0 })));
});

export const getTemplate = asyncHandler(async (req, res) => {
  const template = await ChecklistTemplate.findById(req.params.id);
  if (!template) throw new ApiError(404, "Checklist template not found");
  const questions = await ChecklistQuestion.find({ templateId: template._id }).sort({ order: 1 });
  return ok(res, { template, questions });
});

export const createTemplate = asyncHandler(async (req, res) => {
  requireFields(req.body, ["name"]);
  if (!req.body.equipmentCategory && !req.body.equipmentId) {
    throw new ApiError(400, "Provide equipmentCategory or equipmentId");
  }
  const template = await ChecklistTemplate.create({ ...req.body, createdBy: req.user._id });
  await logAudit({ user: req.user, action: "CHECKLIST_TEMPLATE_CREATED", module: "Checklist", recordId: template._id, description: `Template ${template.name} created` });
  return created(res, template);
});

export const updateTemplate = asyncHandler(async (req, res) => {
  const template = await ChecklistTemplate.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!template) throw new ApiError(404, "Checklist template not found");
  await logAudit({ user: req.user, action: "CHECKLIST_TEMPLATE_UPDATED", module: "Checklist", recordId: template._id, description: `Template ${template.name} updated` });
  return ok(res, template);
});

export const deleteTemplate = asyncHandler(async (req, res) => {
  const template = await ChecklistTemplate.findByIdAndDelete(req.params.id);
  if (!template) throw new ApiError(404, "Checklist template not found");
  await ChecklistQuestion.deleteMany({ templateId: template._id });
  await logAudit({ user: req.user, action: "CHECKLIST_TEMPLATE_DELETED", module: "Checklist", recordId: req.params.id, description: `Template ${template.name} deleted` });
  return ok(res, null, "Template deleted");
});

export const addQuestion = asyncHandler(async (req, res) => {
  const template = await ChecklistTemplate.findById(req.params.id);
  if (!template) throw new ApiError(404, "Checklist template not found");
  requireFields(req.body, ["question", "responseType"]);
  assertEnum(req.body.responseType, RESPONSE_TYPES, "responseType");
  assertEnum(req.body.priority, QUESTION_PRIORITIES, "priority");
  if (req.body.responseType === "DROPDOWN" && !(req.body.options || []).length) {
    throw new ApiError(400, "Dropdown questions need at least one option");
  }
  const count = await ChecklistQuestion.countDocuments({ templateId: template._id });
  const question = await ChecklistQuestion.create({
    ...req.body,
    templateId: template._id,
    order: req.body.order ?? count,
  });
  await logAudit({ user: req.user, action: "CHECKLIST_QUESTION_CREATED", module: "Checklist", recordId: question._id, description: `Question added to ${template.name}` });
  return created(res, question);
});

export const updateQuestion = asyncHandler(async (req, res) => {
  assertEnum(req.body.responseType, RESPONSE_TYPES, "responseType");
  assertEnum(req.body.priority, QUESTION_PRIORITIES, "priority");
  const question = await ChecklistQuestion.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!question) throw new ApiError(404, "Checklist question not found");
  await logAudit({ user: req.user, action: "CHECKLIST_QUESTION_UPDATED", module: "Checklist", recordId: question._id, description: `Question updated` });
  return ok(res, question);
});

export const deleteQuestion = asyncHandler(async (req, res) => {
  const question = await ChecklistQuestion.findByIdAndDelete(req.params.id);
  if (!question) throw new ApiError(404, "Checklist question not found");
  await logAudit({ user: req.user, action: "CHECKLIST_QUESTION_DELETED", module: "Checklist", recordId: req.params.id, description: `Question removed` });
  return ok(res, null, "Question deleted");
});
