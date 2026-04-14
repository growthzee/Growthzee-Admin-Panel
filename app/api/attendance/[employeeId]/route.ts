export const dynamic = "force-dynamic";
// app/api/attendance/[employeeId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ employeeId: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { employeeId } = await params;
  const { searchParams } = new URL(request.url);
  const year  = parseInt(searchParams.get("year")  || String(new Date().getFullYear()));
  const month = parseInt(searchParams.get("month") || String(new Date().getMonth() + 1));

  const startDate = new Date(year, month - 1, 1);
  const endDate   = new Date(year, month, 0); // last day of month

  try {
    const records = await prisma.attendance.findMany({
      where: {
        employeeId,
        date: { gte: startDate, lte: endDate },
      },
      orderBy: { date: "asc" },
    });
    return NextResponse.json(records);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch attendance" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ employeeId: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { employeeId } = await params;

  try {
    const body = await request.json();
    const { date, status, note } = body;

    if (!date || !status) {
      return NextResponse.json({ error: "Date and status are required" }, { status: 400 });
    }

    // Parse date as local date to avoid timezone shift
    const [y, m, d] = date.split("-").map(Number);
    const parsedDate = new Date(y, m - 1, d, 12, 0, 0); // noon local time

    const record = await prisma.attendance.upsert({
      where: { employeeId_date: { employeeId, date: parsedDate } },
      update: { status, note: note || null },
      create: { employeeId, date: parsedDate, status, note: note || null },
    });

    return NextResponse.json(record);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to save attendance" }, { status: 500 });
  }
}
