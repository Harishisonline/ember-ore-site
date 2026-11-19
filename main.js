// main.js — Lenis smooth scroll + the roast hero + small page behaviours.
// Reduced-motion users and low-power phones get the still poster and the finished roast readout.
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";

gsap.registerPlugin(ScrollTrigger);
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const small = matchMedia("(max-width: 767px)").matches;
const lowPower = (navigator.hardwareConcurrency || 8) <= 2 || navigator.connection?.saveData || !hasWebGL();

document.querySelectorAll("[data-year]").forEach((el) => (el.textContent = new Date().getFullYear()));

// ---------- smooth scroll (skip for reduced motion)
let lenis;
if (!reduce) {
  lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
  document.querySelectorAll('a[href^="#"]').forEach((a) =>
    a.addEventListener("click", (e) => {
      const id = a.getAttribute("href");
      const el = id.length > 1 && document.querySelector(id);
      if (!el) return;
      e.preventDefault();
      lenis.scrollTo(el, { offset: id === "#top" ? 0 : -64 });
    })
  );
}

// ---------- roast readout (stage label, temperature, curve)
const STAGES = [
  [0.0, "Green, as it lands from Guji", 24],
  [0.25, "Drying, the grassy smell goes", 150],
  [0.5, "Browning, sugars start to caramelise", 175],
  [0.72, "First crack, you can hear it", 196],
  [0.95, "Dropped at a light roast", 205],
];
const stageEl = document.querySelector("[data-roast-stage]");
const tempEl = document.querySelector("[data-roast-temp]");
const path = document.querySelector(".roast__path");
const dot = document.querySelector(".roast__dot");
const total = path?.getTotalLength?.() || 1;
let lastStage = -1;
function setRoast(p) {
  let i = 0;
  while (i < STAGES.length - 1 && p >= STAGES[i + 1][0] - 0.0001) i++;
  const [p0, , t0] = STAGES[i];
  const [p1, , t1] = STAGES[Math.min(i + 1, STAGES.length - 1)];
  const k = p1 > p0 ? (p - p0) / (p1 - p0) : 1;
  tempEl.textContent = Math.round(t0 + (t1 - t0) * k);
  if (i !== lastStage) { stageEl.textContent = STAGES[i][1]; lastStage = i; }
  if (path) {
    path.style.strokeDashoffset = String(1 - p);
    const pt = path.getPointAtLength(total * p);
    dot.setAttribute("cx", pt.x); dot.setAttribute("cy", pt.y);
  }
}

// ---------- hero
const hero = document.querySelector(".hero");
if (reduce || lowPower) {
  setRoast(1);
  document.querySelector(".hero__hint")?.remove();
} else {
  setRoast(0);
  import("./scene.js")
    .then((m) => m.initScene(hero, {
      small,
      onProgress: setRoast,
      endTimeline: (tl) => tl.to(".hero__hint", { opacity: 0, duration: 0.15 }, 0.05),
    }))
    .catch((err) => { console.warn("3D hero unavailable, showing poster", err); setRoast(1); });
}

// ---------- nav turns light over the light sections; sticky subscribe bar on phones
const nav = document.querySelector(".nav");
const sticky = document.querySelector(".sticky-cta");
const darkSections = [...document.querySelectorAll(".hero, .month, .closing")];
const subscribe = document.getElementById("subscribe");
function onScroll() {
  const y = 32;
  const overDark = darkSections.some((s) => { const r = s.getBoundingClientRect(); return r.top <= y && r.bottom > y; });
  const inHero = hero.getBoundingClientRect().bottom > y;
  nav.classList.toggle("is-light", !overDark);
  nav.classList.toggle("is-solid", overDark && !inHero);
  const heroGone = hero.getBoundingClientRect().bottom < innerHeight * 0.4;
  const r = subscribe.getBoundingClientRect();
  const atForm = r.top < innerHeight && r.bottom > 0;
  sticky.classList.toggle("is-on", heroGone && !atForm);
}
addEventListener("scroll", onScroll, { passive: true });
onScroll();

// ---------- subscribe form (front-end only until checkout is connected)
const form = document.querySelector("[data-sub-form]");
const msg = document.querySelector("[data-sub-msg]");
form.addEventListener("submit", (e) => {
  e.preventDefault();
  const email = form.email, zip = form.zip;
  if (!email.checkValidity()) { msg.textContent = "Add an email so we can send your order confirmation."; email.focus(); return; }
  if (!zip.checkValidity()) { msg.textContent = "Add a 5-digit ZIP so we can check shipping."; zip.focus(); return; }
  const grind = form.querySelector('[name="grind"]:checked').nextElementSibling.textContent.toLowerCase();
  const cadence = form.querySelector('[name="cadence"]:checked').nextElementSibling.textContent.toLowerCase();
  msg.textContent = `Got it: ${grind}, ${cadence}. Checkout isn’t connected in this preview yet, so nothing was charged.`;
});

const buy = document.querySelector("[data-buy-one]");
buy?.addEventListener("click", () => { document.querySelector("[data-buy-note]").hidden = false; });

function hasWebGL() {
  try { const c = document.createElement("canvas"); return !!(c.getContext("webgl2") || c.getContext("webgl")); } catch { return false; }
}
