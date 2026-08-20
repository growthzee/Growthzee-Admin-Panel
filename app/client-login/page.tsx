"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import AuthShell from "@/components/AuthShell";

export default function ClientLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/portal/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const d = await res.json();
      if (!res.ok) setError(d.error || "Login failed");
      else { router.push("/portal"); router.refresh(); }
    } catch { setError("Something went wrong."); }
    finally { setLoading(false); }
  }

  return (
    <AuthShell
      eyebrow="Client portal"
      glyph="🤝"
      heading="Your project"
      subheading="Follow progress on everything we're building for you."
      error={error}
      links={[
        { label: "Admin login", href: "/login" },
        { label: "Employee portal", href: "/employee-login" },
      ]}
    >
      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <label className="label" style={{ marginBottom: 6 }}>Email address</label>
          <input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" autoFocus />
        </div>
        <div>
          <label className="label" style={{ marginBottom: 6 }}>Password</label>
          <input className="input" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Your password" />
        </div>
        <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: "100%", marginTop: 4, height: 40 }}>
          {loading && <span className="spinner" style={{ width: 14, height: 14, borderTopColor: "rgba(255,255,255,0.7)" }} />}
          {loading ? "Signing in…" : "View my project"}
        </button>
      </form>
    </AuthShell>
  );
}
