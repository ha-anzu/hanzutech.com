export type AppRole = "Admin" | "Production" | "Warehouse" | "Sales" | "Viewer";

const hierarchy: AppRole[] = ["Viewer", "Sales", "Warehouse", "Production", "Admin"];

export function roleFromHeaders(headers: Headers): AppRole {
  const role = headers.get("x-role") as AppRole | null;
  if (!role || !hierarchy.includes(role)) {
    return "Viewer";
  }
  return role;
}

export function requireRole(current: AppRole, minimum: AppRole) {
  if (hierarchy.indexOf(current) < hierarchy.indexOf(minimum)) {
    throw new Error(`Forbidden: ${minimum} role required`);
  }
}

export function canOverrideNegative(role: AppRole): boolean {
  return role === "Admin";
}
