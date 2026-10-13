import { test } from 'node:test';
import assert from 'node:assert/strict';
import songsData from '../data/songs.json' with { type: 'json' };
import { validateSongs, placeBooks } from '../src/songs.js';
import { parseRoom } from '../src/room.js';

const song = (fields) => ({ id: 'a', title: 'A', year: null, source: 'youtube', url: 'https://youtu.be/x', shelf: 1, lore: '', ...fields });

test('the real songs.json is valid and fills the shelves 2/2/1', () => {
  const { songs, problems } = validateSongs(songsData);
  assert.deepEqual(problems, []);
  assert.equal(songs.length, 5);

  const placed = placeBooks(songs, parseRoom().slots);
  assert.deepEqual(placed.problems, []);
  const perShelf = [1, 2, 3].map((n) => placed.books.filter((b) => b.slot.shelf === n).length);
  assert.deepEqual(perShelf, [2, 2, 1]);
});

test('broken entries are skipped with a reason, good ones are kept', () => {
  const { songs, problems } = validateSongs([
    song({ id: 'good' }),
    song({ id: '' }),
    song({ id: 'good' }),
    song({ id: 'b', title: '  ' }),
    song({ id: 'c', source: 'tape' }),
    song({ id: 'd', shelf: '2' }),
    song({ id: 'e', url: null }),
    null,
  ]);
  assert.deepEqual(songs.map((s) => s.id), ['good']);
  assert.equal(problems.length, 7);
  assert.match(problems[0], /entry 2: missing id/);
  assert.match(problems[1], /duplicate id "good"/);
  assert.match(problems[3], /unknown source "tape"/);
});

test('a bad url keeps the book (it is handled as a vanished song later)', () => {
  const { songs, problems } = validateSongs([song({ url: 'not a link' })]);
  assert.equal(songs.length, 1);
  assert.deepEqual(problems, []);
});

test('lore and year are normalised', () => {
  const [a, b] = validateSongs([song({ id: 'a', lore: '  hi  ', year: 2019 }), song({ id: 'b', lore: undefined, year: '2019' })]).songs;
  assert.equal(a.lore, 'hi');
  assert.equal(a.year, 2019);
  assert.equal(b.lore, '');
  assert.equal(b.year, null);
});

test('books go left to right; full and unknown shelves are reported', () => {
  const slots = [{ shelf: 1, col: 1, row: 0 }, { shelf: 1, col: 2, row: 0 }];
  const { books, problems } = placeBooks(
    [song({ id: 'a' }), song({ id: 'b' }), song({ id: 'c' }), song({ id: 'd', shelf: 9 })],
    slots,
  );
  assert.deepEqual(books.map((b) => [b.song.id, b.slot.col]), [['a', 1], ['b', 2]]);
  assert.deepEqual(problems, ['"c": shelf 1 is full — not placed', '"d": there is no shelf 9 — not placed']);
});
