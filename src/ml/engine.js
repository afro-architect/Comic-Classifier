/**
 * engine.js — all machine learning, entirely client-side.
 *
 * MobileNet v2 (alpha 0.5) is used purely as a frozen feature extractor. The
 * default head is a KNN classifier (instant "training"); advanced mode fits a
 * small dense head on the same embeddings.
 *
 * Embeddings are kept in plain Float32Arrays in React state — tensors only
 * exist for the length of an inference call, which keeps tf's memory flat.
 */

import * as tf from '@tensorflow/tfjs';
import * as mobilenetModule from '@tensorflow-models/mobilenet';
import * as knnClassifier from '@tensorflow-models/knn-classifier';

export const INPUT_SIZE = 224;
export const EMBEDDING_SIZE = 1280; // mobilenet v2 alpha=0.5 penultimate layer

let backbone = null;
let backbonePromise = null;

export async function loadBackbone(onProgress) {
  if (backbone) return backbone;
  if (!backbonePromise) {
    backbonePromise = (async () => {
      await tf.ready();
      onProgress?.('warming up the drawing board');
      const m = await mobilenetModule.load({ version: 2, alpha: 0.5 });
      onProgress?.('sharpening the pens');
      // warm-up pass so the first real prediction is not janky
      const warm = tf.zeros([1, INPUT_SIZE, INPUT_SIZE, 3]);
      const t = m.infer(warm, true);
      t.dispose();
      warm.dispose();
      backbone = m;
      return m;
    })();
  }
  return backbonePromise;
}

export function isReady() {
  return !!backbone;
}

/** Embed anything drawable (canvas / video / image) into a Float32Array. */
export function embed(source) {
  if (!backbone) throw new Error('backbone not loaded');
  return tf.tidy(() => {
    const t = backbone.infer(source, true);
    const data = t.dataSync();
    return Float32Array.from(data);
  });
}

/* ------------------------------------------------------------------ */
/* KNN head                                                            */
/* ------------------------------------------------------------------ */

let knn = null;

export function getKnn() {
  if (!knn) knn = knnClassifier.create();
  return knn;
}

/** Rebuild the KNN dataset from the class list (id -> Float32Array[]). */
export function syncKnn(classes) {
  const k = getKnn();
  const prev = k.getClassifierDataset();
  Object.values(prev).forEach((t) => t.dispose());
  k.clearAllClasses();
  const dataset = {};
  for (const c of classes) {
    if (!c.samples.length) continue;
    const dim = c.samples[0].emb.length;
    const flat = new Float32Array(c.samples.length * dim);
    c.samples.forEach((s, i) => flat.set(s.emb, i * dim));
    dataset[c.id] = tf.tensor2d(flat, [c.samples.length, dim]);
  }
  if (Object.keys(dataset).length) k.setClassifierDataset(dataset);
  return Object.keys(dataset).length;
}

export async function knnPredict(emb, k = 3) {
  const kn = getKnn();
  if (kn.getNumClasses() === 0) return null;
  const t = tf.tensor(emb, [emb.length]);
  try {
    const res = await kn.predictClass(t, k);
    return res; // { label, classIndex, confidences }
  } finally {
    t.dispose();
  }
}

/* ------------------------------------------------------------------ */
/* Dense head (advanced mode)                                          */
/* ------------------------------------------------------------------ */

let denseModel = null;
let denseClassIds = [];

export function disposeDense() {
  if (denseModel) {
    denseModel.dispose();
    denseModel = null;
    denseClassIds = [];
  }
}

export async function trainDense(classes, { epochs = 20, batchSize = 16, learningRate = 0.001, onEpochEnd } = {}) {
  disposeDense();
  const usable = classes.filter((c) => c.samples.length > 0);
  denseClassIds = usable.map((c) => c.id);
  const dim = usable[0].samples[0].emb.length;
  const n = usable.reduce((a, c) => a + c.samples.length, 0);
  const xs = new Float32Array(n * dim);
  const ys = new Float32Array(n * usable.length);
  let row = 0;
  usable.forEach((c, ci) => {
    for (const s of c.samples) {
      xs.set(s.emb, row * dim);
      ys[row * usable.length + ci] = 1;
      row++;
    }
  });
  const xTensor = tf.tensor2d(xs, [n, dim]);
  const yTensor = tf.tensor2d(ys, [n, usable.length]);

  const model = tf.sequential();
  model.add(tf.layers.dense({ inputShape: [dim], units: 100, activation: 'relu', kernelInitializer: 'varianceScaling', useBias: true }));
  model.add(tf.layers.dropout({ rate: 0.1 }));
  model.add(tf.layers.dense({ units: usable.length, activation: 'softmax', kernelInitializer: 'varianceScaling', useBias: false }));
  model.compile({ optimizer: tf.train.adam(learningRate), loss: 'categoricalCrossentropy', metrics: ['accuracy'] });

  const history = [];
  await model.fit(xTensor, yTensor, {
    epochs,
    batchSize: Math.min(batchSize, n),
    shuffle: true,
    validationSplit: n >= 12 ? 0.15 : 0,
    callbacks: {
      onEpochEnd: async (epoch, logs) => {
        const point = { epoch: epoch + 1, loss: logs.loss, acc: logs.acc ?? logs.accuracy ?? 0, valLoss: logs.val_loss, valAcc: logs.val_acc ?? logs.val_accuracy };
        history.push(point);
        onEpochEnd?.(point, history);
        await tf.nextFrame();
      },
    },
  });
  xTensor.dispose();
  yTensor.dispose();
  denseModel = model;
  return history;
}

export function densePredict(emb) {
  if (!denseModel) return null;
  return tf.tidy(() => {
    const t = tf.tensor2d(emb, [1, emb.length]);
    const out = denseModel.predict(t);
    const scores = out.dataSync();
    const confidences = {};
    denseClassIds.forEach((id, i) => {
      confidences[id] = scores[i];
    });
    let best = denseClassIds[0];
    denseClassIds.forEach((id) => {
      if (confidences[id] > confidences[best]) best = id;
    });
    return { label: best, confidences };
  });
}

export function hasDense() {
  return !!denseModel;
}

export function memoryInfo() {
  return tf.memory();
}
