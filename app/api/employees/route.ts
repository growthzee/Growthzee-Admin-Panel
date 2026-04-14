export const dynamic = "force-dynamic";
// app/api/employees/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") || "";
  const department = searchParams.get("department") || "";

  try {
    const employees = await prisma.employee.findMany({
      where: {
        AND: [
          search ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
              { position: { contains: search, mode: "insensitive" } },
            ],
          } : {},
          department ? { department } : {},
        ],
      },
      include: {
        tasks: {
          select: { id: true, status: true, title: true, priority: true, startDate: true, endDate: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(employees);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch employees" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const { name, email, phone, department, position, status } = body;

    if (!name || !email || !department || !position) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const employee = await prisma.employee.create({
      data: { name, email, phone, department, position, status: status || "ACTIVE" },
      include: { tasks: true },
    });

    return NextResponse.json(employee, { status: 201 });
  } catch (error: unknown) {
    if ((error as { code?: string }).code === "P2002") {
      return NextResponse.json({ error: "Email already exists" }, { status: 409 });
    }
    console.error(error);
    return NextResponse.json({ error: "Failed to create employee" }, { status: 500 });
  }
}
