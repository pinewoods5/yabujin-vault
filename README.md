# Yabujin Vault

A small Undertale-inspired top-down game. Walk around a library; every book is a Yabujin song or a
fragment of his story. The point is discovery, not streaming: you find songs by exploring, not by
scrolling a list. Songs are not hosted here — each song book plays an existing YouTube upload in a
visible player.

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

**Dev only:** `Shift+R` (while walking, in `npm run dev`) forgets all saved progress — found books
and the opened Garden — and reloads, so the puzzle can be played from scratch. It is not in the
production build.

## Controls

| key               | does                                                     |
|-------------------|----------------------------------------------------------|
| arrow keys        | walk                                                     |
| Z / Enter         | read the book or talk to whoever is in front of you, skip typing, next page |
| X                 | skip typing; close the open book                         |
| Esc / ×           | close the open book, or the Gatekeeper's question        |
| arrow key in book | walk away — closes the book                              |

Closing the book (or leaving/reloading the page) always stops the music. Found books get a colour
and count towards `Songs X/Y` and `Fragments X/Y`; progress is kept in `localStorage`
(`yabujin-vault/*`).

## Books

Books live in `data/books.json`:

| field      | meaning                                                         |
|------------|-----------------------------------------------------------------|
| `id`       | unique and stable — it is the save key, changing it "unfinds" the book |
| `type`     | `"song"` (pages, then the book opens and plays) or `"lore"` (pages only) |
| `room`     | `"library"` or `"garden"`                                       |
| `title`    | shown on the open book; also the only page of a song without pages |
| `pages`    | dialogue boxes shown in order (Z/Enter to advance)              |
| `source`   | songs: `"youtube"`                                              |
| `url`      | songs: an existing upload (`watch?v=`, `youtu.be/`, `/embed/`, `/shorts/`) |
| `start`    | songs, optional: start playing at this many seconds             |
| `tint`     | optional: one colour per page (`"#rrggbb"` or `null`) washed over the room while it shows |
| `mirrored` | optional: the pages are shown in mirror writing                 |
| `requires` | optional: the book only appears once this many songs have been found |
| `special`  | optional: `"locked-page"` puts the book on the Gatekeeper's lectern instead of a shelf |

Entries that can't be used are skipped, and bad optional fields ignored, with a `[Yabujin Vault]`
warning in the browser console.

A page with a word longer than a whole line (LIMBO) isn't split into boxes: it fills the box and
keeps scrolling as it types.

### Where books stand

Each room in `src/room.js` is an ASCII map plus a `shelves` list naming, per shelf, the book ids
in its slots from left to right:

| tile  | meaning                                  |
|-------|------------------------------------------|
| `#`   | wall                                     |
| `.`   | floor                                    |
| `P`   | player start (otherwise next to the door) |
| `=`   | shelf without books                      |
| `1`–`9` | a book slot on that shelf              |
| `L`   | lectern for the room's `locked-page` book |
| `G`   | the Gatekeeper                           |
| `D`   | door to the room in `doorTo`             |
| space | outside the room                         |

A book that is in `books.json` but on no shelf (or a shelf entry with no such book) is reported in
the console. All in-game text is in `src/strings.js`.

## The Gatekeeper and the Garden

The Azeroy Gatekeeper stands in front of the library's bottom wall, the locked page on a lectern in
front of him; talk to him from the side. He asks you to speak the words. The answer (in
`src/gate.js`) is compared uppercase, without accents, punctuation or extra spaces. Wrong answers
rotate through three replies, and from the third one he points at the book of numbers. The right
words open a door behind him; he steps aside, and the opened Garden is saved.

The Secret Garden is a small gold-tinted room with the five `"garden"` books. Its books only count
in the totals once it is open.

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

`src/media/index.js` maps `source` to an adapter: `(url, container, { start, onStatus }) → { destroy() }`.
For SoundCloud, add `src/media/soundcloud.js` with that shape (Widget API), register it there, and
add `"soundcloud"` to `SOURCES` in `src/books.js`. The scenes and the book overlay don't change.
