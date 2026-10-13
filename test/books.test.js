import { test } from 'node:test';
import assert from 'node:assert/strict';
import booksData from '../data/books.json' with { type: 'json' };
import { validateBooks, placeBooks, bookPages, isVisible, counts } from '../src/books.js';
import { loadRoom } from '../src/room.js';

const song = (fields) => ({ id: 's', type: 'song', room: 'library', title: 'S', source: 'youtube', url: 'https://youtu.be/x', pages: [], ...fields });
const lore = (fields) => ({ id: 'l', type: 'lore', room: 'library', title: 'L', pages: ['one'], ...fields });

test('the real books.json is valid: 33 books, 15 songs, 18 fragments', () => {
  const { books, problems } = validateBooks(booksData);
  assert.deepEqual(problems, []);
  assert.equal(books.length, 33);
  assert.equal(books.filter((b) => b.type === 'song').length, 15);
  assert.equal(books.filter((b) => b.type === 'lore').length, 18);
  assert.equal(books.filter((b) => b.room === 'garden').length, 5);
});

test('optional fields are read, and defaulted when missing', () => {
  const { books } = validateBooks(booksData);
  const byId = Object.fromEntries(books.map((b) => [b.id, b]));
  assert.deepEqual(byId.numbers.tint, ['#8b0000', '#d4af37', null]);
  assert.equal(byId['the-mirror-book'].mirrored, true);
  assert.equal(byId['twenty-four-days'].requires, 5);
  assert.equal(byId['the-locked-page'].special, 'locked-page');
  assert.deepEqual([byId.baroque.start, byId.baroque.tint, byId.baroque.mirrored, byId.baroque.requires, byId.baroque.special], [null, [], false, 0, null]);
});

test('broken entries are skipped with a reason, bad optional fields are ignored', () => {
  const { books, problems } = validateBooks([
    song({ id: 'ok', start: 42.5 }),
    song({ id: '' }),
    song({ id: 'ok' }),
    lore({ id: 'a', type: 'poem' }),
    lore({ id: 'b', room: 'attic' }),
    lore({ id: 'c', pages: 'one' }),
    song({ id: 'd', source: 'tape' }),
    song({ id: 'e', url: undefined }),
    lore({ id: 'f', tint: ['red'], requires: -1, mirrored: 'yes', special: 'golden' }),
    song({ id: 'g', start: -3 }),
  ]);
  assert.deepEqual(books.map((b) => b.id), ['ok', 'f', 'g']);
  assert.equal(books[0].start, 42.5);
  assert.deepEqual([books[1].tint, books[1].requires, books[1].mirrored, books[1].special], [[], 0, false, null]);
  assert.equal(books[2].start, null);
  assert.equal(problems.length, 12); // 7 skipped entries + 5 ignored fields
  assert.match(problems[0], /entry 2: missing id/);
  assert.match(problems[1], /duplicate id "ok"/);
  assert.match(problems[2], /unknown type "poem"/);
});

test('pages: one Undertale box each, the title when there are none, tint per page', () => {
  assert.deepEqual(bookPages(validateBooks([song({ title: 'Baroque' })]).books[0]), [{ text: '* Baroque', tint: null, mirrored: false }]);
  const [numbers] = validateBooks([lore({ pages: ['a', 'b', 'c'], tint: ['#8b0000', null] })]).books;
  assert.deepEqual(bookPages(numbers).map((p) => [p.text, p.tint]), [['* a', '#8b0000'], ['* b', null], ['* c', null]]);
});

test('"requires" hides a book until enough songs are found', () => {
  const [book] = validateBooks([lore({ requires: 5 })]).books;
  assert.equal(isVisible(book, 4), false);
  assert.equal(isVisible(book, 5), true);
});

test('counters: garden books only count once the Garden is open', () => {
  const { books } = validateBooks(booksData);
  const found = new Set(['baroque', 'numbers', 'song-8888']);
  const closed = counts(books, (id) => found.has(id), false);
  assert.deepEqual(closed, { songs: { found: 1, total: 11 }, fragments: { found: 1, total: 17 } });
  const open = counts(books, (id) => found.has(id), true);
  assert.deepEqual(open, { songs: { found: 2, total: 15 }, fragments: { found: 1, total: 18 } });
});

test('every library book has a place, and the first five songs kept theirs', () => {
  const { books } = validateBooks(booksData);
  const { placed, problems } = placeBooks(books, loadRoom('library'));
  assert.deepEqual(problems, []);
  assert.equal(placed.length, 28);
  const at = Object.fromEntries(placed.map(({ book, tile }) => [book.id, [tile.col, tile.row]]));
  assert.deepEqual(at['hex-ff81k'], [11, 2]);
  assert.deepEqual(at['angel-witta-knife'], [12, 2]);
  assert.deepEqual(at['pink-windows'], [2, 5]);
  assert.deepEqual(at['azeroy-garden-8888'], [3, 5]);
  assert.deepEqual(at.baroque, [15, 8]);
  assert.deepEqual(at['the-locked-page'], [9, 12]);
  assert.equal(new Set(Object.values(at).map(String)).size, 28);
});

test('placement problems are reported', () => {
  const room = { name: 'library', slots: [{ shelf: 1, col: 1, row: 1 }], lectern: null, shelves: { 1: ['a', 'nope', 'b'], 2: ['c'] } };
  const { books } = validateBooks([lore({ id: 'a' }), lore({ id: 'b' }), lore({ id: 'c', room: 'garden' }), lore({ id: 'd', special: 'locked-page' })]);
  const { placed, problems } = placeBooks(books, room);
  assert.deepEqual(placed.map(({ book }) => book.id), ['a']);
  assert.deepEqual(problems, [
    'shelf 1 of the library: there is no book "nope"',
    'shelf 1 of the library has no room for "b"',
    '"c" belongs in the garden, not on shelf 2 of the library',
    '"b" is not on any shelf in the library',
    '"d" is not on any shelf in the library',
  ]);
});
