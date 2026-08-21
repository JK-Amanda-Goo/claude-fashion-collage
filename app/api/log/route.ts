import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function POST(req: NextRequest) {
  let body: {
    userEmail?: string;
    eventType?: string;
    canvasId?: string;
    metadata?: Record<string, unknown>;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { userEmail, eventType, canvasId, metadata } = body;

  if (!userEmail || !eventType) {
    return NextResponse.json(
      { error: "userEmail and eventType are required" },
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
