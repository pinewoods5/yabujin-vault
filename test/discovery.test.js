import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createDiscovery, resetProgress, STORAGE_KEY } from '../src/discovery.js';

const memoryStorage = (initial = {}) => {
  const data = { ...initial };
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

test('finding a book counts once and is saved', () => {
  const storage = memoryStorage();
  const d = createDiscovery(storage);
  assert.equal(d.add('a'), true);
  assert.equal(d.add('a'), false);
  assert.deepEqual(JSON.parse(storage.data[STORAGE_KEY]), ['a']);
  assert.equal(createDiscovery(storage).has('a'), true);
});

test('progress saved before books.json is still there', () => {
  const storage = memoryStorage({ [STORAGE_KEY]: JSON.stringify(['baroque', 'gone-song']) });
  const d = createDiscovery(storage);
  assert.equal(d.has('baroque'), true);
  d.add('numbers');
  assert.deepEqual(JSON.parse(storage.data[STORAGE_KEY]).sort(), ['baroque', 'gone-song', 'numbers']);
});

test('garbage in storage is ignored', () => {
  for (const value of ['{not json', '"a"', '{"a":1}', '[1, null, "a"]']) {
    const d = createDiscovery(memoryStorage({ [STORAGE_KEY]: value }));
    assert.equal(d.has('a'), value.includes('"a"]'), value);
  }
});

test('a storage that throws (or is missing) still works in memory', () => {
  const throwing = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } };
  for (const storage of [throwing, null]) {
    const d = createDiscovery(storage);
    assert.equal(d.add('a'), true);
    assert.equal(d.has('a'), true);
  }
});

test('reset forgets only what this game saved', () => {
  const storage = memoryStorage({ [STORAGE_KEY]: '["a"]', 'yabujin-vault/garden/v1': '1', 'other-site': 'keep' });
  resetProgress(storage);
  assert.deepEqual(storage.data, { 'other-site': 'keep' });
  resetProgress(null);
});
