import React, { useEffect, useRef } from 'react';
import { HandButton, HandInput, HandSlider, HandToggle, InkFrame, useSize, InkX } from './hand.jsx';

export default function SettingsDrawer({ open, onClose, settings, setSettings, onReink, reinkState, hasPanels }) {
  const ref = useRef(null);
  const { w, h } = useSize(ref);
  const panelRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    panelRef.current?.querySelector('button, input')?.focus();
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const set = (k) => (v) => setSettings((s) => ({ ...s, [k]: v }));

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-[rgba(25,23,19,0.5)]" onClick={onClose}>
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Studio settings"
        className="ink-scroll h-full w-full max-w-[420px] overflow-y-auto bg-paper p-1"
        onClick={(e) => e.stopPropagation()}
      >
        <div ref={ref} className="relative min-h-full">
          <InkFrame seed="drawer" w={w} h={h} weight={2.6} overshoot={8} />
          <div className="relative space-y-5 p-5">
            <div className="flex items-start justify-between">
              <h2 className="font-hand text-[32px] leading-none">Studio settings</h2>
              <button onClick={onClose} aria-label="Close settings" className="focusable press p-1">
                <InkX size={16} />
              </button>
            </div>

            <section className="space-y-3">
              <h3 className="font-sans text-[12px] font-bold uppercase tracking-[0.16em] text-ink70">When to draw</h3>
              <HandSlider
                label="Confidence threshold"
                min={0.3}
                max={0.98}
                step={0.01}
                value={settings.threshold}
                onChange={set('threshold')}
                format={(v) => `${Math.round(v * 100)}%`}
              />
              <HandSlider
                label="Hold-steady window"
                min={200}
                max={3000}
                step={100}
                value={settings.debounce}
                onChange={set('debounce')}
                format={(v) => `${v} ms`}
              />
              <p className="font-letter text-[14px] leading-snug text-ink45">
                A panel is inked when the top class changes, beats the threshold, and stays put for the whole window.
              </p>
            </section>

            <section className="space-y-3">
              <h3 className="font-sans text-[12px] font-bold uppercase tracking-[0.16em] text-ink70">The head</h3>
              <HandToggle
                seed="adv"
                checked={settings.advanced}
                onChange={set('advanced')}
                label="Advanced mode — train a dense head"
                hint="Off = k-nearest-neighbour on MobileNet features (instant). On = a small trained network."
              />
              {settings.advanced ? (
                <div className="space-y-3 pl-1">
                  <HandSlider label="Epochs" min={10} max={50} step={1} value={settings.epochs} onChange={set('epochs')} />
                  <HandSlider label="Batch size" min={4} max={64} step={4} value={settings.batchSize} onChange={set('batchSize')} />
                  <HandSlider
                    label="Learning rate"
                    min={-4}
                    max={-2}
                    step={0.1}
                    value={Math.log10(settings.learningRate)}
                    onChange={(v) => set('learningRate')(parseFloat(Math.pow(10, v).toPrecision(2)))}
                    format={(v) => Math.pow(10, v).toPrecision(2)}
                  />
                </div>
              ) : (
                <HandSlider label="Neighbours (k)" min={1} max={10} step={1} value={settings.k} onChange={set('k')} />
              )}
            </section>

            <section className="space-y-3">
              <h3 className="font-sans text-[12px] font-bold uppercase tracking-[0.16em] text-ink70">Optional: bring your own key</h3>
              <p className="font-letter text-[15px] leading-snug text-ink70">
                Everything above works with no key at all — captions come from a built-in writers' room. Paste an
                OpenAI-compatible key and the artist will write fresher lines, and can re-ink your exported strip at high
                fidelity. The key is stored on this device only and never leaves your browser except to the endpoint you name.
              </p>
              <HandInput
                seed="key"
                type="password"
                placeholder="sk-…"
                aria-label="API key"
                value={settings.apiKey}
                onChange={(e) => set('apiKey')(e.target.value)}
              />
              <HandInput
                seed="base"
                placeholder="https://api.openai.com/v1"
                aria-label="API base URL"
                value={settings.baseUrl}
                onChange={(e) => set('baseUrl')(e.target.value)}
              />
              <HandToggle seed="llmcap" checked={settings.llmCaptions} onChange={set('llmCaptions')} label="Use the key for live captions" hint="One short request per panel." />
              <HandButton size="sm" disabled={!settings.apiKey || !hasPanels || reinkState === 'working'} onClick={onReink}>
                {reinkState === 'working' ? 're-inking…' : 'Re-ink this strip in high fidelity'}
              </HandButton>
              {reinkState && reinkState !== 'working' && <p className="font-letter text-[14px] text-ink70">{reinkState}</p>}
            </section>

            <section className="space-y-3">
              <h3 className="font-sans text-[12px] font-bold uppercase tracking-[0.16em] text-ink70">Studio</h3>
              <HandToggle seed="mir" checked={settings.mirrored} onChange={set('mirrored')} label="Mirror the camera" />
              <HandToggle seed="autos" checked={settings.autoStrip} onChange={set('autoStrip')} label="Auto-append panels to the strip" hint="Off = only the big panel updates." />
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
