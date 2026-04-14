export const dynamic = "force-dynamic";
// app/api/employee-portal/me/route.ts
import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "fallback-secret-change-in-production"
);

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("employee-token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { payload } = await jwtVerify(token, JWT_SECRET);
    if (payload.role !== "employee")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const employee = await prisma.employee.findUnique({
      where: { id: payload.id as string },
      include: {
        tasks: {
          orderBy: { startDate: "asc" },
        },
        clientTasks: {
          include: {
            client: { select: { id: true, name: true, company: true } },
          },
          orderBy: { startDate: "asc" },
        },
      },
    });

    if (!employee) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Strip password
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...safe } = employee;
    return NextResponse.json(safe);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
