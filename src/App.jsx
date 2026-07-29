import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Logo from './components/Logo.jsx';
import { HandButton, HandCard, InkFrame, useSize, InkArrow } from './components/hand.jsx';
import ClassCard, { MAX_SAMPLES } from './components/ClassCard.jsx';
import CameraStage from './components/CameraStage.jsx';
import PanelStage from './components/PanelStage.jsx';
import Filmstrip from './components/Filmstrip.jsx';
import DebugStrip from './components/DebugStrip.jsx';
import SettingsDrawer from './components/SettingsDrawer.jsx';
import HintRibbon from './components/HintRibbon.jsx';
import TrainChart from './components/TrainChart.jsx';
import { buildPanel, buildIdlePanel } from './artist/panel.js';
import { CAPTION_LINE_COUNT } from './artist/captions.js';
import * as engine from './ml/engine.js';
import { panelToDataURL } from './lib/raster.js';
import { exportStripPNG, exportComicPDF } from './lib/exporters.js';
import { idbGet, idbSet, lsGet, lsSet, serialiseClasses, deserialiseClasses } from './lib/storage.js';
import { llmCaption, llmPanelImage, loadImage } from './lib/llm.js';

const CAPTURE = 224;
const MIN_SAMPLES = 5;
const PREDICT_INTERVAL = 200; // 5 predictions / second
const RECORD_INTERVAL = 125; // ~8 frames / second

const DEFAULT_SETTINGS = {
  threshold: 0.7,
  debounce: 800,
  advanced: false,
  epochs: 20,
  batchSize: 16,
  learningRate: 0.001,
  k: 3,
  apiKey: '',
  baseUrl: 'https://api.openai.com/v1',
  llmCaptions: false,
  mirrored: true,
  autoStrip: true,
};

let uid = 0;
const nextId = () => `${Date.now().toString(36)}${(uid++).toString(36)}`;

function newClass(name = '') {
  return { id: nextId(), name, samples: [] };
}

