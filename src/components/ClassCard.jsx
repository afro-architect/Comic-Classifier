import React, { useRef, useState } from 'react';
import { HandButton, HandInput, InkFrame, InkX, InkDashed, useSize } from './hand.jsx';

const MAX_SAMPLES = 200;

export default function ClassCard({
  cls,
  index,
  score = 0,
  isTop = false,
  recording = false,
  canRecord = true,
  onRename,
  onRemove,
  onFiles,
  onRecordStart,
  onRecordStop,
  onDeleteSample,
  onSnap,
}) {
  const ref = useRef(null);
  const fileRef = useRef(null);
  const { w, h } = useSize(ref);
  const [drag, setDrag] = useState(false);
  const full = cls.samples.length >= MAX_SAMPLES;

  const handleDrop = (e) => {
    e.preventDefault();
    setDrag(false);
    const files = Array.from(e.dataTransfer.files || []).filter((f) => f.type.startsWith('image/'));
    if (files.length) onFiles(cls.id, files);
  };

  return (
    <div
      ref={ref}
      onDragOver={(e) => {
        e.preventDefault();
        setDrag(true);
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={handleDrop}
      className="relative"
    >
      <InkFrame seed={`cls${cls.id}`} w={w} h={h} weight={2.4} overshoot={7} color={isTop ? '#b8382a' : '#191713'} />
      {drag && <InkDashed w={w} h={h} active />}
      <div className="relative p-3.5">
        <div className="flex items-start gap-2">
          <span className="mt-1 font-letter text-[15px] text-ink45">{String(index + 1).padStart(2, '0')}</span>
          <div className="flex-1">
            <HandInput
              seed={`nm${cls.id}`}
              value={cls.name}
              maxLength={22}
              aria-label={`Name of class ${index + 1}`}
              placeholder="name this class…"
              onChange={(e) => onRename(cls.id, e.target.value)}
            />
          </div>
          <button
            onClick={() => onRemove(cls.id)}
            className="focusable press mt-1.5 shrink-0 p-1"
            aria-label={`Remove class ${cls.name || index + 1}`}
            title="Remove class"
          >
            <InkX size={13} />
          </button>
        </div>

        {/* live confidence bar, drawn as an ink wash */}
        <div className="mt-2.5 flex items-center gap-2">
          <div className="relative h-[9px] flex-1 overflow-hidden" style={{ background: 'rgba(25,23,19,0.07)' }}>
            <div
              className="h-full transition-[width] duration-200"
              style={{
                width: `${Math.round(score * 100)}%`,
                background:
                  'repeating-linear-gradient(66deg, #191713 0 2px, rgba(25,23,19,0.25) 2px 4.5px)',
              }}
            />
          </div>
          <span className="w-9 text-right font-letter text-[14px] tabular-nums text-ink70">{Math.round(score * 100)}%</span>
        </div>

        {/* sample thumbnails */}
        {cls.samples.length > 0 && (
          <div className="ink-scroll mt-2.5 flex gap-1.5 overflow-x-auto pb-1.5">
            {cls.samples
              .slice(-40)
              .reverse()
              .map((s) => (
                <div key={s.id} className="group relative h-12 w-12 shrink-0">
                  <img src={s.thumb} alt="" className="h-full w-full object-cover" style={{ filter: 'grayscale(0.35) contrast(1.08)' }} />
                  <button
                    onClick={() => onDeleteSample(cls.id, s.id)}
                    aria-label="Delete this sample"
                    className="focusable absolute -right-1 -top-1 hidden bg-paper p-[1px] group-hover:block focus-visible:block"
                  >
                    <InkX size={11} />
                  </button>
                </div>
              ))}
          </div>
        )}

        <div className="mt-2.5 flex flex-wrap items-center gap-2">
          <HandButton
            seed={`rec${cls.id}`}
            size="sm"
            tone={recording ? 'red' : 'ink'}
            disabled={!canRecord || full}
            className="no-select"
            onPointerDown={(e) => {
              if (!canRecord || full) return;
              e.currentTarget.setPointerCapture?.(e.pointerId);
              onRecordStart(cls.id);
            }}
            onPointerUp={onRecordStop}
            onPointerLeave={onRecordStop}
            onKeyDown={(e) => {
              if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) onRecordStart(cls.id);
            }}
            onKeyUp={(e) => {
              if (e.key === ' ' || e.key === 'Enter') onRecordStop();
            }}
            onClick={(e) => e.preventDefault()}
          >
            {recording ? (
              <span className="flex items-center gap-1.5">
                <span className="rec-dot inline-block h-2 w-2 rounded-full bg-redink" /> recording
              </span>
            ) : (
              'Hold to record'
            )}
          </HandButton>
          <HandButton seed={`snap${cls.id}`} size="sm" disabled={!canRecord || full} onClick={() => onSnap(cls.id)}>
            Snap 1
          </HandButton>
          <HandButton seed={`up${cls.id}`} size="sm" disabled={full} onClick={() => fileRef.current?.click()}>
            Upload
          </HandButton>
          <span className="ml-auto font-letter text-[14px] text-ink70">
            {cls.samples.length} {cls.samples.length === 1 ? 'sample' : 'samples'}
            {full && ' · full'}
          </span>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            const files = Array.from(e.target.files || []);
            if (files.length) onFiles(cls.id, files);
            e.target.value = '';
          }}
        />
      </div>
    </div>
  );
}

export { MAX_SAMPLES };
