import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MAP, parseRoom } from '../src/room.js';

test('the library map is 20×15 tiles with one start and three 3-slot shelves', () => {
  const room = parseRoom();
  assert.equal(room.cols, 20);
  assert.equal(room.rows, 15);
  assert.ok(room.spawn);
  for (const shelf of [1, 2, 3]) {
    assert.equal(room.slots.filter((s) => s.shelf === shelf).length, 3, `shelf ${shelf}`);
  }
});

test('the library is closed: every border tile is a wall', () => {
  const last = MAP.length - 1;
  MAP.forEach((line, row) => {
    [...line].forEach((ch, col) => {
      if (row === 0 || row === last || col === 0 || col === line.length - 1) assert.equal(ch, '#', `${col},${row}`);
    });
  });
});

test('slots on a shelf come out left to right', () => {
  const { slots } = parseRoom(['#####', '#P12#', '#.11#', '#####']);
  assert.deepEqual(
    slots.filter((s) => s.shelf === 1).map((s) => [s.col, s.row]),
    [[2, 1], [2, 2], [3, 2]],
  );
});

test('bad maps are rejected', () => {
  assert.throws(() => parseRoom(['###', '#P##', '###']), /wide/);
  assert.throws(() => parseRoom(['###', '#x#', '###']), /Unknown room tile/);
  assert.throws(() => parseRoom(['###', '#.#', '###']), /no P/);
  assert.throws(() => parseRoom(['####', '#PP#', '####']), /more than one P/);
});
