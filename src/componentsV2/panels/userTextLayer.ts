export const DEFAULT_USER_TEXT = 'New text';

const DEFAULT_CANVAS_WIDTH = 240;
const DEFAULT_CANVAS_HEIGHT = 120;
const MIN_TEXTBOX_WIDTH = 80;
const MAX_TEXTBOX_WIDTH = 240;
const TEXTBOX_HORIZONTAL_PADDING = 32;

const getSafeCanvasWidth = (canvasWidth: number) =>
  Number.isFinite(canvasWidth) && canvasWidth > 0
    ? canvasWidth
    : DEFAULT_CANVAS_WIDTH;

const getSafeCanvasHeight = (canvasHeight: number) =>
  Number.isFinite(canvasHeight) && canvasHeight > 0
    ? canvasHeight
    : DEFAULT_CANVAS_HEIGHT;

export const getUserTextboxOptions = (
  canvasWidth: number,
  canvasHeight: number,
) => {
  const safeCanvasWidth = getSafeCanvasWidth(canvasWidth);
  const safeCanvasHeight = getSafeCanvasHeight(canvasHeight);

  return {
    left: safeCanvasWidth / 2,
    top: safeCanvasHeight / 2,
    originX: 'center' as const,
    originY: 'center' as const,
    width: Math.min(
      Math.max(safeCanvasWidth - TEXTBOX_HORIZONTAL_PADDING, MIN_TEXTBOX_WIDTH),
      MAX_TEXTBOX_WIDTH,
    ),
    fill: '#000000',
    fontFamily: 'Noto Sans',
    fontSize: 32,
    fontWeight: 'normal' as const,
    fontStyle: 'normal' as const,
    underline: false,
    textAlign: 'center' as const,
    lineHeight: 1.2,
    charSpacing: 0,
    'zaparoo-user-layer': true,
  };
};
