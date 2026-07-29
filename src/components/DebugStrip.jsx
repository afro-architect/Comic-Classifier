import React, { useState } from 'react';
import { InkFrame, useSize } from './hand.jsx';

export default function DebugStrip({ scores, classes, fps, backend, numTensors, mode, lastLatency }) {
  const [open, setOpen] = useState(false);
  const ref = React.useRef(null);
  const { w, h } = useSize(ref);
  const ordered = [...classes].sort((a, b) => (scores[b.id] || 0) - (scores[a.id] || 0));

  return (
    <div ref={ref} className="relative">
      <InkFrame seed="dbg" w={w} h={h} weight={1.8} overshoot={5} opacity={0.75} />
      <div className="relative px-3 py-2">
        <button
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="focusable flex w-full items-center gap-2 text-left font-sans text-[12px] font-semibold uppercase tracking-[0.16em] text-ink70"
        >
          <span className="inline-block transition-transform" style={{ transform: open ? 'rotate(90deg)' : 'none' }}>
            ▸
          </span>
          the artist's notebook
          <span className="ml-auto font-letter text-[13px] normal-case tracking-normal">
            {fps.toFixed(1)} fps · {mode}
          </span>
        </button>
        {open && (
          <div className="mt-2 space-y-1.5">
            {ordered.map((c) => (
              <div key={c.id} className="flex items-center gap-2">
                <span className="w-24 shrink-0 truncate font-letter text-[14px]">{c.name || 'unnamed'}</span>
                <div className="relative h-[7px] flex-1" style={{ background: 'rgba(25,23,19,0.07)' }}>
                  <div
                    className="h-full"
                    style={{
                      width: `${Math.round((scores[c.id] || 0) * 100)}%`,
                      background: 'repeating-linear-gradient(66deg, #191713 0 2px, rgba(25,23,19,0.2) 2px 4.5px)',
                    }}
                  />
                </div>
                <span className="w-10 text-right font-letter text-[13px] tabular-nums text-ink70">
                  {((scores[c.id] || 0) * 100).toFixed(0)}%
                </span>
              </div>
            ))}
            <p className="pt-1 font-letter text-[13px] leading-snug text-ink45">
              backend: {backend} · tensors: {numTensors} · inference: {lastLatency ? `${lastLatency.toFixed(0)}ms` : '—'} · everything runs on this device
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
