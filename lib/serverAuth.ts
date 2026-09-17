import { randomBytes } from "crypto";
import { sql } from "@/lib/db";

export interface UserRecord {
  id: number;
  email: string;
  tier: string;
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
    RETURNING id, email, tier
  `;
  return rows[0] as UserRecord;
}

export async function verifyUser(
  email: string,
  password: string
): Promise<UserRecord | "invalid"> {
  const normalizedEmail = email.toLowerCase();
  const rows = await sql`
    SELECT id, email, tier, password_hash, password_salt
    FROM users WHERE email = ${normalizedEmail}
  `;
  if (rows.length === 0) return "invalid";

  const user = rows[0];
  const hash = await sha256Hex(user.password_salt + password);
  if (hash !== user.password_hash) return "invalid";

  return { id: user.id, email: user.email, tier: user.tier };
}

export async function getUserById(userId: number): Promise<UserRecord | null> {
  const rows = await sql`SELECT id, email, tier FROM users WHERE id = ${userId}`;
  return rows.length > 0 ? (rows[0] as UserRecord) : null;
}
