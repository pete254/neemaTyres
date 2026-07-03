import { jwtVerify, SignJWT } from "jose";
import { NextRequest } from "next/server";

const secret = new TextEncoder().encode(process.env.AUTH_SECRET!);

export async function verifyMobileToken(
  req: NextRequest
): Promise<{ userId: string; name: string }> {
  const header = req.headers.get("Authorization");
  if (!header?.startsWith("Bearer ")) throw new Error("missing_token");
  const token = header.slice(7);
  const { payload } = await jwtVerify(token, secret);
  if (typeof payload.userId !== "string") {
    throw new Error("invalid_payload");
  }
  const name = typeof payload.name === "string" ? payload.name : (payload.email as string ?? "");
  return { userId: payload.userId, name };
}

export async function signMobileToken(userId: string, name: string): Promise<string> {
  return new SignJWT({ userId, name })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret);
}

export function unauthorized() {
  return Response.json({ error: "Unauthorized" }, { status: 401 });
}
