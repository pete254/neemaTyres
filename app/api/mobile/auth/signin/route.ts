import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signMobileToken } from "@/app/api/mobile/_auth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { name, password } = (await req.json()) as {
      name?: string;
      password?: string;
    };

    if (!name || !password) {
      return Response.json({ error: "name and password are required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { name } });
    if (!user) {
      return Response.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return Response.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const token = await signMobileToken(user.id, user.name);

    return Response.json({
      token,
      user: { id: user.id, name: user.name, email: user.email ?? "" },
    });
  } catch (err) {
    console.error("[mobile/auth/signin]", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
