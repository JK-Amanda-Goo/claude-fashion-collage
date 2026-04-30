"use client";

import { useRouter } from "next/navigation";
import type { Canvas } from "@/types/collage";
import { hashNum, hashInt, PIN_COLORS, PIN_POSITIONS_TOP } from "@/lib/design";

interface CanvasCardProps {
  canvas: Canvas;
  onDelete: (canvasId: string) => void;
}

export default function CanvasCard({ canvas, onDelete }: CanvasCardProps) {
  const router = useRouter();

  const date = new Date(canvas.createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const tilt = hashNum(canvas.id, -0.8, 0.8).toFixed(2);
  const pinColor = PIN_COLORS[hashInt(canvas.id, PIN_COLORS.length)];
  const pinPos = PIN_POSITIONS_TOP[hashInt(canvas.id + "p", PIN_POSITIONS_TOP.length)];

  const photoCount = canvas.photos.length;
  const photoLabel = photoCount === 1 ? "1 photo" : `${photoCount} photos`;

  return (
    <div style={{ paddingTop: 14 }}>
      <div
        className="canvas-card"
        style={{ transform: `rotate(${tilt}deg)`, cursor: "pointer" }}
        onClick={() => router.push(`/canvas/${canvas.id}`)}
        role="link"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && router.push(`/canvas/${canvas.id}`)}
      >
        <span className={`pin lg ${pinPos} ${pinColor}`} />
        <div className="canvas-card-name">{canvas.title}</div>
        <div className="canvas-card-meta">{photoLabel} · {date}</div>
        <button
          className="card-delete-btn"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(canvas.id);
          }}
          aria-label="Delete canvas"
        >
          ×
        </button>
      </div>
    </div>
  );
}
