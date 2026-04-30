"use client";

import { useState } from "react";

interface CreateCanvasFormProps {
  onCreate: (title: string) => void;
}

export default function CreateCanvasForm({ onCreate }: CreateCanvasFormProps) {
  const [title, setTitle] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    onCreate(trimmed);
    setTitle("");
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", gap: 10 }}>
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Canvas name (e.g. Spring 2026)"
        className="fc-input"
        style={{ flex: 1 }}
      />
      <button type="submit" disabled={!title.trim()} className="btn-primary">
        New canvas
      </button>
    </form>
  );
}
