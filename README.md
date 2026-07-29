# Comic Classifier

**Teach a machine, see a comic.**

Train an image classifier in your browser from webcam frames or dropped images — then, instead of confidence bars, an "artist agent" draws every prediction as a pen-and-ink comic panel, live. A session becomes a little black-and-white story of what the camera saw, which you can export as a stitched PNG or a multi-page comic book PDF.

Built as a STEAM / AI-literacy teaching tool: the machine learning is real and inspectable, but the visible output is a drawing, not a number.

Nothing leaves the browser. MobileNet and the classifier both run client-side, and no image is ever uploaded.

---

## Quick start

Requires **Node 18+** (developed on Node 20).

```bash
git clone <your-repo-url>
cd comic-classifier
npm install
npm run dev
```

Vite prints a local URL (usually `http://localhost:5173`). Open it in Chrome or Edge.

First load downloads MobileNet weights (~2 MB) from the TensorFlow.js CDN, so the very first run needs a network connection. Everything after that is local.

### Build

```bash
npm run build     # outputs static files to dist/
npm run preview   # serve the production build locally
```

`dist/` is a fully static bundle — drop it on GitHub Pages, Netlify, S3, or any static host. `vite.config.js` sets `base: './'` so it works from a subdirectory without changes.

### Camera notes

`getUserMedia` requires a secure context. `localhost` counts as secure, so `npm run dev` works, but a deployed copy must be served over **HTTPS**. If the camera is blocked or unavailable, the app stays fully usable — you can train *and* predict from uploaded images instead.

---

## How to use it

1. **Name your classes.** Two to six of them, on the "character sheets" panel. Anything the camera can see: `mug` and `hand`, `cat` and `lamp`, `me` and `empty desk`.
2. **Collect samples.** Hold *Hold to record* to grab webcam frames at roughly 8/sec, tap *Snap 1* for a single frame, or drop image files onto the card. Five samples per class is the minimum; twenty or so is much better. Move around a little while recording.
3. **Train.** Instant in the default k-NN mode. Advanced mode fits a small dense head and plots loss/accuracy per epoch.
4. **Watch it draw.** Point the camera. Every confident prediction that holds steady becomes an inked panel with a caption.
5. **Export.** *Export PNG* stitches the strip into one page; *Export comic book (PDF)* makes a multi-page book with a cast-of-characters cover.

The **artist's notebook** strip is a collapsible debug view (collapsed by default) showing the raw label, per-class confidences, and inference FPS — useful when you want students to see the numbers behind the drawing.

---

## How it works

### The machine learning — `src/ml/engine.js`

MobileNet v2 (`alpha=0.5`) is used purely as a **frozen feature extractor**. Every captured frame is drawn to a hidden 224×224 canvas and pushed through the network to produce a 1280-dimensional embedding.

Two heads sit on top of those embeddings:

- **k-NN (default).** `@tensorflow-models/knn-classifier`, `k=3`. "Training" is just storing embeddings, so it is instant and needs no GPU — which is the right feel for a classroom demo where you retrain constantly.
- **Dense head (advanced mode).** A `tf.sequential` model — dense 100 ReLU → dense `numClasses` softmax — fitted with adjustable epochs, batch size, and learning rate, reporting real per-epoch loss and accuracy.

Embeddings live in plain `Float32Array`s in React state; tensors exist only for the duration of an inference call, which keeps TF.js memory flat across a long session. Deleting a sample rebuilds the k-NN dataset from the surviving embeddings.

The live loop runs on `requestAnimationFrame` throttled to about 5 predictions/sec.

### The artist agent — `src/artist/`

This is the distinctive half of the project, and it is fully procedural: **no image-generation API is involved in the default path.** Panels are composed and drawn from scratch every time.

| File | Role |
| --- | --- |
| `prng.js` | `mulberry32` seeded PRNG plus 1-D value noise for pen tremor. Seeds derive from class name + panel index, so a panel is reproducible. |
| `ink.js` | The nib engine. Every mark is a **filled** path, not a constant-width stroke — a spine is jittered, resampled, and offset along its normals by a pressure profile, which is what stops it looking like clipart. Also provides cross-hatch region fills at multiple angles and stipple/halftone scatter. |
| `motifs.js` | Fifteen hand-authored subject generators (cat, dog, face, hand, desk, mug, book, phone, plant, food, box, lamp, car, bottle, mystery), written in unit space and parameterised by the rng. Class names are fuzzy-matched to a motif via keyword lists plus edit distance, with a question-marked `mystery` fallback. |
| `narrator.js` | The recurring character — a noodle-limbed ink person in a beret holding a dip pen. Seven poses (pointing, shrugging, startled, delighted, scratching, asleep, saluting), chosen from confidence and whether the class just changed. Drawn with the same nib helpers so he never looks pasted in. |
| `captions.js` | The built-in wit. Caption pools keyed by motif category, confidence band, and narrative context — first sighting, returning class ("You again."), rapid flapping ("Slow down.") — with a seeded picker that avoids repeating a line back to back. 150+ lines total, no API key ever required. |
| `panel.js` | Composition. `buildPanel({ label, confidence, allScores, panelIndex, history, threshold })` returns `{ w, h, rotation, prims, texts, meta }` — background wash and hatching, subject, narrator, hand-drawn irregular border, caption box and speech bubble. Also builds the two idle panels (narrator asleep; blank page with an arrow). |

Panels are described as pure path data plus text runs, so the *same* description feeds the live SVG view in the DOM, the filmstrip thumbnails, and the PNG/PDF rasteriser (`src/lib/raster.js`). Text is drawn with `fillText` rather than embedded in SVG so the hand-lettered fonts survive rasterisation.

