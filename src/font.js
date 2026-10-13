// System fonts only (nothing is downloaded): a monospace face first, then faces that cover the
// symbols and Arabic in some titles, so they render instead of empty boxes. Keep in sync with
// --font in style.css.
export const FONT_FAMILY =
  'Menlo, Consolas, "DejaVu Sans Mono", monospace, "Apple Symbols", "Segoe UI Symbol", "Noto Sans Symbols 2", "Geeza Pro", "Noto Naskh Arabic", sans-serif';

// Phaser sizes each text line from this sample; it holds the tallest glyphs we show so accents,
// symbols and Arabic aren't clipped.
export const TEST_STRING = '|MÉqgyųĄ✦☥♁مسد';
