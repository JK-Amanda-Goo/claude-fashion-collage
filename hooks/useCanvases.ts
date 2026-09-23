"use client";

import { useState, useEffect, useCallback } from "react";
import { get, set, del } from "idb-keyval";
import type { Canvas, Photo } from "@/types/collage";
import { loadCanvases, saveCanvases } from "@/lib/storage";
import { logEvent } from "@/lib/eventLog";

export interface UseCanvasesReturn {
  canvases: Canvas[];
  createCanvas: (title: string) => void;
  deleteCanvas: (canvasId: string) => void;
  addPhoto: (canvasId: string, photo: Photo) => void;
  deletePhoto: (canvasId: string, photoId: string) => void;
  toggleItemChecked: (canvasId: string, photoId: string, itemId: string) => void;
}

function stripDataUrl(photo: Photo): Photo {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { dataUrl: _, ...rest } = photo;
  return rest;
}

function saveWithoutDataUrls(canvases: Canvas[]): void {
  saveCanvases(
    canvases.map((c) => ({ ...c, photos: c.photos.map(stripDataUrl) }))
  );
}

export function useCanvases(): UseCanvasesReturn {
  const [canvases, setCanvases] = useState<Canvas[]>([]);

  useEffect(() => {
    async function init() {
      const loaded = loadCanvases();
      const hydrated = await Promise.all(
        loaded.map(async (canvas) => ({
          ...canvas,
          photos: await Promise.all(
            canvas.photos.map(async (photo) => ({
              ...photo,
              dataUrl: (await get<string>(`photo-${photo.id}`)) ?? undefined,
            }))
          ),
        }))
      );
      setCanvases(hydrated);
    }
    init();
  }, []);

  const createCanvas = useCallback((title: string) => {
    const canvas: Canvas = {
      id: crypto.randomUUID(),
      title: title.trim(),
      createdAt: new Date().toISOString(),
      photos: [],
    };
    setCanvases((prev) => {
      const updated = [...prev, canvas];
      saveWithoutDataUrls(updated);
      return updated;
    });
    logEvent("canvas_created", { canvasId: canvas.id });
  }, []);

  const addPhoto = useCallback((canvasId: string, photo: Photo) => {
    if (photo.dataUrl) {
      set(`photo-${photo.id}`, photo.dataUrl);
    }
    setCanvases((prev) => {
      const updated = prev.map((c) =>
        c.id === canvasId ? { ...c, photos: [...c.photos, photo] } : c
      );
      saveWithoutDataUrls(updated);
      return updated;
    });
    logEvent("photo_uploaded", { canvasId, metadata: { photoId: photo.id } });
  }, []);

  const deleteCanvas = useCallback((canvasId: string) => {
    setCanvases((prev) => {
      const canvas = prev.find((c) => c.id === canvasId);
      if (canvas) {
        canvas.photos.forEach((p) => del(`photo-${p.id}`));
        localStorage.removeItem(`pref-${canvasId}`);
      }
      const updated = prev.filter((c) => c.id !== canvasId);
      saveWithoutDataUrls(updated);
      return updated;
    });
  }, []);

  const deletePhoto = useCallback((canvasId: string, photoId: string) => {
    del(`photo-${photoId}`);
    setCanvases((prev) => {
      const updated = prev.map((c) =>
        c.id === canvasId
          ? { ...c, photos: c.photos.filter((p) => p.id !== photoId) }
          : c
      );
      saveWithoutDataUrls(updated);
      return updated;
    });
  }, []);

  const toggleItemChecked = useCallback(
    (canvasId: string, photoId: string, itemId: string) => {
      setCanvases((prev) => {
        const updated = prev.map((c) => {
          if (c.id !== canvasId) return c;
          return {
            ...c,
            photos: c.photos.map((p) => {
              if (p.id !== photoId) return p;
              return {
                ...p,
                detectedItems: p.detectedItems.map((item) =>
                  item.id === itemId
                    ? { ...item, checked: !item.checked }
                    : item
                ),
              };
            }),
          };
        });
        saveWithoutDataUrls(updated);
        return updated;
      });
    },
    []
  );

  return { canvases, createCanvas, deleteCanvas, addPhoto, deletePhoto, toggleItemChecked };
}
