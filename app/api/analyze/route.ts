import { NextRequest, NextResponse } from "next/server";
import { analyzeImage, buildFashionPrompt, MODEL } from "@/lib/claude";
import { getLangfuse } from "@/lib/langfuse";
import { getLangsmith, LANGSMITH_PROJECT } from "@/lib/langsmith";

export async function POST(req: NextRequest) {
  let body: { imageBase64?: string; mimeType?: string; preference?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { imageBase64, mimeType, preference } = body;

  if (!imageBase64 || !mimeType) {
    return NextResponse.json(
      { error: "imageBase64 and mimeType are required" },
      { status: 400 }
    );
  }

  const imageSizeBytes = Math.round((imageBase64.length * 3) / 4);
  const lsTraceId = crypto.randomUUID();
  const lsGenId = crypto.randomUUID();
  const lsStart = Date.now();

  // Langfuse setup
  const prompt = buildFashionPrompt(preference);
  const langfuse = getLangfuse();
  const trace = langfuse.trace({
    name: "analyze-agent",
    input: { mimeType, imageSizeBytes, preference: preference ?? null },
  });
  const generation = trace.generation({
    name: "claude-analyze-image",
    model: MODEL,
    input: [
      {
        role: "user",
        content: [
          {
            type: "image_url",
            image_url: { url: `data:${mimeType};base64,${imageBase64}` },
          },
          { type: "text", text: prompt },
        ],
      },
    ],
  });

  // LangSmith setup (parallel)
  const lsClient = getLangsmith();
  try {
    await Promise.all([
      lsClient.createRun({
        id: lsTraceId,
        name: "analyze-agent",
        run_type: "chain",
        project_name: LANGSMITH_PROJECT,
        inputs: { mimeType, imageSizeBytes, preference: preference ?? null },
        start_time: lsStart,
      }),
      lsClient.createRun({
        id: lsGenId,
        parent_run_id: lsTraceId,
        name: "claude-analyze-image",
        run_type: "llm",
        project_name: LANGSMITH_PROJECT,
        inputs: { mimeType, preference: preference ?? null },
        start_time: lsStart,
        extra: { invocation_params: { model_name: MODEL } },
      }),
    ]);
  } catch (lsErr) {
    console.error("LangSmith trace start error:", lsErr);
  }

  try {
    const { items: detectedItems, usage } = await analyzeImage(
      imageBase64,
      mimeType,
      preference
    );

    // End Langfuse
    generation.end({
      output: detectedItems.map((i) => i.label),
      usage: { input: usage.input, output: usage.output, total: usage.total },
    });
    trace.update({ output: { detectedCount: detectedItems.length } });
    await langfuse.flushAsync();

    // End LangSmith
    try {
      await Promise.all([
        lsClient.updateRun(lsGenId, {
          outputs: { items: detectedItems.map((i) => i.label) },
          end_time: Date.now(),
          extra: {
            token_usage: {
              prompt_tokens: usage.input,
              completion_tokens: usage.output,
              total_tokens: usage.total,
            },
          },
        }),
        lsClient.updateRun(lsTraceId, {
          outputs: { detectedCount: detectedItems.length, items: detectedItems.map((i) => i.label) },
          end_time: Date.now(),
        }),
      ]);
    } catch (lsErr) {
      console.error("LangSmith trace end error:", lsErr);
    }

    return NextResponse.json({ detectedItems, langsmithTraceId: lsTraceId });
  } catch (err) {
    generation.end({ output: { error: String(err) } });
    await langfuse.flushAsync();
    try {
      await Promise.all([
        lsClient.updateRun(lsGenId, { error: String(err), end_time: Date.now() }),
        lsClient.updateRun(lsTraceId, { error: String(err), end_time: Date.now() }),
      ]);
    } catch {}
    console.error("Claude analysis error:", err);
    return NextResponse.json({ error: "Analysis failed" }, { status: 500 });
  }
}
