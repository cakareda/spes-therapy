const CAL_LINK = "spestherapy/30min";

let pending = [...document.querySelectorAll("[data-anim]")];
let ticking = false;

function revealOnScroll() {
  const trigger = window.innerHeight * 0.85;
  pending = pending.filter((el) => {
    const rect = el.getBoundingClientRect(); // clip-path'ten etkilenmez
    if (rect.top < trigger && rect.bottom > 0) {
      const delay = Number(el.dataset.delay || 0); // data-delay="150" → 150 ms gecikme
      setTimeout(() => el.classList.add("is-visible"), delay);
      return false; // listeden çıkar, bir daha animasyon yapmasın
    }
    return true;
  });
  ticking = false;
}

window.addEventListener(
  "scroll",
  () => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(revealOnScroll);
    }
  },
  { passive: true }
);
window.addEventListener("resize", revealOnScroll);
revealOnScroll();


const header = document.querySelector(".site-header");
const navLinks = document.querySelectorAll(".nav-link");

const sections = [...navLinks]
  .map((link) => link.getAttribute("href"))
  .filter((href) => href.startsWith("#"))
  .map((href) => document.querySelector(href));

function updateNav() {
  header.classList.toggle("scrolled", window.scrollY > 10);
  if (!sections.length) return;

  const line = window.scrollY + window.innerHeight / 3;
  let current = sections[0];
  sections.forEach((section) => {
    if (section && section.offsetTop <= line) current = section;
  });
  if (window.innerHeight + window.scrollY >= document.body.scrollHeight - 2) {
    current = sections[sections.length - 1];
  }

  navLinks.forEach((link) => {
    link.classList.toggle("active", link.getAttribute("href") === "#" + current.id);
  });
}

window.addEventListener("scroll", updateNav, { passive: true });
updateNav();



const toggle = document.querySelector(".menu-toggle");
const nav = document.querySelector(".main-nav");

toggle.addEventListener("click", () => {
  const open = nav.classList.toggle("open");
  toggle.setAttribute("aria-expanded", open);
});

// Bir linke tıklayınca menü kapansın
navLinks.forEach((link) =>
  link.addEventListener("click", () => {
    nav.classList.remove("open");
    toggle.setAttribute("aria-expanded", "false");
  })
);

(function (C, A, L) {
  let p = function (a, ar) { a.q.push(ar); };
  let d = C.document;
  C.Cal = C.Cal || function () {
    let cal = C.Cal; let ar = arguments;
    if (!cal.loaded) {
      cal.ns = {}; cal.q = cal.q || [];
      d.head.appendChild(d.createElement("script")).src = A;
      cal.loaded = true;
    }
    if (ar[0] === L) {
      const api = function () { p(api, arguments); };
      const namespace = ar[1];
      api.q = api.q || [];
      if (typeof namespace === "string") {
        cal.ns[namespace] = cal.ns[namespace] || api;
        p(cal.ns[namespace], ar);
        p(cal, ["initNamespace", namespace]);
      } else p(cal, ar);
      return;
    }
    p(cal, ar);
  };
})(window, "https://app.cal.com/embed/embed.js", "init");

const bookButtons = document.querySelectorAll("[data-cal-link]");

if (bookButtons.length) {
  Cal("init", "booking", { origin: "https://cal.com" });
  Cal.ns.booking("ui", {
    theme: "light",
    cssVarsPerTheme: { light: { "cal-brand": "#2e4ba3" } },
    layout: "month_view",
  });
}

bookButtons.forEach((btn) => {
  btn.dataset.calLink = CAL_LINK;
  btn.dataset.calNamespace = "booking";
  btn.dataset.calConfig = JSON.stringify({ layout: "month_view" });
  btn.href = "https://cal.com/" + CAL_LINK;
  btn.addEventListener("click", (e) => {
    if (window.Cal && Cal.version) e.preventDefault();
  });
});

const form = document.querySelector(".contact-form");

form?.querySelector("button").addEventListener("click", () => form.classList.add("submitted"));

form?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const statusEl = form.querySelector(".form-status");

  const empty = [...form.querySelectorAll("[required]")].find((f) => !f.value.trim());
  if (empty) {
    empty.value = "";
    empty.reportValidity(); 
    return;
  }
  const button = form.querySelector("button");
  button.disabled = true;
  statusEl.textContent = "Sending…";

  try {
    const res = await fetch(form.action, {
      method: "POST",
      headers: { Accept: "application/json" },
      body: new FormData(form),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message);
    statusEl.textContent = "Thank you! Your message has been sent.";
    form.reset();
    form.classList.remove("submitted");
  } catch (err) {
    statusEl.textContent = "Something went wrong. Please email spestherapy@gmail.com directly.";
  } finally {
    button.disabled = false;
  }
});

const yearEl = document.getElementById("year");
if (yearEl) yearEl.textContent = new Date().getFullYear();
