export const dynamic = "force-dynamic";
// app/api/employee-portal/tasks/[id]/route.ts - employee can mark their own tasks
import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "fallback-secret-change-in-production"
);

async function getEmployeeFromToken(request: NextRequest) {
  const token = request.cookies.get("employee-token")?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    if (payload.role !== "employee") return null;
    return payload.id as string;
  } catch { return null; }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const employeeId = await getEmployeeFromToken(request);
  if (!employeeId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { status, type } = await request.json();

  try {
    if (type === "client") {
      // Verify this client task is assigned to this employee
      const task = await prisma.clientTask.findFirst({ where: { id, employeeId } });
      if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });

      const updated = await prisma.clientTask.update({
        where: { id },
        data: {
          status,
          completedAt: status === "COMPLETED" ? new Date() : null,
        },
        include: { client: { select: { id: true, name: true, company: true } } },
      });
      return NextResponse.json(updated);
    } else {
      // Verify this task belongs to this employee
      const task = await prisma.task.findFirst({ where: { id, employeeId } });
      if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });

      const updated = await prisma.task.update({
        where: { id },
        data: {
          status,
          completedAt: status === "COMPLETED" ? new Date() : null,
        },
      });
      return NextResponse.json(updated);
    }
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to update task" }, { status: 500 });
  }
}
