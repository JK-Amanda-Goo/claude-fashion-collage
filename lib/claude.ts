import Anthropic from "@anthropic-ai/sdk";
import type { DetectedItem } from "@/types/collage";

const MODEL = "claude-sonnet-4-6";

function getClient(): Anthropic {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
}

export function buildFashionPrompt(preference?: string): string {
  const preferenceClause = preference?.trim()
    ? `\nThe user's shopping preference is: "${preference.trim()}". Where relevant, tailor the search query for each item to reflect this (e.g. brand, budget, location).`
    : "";

  return `Analyze this fashion photo.${preferenceClause}

For each distinct clothing item or accessory visible on the person, return a JSON array with:
- label: a short, specific description (e.g. "white linen blazer", "black leather ankle boots", "silver hoop earrings")
- query: a Google Shopping search query to find similar items (e.g. "white linen blazer women")

Return ONLY a valid JSON array, no markdown, no explanation:
[{ "label": "...", "query": "..." }]

Identify at most 6 items. If no fashion items are clearly visible, return [].`;
}

export interface AnalyzeResult {
  items: DetectedItem[];
  prompt: string;
  usage: { input?: number; output?: number; total?: number };
}

export async function analyzeImage(
  imageBase64: string,
  mimeType: string,
  preference?: string
): Promise<AnalyzeResult> {
  const client = getClient();
  const prompt = buildFashionPrompt(preference);

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: mimeType as "image/jpeg" | "image/png" | "image/gif" | "image/webp", data: imageBase64 },
          },
          { type: "text", text: prompt },
        ],
      },
    ],
  });

  const text = response.content[0].type === "text" ? response.content[0].text.trim() : "";
  const usage = {
    input: response.usage.input_tokens,
    output: response.usage.output_tokens,
    total: response.usage.input_tokens + response.usage.output_tokens,
  };

  try {
    const cleaned = text.replace(/^```json\s*/i, "").replace(/```\s*$/, "").trim();
    const parsed = JSON.parse(cleaned) as { label: string; query: string }[];
    const items = Array.isArray(parsed)
      ? parsed
          .filter((item) => item.label && item.query)
          .map((item) => ({
            id: crypto.randomUUID(),
            label: item.label,
            query: item.query,
            checked: false,
          }))
      : [];
    return { items, prompt, usage };
  } catch {
    return { items: [], prompt, usage };
  }
}

export async function refineSearchQueries(
  items: DetectedItem[],
  preference: string
): Promise<{ itemId: string; label: string; refinedQuery: string }[]> {
  const client = getClient();

  const prompt = `You are a fashion shopping assistant. The user is looking for the following clothing items:

${items.map((i) => `- ${i.label} (id: ${i.id}, base query: "${i.query}")`).join("\n")}

User's shopping preference:
"${preference}"

For each item, generate a refined Google Shopping search query that incorporates the user's preference where relevant (e.g. brand, location, style, price range).

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

export interface DiscoveredItem {
  label: string;
  description: string;
  searchQuery: string;
  reason: string;
}

export async function discoverItems(
  canvasTitle: string,
  items: DetectedItem[]
): Promise<DiscoveredItem[]> {
  const client = getClient();

  const prompt = `You are a fashion discovery assistant. A user has a moodboard canvas called "${canvasTitle}" containing these items:

${items.map((i) => `- ${i.label}`).join("\n")}

Based on the overall aesthetic and vibe of this canvas, suggest 4-6 NEW fashion items the user hasn't already added that would complement this style. These should feel like natural extensions of the existing look — not duplicates.

Return ONLY a valid JSON array, no markdown, no explanation:
[{ "label": "...", "description": "...", "searchQuery": "...", "reason": "..." }]

- label: short item name (e.g. "camel wool scarf")
- description: one sentence on how it looks
- searchQuery: a Google Shopping search query for this item
- reason: one sentence on why it fits this canvas's vibe`;

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.content[0].type === "text" ? response.content[0].text.trim() : "[]";
  const cleaned = text.replace(/^```json\s*/i, "").replace(/```\s*$/, "").trim();
  return JSON.parse(cleaned);
}

export { MODEL };
