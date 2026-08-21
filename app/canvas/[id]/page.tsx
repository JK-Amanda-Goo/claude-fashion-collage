"use client";

import { useState, useCallback, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useCanvasesContext } from "@/app/providers";
import { usePhotoUpload } from "@/hooks/usePhotoUpload";
import PhotoGrid from "@/components/PhotoGrid";
import UploadButton from "@/components/UploadButton";
import type { Photo, DetectedItem } from "@/types/collage";
import type { SearchResult } from "@/app/api/search/route";
import type { DiscoveredItem } from "@/app/api/discover/route";

export default function CanvasPage() {
  const { id } = useParams<{ id: string }>();
  const { canvases, addPhoto, deletePhoto, toggleItemChecked } = useCanvasesContext();
  const [expandedPhotoId, setExpandedPhotoId] = useState<string | null>(null);
  const [newPhotoId, setNewPhotoId] = useState<string | null>(null);

  const [preference, setPreference] = useState("");
  const [savedPreference, setSavedPreference] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [discovered, setDiscovered] = useState<DiscoveredItem[]>([]);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [discoverError, setDiscoverError] = useState<string | null>(null);

  const canvas = canvases.find((c) => c.id === id);

  useEffect(() => {
    const stored = localStorage.getItem(`pref-${id}`) ?? "";
    setPreference(stored);
    setSavedPreference(stored);
  }, [id]);

  const handleUploaded = useCallback(
    (photo: Photo) => {
      addPhoto(id, photo);
      setExpandedPhotoId(photo.id);
      setNewPhotoId(photo.id);
      setTimeout(() => setNewPhotoId(null), 2200);
    },
    [id, addPhoto]
  );

  const { upload, isLoading, error } = usePhotoUpload({
    canvasId: id,
    onUploaded: handleUploaded,
  });

  function handleToggleExpand(photoId: string) {
    setExpandedPhotoId((prev) => (prev === photoId ? null : photoId));
  }

  function handleToggleItem(photoId: string, itemId: string) {
    toggleItemChecked(id, photoId, itemId);
  }

  function handleDeletePhoto(photoId: string) {
    deletePhoto(id, photoId);
    if (expandedPhotoId === photoId) setExpandedPhotoId(null);
  }

  function getAllItems(): DetectedItem[] {
    if (!canvas) return [];
    return canvas.photos.flatMap((p) => p.detectedItems);
  }

  async function handleSavePreference() {
    localStorage.setItem(`pref-${id}`, preference);
    setSavedPreference(preference);

    const items = getAllItems();
    if (items.length === 0) return;
    setIsSearching(true);
    setSearchError(null);
    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items, preference, canvasId: id }),
      });
      if (!res.ok) throw new Error("Search failed. Please try again.");
      const data = await res.json();
      setSearchResults(data.results ?? []);
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : "Search failed. Please try again.");
    } finally {
      setIsSearching(false);
    }
  }

  async function handleDiscover() {
    const items = getAllItems();
    if (items.length === 0) return;
    setIsDiscovering(true);
    setDiscoverError(null);
    try {
      const res = await fetch("/api/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items, canvasTitle: canvas?.title, canvasId: id }),
      });
      if (!res.ok) throw new Error("Discovery failed. Please try again.");
      const data = await res.json();
      setDiscovered((prev) => {
        const seen = new Set(prev.map((i) => i.label.toLowerCase()));
        const fresh = (data.discovered ?? []).filter(
          (i: DiscoveredItem) => !seen.has(i.label.toLowerCase())
        );
        return [...prev, ...fresh];
      });
    } catch (err) {
      setDiscoverError(err instanceof Error ? err.message : "Discovery failed. Please try again.");
    } finally {
      setIsDiscovering(false);
    }
  }

  // Save button state: idle | dirty | saved | loading
  const saveState: "idle" | "dirty" | "saved" | "loading" = isSearching
    ? "loading"
    : preference !== savedPreference
    ? "dirty"
    : preference === ""
    ? "idle"
    : "saved";

  const saveBtnLabel =
    saveState === "loading"
      ? "Saving…"
      : saveState === "dirty"
      ? "Save"
      : "Saved ✓";

  if (!canvas) {
    return (
      <div className="fc-shell">
        <div className="cork-board">
          <div className="cork-inner">
            <Link href="/" className="cork-back">
              ← Back
            </Link>
            <p className="cork-empty">Canvas not found.</p>
          </div>
        </div>
      </div>
    );
  }

  const allItems = getAllItems();

  return (
    <div className="fc-shell">
      <div className="cork-board">
        <div className="cork-inner">
          <Link href="/" className="cork-back">
            ← Back
          </Link>

          <div className="detail-head-row">
            <h1 className="cork-title">{canvas.title}</h1>
            <UploadButton
              onFileSelected={upload}
              isLoading={isLoading}
              error={error}
            />
          </div>

          <div className="context-strip">
            <textarea
              className="fc-input"
              value={preference}
              rows={1}
              onChange={(e) => {
                setPreference(e.target.value);
                e.target.style.height = "auto";
                e.target.style.height = `${e.target.scrollHeight}px`;
              }}
              placeholder="e.g. prioritize Zara, prefer stores in Manhattan"
            />
            <button
              className={`save-btn ${saveState}`}
              onClick={saveState === "dirty" ? handleSavePreference : undefined}
              disabled={saveState === "idle" || saveState === "loading"}
            >
              {saveBtnLabel}
            </button>
          </div>
          {searchError && <p className="fc-error">{searchError}</p>}

          <PhotoGrid
            photos={canvas.photos}
            expandedPhotoId={expandedPhotoId}
            newPhotoId={newPhotoId}
            onToggleExpand={handleToggleExpand}
            onToggleItem={handleToggleItem}
            onDeletePhoto={handleDeletePhoto}
          />

          {searchResults && searchResults.length > 0 && (
            <div className="cork-results">
              <p className="cork-results-title">Search results</p>
              {searchResults.map((r) => (
                <div key={r.itemId} className="cork-result-item">
                  <span className="cork-result-label">{r.label}</span>
                  <a
                    href={r.searchUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="cork-result-shop"
                  >
                    Shop →
                  </a>
                </div>
              ))}
            </div>
          )}

          {allItems.length > 0 && (
            <div className="discover-btn-row">
              <button
                className="btn-ghost"
                onClick={handleDiscover}
                disabled={isDiscovering}
              >
                {isDiscovering ? "Discovering…" : "Discover more"}
              </button>
              {discoverError && <p className="fc-error">{discoverError}</p>}

              {discovered.length > 0 && (
                <div className="cork-results">
                  <p className="cork-results-title">You might also like</p>
                  {discovered.map((item, i) => (
                    <div key={i} className="cork-result-item">
                      <div>
                        <div className="cork-result-label">{item.label}</div>
                        <div className="cork-result-reason">{item.reason}</div>
                      </div>
                      <a
                        href={item.searchUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="cork-result-shop"
                      >
                        Shop →
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
