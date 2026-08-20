export const dynamic = "force-dynamic";
// app/api/employee-portal/leave-requests/route.ts — employees raise & view their own leave requests
import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";
import { LEAVE_REASONS, parseDateOnly, workingDatesInRange } from "@/lib/leave";
import type { LeaveReason } from "@prisma/client";

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

export async function GET(request: NextRequest) {
  const employeeId = await getEmployeeFromToken(request);
  if (!employeeId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const requests = await prisma.leaveRequest.findMany({
      where: { employeeId },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(requests);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch leave requests" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const employeeId = await getEmployeeFromToken(request);
  if (!employeeId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { reason, startDate, endDate, note } = await request.json();

    if (!reason || !startDate || !endDate) {
      return NextResponse.json({ error: "Reason, start date and end date are required" }, { status: 400 });
    }
    if (!LEAVE_REASONS.some((r) => r.value === reason)) {
      return NextResponse.json({ error: "Invalid leave reason" }, { status: 400 });
    }

    const start = parseDateOnly(startDate);
    const end = parseDateOnly(endDate);
    if (end < start) {
      return NextResponse.json({ error: "End date cannot be before the start date" }, { status: 400 });
    }

    // Future dates are allowed; only genuinely stale requests are rejected.
    const days = workingDatesInRange(start, end).length;
    if (days === 0) {
      return NextResponse.json({ error: "That range contains no working days" }, { status: 400 });
    }

    // Block a second pending request that overlaps an existing one
    const clash = await prisma.leaveRequest.findFirst({
      where: {
        employeeId,
        status: { in: ["PENDING", "APPROVED"] },
        startDate: { lte: end },
        endDate: { gte: start },
      },
    });
    if (clash) {
      return NextResponse.json(
        { error: "You already have a pending or approved leave request overlapping these dates" },
        { status: 409 },
      );
    }

    const created = await prisma.leaveRequest.create({
      data: {
        employeeId,
        reason: reason as LeaveReason,
        startDate: start,
        endDate: end,
        days,
        note: note || null,
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to submit leave request" }, { status: 500 });
  }
}
