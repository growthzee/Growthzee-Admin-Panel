export const dynamic = "force-dynamic";
// app/api/employee-portal/logout/route.ts
import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({ success: true });
  response.cookies.delete("employee-token");
  return response;
}
