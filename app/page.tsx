"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCanvasesContext, useAuthContext } from "@/app/providers";
import CanvasCard from "@/components/CanvasCard";
import CreateCanvasForm from "@/components/CreateCanvasForm";
import { logout, getCurrentUser } from "@/lib/auth";

export default function HomePage() {
  const { canvases, createCanvas, deleteCanvas } = useCanvasesContext();
  const { tier, hasAccess } = useAuthContext();
  const router = useRouter();
  const user = getCurrentUser();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    logout();
    router.push("/login");
  }

  function handleCreateCanvas(title: string) {
    if (!hasAccess) {
      router.push("/account");
      return;
    }
    createCanvas(title);
  }

  return (
    <div className="fc-shell">
      <div className="cork-board">
        <div className="cork-inner">
          <div style={{ marginBottom: 28, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <h1 className="cork-title">Fashion Collage</h1>
              <p className="cork-sub">Your personal moodboard</p>
            </div>
            <div style={{ textAlign: "right", paddingTop: 8 }}>
              <p style={{ fontSize: 12, color: "var(--ink-3)", marginBottom: 4 }}>
                {user}
                {tier && (
                  <Link
                    href="/account"
                    style={{
                      marginLeft: 8,
                      padding: "2px 8px",
                      borderRadius: 999,
                      fontSize: 10,
                      textTransform: "uppercase",
                      letterSpacing: 0.5,
                      background: "var(--paper-2)",
                      color: "var(--ink-2)",
                      textDecoration: "none",
                    }}
                  >
                    {tier}
                  </Link>
                )}
              </p>
              <button className="link-btn" onClick={handleLogout} style={{ fontSize: 12 }}>
                Sign out
              </button>
            </div>
          </div>

          <div style={{ marginBottom: 38 }}>
            <CreateCanvasForm onCreate={handleCreateCanvas} />
          </div>

          {canvases.length === 0 ? (
            <p className="cork-empty">Create your first canvas to get started.</p>
          ) : (
            <div className="canvas-grid">
              {canvases.map((canvas) => (
                <CanvasCard key={canvas.id} canvas={canvas} onDelete={deleteCanvas} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
