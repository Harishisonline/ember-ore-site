// scene.js — the roast, in 3D.
// A procedurally built 250 g kraft stand-up pouch (printed label drawn to a canvas texture)
// sits in a drift of coffee beans. Scrolling the pinned hero roasts the beans:
// green → drying → browning → first crack → light roast, while the pouch turns to show its back.
// Drag (mouse or horizontal swipe) turns the pouch. No model files: everything is generated here.
import * as THREE from "three";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

// Roast stages: [progress, label, bean temp °C (approx.), bean colour]
export const STAGES = [
  [0.0, "Green, as it lands from Guji", 24, "#86955f"],
  [0.25, "Drying, the grassy smell goes", 150, "#b9a668"],
  [0.5, "Browning, sugars start to caramelise", 175, "#9c6c40"],
  [0.72, "First crack, you can hear it", 196, "#603a22"],
  [1.0, "Dropped at a light roast", 205, "#5e351b"],
];

const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

export async function initScene(section, { small, onProgress, endTimeline }) {
  const canvas = section.querySelector("#gl");
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(devicePixelRatio, small ? 1.5 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  camera.position.set(0, 0.15, 7.5);

  // ---------- light: warm key, cool rim, warm bounce, and an ember from below that rises with the heat
  const key = new THREE.DirectionalLight(0xffe4c4, 2.6); key.position.set(3.5, 4, 5);
  const rim = new THREE.DirectionalLight(0xc9d6ff, 1.4); rim.position.set(-4, 2.5, -3.5);
  const hemi = new THREE.HemisphereLight(0xfff1df, 0x2a1a10, 0.55);
  const ember = new THREE.PointLight(0xff7a2a, 0, 7, 1.6); ember.position.set(0, -1.9, 1.2);
  scene.add(key, rim, hemi, ember);

  const world = new THREE.Group();
  scene.add(world);

  // ---------- the pouch
  await Promise.race([document.fonts?.load('700 120px "Bricolage Grotesque"'), new Promise((r) => setTimeout(r, 1500))]).catch(() => {});
  const bag = makePouch(small);
  world.add(bag);

  // soft contact shadow
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 1.4), new THREE.MeshBasicMaterial({ map: radialTexture(), transparent: true, depthWrite: false, opacity: 0.75 }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = -1.15;
  world.add(shadow);

  // ---------- beans
  const COUNT = small ? 70 : 130;
  const beanGeo = makeBeanGeometry();
  const beanMat = new THREE.MeshStandardMaterial({ color: STAGES[0][3], roughness: 0.78, metalness: 0, emissive: 0xff5a14, emissiveIntensity: 0 });
  const beans = new THREE.InstancedMesh(beanGeo, beanMat, COUNT);
  const rnd = mulberry32(7);
  const data = [];
  const tint = new THREE.Color();
  for (let i = 0; i < COUNT; i++) {
    const r = 1.15 + rnd() * (small ? 0.55 : 0.9);
    data.push({
      r, a: rnd() * Math.PI * 2, y: (rnd() - 0.5) * (small ? 1.7 : 2.7), sp: 0.6 + rnd() * 0.8,
      rx: rnd() * 6, ry: rnd() * 6, rs: (rnd() - 0.5) * 1.6, s: 0.85 + rnd() * 0.35, ph: rnd() * Math.PI * 2,
    });
    const v = 0.82 + rnd() * 0.3;
    beans.setColorAt(i, tint.setRGB(v, v * (0.97 + rnd() * 0.05), v * 0.95));
  }
  beans.instanceColor.needsUpdate = true;
  world.add(beans);

  // ---------- sparks (chaff and heat) — only visible around first crack
  const SPARKS = small ? 50 : 110;
  const sparkPos = new Float32Array(SPARKS * 3);
  const sparkSeed = [];
  for (let i = 0; i < SPARKS; i++) sparkSeed.push({ x: (rnd() - 0.5) * 3.4, z: (rnd() - 0.5) * 1.8, sp: 0.25 + rnd() * 0.5, o: rnd() * 3 });
  const sparkGeo = new THREE.BufferGeometry();
  sparkGeo.setAttribute("position", new THREE.BufferAttribute(sparkPos, 3));
  const sparkMat = new THREE.PointsMaterial({ color: 0xffa25a, size: small ? 0.05 : 0.04, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
  const sparks = new THREE.Points(sparkGeo, sparkMat);
  world.add(sparks);

  // ---------- layout
  let layout = { x: 0, y: 0, s: 1 };
  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    const visH = 2 * camera.position.z * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const visW = visH * camera.aspect;
    if (camera.aspect >= 1) layout = { x: visW * 0.21, y: -0.05, s: 1 };
    else if (camera.aspect >= 0.7) layout = { x: visW * 0.2, y: -0.2, s: 0.8 };
    else {
      // phone portrait: pouch sits below the copy, above the readout
      const sc = Math.min(0.5, (visW * 0.55) / 1.36);
      layout = { x: visW * 0.04, y: -visH * 0.36, s: sc };
    }
    world.position.set(layout.x, layout.y, 0);
    world.scale.setScalar(layout.s);
  }
  addEventListener("resize", resize);
  resize();

  // ---------- interaction: drag to turn, pointer tilt (desktop)
  let drag = 0, dragTarget = 0, dragging = false, lastX = 0;
  const tilt = { x: 0, y: 0 }, tiltTarget = { x: 0, y: 0 };
  canvas.addEventListener("pointerdown", (e) => { dragging = true; lastX = e.clientX; canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    dragTarget += (e.clientX - lastX) * 0.012;
    lastX = e.clientX;
  });
  const release = () => (dragging = false);
  canvas.addEventListener("pointerup", release);
  canvas.addEventListener("pointercancel", release);
  if (!small) addEventListener("pointermove", (e) => { tiltTarget.x = (e.clientY / innerHeight - 0.5) * 0.12; tiltTarget.y = (e.clientX / innerWidth - 0.5) * 0.25; });

  // ---------- scroll: pin the hero and roast
  const state = { p: 0 };
  const tl = gsap.timeline({
    scrollTrigger: { trigger: section, start: "top top", end: small ? "+=170%" : "+=230%", scrub: 0.6, pin: true, anticipatePin: 1 },
  });
  tl.to(state, { p: 1, ease: "none", duration: 1 }, 0);
  if (endTimeline) endTimeline(tl);

  const bgCol = new THREE.Color(), cA = new THREE.Color(), cB = new THREE.Color();
  function roastColor(p, out) {
    for (let i = 0; i < STAGES.length - 1; i++) {
      const [p0, , , c0] = STAGES[i], [p1, , , c1] = STAGES[i + 1];
      if (p <= p1) return out.copy(cA.set(c0)).lerp(cB.set(c1), smooth(p0, p1, p));
    }
    return out.set(STAGES.at(-1)[3]);
  }

  // pause when scrolled past the pinned hero (IntersectionObserver is unreliable on pinned elements)
  let visible = true;
  const checkVisible = () => (visible = scrollY < tl.scrollTrigger.end + innerHeight * 0.1);
  addEventListener("scroll", checkVisible, { passive: true });

  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), pos = new THREE.Vector3(), scl = new THREE.Vector3(), eul = new THREE.Euler();
  const clock = new THREE.Clock();
  let lastP = -1, time = 0;

  function frame() {
    if (!visible || document.hidden) { clock.getDelta(); return; }
    const dt = Math.min(clock.getDelta(), 0.05);
    time += dt;
    const p = state.p;
    // heat: rises through the roast, peaks at first crack, eases after the drop
    const heat = smooth(0.1, 0.72, p) * (1 - 0.55 * smooth(0.82, 1, p));
    const crack = smooth(0.62, 0.72, p) * (1 - smooth(0.8, 0.95, p));

    if (Math.abs(p - lastP) > 0.0005) { onProgress?.(p); lastP = p; }

    // pouch: three-quarter view → turns a full circle across the roast (back label at the midpoint)
    if (!dragging) dragTarget *= 0.985; // springs slowly back to the choreographed angle
    drag += (dragTarget - drag) * 0.12;
    tilt.x += (tiltTarget.x - tilt.x) * 0.05; tilt.y += (tiltTarget.y - tilt.y) * 0.05;
    bag.rotation.y = -0.5 + p * Math.PI * 2 + drag + tilt.y;
    bag.rotation.x = tilt.x;
    bag.position.y = Math.sin(time * 0.8) * 0.03;
    shadow.material.opacity = 0.75 - (bag.position.y + 0.03) * 2;

    // beans: drift like in a drum; the drum speeds up with heat
    roastColor(p, beanMat.color);
    beanMat.roughness = 0.82 - p * 0.22;
    beanMat.emissiveIntensity = crack * 0.12 + heat * 0.02;
    for (let i = 0; i < COUNT; i++) {
      const b = data[i];
      b.a += dt * (0.06 + heat * 0.55) * b.sp;
      const pop = crack > 0.01 ? 1 + 0.18 * crack * Math.max(0, Math.sin(time * 9 + b.ph * 3)) ** 8 : 1;
      const lift = heat * 0.18 * Math.sin(time * 1.4 + b.ph);
      // keep the label readable: beans passing in front of the pouch are pushed up/down and out of the way
      const cx = Math.cos(b.a), sz = Math.sin(b.a);
      const front = Math.max(0, sz) * Math.max(0, 1 - Math.abs(cx) * b.r / 0.9);
      const yy = b.y + Math.sign(b.y || 1) * front * 0.9;
      pos.set(cx * b.r, yy + Math.sin(time * 0.6 + b.ph) * 0.06 + lift, sz * b.r * 0.75);
      eul.set(b.rx + time * b.rs * (0.4 + heat), b.ry + time * b.rs * 0.5, b.a);
      q.setFromEuler(eul);
      scl.setScalar(b.s * pop * (1 + p * 0.12)); // beans swell a little as they roast — true to life
      m.compose(pos, q, scl);
      beans.setMatrixAt(i, m);
    }
    beans.instanceMatrix.needsUpdate = true;

    // sparks rise with heat
    sparkMat.opacity = heat * 0.55 + crack * 0.35;
    for (let i = 0; i < SPARKS; i++) {
      const s = sparkSeed[i];
      const y = ((time * s.sp + s.o) % 3) - 1.3;
      sparkPos[i * 3] = s.x + Math.sin(time + s.o) * 0.1; sparkPos[i * 3 + 1] = y; sparkPos[i * 3 + 2] = s.z;
    }
    sparkGeo.attributes.position.needsUpdate = true;

    ember.intensity = heat * 4 + crack * 2.5;
    camera.position.z = 7.5 - p * 0.6;
    camera.position.y = 0.15 + p * 0.1;
    camera.lookAt(layout.x * 0.15, layout.y * 0.5, 0);
    renderer.render(scene, camera);
  }
  renderer.setAnimationLoop(frame);
  frame();
  section.classList.add("is-ready");
  return { state, tl };
}

/* ------------------------------------------------------------------ pouch */
function makePouch(small) {
  const W = 1.36, H = 2.25, D = 0.6;
  const geo = new THREE.BoxGeometry(W, H, D, small ? 20 : 32, small ? 30 : 48, small ? 8 : 14);
  const p = geo.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const t = (v.y + H / 2) / H; // 0 bottom → 1 top
    const nx = v.x / (W / 2);
    // depth profile: full in the belly, tapering to a flat heat seal at the top, gusset at the bottom
    let depth = 1 - smooth(0.58, 0.9, t) * 0.96;
    depth *= 0.86 + 0.14 * smooth(0, 0.12, t);
    // pillowing across the width (filled with beans)
    depth *= 1 - 0.55 * Math.abs(nx) ** 2.4;
    v.z *= depth;
    // slight waist and a soft wrinkle field on the faces
    v.x *= 1 - 0.035 * Math.sin(t * Math.PI);
    const wr = 0.012 * Math.sin(nx * 7.5 + t * 4) * Math.sin(t * 11 + nx * 2) * (1 - smooth(0.85, 1, t));
    v.z += Math.sign(v.z) * wr;
    p.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();

  const front = labelTexture("front");
  const back = labelTexture("back");
  const side = labelTexture("side");
  const bump = kraftBump();
  const mk = (map) => new THREE.MeshStandardMaterial({ map, bumpMap: bump, bumpScale: 0.9, roughness: 0.88, metalness: 0 });
  const sideMat = mk(side);
  // Box groups: +x, -x, +y, -y, +z (front), -z (back)
  const mesh = new THREE.Mesh(geo, [sideMat, sideMat, sideMat, sideMat, mk(front), mk(back)]);
  const g = new THREE.Group();
  g.add(mesh);
  return g;
}

function kraftCanvas(w, h, seed) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const x = c.getContext("2d");
  x.fillStyle = "#b4875a";
  x.fillRect(0, 0, w, h);
  const r = mulberry32(seed);
  // fibres
  for (let i = 0; i < w * h * 0.004; i++) {
    const l = 4 + r() * 16, a = r() * Math.PI, px = r() * w, py = r() * h;
    x.strokeStyle = r() > 0.5 ? `rgba(80,48,22,${0.08 + r() * 0.12})` : `rgba(235,200,150,${0.08 + r() * 0.12})`;
    x.lineWidth = 0.6 + r();
    x.beginPath(); x.moveTo(px, py); x.lineTo(px + Math.cos(a) * l, py + Math.sin(a) * l); x.stroke();
  }
  // tonal mottling
  for (let i = 0; i < 40; i++) {
    const g = x.createRadialGradient(r() * w, r() * h, 0, r() * w, r() * h, 80 + r() * 200);
    g.addColorStop(0, `rgba(${r() > 0.5 ? "60,35,15" : "230,190,140"},0.07)`); g.addColorStop(1, "rgba(0,0,0,0)");
    x.fillStyle = g; x.fillRect(0, 0, w, h);
  }
  return { c, x };
}

