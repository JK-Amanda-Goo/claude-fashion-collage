import { NextRequest, NextResponse } from "next/server";
import { getLangsmith } from "@/lib/langsmith";

// Called when a user checks or unchecks a detected item.
// A check = implicit "yes, Gemini found this correctly" signal.
// An uncheck = implicit "not what I wanted" signal.
export async function POST(req: NextRequest) {
  let body: {
    traceId?: string;
    itemLabel?: string;
    checked?: boolean;
    agentType?: "analyze" | "search" | "discover";
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { traceId, itemLabel, checked, agentType = "analyze" } = body;

  if (!traceId || typeof checked !== "boolean") {
    return NextResponse.json(
      { error: "traceId and checked are required" },
      { status: 400 }
    );
  }

  const client = getLangsmith();
  const score = checked ? 1 : 0;
  const key = agentType === "analyze" ? "item-acceptance" : "item-relevance";

  try {
    await client.createFeedback(traceId, key, {
      score,
      comment: itemLabel
        ? `User ${checked ? "checked" : "unchecked"} item: "${itemLabel}"`
        : `User ${checked ? "accepted" : "rejected"} item`,
      sourceInfo: { evaluation_type: "user_implicit", item_label: itemLabel },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("LangSmith feedback error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
