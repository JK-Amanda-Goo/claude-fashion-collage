import { getCurrentUser } from "@/lib/auth";

export function logEvent(
  eventType: string,
  opts?: { canvasId?: string; metadata?: Record<string, unknown> }
): void {
  const userEmail = getCurrentUser();
  if (!userEmail) return;

  try {
    fetch("/api/log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userEmail,
        eventType,
        canvasId: opts?.canvasId,
        metadata: opts?.metadata,
      }),
    }).catch((err) => console.error("Event log failed:", err));
  } catch (err) {
    console.error("Event log failed:", err);
  }
}
