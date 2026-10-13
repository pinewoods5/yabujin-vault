import { STRINGS } from './strings.js';

export const ANSWER = 'LET ME INTO THE GARDEN';
export const GARDEN_KEY = 'yabujin-vault/garden/v1';

// Uppercase, accents and punctuation gone, spaces collapsed: "let me into the gárden." → ANSWER.
export function normalizeAnswer(text) {
  return text
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toUpperCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export const isRightAnswer = (text) => normalizeAnswer(text) === ANSWER;

// What the Gatekeeper says after the nth wrong answer: the replies rotate, and from the third
// try on he points at the lectern.
export function wrongReply(n) {
  const { wrong, hint } = STRINGS.gate;
  const lines = [wrong[(n - 1) % wrong.length]];
  if (n >= 3) lines.push(hint);
  return lines;
}

// Whether the Garden has been opened, saved like the rest of the progress.
export function createGarden(storage) {
  let open = false;
  try {
    open = storage?.getItem(GARDEN_KEY) === '1';
  } catch {
    // Can't read: closed until opened this visit.
  }
  return {
    get open() {
      return open;
    },
    unlock() {
      open = true;
      try {
        storage?.setItem(GARDEN_KEY, '1');
      } catch {
        // Not saved; open for this visit.
      }
    },
  };
}
