import {
  loadCanvases,
  saveCanvases,
  addPhotoToCanvas,
  updateDetectedItem,
} from "@/lib/storage";
import type { Canvas, Photo } from "@/types/collage";

const makeCanvas = (overrides?: Partial<Canvas>): Canvas => ({
  id: "canvas-1",
  title: "Test Canvas",
  createdAt: "2026-01-01T00:00:00.000Z",
  photos: [],
  ...overrides,
});

const makePhoto = (overrides?: Partial<Photo>): Photo => ({
  id: "photo-1",
  uploadedAt: "2026-01-01T00:00:00.000Z",
  detectedItems: [],
  ...overrides,
});

describe("loadCanvases", () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  it("returns [] when localStorage is empty", () => {
    expect(loadCanvases()).toEqual([]);
  });

  it("returns parsed canvases after saveCanvases", () => {
    const canvas = makeCanvas();
    saveCanvases([canvas]);
    expect(loadCanvases()).toEqual([canvas]);
  });

  it("returns [] when localStorage contains invalid JSON", () => {
    localStorage.setItem("FASHION_COLLAGE_CANVASES", "not-json");
    expect(loadCanvases()).toEqual([]);
  });

  it("returns [] when saved value is empty array", () => {
    saveCanvases([]);
    expect(loadCanvases()).toEqual([]);
  });
});

describe("addPhotoToCanvas", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("appends photo to the correct canvas", () => {
    const canvas = makeCanvas();
    saveCanvases([canvas]);
    const photo = makePhoto();
    addPhotoToCanvas("canvas-1", photo);
    const [updated] = loadCanvases();
    expect(updated.photos).toHaveLength(1);
    expect(updated.photos[0]).toEqual(photo);
  });

  it("does not modify other canvases", () => {
    const c1 = makeCanvas({ id: "canvas-1" });
    const c2 = makeCanvas({ id: "canvas-2", title: "Other" });
    saveCanvases([c1, c2]);
    addPhotoToCanvas("canvas-1", makePhoto());
    const canvases = loadCanvases();
    expect(canvases.find((c) => c.id === "canvas-2")?.photos).toHaveLength(0);
  });
});

describe("updateDetectedItem", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("updates only the target item's checked field", () => {
    const photo = makePhoto({
      detectedItems: [
        { id: "item-1", label: "Dress", query: "red dress", checked: false },
        { id: "item-2", label: "Shoes", query: "black shoes", checked: false },
      ],
    });
    saveCanvases([makeCanvas({ photos: [photo] })]);
    updateDetectedItem("canvas-1", "photo-1", "item-1", { checked: true });
    const [canvas] = loadCanvases();
    const items = canvas.photos[0].detectedItems;
    expect(items.find((i) => i.id === "item-1")?.checked).toBe(true);
    expect(items.find((i) => i.id === "item-2")?.checked).toBe(false);
  });
});
