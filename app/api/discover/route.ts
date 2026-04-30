import { NextRequest, NextResponse } from "next/server";
import { discoverItems, MODEL } from "@/lib/claude";
import { getLangfuse } from "@/lib/langfuse";
import { getLangsmith, LANGSMITH_PROJECT } from "@/lib/langsmith";
import type { DetectedItem } from "@/types/collage";

export interface DiscoveredItem {
  label: string;
  description: string;
  searchQuery: string;
  searchUrl: string;
  reason: string;
}

function buildShoppingUrl(query: string): string {
  return `https://www.google.com/search?q=${encodeURIComponent(query)}&tbm=shop`;
}

export async function POST(req: NextRequest) {
  let body: { items?: DetectedItem[]; canvasTitle?: string; canvasId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { items, canvasTitle, canvasId } = body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "items array is required" }, { status: 400 });
  }

  const title = canvasTitle?.trim() || "My Canvas";
  const lsTraceId = crypto.randomUUID();
  const lsGenId = crypto.randomUUID();
  const lsStart = Date.now();

  // Langfuse setup
  const langfuse = getLangfuse();
  const trace = langfuse.trace({
    name: "discovery-agent",
    input: { canvasId, canvasTitle: title, itemCount: items.length },
  });
  const generation = trace.generation({
    name: "claude-discover",
    model: MODEL,
    input: { canvasTitle: title, items },
  });

  // LangSmith setup (parallel)
  const lsClient = getLangsmith();
  try {
    await Promise.all([
      lsClient.createRun({
        id: lsTraceId,
        name: "discovery-agent",
        run_type: "chain",
        project_name: LANGSMITH_PROJECT,
        inputs: { canvasId, canvasTitle: title, itemCount: items.length, items },
        start_time: lsStart,
      }),
      lsClient.createRun({
        id: lsGenId,
        parent_run_id: lsTraceId,
        name: "claude-discover",
        run_type: "llm",
        project_name: LANGSMITH_PROJECT,
        inputs: { canvasTitle: title, items },
        start_time: lsStart,
        extra: { invocation_params: { model_name: MODEL } },
      }),
    ]);
  } catch (lsErr) {
    console.error("LangSmith trace start error:", lsErr);
  }

  try {
    const raw = await discoverItems(title, items);

    const discovered: DiscoveredItem[] = raw.map((item) => ({
      ...item,
      searchUrl: buildShoppingUrl(item.searchQuery),
    }));

    // End Langfuse
    generation.end({ output: discovered });
    trace.update({ output: { discoveredCount: discovered.length } });
    await langfuse.flushAsync();

    // End LangSmith
    try {
      await Promise.all([
        lsClient.updateRun(lsGenId, {
          outputs: { discovered: raw },
          end_time: Date.now(),
        }),
        lsClient.updateRun(lsTraceId, {
          outputs: { discoveredCount: discovered.length, discovered },
          end_time: Date.now(),
        }),
      ]);
    } catch (lsErr) {
      console.error("LangSmith trace end error:", lsErr);
    }

    return NextResponse.json({ discovered, langsmithTraceId: lsTraceId });
  } catch (err) {
    generation.end({ output: { error: String(err) } });
    await langfuse.flushAsync();
    try {
      await Promise.all([
        lsClient.updateRun(lsGenId, { error: String(err), end_time: Date.now() }),
        lsClient.updateRun(lsTraceId, { error: String(err), end_time: Date.now() }),
      ]);
    } catch {}
    return NextResponse.json({ error: "Discovery failed" }, { status: 500 });
  }
}
