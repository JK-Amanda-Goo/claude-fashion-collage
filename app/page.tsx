"use client";

import { useRouter } from "next/navigation";
import { useCanvasesContext } from "@/app/providers";
import CanvasCard from "@/components/CanvasCard";
import CreateCanvasForm from "@/components/CreateCanvasForm";
import { logout, getCurrentUser } from "@/lib/auth";

export default function HomePage() {
  const { canvases, createCanvas, deleteCanvas } = useCanvasesContext();
  const router = useRouter();
  const user = getCurrentUser();

  function handleLogout() {
    logout();
    router.push("/login");
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
              <p style={{ fontSize: 12, color: "var(--ink-3)", marginBottom: 4 }}>{user}</p>
              <button className="link-btn" onClick={handleLogout} style={{ fontSize: 12 }}>
                Sign out
              </button>
            </div>
          </div>

          <div style={{ marginBottom: 38 }}>
            <CreateCanvasForm onCreate={createCanvas} />
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
