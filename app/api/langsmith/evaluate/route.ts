import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getLangsmith, LANGSMITH_PROJECT } from "@/lib/langsmith";
import type { DetectedItem } from "@/types/collage";

const MODEL = "claude-sonnet-4-6";

function getAnthropicClient() {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
}

// ─── Rule-based evaluators ────────────────────────────────────────────────────

function evalPreferenceReflected(
  preference: string,
  results: { refinedQuery: string }[]
): { score: number; comment: string } {
  if (!preference.trim()) return { score: 1, comment: "No preference to reflect" };

  const words = preference.toLowerCase().split(/[\s,]+/).filter((w) => w.length > 3);
  const allQueries = results.map((r) => r.refinedQuery.toLowerCase()).join(" ");
  const matched = words.filter((w) => allQueries.includes(w));
  const score = words.length > 0 ? matched.length / words.length : 1;

  return {
    score: Math.round(score * 100) / 100,
    comment: `Preference words matched: ${matched.join(", ") || "none"} (${matched.length}/${words.length})`,
  };
}

function evalResultCountMatch(
  expectedCount: number,
  actualCount: number
): { score: number; comment: string } {
  const score = actualCount === expectedCount ? 1 : actualCount > 0 ? 0.5 : 0;
  return {
    score,
    comment: `Expected ${expectedCount} results, got ${actualCount}`,
  };
}

function evalDiscoveryCount(
  items: { label: string }[]
): { score: number; comment: string } {
  const count = items.length;
  const score = count >= 4 && count <= 6 ? 1 : count > 0 ? 0.5 : 0;
  return {
    score,
    comment: `Discovered ${count} items (expected 4-6)`,
  };
}

function evalDiscoveryDistinct(
  inputLabels: string[],
  discovered: { label: string }[]
): { score: number; comment: string } {
  const existing = inputLabels.map((l) => l.toLowerCase());
  const duplicates = discovered.filter((d) =>
    existing.some((e) => e.includes(d.label.toLowerCase()) || d.label.toLowerCase().includes(e))
  );
  const score = discovered.length > 0
    ? (discovered.length - duplicates.length) / discovered.length
    : 0;
  return {
    score: Math.round(score * 100) / 100,
    comment: duplicates.length === 0
      ? "All suggestions are distinct from canvas items"
      : `Duplicates found: ${duplicates.map((d) => d.label).join(", ")}`,
  };
}

function evalDiscoveryHasAllFields(discovered: Record<string, unknown>[]): { score: number; comment: string } {
  const required = ["label", "description", "searchQuery", "reason"];
  const incomplete = discovered.filter((item) => required.some((f) => !item[f]));
  const score = incomplete.length === 0 ? 1 : (discovered.length - incomplete.length) / discovered.length;
  return {
    score: Math.round(score * 100) / 100,
    comment: incomplete.length === 0
      ? "All items have required fields"
      : `${incomplete.length} item(s) missing fields`,
  };
}

// ─── LLM-as-judge evaluators (Claude-based) ──────────────────────────────────

async function evalQuerySpecificityLLM(
  items: DetectedItem[],
  results: { refinedQuery: string; label: string }[],
  preference: string
): Promise<{ score: number; comment: string }> {
  const client = getAnthropicClient();

  const prompt = `You are an evaluator judging the quality of Google Shopping search queries for fashion items.

User preference: "${preference || "none"}"

Original items and their refined queries:
${items.map((item, i) => {
  const result = results.find((r) => r.label === item.label) || results[i];
  return `- Item: "${item.label}" | Original query: "${item.query}" | Refined query: "${result?.refinedQuery || "N/A"}"`;
}).join("\n")}

Evaluate: How well do the refined queries incorporate the user's preference AND improve upon the original queries?

Score from 0.0 to 1.0 where:
- 1.0 = All refined queries meaningfully incorporate the preference and are more specific than originals
- 0.7 = Most queries improved, preference partially reflected
- 0.4 = Some improvement, preference mostly ignored
- 0.0 = No improvement, preference completely ignored

Return ONLY valid JSON: { "score": 0.0, "comment": "one sentence explanation" }`;

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 256,
      messages: [{ role: "user", content: prompt }],
    });
    const text = response.content[0].type === "text" ? response.content[0].text.trim() : "{}";
    const cleaned = text.replace(/^```json\s*/i, "").replace(/```\s*$/, "").trim();
    const parsed = JSON.parse(cleaned);
    return { score: parsed.score ?? 0, comment: parsed.comment ?? "" };
  } catch {
    return { score: -1, comment: "LLM evaluation failed" };
  }
}

