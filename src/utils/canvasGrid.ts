import type { Canvas } from 'fabric';
import type { Guide, GridSettings } from '../contexts/fileDropper';

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

const hexToRgbTuple = (hex: string): [number, number, number] => {
  const trimmed = hex.trim().replace(/^#/, '');
  const full =
    trimmed.length === 3
      ? trimmed
          .split('')
          .map((c) => c + c)
          .join('')
      : trimmed;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return [255, 255, 255];
  const n = parseInt(full, 16);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
};

const rgba = (hex: string, alpha: number) => {
  const [r, g, b] = hexToRgbTuple(hex);
  return `rgba(${r}, ${g}, ${b}, ${clamp01(alpha)})`;
};

export const drawGrid = (
  ctx: CanvasRenderingContext2D,
  canvas: Canvas,
  settings: GridSettings,
): void => {
  if (!settings.enabled || settings.spacing <= 0) return;
  const zoom = canvas.getZoom();
  const width = canvas.getWidth();
  const height = canvas.getHeight();
  const screenSpacing = settings.spacing * zoom;
  if (screenSpacing < 2) return;

  const subdivisions = Math.max(1, Math.floor(settings.subdivisions));
  const minorAlpha = settings.gridOpacity;
  const majorAlpha = Math.min(1, minorAlpha * 2.25);

  ctx.save();
  ctx.lineWidth = 1;

  // Minor lines
  ctx.strokeStyle = rgba(settings.gridColor, minorAlpha);
  ctx.beginPath();
  for (let i = 1; i * screenSpacing < width; i++) {
    if (i % subdivisions === 0) continue;
    const x = Math.round(i * screenSpacing) + 0.5;
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
  }
  for (let i = 1; i * screenSpacing < height; i++) {
    if (i % subdivisions === 0) continue;
    const y = Math.round(i * screenSpacing) + 0.5;
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
  }
  ctx.stroke();

  // Major lines
  ctx.strokeStyle = rgba(settings.gridColor, majorAlpha);
  ctx.beginPath();
  for (let i = 0; i * screenSpacing <= width; i++) {
    if (i % subdivisions !== 0) continue;
    const x = Math.round(i * screenSpacing) + 0.5;
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
  }
  for (let i = 0; i * screenSpacing <= height; i++) {
    if (i % subdivisions !== 0) continue;
    const y = Math.round(i * screenSpacing) + 0.5;
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
  }
  ctx.stroke();

  ctx.restore();
};

export const drawGuides = (
  ctx: CanvasRenderingContext2D,
  canvas: Canvas,
  settings: GridSettings,
  guides: Guide[],
): void => {
  if (!guides.length) return;
  const zoom = canvas.getZoom();
  const width = canvas.getWidth();
  const height = canvas.getHeight();

  ctx.save();
  ctx.strokeStyle = rgba(settings.guideColor, settings.guideOpacity);
  ctx.lineWidth = 1.5;
  ctx.setLineDash([6, 4]);
  ctx.beginPath();
  guides.forEach((guide) => {
    if (guide.orientation === 'vertical') {
      const x = Math.round(guide.position * zoom) + 0.5;
      if (x < 0 || x > width) return;
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
    } else {
      const y = Math.round(guide.position * zoom) + 0.5;
      if (y < 0 || y > height) return;
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
    }
  });
  ctx.stroke();
  ctx.restore();
};

export type SnapLines = {
  vertical: number[];
  horizontal: number[];
};

/* Build the set of snap candidates in canvas base coords. */
export const buildSnapLines = (
  canvas: Canvas,
  settings: GridSettings,
): SnapLines => {
  const vertical: number[] = [];
  const horizontal: number[] = [];
  if (settings.enabled && settings.spacing > 0) {
    const zoom = canvas.getZoom();
    const widthBase = canvas.getWidth() / zoom;
    const heightBase = canvas.getHeight() / zoom;
    for (let x = 0; x <= widthBase; x += settings.spacing) {
      vertical.push(x);
    }
    for (let y = 0; y <= heightBase; y += settings.spacing) {
      horizontal.push(y);
    }
  }
  settings.guides.forEach((guide) => {
    if (guide.orientation === 'vertical') {
      vertical.push(guide.position);
    } else {
      horizontal.push(guide.position);
    }
  });
  return { vertical, horizontal };
};

/* A candidate snap point on one axis: the position (e.g. bbox.left + offset)
 * relative to the object's position, and which grid/guide line it matched. */
export type AxisSnap = {
  /* offset from object.left (or top) to the snapping point on the bbox */
  candidateOffset: number;
  /* the snap line in canvas base coords to latch to */
  line: number;
};

/* Find the best snap candidate for one axis. `candidates` is the list of
 * candidate bbox points; each `value` is its current absolute position and
 * `offset` is its offset from object.left (or top). Returns null if nothing
 * is within tolerance. */
export const findBestAxisSnap = (
  candidates: { value: number; offset: number }[],
  lines: number[],
  tolerance: number,
): AxisSnap | null => {
  if (!lines.length || tolerance <= 0) return null;
  let best: (AxisSnap & { distance: number }) | null = null;
  for (const c of candidates) {
    for (const line of lines) {
      const d = Math.abs(line - c.value);
      if (d <= tolerance && (best === null || d < best.distance)) {
        best = { line, candidateOffset: c.offset, distance: d };
      }
    }
  }
  if (!best) return null;
  return { line: best.line, candidateOffset: best.candidateOffset };
};
