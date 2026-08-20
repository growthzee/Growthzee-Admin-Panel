export const dynamic = "force-dynamic";
// app/api/work-links/route.ts — admin view of employee-submitted work URLs
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get("clientId");
  const employeeId = searchParams.get("employeeId");

  try {
    const links = await prisma.workLink.findMany({
      where: {
        ...(clientId ? { clientId } : {}),
        ...(employeeId ? { employeeId } : {}),
      },
      include: {
        employee: { select: { id: true, name: true, department: true, position: true } },
        client: { select: { id: true, name: true, company: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(links);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch work links" }, { status: 500 });
  }
}
