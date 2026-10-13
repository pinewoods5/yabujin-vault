import { STRINGS } from './strings.js';
import { createMediaPlayer } from './media/index.js';

function el(tag, className, text = '') {
  const node = document.createElement(tag);
  node.className = className;
  node.textContent = text;
  return node;
}

// The opened book: a DOM layer above the canvas holding the visible player.
// Only one book (and one player) is open at a time, and closing it always stops the music.
export class BookOverlay {
  constructor(root, { onCloseRequest }) {
    this.root = root;
    this.media = null;

    const book = el('div', 'book');
    book.setAttribute('role', 'dialog');
    book.setAttribute('aria-modal', 'true');
    book.setAttribute('aria-labelledby', 'book-title');
    const closeButton = el('button', 'book-close', '×');
    closeButton.type = 'button';
    closeButton.setAttribute('aria-label', STRINGS.closeLabel);
    closeButton.addEventListener('click', onCloseRequest);
    this.title = el('h1', 'book-title');
    this.title.id = 'book-title';
    this.slot = el('div', 'book-player');
    this.status = el('p', 'book-status');
    this.hint = el('p', 'book-hint', STRINGS.closeHint);
    book.append(closeButton, this.title, this.slot, this.status, this.hint);
    root.replaceChildren(book);
    root.hidden = true;

    // Once the player iframe has focus, key presses go to YouTube instead of the game.
    window.addEventListener('blur', () =>
      setTimeout(() => {
        if (this.isOpen && document.activeElement?.tagName === 'IFRAME') this.hint.textContent = STRINGS.focusHint;
      }),
    );
    window.addEventListener('focus', () => (this.hint.textContent = STRINGS.closeHint));
    window.addEventListener('pagehide', () => this.close());
  }

  get isOpen() {
    return !this.root.hidden;
  }

  open(song) {
    this.close();
    this.title.textContent = STRINGS.bookTitle(song.title, song.year);
    this.root.hidden = false;
    this.media = createMediaPlayer(song, this.slot, { onStatus: (status) => this.showStatus(status) });
  }

  close() {
    this.media?.destroy();
    this.media = null;
    this.slot.replaceChildren();
    this.status.textContent = '';
    this.hint.textContent = STRINGS.closeHint;
    this.root.hidden = true;
    // Hand the keyboard back to the game (e.g. after clicking ×).
    document.activeElement?.blur?.();
  }

  showStatus(status) {
    this.status.textContent = STRINGS.status[status] ?? '';
  }
}
