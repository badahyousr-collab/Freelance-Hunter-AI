"use client";

import { useEffect, useRef, type PointerEvent } from "react";

type Atom = { x: number; y: number; z: number; r: number; kind?: "core" | "dark" };
type ProjectedAtom = Atom & { sx: number; sy: number; depth: number; scale: number };

const sourceAtoms: Omit<Atom, "z">[] = [
  { x: 260, y: 100, r: 10 }, { x: 190, y: 158, r: 13 }, { x: 323, y: 180, r: 18, kind: "core" },
  { x: 126, y: 245, r: 9, kind: "dark" }, { x: 230, y: 265, r: 15 }, { x: 385, y: 280, r: 10 },
  { x: 165, y: 360, r: 18, kind: "core" }, { x: 285, y: 365, r: 10, kind: "dark" }, { x: 365, y: 410, r: 15 },
  { x: 105, y: 470, r: 11 }, { x: 230, y: 490, r: 9 }, { x: 315, y: 535, r: 20, kind: "core" },
  { x: 180, y: 600, r: 13, kind: "dark" }, { x: 400, y: 620, r: 10 }, { x: 265, y: 690, r: 12 },
  { x: 425, y: 510, r: 8 }, { x: 95, y: 570, r: 7 }, { x: 350, y: 105, r: 7 },
];
const atoms: Atom[] = sourceAtoms.map((atom, i) => ({
  ...atom,
  z: Math.sin(i * 1.73) * 145 + Math.cos(i * 0.61) * 40,
}));
const bonds: [number, number][] = [
  [0,1],[0,2],[1,2],[1,3],[1,4],[2,4],[2,5],[3,4],[3,6],[4,5],[4,6],[4,7],
  [5,7],[5,8],[6,7],[6,9],[6,10],[7,8],[7,10],[8,11],[8,15],[9,10],[9,12],
  [9,16],[10,11],[10,12],[11,12],[11,13],[11,14],[12,14],[13,15],[14,15],[12,16],[2,17]
];
const atomSpriteCache = new Map<string, HTMLCanvasElement>();

function atomSprite(atom: Atom): HTMLCanvasElement | null {
  const key = `${atom.r}:${atom.kind ?? "light"}`;
  const cached = atomSpriteCache.get(key);
  if (cached) return cached;
  if (typeof document === "undefined") return null;
  const padding = Math.ceil(atom.r * 2.1 + 3);
  const sprite = document.createElement("canvas");
  sprite.width = padding * 2;
  sprite.height = padding * 2;
  const context = sprite.getContext("2d");
  if (!context) return null;
  context.translate(padding, padding);
  const radius = atom.r;
  const halo = context.createRadialGradient(0, 0, 0, 0, 0, radius * 2.1);
  halo.addColorStop(0, "rgba(216, 229, 212, .20)");
  halo.addColorStop(1, "rgba(201, 209, 201, 0)");
  context.beginPath(); context.arc(0, 0, radius * 2.1, 0, Math.PI * 2); context.fillStyle = halo; context.fill();
  context.beginPath(); context.arc(0, 0, radius + 1.5, 0, Math.PI * 2); context.fillStyle = "rgba(8, 10, 8, .8)"; context.fill();
  const gradient = context.createRadialGradient(-radius * .3, -radius * .35, Math.max(1, radius * .08), 0, 0, radius);
  if (atom.kind === "core") {
    gradient.addColorStop(0, "#ffffff"); gradient.addColorStop(.35, "#dce5d8"); gradient.addColorStop(1, "#697568");
  } else {
    gradient.addColorStop(0, atom.kind === "dark" ? "#c5cdc2" : "#f1f4ec");
    gradient.addColorStop(.3, atom.kind === "dark" ? "#7c867a" : "#aeb8aa");
    gradient.addColorStop(.68, "#596258"); gradient.addColorStop(1, "#151916");
  }
  context.beginPath(); context.arc(0, 0, radius, 0, Math.PI * 2); context.fillStyle = gradient; context.fill();
  context.lineWidth = 1.1; context.strokeStyle = atom.kind === "core" ? "rgba(255,255,255,.8)" : "rgba(203,210,199,.72)"; context.stroke();
  context.beginPath(); context.ellipse(-radius * .27, -radius * .34, Math.max(1.5, radius * .35), Math.max(1, radius * .2), -.35, 0, Math.PI * 2);
  context.fillStyle = "rgba(255,255,255,.46)"; context.fill();
  atomSpriteCache.set(key, sprite);
  return sprite;
}

