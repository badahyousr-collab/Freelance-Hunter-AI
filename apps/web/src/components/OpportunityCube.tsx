"use client";

import { useRef, useState, type PointerEvent } from "react";
import { ArrowUpRight, Check, Search, Send } from "lucide-react";

export default function OpportunityCube() {
  const [rotation, setRotation] = useState({ x: -22, y: -34 });
  const drag = useRef<{ x: number; y: number; rx: number; ry: number } | null>(null);

  function start(event: PointerEvent<HTMLDivElement>) {
    drag.current = { x: event.clientX, y: event.clientY, rx: rotation.x, ry: rotation.y };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function move(event: PointerEvent<HTMLDivElement>) {
    if (!drag.current) return;
    setRotation({
      x: Math.max(-65, Math.min(65, drag.current.rx - (event.clientY - drag.current.y) * 0.65)),
      y: drag.current.ry + (event.clientX - drag.current.x) * 0.75,
    });
  }

  function stop() { drag.current = null; }

  return (
    <div className="opportunity-cube-stage">
      <div className="cube-caption"><span className="cube-caption-dot" /> YOUR OPPORTUNITY ENGINE <span>DRAG TO ROTATE</span></div>
      <div className="opportunity-cube-interaction" onPointerDown={start} onPointerMove={move} onPointerUp={stop} onPointerCancel={stop} role="img" aria-label="Интерактивный 3D-куб поиска проектов. Потяни мышью, чтобы вращать.">
        <div className="opportunity-cube" style={{ transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)` }}>
          <div className="cube-face cube-front"><span className="cube-face-label">MATCH</span><Search size={28}/><strong>84%</strong><small>Skill match</small></div>
          <div className="cube-face cube-back"><span className="cube-face-label">READY</span><Check size={30}/><strong>Verified</strong><small>Project fit</small></div>
          <div className="cube-face cube-right"><span className="cube-face-label">SEND</span><Send size={27}/><strong>Proposal</strong><small>Prepared by AI</small></div>
          <div className="cube-face cube-left"><span className="cube-face-label">FIND</span><ArrowUpRight size={28}/><strong>New lead</strong><small>Fresh opportunity</small></div>
          <div className="cube-face cube-top"><span>FREELANCE<br/>HUNTER</span></div>
          <div className="cube-face cube-bottom"><span>PIPELINE<br/>ACTIVE</span></div>
        </div>
      </div>
      <div className="cube-orbit orbit-one" /><div className="cube-orbit orbit-two" />
      <p className="cube-footnote">From discovery to a ready-to-send proposal.</p>
    </div>
  );
}
