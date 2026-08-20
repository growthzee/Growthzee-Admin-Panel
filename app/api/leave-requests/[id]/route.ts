export const dynamic = "force-dynamic";
// app/api/leave-requests/[id]/route.ts — admin approves or rejects a leave request
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { workingDatesInRange } from "@/lib/leave";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    const { status, reviewNote } = await request.json();
    if (!["APPROVED", "REJECTED", "CANCELLED"].includes(status)) {
      return NextResponse.json({ error: "Status must be APPROVED, REJECTED or CANCELLED" }, { status: 400 });
    }

    const leave = await prisma.leaveRequest.findUnique({ where: { id } });
    if (!leave) return NextResponse.json({ error: "Leave request not found" }, { status: 404 });

    const updated = await prisma.leaveRequest.update({
      where: { id },
      data: {
        status,
        reviewNote: reviewNote || null,
        reviewedBy: session.name,
        reviewedAt: new Date(),
      },
      include: { employee: { select: { id: true, name: true, department: true } } },
    });

    if (status === "APPROVED") {
      // Write the approved leave onto the employee's attendance record
      const dates = workingDatesInRange(leave.startDate, leave.endDate);
      await Promise.all(
        dates.map((date) =>
          prisma.attendance.upsert({
            where: { employeeId_date: { employeeId: leave.employeeId, date } },
            update: { status: "LEAVE", note: `Approved leave (${leave.reason})` },
            create: { employeeId: leave.employeeId, date, status: "LEAVE", note: `Approved leave (${leave.reason})` },
          }),
        ),
      );
    } else if (leave.status === "APPROVED") {
      // Reverting a previously approved request — clear the leave days it created
      const dates = workingDatesInRange(leave.startDate, leave.endDate);
      await prisma.attendance.deleteMany({
        where: { employeeId: leave.employeeId, date: { in: dates }, status: "LEAVE" },
      });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to update leave request" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    const leave = await prisma.leaveRequest.findUnique({ where: { id } });
    if (!leave) return NextResponse.json({ error: "Leave request not found" }, { status: 404 });

    if (leave.status === "APPROVED") {
      const dates = workingDatesInRange(leave.startDate, leave.endDate);
      await prisma.attendance.deleteMany({
        where: { employeeId: leave.employeeId, date: { in: dates }, status: "LEAVE" },
      });
    }

    await prisma.leaveRequest.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to delete leave request" }, { status: 500 });
  }
}
