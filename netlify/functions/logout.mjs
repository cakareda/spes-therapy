// POST /api/logout  →  oturum çerezini siler
import { clearSessionCookie, json } from "../lib/auth.mjs";

export default async (req) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  return json({ ok: true }, 200, { "Set-Cookie": clearSessionCookie() });
};

export const config = { path: "/api/logout" };
