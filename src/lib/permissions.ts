import type { Role } from "@prisma/client";
export type Permission =
  | "read"
  | "brand:write"
  | "workspace:manage"
  | "workspace:delete"
  | "connections:manage";
export function can(role: Role, permission: Permission) {
  if (permission === "read") return true;
  if (permission === "brand:write")
    return ["OWNER", "ADMIN", "EDITOR"].includes(role);
  if (permission === "workspace:manage" || permission === "connections:manage")
    return ["OWNER", "ADMIN"].includes(role);
  return role === "OWNER";
}
