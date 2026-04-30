import { renderHook, act } from "@testing-library/react";
import { usePhotoUpload } from "@/hooks/usePhotoUpload";

global.fetch = jest.fn();
global.crypto.randomUUID = jest.fn().mockReturnValue("test-uuid");

const makeFile = () => new File(["data"], "test.jpg", { type: "image/jpeg" });

const mockFetch = global.fetch as jest.Mock;

describe("usePhotoUpload", () => {
  const onUploaded = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("calls onUploaded with a well-formed Photo on success", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        detectedItems: [
          { id: "item-1", label: "red dress", query: "red dress", checked: false },
        ],
      }),
    });

    const { result } = renderHook(() =>
      usePhotoUpload({ canvasId: "canvas-1", onUploaded })
    );

    await act(async () => {
      await result.current.upload(makeFile());
    });

    expect(onUploaded).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "test-uuid",
        detectedItems: expect.arrayContaining([
          expect.objectContaining({ label: "red dress" }),
        ]),
      })
    );
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("sets error when /api/analyze returns non-ok", async () => {
    mockFetch.mockResolvedValue({ ok: false });

    const { result } = renderHook(() =>
      usePhotoUpload({ canvasId: "canvas-1", onUploaded })
    );

    await act(async () => {
      await result.current.upload(makeFile());
    });

    expect(result.current.error).toBeTruthy();
    expect(onUploaded).not.toHaveBeenCalled();
  });

  it("resets error to null on subsequent upload attempt", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ detectedItems: [] }),
    });

    const { result } = renderHook(() =>
      usePhotoUpload({ canvasId: "canvas-1", onUploaded })
    );

    await act(async () => {
      await result.current.upload(makeFile());
    });
    expect(result.current.error).toBeTruthy();

    await act(async () => {
      await result.current.upload(makeFile());
    });
    expect(result.current.error).toBeNull();
  });
});
