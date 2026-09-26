// POST /api/upload  { slot, image: "data:image/jpeg;base64,..." }
//
// Seçilen fotoğrafı GitHub reposundaki aynı dosyanın üzerine kaydeder.
// GitHub'a yeni commit gelince Netlify siteyi otomatik olarak yeniden yayınlar (~1-2 dk).
import { isLoggedIn, isSameOrigin, json } from "../lib/auth.mjs";

// Sadece bu dosyalar değiştirilebilir (başka bir yola yazmak mümkün değil)
const SLOTS = {
  "hero-banner":        { path: "images/hero-banner.jpg",        type: "image/jpeg" },
  "ece":                { path: "images/ece.jpg",                type: "image/jpeg" },
  "service-individual": { path: "images/service-individual.jpg", type: "image/jpeg" },
  "service-corporate":  { path: "images/service-corporate.jpg",  type: "image/jpeg" },
  "contact-banner":     { path: "images/contact-banner.jpg",     type: "image/jpeg" },
  "logo":               { path: "images/logo.png",               type: "image/png"  },
};

const MAX_BYTES = 4 * 1024 * 1024; // Netlify fonksiyon istek sınırı ~6 MB (base64 ile)

const MAGIC = {
  "image/jpeg": (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  "image/png":  (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47,
};

export default async (req) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  if (!isSameOrigin(req)) return json({ error: "Forbidden" }, 403);
  if (!isLoggedIn(req)) return json({ error: "Oturum süresi doldu, lütfen tekrar giriş yapın." }, 401);

  let body;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Geçersiz istek." }, 400);
  }

  const slot = SLOTS[body?.slot];
  if (!slot) return json({ error: "Geçersiz fotoğraf alanı." }, 400);

  const match = /^data:(image\/(?:jpeg|png));base64,([A-Za-z0-9+/=]+)$/.exec(body.image || "");
  if (!match || match[1] !== slot.type) return json({ error: "Geçersiz dosya türü." }, 400);

  const bytes = Buffer.from(match[2], "base64");
  if (bytes.length === 0 || bytes.length > MAX_BYTES) {
    return json({ error: "Dosya çok büyük (en fazla 4 MB)." }, 413);
  }
  if (!MAGIC[slot.type](bytes)) return json({ error: "Dosya bozuk veya desteklenmiyor." }, 400);

  const repo = process.env.GITHUB_REPO || "cakareda/spes-therapy";
  const branch = process.env.GITHUB_BRANCH || "main";
  const api = `https://api.github.com/repos/${repo}/contents/${slot.path}`;
  const headers = {
    Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "spes-therapy-admin",
  };

  // Dosyanın üzerine yazabilmek için GitHub mevcut sürümün "sha" değerini istiyor
  let sha;
  const current = await fetch(`${api}?ref=${branch}`, { headers });
  if (current.ok) {
    sha = (await current.json()).sha;
  } else if (current.status !== 404) {
    console.error("GitHub GET failed", current.status, await current.text());
    return json({ error: "GitHub'a bağlanılamadı." }, 502);
  }

  const save = await fetch(api, {
    method: "PUT",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({
      message: `Update ${slot.path} via admin panel`,
      content: bytes.toString("base64"),
      branch,
      ...(sha && { sha }),
    }),
  });

  if (!save.ok) {
    console.error("GitHub PUT failed", save.status, await save.text());
    return json({ error: "Fotoğraf kaydedilemedi. Lütfen tekrar deneyin." }, 502);
  }

  return json({ ok: true });
};

export const config = { path: "/api/upload" };
