export const dynamic = "force-dynamic";
// app/api/portal/logout/route.ts
import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({ success: true });
  response.cookies.delete("client-token");
  return response;
}