**The confused panel.** When the top two confidences are within 0.15, or the top confidence falls below the threshold, the artist renders the narrator scratching his head over two faint overlapping ghost sketches of the candidate motifs, captioned `???`. Low confidence produces a *drawing* about uncertainty rather than a small number.

### Panel gating

A new panel is appended only when all three conditions hold: the top prediction **changed**, its confidence clears the **threshold** (default 0.7, adjustable), and the new class stays on top through a **debounce window** (default 800 ms, adjustable). Without this the strip flickers uselessly.

### Optional AI mode — `src/lib/llm.js`

The settings drawer accepts an OpenAI-compatible API key, kept **in memory for the session only** and used for exactly two things:

- **Wittier captions** — an LLM writes a sub-12-word caption with the panel history as context for continuity.
- **High-fidelity re-ink** — image generation against a locked style prompt (`pen and ink comic panel, black and white, cross-hatching, hand-drawn border, single panel, subject: {label}, caption: '{caption}', no color, no photorealism`), applied to the **exported** strip rather than the live loop, because of latency and cost.

If no key is supplied, nothing degrades. The built-in caption engine and procedural renderer are the intended default experience, not a fallback.

---

## Project layout

```
src/
  App.jsx              app state, capture + prediction loops, panel gating
  main.jsx             entry point
  index.css            paper texture, ink tokens, Tailwind layers
  ml/engine.js         MobileNet backbone, k-NN head, dense head
  artist/
    prng.js            seeded rng + value noise
    ink.js             nib strokes, cross-hatching, stipple
    motifs.js          15 subject generators + fuzzy label matching
    narrator.js        the recurring character, 7 poses
    captions.js        150+ built-in caption lines
    panel.js           panel composition
  components/
    hand.jsx           hand-drawn UI primitives (buttons, inputs, frames, sliders)
    ClassCard.jsx      a "character sheet"
    CameraStage.jsx    webcam / still-image source + permission handling
    PanelStage.jsx     the large live panel
    Filmstrip.jsx      the running comic strip
    DebugStrip.jsx     collapsible raw-numbers view
    TrainChart.jsx     loss/accuracy plot for advanced mode
    SettingsDrawer.jsx thresholds, debounce, advanced mode, optional API key
    HintRibbon.jsx     dismissible 3-step onboarding
    Logo.jsx           inline SVG mark
  lib/
    raster.js          paint a panel model onto a 2-D canvas
    exporters.js       stitched PNG page + multi-page comic-book PDF
    llm.js             optional LLM caption + image-gen calls
    storage.js         in-memory session store
  shims/               no-op stubs for TF.js browser-storage model IO
public/fonts/          self-hosted Caveat, Patrick Hand, Rock Salt, Archivo
scripts/
  fetch-fonts.mjs      re-download and self-host the Google Fonts subsets
  render-preview.mjs   render sample panels headlessly for QA
```

### The `shims/` folder

`vite.config.js` installs a small plugin that redirects `@tensorflow/tfjs-core`'s `indexed_db` and `local_storage` model-IO handlers to no-op stubs. TF.js imports them unconditionally to register its save/load routers, but this app never saves models to browser storage — and some sandboxed embedding contexts forbid those APIs outright. Removing them also trims the bundle. If you want TF.js model persistence, delete the plugin and the shims.

### Session state

Session state is deliberately **in-memory only** (`src/lib/storage.js` keeps the async API shape but backs it with a `Map`), so a refresh starts a clean page. `serialiseClasses` / `deserialiseClasses` are already written against the embedding format, so swapping in IndexedDB for real persistence is a small change confined to that one file.

---

## Fonts

Caveat, Patrick Hand, Rock Salt, and Archivo are self-hosted in `public/fonts/` rather than loaded from Google's CDN, so the app works offline and has no third-party font requests. Regenerate them with:

```bash
node scripts/fetch-fonts.mjs
```

---

## Accessibility and browser support

Keyboard operable throughout, with focus rings drawn as hand-sketched highlights, ARIA labels on the drawn controls, and `prefers-reduced-motion` respected for the panel draw-on animation.

Chromium-based browsers are best supported. Safari works but webcam capture is more restrictive. Requires WebGL for the TF.js backend.

---

## Ideas for extending it

- Real persistence via IndexedDB (see `storage.js` above).
- Export/import a trained class set as JSON so a teacher can hand students a pre-trained model.
- More motifs — each is a self-contained function in `motifs.js` drawn in unit space, so adding one is roughly 30 lines plus a keyword entry.
- A shared mode where two people train against the same feed and their strips diverge.

---

## Credits and licence

Built with [React](https://react.dev), [Vite](https://vite.dev), [TensorFlow.js](https://www.tensorflow.org/js), [`@tensorflow-models/mobilenet`](https://github.com/tensorflow/tfjs-models/tree/master/mobilenet), [`@tensorflow-models/knn-classifier`](https://github.com/tensorflow/tfjs-models/tree/master/knn-classifier), [jsPDF](https://github.com/parallax/jsPDF), and [Tailwind CSS](https://tailwindcss.com).

Conceptually indebted to [Teachable Machine](https://teachablemachine.withgoogle.com/) and [Machine Learning for Kids](https://machinelearningforkids.co.uk/) — both excellent at making classifiers tangible. This project's wager is that replacing the confidence bar with a drawing makes the model's uncertainty *legible* to a wider audience.

MIT licensed.
