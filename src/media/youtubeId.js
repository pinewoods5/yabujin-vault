const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;

// Returns the 11-character video id from the usual YouTube link shapes, or null.
export function parseYouTubeId(url) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  const host = parsed.hostname.replace(/^(www|m|music)\./, '');
  let id = null;
  if (host === 'youtu.be') id = parsed.pathname.split('/')[1];
  else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    if (parsed.pathname === '/watch') id = parsed.searchParams.get('v');
    else id = parsed.pathname.match(/^\/(?:embed|shorts|live)\/([^/]+)/)?.[1];
  }
  return id && VIDEO_ID.test(id) ? id : null;
}
