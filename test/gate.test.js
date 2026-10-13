import { test } from 'node:test';
import assert from 'node:assert/strict';
import booksData from '../data/books.json' with { type: 'json' };
import { ANSWER, GARDEN_KEY, normalizeAnswer, isRightAnswer, wrongReply, createGarden } from '../src/gate.js';
import { resetProgress } from '../src/discovery.js';
import { STRINGS } from '../src/strings.js';

test('the words are checked without caring about case, accents, punctuation or spacing', () => {
  for (const text of [
    'let me into the garden',
    'LET ME INTO THE GARDEN',
    '  Let   me INTO the gárden. ',
    'Lét më íntö thé gàrdén!',
    'let-me-into-the-garden',
    '"Let me into the garden."',
    'ＬＥＴ ＭＥ ＩＮＴＯ ＴＨＥ ＧＡＲＤＥＮ',
  ]) {
    assert.equal(isRightAnswer(text), true, text);
  }
});

test('anything else is not the words', () => {
  for (const text of ['', 'let me in to the garden', 'let me into the garden please', 'THE GARDEN', 'let me into the gardens', 'into the garden let me']) {
    assert.equal(isRightAnswer(text), false, text);
  }
  assert.equal(normalizeAnswer('  Hi,   there… '), 'HI THERE');
});

test('the locked page decodes to the words: every letter walks back 8', () => {
  const page = booksData.find((book) => book.special === 'locked-page').pages[0];
  const decoded = page.replace(/[A-Z]/g, (ch) => String.fromCharCode(((ch.charCodeAt(0) - 65 - 8 + 26) % 26) + 65));
  assert.equal(decoded, ANSWER);
});

test('wrong answers rotate, and from the third one he points at the lectern', () => {
  const [a, b, c] = STRINGS.gate.wrong;
  const { hint } = STRINGS.gate;
  assert.deepEqual([1, 2, 3, 4, 5].map(wrongReply), [[a], [b], [c, hint], [a, hint], [b, hint]]);
});

const memoryStorage = () => {
  const data = {};
  return {
    data,
    getItem: (k) => data[k] ?? null,
    setItem: (k, v) => (data[k] = String(v)),
    removeItem: (k) => delete data[k],
    key: (i) => Object.keys(data)[i] ?? null,
    get length() {
      return Object.keys(data).length;
    },
  };
};

test('an opened Garden stays open, until progress is reset', () => {
  const storage = memoryStorage();
  const garden = createGarden(storage);
  assert.equal(garden.open, false);
  garden.unlock();
  assert.equal(garden.open, true);
  assert.equal(storage.data[GARDEN_KEY], '1');
  assert.equal(createGarden(storage).open, true);
  resetProgress(storage);
  assert.equal(createGarden(storage).open, false);
});

test('a storage that throws still lets the Garden open for this visit', () => {
  const throwing = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } };
  const garden = createGarden(throwing);
  garden.unlock();
  assert.equal(garden.open, true);
});
