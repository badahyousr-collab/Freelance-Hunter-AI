"use client";

import { useRef, useState, type PointerEvent } from "react";

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
  // Each atom sits at a different depth, so the model has real 3D geometry,
  // rather than rotating one flat illustration.
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
  const depth = 1000 / (1000 + z2);
  return { ...atom, sx: 260 + x1 * depth, sy: 390 + y2 * depth, depth: z2, scale: depth };
}

export default function AuthMolecule() {
  const [rotation, setRotation] = useState({ x: -9, y: 14 });
  const drag = useRef<{ x: number; y: number; rx: number; ry: number } | null>(null);
  const projected = atoms.map(atom => project(atom, rotation.x, rotation.y));
  const orderedAtoms = projected.map((atom, index) => ({ atom, index })).sort((a, b) => a.atom.depth - b.atom.depth);

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    drag.current = { x: event.clientX, y: event.clientY, rx: rotation.x, ry: rotation.y };
    try { event.currentTarget.setPointerCapture(event.pointerId); } catch {}
  }
  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!drag.current) return;
    setRotation({
      x: Math.max(-55, Math.min(55, drag.current.rx - (event.clientY - drag.current.y) * 0.35)),
      y: Math.max(-75, Math.min(75, drag.current.ry + (event.clientX - drag.current.x) * 0.4)),
    });
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
        <svg className="auth-molecule-svg" viewBox="0 0 520 780" aria-hidden="true">
          <defs>
            <radialGradient id="atomFill" cx="28%" cy="22%" r="78%">
              <stop offset="0%" stopColor="#f1f4ec" />
              <stop offset="30%" stopColor="#aeb8aa" />
              <stop offset="66%" stopColor="#596258" />
              <stop offset="100%" stopColor="#151916" />
            </radialGradient>
            <radialGradient id="atomCore" cx="28%" cy="20%" r="80%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="35%" stopColor="#dce5d8" />
              <stop offset="100%" stopColor="#697568" />
            </radialGradient>
            <radialGradient id="atomHalo">
              <stop offset="0%" stopColor="#d8e5d4" stopOpacity=".2" />
              <stop offset="100%" stopColor="#c9d1c9" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="bondFill" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#eef4e9" stopOpacity=".85" />
              <stop offset="100%" stopColor="#7d897b" stopOpacity=".22" />
            </linearGradient>
          </defs>
          <ellipse className="molecule-orbit" cx="260" cy="390" rx="170" ry="330" transform={`rotate(22 260 390) skewY(${rotation.x * .18})`} />
          <ellipse className="molecule-orbit" cx="260" cy="390" rx="135" ry="300" transform={`rotate(${-31 + rotation.y * .18} 260 390)`} />
          <ellipse className="molecule-orbit" cx="260" cy="390" rx="205" ry="220" transform={`rotate(${63 + rotation.x * .25} 260 390)`} />
          {bonds.map(([a, b], i) => {
            const start = projected[a];
            const end = projected[b];
            const avgDepth = (start.depth + end.depth) / 2;
            return <g key={`bond-${a}-${b}`} opacity={Math.max(.25, Math.min(.9, 1 - avgDepth / 1600))}>
              <line x1={start.sx} y1={start.sy} x2={end.sx} y2={end.sy} stroke="#090b09" strokeWidth={i % 5 === 0 ? 5.2 : 3.8} strokeLinecap="round" opacity=".75" />
              <line x1={start.sx} y1={start.sy} x2={end.sx} y2={end.sy} stroke="url(#bondFill)" strokeWidth={i % 5 === 0 ? 2.5 : 1.6} strokeLinecap="round" />
            </g>;
          })}
          {orderedAtoms.map(({ atom, index }) => {
            const radius = atom.r * atom.scale;
            return <g key={`atom-${index}`}>
              <circle cx={atom.sx} cy={atom.sy} r={radius * 3.8} fill="url(#atomHalo)" />
              <circle cx={atom.sx} cy={atom.sy} r={radius + 1.5} fill="#080a08" fillOpacity=".8" />
              <circle className={atom.kind === "core" ? "molecule-atom molecule-atom-core" : atom.kind === "dark" ? "molecule-atom molecule-atom-dark" : "molecule-atom"} cx={atom.sx} cy={atom.sy} r={radius} fill={atom.kind === "core" ? "url(#atomCore)" : "url(#atomFill)"} />
              <ellipse cx={atom.sx - radius * .27} cy={atom.sy - radius * .34} rx={Math.max(1.5, radius * .35)} ry={Math.max(1, radius * .2)} fill="#fff" fillOpacity=".46" />
            </g>;
          })}
        </svg>
      </div>
      <div className="molecule-instruction">Зажми и перетаскивай, чтобы вращать в 3D</div>
    </aside>
  );
}
