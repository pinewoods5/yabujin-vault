import { createYouTubePlayer } from './youtube.js';

// One adapter per song source. An adapter is called as (url, container, { onStatus }), renders a
// visible player inside container and returns { destroy() }, which must stop all sound.
// onStatus gets 'loading' | 'playing' | 'paused' | 'ended'.
// Adding SoundCloud later: write media/soundcloud.js with the same shape and register it here.
const adapters = {
  youtube: createYouTubePlayer,
};

export function createMediaPlayer(song, container, handlers) {
  return adapters[song.source](song.url, container, handlers);
}
