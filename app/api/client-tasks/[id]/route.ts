export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  try {
    const body = await request.json();
    const { title, description, category, subCategory, taskType, priority, status, startDate, endDate, employeeId, completedAt } = body;

    const data: Record<string, unknown> = {};
    if (title       !== undefined) data.title       = title;
    if (description !== undefined) data.description = description;
    if (category    !== undefined) data.category    = category    || null;
    if (subCategory !== undefined) data.subCategory = subCategory || null;
    if (taskType    !== undefined) data.taskType    = taskType    || null;
    if (priority    !== undefined) data.priority    = priority;
    if (startDate   !== undefined) data.startDate   = new Date(startDate);
    if (endDate     !== undefined) data.endDate     = new Date(endDate);
    if (employeeId  !== undefined) data.employeeId  = employeeId  || null;

    if (status !== undefined) {
      data.status = status;
      if (status === "COMPLETED") {
        data.completedAt = completedAt ? new Date(completedAt) : new Date();
      } else {
        data.completedAt = null;
      }
    }

    const task = await prisma.clientTask.update({
      where: { id },
      data,
      include: {
        client:   { select: { id: true, name: true, company: true, email: true } },
        employee: { select: { id: true, name: true, department: true, position: true } },
      },
    });
    return NextResponse.json(task);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to update task" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  try {
    await prisma.clientTask.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to delete task" }, { status: 500 });
  }
}
