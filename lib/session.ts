import { createHmac, timingSafeEqual } from "crypto";

export const SESSION_COOKIE = "fc_session";

export interface SessionPayload {
  userId: number;
  email: string;
}

function sign(data: string): string {
  return createHmac("sha256", process.env.SESSION_SECRET!)
    .update(data)
    .digest("base64url");
}

export function signSession(payload: SessionPayload): string {
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${data}.${sign(data)}`;
}

export function verifySession(token: string | undefined | null): SessionPayload | null {
  if (!token) return null;
  const [data, sig] = token.split(".");
  if (!data || !sig) return null;

  const expected = sign(data);
  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expected);
  if (sigBuf.length !== expectedBuf.length || !timingSafeEqual(sigBuf, expectedBuf)) {
    return null;
  }

  try {
    return JSON.parse(Buffer.from(data, "base64url").toString());
  } catch {
    return null;
  }
}
