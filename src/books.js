// Sources a song can play from. A new source needs an adapter in src/media/ too.
export const SOURCES = ['youtube'];
const TYPES = ['song', 'lore'];
const ROOMS = ['library', 'garden'];
const SPECIALS = ['locked-page'];
const COLOR = /^#[0-9a-f]{6}$/i;

// Keeps only entries the game can use and explains why the others were skipped.
// Bad optional fields are reported and ignored; the book itself is kept.
// A broken url does not make a song invalid: that book exists, but its song has vanished.
export function validateBooks(data) {
  const books = [];
  const problems = [];
  if (!Array.isArray(data)) return { books, problems: ['books.json must be a list of books'] };

  const seen = new Set();
  data.forEach((entry, i) => {
    const where = `books.json entry ${i + 1}${typeof entry?.id === 'string' && entry.id ? ` ("${entry.id}")` : ''}`;
    if (!entry || typeof entry !== 'object') {
      problems.push(`${where}: not an object — skipped`);
      return;
    }
    const { id, type, room, title, pages = [] } = entry;
    const issues = [];
    if (typeof id !== 'string' || !id.trim()) issues.push('missing id');
    else if (seen.has(id)) issues.push(`duplicate id "${id}"`);
    if (!TYPES.includes(type)) issues.push(`unknown type "${type}"`);
    if (!ROOMS.includes(room)) issues.push(`unknown room "${room}"`);
    if (typeof title !== 'string' || !title.trim()) issues.push('missing title');
    if (!Array.isArray(pages) || pages.some((page) => typeof page !== 'string')) issues.push('pages must be a list of text');
    if (type === 'song' && !SOURCES.includes(entry.source)) issues.push(`unknown source "${entry.source}"`);
    if (type === 'song' && typeof entry.url !== 'string') issues.push('url must be text');
    if (issues.length) {
      problems.push(`${where}: ${issues.join(', ')} — skipped`);
      return;
    }

    const optional = (name, isValid, fallback) => {
      if (entry[name] === undefined) return fallback;
      if (isValid(entry[name])) return entry[name];
      problems.push(`${where}: ignoring bad ${name} ${JSON.stringify(entry[name])}`);
      return fallback;
    };

    seen.add(id);
    books.push({
      id,
      type,
      room,
      title: title.trim(),
      pages: pages.map((page) => page.trim()).filter(Boolean),
      source: entry.source,
      url: typeof entry.url === 'string' ? entry.url.trim() : undefined,
      start: optional('start', (v) => Number.isFinite(v) && v >= 0, null),
      tint: optional('tint', (v) => Array.isArray(v) && v.every((c) => c === null || COLOR.test(c)), []),
      mirrored: optional('mirrored', (v) => typeof v === 'boolean', false),
      requires: optional('requires', (v) => Number.isInteger(v) && v >= 0, 0),
      special: optional('special', (v) => SPECIALS.includes(v), null),
    });
  });
  return { books, problems };
}

// Puts a room's books where its layout (src/room.js) says: shelf slots left to right,
// and the "locked-page" book on the lectern.
export function placeBooks(books, room) {
  const byId = new Map(books.map((book) => [book.id, book]));
  const slotsByShelf = new Map();
  for (const slot of room.slots) {
    if (!slotsByShelf.has(slot.shelf)) slotsByShelf.set(slot.shelf, []);
    slotsByShelf.get(slot.shelf).push(slot);
  }

  const placed = [];
  const problems = [];
  const used = new Set();
  for (const [shelf, ids] of Object.entries(room.shelves)) {
    const slots = slotsByShelf.get(Number(shelf)) ?? [];
    ids.forEach((id, i) => {
      const book = byId.get(id);
      if (!book) problems.push(`shelf ${shelf} of the ${room.name}: there is no book "${id}"`);
      else if (book.room !== room.name) problems.push(`"${id}" belongs in the ${book.room}, not on shelf ${shelf} of the ${room.name}`);
      else if (used.has(id)) problems.push(`"${id}" is on more than one shelf`);
      else if (!slots[i]) problems.push(`shelf ${shelf} of the ${room.name} has no room for "${id}"`);
      else {
        used.add(id);
        placed.push({ book, tile: slots[i] });
      }
    });
  }

  for (const book of books) {
    if (book.room !== room.name || used.has(book.id)) continue;
    if (book.special === 'locked-page' && room.lectern) {
      used.add(book.id);
      placed.push({ book, tile: room.lectern });
    } else problems.push(`"${book.id}" is not on any shelf in the ${room.name}`);
  }
  return { placed, problems };
}

// Dialogue boxes in Undertale style.
export const speech = (lines) => lines.map((line) => ({ text: `* ${line}` }));

// What the dialogue box shows for a book: its pages, or just the title when it has none.
export function bookPages(book) {
  const pages = speech(book.pages.length ? book.pages : [book.title]);
  return pages.map((page, i) => ({ ...page, tint: book.tint[i] ?? null, mirrored: book.mirrored }));
}

// A book with "requires" stays hidden until that many songs have been found.
export const isVisible = (book, songsFound) => songsFound >= book.requires;

// Songs X/Y and Fragments X/Y. Garden books only count once the Garden is open.
export function counts(books, isFound, gardenOpen) {
  const counted = books.filter((book) => book.room !== 'garden' || gardenOpen);
  const tally = (type) => {
    const ofType = counted.filter((book) => book.type === type);
    return { found: ofType.filter((book) => isFound(book.id)).length, total: ofType.length };
  };
  return { songs: tally('song'), fragments: tally('lore') };
}
