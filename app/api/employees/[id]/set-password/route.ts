export const dynamic = "force-dynamic";
// app/api/employees/[id]/set-password/route.ts
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  try {
    const { password, portalEnabled } = await request.json();

    if (password !== undefined && password !== "" && password.length < 6)
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });

    const updateData: Record<string, unknown> = {};
    if (password !== undefined && password !== "")
      updateData.password = await bcrypt.hash(password, 12);
    if (portalEnabled !== undefined)
      updateData.portalEnabled = portalEnabled;

    const employee = await prisma.employee.update({
      where: { id },
      data: updateData,
      select: { id: true, name: true, email: true, portalEnabled: true },
    });
    return NextResponse.json(employee);
  } catch (error: unknown) {
    if ((error as { code?: string }).code === "P2025")
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    console.error(error);
    return NextResponse.json({ error: "Failed to update portal settings" }, { status: 500 });
  }
}
