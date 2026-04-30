"use client";

import Image from "next/image";
import type { Photo } from "@/types/collage";
import { hashNum, hashInt, PIN_COLORS, PIN_POSITIONS_TOP } from "@/lib/design";

interface PhotoGridItemProps {
  photo: Photo;
  isExpanded: boolean;
  isNew?: boolean;
  onToggleExpand: (photoId: string) => void;
  onToggleItem: (photoId: string, itemId: string) => void;
  onDeletePhoto: (photoId: string) => void;
}

export default function PhotoGridItem({
  photo,
  isExpanded,
  isNew,
  onToggleExpand,
  onToggleItem,
  onDeletePhoto,
}: PhotoGridItemProps) {
  const url = photo.dataUrl ?? null;

  const photoTilt = hashNum(photo.id, -2.5, 2.5).toFixed(2);
  const cardTilt = hashNum(photo.id + "c", -1, 1).toFixed(2);
  const pinColor = PIN_COLORS[hashInt(photo.id, PIN_COLORS.length)];
  const pinPos = PIN_POSITIONS_TOP[hashInt(photo.id + "p", PIN_POSITIONS_TOP.length)];

  const unitClass = [
    "photo-unit",
    isExpanded ? "expanded" : "",
    isNew ? "new" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={unitClass}>
      <div
        className="photo-polaroid"
        style={{ transform: `rotate(${photoTilt}deg)` }}
        onClick={() => onToggleExpand(photo.id)}
      >
        <span className={`pin lg ${pinPos} ${pinColor}`} />
        {url ? (
          <Image
            src={url}
            alt="Fashion photo"
            width={380}
            height={475}
            className="photo-img"
            unoptimized
          />
        ) : (
          <div className="photo-img" />
        )}
        <div className="expand-hint">⌄</div>
      </div>

      <div
        className="items-card"
        style={{ transform: `rotate(${cardTilt}deg)` }}
        onClick={(e) => e.stopPropagation()}
      >
        {photo.detectedItems.length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--ink-3)", margin: "14px 0 12px" }}>
            No items detected.
          </p>
        ) : (
          photo.detectedItems.map((item) => (
            <div key={item.id} className="item-row">
              <div
                className={`item-chk${item.checked ? " on" : ""}`}
                onClick={() => onToggleItem(photo.id, item.id)}
              >
                {item.checked ? "✓" : ""}
              </div>
              <span className={`item-label${item.checked ? " checked" : ""}`}>
                {item.label}
              </span>
              <a
                href={`https://www.google.com/search?tbm=shop&q=${encodeURIComponent(item.query)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="shop-link"
                onClick={(e) => e.stopPropagation()}
              >
                Shop →
              </a>
            </div>
          ))
        )}
        <div className="delete-row">
          <button
            className="delete-btn"
            onClick={(e) => {
              e.stopPropagation();
              onDeletePhoto(photo.id);
            }}
          >
            Delete photo
          </button>
        </div>
      </div>
    </div>
  );
}
