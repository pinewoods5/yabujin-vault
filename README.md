# Yabujin Vault

A small Undertale-inspired top-down game. Walk around a library; every book is a Yabujin song.
The point is discovery, not streaming: you find songs by exploring, not by scrolling a list.
Songs are not hosted here — each book plays an existing YouTube upload in a visible player.

## Run

```sh
npm install
npm run dev
```

Open the URL Vite prints (http://localhost:5173). The game must be served — opening `index.html`
as a file breaks the YouTube player (it needs a real origin and referrer).

```sh
npm test       # unit tests for the pure modules (node --test, no extra dependencies)
npm run build  # production build into dist/
```

## Controls

| key               | does                                                     |
|-------------------|----------------------------------------------------------|
| arrow keys        | walk                                                     |
| Z / Enter         | read the book in front of you, skip typing, next page    |
| X                 | skip typing; close the open book                         |
| Esc / ×           | close the open book                                      |
| arrow key in book | walk away — closes the book                              |

Closing the book (or leaving/reloading the page) always stops the music. Found books get a colour
and count towards `Discovered: n/5`; progress is kept in `localStorage`.

## Songs

Songs live in `data/songs.json`:

| field    | meaning                                                         |
|----------|-----------------------------------------------------------------|
| `id`     | unique and stable — it is the save key, changing it "unfinds" the book |
| `title`  | shown in the dialogue and the open book                         |
| `year`   | number or `null` (not shown)                                    |
| `source` | `"youtube"`                                                     |
| `url`    | link to an existing upload (`watch?v=`, `youtu.be/`, `/embed/`, `/shorts/`) |
| `shelf`  | which shelf the book stands on (1–3, three books per shelf)     |
| `lore`   | text shown before the book opens; blank lines start a new page; empty → a neutral placeholder |

Entries with a missing id/title, an unknown source or a non-numeric shelf are skipped with a
`[Yabujin Vault]` warning in the browser console, as are books for a full or missing shelf.

The room is the ASCII map in `src/room.js` (`#` wall, `=` empty shelf, `1`–`9` a book slot,
`P` start). All in-game text is in `src/strings.js`.

## When a song is gone

Uploads disappear. The book handles it in-world instead of showing YouTube's error screen:

| what happened                                   | the book says                                      |
|-------------------------------------------------|----------------------------------------------------|
| bad link, removed or private upload             | "The pages are empty. The song has vanished."      |
| upload exists but may not be embedded           | "The book is sealed shut…" + link to the original  |
| YouTube blocked/offline, player not ready in 10 s | "The book won't open right now…" + link          |
| browser blocked autoplay                        | player stays visible: "If the song doesn't start, press play." |

YouTube's embedded player reports removed videos with the same error as non-embeddable ones (150),
so that case is double-checked against YouTube's oEmbed endpoint (404 = gone).

## Adding another source later

`src/media/index.js` maps `source` to an adapter: `(url, container, { onStatus }) → { destroy() }`.
For SoundCloud, add `src/media/soundcloud.js` with that shape (Widget API), register it there, and
add `"soundcloud"` to `SOURCES` in `src/songs.js`. The scene and the book overlay don't change.
