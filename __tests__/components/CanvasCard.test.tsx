import { render, screen, fireEvent } from "@testing-library/react";
import CanvasCard from "@/components/CanvasCard";
import type { Canvas } from "@/types/collage";

const pushMock = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

const canvas: Canvas = {
  id: "c1",
  title: "Spring 2026",
  createdAt: "2026-01-15T00:00:00.000Z",
  photos: [
    { id: "p1", uploadedAt: "", detectedItems: [] },
    { id: "p2", uploadedAt: "", detectedItems: [] },
  ],
};

describe("CanvasCard", () => {
  it("renders the canvas title", () => {
    render(<CanvasCard canvas={canvas} onDelete={jest.fn()} />);
    expect(screen.getByText("Spring 2026")).toBeInTheDocument();
  });

  it("renders the photo count", () => {
    render(<CanvasCard canvas={canvas} onDelete={jest.fn()} />);
    expect(screen.getByText(/2 photos/)).toBeInTheDocument();
  });

  it("navigates to the canvas detail page on click", () => {
    render(<CanvasCard canvas={canvas} onDelete={jest.fn()} />);
    fireEvent.click(screen.getByRole("link"));
    expect(pushMock).toHaveBeenCalledWith("/canvas/c1");
  });
});
