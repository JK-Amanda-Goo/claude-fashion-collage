import { NextRequest, NextResponse } from "next/server";
import { getLangsmith } from "@/lib/langsmith";

const SEARCH_EXAMPLES = [
  {
    inputs: {
      items: [
        { id: "s1", label: "white linen blazer", query: "white linen blazer women", checked: false },
        { id: "s2", label: "black straight-leg trousers", query: "black straight leg trousers", checked: false },
        { id: "s3", label: "leather loafers", query: "leather loafers women", checked: false },
      ],
      preference: "I prefer Zara and H&M, budget under $100",
      canvasId: "eval-search-1",
    },
    outputs: {
      expectedBrands: ["Zara", "H&M"],
      expectedPriceCap: "$100",
      expectedResultCount: 3,
    },
  },
  {
    inputs: {
      items: [
        { id: "s4", label: "floral midi dress", query: "floral midi dress", checked: false },
        { id: "s5", label: "strappy heeled sandals", query: "strappy heeled sandals women", checked: false },
      ],
      preference: "luxury brands, I like Zimmermann and Chloé",
      canvasId: "eval-search-2",
    },
    outputs: {
      expectedBrands: ["Zimmermann", "Chloé"],
      expectedResultCount: 2,
    },
  },
  {
    inputs: {
      items: [
        { id: "s6", label: "oversized graphic tee", query: "oversized graphic t-shirt", checked: false },
        { id: "s7", label: "baggy cargo pants", query: "baggy cargo pants", checked: false },
        { id: "s8", label: "chunky sneakers", query: "chunky platform sneakers", checked: false },
      ],
      preference: "streetwear brands, Supreme or Off-White, don't mind spending more",
      canvasId: "eval-search-3",
    },
    outputs: {
      expectedBrands: ["Supreme", "Off-White"],
      expectedResultCount: 3,
    },
  },
];

const DISCOVER_EXAMPLES = [
  {
    inputs: {
      items: [
        { id: "d1", label: "white linen blazer", query: "white linen blazer", checked: false },
        { id: "d2", label: "tailored wide-leg trousers", query: "wide leg trousers", checked: false },
        { id: "d3", label: "leather loafers", query: "leather loafers women", checked: false },
      ],
      canvasTitle: "Office Chic",
      canvasId: "eval-discover-1",
    },
    outputs: {
      expectedStyle: "professional",
      expectedCount: { min: 4, max: 6 },
      shouldNotInclude: ["wide-leg trousers", "linen blazer", "leather loafers"],
    },
  },
  {
    inputs: {
      items: [
        { id: "d4", label: "flowy boho maxi dress", query: "boho maxi dress", checked: false },
        { id: "d5", label: "woven basket bag", query: "woven basket bag", checked: false },
        { id: "d6", label: "leather gladiator sandals", query: "gladiator sandals", checked: false },
        { id: "d7", label: "layered gold necklaces", query: "layered gold necklaces", checked: false },
      ],
      canvasTitle: "Summer Bohemian",
      canvasId: "eval-discover-2",
    },
    outputs: {
      expectedStyle: "bohemian",
      expectedCount: { min: 4, max: 6 },
      shouldNotInclude: ["maxi dress", "basket bag", "gladiator sandals", "gold necklaces"],
    },
  },
  {
    inputs: {
      items: [
        { id: "d8", label: "oversized hoodie", query: "oversized hoodie", checked: false },
        { id: "d9", label: "baggy jeans", query: "baggy jeans women", checked: false },
        { id: "d10", label: "chunky high-top sneakers", query: "chunky high top sneakers", checked: false },
      ],
      canvasTitle: "Street Style",
      canvasId: "eval-discover-3",
    },
    outputs: {
      expectedStyle: "streetwear",
      expectedCount: { min: 4, max: 6 },
      shouldNotInclude: ["hoodie", "baggy jeans", "chunky sneakers"],
    },
  },
];

