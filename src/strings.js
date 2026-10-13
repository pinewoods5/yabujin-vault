// Every piece of in-game text lives here, so wording can be changed in one place.
export const STRINGS = {
  discovered: (count, total) => `Discovered: ${count}/${total}`,
  found: (title, year) => `* You found "${title}"${year ? ` (${year})` : ''}.`,
  emptyLore: '* Nothing has been written about this one yet.',
};
