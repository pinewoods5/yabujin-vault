import { parseYouTubeId } from './youtubeId.js';

const API_URL = 'https://www.youtube.com/iframe_api';
// YouTube asks for a player of at least 200×200; 16:9 at 225px high.
const WIDTH = 400;
const HEIGHT = 225;
// YT.PlayerState values we report.
const STATES = { 0: 'ended', 1: 'playing', 2: 'paused', 3: 'loading' };

let apiPromise = null;

function loadYouTubeApi() {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  apiPromise ??= new Promise((resolve) => {
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      resolve(window.YT);
    };
    const script = document.createElement('script');
    script.src = API_URL;
    document.head.append(script);
  });
  return apiPromise;
}

export function createYouTubePlayer(url, container, { onStatus }) {
  let player = null;
  let disposed = false;
  const videoId = parseYouTubeId(url);

  const mount = document.createElement('div');
  container.replaceChildren(mount);
  onStatus('loading');

  loadYouTubeApi().then((YT) => {
    // The book may have been closed while the API was still loading.
    if (disposed) return;
    player = new YT.Player(mount, {
      width: WIDTH,
      height: HEIGHT,
      videoId,
      playerVars: { autoplay: 1, playsinline: 1, rel: 0 },
      events: {
        onReady: () => !disposed && player.playVideo(),
        onStateChange: ({ data }) => !disposed && STATES[data] && onStatus(STATES[data]),
      },
    });
  });

  return {
    destroy() {
      disposed = true;
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
      container.replaceChildren();
    },
  };
}
