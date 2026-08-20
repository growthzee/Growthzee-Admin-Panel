export const dynamic = "force-dynamic";
// app/api/employee-portal/clients/route.ts — minimal client list so employees can file work against any client
import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "fallback-secret-change-in-production"
);

export async function GET(request: NextRequest) {
  const token = request.cookies.get("employee-token")?.value;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    if (payload.role !== "employee") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only the fields needed to pick a client — no contact details or credentials
    const clients = await prisma.client.findMany({
      select: { id: true, name: true, company: true },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(clients);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
