"use client";
import { useState, useEffect, useCallback } from "react";
import { TAX_MODES } from "@/lib/billing";

type Profile = {
  name: string; address?: string | null; gstin?: string | null; pan?: string | null;
  phone?: string | null; email?: string | null; website?: string | null;
  bankName?: string | null; bankAccountName?: string | null; bankAccountNumber?: string | null;
  bankIfsc?: string | null; bankBranch?: string | null; upiId?: string | null;
  defaultTaxMode: string; defaultCgst: number; defaultSgst: number; defaultIgst: number;
  defaultCurrency: string;
  paymentTerms?: string | null; lateFeeNote?: string | null; signatureName?: string | null;
};

const EMPTY: Profile = {
  name: "", address: "", gstin: "", pan: "", phone: "", email: "", website: "",
  bankName: "", bankAccountName: "", bankAccountNumber: "", bankIfsc: "", bankBranch: "", upiId: "",
  defaultTaxMode: "GST_SPLIT", defaultCgst: 9, defaultSgst: 9, defaultIgst: 18,
  defaultCurrency: "INR", paymentTerms: "", lateFeeNote: "", signatureName: "",
};

export default function SettingsPage() {
  const [f, setF] = useState<Profile>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/company-profile");
    if (res.ok) {
      const d = await res.json();
      setF({ ...EMPTY, ...d });
    }
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  function set<K extends keyof Profile>(k: K, v: Profile[K]) { setF((cur) => ({ ...cur, [k]: v })); }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setSaving(true);
    try {
      const res = await fetch("/api/company-profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(f),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Failed to save");
      setSaved(true); setTimeout(() => setSaved(false), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error");
    } finally { setSaving(false); }
  }

  const text = (k: keyof Profile, label: string, placeholder = "", type = "text") => (
    <div>
      <label className="label" style={{ marginBottom: 5 }}>{label}</label>
      <input
        className="input"
        type={type}
        value={(f[k] as string) ?? ""}
        onChange={(e) => set(k, e.target.value as Profile[typeof k])}
        placeholder={placeholder}
      />
    </div>
  );

  if (loading) return <div className="empty" style={{ padding: 100 }}><div className="spinner" /></div>;

  return (
    <div className="page-section" style={{ maxWidth: 1000 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 22 }} className="anim-up">
        <div>
          <h1 className="page-title" style={{ fontSize: 24 }}>Settings</h1>
          <p style={{ fontSize: 13.5, color: "var(--tx-tertiary)", marginTop: 5 }}>
            Company and billing details used to prefill every invoice you raise
          </p>
        </div>
        {saved && <span className="badge badge-green">✓ Saved</span>}
      </div>

      {error && (
        <div style={{ padding: "10px 12px", background: "var(--red-bg)", borderRadius: "var(--r-md)", color: "var(--red)", fontSize: 13, marginBottom: 16 }}>{error}</div>
      )}

      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Company */}
        <div className="card anim-up" style={{ padding: 20 }}>
          <p className="section-title" style={{ marginBottom: 3 }}>Company details</p>
          <p style={{ fontSize: 12, color: "var(--tx-tertiary)", marginBottom: 14 }}>Appears in the header of every invoice</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div style={{ gridColumn: "1/-1" }}>{text("name", "Company name *", "GrowthZee CRM")}</div>
            <div style={{ gridColumn: "1/-1" }}>
              <label className="label" style={{ marginBottom: 5 }}>Address</label>
              <textarea className="input" rows={2} style={{ minHeight: 56 }} value={f.address ?? ""} onChange={(e) => set("address", e.target.value)} placeholder="Street, city, state, PIN" />
            </div>
            {text("gstin", "GSTIN", "22AAAAA0000A1Z5")}
            {text("pan", "PAN", "AAAAA0000A")}
            {text("phone", "Phone", "+91 90000 00000")}
            {text("email", "Email", "billing@company.com", "email")}
            <div style={{ gridColumn: "1/-1" }}>{text("website", "Website", "https://company.com")}</div>
          </div>
        </div>

        {/* Tax defaults */}
        <div className="card anim-up" style={{ padding: 20 }}>
          <p className="section-title" style={{ marginBottom: 3 }}>Tax defaults</p>
          <p style={{ fontSize: 12, color: "var(--tx-tertiary)", marginBottom: 14 }}>Prefilled on new invoices — you can still change them per invoice</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
            <div style={{ gridColumn: "span 2" }}>
              <label className="label" style={{ marginBottom: 5 }}>Default tax mode</label>
              <select className="input" value={f.defaultTaxMode} onChange={(e) => set("defaultTaxMode", e.target.value)}>
                {TAX_MODES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label" style={{ marginBottom: 5 }}>Currency</label>
              <select className="input" value={f.defaultCurrency} onChange={(e) => set("defaultCurrency", e.target.value)}>
                {["INR", "USD", "EUR", "GBP", "AED"].map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div />
            <div>
              <label className="label" style={{ marginBottom: 5 }}>CGST %</label>
              <input className="input" type="number" step="0.01" min={0} value={f.defaultCgst} onChange={(e) => set("defaultCgst", Number(e.target.value))} />
            </div>
            <div>
              <label className="label" style={{ marginBottom: 5 }}>SGST %</label>
              <input className="input" type="number" step="0.01" min={0} value={f.defaultSgst} onChange={(e) => set("defaultSgst", Number(e.target.value))} />
            </div>
            <div>
              <label className="label" style={{ marginBottom: 5 }}>IGST %</label>
              <input className="input" type="number" step="0.01" min={0} value={f.defaultIgst} onChange={(e) => set("defaultIgst", Number(e.target.value))} />
            </div>
          </div>
        </div>

        {/* Bank */}
        <div className="card anim-up" style={{ padding: 20 }}>
          <p className="section-title" style={{ marginBottom: 3 }}>Payment details</p>
          <p style={{ fontSize: 12, color: "var(--tx-tertiary)", marginBottom: 14 }}>Printed in the payment section of the invoice</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {text("bankAccountName", "Account name", "GrowthZee Pvt Ltd")}
            {text("bankAccountNumber", "Account number", "000000000000")}
            {text("bankName", "Bank name", "HDFC Bank")}
            {text("bankIfsc", "IFSC code", "HDFC0000000")}
            {text("bankBranch", "Branch", "MG Road, Bengaluru")}
            {text("upiId", "UPI ID", "company@upi")}
          </div>
        </div>

        {/* Terms */}
        <div className="card anim-up" style={{ padding: 20 }}>
          <p className="section-title" style={{ marginBottom: 3 }}>Terms &amp; signature</p>
          <p style={{ fontSize: 12, color: "var(--tx-tertiary)", marginBottom: 14 }}>Shown at the bottom of the invoice</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <label className="label" style={{ marginBottom: 5 }}>Payment terms</label>
              <textarea className="input" rows={2} style={{ minHeight: 54 }} value={f.paymentTerms ?? ""} onChange={(e) => set("paymentTerms", e.target.value)} placeholder="Payment due within 15 days of invoice date." />
            </div>
            <div>
              <label className="label" style={{ marginBottom: 5 }}>Late fee note</label>
              <input className="input" value={f.lateFeeNote ?? ""} onChange={(e) => set("lateFeeNote", e.target.value)} placeholder="A late fee of 1.5% per month applies after the due date." />
            </div>
            {text("signatureName", "Authorised signatory", "For GrowthZee Pvt Ltd")}
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button type="button" className="btn btn-secondary" onClick={load}>Reset</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving && <span className="spinner" style={{ width: 13, height: 13, borderTopColor: "rgba(255,255,255,0.7)" }} />}
            {saving ? "Saving…" : "Save settings"}
          </button>
        </div>
      </form>
    </div>
  );
}
