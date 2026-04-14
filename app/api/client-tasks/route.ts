export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const clientId   = searchParams.get("clientId");
  const employeeId = searchParams.get("employeeId");
  const status     = searchParams.get("status");
  const category   = searchParams.get("category");

  try {
    const tasks = await prisma.clientTask.findMany({
      where: {
        ...(clientId   ? { clientId }   : {}),
        ...(employeeId ? { employeeId } : {}),
        ...(status     ? { status: status as "PENDING"|"IN_PROGRESS"|"COMPLETED"|"CHANGES_REQUIRED"|"OVERDUE" } : {}),
        ...(category   ? { category }   : {}),
      },
      include: {
        client:   { select: { id: true, name: true, company: true, email: true } },
        employee: { select: { id: true, name: true, department: true, position: true } },
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
    const { title, description, category, subCategory, taskType, priority, startDate, endDate, clientId, employeeId } = body;

    if (!title || !startDate || !endDate || !clientId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const task = await prisma.clientTask.create({
      data: {
        title,
        description,
        category:    category    || null,
        subCategory: subCategory || null,
        taskType:    taskType    || null,
        priority:    priority    || "MEDIUM",
        startDate:   new Date(startDate),
        endDate:     new Date(endDate),
        clientId,
        employeeId: employeeId || null,
      },
      include: {
        client:   { select: { id: true, name: true, company: true, email: true } },
        employee: { select: { id: true, name: true, department: true, position: true } },
      },
    });

    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to create task" }, { status: 500 });
  }
}
