import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseYouTubeId } from '../src/media/youtubeId.js';
import { errorKind, checkSealed } from '../src/media/youtube.js';

test('video ids come out of the usual link shapes', () => {
  const id = 'BDqCazX1wzw';
  for (const url of [
    `https://www.youtube.com/watch?v=${id}`,
    `https://youtube.com/watch?v=${id}&t=42s&list=xyz`,
    `https://m.youtube.com/watch?v=${id}`,
    `https://music.youtube.com/watch?v=${id}`,
    `https://youtu.be/${id}`,
    `https://youtu.be/${id}?si=abc`,
    `https://www.youtube.com/embed/${id}`,
    `https://www.youtube-nocookie.com/embed/${id}`,
    `https://www.youtube.com/shorts/${id}`,
    `https://www.youtube.com/live/${id}`,
  ]) {
    assert.equal(parseYouTubeId(url), id, url);
  }
});

test('anything else is a vanished song', () => {
  for (const url of [
    '',
    'not a link',
    'https://www.youtube.com/watch',
    'https://www.youtube.com/watch?v=short',
    'https://www.youtube.com/watch?v=BDqCazX1wzw!',
    'https://www.youtube.com/channel/UCabcdefghijk',
    'https://example.com/watch?v=BDqCazX1wzw',
    'https://youtu.be/',
  ]) {
    assert.equal(parseYouTubeId(url), null, url);
  }
});

test('YouTube error codes map to what happened to the book', () => {
  assert.equal(errorKind(2), 'gone');
  assert.equal(errorKind(100), 'gone');
  assert.equal(errorKind(101), 'sealed');
  assert.equal(errorKind(150), 'sealed');
  assert.equal(errorKind(5), 'unreachable');
  assert.equal(errorKind(153), 'unreachable');
  assert.equal(errorKind(999), 'unreachable');
});

test('a "sealed" error is checked against oEmbed: 400/404 means the song is gone', async (t) => {
  const answer = (status) => async () => ({ status });
  const cases = [
    [answer(404), 'gone'],
    [answer(400), 'gone'],
    [answer(401), 'sealed'],
    [answer(200), 'sealed'],
    [async () => { throw new TypeError('offline'); }, 'sealed'],
  ];
  for (const [fetch, expected] of cases) {
    t.mock.method(globalThis, 'fetch', fetch);
    assert.equal(await checkSealed('BDqCazX1wzw'), expected);
    t.mock.restoreAll();
  }
});