function drawToCapture(canvas, source, mirrored) {
  const sw = source.videoWidth || source.naturalWidth || source.width;
  const sh = source.videoHeight || source.naturalHeight || source.height;
  if (!sw || !sh) return false;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const side = Math.min(sw, sh);
  const sx = (sw - side) / 2;
  const sy = (sh - side) / 2;
  ctx.save();
  if (mirrored) {
    ctx.translate(CAPTURE, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(source, sx, sy, side, side, 0, 0, CAPTURE, CAPTURE);
  ctx.restore();
  return true;
}

function makeThumb(captureCanvas) {
  const c = document.createElement('canvas');
  c.width = 56;
  c.height = 56;
  c.getContext('2d').drawImage(captureCanvas, 0, 0, 56, 56);
  return c.toDataURL('image/jpeg', 0.62);
}

export default function App() {
  /* ------------------------------------------------ state */
  const [classes, setClasses] = useState(() => [newClass('mug'), newClass('thumbs up')]);
  const [settings, setSettings] = useState(() => ({ ...DEFAULT_SETTINGS, ...(lsGet('cc.settings') || {}) }));
  const [modelState, setModelState] = useState('loading');
  const [loadNote, setLoadNote] = useState('waking the studio');
  const [trained, setTrained] = useState(false);
  const [training, setTraining] = useState(false);
  const [trainHistory, setTrainHistory] = useState([]);
  const [scores, setScores] = useState({});
  const [panel, setPanel] = useState(null);
  const [entries, setEntries] = useState([]);
  const [thumbs, setThumbs] = useState({});
  const [recordingId, setRecordingId] = useState(null);
  const [cameraState, setCameraState] = useState('idle');
  const [cameraError, setCameraError] = useState('');
  const [stillSrc, setStillSrc] = useState(null);
  const [source, setSource] = useState('camera');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showHints, setShowHints] = useState(true);
  const [fps, setFps] = useState(0);
  const [latency, setLatency] = useState(0);
  const [busyExport, setBusyExport] = useState(null);
  const [reinkState, setReinkState] = useState(null);
  const [toast, setToast] = useState(null);
  const [restored, setRestored] = useState(false);

  /* ------------------------------------------------ refs */
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const stillImgRef = useRef(null);
  const captureRef = useRef(null);
  const reinkImages = useRef({});
  const loop = useRef({});
  const stable = useRef({ label: null, since: 0 });
  const lastAppended = useRef(null);
  const panelCounter = useRef(0);
  const historyRef = useRef([]);

  if (!captureRef.current && typeof document !== 'undefined') {
    const c = document.createElement('canvas');
    c.width = CAPTURE;
    c.height = CAPTURE;
    captureRef.current = c;
  }

  const flash = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast((t) => (t === msg ? null : t)), 3600);
  }, []);

  /* ------------------------------------------------ model load */
  useEffect(() => {
    let alive = true;
    engine
      .loadBackbone((n) => alive && setLoadNote(n))
      .then(() => alive && setModelState('ready'))
      .catch((e) => {
        console.error(e);
        if (alive) {
          setModelState('error');
          setLoadNote(e.message || 'the model would not load');
        }
      });
    return () => {
      alive = false;
    };
  }, []);

  /* ------------------------------------------------ restore session */
  useEffect(() => {
    (async () => {
      const saved = await idbGet('session');
      if (saved?.classes?.length) {
        const cls = deserialiseClasses(saved.classes);
        if (cls) {
          setClasses(cls);
          setRestored(true);
        }
        if (saved.entries?.length) {
          setEntries(saved.entries);
          panelCounter.current = Math.max(...saved.entries.map((e) => e.panelIndex)) + 1;
          historyRef.current = saved.entries.map((e) => e.label);
        }
      }
    })();
  }, []);

  useEffect(() => {
    lsSet('cc.settings', { ...settings, apiKey: settings.apiKey });
  }, [settings]);

  // persist (debounced)
  useEffect(() => {
    const t = setTimeout(() => {
      idbSet('session', { classes: serialiseClasses(classes), entries, ts: Date.now() });
    }, 900);
    return () => clearTimeout(t);
  }, [classes, entries]);

  /* ------------------------------------------------ thumbnails for the strip */
  useEffect(() => {
    const missing = entries.filter((e) => !thumbs[e.panelIndex]);
    if (!missing.length) return;
    let cancelled = false;
    const id = setTimeout(() => {
      const next = {};
      for (const e of missing) {
        try {
          next[e.panelIndex] = panelToDataURL(
            buildPanel({
              label: e.label,
              confidence: e.confidence,
              allScores: e.allScores,
              panelIndex: e.panelIndex,
              history: e.history,
              threshold: e.threshold,
              caption: e.captionOverride,
            }),
            220
          );
        } catch (err) {
          console.warn('thumb failed', err);
        }
      }
      if (!cancelled) setThumbs((t) => ({ ...t, ...next }));
    }, 30);
    return () => {
      cancelled = true;
      clearTimeout(id);
    };
  }, [entries, thumbs]);

  /* ------------------------------------------------ camera */
  const startCamera = useCallback(async () => {
    setCameraError('');
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraState('unavailable');
      setCameraError('This browser exposes no camera API.');
      return;
    }
    setCameraState('starting');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' }, audio: false });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setCameraState('live');
      setSource('camera');
    } catch (e) {
      streamRef.current = null;
      setCameraState(e?.name === 'NotFoundError' || e?.name === 'OverconstrainedError' ? 'unavailable' : 'denied');
      setCameraError(e?.message || String(e));
    }
  }, []);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraState('idle');
  }, []);

  useEffect(() => () => streamRef.current?.getTracks().forEach((t) => t.stop()), []);

  const pickFile = useCallback((file) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      stillImgRef.current = img;
      setStillSrc(url);
      setSource('still');
    };
    img.onerror = () => flash('that file would not open as an image');
    img.src = url;
  }, [flash]);

  const clearStill = useCallback(() => {
    stillImgRef.current = null;
    setStillSrc(null);
    setSource(streamRef.current ? 'camera' : 'camera');
  }, []);

  const activeSource = useCallback(() => {
    if (source === 'still' && stillImgRef.current) return stillImgRef.current;
    if (cameraState === 'live' && videoRef.current?.videoWidth) return videoRef.current;
    return null;
  }, [source, cameraState]);

  /* ------------------------------------------------ samples */
  const addSampleFromCapture = useCallback((classId) => {
    const cvs = captureRef.current;
    const src = activeSource();
    if (!src || !engine.isReady()) return false;
    if (!drawToCapture(cvs, src, source === 'camera' && settings.mirrored)) return false;
    const emb = engine.embed(cvs);
    const thumb = makeThumb(cvs);
    setClasses((cs) =>
      cs.map((c) => (c.id === classId && c.samples.length < MAX_SAMPLES ? { ...c, samples: [...c.samples, { id: nextId(), thumb, emb }] } : c))
    );
    return true;
  }, [activeSource, source, settings.mirrored]);

  const addFiles = useCallback(
    async (classId, files) => {
      if (!engine.isReady()) return flash('the artist is still sharpening his pens…');
      const cvs = captureRef.current;
      const added = [];
      for (const f of files.slice(0, 60)) {
        try {
          const url = URL.createObjectURL(f);
          // eslint-disable-next-line no-await-in-loop
          const img = await loadImage(url).catch(() => null);
          if (!img) continue;
          drawToCapture(cvs, img, false);
          added.push({ id: nextId(), thumb: makeThumb(cvs), emb: engine.embed(cvs) });
          URL.revokeObjectURL(url);
        } catch (e) {
          console.warn(e);
        }
      }
      if (!added.length) return flash('none of those files could be read');
      setClasses((cs) => cs.map((c) => (c.id === classId ? { ...c, samples: [...c.samples, ...added].slice(0, MAX_SAMPLES) } : c)));
      return flash(`${added.length} sample${added.length === 1 ? '' : 's'} added`);
    },
    [flash]
  );

  const deleteSample = useCallback((classId, sampleId) => {
    setClasses((cs) => cs.map((c) => (c.id === classId ? { ...c, samples: c.samples.filter((s) => s.id !== sampleId) } : c)));
  }, []);

  const renameClass = useCallback((id, name) => setClasses((cs) => cs.map((c) => (c.id === id ? { ...c, name } : c))), []);
  const removeClass = useCallback((id) => setClasses((cs) => (cs.length <= 2 ? cs.map((c) => (c.id === id ? { ...c, samples: [] } : c)) : cs.filter((c) => c.id !== id))), []);
  const addClass = useCallback(() => setClasses((cs) => (cs.length >= 6 ? cs : [...cs, newClass('')])), []);

  /* ------------------------------------------------ training */
  const readyClasses = classes.filter((c) => c.samples.length >= MIN_SAMPLES);
  const canTrain = readyClasses.length >= 2 && modelState === 'ready';

  const train = useCallback(async () => {
    if (!canTrain) return;
    setTraining(true);
    setTrainHistory([]);
    try {
      engine.syncKnn(readyClasses);
      if (settings.advanced) {
        await engine.trainDense(readyClasses, {
          epochs: settings.epochs,
          batchSize: settings.batchSize,
          learningRate: settings.learningRate,
          onEpochEnd: (_p, hist) => setTrainHistory([...hist]),
        });
      } else {
        engine.disposeDense();
      }
      setTrained(true);
      stable.current = { label: null, since: 0 };
      lastAppended.current = null;
      flash(settings.advanced ? 'dense head trained — the artist is awake' : 'the artist has memorised your samples');
    } catch (e) {
      console.error(e);
      flash(`training failed: ${e.message}`);
    } finally {
      setTraining(false);
    }
  }, [canTrain, readyClasses, settings, flash]);

  // keep the KNN dataset fresh when samples change after training
  useEffect(() => {
    if (trained && !settings.advanced) engine.syncKnn(classes.filter((c) => c.samples.length >= MIN_SAMPLES));
  }, [classes, trained, settings.advanced]);

  /* ------------------------------------------------ panel creation */
  const appendPanel = useCallback(
    (label, confidence, allScores) => {
      const panelIndex = panelCounter.current++;
      historyRef.current = [...historyRef.current, label].slice(-40);
      const entry = {
        panelIndex,
        label,
        confidence,
        allScores,
        history: [...historyRef.current],
        threshold: loop.current.settings.threshold,
        t: Date.now(),
      };
      const built = buildPanel(entry);
      setPanel(built);
      if (loop.current.settings.autoStrip) setEntries((es) => [...es, entry].slice(-40));

      const { apiKey, llmCaptions, baseUrl } = loop.current.settings;
      if (apiKey && llmCaptions) {
        llmCaption({ apiKey, baseUrl, label, confidence, history: entry.history })
          .then((caption) => {
            if (!caption) return;
            const withCaption = { ...entry, captionOverride: caption };
            setPanel((p) => (p?.meta?.panelIndex === panelIndex ? buildPanel({ ...withCaption, caption }) : p));
            setEntries((es) => es.map((e) => (e.panelIndex === panelIndex ? withCaption : e)));
            setThumbs((t) => {
              const n = { ...t };
              delete n[panelIndex];
              return n;
            });
          })
          .catch((e) => flash(`caption service: ${e.message}`));
      }
    },
    [flash]
  );

  /* ------------------------------------------------ the loop */
  loop.current = { classes, settings, trained, recordingId, addSampleFromCapture, appendPanel, activeSource, source };

  useEffect(() => {
    let raf = 0;
    let lastPredict = 0;
    let lastRecord = 0;
    let frames = 0;
    let fpsMark = performance.now();
    let busy = false;

    const tick = async () => {
      raf = requestAnimationFrame(tick);
      const now = performance.now();
      frames++;
      if (now - fpsMark > 1000) {
        setFps((frames * 1000) / (now - fpsMark));
        frames = 0;
        fpsMark = now;
      }
      const L = loop.current;

      if (L.recordingId && now - lastRecord >= RECORD_INTERVAL) {
        lastRecord = now;
        L.addSampleFromCapture(L.recordingId);
      }

      if (!busy && L.trained && now - lastPredict >= PREDICT_INTERVAL) {
        lastPredict = now;
        const src = L.activeSource();
        if (!src) return;
        busy = true;
        const t0 = performance.now();
        try {
          const cvs = captureRef.current;
          if (!drawToCapture(cvs, src, L.source === 'camera' && L.settings.mirrored)) return;
          const emb = engine.embed(cvs);
          let confidences = null;
          if (L.settings.advanced && engine.hasDense()) {
            confidences = engine.densePredict(emb)?.confidences || null;
          } else {
            const res = await engine.knnPredict(emb, L.settings.k);
            confidences = res?.confidences || null;
          }
          if (!confidences) return;
          setLatency(performance.now() - t0);
          setScores(confidences);

          const ranked = Object.entries(confidences)
            .map(([id, score]) => ({ id, score, label: L.classes.find((c) => c.id === id)?.name || 'unnamed' }))
            .sort((a, b) => b.score - a.score);
          const top = ranked[0];
          if (!top) return;
          if (stable.current.label !== top.id) stable.current = { label: top.id, since: now };
          const heldFor = now - stable.current.since;
          if (
            top.score >= L.settings.threshold &&
            heldFor >= L.settings.debounce &&
            lastAppended.current !== top.id
          ) {
            lastAppended.current = top.id;
            L.appendPanel(top.label || 'unnamed', top.score, ranked.map(({ label, score }) => ({ label, score })));
          }
        } catch (e) {
          console.warn('predict failed', e);
        } finally {
          busy = false;
        }
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  /* ------------------------------------------------ exports */
  const doExportPNG = async () => {
    setBusyExport('png');
    try {
      await document.fonts?.ready;
      await exportStripPNG(entries, { images: reinkImages.current });
      flash('strip saved as PNG');
    } catch (e) {
      flash(`export failed: ${e.message}`);
    } finally {
      setBusyExport(null);
    }
  };

  const doExportPDF = async () => {
    setBusyExport('pdf');
    try {
      await document.fonts?.ready;
      await exportComicPDF(entries, classes.filter((c) => c.samples.length).map((c) => c.name || 'unnamed'), { images: reinkImages.current });
      flash('comic book saved as PDF');
    } catch (e) {
      flash(`export failed: ${e.message}`);
    } finally {
      setBusyExport(null);
    }
  };

  const doReink = async () => {
    setReinkState('working');
    let ok = 0;
    for (const e of entries.slice(-8)) {
      try {
        const built = buildPanel(e);
        // eslint-disable-next-line no-await-in-loop
        const url = await llmPanelImage({
          apiKey: settings.apiKey,
          baseUrl: settings.baseUrl,
          label: e.label,
          caption: e.captionOverride || built.meta?.caption || '',
        });
        // eslint-disable-next-line no-await-in-loop
        reinkImages.current[e.panelIndex] = await loadImage(url);
        ok++;
        setReinkState(`re-inked ${ok}/${Math.min(entries.length, 8)}…`);
      } catch (err) {
        setReinkState(`stopped: ${err.message}`);
        return;
      }
    }
    setReinkState(`${ok} panels re-inked — they will be used in the next export.`);
  };

  const newPage = () => {
    setEntries([]);
    setThumbs({});
    setPanel(null);
    reinkImages.current = {};
    historyRef.current = [];
    panelCounter.current = 0;
    lastAppended.current = null;
    flash('fresh page');
  };

  const resetAll = () => {
    newPage();
    setClasses([newClass('mug'), newClass('thumbs up')]);
    setTrained(false);
    setTrainHistory([]);
    engine.disposeDense();
    engine.syncKnn([]);
    setScores({});
  };

  /* ------------------------------------------------ derived */
  const totalSamples = classes.reduce((a, c) => a + c.samples.length, 0);
  const hintStep = totalSamples === 0 ? (classes.some((c) => c.name) ? 2 : 1) : trained ? 3 : 2;
  const topId = useMemo(() => Object.entries(scores).sort((a, b) => b[1] - a[1])[0]?.[0], [scores]);
  const idlePanel = useMemo(
    () => (totalSamples === 0 ? buildIdlePanel('blank') : buildIdlePanel('sleeping')),
    [totalSamples === 0]
  );

  const headerRef = useRef(null);
  const headerSize = useSize(headerRef);

  return (
    <div className="min-h-screen">
      <div className="paper-bg" />
      <svg className="paper-grain" aria-hidden="true">
        <filter id="grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
          <feComponentTransfer>
            <feFuncA type="linear" slope="0.14" />
          </feComponentTransfer>
        </filter>
        <rect width="100%" height="100%" filter="url(#grain)" />
      </svg>

      {/* ---------------- header ---------------- */}
      <header ref={headerRef} className="relative mx-auto max-w-[1500px] px-4 pt-5 sm:px-7">
        <InkFrame seed="hdr" w={headerSize.w - 32} h={headerSize.h - 20} weight={0} />
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex items-start gap-3">
            <Logo size={44} className="wiggle mt-1 shrink-0" />
            <div>
              <h1 className="font-hand text-[40px] leading-[0.95] sm:text-[52px]">Comic Classifier</h1>
              <p className="font-letter text-[17px] leading-tight text-ink70">
                Teach-a-machine, see-a-comic — an artist agent draws every guess your model makes.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-1 font-letter text-[14px] text-ink45">
              {modelState === 'ready' ? 'runs entirely on this device' : modelState === 'error' ? 'model offline' : `${loadNote}…`}
            </span>
            <HandButton size="sm" onClick={newPage}>
              New page
            </HandButton>
            <HandButton size="sm" onClick={() => setSettingsOpen(true)}>
              Settings
            </HandButton>
          </div>
        </div>
        <div className="mt-3 h-[2px] w-full" style={{ background: 'repeating-linear-gradient(90deg, rgba(25,23,19,0.55) 0 22px, transparent 22px 30px)' }} />
      </header>

      {/* ---------------- body ---------------- */}
      <main className="mx-auto max-w-[1500px] space-y-4 px-4 py-4 sm:px-7">
        {showHints && <HintRibbon step={hintStep} onDismiss={() => setShowHints(false)} />}

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(330px,380px)_1fr]">
          {/* ---- left: character sheets ---- */}
          <section className="space-y-3">
            <HandCard
              seed="classes"
              title="Character sheets"
              action={
                <HandButton size="sm" disabled={classes.length >= 6} onClick={addClass}>
                  + class
                </HandButton>
              }
            >
              <div className="space-y-3">
                {classes.map((c, i) => (
                  <ClassCard
                    key={c.id}
                    cls={c}
                    index={i}
                    score={scores[c.id] || 0}
                    isTop={topId === c.id && trained}
                    recording={recordingId === c.id}
                    canRecord={!!activeSource() && modelState === 'ready'}
                    onRename={renameClass}
                    onRemove={removeClass}
                    onFiles={addFiles}
                    onRecordStart={setRecordingId}
                    onRecordStop={() => setRecordingId(null)}
                    onDeleteSample={deleteSample}
                    onSnap={(id) => {
                      if (!addSampleFromCapture(id)) flash('point the lens at something first');
                    }}
                  />
                ))}
              </div>

              <div className="mt-4 space-y-2">
                <HandButton size="lg" tone={canTrain ? 'red' : 'ink'} disabled={!canTrain || training} onClick={train} className="w-full">
                  {training ? 'training…' : trained ? 'Re-train' : 'Train the machine'}
                </HandButton>
                <p className="font-letter text-[15px] leading-snug text-ink70">
                  {modelState === 'loading'
                    ? `${loadNote}…`
                    : canTrain
                    ? settings.advanced
                      ? `${settings.epochs} epochs on ${totalSamples} samples, in this tab.`
                      : `${readyClasses.length} classes · ${totalSamples} samples ready.`
                    : `Each class needs at least ${MIN_SAMPLES} samples, and you need two classes.`}
                </p>
                {settings.advanced && trainHistory.length > 0 && <TrainChart history={trainHistory} epochs={settings.epochs} />}
              </div>
            </HandCard>

            <div className="hidden lg:block">
              <HandCard seed="about" tight>
                <p className="font-letter text-[15px] leading-snug text-ink70">
                  No photos leave this browser. MobileNet does the seeing, a {settings.advanced ? 'dense head' : 'k-NN head'} does the
                  deciding, and a procedural pen-and-ink artist does the drawing — {CAPTION_LINE_COUNT}+ built-in caption lines, no
                  API key required.
                </p>
              </HandCard>
            </div>
          </section>

          {/* ---- right: lens, panel ---- */}
          <section className="space-y-4">
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(300px,400px)_1fr]">
              <div className="space-y-3">
                <CameraStage
                  videoRef={videoRef}
                  cameraState={cameraState}
                  error={cameraError}
                  onStart={startCamera}
                  onStop={stopCamera}
                  stillSrc={stillSrc}
                  source={source}
                  onPickFile={pickFile}
                  onClearStill={clearStill}
                  mirrored={settings.mirrored}
                  onToggleMirror={() => setSettings((s) => ({ ...s, mirrored: !s.mirrored }))}
                />
                <DebugStrip
                  scores={scores}
                  classes={classes}
                  fps={fps}
                  backend={engine.memoryInfo ? 'tfjs' : '—'}
                  numTensors={engine.memoryInfo().numTensors}
                  mode={settings.advanced ? 'dense head' : `knn k=${settings.k}`}
                  lastLatency={latency}
                />
              </div>

              <div className="relative">
                <PanelStage
                  panel={panel || (trained ? null : idlePanel)}
                  loading={modelState === 'loading' && !panel}
                  badge={
                    panel && (
                      <p className="px-3 pb-1 font-letter text-[15px] text-ink70">
                        panel #{(panel.meta?.panelIndex ?? 0) + 1} · {panel.meta?.label} · {Math.round((panel.meta?.confidence || 0) * 100)}%
                        {panel.meta?.confused ? ' · the artist is unsure' : ''}
                      </p>
                    )
                  }
                />
                {!trained && totalSamples === 0 && (
                  <div className="pointer-events-none absolute -left-2 bottom-16 hidden lg:block">
                    <InkArrow w={110} h={70} flip />
                  </div>
                )}
              </div>
            </div>

            <Filmstrip
              entries={entries}
              thumbs={thumbs}
              busy={busyExport}
              onClear={newPage}
              onExportPNG={doExportPNG}
              onExportPDF={doExportPDF}
            />
          </section>
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-3 pb-8 pt-1">
          <p className="font-letter text-[15px] text-ink45">
            Built with TensorFlow.js in the browser · drawings generated procedurally, one nib stroke at a time.
          </p>
          <button onClick={resetAll} className="focusable font-letter text-[15px] text-ink45 underline decoration-dotted underline-offset-4">
            reset everything
          </button>
        </footer>
      </main>

      <SettingsDrawer
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        setSettings={setSettings}
        onReink={doReink}
        reinkState={reinkState}
        hasPanels={entries.length > 0}
      />

      {toast && (
        <div className="pointer-events-none fixed bottom-5 left-1/2 z-50 -translate-x-1/2">
          <div className="relative bg-paper px-4 py-2">
            <ToastFrame />
            <p className="relative font-hand text-[22px] leading-none">{toast}</p>
          </div>
        </div>
      )}

      {restored && (
        <span className="sr-only" role="status">
          previous session restored
        </span>
      )}
    </div>
  );
}

function ToastFrame() {
  const ref = useRef(null);
  const { w, h } = useSize(ref);
  return (
    <span ref={ref} className="absolute inset-0 block">
      <InkFrame seed="toast" w={w} h={h} weight={2} overshoot={6} />
    </span>
  );
}
