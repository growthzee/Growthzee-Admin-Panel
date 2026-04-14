export const dynamic = "force-dynamic";
// app/api/employee-portal/login/route.ts
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
    if (!email || !password)
      return NextResponse.json({ error: "Email and password required" }, { status: 400 });

    const employee = await prisma.employee.findUnique({ where: { email } });
    if (!employee || !employee.password || !employee.portalEnabled)
      return NextResponse.json({ error: "Invalid credentials or portal access not enabled" }, { status: 401 });

    const isValid = await bcrypt.compare(password, employee.password);
    if (!isValid)
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });

    const token = await new SignJWT({
      id: employee.id,
      email: employee.email,
      name: employee.name,
      role: "employee",
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("24h")
      .sign(JWT_SECRET);

    const response = NextResponse.json({
      success: true,
      employee: { id: employee.id, email: employee.email, name: employee.name },
    });
    response.cookies.set("employee-token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24,
    });
    return response;
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
