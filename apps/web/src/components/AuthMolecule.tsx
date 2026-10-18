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
  z: Math.sin(i * 1.73) * 105 + Math.cos(i * 0.61) * 35,
}));
const bonds: [number, number][] = [
  [0,1],[0,2],[1,2],[1,3],[1,4],[2,4],[2,5],[3,4],[3,6],[4,5],[4,6],[4,7],
  [5,7],[5,8],[6,7],[6,9],[6,10],[7,8],[7,10],[8,11],[8,15],[9,10],[9,12],
  [9,16],[10,11],[10,12],[11,12],[11,13],[11,14],[12,14],[13,15],[14,15],[12,16],[2,17]
];

function project(atom: Atom, rx: number, ry: number): ProjectedAtom {
  const x = atom.x - 260;
  const y = atom.y - 390;
  const ax = rx * Math.PI / 180;
  const ay = ry * Math.PI / 180;
  const x1 = x * Math.cos(ay) + atom.z * Math.sin(ay);
  const z1 = -x * Math.sin(ay) + atom.z * Math.cos(ay);
  const y2 = y * Math.cos(ax) - z1 * Math.sin(ax);
  const z2 = y * Math.sin(ax) + z1 * Math.cos(ax);
  const scale = 1000 / (1000 + z2);
  return { ...atom, sx: 260 + x1 * scale, sy: 390 + y2 * scale, depth: z2, scale };
}

function drawMolecule(canvas: HTMLCanvasElement, rx: number, ry: number) {
  const bounds = canvas.getBoundingClientRect();
  if (!bounds.width || !bounds.height) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const width = Math.round(bounds.width * dpr);
  const height = Math.round(bounds.height * dpr);
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  const context = canvas.getContext("2d");
  if (!context) return;
  const scale = Math.min(bounds.width / 520, bounds.height / 780);
  const offsetX = (bounds.width - 520 * scale) / 2;
  const offsetY = (bounds.height - 780 * scale) / 2;
  context.setTransform(dpr * scale, 0, 0, dpr * scale, dpr * offsetX, dpr * offsetY);
  context.clearRect(0, 0, 520, 780);

  context.save();
  context.strokeStyle = "rgba(174, 183, 172, .25)";
  context.lineWidth = 1;
  context.setLineDash([2, 7]);
  for (const orbit of [
    { rx: 170, ry: 330, angle: 22 + rx * .18 },
    { rx: 135, ry: 300, angle: -31 + ry * .18 },
    { rx: 205, ry: 220, angle: 63 + rx * .25 },
  ]) {
    context.save();
    context.translate(260, 390);
    context.rotate(orbit.angle * Math.PI / 180);
    context.beginPath();
    context.ellipse(0, 0, orbit.rx, orbit.ry, 0, 0, Math.PI * 2);
    context.stroke();
    context.restore();
  }
  context.restore();

  const projected = atoms.map(atom => project(atom, rx, ry));
  for (let index = 0; index < bonds.length; index += 1) {
    const [a, b] = bonds[index];
    const start = projected[a];
    const end = projected[b];
    if (!start || !end) continue;
    const gradient = context.createLinearGradient(start.sx, start.sy, end.sx, end.sy);
    gradient.addColorStop(0, "rgba(238, 244, 233, .85)");
    gradient.addColorStop(1, "rgba(125, 137, 123, .22)");
    context.globalAlpha = Math.max(.25, Math.min(.9, 1 - (start.depth + end.depth) / 3200));
    context.beginPath();
    context.moveTo(start.sx, start.sy);
    context.lineTo(end.sx, end.sy);
    context.lineCap = "round";
    context.strokeStyle = "rgba(9, 11, 9, .75)";
    context.lineWidth = index % 5 === 0 ? 5.2 : 3.8;
    context.stroke();
    context.strokeStyle = gradient;
    context.lineWidth = index % 5 === 0 ? 2.5 : 1.6;
    context.stroke();
  }
  context.globalAlpha = 1;

  for (const atom of projected.sort((a, b) => a.depth - b.depth)) {
    const radius = atom.r * atom.scale;
    const halo = context.createRadialGradient(atom.sx, atom.sy, 0, atom.sx, atom.sy, radius * 3.8);
    halo.addColorStop(0, "rgba(216, 229, 212, .20)");
    halo.addColorStop(1, "rgba(201, 209, 201, 0)");
    context.beginPath(); context.arc(atom.sx, atom.sy, radius * 3.8, 0, Math.PI * 2); context.fillStyle = halo; context.fill();
    context.beginPath(); context.arc(atom.sx, atom.sy, radius + 1.5, 0, Math.PI * 2); context.fillStyle = "rgba(8, 10, 8, .8)"; context.fill();
    const gradient = context.createRadialGradient(atom.sx - radius * .3, atom.sy - radius * .35, Math.max(1, radius * .08), atom.sx, atom.sy, radius);
    if (atom.kind === "core") {
      gradient.addColorStop(0, "#ffffff"); gradient.addColorStop(.35, "#dce5d8"); gradient.addColorStop(1, "#697568");
    } else {
      gradient.addColorStop(0, atom.kind === "dark" ? "#c5cdc2" : "#f1f4ec");
      gradient.addColorStop(.3, atom.kind === "dark" ? "#7c867a" : "#aeb8aa");
      gradient.addColorStop(.68, "#596258"); gradient.addColorStop(1, "#151916");
    }
    context.beginPath(); context.arc(atom.sx, atom.sy, radius, 0, Math.PI * 2); context.fillStyle = gradient; context.fill();
    context.lineWidth = 1.1; context.strokeStyle = atom.kind === "core" ? "rgba(255,255,255,.8)" : "rgba(203,210,199,.72)"; context.stroke();
    context.beginPath(); context.ellipse(atom.sx - radius * .27, atom.sy - radius * .34, Math.max(1.5, radius * .35), Math.max(1, radius * .2), -.35, 0, Math.PI * 2);
    context.fillStyle = "rgba(255,255,255,.46)"; context.fill();
  }
}

