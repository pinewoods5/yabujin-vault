// Every piece of in-game text lives here, so wording can be changed in one place.
export const STRINGS = {
  counters: (songs, fragments) => `Songs ${songs.found}/${songs.total}   Fragments ${fragments.found}/${fragments.total}`,

  closeHint: '[X/Esc] Close',
  closeLabel: 'Close the book',
  focusHint: 'Click outside the player to use the keys again.',
  status: {
    loading: '* The book creaks open...',
    playing: '* The song fills the room.',
    paused: '* The song holds its breath.',
    ended: '* The last page. The song is over.',
    'needs-click': "* If the song doesn't start, press play.",
  },
  errors: {
    gone: '* The pages are empty. The song has vanished.',
    sealed: '* The book is sealed shut. It can only be heard elsewhere.',
    unreachable: "* The book won't open right now. Something outside the vault is in the way.",
  },
  listenElsewhere: { youtube: 'Listen on YouTube ↗' },
  listenElsewhereFallback: 'Open the original ↗',
};
