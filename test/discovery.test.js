import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createDiscovery, STORAGE_KEY } from '../src/discovery.js';

const memoryStorage = (initial = {}) => {
  const data = { ...initial };
  return { data, getItem: (k) => data[k] ?? null, setItem: (k, v) => (data[k] = String(v)) };
};

test('finding a book counts once and is saved', () => {
  const storage = memoryStorage();
  const d = createDiscovery(storage, ['a', 'b']);
  assert.equal(d.count, 0);
  assert.equal(d.total, 2);
  assert.equal(d.add('a'), true);
  assert.equal(d.add('a'), false);
  assert.equal(d.add('nope'), false);
  assert.equal(d.count, 1);
  assert.deepEqual(JSON.parse(storage.data[STORAGE_KEY]), ['a']);
  assert.equal(createDiscovery(storage, ['a', 'b']).has('a'), true);
});

test('saved ids of books that are not in the library do not count, but are kept', () => {
  const storage = memoryStorage({ [STORAGE_KEY]: JSON.stringify(['gone', 'a']) });
  const d = createDiscovery(storage, ['a', 'b']);
  assert.equal(d.count, 1);
  assert.equal(d.has('gone'), false);
  d.add('b');
  assert.deepEqual(JSON.parse(storage.data[STORAGE_KEY]).sort(), ['a', 'b', 'gone']);
});

test('garbage in storage is ignored', () => {
  for (const value of ['{not json', '"a"', '{"a":1}', '[1, null, "a"]']) {
    const d = createDiscovery(memoryStorage({ [STORAGE_KEY]: value }), ['a']);
    assert.equal(d.count, value.includes('"a"]') ? 1 : 0, value);
  }
});

test('a storage that throws (or is missing) still works in memory', () => {
  const throwing = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } };
  for (const storage of [throwing, null]) {
    const d = createDiscovery(storage, ['a']);
    assert.equal(d.add('a'), true);
    assert.equal(d.has('a'), true);
    assert.equal(d.count, 1);
  }
});
