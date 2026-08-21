export const dynamic = "force-dynamic";
// app/invoice/[id]/page.tsx — printable invoice, viewable by the admin or the owning client
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { money, computeInvoice, amountInWords, MONTHS } from "@/lib/billing";
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

  const c = computeInvoice(invoice.items, invoice);
  const cur = invoice.currency;
  const period = invoice.periodMonth && invoice.periodYear
    ? `${MONTHS[invoice.periodMonth - 1]} ${invoice.periodYear}`
    : null;
  const hasHsn = invoice.items.some((i) => i.hsnCode);
  const hasBank = !!(invoice.bankAccountNumber || invoice.bankName || invoice.upiId);

  return (
    <div className="invoice-page">
      <div className="invoice-toolbar no-print">
        <a href={isAdmin ? `/dashboard/clients/${invoice.clientId}` : "/portal"} className="btn btn-secondary btn-sm" style={{ textDecoration: "none" }}>
          ← Back
        </a>
        <PrintButton />
      </div>

      <div className="invoice-sheet">
        {/* ── Header: seller + invoice identity ── */}
        <div className="invoice-head">
          <div style={{ minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <div className="invoice-logo">{(invoice.sellerName || "G").charAt(0).toUpperCase()}</div>
              <div>
                <p style={{ fontSize: 15, fontWeight: 700, color: "var(--tx-primary)" }}>
                  {invoice.sellerName || "GrowthZee CRM"}
                </p>
                <p style={{ fontSize: 11.5, color: "var(--tx-tertiary)" }}>Team &amp; Client Operations</p>
              </div>
            </div>
            {invoice.sellerAddress && (
              <p style={{ fontSize: 12, color: "var(--tx-secondary)", whiteSpace: "pre-line", lineHeight: 1.5 }}>{invoice.sellerAddress}</p>
            )}
            <div style={{ marginTop: 4 }}>
              {invoice.sellerGstin && <p style={{ fontSize: 12, color: "var(--tx-secondary)" }}><strong>GSTIN:</strong> {invoice.sellerGstin}</p>}
              {invoice.sellerPan && <p style={{ fontSize: 12, color: "var(--tx-secondary)" }}><strong>PAN:</strong> {invoice.sellerPan}</p>}
              {invoice.sellerPhone && <p style={{ fontSize: 12, color: "var(--tx-tertiary)" }}>{invoice.sellerPhone}</p>}
              {invoice.sellerEmail && <p style={{ fontSize: 12, color: "var(--tx-tertiary)" }}>{invoice.sellerEmail}</p>}
              {invoice.sellerWebsite && <p style={{ fontSize: 12, color: "var(--tx-tertiary)" }}>{invoice.sellerWebsite}</p>}
            </div>
          </div>

          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <p style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em", color: "var(--tx-primary)" }}>
              {invoice.taxMode === "SIMPLE" ? "INVOICE" : "TAX INVOICE"}
            </p>
            <p style={{ fontSize: 12.5, color: "var(--tx-secondary)", marginTop: 2 }}>{invoice.number}</p>
            <span className={`badge ${invoice.status === "PAID" ? "badge-green" : invoice.status === "CANCELLED" ? "badge-red" : "badge-blue"}`} style={{ marginTop: 6 }}>
              {invoice.status}
            </span>
          </div>
        </div>

        {/* ── Bill to + invoice meta ── */}
        <div className="invoice-meta">
          <div>
            <p className="invoice-meta-label">Billed to</p>
            <p style={{ fontSize: 13.5, fontWeight: 600, color: "var(--tx-primary)" }}>
              {invoice.client.company || invoice.client.name}
            </p>
            {invoice.client.company && (
              <p style={{ fontSize: 12.5, color: "var(--tx-secondary)" }}>{invoice.client.name}</p>
            )}
            {invoice.buyerAddress && (
              <p style={{ fontSize: 12.5, color: "var(--tx-secondary)", whiteSpace: "pre-line", lineHeight: 1.5, marginTop: 2 }}>{invoice.buyerAddress}</p>
            )}
            <p style={{ fontSize: 12.5, color: "var(--tx-tertiary)" }}>{invoice.client.email}</p>
            {invoice.client.phone && <p style={{ fontSize: 12.5, color: "var(--tx-tertiary)" }}>{invoice.client.phone}</p>}
            {invoice.buyerGstin && (
              <p style={{ fontSize: 12.5, color: "var(--tx-secondary)", marginTop: 3 }}><strong>GSTIN:</strong> {invoice.buyerGstin}</p>
            )}
            {invoice.placeOfSupply && (
              <p style={{ fontSize: 12.5, color: "var(--tx-secondary)" }}><strong>Place of supply:</strong> {invoice.placeOfSupply}</p>
            )}
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
            {invoice.poNumber && (
              <>
                <p className="invoice-meta-label" style={{ marginTop: 10 }}>PO number</p>
                <p className="invoice-meta-value">{invoice.poNumber}</p>
              </>
            )}
            {invoice.projectRef && (
              <>
                <p className="invoice-meta-label" style={{ marginTop: 10 }}>Reference</p>
                <p className="invoice-meta-value">{invoice.projectRef}</p>
              </>
            )}
          </div>
        </div>

        {/* ── Line items ── */}
        <table className="invoice-table">
          <thead>
            <tr>
              <th style={{ textAlign: "left", width: 28 }}>#</th>
              <th style={{ textAlign: "left" }}>Description</th>
              {hasHsn && <th style={{ textAlign: "left", width: 96 }}>HSN / SAC</th>}
              <th style={{ textAlign: "right", width: 64 }}>Qty</th>
              <th style={{ textAlign: "right", width: 110 }}>Rate</th>
              <th style={{ textAlign: "right", width: 120 }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((item, i) => (
              <tr key={item.id}>
                <td style={{ color: "var(--tx-tertiary)" }}>{i + 1}</td>
                <td>{item.description}</td>
                {hasHsn && <td style={{ color: "var(--tx-secondary)" }}>{item.hsnCode || "—"}</td>}
                <td style={{ textAlign: "right" }}>{item.quantity}</td>
                <td style={{ textAlign: "right" }}>{money(item.unitPrice, cur)}</td>
                <td style={{ textAlign: "right", fontWeight: 600 }}>{money(item.quantity * item.unitPrice, cur)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* ── Totals ── */}
        <div className="invoice-totals">
          <div className="invoice-total-row"><span>Subtotal</span><span>{money(c.subtotal, cur)}</span></div>
          {c.discount > 0 && (
            <div className="invoice-total-row"><span>Discount</span><span style={{ color: "var(--red)" }}>− {money(c.discount, cur)}</span></div>
          )}
          {c.discount > 0 && (
            <div className="invoice-total-row"><span>Taxable value</span><span>{money(c.taxable, cur)}</span></div>
          )}
          {c.cgst > 0 && <div className="invoice-total-row"><span>CGST @ {c.cgstRate}%</span><span>{money(c.cgst, cur)}</span></div>}
          {c.sgst > 0 && <div className="invoice-total-row"><span>SGST @ {c.sgstRate}%</span><span>{money(c.sgst, cur)}</span></div>}
          {c.igst > 0 && <div className="invoice-total-row"><span>IGST @ {c.igstRate}%</span><span>{money(c.igst, cur)}</span></div>}
          {c.flatTax > 0 && <div className="invoice-total-row"><span>Tax @ {c.flatRate}%</span><span>{money(c.flatTax, cur)}</span></div>}
          {c.roundOff !== 0 && (
            <div className="invoice-total-row"><span>Round off</span><span>{c.roundOff > 0 ? "+ " : "− "}{money(Math.abs(c.roundOff), cur)}</span></div>
          )}
          <div className="invoice-total-row grand"><span>Total due</span><span>{money(c.total, cur)}</span></div>
        </div>

        {/* ── Amount in words ── */}
        <div className="invoice-words">
          <span className="invoice-meta-label" style={{ marginBottom: 0 }}>Amount in words</span>
          <p style={{ fontSize: 12.5, fontWeight: 600, color: "var(--tx-primary)", marginTop: 3 }}>
            {amountInWords(c.total, cur)}
          </p>
        </div>

        {/* ── Payment details + terms ── */}
        {(hasBank || invoice.paymentTerms || invoice.lateFeeNote || invoice.notes) && (
          <div className="invoice-footer-grid">
            {hasBank && (
              <div>
                <p className="invoice-meta-label">Payment details</p>
                {invoice.bankAccountName && <p className="invoice-kv"><span>Account name</span><strong>{invoice.bankAccountName}</strong></p>}
                {invoice.bankAccountNumber && <p className="invoice-kv"><span>Account no.</span><strong>{invoice.bankAccountNumber}</strong></p>}
                {invoice.bankName && <p className="invoice-kv"><span>Bank</span><strong>{invoice.bankName}</strong></p>}
                {invoice.bankIfsc && <p className="invoice-kv"><span>IFSC</span><strong>{invoice.bankIfsc}</strong></p>}
                {invoice.bankBranch && <p className="invoice-kv"><span>Branch</span><strong>{invoice.bankBranch}</strong></p>}
                {invoice.upiId && <p className="invoice-kv"><span>UPI</span><strong>{invoice.upiId}</strong></p>}
              </div>
            )}

            <div>
              {invoice.paymentTerms && (
                <>
                  <p className="invoice-meta-label">Terms</p>
                  <p style={{ fontSize: 12, color: "var(--tx-secondary)", lineHeight: 1.55, whiteSpace: "pre-line" }}>{invoice.paymentTerms}</p>
                </>
              )}
              {invoice.lateFeeNote && (
                <p style={{ fontSize: 11.5, color: "var(--tx-tertiary)", lineHeight: 1.5, marginTop: 6 }}>{invoice.lateFeeNote}</p>
              )}
              {invoice.notes && (
                <>
                  <p className="invoice-meta-label" style={{ marginTop: 12 }}>Notes</p>
                  <p style={{ fontSize: 12, color: "var(--tx-secondary)", lineHeight: 1.55, whiteSpace: "pre-line" }}>{invoice.notes}</p>
                </>
              )}
            </div>
          </div>
        )}

        {/* ── Signature ── */}
        <div className="invoice-sign">
          <div>
            <p style={{ fontSize: 11, color: "var(--tx-tertiary)" }}>
              This is a computer-generated invoice.
            </p>
          </div>
          <div style={{ textAlign: "right" }}>
            <div className="invoice-sign-line" />
            <p style={{ fontSize: 12, fontWeight: 600, color: "var(--tx-primary)" }}>
              {invoice.signatureName || `For ${invoice.sellerName || "GrowthZee CRM"}`}
            </p>
            <p style={{ fontSize: 11, color: "var(--tx-tertiary)" }}>Authorised signatory</p>
          </div>
        </div>

        <p className="invoice-foot">
          {invoice.sellerName || "GrowthZee CRM"} · Invoice {invoice.number} · {fmt(invoice.issueDate)}
        </p>
      </div>
    </div>
  );
}
