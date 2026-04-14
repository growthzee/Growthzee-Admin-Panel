export const dynamic = "force-dynamic";
// app/api/portal/me/route.ts
import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "fallback-secret-change-in-production"
);

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("client-token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { payload } = await jwtVerify(token, JWT_SECRET);
    if (payload.role !== "client") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const client = await prisma.client.findUnique({
      where: { id: payload.id as string },
      include: {
        clientTasks: {
          include: {
            employee: { select: { id: true, name: true, position: true, department: true } },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });

    // Don't expose the password
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...safeClient } = client;
    return NextResponse.json(safeClient);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
