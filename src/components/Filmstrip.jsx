import React, { useEffect, useRef, useState } from 'react';
import { HandButton, InkFrame, useSize } from './hand.jsx';
import { PanelSVG } from './PanelStage.jsx';
import { rebuildPanel } from '../lib/exporters.js';

function Sprockets({ flip = false }) {
  return (
    <div className={`pointer-events-none absolute inset-x-0 ${flip ? 'bottom-0' : 'top-0'} h-4 overflow-hidden`} aria-hidden="true">
      <svg className="h-full w-full" preserveAspectRatio="none" viewBox="0 0 1200 16">
        {Array.from({ length: 60 }).map((_, i) => (
          <rect key={i} x={8 + i * 20} y={4.5} width={11} height={7} rx={1.6} fill="rgba(25,23,19,0.16)" />
        ))}
      </svg>
    </div>
  );
}

export default function Filmstrip({ entries, thumbs, onClear, onExportPNG, onExportPDF, busy }) {
  const ref = useRef(null);
  const scrollRef = useRef(null);
  const { w, h } = useSize(ref);
  const [zoom, setZoom] = useState(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ left: el.scrollWidth, behavior: 'smooth' });
  }, [entries.length]);

  useEffect(() => {
    if (!zoom) return undefined;
    const onKey = (e) => e.key === 'Escape' && setZoom(null);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [zoom]);

  return (
    <div ref={ref} className="relative">
      <InkFrame seed="strip" w={w} h={h} weight={2.5} overshoot={7} double />
      <div className="relative px-4 pb-3 pt-3.5">
        <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-hand text-[26px] leading-none">
            The strip <span className="font-letter text-[15px] text-ink70">· {entries.length} panels</span>
          </h2>
          <div className="flex flex-wrap gap-2">
            <HandButton size="sm" disabled={!entries.length || busy} onClick={onExportPNG}>
              {busy === 'png' ? 'stitching…' : 'Export PNG'}
            </HandButton>
            <HandButton size="sm" disabled={!entries.length || busy} onClick={onExportPDF}>
              {busy === 'pdf' ? 'binding…' : 'Export comic book (PDF)'}
            </HandButton>
            <HandButton size="sm" tone="red" disabled={!entries.length} onClick={onClear}>
              Clear
            </HandButton>
          </div>
        </div>

        <div className="relative bg-[rgba(25,23,19,0.035)]">
          <Sprockets />
          <Sprockets flip />
          <div ref={scrollRef} className="ink-scroll flex gap-3 overflow-x-auto px-2 py-5" style={{ minHeight: 148 }}>
            {!entries.length && (
              <p className="px-2 py-6 font-hand text-[22px] text-ink45">
                empty reel — every confident prediction gets inked here.
              </p>
            )}
            {entries.map((e, i) => (
              <button
                key={e.panelIndex}
                onClick={() => setZoom(e)}
                className="focusable press group relative shrink-0"
                aria-label={`Enlarge panel ${i + 1}: ${e.label}`}
                title={`${e.label} · ${Math.round(e.confidence * 100)}%`}
              >
                {thumbs[e.panelIndex] ? (
                  <img
                    src={thumbs[e.panelIndex]}
                    alt={`Panel ${i + 1}: ${e.label}`}
                    className="block h-[108px] w-auto border border-[rgba(25,23,19,0.35)] bg-paper"
                  />
                ) : (
                  <span className="flex h-[108px] w-[137px] items-center justify-center border border-dashed border-[rgba(25,23,19,0.3)] font-hand text-[18px] text-ink45">
                    inking…
                  </span>
                )}
                <span className="absolute -bottom-[3px] left-1 font-letter text-[12px] text-ink70">#{i + 1}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {zoom && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(25,23,19,0.72)] p-4"
          role="dialog"
          aria-modal="true"
          aria-label={`Panel: ${zoom.label}`}
          onClick={() => setZoom(null)}
        >
          <div className="max-h-full w-full max-w-3xl overflow-auto bg-paper p-2" onClick={(e) => e.stopPropagation()}>
            <PanelSVG panel={rebuildPanel(zoom)} className="block h-auto w-full" rotate={false} />
            <div className="flex items-center justify-between px-2 pb-1 pt-2">
              <span className="font-letter text-[15px] text-ink70">
                {zoom.label} · {Math.round(zoom.confidence * 100)}%
              </span>
              <HandButton size="sm" onClick={() => setZoom(null)}>
                Close
              </HandButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
