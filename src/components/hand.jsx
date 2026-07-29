/**
 * hand.jsx — every piece of UI chrome, drawn with the same nib as the comics.
 * No rounded-rect Tailwind buttons anywhere in this app.
 */

import React, { useEffect, useLayoutEffect, useMemo, useRef, useState, useId } from 'react';
import { handRect, handBoxPoly, stroke, loop, hatch, P, pathData, densify, preserveCorners, mergePrims, ellipsePoly } from '../artist/ink.js';
import { makeRng, hashString } from '../artist/prng.js';

/* ---------------- size observer ---------------- */

export function useSize(ref) {
  const [size, setSize] = useState({ w: 0, h: 0 });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const update = () => {
      const r = el.getBoundingClientRect();
      setSize((s) => (Math.abs(s.w - r.width) > 1 || Math.abs(s.h - r.height) > 1 ? { w: r.width, h: r.height } : s));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return size;
}

/* ---------------- the frame ---------------- */

export function InkFrame({ seed = 'frame', w, h, weight = 2.4, overshoot = 6, double = false, color = '#191713', opacity = 1, hatchValue = 0 }) {
  const d = useMemo(() => {
    if (w < 4 || h < 4) return [];
    const rng = makeRng(hashString(`${seed}|${Math.round(w / 6)}|${Math.round(h / 6)}`));
    const pad = weight + 1;
    const prims = handRect(pad, pad, w - pad * 2, h - pad * 2, { rng, width: weight, overshoot, wob: 1.15 });
    if (double) prims.push(...handRect(pad + 4, pad + 4, w - (pad + 4) * 2, h - (pad + 4) * 2, { rng, width: weight * 0.42, overshoot: overshoot * 0.5, wob: 0.9 }));
    if (hatchValue > 0) {
      prims.unshift(
        ...hatch([P(pad, pad), P(w - pad, pad), P(w - pad, h - pad), P(pad, h - pad)], {
          value: hatchValue,
          rng,
          spacing: 7,
          width: 0.75,
          opacity: 0.5,
        })
      );
    }
    return mergePrims(prims);
  }, [seed, Math.round(w), Math.round(h), weight, double, overshoot, hatchValue]);

  if (!d.length) return null;
  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full overflow-visible" viewBox={`0 0 ${w} ${h}`} aria-hidden="true" style={{ opacity }}>
      {d.map((p, i) => (
        <path key={i} d={p.d} fill={color} opacity={p.opacity} />
      ))}
    </svg>
  );
}

function Framed({ as: Tag = 'div', seed, weight, double, className = '', children, color, hatchValue, frameOpacity, ...rest }) {
  const ref = useRef(null);
  const { w, h } = useSize(ref);
  return (
    <Tag ref={ref} className={`relative ${className}`} {...rest}>
      <InkFrame seed={seed} w={w} h={h} weight={weight} double={double} color={color} hatchValue={hatchValue} opacity={frameOpacity} />
      {children}
    </Tag>
  );
}

/* ---------------- card ---------------- */

export function HandCard({ title, children, className = '', seed = 'card', action = null, tight = false }) {
  return (
    <Framed seed={seed} weight={2.5} double className={`bg-paper/60 ${className}`}>
      <div className={tight ? 'p-3' : 'p-4 sm:p-5'}>
        {title && (
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <h2 className="font-hand text-[26px] leading-none tracking-tight">{title}</h2>
            {action}
          </div>
        )}
        {children}
      </div>
    </Framed>
  );
}

/* ---------------- button ---------------- */

export function HandButton({ children, onClick, tone = 'ink', size = 'md', disabled = false, className = '', seed, type = 'button', ...rest }) {
  const ref = useRef(null);
  const { w, h } = useSize(ref);
  const id = useId();
  const color = tone === 'red' ? '#b8382a' : '#191713';
  const pads = size === 'sm' ? 'px-3 py-1.5 text-[13px]' : size === 'lg' ? 'px-6 py-3 text-[17px]' : 'px-4 py-2 text-[15px]';
  return (
    <button
      ref={ref}
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`focusable press no-select relative font-sans font-semibold tracking-tight ${pads} ${
        disabled ? 'cursor-not-allowed opacity-40' : 'cursor-pointer hover:bg-[rgba(25,23,19,0.055)]'
      } ${className}`}
      style={{ color }}
      {...rest}
    >
      <InkFrame seed={seed || `btn${id}`} w={w} h={h} weight={2.1} overshoot={5} color={color} />
      <span className="relative">{children}</span>
    </button>
  );
}

