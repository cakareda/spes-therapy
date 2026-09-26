/* =========================================================
   ADMIN PANELİ
   Giriş kontrolü ve fotoğraf yükleme sunucu tarafında
   (netlify/functions/*) yapılır; bu dosya sadece arayüz.
   ========================================================= */

// Değiştirilebilen fotoğraflar. "key" değerleri netlify/functions/upload.mjs ile aynı olmalı.
const PHOTOS = [
  { key: "hero-banner",        src: "/images/hero-banner.jpg",        title: "Ana sayfa geniş görsel",  note: "Kayan şeridin altındaki geniş görsel. Yatay fotoğraf seç.", maxSize: 2400, type: "image/jpeg" },
  { key: "ece",                src: "/images/ece.jpg",                title: "Hakkımda fotoğrafı",      note: "About Me bölümündeki fotoğraf.",                                maxSize: 1400, type: "image/jpeg" },
  { key: "service-individual", src: "/images/service-individual.jpg", title: "Bireysel terapi görseli", note: "Services > Individual Therapy. Dikey fotoğraf daha iyi durur.", maxSize: 1000, type: "image/jpeg" },
  { key: "service-corporate",  src: "/images/service-corporate.jpg",  title: "Kurumsal destek görseli", note: "Services > Corporate Support.",                                maxSize: 1000, type: "image/jpeg" },
  { key: "contact-banner",     src: "/images/contact-banner.jpg",     title: "İletişim geniş görsel",   note: "İletişim formunun altındaki geniş görsel. Yatay fotoğraf seç.", maxSize: 2400, type: "image/jpeg" },
  { key: "logo",               src: "/images/logo.png",               title: "Logo",                    note: "Arka planı şeffaf PNG olmalı.",                                  maxSize: 800,  type: "image/png"  },
];

const loginView = document.getElementById("login-view");
const panelView = document.getElementById("panel-view");

function showLogin() {
  panelView.hidden = true;
  loginView.hidden = false;
  loginView.querySelector("input").focus();
}

function showPanel() {
  loginView.hidden = true;
  panelView.hidden = false;
}

async function api(path, options = {}) {
  const res = await fetch(path, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    credentials: "same-origin",
  });
  let data = {};
  try { data = await res.json(); } catch {}
  return { ok: res.ok, status: res.status, data };
}

/* ---------- Giriş / çıkış ---------- */
const loginForm = document.getElementById("login-form");
const loginStatus = document.getElementById("login-status");

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const button = loginForm.querySelector("button");
  button.disabled = true;
  loginStatus.className = "status";
  loginStatus.textContent = "Giriş yapılıyor…";

  const { ok, data } = await api("/api/login", {
    method: "POST",
    body: JSON.stringify({
      username: loginForm.username.value.trim(),
      password: loginForm.password.value,
    }),
  });

  button.disabled = false;
  if (ok) {
    loginForm.reset();
    loginStatus.textContent = "";
    showPanel();
  } else {
    loginStatus.className = "status err";
    loginStatus.textContent = data.error || "Giriş yapılamadı.";
  }
});

document.getElementById("logout").addEventListener("click", async () => {
  await api("/api/logout", { method: "POST" });
  showLogin();
});

/* ---------- Fotoğrafı küçült ve dönüştür ---------- */
// Telefon fotoğrafları 5-10 MB olabiliyor; tarayıcıda küçültüp sıkıştırıyoruz.
function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("unsupported")); };
    img.src = url;
  });
}

async function prepareImage(file, { maxSize, type }) {
  const img = await loadImage(file);
  const scale = Math.min(1, maxSize / Math.max(img.naturalWidth, img.naturalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.naturalWidth * scale);
  canvas.height = Math.round(img.naturalHeight * scale);
  const ctx = canvas.getContext("2d");
  if (type === "image/jpeg") {
    ctx.fillStyle = "#ffffff"; // şeffaf alanlar JPEG'de siyah olmasın
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  // Sınırı (3.5 MB) aşarsa kaliteyi düşürerek tekrar dene
  for (const quality of [0.85, 0.75, 0.65, 0.5]) {
    const dataUrl = canvas.toDataURL(type, quality);
    if (dataUrl.length * 0.75 < 3.5 * 1024 * 1024) return dataUrl;
  }
  throw new Error("too-large");
}

/* ---------- Fotoğraf kartları ---------- */
function buildCard(photo) {
  const card = document.getElementById("photo-card").content.firstElementChild.cloneNode(true);
  const img = card.querySelector("img");
  const input = card.querySelector("input[type=file]");
  const saveBtn = card.querySelector(".save");
  const cancelBtn = card.querySelector(".cancel");
  const status = card.querySelector(".status");
  let pending = null; // kaydedilmeyi bekleyen yeni fotoğraf (data URL)

  const currentSrc = () => `${photo.src}?v=${Date.now()}`;
  card.querySelector("h2").textContent = photo.title;
  card.querySelector(".card-note").textContent = photo.note;
  img.src = currentSrc();
  img.alt = photo.title;

  function setStatus(text, kind = "") {
    status.className = `status ${kind}`;
    status.textContent = text;
  }

  function reset() {
    pending = null;
    input.value = "";
    saveBtn.disabled = true;
    cancelBtn.hidden = true;
    card.classList.remove("changed");
  }

  input.addEventListener("change", async () => {
    const file = input.files[0];
    if (!file) return;
    setStatus("Hazırlanıyor…");
    try {
      pending = await prepareImage(file, photo);
      img.src = pending;
      card.classList.add("changed");
      saveBtn.disabled = false;
      cancelBtn.hidden = false;
      setStatus("Önizleme. Beğendiysen \"Kaydet\"e bas.");
    } catch (err) {
      reset();
      setStatus(
        err.message === "too-large"
          ? "Fotoğraf çok büyük, daha küçük bir dosya dene."
          : "Bu dosya açılamadı. JPG veya PNG formatında bir fotoğraf seç.",
        "err"
      );
    }
  });

  cancelBtn.addEventListener("click", () => {
    reset();
    img.src = currentSrc();
    setStatus("");
  });

  saveBtn.addEventListener("click", async () => {
    if (!pending) return;
    saveBtn.disabled = true;
    cancelBtn.hidden = true;
    setStatus("Kaydediliyor…");

    const { ok, status: code, data } = await api("/api/upload", {
      method: "POST",
      body: JSON.stringify({ slot: photo.key, image: pending }),
    });

    if (ok) {
      reset();
      setStatus("Kaydedildi ✓ Sitede 1–2 dakika içinde görünecek.", "ok");
    } else if (code === 401) {
      setStatus(data.error || "Oturum süresi doldu.", "err");
      showLogin();
    } else {
      saveBtn.disabled = false;
      cancelBtn.hidden = false;
      setStatus(data.error || "Kaydedilemedi, tekrar dene.", "err");
    }
  });

  return card;
}

const grid = document.getElementById("photo-grid");
PHOTOS.forEach((photo) => grid.appendChild(buildCard(photo)));

/* ---------- Açılışta oturum var mı? ---------- */
api("/api/session").then(({ data }) => (data.loggedIn ? showPanel() : showLogin()));
