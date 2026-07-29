/**
 * exporters.js — stitched PNG strip + multi-page "comic book" PDF.
 */

import { buildPanel } from '../artist/panel.js';
import { paintPanel, panelToCanvas } from './raster.js';
import { PAPER } from '../artist/ink.js';
import { makeRng, hashString } from '../artist/prng.js';
import { handRect, mergePrims, P, stroke } from '../artist/ink.js';

export function rebuildPanel(entry) {
  return buildPanel({
    label: entry.label,
    confidence: entry.confidence,
    allScores: entry.allScores || [],
    panelIndex: entry.panelIndex,
    history: entry.history || [entry.label],
    threshold: entry.threshold ?? 0.7,
    caption: entry.captionOverride,
    bubble: entry.bubbleOverride,
  });
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 4000);
  return url;
}

function canvasToBlob(cvs, type = 'image/png', quality) {
  return new Promise((resolve) => cvs.toBlob((b) => resolve(b), type, quality));
}

/** Ink title lettering drawn straight onto the sheet. */
function sheetHeader(ctx, title, subtitle, w, y) {
  ctx.fillStyle = '#191713';
  ctx.textAlign = 'left';
  ctx.font = "700 54px 'Caveat', cursive";
  ctx.fillText(title, 54, y);
  ctx.font = "400 22px 'Patrick Hand', cursive";
  ctx.globalAlpha = 0.72;
  ctx.fillText(subtitle, 56, y + 30);
  ctx.globalAlpha = 1;
}

/**
 * Stitch panels into one PNG page: N across, hand-drawn gutters, title block.
 * @param entries strip entries
 * @param opts { cols, scale, images } images = optional map panelIndex -> HTMLImageElement (high-fidelity re-ink)
 */
export async function exportStripPNG(entries, opts = {}) {
  const { cols = entries.length >= 6 ? 3 : Math.min(2, entries.length || 1), scale = 0.62, images = {}, title = 'Comic Classifier' } = opts;
  if (!entries.length) return null;
  const panels = entries.map(rebuildPanel);
  const pw = Math.round(panels[0].w * scale);
  const ph = Math.round(panels[0].h * scale);
  const gutter = Math.round(26 * scale + 12);
  const rows = Math.ceil(panels.length / cols);
  const marginX = 46;
  const headH = 118;
  const W = marginX * 2 + cols * pw + (cols - 1) * gutter;
  const H = headH + rows * ph + (rows - 1) * gutter + 64;

  const cvs = document.createElement('canvas');
  cvs.width = W;
  cvs.height = H;
  const ctx = cvs.getContext('2d');
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, W, H);

  sheetHeader(ctx, title, `${panels.length} panels · inked in your browser · ${new Date().toLocaleDateString()}`, W, 66);

  const rng = makeRng(hashString(`sheet${entries.length}`));
  const rule = mergePrims(stroke([P(50, headH - 22), P(W - 50, headH - 18)], { width: 2.2, rng, wob: 1 }));
  ctx.fillStyle = '#191713';
  for (const p of rule) {
    ctx.globalAlpha = p.opacity;
    ctx.fill(new Path2D(p.d));
  }
  ctx.globalAlpha = 1;

  panels.forEach((panel, i) => {
    const cx = marginX + (i % cols) * (pw + gutter);
    const cy = headH + Math.floor(i / cols) * (ph + gutter);
    ctx.save();
    ctx.translate(cx, cy);
    const img = images[entries[i].panelIndex];
    if (img) {
      ctx.drawImage(img, 0, 0, pw, ph);
      const frame = mergePrims(handRect(3, 3, pw - 6, ph - 6, { rng, width: 3, overshoot: 7, wob: 1.3 }));
      ctx.fillStyle = '#191713';
      for (const p of frame) {
        ctx.globalAlpha = p.opacity;
        ctx.fill(new Path2D(p.d));
      }
      ctx.globalAlpha = 1;
    } else {
      paintPanel(ctx, panel, scale);
    }
    ctx.restore();
  });

  ctx.font = "400 18px 'Patrick Hand', cursive";
  ctx.globalAlpha = 0.6;
  ctx.textAlign = 'center';
  ctx.fillText('drawn by the artist agent — no images left this browser', W / 2, H - 26);
  ctx.globalAlpha = 1;

  const blob = await canvasToBlob(cvs);
  downloadBlob(blob, `comic-strip-${Date.now()}.png`);
  return cvs;
}

