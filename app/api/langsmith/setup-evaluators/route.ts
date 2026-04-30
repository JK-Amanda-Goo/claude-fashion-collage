import { NextResponse } from "next/server";

const LANGSMITH_API_KEY = process.env.LANGSMITH_API_KEY!;
const LANGSMITH_BASE = "https://api.smith.langchain.com/api/v1";
const PROJECT_ID = "c5fb8812-c931-49a5-a6ed-e0f6d306d47d";

function lsHeaders() {
  return { "x-api-key": LANGSMITH_API_KEY, "Content-Type": "application/json" };
}

// LangSmith allows 1 evaluator per rule — one rule per scoring function.
// perform_eval(run) is called server-side with the run dict (.inputs, .outputs).
const EVALUATOR_RULES = [
  // ── Analyze agent ──────────────────────────────────────────────────────────
  {
    display_name: "Analyze: item count valid (1–6)",
    filter: 'eq(name, "analyze-agent")',
    sampling_rate: 1.0,
    code: [
      "def perform_eval(run):",
      "    items = (run.get('outputs') or {}).get('items', [])",
      "    count = len(items)",
      "    score = 1.0 if 1 <= count <= 6 else (0.5 if count > 0 else 0.0)",
      "    return {'key': 'item_count_valid', 'score': score, 'comment': f'{count} items detected'}",
    ].join("\n"),
  },
  {
    display_name: "Analyze: label specificity",
    filter: 'eq(name, "analyze-agent")',
    sampling_rate: 1.0,
    code: [
      "def perform_eval(run):",
      "    items = (run.get('outputs') or {}).get('items', [])",
      "    if not items: return {'key': 'label_specificity', 'score': 0.0, 'comment': 'No items'}",
      "    specific = [i for i in items if isinstance(i, str) and len(i.split()) >= 2]",
      "    score = len(specific) / len(items)",
      "    return {'key': 'label_specificity', 'score': round(score, 2), 'comment': f'{len(specific)}/{len(items)} labels are multi-word'}",
    ].join("\n"),
  },
  // ── Search agent ───────────────────────────────────────────────────────────
  {
    display_name: "Search: result count matches input",
    filter: 'eq(name, "search-agent")',
    sampling_rate: 1.0,
    code: [
      "def perform_eval(run):",
      "    inputs = run.get('inputs') or {}",
      "    outputs = run.get('outputs') or {}",
      "    expected = inputs.get('itemCount', 0)",
      "    actual = len(outputs.get('results', []))",
      "    score = 1.0 if actual == expected else (0.5 if actual > 0 else 0.0)",
      "    return {'key': 'result_count_match', 'score': score, 'comment': f'Expected {expected}, got {actual}'}",
    ].join("\n"),
  },
  {
    display_name: "Search: queries are more specific than originals",
    filter: 'eq(name, "search-agent")',
    sampling_rate: 1.0,
    code: [
      "def perform_eval(run):",
      "    results = (run.get('outputs') or {}).get('results', [])",
      "    items = (run.get('inputs') or {}).get('items', [])",
      "    if not results: return {'key': 'query_improvement', 'score': 0.0, 'comment': 'No results'}",
      "    item_map = {i.get('id',''):i.get('query','') for i in items if isinstance(i,dict)}",
      "    improved = sum(1 for r in results if isinstance(r,dict) and len(r.get('refinedQuery','')) > len(item_map.get(r.get('itemId',''),'')))",
      "    score = improved / len(results)",
      "    return {'key': 'query_improvement', 'score': round(score,2), 'comment': f'{improved}/{len(results)} queries lengthened'}",
    ].join("\n"),
  },
  // ── Discovery agent ────────────────────────────────────────────────────────
  {
    display_name: "Discover: suggestion count valid (4–6)",
    filter: 'eq(name, "discovery-agent")',
    sampling_rate: 1.0,
    code: [
      "def perform_eval(run):",
      "    discovered = (run.get('outputs') or {}).get('discovered', [])",
      "    count = len(discovered)",
      "    score = 1.0 if 4 <= count <= 6 else (0.5 if count > 0 else 0.0)",
      "    return {'key': 'discovery_count_valid', 'score': score, 'comment': f'{count} items (target 4-6)'}",
    ].join("\n"),
  },
  {
    display_name: "Discover: no duplicates from canvas",
    filter: 'eq(name, "discovery-agent")',
    sampling_rate: 1.0,
    code: [
      "def perform_eval(run):",
      "    existing = [i.get('label','').lower() for i in ((run.get('inputs') or {}).get('items') or []) if isinstance(i,dict)]",
      "    discovered = [d.get('label','').lower() for d in ((run.get('outputs') or {}).get('discovered') or []) if isinstance(d,dict)]",
      "    if not discovered: return {'key': 'discovery_distinct', 'score': 0.0, 'comment': 'No suggestions'}",
      "    dupes = [d for d in discovered if any(e in d or d in e for e in existing)]",
      "    score = (len(discovered) - len(dupes)) / len(discovered)",
      "    return {'key': 'discovery_distinct', 'score': round(score,2), 'comment': f'{len(dupes)} duplicate(s) found'}",
    ].join("\n"),
  },
  {
    display_name: "Discover: all suggestions have reasons",
    filter: 'eq(name, "discovery-agent")',
    sampling_rate: 1.0,
    code: [
      "def perform_eval(run):",
      "    discovered = (run.get('outputs') or {}).get('discovered', [])",
      "    if not discovered: return {'key': 'discovery_has_reasons', 'score': 0.0, 'comment': 'No suggestions'}",
      "    with_reason = [d for d in discovered if isinstance(d,dict) and d.get('reason','').strip()]",
      "    score = len(with_reason) / len(discovered)",
      "    return {'key': 'discovery_has_reasons', 'score': round(score,2), 'comment': f'{len(with_reason)}/{len(discovered)} have reasons'}",
    ].join("\n"),
  },
];

