import { NextRequest, NextResponse } from "next/server";
import { refineSearchQueries, MODEL } from "@/lib/claude";
import { getLangfuse } from "@/lib/langfuse";
import { getLangsmith, LANGSMITH_PROJECT } from "@/lib/langsmith";
import type { DetectedItem } from "@/types/collage";

export interface SearchResult {
  itemId: string;
  label: string;
  refinedQuery: string;
  searchUrl: string;
}

function buildShoppingUrl(query: string): string {
  return `https://www.google.com/search?q=${encodeURIComponent(query)}&tbm=shop`;
}

export async function POST(req: NextRequest) {
  let body: { items?: DetectedItem[]; preference?: string; canvasId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { items, preference, canvasId } = body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "items array is required" }, { status: 400 });
  }

  const userPreference = preference?.trim() || "No specific preference";
  const lsTraceId = crypto.randomUUID();
  const lsGenId = crypto.randomUUID();
  const lsStart = Date.now();

  // Langfuse setup
  const langfuse = getLangfuse();
  const trace = langfuse.trace({
    name: "search-agent",
    input: { canvasId, itemCount: items.length, preference: userPreference },
  });
  const generation = trace.generation({
    name: "claude-refine-queries",
    model: MODEL,
    input: { items, preference: userPreference },
  });

  // LangSmith setup (parallel)
  const lsClient = getLangsmith();
  try {
    await Promise.all([
      lsClient.createRun({
        id: lsTraceId,
        name: "search-agent",
        run_type: "chain",
        project_name: LANGSMITH_PROJECT,
        inputs: { canvasId, itemCount: items.length, preference: userPreference, items },
        start_time: lsStart,
      }),
      lsClient.createRun({
        id: lsGenId,
        parent_run_id: lsTraceId,
        name: "claude-refine-queries",
        run_type: "llm",
        project_name: LANGSMITH_PROJECT,
        inputs: { items, preference: userPreference },
        start_time: lsStart,
        extra: { invocation_params: { model_name: MODEL } },
      }),
    ]);
  } catch (lsErr) {
    console.error("LangSmith trace start error:", lsErr);
  }

  try {
    const refined = await refineSearchQueries(items, userPreference);

    const results: SearchResult[] = refined.map((r) => ({
      itemId: r.itemId,
      label: r.label,
      refinedQuery: r.refinedQuery,
      searchUrl: buildShoppingUrl(r.refinedQuery),
    }));

    // End Langfuse
    generation.end({ output: results });
    trace.update({ output: { resultCount: results.length } });
    await langfuse.flushAsync();

    // End LangSmith
    try {
      await Promise.all([
        lsClient.updateRun(lsGenId, {
          outputs: { refined },
          end_time: Date.now(),
        }),
        lsClient.updateRun(lsTraceId, {
          outputs: { resultCount: results.length, results },
          end_time: Date.now(),
        }),
      ]);
    } catch (lsErr) {
      console.error("LangSmith trace end error:", lsErr);
    }

    return NextResponse.json({ results, langsmithTraceId: lsTraceId });
  } catch (err) {
    generation.end({ output: { error: String(err) } });
    await langfuse.flushAsync();
    try {
      await Promise.all([
        lsClient.updateRun(lsGenId, { error: String(err), end_time: Date.now() }),
        lsClient.updateRun(lsTraceId, { error: String(err), end_time: Date.now() }),
      ]);
    } catch {}
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