export default function AuthMolecule() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rotation = useRef({ x: -9, y: 14 });
  const drag = useRef<{ x: number; y: number; rx: number; ry: number } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = canvas?.parentElement;
    if (!canvas || !container) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    let previousTime = 0;
    const render = (time: number) => {
      frame = 0;
      if (previousTime && !drag.current && !reducedMotion.matches) {
        rotation.current.y = (rotation.current.y + (time - previousTime) * .0045) % 360;
      }
      previousTime = time;
      drawMolecule(canvas, rotation.current.x, rotation.current.y);
      if (!reducedMotion.matches) frame = window.requestAnimationFrame(render);
    };
    const scheduleRender = () => {
      if (!frame) frame = window.requestAnimationFrame(time => { frame = 0; render(time); });
    };
    frame = window.requestAnimationFrame(render);
    const observer = new ResizeObserver(scheduleRender);
    observer.observe(container);
    const onMotionChange = () => scheduleRender();
    reducedMotion.addEventListener("change", onMotionChange);
    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      reducedMotion.removeEventListener("change", onMotionChange);
    };
  }, []);

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    drag.current = { x: event.clientX, y: event.clientY, rx: rotation.current.x, ry: rotation.current.y };
    try { event.currentTarget.setPointerCapture(event.pointerId); } catch {}
  }
  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!drag.current) return;
    rotation.current.x = Math.max(-55, Math.min(55, drag.current.rx - (event.clientY - drag.current.y) * .35));
    rotation.current.y = drag.current.ry + (event.clientX - drag.current.x) * .4;
    const canvas = canvasRef.current;
    if (canvas) drawMolecule(canvas, rotation.current.x, rotation.current.y);
  }
  function stop() { drag.current = null; }

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
