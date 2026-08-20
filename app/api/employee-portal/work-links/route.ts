export const dynamic = "force-dynamic";
// app/api/employee-portal/work-links/route.ts — employees submit deliverable URLs per client
import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";
import { WORK_LINK_TYPES, detectLinkType, isValidUrl } from "@/lib/workLinks";
import type { WorkLinkType } from "@prisma/client";

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
    const links = await prisma.workLink.findMany({
      where: { employeeId },
      include: { client: { select: { id: true, name: true, company: true } } },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(links);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch work links" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const employeeId = await getEmployeeFromToken(request);
  if (!employeeId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { clientId, title, url, linkType, note } = await request.json();

    if (!clientId || !title?.trim() || !url?.trim()) {
      return NextResponse.json({ error: "Client, title and link are required" }, { status: 400 });
    }
    if (!isValidUrl(url)) {
      return NextResponse.json({ error: "Enter a valid link starting with http:// or https://" }, { status: 400 });
    }

    // Any employee may file work against any client — just confirm the client exists
    const client = await prisma.client.findUnique({ where: { id: clientId }, select: { id: true } });
    if (!client) {
      return NextResponse.json({ error: "That client no longer exists" }, { status: 404 });
    }

    const resolvedType = linkType && WORK_LINK_TYPES.some((t) => t.value === linkType)
      ? linkType
      : detectLinkType(url);

    const created = await prisma.workLink.create({
      data: {
        clientId,
        employeeId,
        title: title.trim(),
        url: url.trim(),
        linkType: resolvedType as WorkLinkType,
        note: note?.trim() || null,
      },
      include: { client: { select: { id: true, name: true, company: true } } },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to submit link" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const employeeId = await getEmployeeFromToken(request);
  if (!employeeId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  try {
    // Employees can only withdraw their own submissions
    const link = await prisma.workLink.findFirst({ where: { id, employeeId } });
    if (!link) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await prisma.workLink.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to delete link" }, { status: 500 });
  }
}