function sealBand(x, w, h) {
  // heat-sealed crimp at the top + tear notch line
  const top = h * 0.06;
  x.fillStyle = "rgba(70,40,18,0.18)"; x.fillRect(0, 0, w, top);
  x.strokeStyle = "rgba(60,34,14,0.35)"; x.lineWidth = 1.5;
  for (let i = 0; i < w; i += 7) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, top); x.stroke(); }
  x.strokeStyle = "rgba(60,34,14,0.25)"; x.setLineDash([10, 8]);
  x.beginPath(); x.moveTo(0, h * 0.13); x.lineTo(w, h * 0.13); x.stroke(); x.setLineDash([]);
  // gusset fold near the bottom
  x.fillStyle = "rgba(60,34,14,0.1)"; x.fillRect(0, h * 0.95, w, h * 0.05);
}

function flame(x, cx, cy, s, fill) {
  x.save(); x.translate(cx, cy); x.scale(s, s);
  x.fillStyle = fill;
  x.beginPath();
  x.moveTo(0, -1); x.bezierCurveTo(0.35, -0.55, 0.62, -0.3, 0.62, 0.12);
  x.bezierCurveTo(0.62, 0.55, 0.32, 0.85, 0, 0.85); x.bezierCurveTo(-0.32, 0.85, -0.62, 0.55, -0.62, 0.12);
  x.bezierCurveTo(-0.62, -0.3, -0.35, -0.55, 0, -1); x.fill();
  x.strokeStyle = "#b4875a"; x.lineWidth = 0.09; x.lineCap = "round";
  x.beginPath(); x.moveTo(0, -0.25); x.bezierCurveTo(-0.14, 0.1, -0.14, 0.45, 0, 0.75); x.stroke();
  x.restore();
}

