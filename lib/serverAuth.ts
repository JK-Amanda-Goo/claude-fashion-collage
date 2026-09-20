import { randomBytes } from "crypto";
import { sql } from "@/lib/db";

// Length of the free trial for new signups. Change this to adjust it —
// existing trial users are affected immediately since it's computed from
// their signup date, not stored per-user.
export const TRIAL_DAYS = 7;

export interface UserRecord {
  id: number;
  email: string;
  tier: string;
  createdAt: string;
}

async function sha256Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function createUser(
  email: string,
  password: string
): Promise<UserRecord | "exists"> {
  const normalizedEmail = email.toLowerCase();
  const existing = await sql`SELECT id FROM users WHERE email = ${normalizedEmail}`;
  if (existing.length > 0) return "exists";

  const salt = randomBytes(16).toString("hex");
  const passwordHash = await sha256Hex(salt + password);

  const rows = await sql`
    INSERT INTO users (email, password_hash, password_salt)
    VALUES (${normalizedEmail}, ${passwordHash}, ${salt})
    RETURNING id, email, tier, created_at as "createdAt"
  `;
  return rows[0] as UserRecord;
}

export async function verifyUser(
  email: string,
  password: string
): Promise<UserRecord | "invalid"> {
  const normalizedEmail = email.toLowerCase();
  const rows = await sql`
    SELECT id, email, tier, password_hash, password_salt, created_at as "createdAt"
    FROM users WHERE email = ${normalizedEmail}
  `;
  if (rows.length === 0) return "invalid";

  const user = rows[0];
  const hash = await sha256Hex(user.password_salt + password);
  if (hash !== user.password_hash) return "invalid";

  return { id: user.id, email: user.email, tier: user.tier, createdAt: user.createdAt };
}

export async function getUserById(userId: number): Promise<UserRecord | null> {
  const rows = await sql`
    SELECT id, email, tier, created_at as "createdAt" FROM users WHERE id = ${userId}
  `;
  return rows.length > 0 ? (rows[0] as UserRecord) : null;
}

export function getTrialStatus(user: UserRecord): {
  trialEndsAt: string;
  hasAccess: boolean;
} {
  const trialEndsAt = new Date(
    new Date(user.createdAt).getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000
  );
  const hasAccess = user.tier !== "trial" || Date.now() < trialEndsAt.getTime();
  return { trialEndsAt: trialEndsAt.toISOString(), hasAccess };
}
