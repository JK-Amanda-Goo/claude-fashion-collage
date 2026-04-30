import type { Canvas, Photo, DetectedItem } from "@/types/collage";

const STORAGE_KEY = "FASHION_COLLAGE_CANVASES";

export function loadCanvases(): Canvas[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Canvas[];
  } catch {
    return [];
  }
}

export function saveCanvases(canvases: Canvas[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(canvases));
}

export function addCanvasToStorage(canvas: Canvas): void {
  const canvases = loadCanvases();
  saveCanvases([...canvases, canvas]);
}

export function addPhotoToCanvas(canvasId: string, photo: Photo): void {
  const canvases = loadCanvases();
  saveCanvases(
    canvases.map((c) =>
      c.id === canvasId ? { ...c, photos: [...c.photos, photo] } : c
    )
  );
}

export function updateDetectedItem(
  canvasId: string,
  photoId: string,
  itemId: string,
  patch: Partial<DetectedItem>
): void {
  const canvases = loadCanvases();
  saveCanvases(
    canvases.map((c) => {
      if (c.id !== canvasId) return c;
      return {
        ...c,
        photos: c.photos.map((p) => {
          if (p.id !== photoId) return p;
          return {
            ...p,
            detectedItems: p.detectedItems.map((item) =>
              item.id === itemId ? { ...item, ...patch } : item
            ),
          };
        }),
      };
    })
  );
}
