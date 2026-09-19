"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface MeResponse {
  authenticated: boolean;
  email?: string;
  tier?: string;
}

const PLANS = [
  { id: "trial", name: "Trial", price: "Free" },
  { id: "basic", name: "Basic", price: "$5/mo" },
  { id: "pro", name: "Pro", price: "$20/mo" },
];

export default function AccountPage() {
  const [me, setMe] = useState<MeResponse | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then(setMe)
      .catch(() => setMe(null));
  }, []);

  return (
    <div className="fc-shell">
      <div className="cork-board">
        <div className="cork-inner">
          <Link href="/" className="cork-back">
            ← Back
          </Link>

          <h1 className="cork-title" style={{ fontSize: 32 }}>
            Your plan
          </h1>
          <p className="cork-sub" style={{ marginBottom: 28 }}>
            {me?.email ?? "…"}
          </p>

          <div className="canvas-grid">
            {PLANS.map((plan) => {
              const isCurrent = me?.tier === plan.id;
              return (
                <div key={plan.id} className="canvas-card" style={{ cursor: "default" }}>
                  <p
                    style={{
                      fontSize: 11,
                      textTransform: "uppercase",
                      letterSpacing: 0.5,
                      color: "var(--ink-3)",
                      marginBottom: 6,
                    }}
                  >
                    {plan.name}
                  </p>
                  <p style={{ fontSize: 26, fontWeight: 700, marginBottom: 16, color: "var(--ink)" }}>
                    {plan.price}
                  </p>
                  <button className="btn-primary" disabled title="Coming soon">
                    {isCurrent ? "Current plan" : "Coming soon"}
                  </button>
                </div>
              );
            })}
          </div>

          <button
            className="btn-ghost"
            disabled
            title="Coming soon"
            style={{ marginTop: 28 }}
          >
            Manage subscription — Coming soon
          </button>
        </div>
      </div>
    </div>
  );
}
