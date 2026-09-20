"use client";

import Link from "next/link";
import { useAuthContext } from "@/app/providers";

const PLANS = [
  { id: "trial", name: "Trial", price: "Free" },
  { id: "basic", name: "Basic", price: "$5/mo" },
  { id: "pro", name: "Pro", price: "$20/mo" },
];

export default function AccountPage() {
  const { email, tier, hasAccess } = useAuthContext();
  const trialExpired = tier === "trial" && !hasAccess;

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
          <p className="cork-sub" style={{ marginBottom: 8 }}>
            {email ?? "…"}
          </p>
          {trialExpired && (
            <p className="fc-error" style={{ marginBottom: 20 }}>
              Your trial has ended. Choose a plan below to continue.
            </p>
          )}

          <div className="canvas-grid" style={{ marginTop: trialExpired ? 0 : 20 }}>
            {PLANS.map((plan) => {
              const isCurrent = tier === plan.id && !(plan.id === "trial" && trialExpired);
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
                    {isCurrent
                      ? "Current plan"
                      : plan.id === "trial" && tier === "trial"
                      ? "Expired"
                      : "Coming soon"}
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
