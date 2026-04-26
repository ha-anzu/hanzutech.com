import type { AppRole } from "@/lib/auth";

export const APP_ROLE_COOKIE = "n2_role";

export const allRoles: AppRole[] = ["Admin", "Production", "Warehouse", "Sales", "Viewer"];

export function parseRole(value: string | null | undefined): AppRole {
  if (!value) return "Viewer";
  return allRoles.includes(value as AppRole) ? (value as AppRole) : "Viewer";
}

const roleRank: Record<AppRole, number> = {
  Viewer: 0,
  Sales: 1,
  Warehouse: 2,
  Production: 3,
  Admin: 4
};

export function hasMinRole(current: AppRole, required: AppRole) {
  return roleRank[current] >= roleRank[required];
}

export function isRouteAllowed(role: AppRole, pathname: string) {
  if (pathname === "/") return true;

  if (pathname.startsWith("/settings")) {
    return role === "Admin";
  }
  if (pathname.startsWith("/products")) {
    return role === "Admin" || role === "Production" || role === "Sales";
  }
  if (pathname.startsWith("/inventory") || pathname.startsWith("/scan")) {
    return role === "Admin" || role === "Production" || role === "Warehouse";
  }
  if (pathname.startsWith("/production")) {
    return role === "Admin" || role === "Production";
  }
  if (pathname.startsWith("/consignment")) {
    return role === "Admin" || role === "Sales";
  }
  return true;
}

export const navByRole = {
  Admin: [
    { label: "Dashboard", href: "/" },
    { label: "Products", href: "/products" },
    { label: "Inventory", href: "/inventory" },
    { label: "Production", href: "/production" },
    { label: "Consignment", href: "/consignment" },
    { label: "Scanner", href: "/scan" },
    { label: "Settings", href: "/settings" }
  ],
  Production: [
    { label: "Dashboard", href: "/" },
    { label: "Products", href: "/products" },
    { label: "Inventory", href: "/inventory" },
    { label: "Production", href: "/production" },
    { label: "Scanner", href: "/scan" }
  ],
  Warehouse: [
    { label: "Dashboard", href: "/" },
    { label: "Inventory", href: "/inventory" },
    { label: "Scanner", href: "/scan" }
  ],
  Sales: [
    { label: "Dashboard", href: "/" },
    { label: "Products", href: "/products" },
    { label: "Consignment", href: "/consignment" }
  ],
  Viewer: [{ label: "Dashboard", href: "/" }]
} satisfies Record<AppRole, Array<{ label: string; href: string }>>;
