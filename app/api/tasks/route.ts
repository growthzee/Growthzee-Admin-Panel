export const dynamic = "force-dynamic";
// app/api/tasks/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const employeeId = searchParams.get("employeeId");
  const status = searchParams.get("status");

  try {
    const tasks = await prisma.task.findMany({
      where: {
        ...(employeeId ? { employeeId } : {}),
        ...(status ? { status: status as "PENDING" | "IN_PROGRESS" | "COMPLETED" | "OVERDUE" } : {}),
      },
      include: {
        employee: { select: { id: true, name: true, email: true, department: true, position: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(tasks);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch tasks" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const { title, description, priority, startDate, endDate, employeeId } = body;

    if (!title || !startDate || !endDate || !employeeId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const task = await prisma.task.create({
      data: {
        title,
        description,
        priority: priority || "MEDIUM",
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        employeeId,
      },
      include: {
        employee: { select: { id: true, name: true, email: true, department: true, position: true } },
      },
    });

    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to create task" }, { status: 500 });
  }
}
