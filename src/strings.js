// Every piece of in-game text lives here, so wording can be changed in one place.
export const STRINGS = {
  discovered: (count, total) => `Discovered: ${count}/${total}`,
  found: (title, year) => `* You found "${title}"${year ? ` (${year})` : ''}.`,
  emptyLore: '* Nothing has been written about this one yet.',

  bookTitle: (title, year) => (year ? `${title} (${year})` : title),
  closeHint: '[X/Esc] Close',
  closeLabel: 'Close the book',
  focusHint: 'Click outside the player to use the keys again.',
  status: {
    loading: '* The book creaks open...',
    playing: '* The song fills the room.',
    paused: '* The song holds its breath.',
    ended: '* The last page. The song is over.',
  },
};
