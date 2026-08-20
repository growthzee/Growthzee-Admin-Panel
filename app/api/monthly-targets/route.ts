export const dynamic = "force-dynamic";
// app/api/monthly-targets/route.ts — admin sets the monthly delivery quota per client
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get("clientId");
  const year = searchParams.get("year");

  try {
    const targets = await prisma.monthlyTarget.findMany({
      where: {
        ...(clientId ? { clientId } : {}),
        ...(year ? { year: parseInt(year) } : {}),
      },
      orderBy: [{ year: "desc" }, { month: "desc" }],
    });
    return NextResponse.json(targets);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch targets" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { clientId, year, month, target, note } = await request.json();

    if (!clientId || !year || !month) {
      return NextResponse.json({ error: "clientId, year and month are required" }, { status: 400 });
    }
    if (month < 1 || month > 12) {
      return NextResponse.json({ error: "Month must be between 1 and 12" }, { status: 400 });
    }
    const targetCount = Number(target);
    if (!Number.isFinite(targetCount) || targetCount < 0) {
      return NextResponse.json({ error: "Target must be zero or more" }, { status: 400 });
    }

    const saved = await prisma.monthlyTarget.upsert({
      where: { clientId_year_month: { clientId, year: Number(year), month: Number(month) } },
      update: { target: Math.round(targetCount), note: note || null },
      create: {
        clientId,
        year: Number(year),
        month: Number(month),
        target: Math.round(targetCount),
        note: note || null,
      },
    });

    return NextResponse.json(saved, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to save target" }, { status: 500 });
  }
}
