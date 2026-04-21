export type CanvasFontFace = {
  family: string;
  weight: string;
  style: 'normal' | 'italic';
};

export const CANVAS_FONT_FACES: CanvasFontFace[] = [
  { family: 'Noto Sans', weight: '400', style: 'normal' },
  { family: 'Noto Sans', weight: '400', style: 'italic' },
  { family: 'Noto Sans', weight: '700', style: 'normal' },
];

export const CANVAS_FONT_FAMILIES: string[] = Array.from(
  new Set(CANVAS_FONT_FACES.map((f) => f.family)),
);

export const loadCanvasFonts = async (): Promise<void> => {
  await Promise.all(
    CANVAS_FONT_FACES.map(({ family, weight, style }) =>
      document.fonts.load(`${style} ${weight} 16px "${family}"`),
    ),
  );
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  CANVAS_FONT_FACES.forEach(({ family, weight, style }) => {
    ctx.font = `${style} ${weight} 16px "${family}"`;
    ctx.fillText('preload', 0, 0);
  });
};