function labelTexture(kind) {
  const w = 1024, h = 1434;
  const { c, x } = kraftCanvas(w, h, kind === "front" ? 11 : kind === "back" ? 23 : 37);
  const ink = "#2e1a0e", emberC = "#e0661f";
  const disp = '"Bricolage Grotesque", "Avenir Next", Georgia, serif';
  const text = '"Instrument Sans", "Helvetica Neue", Arial, sans-serif';
  if (kind !== "side") sealBand(x, w, h);
  x.textAlign = "center"; x.fillStyle = ink;
  if (kind === "front") {
    // degassing valve
    x.fillStyle = "rgba(40,24,12,0.35)"; x.beginPath(); x.arc(w / 2, h * 0.22, 34, 0, 7); x.fill();
    x.fillStyle = "rgba(230,200,160,0.5)"; x.beginPath(); x.arc(w / 2, h * 0.22, 22, 0, 7); x.fill();
    flame(x, w / 2, h * 0.36, 70, emberC);
    x.fillStyle = ink;
    x.font = `700 132px ${disp}`; x.fillText("Ember", w / 2, h * 0.52);
    x.font = `700 132px ${disp}`; x.fillText("& Ore", w / 2, h * 0.61);
    x.fillRect(w * 0.2, h * 0.655, w * 0.6, 4);
    x.font = `700 74px ${disp}`; x.fillText("Ethiopia Guji", w / 2, h * 0.73);
    x.font = `500 40px ${text}`; x.fillText("Single origin, light roast", w / 2, h * 0.775);
    // stamp
    x.strokeStyle = emberC; x.lineWidth = 6; x.beginPath(); x.arc(w * 0.76, h * 0.87, 82, 0, 7); x.stroke();
    x.fillStyle = emberC; x.font = `700 40px ${disp}`; x.fillText("250 g", w * 0.76, h * 0.877);
    x.fillStyle = ink; x.textAlign = "left"; x.font = `500 34px ${text}`;
    x.fillText("Roasted in", w * 0.14, h * 0.86); x.fillText("Portland, Oregon", w * 0.14, h * 0.888);
  } else if (kind === "back") {
    x.font = `700 70px ${disp}`; x.fillText("Roasted on", w / 2, h * 0.27);
    x.strokeStyle = ink; x.lineWidth = 3; x.beginPath(); x.moveTo(w * 0.2, h * 0.345); x.lineTo(w * 0.8, h * 0.345); x.stroke();
    // hand-stamped date in ember ink, slightly rotated
    x.save(); x.translate(w / 2, h * 0.318); x.rotate(-0.05); x.fillStyle = "rgba(224,102,31,0.85)"; x.font = `700 64px ${disp}`; x.fillText("stamped by hand", 0, 0); x.restore();
    x.fillStyle = ink; x.font = `600 44px ${text}`; x.fillText("Brew it", w / 2, h * 0.46);
    x.font = `400 38px ${text}`;
    ["15 g coffee", "250 g water at 95 °C", "Bloom 40 s, then two pours", "About 3 minutes"].forEach((l, i) => x.fillText(l, w / 2, h * 0.51 + i * 52));
    flame(x, w / 2, h * 0.78, 40, ink);
    x.font = `500 34px ${text}`; x.fillText("Ember & Ore, Portland, Oregon", w / 2, h * 0.86);
  } else {
    x.save(); x.translate(w / 2, h / 2); x.rotate(-Math.PI / 2); x.fillStyle = "rgba(46,26,14,0.75)"; x.font = `700 90px ${disp}`; x.fillText("Ember & Ore", 0, 30); x.restore();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

function kraftBump() {
  const { c } = kraftCanvas(512, 716, 99);
  const t = new THREE.CanvasTexture(c);
  return t;
}

function radialTexture() {
  const c = document.createElement("canvas"); c.width = 256; c.height = 128;
  const x = c.getContext("2d");
  const g = x.createRadialGradient(128, 64, 4, 128, 64, 120);
  g.addColorStop(0, "rgba(8,4,2,0.75)"); g.addColorStop(0.5, "rgba(8,4,2,0.3)"); g.addColorStop(1, "rgba(8,4,2,0)");
  x.save(); x.scale(1, 0.5); x.translate(0, 64); x.fillStyle = g; x.fillRect(0, -64, 256, 256); x.restore();
  return new THREE.CanvasTexture(c);
}

/* ------------------------------------------------------------------ bean */
function makeBeanGeometry() {
  const g = new THREE.SphereGeometry(1, 22, 16);
  const p = g.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    if (v.z > 0) {
      v.z *= 0.45; // flat side
      const d = v.x - 0.1 * Math.sin(v.y * 3.2); // the S-shaped centre cut
      v.z -= 0.32 * Math.exp(-(d * d) / 0.006) * v.z * 2.2;
    }
    p.setXYZ(i, v.x * 0.075, v.y * 0.1, v.z * 0.06);
  }
  g.computeVertexNormals();
  return g;
}

function mulberry32(a) {
  return function () { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
