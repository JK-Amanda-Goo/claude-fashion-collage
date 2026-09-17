import { getCurrentUser, setCurrentUser, logout } from "@/lib/auth";

const sessionStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();

Object.defineProperty(global, "sessionStorage", { value: sessionStorageMock });

beforeEach(() => {
  sessionStorageMock.clear();
});

describe("session", () => {
  it("getCurrentUser returns null when no session", () => {
    expect(getCurrentUser()).toBeNull();
  });

  it("setCurrentUser stores and retrieves the user", () => {
    setCurrentUser("user@test.com");
    expect(getCurrentUser()).toBe("user@test.com");
  });

  it("logout clears the session", () => {
    setCurrentUser("user@test.com");
    logout();
    expect(getCurrentUser()).toBeNull();
  });
});
