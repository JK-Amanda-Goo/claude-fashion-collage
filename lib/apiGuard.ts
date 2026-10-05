import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { verifySession, SESSION_COOKIE } from "@/lib/session";
import { getUserById, getTrialStatus } from "@/lib/serverAuth";

export const DAILY_LIMIT_PER_USER = 30;
export const DAILY_LIMIT_GLOBAL = 1000;

export async function requireAiAccess(
  req: NextRequest,
  endpoint: string
): Promise<{ userId: number } | NextResponse> {
  const payload = verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!payload) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const user = await getUserById(payload.userId);
  if (!user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  if (!getTrialStatus(user).hasAccess) {
    return NextResponse.json({ error: "no_access" }, { status: 403 });
  }

  const [counts] = await sql`
    SELECT
      count(*) FILTER (WHERE user_id = ${user.id})::int AS mine,
      count(*)::int AS total
    FROM ai_usage
    WHERE created_at > now() - interval '24 hours'
  `;
  if (counts.mine >= DAILY_LIMIT_PER_USER || counts.total >= DAILY_LIMIT_GLOBAL) {
    return NextResponse.json({ error: "daily_limit" }, { status: 429 });
  }

  await sql`INSERT INTO ai_usage (user_id, endpoint) VALUES (${user.id}, ${endpoint})`;
  return { userId: user.id };
}
