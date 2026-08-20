export const dynamic = "force-dynamic";
// app/api/leave-requests/route.ts — admin view of all leave requests
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import type { LeaveStatus } from "@prisma/client";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");

  try {
    const requests = await prisma.leaveRequest.findMany({
      where: status ? { status: status as LeaveStatus } : {},
      include: {
        employee: { select: { id: true, name: true, email: true, department: true, position: true } },
      },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    });
    return NextResponse.json(requests);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch leave requests" }, { status: 500 });
  }
}
