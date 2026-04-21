export type UserFont = {
  family: string;
  /* base64 data URL (e.g. 'data:font/ttf;base64,...') — used for persistence
   * and re-registration on session load. */
  dataUrl: string;
  style: 'normal' | 'italic';
  weight: string;
};

const FONT_EXT = /\.(ttf|otf|woff2?|ttc)$/i;

const sanitizeFamily = (raw: string): string => {
  const base = raw.replace(FONT_EXT, '').replace(/[_-]+/g, ' ').trim();
  return base || 'Custom Font';
};

const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(
      ...bytes.subarray(i, Math.min(i + chunk, bytes.length)),
    );
  }
  return btoa(binary);
};

export const fileToUserFont = async (file: File): Promise<UserFont> => {
  const buffer = await file.arrayBuffer();
  const base64 = arrayBufferToBase64(buffer);
  const mime = file.type || 'font/ttf';
  return {
    family: sanitizeFamily(file.name),
    dataUrl: `data:${mime};base64,${base64}`,
    style: 'normal',
    weight: '400',
  };
};

export const registerUserFont = async (font: UserFont): Promise<void> => {
  const alreadyRegistered = Array.from(document.fonts).some(
    (f) =>
      f.family === font.family &&
      f.style === font.style &&
      f.weight === font.weight,
  );
  if (alreadyRegistered) return;
  const face = new FontFace(font.family, `url(${font.dataUrl})`, {
    style: font.style,
    weight: font.weight,
  });
  await face.load();
  document.fonts.add(face);
};

export const userFontPdfKey = (font: UserFont): string =>
  `${font.family}-${font.weight}-${font.style}`;
