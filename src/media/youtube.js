import { parseYouTubeId } from './youtubeId.js';

const API_URL = 'https://www.youtube.com/iframe_api';
const OEMBED_URL = 'https://www.youtube.com/oembed?format=json&url=';
// YouTube asks for a player of at least 200×200; 16:9 at 225px high.
const WIDTH = 400;
const HEIGHT = 225;
// Give up if the player isn't ready by then (offline, blocked by an extension, ...).
const LOAD_TIMEOUT_MS = 10000;
// If the song still isn't playing after this, the browser probably blocked autoplay.
const AUTOPLAY_GRACE_MS = 3000;
// YT.PlayerState values we report.
const PLAYING = 1;
const BUFFERING = 3;
const STATES = { 0: 'ended', 1: 'playing', 2: 'paused', 3: 'loading' };

let apiPromise = null;

function loadYouTubeApi() {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  apiPromise ??= new Promise((resolve, reject) => {
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      resolve(window.YT);
    };
    const script = document.createElement('script');
    script.src = API_URL;
    script.onerror = () => {
      script.remove();
      apiPromise = null; // let the next book try again
      reject(new Error('YouTube IFrame API failed to load'));
    };
    document.head.append(script);
  });
  return apiPromise;
}

// YouTube error codes → what happened to the book.
export function errorKind(code) {
  if (code === 2 || code === 100) return 'gone'; // bad id / removed or private
  if (code === 101 || code === 150) return 'sealed'; // embedding not allowed (see checkSealed)
  return 'unreachable'; // 5 (player error), 153 (missing referrer), anything new
}

// The embedded player also reports removed videos as 150, so ask oEmbed which one it is:
// 400/404 means the video no longer exists. If we can't tell, the book stays sealed.
export async function checkSealed(videoId) {
  try {
    const response = await fetch(OEMBED_URL + encodeURIComponent(`https://www.youtube.com/watch?v=${videoId}`));
    if (response.status === 400 || response.status === 404) return 'gone';
  } catch {
    // Offline or blocked.
  }
  return 'sealed';
}

export function createYouTubePlayer(url, container, { onStatus }) {
  let player = null;
  let disposed = false; // the player is torn down
  let closed = false; // the book was closed: report nothing more
  const timers = [];

  function teardown() {
    disposed = true;
    timers.forEach(clearTimeout);
    try {
      player?.stopVideo();
    } catch {
      // Not ready yet; removing the iframe below stops it anyway.
    }
    try {
      player?.destroy();
    } catch {
      // Already gone.
    }
    player = null;
    container.replaceChildren();
  }

  // kind may be a promise (see checkSealed); the player is removed right away either way.
  async function fail(kind) {
    if (disposed) return;
    teardown();
    const error = await kind;
    if (!closed) onStatus({ error });
  }

  function destroy() {
    closed = true;
    teardown();
  }

  const videoId = parseYouTubeId(url);
  if (!videoId) {
    onStatus({ error: 'gone' });
    return { destroy };
  }

  const mount = document.createElement('div');
  container.replaceChildren(mount);
  onStatus('loading');
  const loadTimer = setTimeout(() => fail('unreachable'), LOAD_TIMEOUT_MS);
  timers.push(loadTimer);

  loadYouTubeApi().then(
    (YT) => {
      // The book may have been closed while the API was still loading.
      if (disposed) return;
      player = new YT.Player(mount, {
        width: WIDTH,
        height: HEIGHT,
        videoId,
        playerVars: { autoplay: 1, playsinline: 1, rel: 0 },
        events: {
          onReady: () => {
            if (disposed) return;
            clearTimeout(loadTimer);
            player.playVideo();
            timers.push(
              setTimeout(() => {
                const state = player.getPlayerState();
                if (state !== PLAYING && state !== BUFFERING) onStatus('needs-click');
              }, AUTOPLAY_GRACE_MS),
            );
          },
          onStateChange: ({ data }) => !disposed && STATES[data] && onStatus(STATES[data]),
          onError: ({ data }) => {
            const kind = errorKind(data);
            fail(kind === 'sealed' ? checkSealed(videoId) : kind);
          },
        },
      });
    },
    () => fail('unreachable'),
  );

  return { destroy };
}