async function evalDiscoveryCoherenceLLM(
  canvasTitle: string,
  existingItems: DetectedItem[],
  discovered: { label: string; reason: string }[]
): Promise<{ score: number; comment: string }> {
  const client = getAnthropicClient();

  const prompt = `You are a fashion evaluator judging whether AI-suggested items fit a moodboard's aesthetic.

Canvas title: "${canvasTitle}"
Existing items: ${existingItems.map((i) => i.label).join(", ")}

Suggested new items:
${discovered.map((d) => `- "${d.label}" — reason: "${d.reason}"`).join("\n")}

Evaluate: How well do the suggestions fit the canvas aesthetic and extend it naturally?

Score from 0.0 to 1.0 where:
- 1.0 = All suggestions feel like natural extensions of the aesthetic, reasons are compelling
- 0.7 = Most suggestions fit well, minor mismatches
- 0.4 = Mixed results, some suggestions feel out of place
- 0.0 = Suggestions don't match the canvas vibe at all

Return ONLY valid JSON: { "score": 0.0, "comment": "one sentence explanation" }`;

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 256,
      messages: [{ role: "user", content: prompt }],
    });
    const text = response.content[0].type === "text" ? response.content[0].text.trim() : "{}";
    const cleaned = text.replace(/^```json\s*/i, "").replace(/```\s*$/, "").trim();
    const parsed = JSON.parse(cleaned);
    return { score: parsed.score ?? 0, comment: parsed.comment ?? "" };
  } catch {
    return { score: -1, comment: "LLM evaluation failed" };
  }
}

// ─── Search runner ────────────────────────────────────────────────────────────

async function runSearchForEval(
  items: DetectedItem[],
  preference: string
): Promise<{ itemId: string; label: string; refinedQuery: string }[]> {
  const client = getAnthropicClient();

  const prompt = `You are a fashion shopping assistant. The user is looking for the following clothing items:

${items.map((i) => `- ${i.label} (id: ${i.id}, base query: "${i.query}")`).join("\n")}

User's shopping preference:
"${preference || "No specific preference"}"

For each item, generate a refined Google Shopping search query that incorporates the user's preference where relevant.

Return ONLY a valid JSON array, no markdown, no explanation:
[{ "itemId": "...", "label": "...", "refinedQuery": "..." }]`;

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  });
  const text = response.content[0].type === "text" ? response.content[0].text.trim() : "[]";
  const cleaned = text.replace(/^```json\s*/i, "").replace(/```\s*$/, "").trim();
  return JSON.parse(cleaned);
}

// ─── Discover runner ──────────────────────────────────────────────────────────

