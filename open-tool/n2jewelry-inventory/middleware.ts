import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { APP_ROLE_COOKIE, isRouteAllowed, parseRole } from "@/lib/roles";

export function middleware(request: NextRequest) {
  const role = parseRole(request.cookies.get(APP_ROLE_COOKIE)?.value);
  const pathname = request.nextUrl.pathname;

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-role", role);

  if (pathname.startsWith("/api")) {
    return NextResponse.next({
      request: {
        headers: requestHeaders
      }
    });
  }

  if (!isRouteAllowed(role, pathname)) {
    const redirectUrl = new URL("/", request.url);
    redirectUrl.searchParams.set("denied", "1");
    return NextResponse.redirect(redirectUrl);
  }

  return NextResponse.next({
    request: {
      headers: requestHeaders
    }
  });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
