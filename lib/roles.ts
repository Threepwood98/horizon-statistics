export type Role = "admin" | "manager" | "leader" | "user";

const GLOBAL_ROLES: readonly Role[] = ["manager", "admin"];
const APPROVER_ROLES: readonly Role[] = ["leader", "manager", "admin"];

export function isGlobalRole(role: string): boolean {
  return (GLOBAL_ROLES as readonly string[]).includes(role);
}

export function canApproveRole(role: string): boolean {
  return (APPROVER_ROLES as readonly string[]).includes(role);
}

export function isWorker(role: string): boolean {
  return role === "user";
}

export function isLeader(role: string): boolean {
  return role === "leader";
}