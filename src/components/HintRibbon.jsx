import React from 'react';
import { InkFrame, useSize } from './hand.jsx';

const STEPS = [
  { n: 1, t: 'Name two things', d: 'A mug and your hand. A cat and a lamp. Anything the camera can see.' },
  { n: 2, t: 'Hold to record', d: 'Ten seconds of frames each is plenty. Move around a little.' },
  { n: 3, t: 'Watch it draw', d: 'Every confident guess becomes an inked panel. Export the strip when it gets good.' },
];

export default function HintRibbon({ step, onDismiss }) {
  const ref = React.useRef(null);
  const { w, h } = useSize(ref);
  return (
    <div ref={ref} className="relative">
      <InkFrame seed="ribbon" w={w} h={h} weight={2} overshoot={6} opacity={0.8} />
      <div className="relative flex flex-wrap items-stretch gap-x-6 gap-y-3 px-4 py-3">
        {STEPS.map((s) => {
          const done = step > s.n;
          const active = step === s.n;
          return (
            <div key={s.n} className={`flex min-w-[210px] flex-1 items-start gap-2.5 ${done ? 'opacity-45' : ''}`}>
              <span
                className="mt-[2px] flex h-6 w-6 shrink-0 items-center justify-center font-letter text-[15px]"
                style={{
                  border: `1.8px solid ${active ? '#b8382a' : 'rgba(25,23,19,0.55)'}`,
                  borderRadius: '48% 52% 45% 55% / 55% 45% 55% 45%',
                  color: active ? '#b8382a' : undefined,
                }}
              >
                {done ? '✓' : s.n}
              </span>
              <span>
                <span className="block font-hand text-[21px] leading-none" style={{ color: active ? '#b8382a' : undefined }}>
                  {s.t}
                </span>
                <span className="block font-sans text-[12.5px] leading-snug text-ink70">{s.d}</span>
              </span>
            </div>
          );
        })}
        <button onClick={onDismiss} className="focusable self-center font-letter text-[14px] text-ink45 underline decoration-dotted underline-offset-4">
          hide
        </button>
      </div>
    </div>
  );
}
