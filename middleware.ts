import { NextRequest, NextResponse } from "next/server";

/**
 * Lightweight Edge middleware — checks for NextAuth session cookie only.
 * Full JWT verification happens in server components / actions via auth().
 * Cookie names: authjs.session-token (dev) or __Secure-authjs.session-token (prod/HTTPS).
 */
export function middleware(request: NextRequest) {
  const sessionToken =
    request.cookies.get("authjs.session-token")?.value ??
    request.cookies.get("__Secure-authjs.session-token")?.value;

  const isLoggedIn = !!sessionToken;
  const { pathname } = request.nextUrl;

  if (pathname === "/login") {
    if (isLoggedIn) return NextResponse.redirect(new URL("/dashboard", request.url));
    return NextResponse.next();
  }

  if (!isLoggedIn) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api/auth|api/mobile|_next/static|_next/image|favicon.ico).*)"],
};
