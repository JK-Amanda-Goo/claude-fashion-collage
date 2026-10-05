"use client";

import Link from "next/link";
import { useAuthContext } from "@/app/providers";

export default function AccountPage() {
  const { email } = useAuthContext();

  return (
    <div className="fc-shell">
      <div className="cork-board">
        <div className="cork-inner">
          <Link href="/" className="cork-back">
            ← Back
          </Link>

          <h1 className="cork-title" style={{ fontSize: 32 }}>
            Your account
          </h1>
          <p className="cork-sub" style={{ marginBottom: 20 }}>
            {email ?? "…"}
          </p>
          <p style={{ color: "var(--ink-2)" }}>
            Fashion Collage is free during the beta.
          </p>
        </div>
      </div>
    </div>
  );
}
