"use client";

import { useRef } from "react";

interface UploadButtonProps {
  onFileSelected: (file: File) => void;
  isLoading: boolean;
  error: string | null;
}

export default function UploadButton({
  onFileSelected,
  isLoading,
  error,
}: UploadButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelected(file);
      e.target.value = "";
    }
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleChange}
        style={{ display: "none" }}
        aria-label="Upload photo"
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={isLoading}
        className="upload-fab"
        aria-label={isLoading ? "Analyzing…" : "Upload photo"}
        title={isLoading ? "Analyzing…" : "Upload photo"}
      >
        {isLoading ? "…" : "+"}
      </button>
      {error && (
        <p style={{
          marginTop: 8,
          fontSize: 13,
          color: "#fff",
          background: "rgba(192,57,43,0.85)",
          borderRadius: 6,
          padding: "6px 10px",
          maxWidth: 220,
          lineHeight: 1.4,
        }}>
          {error}
        </p>
      )}
    </div>
  );
}
