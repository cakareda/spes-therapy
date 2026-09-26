// POST /api/login  { username, password }  →  oturum çerezi
import { checkCredentials, createSessionCookie, isConfigured, isSameOrigin, json } from "../lib/auth.mjs";

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

export default async (req) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  if (!isSameOrigin(req)) return json({ error: "Forbidden" }, 403);
  if (!isConfigured()) return json({ error: "Admin panel is not configured yet." }, 500);

  let body;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid request" }, 400);
  }

  const { username = "", password = "" } = body || {};
  if (!checkCredentials(String(username), String(password))) {
    await wait(1000); // şifre denemelerini yavaşlat
    return json({ error: "Kullanıcı adı veya şifre hatalı." }, 401);
  }

  return json({ ok: true }, 200, { "Set-Cookie": createSessionCookie() });
};

export const config = { path: "/api/login" };
