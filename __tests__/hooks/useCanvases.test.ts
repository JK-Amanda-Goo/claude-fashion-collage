import { renderHook, act, waitFor } from "@testing-library/react";
import { useCanvases } from "@/hooks/useCanvases";
import type { Photo } from "@/types/collage";

jest.mock("idb-keyval", () => ({
  get: jest.fn().mockResolvedValue(undefined),
  set: jest.fn().mockResolvedValue(undefined),
  del: jest.fn().mockResolvedValue(undefined),
}));

const makePhoto = (overrides?: Partial<Photo>): Photo => ({
  id: "photo-1",
  uploadedAt: "2026-01-01T00:00:00.000Z",
  detectedItems: [],
  ...overrides,
});

describe("useCanvases", () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  it("initializes with canvases from storage on mount", async () => {
    localStorage.setItem(
      "FASHION_COLLAGE_CANVASES",
      JSON.stringify([
        {
          id: "c1",
          title: "Spring",
          createdAt: "2026-01-01T00:00:00.000Z",
          photos: [],
        },
      ])
    );
    const { result } = renderHook(() => useCanvases());
    await waitFor(() => expect(result.current.canvases).toHaveLength(1));
    expect(result.current.canvases[0].title).toBe("Spring");
  });

  it("createCanvas adds a canvas to state and localStorage", async () => {
    const { result } = renderHook(() => useCanvases());
    await waitFor(() => expect(result.current.canvases).toBeDefined());
    act(() => {
      result.current.createCanvas("Spring 2026");
    });
    expect(result.current.canvases).toHaveLength(1);
    expect(result.current.canvases[0].title).toBe("Spring 2026");
    const saved = JSON.parse(
      localStorage.getItem("FASHION_COLLAGE_CANVASES") ?? "[]"
    );
    expect(saved).toHaveLength(1);
  });

  it("toggleItemChecked flips checked and persists", async () => {
    const photo = makePhoto({
      detectedItems: [
        { id: "item-1", label: "Dress", query: "red dress", checked: false },
      ],
    });
    const { result } = renderHook(() => useCanvases());
    await waitFor(() => expect(result.current.canvases).toBeDefined());
    act(() => { result.current.createCanvas("Canvas"); });
    const canvasId = result.current.canvases[0].id;
    act(() => { result.current.addPhoto(canvasId, photo); });
    act(() => { result.current.toggleItemChecked(canvasId, "photo-1", "item-1"); });
    const item = result.current.canvases[0].photos[0].detectedItems[0];
    expect(item.checked).toBe(true);
  });

  it("toggleItemChecked does not mutate other items", async () => {
    const photo = makePhoto({
      detectedItems: [
        { id: "item-1", label: "Dress", query: "dress", checked: false },
        { id: "item-2", label: "Shoes", query: "shoes", checked: false },
      ],
    });
    const { result } = renderHook(() => useCanvases());
    await waitFor(() => expect(result.current.canvases).toBeDefined());
    act(() => { result.current.createCanvas("Canvas"); });
    const canvasId = result.current.canvases[0].id;
    act(() => { result.current.addPhoto(canvasId, photo); });
    act(() => { result.current.toggleItemChecked(canvasId, "photo-1", "item-1"); });
    const items = result.current.canvases[0].photos[0].detectedItems;
    expect(items[0].checked).toBe(true);
    expect(items[1].checked).toBe(false);
  });

  it("renameCanvas updates the title in state and localStorage", async () => {
    const { result } = renderHook(() => useCanvases());
    await waitFor(() => expect(result.current.canvases).toBeDefined());
    act(() => { result.current.createCanvas("Test Canvas"); });
    const canvasId = result.current.canvases[0].id;
    act(() => { result.current.renameCanvas(canvasId, "Spring Looks"); });
    expect(result.current.canvases[0].title).toBe("Spring Looks");
    const saved = JSON.parse(
      localStorage.getItem("FASHION_COLLAGE_CANVASES") ?? "[]"
    );
    expect(saved[0].title).toBe("Spring Looks");
  });

  it("renameCanvas ignores blank titles", async () => {
    const { result } = renderHook(() => useCanvases());
    await waitFor(() => expect(result.current.canvases).toBeDefined());
    act(() => { result.current.createCanvas("Test Canvas"); });
    const canvasId = result.current.canvases[0].id;
    act(() => { result.current.renameCanvas(canvasId, "   "); });
    expect(result.current.canvases[0].title).toBe("Test Canvas");
  });

  it("deletePhoto removes the photo from state and localStorage", async () => {
    const photo = makePhoto();
    const { result } = renderHook(() => useCanvases());
    await waitFor(() => expect(result.current.canvases).toBeDefined());
    act(() => { result.current.createCanvas("Canvas"); });
    const canvasId = result.current.canvases[0].id;
    act(() => { result.current.addPhoto(canvasId, photo); });
    expect(result.current.canvases[0].photos).toHaveLength(1);
    act(() => { result.current.deletePhoto(canvasId, "photo-1"); });
    expect(result.current.canvases[0].photos).toHaveLength(0);
  });
});
