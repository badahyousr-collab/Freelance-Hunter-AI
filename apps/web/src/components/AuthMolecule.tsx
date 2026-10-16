"use client";

import { useRef, useState, type PointerEvent } from "react";

type Point = { x: number; y: number; r: number; kind?: "core" | "dark" };

const atoms: Point[] = [
  { x: 260, y: 100, r: 10 }, { x: 190, y: 158, r: 13 }, { x: 323, y: 180, r: 18, kind: "core" },
  { x: 126, y: 245, r: 9, kind: "dark" }, { x: 230, y: 265, r: 15 }, { x: 385, y: 280, r: 10 },
  { x: 165, y: 360, r: 18, kind: "core" }, { x: 285, y: 365, r: 10, kind: "dark" }, { x: 365, y: 410, r: 15 },
  { x: 105, y: 470, r: 11 }, { x: 230, y: 490, r: 9 }, { x: 315, y: 535, r: 20, kind: "core" },
  { x: 180, y: 600, r: 13, kind: "dark" }, { x: 400, y: 620, r: 10 }, { x: 265, y: 690, r: 12 },
  { x: 425, y: 510, r: 8 }, { x: 95, y: 570, r: 7 }, { x: 350, y: 105, r: 7 },
];
const bonds: [number, number][] = [
  [0,1],[0,2],[1,2],[1,3],[1,4],[2,4],[2,5],[3,4],[3,6],[4,5],[4,6],[4,7],
  [5,7],[5,8],[6,7],[6,9],[6,10],[7,8],[7,10],[8,11],[8,15],[9,10],[9,12],
  [9,16],[10,11],[10,12],[11,12],[11,13],[11,14],[12,14],[13,15],[14,15],[12,16],[2,17]
];

export default function AuthMolecule() {
  const [rotation, setRotation] = useState({ x: -7, y: 9 });
  const drag = useRef<{ x: number; y: number; rx: number; ry: number } | null>(null);

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    drag.current = { x: event.clientX, y: event.clientY, rx: rotation.x, ry: rotation.y };
    try { event.currentTarget.setPointerCapture(event.pointerId); } catch {}
  }
  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!drag.current) return;
    setRotation({
      x: Math.max(-28, Math.min(28, drag.current.rx - (event.clientY - drag.current.y) * 0.25)),
      y: Math.max(-35, Math.min(35, drag.current.ry + (event.clientX - drag.current.x) * 0.28)),
    });
  }
  function stop() { drag.current = null; }

  return (
    <aside className="auth-molecule-stage" aria-label="Интерактивная молекула Freelance Hunter">
      <div className="auth-molecule-grid" />
      <div className="molecule-status"><i /> OPPORTUNITY NETWORK / LIVE CONCEPT</div>
      <div className="molecule-tag molecule-tag-one"><span>01 / DISCOVER</span><strong>Новые проекты</strong></div>
      <div className="molecule-tag molecule-tag-two"><span>02 / MATCH</span><strong>Точное совпадение</strong></div>
      <div className="molecule-tag molecule-tag-three"><span>03 / RESPOND</span><strong>Отклик готов к отправке</strong></div>
      <div className="auth-molecule-interaction" onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={stop} onPointerCancel={stop} role="img" aria-label="Молекула связей между проектами, навыками и откликами. Перетаскивай мышью, чтобы менять угол.">
        <svg className="auth-molecule-svg" viewBox="0 0 520 780" aria-hidden="true" style={{ transform: `perspective(900px) rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)` }}>
          <defs>
            <radialGradient id="atomFill" cx="32%" cy="25%" r="75%">
              <stop offset="0%" stopColor="#dfe5da" stopOpacity=".9" />
              <stop offset="45%" stopColor="#747f73" stopOpacity=".8" />
              <stop offset="100%" stopColor="#202521" stopOpacity=".96" />
            </radialGradient>
            <radialGradient id="atomHalo">
              <stop offset="0%" stopColor="#cdd8c7" stopOpacity=".12" />
              <stop offset="100%" stopColor="#cdd8c7" stopOpacity="0" />
            </radialGradient>
          </defs>
          <ellipse className="molecule-orbit" cx="260" cy="390" rx="170" ry="330" transform="rotate(22 260 390)" />
          <ellipse className="molecule-orbit" cx="260" cy="390" rx="135" ry="300" transform="rotate(-31 260 390)" />
          <ellipse className="molecule-orbit" cx="260" cy="390" rx="205" ry="220" transform="rotate(63 260 390)" />
          {bonds.map(([a,b],i) => <line key={`bond-${a}-${b}`} className={i % 5 === 0 ? "molecule-bond molecule-bond-bright" : "molecule-bond"} x1={atoms[a].x} y1={atoms[a].y} x2={atoms[b].x} y2={atoms[b].y} />)}
          {atoms.map((atom,i) => <g key={`atom-${i}`}>
            <circle cx={atom.x} cy={atom.y} r={atom.r * 3.3} fill="url(#atomHalo)" />
            <circle className={atom.kind === "core" ? "molecule-atom molecule-atom-core" : atom.kind === "dark" ? "molecule-atom molecule-atom-dark" : "molecule-atom"} cx={atom.x} cy={atom.y} r={atom.r} />
            <circle cx={atom.x - atom.r * .28} cy={atom.y - atom.r * .32} r={Math.max(1.5, atom.r * .18)} fill="#f4f6ef" fillOpacity=".68" />
          </g>)}
        </svg>
      </div>
      <div className="molecule-instruction">Перетащи молекулу · крути · исследуй</div>
    </aside>
  );
}
