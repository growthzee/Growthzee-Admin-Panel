export const dynamic = "force-dynamic";
// app/api/auth/seed/route.ts
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const existing = await prisma.admin.findUnique({ where: { email: "admin@company.com" } });
    if (existing) {
      return NextResponse.json({ message: "Admin already exists. Email: admin@company.com, Password: admin123" });
    }

    const hashed = await bcrypt.hash("admin123", 12);
    await prisma.admin.create({
      data: {
        email: "admin@company.com",
        password: hashed,
        name: "Super Admin",
      },
    });

    return NextResponse.json({
      message: "Admin created successfully!",
      credentials: { email: "admin@company.com", password: "admin123" },
    });
  } catch (error) {
    console.error("Seed error:", error);
    return NextResponse.json({ error: "Failed to create admin" }, { status: 500 });
  }
}
