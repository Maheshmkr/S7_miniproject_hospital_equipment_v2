import type { ModuleRecord, Tone } from "@/lib/modules";
import type { ApiRole, ApiUser } from "./types";

export const USER_ROLE_LABELS: Record<ApiRole, string> = {
  ADMINISTRATOR: "Administrator",
  BIOMEDICAL_ENGINEER: "Engineer",
  DEPARTMENT_STAFF: "Specialist",
};

export const labelToRole = (label?: string): ApiRole => {
  const clean = (label || "").trim().toLowerCase();
  if (clean.includes("admin")) return "ADMINISTRATOR";
  if (clean.includes("lead") || clean.includes("engineer")) return "BIOMEDICAL_ENGINEER";
  return "DEPARTMENT_STAFF";
};

const displayDate = (v?: string) =>
  v
    ? new Date(v).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
    : "Recently";

export const userDepartmentName = (dept?: string | { name?: string; code?: string }): string => {
  if (!dept) return "General";
  if (typeof dept === "string") return dept;
  return dept.name || dept.code || "General";
};

export const userDepartmentId = (dept?: string | { _id?: string }): string | undefined => {
  if (!dept) return undefined;
  if (typeof dept === "string") return dept;
  return dept._id;
};

/** ApiUser -> the ModuleRecord shape the workflow pages render. */
export function toUserRecord(u: ApiUser): ModuleRecord {
  const roleLabel = USER_ROLE_LABELS[u.role] ?? u.role;
  const deptName = userDepartmentName(u.departmentId);
  const statusLabel =
    u.status === "ACTIVE" ? "Active" : u.status === "INACTIVE" ? "Inactive" : "Suspended";
  const tone: Tone =
    u.status === "ACTIVE" ? "success" : u.status === "INACTIVE" ? "neutral" : "warning";
  const handle = u.employeeId ? `@${u.employeeId}` : `@${u.email.split("@")[0]}`;

  return {
    id: u._id,
    title: u.name,
    subtitle: `${roleLabel} · ${deptName}`,
    status: statusLabel,
    tone,
    score: u.status === "ACTIVE" ? 92 : 45,
    scoreLabel: "Activity",
    cells: [
      u.name,
      handle,
      roleLabel,
      deptName,
      statusLabel,
      displayDate(u.updatedAt || u.createdAt),
    ],
    meta: [
      { label: "Handle", value: handle },
      { label: "Role", value: roleLabel },
      { label: "Department", value: deptName },
      { label: "Work email", value: u.email },
      { label: "Title", value: u.title || "—" },
      { label: "Employee ID", value: u.employeeId || "—" },
      { label: "Phone", value: u.phone || "—" },
      { label: "Initials", value: u.initials || "—" },
      { label: "Status", value: statusLabel },
    ],
    values: {
      name: u.name,
      email: u.email,
      role: roleLabel,
      dept: deptName,
      title: u.title ?? "",
      employeeId: u.employeeId ?? "",
      phone: u.phone ?? "",
      status: statusLabel,
    },
    timeline: [
      {
        when: displayDate(u.updatedAt),
        who: "System",
        what: `account profile updated for ${u.name}`,
        tone: "primary",
      },
      {
        when: displayDate(u.createdAt),
        who: "Administrator",
        what: `enrolled ${u.name} into the Medixa directory`,
        tone: "success",
      },
    ],
  };
}

/** Form values from the User form -> API payload. */
export function toUserPayload(
  values: Record<string, string>,
): Partial<ApiUser> & { password?: string } {
  const role = labelToRole(values["role"]);
  const payload: Partial<ApiUser> & { password?: string } = {
    name: values["name"]?.trim() || "",
    email: values["email"]?.trim().toLowerCase() || "",
    role,
    title: values["title"] || values["role"] || undefined,
    departmentId: values["dept"] || values["departmentId"] || undefined,
    employeeId: values["employeeId"] || undefined,
    phone: values["phone"] || undefined,
  };
  if (values["password"] && values["password"].trim().length > 0) {
    payload.password = values["password"].trim();
  }
  return payload;
}
