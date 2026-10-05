import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { verifySession, SESSION_COOKIE } from "@/lib/session";

export async function POST(req: NextRequest) {
  const session = verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!session) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  let body: {
    eventType?: string;
    canvasId?: string;
    metadata?: Record<string, unknown>;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { eventType, canvasId, metadata } = body;
  const userEmail = session.email;

  if (!eventType || eventType.length > 64) {
    return NextResponse.json(
      { error: "eventType is required" },
      { status: 400 }
    );
  }

  try {
    await sql`
      INSERT INTO events (user_email, event_type, canvas_id, metadata)
      VALUES (${userEmail}, ${eventType}, ${canvasId ?? null}, ${
      metadata ? JSON.stringify(metadata) : null
    })
    `;
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Event log insert error:", err);
    return NextResponse.json({ error: "Failed to log event" }, { status: 500 });
  }
}
