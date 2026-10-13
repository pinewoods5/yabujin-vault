const PREFIX = 'yabujin-vault/';
export const STORAGE_KEY = `${PREFIX}discovered/v1`;

// localStorage can be missing or throw (private windows, blocked site data), so every access is
// guarded and the game simply keeps its progress in memory when saving is not possible.
export function browserStorage() {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

// Remembers which books have been found, by id. Ids of books that are gone from books.json stay
// saved, so editing the data does not wipe anyone's progress.
export function createDiscovery(storage) {
  const found = new Set(read().filter((id) => typeof id === 'string'));

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
      storage?.setItem(STORAGE_KEY, JSON.stringify([...found]));
    } catch {
      // Not saved; progress still counts for this visit.
    }
  }

  return {
    has: (id) => found.has(id),
    add(id) {
      if (found.has(id)) return false;
      found.add(id);
      write();
      return true;
    },
  };
}

// Forgets everything the game has saved (dev shortcut).
export function resetProgress(storage) {
  try {
    for (let i = storage.length - 1; i >= 0; i -= 1) {
      const key = storage.key(i);
      if (key?.startsWith(PREFIX)) storage.removeItem(key);
    }
  } catch {
    // Nothing saved, or saving is blocked.
  }
}
