import { createYouTubePlayer } from './youtube.js';

// One adapter per song source. An adapter is called as (url, container, { onStatus }), renders a
// visible player inside container and returns { destroy() }, which must stop all sound.
// onStatus gets 'loading' | 'playing' | 'paused' | 'ended' | 'needs-click',
// or { error: 'gone' | 'sealed' | 'unreachable' } after the adapter has removed its player.
// Adding SoundCloud later: write media/soundcloud.js with the same shape and register it here.
const adapters = {
  youtube: createYouTubePlayer,
};

export function createMediaPlayer(song, container, handlers) {
  const create = adapters[song.source];
  if (!create) {
    handlers.onStatus({ error: 'unreachable' });
    return { destroy() {} };
  }
  return create(song.url, container, handlers);
}
