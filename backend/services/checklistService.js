import ChecklistTemplate from "../models/ChecklistTemplate.js";
import ChecklistQuestion from "../models/ChecklistQuestion.js";

/**
 * Resolve the applicable checklist for an equipment item.
 * Equipment-specific templates take priority and are appended on top of the
 * inherited category templates, so an asset never loses the category baseline.
 */
export async function resolveChecklistForEquipment(equipment, maintenanceType) {
  const typeFilter = maintenanceType
    ? { maintenanceType: { $in: [maintenanceType.toUpperCase(), "ALL"] } }
    : {};

  const categoryTemplates = await ChecklistTemplate.find({
    active: true,
    equipmentId: { $in: [null, undefined] },
    equipmentCategory: equipment.category,
    ...typeFilter,
  }).lean();

  const assetTemplates = await ChecklistTemplate.find({
    active: true,
    equipmentId: equipment._id,
    ...typeFilter,
  }).lean();

  const templates = [...categoryTemplates, ...assetTemplates];
  if (!templates.length) return { templates: [], questions: [] };

  const questions = await ChecklistQuestion.find({
    templateId: { $in: templates.map((t) => t._id) },
    active: true,
  })
    .sort({ order: 1, createdAt: 1 })
    .lean();

  const scopeOf = (templateId) =>
    assetTemplates.some((t) => String(t._id) === String(templateId)) ? "equipment" : "category";

  return {
    templates,
    questions: questions
      .map((q) => ({ ...q, scope: scopeOf(q.templateId) }))
      // equipment-specific questions render after the inherited category set
      .sort((a, b) => (a.scope === b.scope ? a.order - b.order : a.scope === "category" ? -1 : 1)),
  };
}

export function normaliseOutcome(responseType, response) {
  const value = String(response ?? "").toUpperCase();
  if (responseType === "PASS_FAIL") return value === "FAIL" ? "FAIL" : value === "PASS" ? "PASS" : "NA";
  if (responseType === "YES_NO") return value === "NO" ? "FAIL" : value === "YES" ? "PASS" : "NA";
  return value ? "ANSWERED" : "NA";
}
