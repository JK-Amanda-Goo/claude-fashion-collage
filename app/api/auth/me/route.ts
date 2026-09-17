import { NextRequest, NextResponse } from "next/server";
import { verifySession, SESSION_COOKIE } from "@/lib/session";
import { getUserById } from "@/lib/serverAuth";

export async function GET(req: NextRequest) {
  const payload = verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!payload) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  const user = await getUserById(payload.userId);
  if (!user) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  return NextResponse.json({ authenticated: true, email: user.email, tier: user.tier });
}