function project(atom: Atom, sinX: number, cosX: number, sinY: number, cosY: number): ProjectedAtom {
  const x = atom.x - 260;
  const y = atom.y - 390;
  const x1 = x * cosY + atom.z * sinY;
  const z1 = -x * sinY + atom.z * cosY;
  const y2 = y * cosX - z1 * sinX;
  const z2 = y * sinX + z1 * cosX;
  const scale = 1000 / (1000 + z2);
  return { ...atom, sx: 260 + x1 * scale, sy: 390 + y2 * scale, depth: z2, scale };
}

function drawMolecule(canvas: HTMLCanvasElement, rx: number, ry: number, cssWidth: number, cssHeight: number) {
  if (!cssWidth || !cssHeight) return;

  // Keep the backing canvas reasonably small on high-DPI displays.
  const dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 1.5, 1120 / cssHeight));
  const width = Math.round(cssWidth * dpr);
  const height = Math.round(cssHeight * dpr);
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }

  const context = canvas.getContext("2d");
  if (!context) return;
  const scale = Math.min(cssWidth / 520, cssHeight / 780);
  const offsetX = (cssWidth - 520 * scale) / 2;
  const offsetY = (cssHeight - 780 * scale) / 2;

  // Clear the entire backing buffer before applying the perspective transform.
  context.setTransform(1, 0, 0, 1, 0, 0);
  context.clearRect(0, 0, width, height);
  context.setTransform(dpr * scale, 0, 0, dpr * scale, dpr * offsetX, dpr * offsetY);

  const ax = rx * Math.PI / 180;
  const ay = ry * Math.PI / 180;
  const sinX = Math.sin(ax), cosX = Math.cos(ax);
  const sinY = Math.sin(ay), cosY = Math.cos(ay);
  const perspective = (atom: Atom) => project(atom, sinX, cosX, sinY, cosY);

  // The three orbital guides are also projected in 3D. They no longer
  // remain flat while the atoms rotate through space.
  context.save();
  context.strokeStyle = "rgba(174, 183, 172, .23)";
  context.lineWidth = 1;
  context.setLineDash([2, 7]);
  for (const orbit of [
    { major: 170, minor: 325, tilt: .42 },
    { major: 145, minor: 290, tilt: -.67 },
    { major: 205, minor: 225, tilt: .92 },
  ]) {
    context.beginPath();
    for (let i = 0; i <= 96; i++) {
      const t = i * Math.PI * 2 / 96;
      const point = perspective({
        x: 260 + orbit.major * Math.cos(t),
        y: 390 + orbit.minor * Math.sin(t) * Math.cos(orbit.tilt),
        z: orbit.minor * Math.sin(t) * Math.sin(orbit.tilt),
        r: 0
      });
      if (i === 0) context.moveTo(point.sx, point.sy);
      else context.lineTo(point.sx, point.sy);
    }
    context.stroke();
  }
  context.restore();

  const projected = atoms.map(perspective);
  // Back-to-front ordering is essential: faraway segments must not cover
  // the nearer atoms and bonds.
  const orderedBonds = bonds.map(([a, b], index) => ({
    start: projected[a], end: projected[b], index,
    depth: (projected[a].depth + projected[b].depth) / 2
  })).sort((a, b) => b.depth - a.depth);

  for (const { start, end, index, depth } of orderedBonds) {
    context.globalAlpha = Math.max(.28, Math.min(.9, 1 - depth / 1200));
    context.beginPath();
    context.moveTo(start.sx, start.sy);
    context.lineTo(end.sx, end.sy);
    context.lineCap = "round";
    context.strokeStyle = "rgba(9, 11, 9, .75)";
    context.lineWidth = index % 5 === 0 ? 5.2 : 3.8;
    context.stroke();
    context.strokeStyle = index % 5 === 0 ? "rgba(225, 233, 219, .78)" : "rgba(169, 183, 165, .62)";
    context.lineWidth = index % 5 === 0 ? 2.5 : 1.6;
    context.stroke();
  }
  context.globalAlpha = 1;

  for (const atom of projected.sort((a, b) => b.depth - a.depth)) {
    const sprite = atomSprite(atom);
    if (!sprite) continue;
    const size = atom.r * 4.2 * atom.scale + 6;
    context.drawImage(sprite, atom.sx - size / 2, atom.sy - size / 2, size, size);
  }
}

