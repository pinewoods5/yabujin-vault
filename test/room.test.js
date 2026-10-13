import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ROOMS, parseRoom, loadRoom } from '../src/room.js';

test('the library is 20×15 with a start, the Gatekeeper, a door and nine 3-slot shelves', () => {
  const room = loadRoom('library');
  assert.equal(room.cols, 20);
  assert.equal(room.rows, 15);
  assert.deepEqual(room.spawn, { col: 4, row: 12 });
  // He stands in front of the door with the lectern in front of him.
  assert.deepEqual(room.door, { col: 9, row: 14 });
  assert.deepEqual(room.gatekeeper, { col: 9, row: 13 });
  assert.deepEqual(room.lectern, { col: 9, row: 12 });
  assert.deepEqual(room.doorStep, { col: 9, row: 13 });
  for (let shelf = 1; shelf <= 9; shelf += 1) {
    assert.equal(room.slots.filter((s) => s.shelf === shelf).length, 3, `shelf ${shelf}`);
  }
});

test('the Garden is a small room with its door on top and one 5-slot shelf', () => {
  const room = loadRoom('garden');
  assert.deepEqual(room.door, { col: 9, row: 3 });
  assert.deepEqual(room.doorStep, { col: 9, row: 4 });
  assert.deepEqual(room.spawn, room.doorStep);
  assert.equal(room.doorTo, 'library');
  assert.equal(room.slots.length, 5);
  assert.ok(room.slots.every((slot) => slot.shelf === 1));
  assert.equal(loadRoom('library').doorTo, 'garden');
});

test('every room is closed: no floor touches the edge or the void (doors are the way out)', () => {
  for (const [name, { map }] of Object.entries(ROOMS)) {
    const at = (col, row) => map[row]?.[col] ?? ' ';
    map.forEach((line, row) => {
      [...line].forEach((ch, col) => {
        if (ch === '#' || ch === ' ' || ch === 'D') return;
        for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          assert.notEqual(at(col + dc, row + dr), ' ', `${name}: ${ch} at ${col},${row} is open to the outside`);
        }
      });
    });
  }
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
  assert.deepEqual(parseRoom(['#D#', '#.#', '###']).spawn, { col: 1, row: 1 });
  assert.throws(() => parseRoom(['####', '#PP#', '####']), /more than one P/);
  assert.throws(() => parseRoom(['#####', '#PLL#', '#####']), /more than one L/);
  assert.throws(() => parseRoom(['#####', '#P#D#', '#####']), /no floor next to it/);
});
