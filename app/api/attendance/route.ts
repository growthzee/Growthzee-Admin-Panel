export const dynamic = "force-dynamic";
// app/api/attendance/route.ts — team-wide attendance for a month + bulk marking
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { MARKABLE_STATUSES } from "@/lib/workSchedule";
import type { AttendanceStatus } from "@prisma/client";

/** Parse YYYY-MM-DD as local noon so the stored date never drifts a day */
function parseDateOnly(value: string) {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d, 12, 0, 0);
}

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const year = parseInt(searchParams.get("year") || String(new Date().getFullYear()));
  const month = parseInt(searchParams.get("month") || String(new Date().getMonth() + 1));

  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);

  try {
    const [employees, records] = await Promise.all([
      prisma.employee.findMany({
        where: { status: { not: "INACTIVE" } },
        select: { id: true, name: true, department: true, position: true, status: true },
        orderBy: { name: "asc" },
      }),
      prisma.attendance.findMany({
        where: { date: { gte: startDate, lte: endDate } },
        select: { id: true, employeeId: true, date: true, status: true, note: true },
      }),
    ]);

    return NextResponse.json({ employees, records });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch attendance" }, { status: 500 });
  }
}

/** Bulk mark — accepts many employee/date pairs in one request */
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { entries } = await request.json();

    if (!Array.isArray(entries) || entries.length === 0) {
      return NextResponse.json({ error: "No entries to save" }, { status: 400 });
    }
    if (entries.length > 2000) {
      return NextResponse.json({ error: "Too many entries in one request" }, { status: 400 });
    }

    for (const e of entries) {
      if (!e?.employeeId || !e?.date || !e?.status) {
        return NextResponse.json({ error: "Each entry needs employeeId, date and status" }, { status: 400 });
      }
      if (!MARKABLE_STATUSES.includes(e.status)) {
        return NextResponse.json({ error: `Invalid status: ${e.status}` }, { status: 400 });
      }
    }

    await prisma.$transaction(
      entries.map((e: { employeeId: string; date: string; status: string; note?: string }) => {
        const date = parseDateOnly(e.date);
        return prisma.attendance.upsert({
          where: { employeeId_date: { employeeId: e.employeeId, date } },
          update: { status: e.status as AttendanceStatus, note: e.note || null },
          create: { employeeId: e.employeeId, date, status: e.status as AttendanceStatus, note: e.note || null },
        });
      }),
    );

    return NextResponse.json({ success: true, saved: entries.length });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to save attendance" }, { status: 500 });
  }
}
