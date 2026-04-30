import { analyzeImage } from "@/lib/gemini";

const mockGenerateContent = jest.fn();

jest.mock("@google/generative-ai", () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: jest.fn().mockReturnValue({
      generateContent: mockGenerateContent,
    }),
  })),
}));

const makeResponse = (text: string) => ({
  response: { text: () => text, usageMetadata: undefined },
});

describe("analyzeImage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.GEMINI_API_KEY = "test-key";
  });

  it("returns parsed items from valid JSON response", async () => {
    mockGenerateContent.mockResolvedValue(
      makeResponse(
        JSON.stringify([
          { label: "red midi dress", query: "red midi dress women" },
          { label: "white sneakers", query: "white sneakers women" },
        ])
      )
    );

    const { items } = await analyzeImage("base64data", "image/jpeg");
    expect(items).toHaveLength(2);
    expect(items[0].label).toBe("red midi dress");
    expect(items[0].query).toBe("red midi dress women");
    expect(items[0].checked).toBe(false);
    expect(items[0].id).toBeTruthy();
  });

  it("returns [] when Gemini returns malformed JSON", async () => {
    mockGenerateContent.mockResolvedValue(makeResponse("not valid json"));
    const { items } = await analyzeImage("base64data", "image/jpeg");
    expect(items).toEqual([]);
  });

  it("returns [] when Gemini returns empty array", async () => {
    mockGenerateContent.mockResolvedValue(makeResponse("[]"));
    const { items } = await analyzeImage("base64data", "image/jpeg");
    expect(items).toEqual([]);
  });

  it("strips markdown code fences from response", async () => {
    mockGenerateContent.mockResolvedValue(
      makeResponse(
        "```json\n[{\"label\":\"blue jeans\",\"query\":\"blue jeans women\"}]\n```"
      )
    );
    const { items } = await analyzeImage("base64data", "image/jpeg");
    expect(items).toHaveLength(1);
    expect(items[0].label).toBe("blue jeans");
  });

  it("throws when GEMINI_API_KEY is not set", async () => {
    delete process.env.GEMINI_API_KEY;
    await expect(analyzeImage("data", "image/jpeg")).rejects.toThrow(
      "GEMINI_API_KEY is not set"
    );
  });
});
