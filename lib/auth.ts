const USERS_KEY = "FC_USERS";
const SESSION_KEY = "FC_SESSION";

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(text)
  );
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function hashPassword(password: string): Promise<string> {
  return sha256(password);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return (await sha256(password)) === hash;
}

function getUsers(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY) ?? "{}");
  } catch {
    return {};
  }
}

function saveUsers(users: Record<string, string>): void {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

export async function register(
  email: string,
  password: string
): Promise<"ok" | "exists"> {
  const users = getUsers();
  const key = email.toLowerCase();
  if (users[key]) return "exists";
  users[key] = await hashPassword(password);
  saveUsers(users);
  return "ok";
}

export async function login(
  email: string,
  password: string
): Promise<"ok" | "invalid"> {
  const users = getUsers();
  const hash = users[email.toLowerCase()];
  if (!hash) return "invalid";
  const match = await verifyPassword(password, hash);
  return match ? "ok" : "invalid";
}

export function getCurrentUser(): string | null {
  try {
    return sessionStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
}

export function setCurrentUser(email: string | null): void {
  if (email) {
    sessionStorage.setItem(SESSION_KEY, email);
  } else {
    sessionStorage.removeItem(SESSION_KEY);
  }
}

export function logout(): void {
  setCurrentUser(null);
}
