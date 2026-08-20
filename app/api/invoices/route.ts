export const dynamic = "force-dynamic";
// app/api/invoices/route.ts — admin raises and lists invoices
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { generateInvoiceNumber, parseDateOnly, type InvoiceItemInput } from "@/lib/billing";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get("clientId");

  try {
    const invoices = await prisma.invoice.findMany({
      where: clientId ? { clientId } : {},
      include: {
        items: true,
        client: { select: { id: true, name: true, company: true, email: true } },
      },
      orderBy: { issueDate: "desc" },
    });
    return NextResponse.json(invoices);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch invoices" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const { clientId, issueDate, dueDate, periodYear, periodMonth, currency, taxPercent, notes, items } = body;

    if (!clientId || !issueDate) {
      return NextResponse.json({ error: "Client and issue date are required" }, { status: 400 });
    }

    const lineItems: InvoiceItemInput[] = Array.isArray(items)
      ? items.filter((i: InvoiceItemInput) => i && i.description?.trim())
      : [];
    if (lineItems.length === 0) {
      return NextResponse.json({ error: "Add at least one line item" }, { status: 400 });
    }

    const invoice = await prisma.invoice.create({
      data: {
        clientId,
        number: generateInvoiceNumber(parseDateOnly(issueDate)),
        issueDate: parseDateOnly(issueDate),
        dueDate: dueDate ? parseDateOnly(dueDate) : null,
        periodYear: periodYear ? Number(periodYear) : null,
        periodMonth: periodMonth ? Number(periodMonth) : null,
        currency: currency || "INR",
        taxPercent: Number(taxPercent) || 0,
        notes: notes || null,
        items: {
          create: lineItems.map((i) => ({
            description: i.description.trim(),
            quantity: Number(i.quantity) || 1,
            unitPrice: Number(i.unitPrice) || 0,
          })),
        },
      },
      include: { items: true },
    });

    return NextResponse.json(invoice, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to create invoice" }, { status: 500 });
  }
}
