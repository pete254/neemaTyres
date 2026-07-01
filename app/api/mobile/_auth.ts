import { jwtVerify, SignJWT } from "jose";
import { NextRequest } from "next/server";

const secret = new TextEncoder().encode(process.env.AUTH_SECRET!);

export async function verifyMobileToken(
  req: NextRequest
): Promise<{ userId: string; email: string }> {
  const header = req.headers.get("Authorization");
  if (!header?.startsWith("Bearer ")) throw new Error("missing_token");
  const token = header.slice(7);
  const { payload } = await jwtVerify(token, secret);
  if (typeof payload.userId !== "string" || typeof payload.email !== "string") {
    throw new Error("invalid_payload");
  }
  return { userId: payload.userId, email: payload.email };
}

export async function signMobileToken(userId: string, email: string): Promise<string> {
  return new SignJWT({ userId, email })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret);
}

export function unauthorized() {
  return Response.json({ error: "Unauthorized" }, { status: 401 });
}
