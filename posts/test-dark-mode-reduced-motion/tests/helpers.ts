export const variantPath = () =>
  process.env.APP_VARIANT && process.env.APP_VARIANT !== 'correct'
    ? `/?variant=${process.env.APP_VARIANT}`
    : '/';

type Rgb = { r: number; g: number; b: number; luminance: number };

const RGB = /^rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/;

export function parseRgb(value: string): Rgb {
  const match = RGB.exec(value);
  if (!match) throw new Error(`Expected an rgb()/rgba() color, received: ${value}`);
  const [r, g, b] = match.slice(1, 4).map(Number);
  // Perceptual-ish relative luminance, close enough for a synthetic fixture.
  return { r, g, b, luminance: 0.2126 * (r / 255) + 0.7152 * (g / 255) + 0.0722 * (b / 255) };
}

export function assertDarkTheme(surface: string, text: string, accent: string): Rgb {
  const background = parseRgb(surface);
  const foreground = parseRgb(text);
  const border = parseRgb(accent);
  if (background.luminance >= 0.2) {
    throw new Error(`Expected a dark surface, received ${surface} (luminance ${background.luminance.toFixed(3)})`);
  }
  if (foreground.luminance <= 0.6) {
    throw new Error(`Expected light text on a dark surface, received ${text} (luminance ${foreground.luminance.toFixed(3)})`);
  }
  if (border.luminance <= background.luminance) {
    throw new Error(`Expected a lighter accent border, received ${accent} against ${surface}`);
  }
  return background;
}

export function assertReducedMotion(durationSeconds: number, flag: string): void {
  if (durationSeconds !== 0) {
    throw new Error(`Expected transition-duration 0s under reduced motion, received ${durationSeconds}s`);
  }
  if (flag !== 'reduced') {
    throw new Error(`Expected the reduced-motion rule to render the "reduced" flag, received "${flag}"`);
  }
}