/** Multi-page comic book: cover with cast of characters, then 2 panels/page. */
export async function exportComicPDF(entries, classNames, opts = {}) {
  const { images = {} } = opts;
  if (!entries.length) return null;
  const { jsPDF } = await import('jspdf');
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  const W = pdf.internal.pageSize.getWidth();
  const H = pdf.internal.pageSize.getHeight();

  // ---- cover ----
  const cover = document.createElement('canvas');
  cover.width = 1240;
  cover.height = 1754;
  const cx = cover.getContext('2d');
  cx.fillStyle = PAPER;
  cx.fillRect(0, 0, cover.width, cover.height);
  const rng = makeRng(hashString('cover' + entries.length));
  cx.fillStyle = '#191713';
  const frame = mergePrims(handRect(60, 60, cover.width - 120, cover.height - 120, { rng, width: 6, overshoot: 16, wob: 2.4 }));
  for (const p of frame) {
    cx.globalAlpha = p.opacity;
    cx.fill(new Path2D(p.d));
  }
  cx.globalAlpha = 1;
  cx.textAlign = 'center';
  cx.font = "700 118px 'Caveat', cursive";
  cx.fillText('Comic Classifier', cover.width / 2, 300);
  cx.font = "400 42px 'Patrick Hand', cursive";
  cx.fillText('Teach-a-Machine, See-a-Comic', cover.width / 2, 360);

  // a hero panel on the cover
  const heroPanel = { ...entries[0] };
  const hero = panelToCanvas(rebuildPanel(heroPanel), 900);
  cx.drawImage(hero, (cover.width - 900) / 2, 430, 900, (900 / hero.width) * hero.height);

  cx.textAlign = 'left';
  cx.font = "700 62px 'Caveat', cursive";
  cx.fillText('Cast of characters', 150, 1240);
  cx.font = "400 40px 'Patrick Hand', cursive";
  classNames.forEach((n, i) => {
    cx.fillText(`${i + 1}.  ${n}`, 180, 1310 + i * 56);
  });
  cx.font = "400 30px 'Patrick Hand', cursive";
  cx.globalAlpha = 0.65;
  cx.fillText(`${entries.length} panels · ${new Date().toLocaleString()}`, 150, 1640);
  cx.globalAlpha = 1;

  pdf.addImage(cover.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, W, H);

  // ---- panel pages ----
  const perPage = 2;
  for (let i = 0; i < entries.length; i += perPage) {
    pdf.addPage();
    pdf.setFillColor(244, 240, 230);
    pdf.rect(0, 0, W, H, 'F');
    const slice = entries.slice(i, i + perPage);
    slice.forEach((entry, k) => {
      const panel = rebuildPanel(entry);
      const img = images[entry.panelIndex];
      const cvs = img
        ? (() => {
            const c = document.createElement('canvas');
            c.width = 1000;
            c.height = Math.round((panel.h / panel.w) * 1000);
            const g = c.getContext('2d');
            g.fillStyle = PAPER;
            g.fillRect(0, 0, c.width, c.height);
            g.drawImage(img, 0, 0, c.width, c.height);
            return c;
          })()
        : panelToCanvas(panel, 1000);
      const drawW = W - 80;
      const drawH = (cvs.height / cvs.width) * drawW;
      const y = 60 + k * (drawH + 46);
      pdf.addImage(cvs.toDataURL('image/jpeg', 0.9), 'JPEG', 40, y, drawW, drawH);
    });
    pdf.setFontSize(11);
    pdf.setTextColor(90, 84, 74);
    pdf.text(`page ${Math.floor(i / perPage) + 2}`, W / 2, H - 26, { align: 'center' });
  }
  pdf.save(`comic-book-${Date.now()}.pdf`);
  return true;
}