export default function AuthMolecule() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rotation = useRef({ x: 12, y: -24 });
  const drag = useRef<{ x: number; y: number; rx: number; ry: number } | null>(null);
  const redrawOnDrag = useRef<(() => void) | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let viewport = { width: 0, height: 0 };
    let raf = 0;
    let lastTime = 0;
    let lastPaint = 0;

    const paint = (time: number) => {
      const tilt = motion.matches ? 0 : Math.sin(time / 8500) * 3;
      drawMolecule(canvas, rotation.current.x + tilt, rotation.current.y, viewport.width, viewport.height);
    };
    const measure = () => {
      const bounds = canvas.getBoundingClientRect();
      viewport = { width: bounds.width, height: bounds.height };
      paint(performance.now());
    };
    const tick = (time: number) => {
      const elapsed = lastTime ? Math.min(time - lastTime, 64) : 0;
      lastTime = time;
      if (!drag.current) rotation.current.y += elapsed * .0036;
      // 30 fps while idle, up to 60 fps while dragging. Geometry and sprites
      // are cached; no React state updates or CSS transforms per frame.
      if (time - lastPaint >= (drag.current ? 16 : 33)) {
        paint(time);
        lastPaint = time;
      }
      raf = requestAnimationFrame(tick);
    };
    const restart = () => {
      cancelAnimationFrame(raf);
      raf = 0;
      lastTime = 0;
      lastPaint = 0;
      paint(performance.now());
      if (!motion.matches && !document.hidden) raf = requestAnimationFrame(tick);
    };
    redrawOnDrag.current = () => {
      // Even with reduced motion, direct manipulation stays interactive.
      if (motion.matches && !document.hidden) paint(performance.now());
    };

    const observer = new ResizeObserver(measure);
    observer.observe(canvas);
    measure();
    motion.addEventListener("change", restart);
    document.addEventListener("visibilitychange", restart);
    restart();
    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      motion.removeEventListener("change", restart);
      document.removeEventListener("visibilitychange", restart);
      redrawOnDrag.current = null;
    };
  }, []);

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    drag.current = { x: event.clientX, y: event.clientY, rx: rotation.current.x, ry: rotation.current.y };
    try { event.currentTarget.setPointerCapture(event.pointerId); } catch {}
  }
  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!drag.current) return;
    rotation.current.x = Math.max(-65, Math.min(65, drag.current.rx - (event.clientY - drag.current.y) * .35));
    rotation.current.y = drag.current.ry + (event.clientX - drag.current.x) * .4;
    redrawOnDrag.current?.();
  }
  function stop() {
    drag.current = null;
  }

  return (
    <aside className="auth-molecule-stage" aria-label="Интерактивная трёхмерная молекула Freelance Hunter">
      <div className="auth-molecule-grid" />
      <div className="molecule-status"><i /> OPPORTUNITY NETWORK / 3D</div>
      <div className="molecule-tag molecule-tag-one"><span>01 / DISCOVER</span><strong>Новые проекты</strong></div>
      <div className="molecule-tag molecule-tag-two"><span>02 / MATCH</span><strong>Точное совпадение</strong></div>
      <div className="molecule-tag molecule-tag-three"><span>03 / RESPOND</span><strong>Отклик готов к отправке</strong></div>
      <div className="auth-molecule-interaction" onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={stop} onPointerCancel={stop} role="img" aria-label="Трёхмерная молекула связей между проектами, навыками и откликами. Перетаскивай мышью, чтобы вращать её в пространстве.">
        <canvas ref={canvasRef} className="auth-molecule-canvas" aria-hidden="true" />
      </div>
      <div className="molecule-instruction">Зажми и перетаскивай, чтобы вращать в 3D</div>
    </aside>
  );
}
