export const dynamic = "force-dynamic";
// app/api/portal/login/route.ts
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { SignJWT } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "fallback-secret-change-in-production"
);

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    const client = await prisma.client.findUnique({ where: { email } });

    if (!client || !client.password || !client.portalEnabled) {
      return NextResponse.json({ error: "Invalid credentials or portal access not enabled" }, { status: 401 });
    }

    const isValid = await bcrypt.compare(password, client.password);
    if (!isValid) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const token = await new SignJWT({
      id: client.id,
      email: client.email,
      name: client.name,
      role: "client",
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("24h")
      .sign(JWT_SECRET);

    const response = NextResponse.json({
      success: true,
      client: { id: client.id, email: client.email, name: client.name },
    });

    response.cookies.set("client-token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24,
    });

    return response;
  } catch (error) {
    console.error("Portal login error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
