import { GoogleGenerativeAI } from "@google/generative-ai";
import type { DetectedItem } from "@/types/collage";

export const MODEL = "gemini-2.0-flash";

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

interface GeminiItem {
  label: string;
  query: string;
}

export interface AnalyzeResult {
  items: DetectedItem[];
  prompt: string;
  usage: {
    input?: number;
    output?: number;
    total?: number;
  };
}

export async function analyzeImage(
  imageBase64: string,
  mimeType: string,
  preference?: string
): Promise<AnalyzeResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: MODEL });
  const prompt = buildFashionPrompt(preference);

  const result = await model.generateContent([
    {
      inlineData: {
        data: imageBase64,
        mimeType,
      },
    },
    prompt,
  ]);

  const text = result.response.text().trim();
  const usage = result.response.usageMetadata;

  try {
    const cleaned = text.replace(/^```json\s*/i, "").replace(/```\s*$/, "").trim();
    const parsed = JSON.parse(cleaned) as GeminiItem[];
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
    return {
      items,
      prompt,
      usage: {
        input: usage?.promptTokenCount,
        output: usage?.candidatesTokenCount,
        total: usage?.totalTokenCount,
      },
    };
  } catch {
    return { items: [], prompt, usage: {} };
  }
}
