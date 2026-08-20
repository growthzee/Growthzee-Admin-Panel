export const dynamic = "force-dynamic";
// app/invoice/[id]/page.tsx — printable invoice, viewable by the admin or the owning client
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { money, invoiceTotals, MONTHS } from "@/lib/billing";
import PrintButton from "./PrintButton";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "fallback-secret-change-in-production"
);

async function readToken(name: string) {
  const store = await cookies();
  const token = store.get(name)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as { id?: string; role?: string; name?: string };
  } catch { return null; }
}

function fmt(date: Date) {
  return new Date(date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: {
      items: true,
      client: { select: { id: true, name: true, company: true, email: true, phone: true } },
    },
  });
  if (!invoice) notFound();

  // Either an admin, or the client this invoice belongs to
  const admin = await readToken("auth-token");
  const clientSession = await readToken("client-token");
  const isAdmin = !!admin?.id;
  const isOwningClient = clientSession?.role === "client" && clientSession.id === invoice.clientId;
  if (!isAdmin && !isOwningClient) {
    return (
      <div className="invoice-denied">
        <p style={{ fontSize: 30, marginBottom: 10 }}>🔒</p>
        <h1 style={{ fontSize: 18, fontWeight: 700, color: "var(--tx-primary)", marginBottom: 6 }}>
          You don&apos;t have access to this invoice
        </h1>
        <p style={{ fontSize: 13.5, color: "var(--tx-tertiary)", marginBottom: 18 }}>
          Sign in with the account this invoice was issued to.
        </p>
        <a href="/client-login" className="btn btn-primary" style={{ textDecoration: "none" }}>Go to client login</a>
      </div>
    );
  }

  const { subtotal, tax, total } = invoiceTotals(invoice.items, invoice.taxPercent);
  const period = invoice.periodMonth && invoice.periodYear
    ? `${MONTHS[invoice.periodMonth - 1]} ${invoice.periodYear}`
    : null;

  return (
    <div className="invoice-page">
      <div className="invoice-toolbar no-print">
        <a href={isAdmin ? `/dashboard/clients/${invoice.clientId}` : "/portal"} className="btn btn-secondary btn-sm" style={{ textDecoration: "none" }}>
          ← Back
        </a>
        <PrintButton />
      </div>

      <div className="invoice-sheet">
        {/* Header */}
        <div className="invoice-head">
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <div className="invoice-logo">G</div>
              <div>
                <p style={{ fontSize: 15, fontWeight: 700, color: "var(--tx-primary)" }}>GrowthZee CRM</p>
                <p style={{ fontSize: 11.5, color: "var(--tx-tertiary)" }}>Team &amp; Client Operations</p>
              </div>
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <p style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em", color: "var(--tx-primary)" }}>INVOICE</p>
            <p style={{ fontSize: 12.5, color: "var(--tx-secondary)", marginTop: 2 }}>{invoice.number}</p>
            <span className={`badge ${invoice.status === "PAID" ? "badge-green" : invoice.status === "CANCELLED" ? "badge-red" : "badge-blue"}`} style={{ marginTop: 6 }}>
              {invoice.status}
            </span>
          </div>
        </div>

        {/* Meta */}
        <div className="invoice-meta">
          <div>
            <p className="invoice-meta-label">Billed to</p>
            <p style={{ fontSize: 13.5, fontWeight: 600, color: "var(--tx-primary)" }}>
              {invoice.client.company || invoice.client.name}
            </p>
            {invoice.client.company && (
              <p style={{ fontSize: 12.5, color: "var(--tx-secondary)" }}>{invoice.client.name}</p>
            )}
            <p style={{ fontSize: 12.5, color: "var(--tx-tertiary)" }}>{invoice.client.email}</p>
            {invoice.client.phone && <p style={{ fontSize: 12.5, color: "var(--tx-tertiary)" }}>{invoice.client.phone}</p>}
          </div>
          <div>
            <p className="invoice-meta-label">Invoice date</p>
            <p className="invoice-meta-value">{fmt(invoice.issueDate)}</p>
            {invoice.dueDate && (
              <>
                <p className="invoice-meta-label" style={{ marginTop: 10 }}>Due date</p>
                <p className="invoice-meta-value">{fmt(invoice.dueDate)}</p>
              </>
            )}
            {period && (
              <>
                <p className="invoice-meta-label" style={{ marginTop: 10 }}>Billing period</p>
                <p className="invoice-meta-value">{period}</p>
              </>
            )}
          </div>
        </div>

        {/* Items */}
        <table className="invoice-table">
          <thead>
            <tr>
              <th style={{ textAlign: "left" }}>Description</th>
              <th style={{ textAlign: "right", width: 80 }}>Qty</th>
              <th style={{ textAlign: "right", width: 120 }}>Rate</th>
              <th style={{ textAlign: "right", width: 130 }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((item) => (
              <tr key={item.id}>
                <td>{item.description}</td>
                <td style={{ textAlign: "right" }}>{item.quantity}</td>
                <td style={{ textAlign: "right" }}>{money(item.unitPrice, invoice.currency)}</td>
                <td style={{ textAlign: "right", fontWeight: 600 }}>{money(item.quantity * item.unitPrice, invoice.currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="invoice-totals">
          <div className="invoice-total-row">
            <span>Subtotal</span><span>{money(subtotal, invoice.currency)}</span>
          </div>
          {invoice.taxPercent > 0 && (
            <div className="invoice-total-row">
              <span>Tax ({invoice.taxPercent}%)</span><span>{money(tax, invoice.currency)}</span>
            </div>
          )}
          <div className="invoice-total-row grand">
            <span>Total due</span><span>{money(total, invoice.currency)}</span>
          </div>
        </div>

        {invoice.notes && (
          <div className="invoice-notes">
            <p className="invoice-meta-label">Notes</p>
            <p style={{ fontSize: 12.5, color: "var(--tx-secondary)", lineHeight: 1.6 }}>{invoice.notes}</p>
          </div>
        )}

        <p className="invoice-foot">
          Generated by GrowthZee CRM · Invoice {invoice.number} · {fmt(invoice.issueDate)}
        </p>
      </div>
    </div>
  );
}
