import { ApiError } from "../services/apiError.js";

/** requireRole("ADMINISTRATOR") or requireRole("ADMINISTRATOR", "BIOMEDICAL_ENGINEER") */
export function requireRole(...roles) {
  return function roleGuard(req, _res, next) {
    if (!req.user) return next(new ApiError(401, "Authentication required"));
    if (!roles.includes(req.user.role)) {
      return next(new ApiError(403, "You do not have access to this resource"));
    }
    next();
  };
}

/** Alias kept so route files can read `authorize("ADMINISTRATOR")`. */
export const authorize = requireRole;

/** Department staff may only reach records inside their own department. */
export function scopeToDepartment(req) {
  if (req.user?.role === "DEPARTMENT_STAFF" && req.user.departmentId) {
    return { departmentId: req.user.departmentId };
  }
  return {};
}
