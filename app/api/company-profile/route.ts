export const dynamic = "force-dynamic";
// app/api/company-profile/route.ts — the agency's own billing details used to prefill invoices
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

const PROFILE_ID = "default";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    // Single row — create it with defaults the first time it's requested
    const profile = await prisma.companyProfile.upsert({
      where: { id: PROFILE_ID },
      update: {},
      create: { id: PROFILE_ID },
    });
    return NextResponse.json(profile);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to load company profile" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const b = await request.json();
    const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
    const num = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0);

    if (!b.name?.trim()) {
      return NextResponse.json({ error: "Company name is required" }, { status: 400 });
    }

    const data = {
      name: b.name.trim(),
      address: str(b.address), gstin: str(b.gstin), pan: str(b.pan),
      phone: str(b.phone), email: str(b.email), website: str(b.website),
      bankName: str(b.bankName), bankAccountName: str(b.bankAccountName),
      bankAccountNumber: str(b.bankAccountNumber), bankIfsc: str(b.bankIfsc),
      bankBranch: str(b.bankBranch), upiId: str(b.upiId),
      defaultTaxMode: ["SIMPLE", "GST_SPLIT", "IGST"].includes(b.defaultTaxMode) ? b.defaultTaxMode : "GST_SPLIT",
      defaultCgst: num(b.defaultCgst), defaultSgst: num(b.defaultSgst), defaultIgst: num(b.defaultIgst),
      defaultCurrency: str(b.defaultCurrency) || "INR",
      paymentTerms: str(b.paymentTerms), lateFeeNote: str(b.lateFeeNote), signatureName: str(b.signatureName),
    };

    const profile = await prisma.companyProfile.upsert({
      where: { id: PROFILE_ID },
      update: data,
      create: { id: PROFILE_ID, ...data },
    });

    return NextResponse.json(profile);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to save company profile" }, { status: 500 });
  }
}