async function runDiscoverForEval(
  canvasTitle: string,
  items: DetectedItem[]
): Promise<{ label: string; description: string; searchQuery: string; reason: string }[]> {
  const client = getAnthropicClient();

  const prompt = `You are a fashion discovery assistant. A user has a moodboard canvas called "${canvasTitle}" containing these items:

${items.map((i) => `- ${i.label}`).join("\n")}

Based on the overall aesthetic and vibe of this canvas, suggest 4-6 NEW fashion items the user hasn't already added that would complement this style.

Return ONLY a valid JSON array, no markdown, no explanation:
[{ "label": "...", "description": "...", "searchQuery": "...", "reason": "..." }]`;

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  });
  const text = response.content[0].type === "text" ? response.content[0].text.trim() : "[]";
  const cleaned = text.replace(/^```json\s*/i, "").replace(/```\s*$/, "").trim();
  return JSON.parse(cleaned);
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const { dataset } = await req.json().catch(() => ({}));
  if (!dataset || !["search", "discover"].includes(dataset)) {
    return NextResponse.json(
      { error: 'dataset must be "search" or "discover"' },
      { status: 400 }
    );
  }

  const client = getLangsmith();
  if (!process.env.ANTHROPIC_API_KEY) return NextResponse.json({ error: "ANTHROPIC_API_KEY is not set" }, { status: 500 });

  const datasetName = dataset === "search" ? "fashion-search-evals" : "fashion-discover-evals";
  const exists = await client.hasDataset({ datasetName });
  if (!exists) {
    return NextResponse.json(
      { error: `Dataset "${datasetName}" not found. Seed it first via POST /api/langsmith/datasets.` },
      { status: 404 }
    );
  }

  const examplesIter = client.listExamples({ datasetName });
  const examples: Awaited<ReturnType<typeof client.listExamples>> extends AsyncIterable<infer T> ? T[] : never[] = [];
  for await (const ex of examplesIter) {
    examples.push(ex as never);
  }

  const experimentTag = `eval-${dataset}-${Date.now()}`;
  const evalResults = [];
  const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

  for (const example of examples as Array<{ id: string; inputs: Record<string, unknown>; outputs: Record<string, unknown> }>) {
    const runId = crypto.randomUUID();
    const startTime = Date.now();

    await client.createRun({
      id: runId,
      name: `${dataset}-eval-run`,
      run_type: "chain",
      project_name: LANGSMITH_PROJECT,
      inputs: example.inputs,
      start_time: startTime,
      reference_example_id: example.id,
    });

    let outputs: Record<string, unknown> = {};
    const scores: Record<string, { score: number; comment: string }> = {};

    try {
      if (dataset === "search") {
        const { items, preference } = example.inputs as { items: DetectedItem[]; preference: string };
        const results = await runSearchForEval(items, preference);
        outputs = { results };

        scores["preference-reflected"] = evalPreferenceReflected(preference, results);
        scores["result-count-match"] = evalResultCountMatch(items.length, results.length);
        scores["query-specificity-llm"] = await evalQuerySpecificityLLM(items, results, preference);

      } else {
        const { items, canvasTitle } = example.inputs as { items: DetectedItem[]; canvasTitle: string };
        const discovered = await runDiscoverForEval(canvasTitle, items);
        outputs = { discovered };

        scores["discovery-count"] = evalDiscoveryCount(discovered);
        scores["discovery-distinct"] = evalDiscoveryDistinct(
          items.map((i) => i.label),
          discovered
        );
        scores["discovery-has-all-fields"] = evalDiscoveryHasAllFields(discovered as Record<string, unknown>[]);
        scores["discovery-coherence-llm"] = await evalDiscoveryCoherenceLLM(canvasTitle, items, discovered);
      }

      await client.updateRun(runId, { outputs, end_time: Date.now() });

      // Log all scores as LangSmith feedback
      await Promise.all(
        Object.entries(scores).map(([key, { score, comment }]) =>
          client.createFeedback(runId, key, {
            score,
            comment,
            sourceInfo: { evaluation_type: score < 0 ? "llm_failed" : key.endsWith("_llm") ? "llm" : "rule_based" },
          })
        )
      );

      evalResults.push({ exampleId: example.id, runId, scores });
    } catch (err) {
      await client.updateRun(runId, { error: String(err), end_time: Date.now() });
      evalResults.push({ exampleId: example.id, runId, error: String(err) });
    }

    // Respect Gemini rate limits between examples
    await delay(3000);
  }

  const allScores = evalResults.flatMap((r) =>
    r.scores ? Object.entries(r.scores).map(([k, v]) => ({ key: k, score: (v as { score: number }).score })) : []
  );
  const summary: Record<string, number> = {};
  for (const { key, score } of allScores) {
    if (!summary[key]) summary[key] = 0;
    summary[key] += score;
  }
  const exampleCount = evalResults.length;
  for (const key of Object.keys(summary)) {
    summary[key] = Math.round((summary[key] / exampleCount) * 100) / 100;
  }

  return NextResponse.json({
    dataset,
    experimentTag,
    exampleCount,
    results: evalResults,
    averageScores: summary,
  });
}