/* ---------------- input ---------------- */

export function HandInput({ value, onChange, className = '', seed = 'input', ...rest }) {
  const ref = useRef(null);
  const { w, h } = useSize(ref);
  return (
    <div className="relative w-full">
      <InkFrame seed={seed} w={w} h={h} weight={1.7} overshoot={4} />
      <input
        ref={ref}
        value={value}
        onChange={onChange}
        className={`focusable relative w-full bg-transparent px-3 py-1.5 font-hand text-[22px] leading-tight text-ink placeholder:text-ink45 ${className}`}
        {...rest}
      />
    </div>
  );
}

/* ---------------- slider ---------------- */

export function HandSlider({ value, min, max, step = 1, onChange, label, format = (v) => v, id }) {
  const ref = useRef(null);
  const { w } = useSize(ref);
  const uid = useId();
  const inputId = id || `sl${uid}`;
  const t = (value - min) / (max - min || 1);
  const track = useMemo(() => {
    if (w < 20) return { line: '', tick: '' };
    const rng = makeRng(hashString(`slider${Math.round(w)}`));
    const line = mergePrims(stroke([P(6, 14), P(w * 0.5, 12.4), P(w - 6, 14)], { width: 2, rng, wob: 0.8, taperIn: 0.1, taperOut: 0.12 }));
    return { line };
  }, [Math.round(w)]);
  const knobX = 6 + t * (w - 12);
  const knob = useMemo(() => {
    const rng = makeRng(hashString(`knob${Math.round(knobX)}`));
    return mergePrims(loop(ellipsePoly(knobX, 13.4, 8.5, 8.5, 12), { width: 2.4, rng, wob: 0.7 }));
  }, [Math.round(knobX)]);

  return (
    <div className="w-full">
      <div className="mb-1 flex items-baseline justify-between">
        <label htmlFor={inputId} className="font-sans text-[12px] font-semibold uppercase tracking-[0.14em] text-ink70">
          {label}
        </label>
        <span className="font-hand text-[20px] leading-none">{format(value)}</span>
      </div>
      <div ref={ref} className="relative h-7 w-full">
        <svg className="pointer-events-none absolute inset-0 h-full w-full overflow-visible" viewBox={`0 0 ${Math.max(w, 1)} 28`} aria-hidden="true">
          {(track.line || []).map((p, i) => (
            <path key={`l${i}`} d={p.d} fill="#191713" opacity={p.opacity * 0.8} />
          ))}
          {knob.map((p, i) => (
            <path key={`k${i}`} d={p.d} fill="#191713" opacity={p.opacity} />
          ))}
        </svg>
        <input
          id={inputId}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="focusable absolute inset-0 h-full w-full cursor-pointer opacity-0"
        />
      </div>
    </div>
  );
}

/* ---------------- toggle ---------------- */

export function HandToggle({ checked, onChange, label, hint, seed = 'tog' }) {
  const uid = useId();
  const marks = useMemo(() => {
    const rng = makeRng(hashString(seed + (checked ? 'on' : 'off')));
    const prims = [
      ...handRect(3, 3, 46, 22, { rng, width: 1.9, overshoot: 4, wob: 0.9 }),
      ...loop(ellipsePoly(checked ? 38 : 15, 14, 9, 9, 12), { width: 2.2, rng, wob: 0.7 }),
    ];
    if (checked) prims.push(...hatch(ellipsePoly(38, 14, 8, 8, 12), { value: 0.75, rng, spacing: 2.6, width: 0.8 }));
    return mergePrims(prims);
  }, [checked, seed]);
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      id={uid}
      onClick={() => onChange(!checked)}
      className="focusable press no-select flex w-full items-center gap-3 text-left"
    >
      <svg width="52" height="28" viewBox="0 0 52 28" aria-hidden="true" className="shrink-0">
        {marks.map((p, i) => (
          <path key={i} d={p.d} fill={checked ? '#b8382a' : '#191713'} opacity={p.opacity} />
        ))}
      </svg>
      <span>
        <span className="block font-sans text-[14px] font-semibold leading-tight">{label}</span>
        {hint && <span className="block font-sans text-[12px] leading-snug text-ink70">{hint}</span>}
      </span>
    </button>
  );
}

