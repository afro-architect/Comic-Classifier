import React, { useMemo } from 'react';
import { mergePrims } from '../artist/ink.js';
import { InkFrame } from './hand.jsx';

/** Renders a built panel as live SVG. Text stays as <text> so it stays crisp. */
export function PanelSVG({ panel, className = '', rotate = true, ariaLabel }) {
  const paths = useMemo(() => mergePrims(panel.prims), [panel]);
  return (
    <svg
      viewBox={`0 0 ${panel.w} ${panel.h}`}
      className={className}
      role="img"
      aria-label={ariaLabel || (panel.meta?.caption ? `Comic panel: ${panel.meta.caption}` : 'Comic panel')}
      style={{ transform: rotate ? `rotate(${panel.rotation.toFixed(2)}deg)` : undefined }}
    >
      <rect width={panel.w} height={panel.h} fill="#f4f0e6" />
      {paths.map((p, i) => (
        <path key={i} d={p.d} fill={p.fill} opacity={p.opacity} />
      ))}
      {panel.texts.map((t, i) => (
        <text
          key={`t${i}`}
          x={t.x}
          y={t.y}
          fontSize={t.size}
          textAnchor={t.anchor}
          fontWeight={t.weight}
          opacity={t.opacity ?? 1}
          fill="#191713"
          style={{ fontFamily: t.font === 'caveat' ? "'Caveat', cursive" : "'Patrick Hand', cursive" }}
        >
          {t.text}
        </text>
      ))}
    </svg>
  );
}

/** Pencil-construction skeleton that gets inked over. */
export function PanelSkeleton() {
  return (
    <div className="relative aspect-[660/520] w-full">
      <svg viewBox="0 0 660 520" className="h-full w-full" aria-hidden="true">
        <rect width="660" height="520" fill="#f4f0e6" />
        <g stroke="#b9b2a2" strokeWidth="1.6" fill="none" className="scribble">
          <path d="M30 26 L630 30 L628 492 L26 488 Z" />
          <path d="M120 120 a90 90 0 1 0 0.1 0" />
          <path d="M96 300 q110 -80 220 6 q40 90 -20 150" />
          <path d="M420 150 l70 40 l-20 130 l-80 -20 Z" />
          <path d="M60 420 L600 424" />
        </g>
        <text x="330" y="270" textAnchor="middle" fontSize="30" fill="#8d8676" style={{ fontFamily: "'Caveat', cursive" }}>
          inking…
        </text>
      </svg>
    </div>
  );
}

export default function PanelStage({ panel, loading, badge, children }) {
  return (
    <div className="relative">
      <div className="relative p-2 sm:p-3">
        <InkFrameWrap>
          {loading || !panel ? (
            <PanelSkeleton />
          ) : (
            <PanelSVG
              key={`${panel.meta?.panelIndex}-${panel.meta?.label}-${panel.meta?.caption}`}
              panel={panel}
              className="ink-in block h-auto w-full"
            />
          )}
        </InkFrameWrap>
      </div>
      {badge}
      {children}
    </div>
  );
}

function InkFrameWrap({ children }) {
  const ref = React.useRef(null);
  const [size, setSize] = React.useState({ w: 0, h: 0 });
  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      setSize({ w: r.width, h: r.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <div ref={ref} className="relative">
      <InkFrame seed="stage" w={size.w} h={size.h} weight={3.2} overshoot={10} opacity={0.9} />
      <div className="p-2">{children}</div>
    </div>
  );
}
