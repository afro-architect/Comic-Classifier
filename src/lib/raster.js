/**
 * raster.js — draw a built panel onto a 2-D canvas.
 *
 * The panel model is pure path data + text runs, so the same description feeds
 * the live SVG view, the filmstrip thumbnails and the PNG/PDF exports. Text is
 * drawn with fillText (rather than embedded in SVG) so the hand-lettered fonts
 * survive rasterisation.
 */

import { PANEL_W, PANEL_H } from '../artist/panel.js';
import { PAPER } from '../artist/ink.js';

const fontFor = (t) =>
  `${t.weight || 400} ${t.size}px ${t.font === 'caveat' ? "'Caveat', cursive" : "'Patrick Hand', cursive"}`;

export function paintPanel(ctx, panel, scale = 1, { paper = true, rotate = 0 } = {}) {
  ctx.save();
  ctx.scale(scale, scale);
  if (paper) {
    ctx.fillStyle = PAPER;
    ctx.fillRect(0, 0, panel.w, panel.h);
  }
  if (rotate) {
    ctx.translate(panel.w / 2, panel.h / 2);
    ctx.rotate((rotate * Math.PI) / 180);
    ctx.translate(-panel.w / 2, -panel.h / 2);
  }
  for (const p of panel.prims) {
    ctx.globalAlpha = p.opacity ?? 1;
    ctx.fillStyle = p.fill;
    ctx.fill(new Path2D(p.d));
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#191713';
  for (const t of panel.texts) {
    ctx.globalAlpha = t.opacity ?? 1;
    ctx.font = fontFor(t);
    ctx.textAlign = t.anchor === 'middle' ? 'center' : t.anchor === 'end' ? 'right' : 'left';
    ctx.fillText(t.text, t.x, t.y);
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

/** Render one panel to an offscreen canvas at the requested pixel width. */
export function panelToCanvas(panel, width = PANEL_W, dpr = 1) {
  const scale = (width / panel.w) * dpr;
  const cvs = document.createElement('canvas');
  cvs.width = Math.round(panel.w * scale);
  cvs.height = Math.round(panel.h * scale);
  const ctx = cvs.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  paintPanel(ctx, panel, scale);
  return cvs;
}

export function panelToDataURL(panel, width = 260) {
  return panelToCanvas(panel, width).toDataURL('image/png');
}

export { PANEL_W, PANEL_H };
