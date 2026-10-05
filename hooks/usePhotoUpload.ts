"use client";

import { useState, useCallback } from "react";
import type { Photo, DetectedItem } from "@/types/collage";

interface UsePhotoUploadOptions {
  canvasId: string;
  onUploaded: (photo: Photo) => void;
}

export interface UsePhotoUploadReturn {
  upload: (file: File) => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

const MAX_DIMENSION = 1600;

async function prepareImage(
  file: File
): Promise<{ base64: string; mimeType: string }> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    return { base64: dataUrl.split(",")[1], mimeType: "image/jpeg" };
  } catch {
    return { base64: await fileToBase64(file), mimeType: file.type };
  }
}

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // strip the data URL prefix (e.g. "data:image/jpeg;base64,")
      const base64 = result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

export function usePhotoUpload({
  canvasId,
  onUploaded,
}: UsePhotoUploadOptions): UsePhotoUploadReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = useCallback(
    async (file: File) => {
      setIsLoading(true);
      setError(null);

      try {
        const photoId = crypto.randomUUID();
        const { base64: imageBase64, mimeType } = await prepareImage(file);
        const dataUrl = `data:${mimeType};base64,${imageBase64}`;

        const preference = localStorage.getItem(`pref-${canvasId}`) ?? undefined;

        const res = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageBase64, mimeType, preference }),
        });

        if (res.status === 429) {
          throw new Error("Daily limit reached. Please try again tomorrow.");
        }
        if (res.status === 401) {
          throw new Error("Session expired. Please sign in again.");
        }
        if (!res.ok) throw new Error("Analysis failed");

        const { detectedItems } = (await res.json()) as {
          detectedItems: DetectedItem[];
        };

        const photo: Photo = {
          id: photoId,
          uploadedAt: new Date().toISOString(),
          detectedItems,
          dataUrl,
        };

        onUploaded(photo);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Upload failed. Please try again."
        );
      } finally {
        setIsLoading(false);
      }
    },
    [canvasId, onUploaded]
  );

  return { upload, isLoading, error };
}