// Analyze examples: text-only (no real images) — tests prompt structure + label parsing
const ANALYZE_EXAMPLES = [
  {
    inputs: {
      preference: "sustainable brands",
      promptDescription: "Woman in casual summer outfit: white linen shirt, mom jeans, white sneakers",
    },
    outputs: {
      expectedLabels: ["white linen shirt", "mom jeans", "white sneakers"],
      expectedMinCount: 2,
      expectedMaxCount: 6,
    },
  },
  {
    inputs: {
      preference: "luxury fashion, I love Gucci",
      promptDescription: "Model in evening wear: black silk slip dress, strappy heels, pearl earrings, clutch bag",
    },
    outputs: {
      expectedLabels: ["black silk slip dress", "strappy heels", "pearl earrings", "clutch bag"],
      expectedMinCount: 3,
      expectedMaxCount: 6,
    },
  },
  {
    inputs: {
      preference: "",
      promptDescription: "Streetwear look: oversized hoodie, cargo pants, chunky sneakers, baseball cap",
    },
    outputs: {
      expectedLabels: ["oversized hoodie", "cargo pants", "chunky sneakers", "baseball cap"],
      expectedMinCount: 3,
      expectedMaxCount: 6,
    },
  },
];

async function getOrCreateDataset(client: ReturnType<typeof getLangsmith>, name: string, description: string) {
  const exists = await client.hasDataset({ datasetName: name });
  if (exists) {
    return client.readDataset({ datasetName: name });
  }
  return client.createDataset(name, { description });
}

export async function POST(req: NextRequest) {
  const { type = "all" } = await req.json().catch(() => ({ type: "all" }));
  const client = getLangsmith();
  const created: Record<string, { id: string; exampleCount: number }> = {};

  try {
    if (type === "search" || type === "all") {
      const dataset = await getOrCreateDataset(
        client,
        "fashion-search-evals",
        "Evaluation examples for the search-agent: items + user preference → refined shopping queries"
      );
      await client.createExamples({
        datasetId: dataset.id,
        inputs: SEARCH_EXAMPLES.map((e) => e.inputs),
        outputs: SEARCH_EXAMPLES.map((e) => e.outputs),
      });
      created.search = { id: dataset.id, exampleCount: SEARCH_EXAMPLES.length };
    }

    if (type === "discover" || type === "all") {
      const dataset = await getOrCreateDataset(
        client,
        "fashion-discover-evals",
        "Evaluation examples for the discovery-agent: canvas items + title → complementary item suggestions"
      );
      await client.createExamples({
        datasetId: dataset.id,
        inputs: DISCOVER_EXAMPLES.map((e) => e.inputs),
        outputs: DISCOVER_EXAMPLES.map((e) => e.outputs),
      });
      created.discover = { id: dataset.id, exampleCount: DISCOVER_EXAMPLES.length };
    }

    if (type === "analyze" || type === "all") {
      const dataset = await getOrCreateDataset(
        client,
        "fashion-analyze-evals",
        "Evaluation examples for the analyze-agent: fashion image context + preference → detected item labels"
      );
      await client.createExamples({
        datasetId: dataset.id,
        inputs: ANALYZE_EXAMPLES.map((e) => e.inputs),
        outputs: ANALYZE_EXAMPLES.map((e) => e.outputs),
      });
      created.analyze = { id: dataset.id, exampleCount: ANALYZE_EXAMPLES.length };
    }

    return NextResponse.json({ ok: true, datasets: created });
  } catch (err) {
    console.error("Dataset creation error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function GET() {
  const client = getLangsmith();
  const names = ["fashion-search-evals", "fashion-discover-evals", "fashion-analyze-evals"];
  const results: Record<string, { exists: boolean; id?: string }> = {};

  for (const name of names) {
    const exists = await client.hasDataset({ datasetName: name });
    if (exists) {
      const dataset = await client.readDataset({ datasetName: name });
      results[name] = { exists: true, id: dataset.id };
    } else {
      results[name] = { exists: false };
    }
  }

  return NextResponse.json({ datasets: results });
}
