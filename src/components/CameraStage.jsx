import React, { useRef } from 'react';
import { HandButton, InkFrame, InkDashed, useSize } from './hand.jsx';

/** Hand-drawn viewfinder corner ticks. */
function Viewfinder() {
  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 75" preserveAspectRatio="none" aria-hidden="true">
      <g stroke="#f4f0e6" strokeWidth="0.9" fill="none" opacity="0.95" strokeLinecap="round">
        <path d="M4 12 L4.4 4.6 L12 4" />
        <path d="M88 4 L95.6 4.4 L96 12" />
        <path d="M96 63 L95.4 70.6 L88 71" />
        <path d="M12 71 L4.5 70.4 L4 63" />
        <path d="M47 37.5 h6 M50 34.5 v6" opacity="0.6" />
      </g>
    </svg>
  );
}

export default function CameraStage({
  videoRef,
  cameraState, // 'idle' | 'starting' | 'live' | 'denied' | 'unavailable'
  error,
  onStart,
  onStop,
  stillSrc,
  source, // 'camera' | 'still'
  onPickFile,
  onClearStill,
  mirrored,
  onToggleMirror,
}) {
  const ref = useRef(null);
  const fileRef = useRef(null);
  const { w, h } = useSize(ref);

  const dropHandlers = {
    onDragOver: (e) => e.preventDefault(),
    onDrop: (e) => {
      e.preventDefault();
      const f = Array.from(e.dataTransfer.files || []).find((x) => x.type.startsWith('image/'));
      if (f) onPickFile(f);
    },
  };

  return (
    <div ref={ref} className="relative" {...dropHandlers}>
      <InkFrame seed="camstage" w={w} h={h} weight={2.6} overshoot={8} double />
      <div className="relative p-3">
        <div className="mb-2 flex items-baseline justify-between gap-2">
          <h2 className="font-hand text-[25px] leading-none">The lens</h2>
          <span className="font-letter text-[14px] text-ink70">
            {source === 'still' ? 'still image' : cameraState === 'live' ? 'camera live' : 'camera off'}
          </span>
        </div>

        <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#1c1a16]">
          <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            className="h-full w-full object-cover"
            style={{
              transform: mirrored ? 'scaleX(-1)' : undefined,
              filter: 'grayscale(0.5) contrast(1.12)',
              display: source === 'camera' && cameraState === 'live' ? 'block' : 'none',
            }}
          />
          {source === 'still' && stillSrc && (
            <img src={stillSrc} alt="Uploaded still used as the classifier input" className="h-full w-full object-contain" style={{ filter: 'grayscale(0.35) contrast(1.08)' }} />
          )}
          {source === 'camera' && cameraState !== 'live' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#efe9db] p-5 text-center">
              {cameraState === 'starting' ? (
                <p className="font-hand text-[24px]">asking the camera nicely…</p>
              ) : cameraState === 'denied' || cameraState === 'unavailable' ? (
                <>
                  <p className="font-hand text-[26px] leading-tight">
                    {cameraState === 'denied' ? 'No camera — no problem.' : 'No camera found.'}
                  </p>
                  <p className="max-w-[42ch] font-sans text-[13px] leading-snug text-ink70">
                    {error || 'The browser blocked camera access.'} Everything still works: drop images below and the artist will draw them just the same.
                  </p>
                  <div className="flex gap-2">
                    <HandButton size="sm" onClick={() => fileRef.current?.click()}>
                      Use an image instead
                    </HandButton>
                    <HandButton size="sm" onClick={onStart}>
                      Try camera again
                    </HandButton>
                  </div>
                </>
              ) : (
                <>
                  <p className="font-hand text-[26px]">the lens cap is on</p>
                  <div className="flex gap-2">
                    <HandButton size="sm" onClick={onStart}>
                      Start camera
                    </HandButton>
                    <HandButton size="sm" onClick={() => fileRef.current?.click()}>
                      Use an image
                    </HandButton>
                  </div>
                </>
              )}
            </div>
          )}
          {(cameraState === 'live' && source === 'camera') || (source === 'still' && stillSrc) ? <Viewfinder /> : null}
        </div>

        <div className="mt-2.5 flex flex-wrap items-center gap-2">
          {cameraState === 'live' ? (
            <HandButton size="sm" onClick={onStop}>
              Stop camera
            </HandButton>
          ) : (
            <HandButton size="sm" onClick={onStart}>
              Start camera
            </HandButton>
          )}
          <HandButton size="sm" onClick={() => fileRef.current?.click()}>
            {stillSrc ? 'Swap image' : 'Drop / choose image'}
          </HandButton>
          {stillSrc && (
            <HandButton size="sm" tone="red" onClick={onClearStill}>
              Clear still
            </HandButton>
          )}
          <button onClick={onToggleMirror} className="focusable ml-auto font-letter text-[14px] text-ink70 underline decoration-dotted underline-offset-4">
            {mirrored ? 'un-mirror' : 'mirror'}
          </button>
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onPickFile(f);
            e.target.value = '';
          }}
        />
      </div>
    </div>
  );
}