/* ---------------- misc ink glyphs ---------------- */

export function InkX({ size = 14, color = '#b8382a' }) {
  const d = useMemo(() => {
    const rng = makeRng(hashString(`x${size}`));
    return mergePrims([
      ...stroke([P(2, 2), P(size - 2, size - 2)], { width: 2, rng, wob: 0.6 }),
      ...stroke([P(size - 2, 2), P(2, size - 2)], { width: 2, rng, wob: 0.6 }),
    ]);
  }, [size]);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
      {d.map((p, i) => (
        <path key={i} d={p.d} fill={color} opacity={p.opacity} />
      ))}
    </svg>
  );
}

export function InkArrow({ w = 90, h = 60, flip = false }) {
  const d = useMemo(() => {
    const rng = makeRng(hashString(`arrow${w}${h}${flip}`));
    const pts = [P(6, h - 6), P(w * 0.35, h * 0.35), P(w * 0.72, h * 0.62), P(w - 8, 8)];
    const prims = [
      ...stroke(pts, { width: 2.6, rng, wob: 1.1, taperIn: 0.25, taperOut: 0.1 }),
      ...stroke([P(w - 22, 10), P(w - 8, 8), P(w - 11, 22)], { width: 2.2, rng, wob: 0.8 }),
    ];
    return mergePrims(prims);
  }, [w, h, flip]);
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true" style={flip ? { transform: 'scaleX(-1)' } : undefined}>
      {d.map((p, i) => (
        <path key={i} d={p.d} fill="#191713" opacity={p.opacity} />
      ))}
    </svg>
  );
}

/** dashed hand-drawn drop zone */
export function InkDashed({ w, h, active }) {
  const d = useMemo(() => {
    if (w < 8 || h < 8) return [];
    const rng = makeRng(hashString(`dash${Math.round(w)}${Math.round(h)}`));
    const prims = [];
    const per = [
      [P(4, 4), P(w - 4, 4)],
      [P(w - 4, 4), P(w - 4, h - 4)],
      [P(w - 4, h - 4), P(4, h - 4)],
      [P(4, h - 4), P(4, 4)],
    ];
    for (const [a, b] of per) {
      const len = Math.hypot(b.x - a.x, b.y - a.y);
      const n = Math.max(2, Math.round(len / 13));
      for (let i = 0; i < n; i++) {
        const t0 = i / n;
        const t1 = t0 + 0.6 / n;
        prims.push(
          ...stroke(
            [P(a.x + (b.x - a.x) * t0, a.y + (b.y - a.y) * t0), P(a.x + (b.x - a.x) * t1, a.y + (b.y - a.y) * t1)],
            { width: 1.6, rng, wob: 0.5, taperIn: 0.3, taperOut: 0.3 }
          )
        );
      }
    }
    return mergePrims(prims);
  }, [Math.round(w), Math.round(h)]);
  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox={`0 0 ${Math.max(w, 1)} ${Math.max(h, 1)}`} aria-hidden="true">
      {d.map((p, i) => (
        <path key={i} d={p.d} fill={active ? '#b8382a' : '#191713'} opacity={p.opacity * (active ? 0.95 : 0.55)} />
      ))}
    </svg>
  );
}

export function useFramed() {
  const ref = useRef(null);
  const size = useSize(ref);
  return [ref, size];
}

export { Framed };
