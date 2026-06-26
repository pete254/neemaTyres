import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

// Use the Edge-safe config (no Prisma) so middleware runs in the Edge Runtime
export const { auth: middleware } = NextAuth(authConfig);

export const config = {
  matcher: ["/((?!api/auth|login|_next/static|_next/image|favicon.ico).*)"],
};