async function createRule(rule: (typeof EVALUATOR_RULES)[0]) {
  const res = await fetch(`${LANGSMITH_BASE}/runs/rules`, {
    method: "POST",
    headers: lsHeaders(),
    body: JSON.stringify({
      display_name: rule.display_name,
      sampling_rate: rule.sampling_rate,
      session_id: PROJECT_ID,
      filter: rule.filter,
      code_evaluators: [{ name: rule.display_name, code: rule.code }],
    }),
  });
  const data = await res.json();
  return { ok: res.ok, id: data.id, name: rule.display_name, detail: data.detail };
}

async function listRules() {
  const res = await fetch(`${LANGSMITH_BASE}/runs/rules?session_id=${PROJECT_ID}`, {
    headers: { "x-api-key": LANGSMITH_API_KEY },
  });
  return res.json();
}

async function deleteRule(id: string) {
  await fetch(`${LANGSMITH_BASE}/runs/rules/${id}`, {
    method: "DELETE",
    headers: { "x-api-key": LANGSMITH_API_KEY },
  });
}

export async function POST() {
  const existing = await listRules();
  if (Array.isArray(existing) && existing.length > 0) {
    await Promise.all(existing.map((r: { id: string }) => deleteRule(r.id)));
  }

  const results = await Promise.all(EVALUATOR_RULES.map(createRule));
  const allOk = results.every((r) => r.ok);

  return NextResponse.json({ ok: allOk, created: results.length, evaluators: results });
}

export async function GET() {
  const rules = await listRules();
  return NextResponse.json({
    count: Array.isArray(rules) ? rules.length : 0,
    rules: Array.isArray(rules)
      ? rules.map((r: { id: string; display_name: string; is_enabled: boolean; code_evaluators: unknown[] }) => ({
          id: r.id,
          name: r.display_name,
          enabled: r.is_enabled,
          evaluators: r.code_evaluators?.length ?? 0,
        }))
      : rules,
  });
}

export async function DELETE() {
  const existing = await listRules();
  if (!Array.isArray(existing) || existing.length === 0) {
    return NextResponse.json({ ok: true, deleted: 0 });
  }
  await Promise.all(existing.map((r: { id: string }) => deleteRule(r.id)));
  return NextResponse.json({ ok: true, deleted: existing.length });
}
