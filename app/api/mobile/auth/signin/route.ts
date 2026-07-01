import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signMobileToken } from "@/app/api/mobile/_auth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = (await req.json()) as {
      email?: string;
      password?: string;
    };

    if (!email || !password) {
      return Response.json({ error: "email and password are required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      console.error("[mobile/signin] no user found for email:", email);
      return Response.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      console.error("[mobile/signin] wrong password for email:", email);
      return Response.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const token = await signMobileToken(user.id, user.email);

    return Response.json({
      token,
      user: { id: user.id, email: user.email, name: user.name },
    });
  } catch (err) {
    console.error("[mobile/auth/signin]", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
