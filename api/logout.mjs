// POST /api/logout  →  oturum çerezini siler
import { clearSessionCookie, json } from "../lib/auth.mjs";

export async function POST(req) {
  return json({ ok: true }, 200, { "Set-Cookie": clearSessionCookie() });
}

