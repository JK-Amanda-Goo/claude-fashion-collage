import { NextRequest, NextResponse } from "next/server";
import { verifyUser } from "@/lib/serverAuth";
import { signSession, SESSION_COOKIE } from "@/lib/session";

export async function POST(req: NextRequest) {
  let body: { email?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { email, password } = body;
  if (!email || !password) {
    return NextResponse.json(
      { error: "email and password are required" },
      { status: 400 }
    );
  }

  const user = await verifyUser(email.trim(), password);
  if (user === "invalid") {
    return NextResponse.json({ error: "invalid" }, { status: 401 });
  }

  const res = NextResponse.json({ email: user.email, tier: user.tier });
  res.cookies.set(SESSION_COOKIE, signSession({ userId: user.id, email: user.email }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
