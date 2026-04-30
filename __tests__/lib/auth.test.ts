import { hashPassword, verifyPassword, register, login, getCurrentUser, setCurrentUser, logout } from "@/lib/auth";

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();

const sessionStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();

Object.defineProperty(global, "localStorage", { value: localStorageMock });
Object.defineProperty(global, "sessionStorage", { value: sessionStorageMock });

beforeEach(() => {
  localStorageMock.clear();
  sessionStorageMock.clear();
});

describe("hashPassword / verifyPassword", () => {
  it("produces a consistent hash", async () => {
    const h1 = await hashPassword("secret");
    const h2 = await hashPassword("secret");
    expect(h1).toBe(h2);
  });

  it("verifies the correct password", async () => {
    const hash = await hashPassword("mypassword");
    expect(await verifyPassword("mypassword", hash)).toBe(true);
  });

  it("rejects the wrong password", async () => {
    const hash = await hashPassword("mypassword");
    expect(await verifyPassword("wrong", hash)).toBe(false);
  });
});

describe("register", () => {
  it("returns ok for a new email", async () => {
    expect(await register("user@test.com", "pass123")).toBe("ok");
  });

  it("returns exists for a duplicate email", async () => {
    await register("user@test.com", "pass123");
    expect(await register("user@test.com", "other")).toBe("exists");
  });

  it("is case-insensitive for email", async () => {
    await register("User@Test.com", "pass123");
    expect(await register("user@test.com", "other")).toBe("exists");
  });
});

describe("login", () => {
  it("returns ok with correct credentials", async () => {
    await register("user@test.com", "pass123");
    expect(await login("user@test.com", "pass123")).toBe("ok");
  });

  it("returns invalid for unknown email", async () => {
    expect(await login("nobody@test.com", "pass")).toBe("invalid");
  });

  it("returns invalid for wrong password", async () => {
    await register("user@test.com", "pass123");
    expect(await login("user@test.com", "wrongpass")).toBe("invalid");
  });
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
