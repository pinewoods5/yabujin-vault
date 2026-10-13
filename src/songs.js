// Sources a book can play from. A new source needs an adapter in src/media/ too.
export const SOURCES = ['youtube'];

// Keeps only entries the game can use and explains why the others were skipped.
// A broken url does not make an entry invalid: that book exists, but its song has vanished.
export function validateSongs(data) {
  const songs = [];
  const problems = [];
  if (!Array.isArray(data)) return { songs, problems: ['songs.json must be a list of songs'] };

  const seen = new Set();
  data.forEach((entry, i) => {
    const where = `songs.json entry ${i + 1}`;
    if (!entry || typeof entry !== 'object') {
      problems.push(`${where}: not an object — skipped`);
      return;
    }
    const { id, title, source, url, shelf } = entry;
    const issues = [];
    if (typeof id !== 'string' || !id.trim()) issues.push('missing id');
    else if (seen.has(id)) issues.push(`duplicate id "${id}"`);
    if (typeof title !== 'string' || !title.trim()) issues.push('missing title');
    if (!SOURCES.includes(source)) issues.push(`unknown source "${source}"`);
    if (typeof url !== 'string') issues.push('url must be text');
    if (!Number.isInteger(shelf)) issues.push('shelf must be a whole number');
    if (issues.length) {
      problems.push(`${where}: ${issues.join(', ')} — skipped`);
      return;
    }

    seen.add(id);
    songs.push({
      id,
      title: title.trim(),
      year: Number.isInteger(entry.year) ? entry.year : null,
      source,
      url: url.trim(),
      shelf,
      lore: typeof entry.lore === 'string' ? entry.lore.trim() : '',
    });
  });
  return { songs, problems };
}

// Puts each song in the next free slot of its shelf, in file order.
export function placeBooks(songs, slots) {
  const free = new Map();
  for (const slot of slots) {
    if (!free.has(slot.shelf)) free.set(slot.shelf, []);
    free.get(slot.shelf).push(slot);
  }

  const books = [];
  const problems = [];
  for (const song of songs) {
    const shelfSlots = free.get(song.shelf);
    if (!shelfSlots) problems.push(`"${song.id}": there is no shelf ${song.shelf} — not placed`);
    else if (!shelfSlots.length) problems.push(`"${song.id}": shelf ${song.shelf} is full — not placed`);
    else books.push({ song, slot: shelfSlots.shift() });
  }
  return { books, problems };
}
