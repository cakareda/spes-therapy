// Admin paneli için ortak giriş / oturum yardımcıları.
//
// Kullanıcı adı, şifre ve GitHub token'ı KODDA DEĞİL, Netlify'ın
// "Environment variables" ayarında durur (repo herkese açık):
//   ADMIN_USERNAME, ADMIN_PASSWORD, GITHUB_TOKEN
import crypto from "node:crypto";

const COOKIE_NAME = "spes_admin";
const SESSION_HOURS = 8;

export function isConfigured() {
  return ["ADMIN_USERNAME", "ADMIN_PASSWORD", "GITHUB_TOKEN"].every((k) => process.env[k]);
}

const sha256 = (value) => crypto.createHash("sha256").update(String(value)).digest();

// Karşılaştırma süresi eşleşen karakter sayısına göre değişmesin (timing attack'e karşı)
function safeEqual(a, b) {
  return crypto.timingSafeEqual(sha256(a), sha256(b));
}

export function checkCredentials(username, password) {
  const userOk = safeEqual(username, process.env.ADMIN_USERNAME);
  const passOk = safeEqual(password, process.env.ADMIN_PASSWORD);
  return userOk && passOk;
}

// Oturum imza anahtarı şifreden türetilir: şifre değişince tüm açık oturumlar kapanır.
function signingKey() {
  return sha256(`spes-admin|${process.env.ADMIN_PASSWORD}|${process.env.GITHUB_TOKEN}`);
}

function sign(payload) {
  return crypto.createHmac("sha256", signingKey()).update(payload).digest("base64url");
}

export function createSessionCookie() {
  const payload = Buffer.from(
    JSON.stringify({ exp: Date.now() + SESSION_HOURS * 3600 * 1000 })
  ).toString("base64url");
  const token = `${payload}.${sign(payload)}`;
  return `${COOKIE_NAME}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${SESSION_HOURS * 3600}`;
}

export function clearSessionCookie() {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
}

export function isLoggedIn(req) {
  if (!isConfigured()) return false;
  const cookie = req.headers.get("cookie") || "";
  const match = cookie.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]+)`));
  if (!match) return false;

  const [payload, signature] = match[1].split(".");
  if (!payload || !signature) return false;

  const expected = sign(payload);
  if (signature.length !== expected.length) return false;
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return false;

  try {
    const { exp } = JSON.parse(Buffer.from(payload, "base64url").toString());
    return typeof exp === "number" && exp > Date.now();
  } catch {
    return false;
  }
}

// Başka bir siteden gelen istekleri reddet (CSRF'e karşı ek önlem)
export function isSameOrigin(req) {
  const origin = req.headers.get("origin");
  if (!origin) return true;
  return new URL(origin).host === new URL(req.url).host;
}

export function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...headers },
  });
}
