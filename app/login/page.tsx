"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { setCurrentUser } from "@/lib/auth";
import { logEvent } from "@/lib/eventLog";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const endpoint = mode === "register" ? "/api/auth/register" : "/api/auth/login";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      if (!res.ok) {
        if (res.status === 409) {
          setError("An account with this email already exists.");
        } else if (mode === "register") {
          setError("Could not create account.");
        } else {
          setError("Invalid email or password.");
        }
        return;
      }

      const data: { email: string } = await res.json();
      setCurrentUser(data.email);
      logEvent("login");
      router.push("/");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fc-shell">
      <div className="cork-board">
        <div className="cork-inner" style={{ maxWidth: 420 }}>
          <h1 className="cork-title" style={{ marginBottom: 8 }}>
            Fashion Collage
          </h1>
          <p className="cork-sub" style={{ marginBottom: 32 }}>
            {mode === "login" ? "Sign in to your account" : "Create an account"}
          </p>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <input
              className="fc-input"
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
            <input
              className="fc-input"
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
            {error && (
              <p style={{ fontSize: 13, color: "#c0392b", margin: 0 }}>{error}</p>
            )}
            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
              style={{ marginTop: 4 }}
            >
              {loading ? "…" : mode === "login" ? "Sign in" : "Create account"}
            </button>
          </form>

          <p style={{ marginTop: 20, fontSize: 13, color: "var(--ink-3)", textAlign: "center" }}>
            {mode === "login" ? (
              <>
                No account?{" "}
                <button
                  className="link-btn"
                  onClick={() => { setMode("register"); setError(null); }}
                >
                  Sign up
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button
                  className="link-btn"
                  onClick={() => { setMode("login"); setError(null); }}
                >
                  Sign in
                </button>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
