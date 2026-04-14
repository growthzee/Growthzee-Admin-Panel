// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "fallback-secret-change-in-production"
);

async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload;
  } catch { return null; }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const adminToken    = request.cookies.get("auth-token")?.value;
  const clientToken   = request.cookies.get("client-token")?.value;
  const employeeToken = request.cookies.get("employee-token")?.value;

  // ── PUBLIC: all login/logout/seed API routes pass through freely ──────────
  // These must be checked BEFORE any protection rules below
  if (
    pathname === "/api/auth/login" ||
    pathname === "/api/auth/logout" ||
    pathname === "/api/auth/seed" ||
    pathname === "/api/portal/login" ||
    pathname === "/api/portal/logout" ||
    pathname === "/api/employee-portal/login" ||
    pathname === "/api/employee-portal/logout"
  ) {
    return NextResponse.next();
  }

  // ── Root ──────────────────────────────────────────────────────────────────
  if (pathname === "/") {
    if (adminToken && await verifyToken(adminToken))
      return NextResponse.redirect(new URL("/dashboard", request.url));
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // ── Admin login page ──────────────────────────────────────────────────────
  if (pathname === "/login") {
    if (adminToken && await verifyToken(adminToken))
      return NextResponse.redirect(new URL("/dashboard", request.url));
    return NextResponse.next();
  }

  // ── Client login page ─────────────────────────────────────────────────────
  if (pathname === "/client-login") {
    if (clientToken) {
      const p = await verifyToken(clientToken);
      if (p?.role === "client") return NextResponse.redirect(new URL("/portal", request.url));
    }
    return NextResponse.next();
  }

  // ── Employee login page ───────────────────────────────────────────────────
  if (pathname === "/employee-login") {
    if (employeeToken) {
      const p = await verifyToken(employeeToken);
      if (p?.role === "employee") return NextResponse.redirect(new URL("/employee-portal", request.url));
    }
    return NextResponse.next();
  }

  // ── Admin dashboard pages ─────────────────────────────────────────────────
  if (pathname.startsWith("/dashboard")) {
    if (!adminToken) return NextResponse.redirect(new URL("/login", request.url));
    if (!await verifyToken(adminToken)) return NextResponse.redirect(new URL("/login", request.url));
    return NextResponse.next();
  }

  // ── Client portal pages ───────────────────────────────────────────────────
  if (pathname.startsWith("/portal")) {
    if (!clientToken) return NextResponse.redirect(new URL("/client-login", request.url));
    const p = await verifyToken(clientToken);
    if (!p || p.role !== "client") return NextResponse.redirect(new URL("/client-login", request.url));
    return NextResponse.next();
  }

  // ── Employee portal pages ─────────────────────────────────────────────────
  if (pathname.startsWith("/employee-portal")) {
    if (!employeeToken) return NextResponse.redirect(new URL("/employee-login", request.url));
    const p = await verifyToken(employeeToken);
    if (!p || p.role !== "employee") return NextResponse.redirect(new URL("/employee-login", request.url));
    return NextResponse.next();
  }

  // ── Employee portal API (me, tasks) — requires employee-token ─────────────
  if (
    pathname.startsWith("/api/employee-portal/me") ||
    pathname.startsWith("/api/employee-portal/tasks")
  ) {
    if (!employeeToken) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const p = await verifyToken(employeeToken);
    if (!p || p.role !== "employee") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.next();
  }

  // ── Client portal API (me) — requires client-token ───────────────────────
  if (pathname.startsWith("/api/portal/me")) {
    if (!clientToken) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const p = await verifyToken(clientToken);
    if (!p || p.role !== "client") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.next();
  }

  // ── Admin APIs — requires admin auth-token ────────────────────────────────
  if (
    pathname.startsWith("/api/employees") ||
    pathname.startsWith("/api/tasks") ||
    pathname.startsWith("/api/clients") ||
    pathname.startsWith("/api/client-tasks") ||
    pathname.startsWith("/api/attendance")
  ) {
    if (!adminToken) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!await verifyToken(adminToken)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
