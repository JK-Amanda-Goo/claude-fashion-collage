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
        const imageBase64 = await fileToBase64(file);
        const dataUrl = `data:${file.type};base64,${imageBase64}`;

        const preference = localStorage.getItem(`pref-${canvasId}`) ?? undefined;

        const res = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageBase64, mimeType: file.type, preference }),
        });

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
