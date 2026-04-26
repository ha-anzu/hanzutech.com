"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { AppRole } from "@/lib/auth";
import { APP_ROLE_COOKIE, allRoles, navByRole } from "@/lib/roles";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type Props = {
  initialRole: AppRole;
};

export function AppTopNav({ initialRole }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [role, setRole] = useState<AppRole>(initialRole);

  const links = useMemo(() => navByRole[role], [role]);

  function onRoleChange(nextRole: AppRole) {
    setRole(nextRole);
    document.cookie = `${APP_ROLE_COOKIE}=${nextRole}; Path=/; Max-Age=31536000; SameSite=Lax`;
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-50 border-b bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between gap-4 px-4">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-sm font-semibold tracking-wide">
            N2Jewelry Inventory
          </Link>
          <Badge variant="outline" className="hidden sm:inline-flex">
            {role}
          </Badge>
        </div>

        <nav className="hidden items-center gap-1 md:flex">
          {links.map((link) => (
            <Link key={link.href} href={link.href}>
              <Button variant={pathname === link.href ? "secondary" : "ghost"} size="sm">
                {link.label}
              </Button>
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <label className="text-xs text-muted-foreground">Role</label>
          <select
            value={role}
            onChange={(event) => onRoleChange(event.target.value as AppRole)}
            className="h-8 rounded-lg border border-input bg-background px-2 text-sm"
          >
            {allRoles.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>
      </div>
    </header>
  );
}
