# Comic Classifier

**Teach a machine, see a comic.**

Train an image classifier in your browser from webcam frames or dropped images — then, instead of confidence bars, an "artist agent" draws every prediction as a pen-and-ink comic panel, live. A session becomes a little black-and-white story of what the camera saw, exportable as a stitched PNG or a multi-page comic book PDF.

### ▶ [Try it live](https://afro-architect.github.io/Comic-Classifier/)

Works best in Chrome or Edge. Nothing leaves your browser — MobileNet and the classifier both run client-side, and no image is ever uploaded.

---

## This branch is the compiled site

`main` contains only the built static output that GitHub Pages serves. **Do not edit it by hand.**

### 👉 The development source lives on the [`source` branch](../../tree/source)

That branch has the readable project — `src/`, `package.json`, the Vite config, the fonts script, and a full README with install, build, and architecture notes.

```bash
git clone -b source https://github.com/afro-architect/Comic-Classifier.git
cd Comic-Classifier
npm install
npm run dev
```

To publish a new version: build on `source`, then copy the contents of `dist/` onto `main`.

---

## What it does

1. **Name 2–6 classes** — anything the camera can see: `mug` and `hand`, `cat` and `lamp`, `me` and `empty desk`.
2. **Collect samples** — hold to record webcam frames at ~8/sec, snap single frames, or drop image files.
3. **Train** — instant in the default k-NN mode; advanced mode fits a small dense head and plots loss and accuracy.
4. **Watch it draw** — every confident, stable prediction becomes an inked panel with a caption.
5. **Export** — one stitched PNG page, or a comic book PDF with a cast-of-characters cover.

A collapsible "artist's notebook" shows the raw label, per-class confidences, and inference FPS, so the numbers behind the drawing stay available.

## How the drawing works

The panels are **fully procedural** — no image-generation API in the default path. A seeded PRNG drives a nib engine where every mark is a filled variable-width path rather than a constant-width stroke, with cross-hatching and stipple fills for shading. Fifteen hand-authored motif generators are fuzzy-matched to your class names, and a recurring beret-wearing narrator reacts across panels in seven poses.

When the top two confidences are within 0.15, the artist draws the narrator scratching his head over two overlapping ghost sketches — low confidence becomes a *drawing* about uncertainty instead of a small number. That is the whole idea: replacing the confidence bar with a picture makes what the model is unsure about legible to people who don't read charts.

Built for STEAM and AI-literacy teaching. Conceptually indebted to [Teachable Machine](https://teachablemachine.withgoogle.com/) and [Machine Learning for Kids](https://machinelearningforkids.co.uk/).

## Built with

[React](https://react.dev) · [Vite](https://vite.dev) · [TensorFlow.js](https://www.tensorflow.org/js) · [MobileNet](https://github.com/tensorflow/tfjs-models/tree/master/mobilenet) · [KNN Classifier](https://github.com/tensorflow/tfjs-models/tree/master/knn-classifier) · [jsPDF](https://github.com/parallax/jsPDF) · [Tailwind CSS](https://tailwindcss.com)

MIT licensed.
