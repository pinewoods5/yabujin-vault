export const STORAGE_KEY = 'yabujin-vault/discovered/v1';

// localStorage can be missing or throw (private windows, blocked site data), so every access is
// guarded and the game simply keeps its progress in memory when saving is not possible.
export function browserStorage() {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

// Remembers which books have been found. Only ids of books in the library count, but saved ids of
// books that are gone right now are kept, so editing songs.json does not wipe anyone's progress.
export function createDiscovery(storage, bookIds) {
  const books = new Set(bookIds);
  const saved = new Set(read().filter((id) => typeof id === 'string'));

  function read() {
    try {
      const parsed = JSON.parse(storage?.getItem(STORAGE_KEY) ?? '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function write() {
    try {
      storage?.setItem(STORAGE_KEY, JSON.stringify([...saved]));
    } catch {
      // Not saved; progress still counts for this visit.
    }
  }

  return {
    has: (id) => books.has(id) && saved.has(id),
    add(id) {
      if (!books.has(id) || saved.has(id)) return false;
      saved.add(id);
      write();
      return true;
    },
    get count() {
      return [...books].filter((id) => saved.has(id)).length;
    },
    total: books.size,
  };
}
