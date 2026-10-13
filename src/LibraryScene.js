import Phaser from 'phaser';
import songsData from '../data/songs.json';
import { TILE, parseRoom } from './room.js';
import { validateSongs, placeBooks, dialoguePages } from './songs.js';
import { DialogueBox } from './DialogueBox.js';
import { browserStorage, createDiscovery } from './discovery.js';
import { STRINGS } from './strings.js';
import { BookOverlay } from './BookOverlay.js';

const PLAYER_SPEED = 120;
const COLORS = { wall: 0x2b2140, shelf: 0x5a3a22, shelfEdge: 0x2e1c10, spine: 0x77727f, player: 0xffffff, eye: 0x100818 };
const UP = { x: 0, y: -1 };
const DOWN = { x: 0, y: 1 };
const LEFT = { x: -1, y: 0 };
const RIGHT = { x: 1, y: 0 };
const CONFIRM_KEYS = ['KeyZ', 'Enter', 'NumpadEnter'];
// Arrow keys close the book too: walking away from the shelf stops the music.
const CLOSE_KEYS = ['Escape', 'KeyX', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
const FOUND_COLORS = [0xff4fa3, 0x7cf3ff, 0xc8ff5a, 0xffb347, 0xb28cff, 0xff6b6b];

const tileCenter = ({ col, row }) => ({ x: col * TILE + TILE / 2, y: row * TILE + TILE / 2 });
const tileKey = ({ col, row }) => `${col},${row}`;

// Each found book keeps the same colour between visits.
function foundColor(id) {
  let hash = 0;
  for (const ch of id) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return FOUND_COLORS[hash % FOUND_COLORS.length];
}

export class LibraryScene extends Phaser.Scene {
  constructor() {
    super('library');
  }

  create() {
    this.room = parseRoom();
    this.mode = 'walking'; // walking | dialogue | book
    this.cursors = this.input.keyboard.createCursorKeys();
    // Action keys are read from the DOM directly: Phaser 3.90 re-emits a keydown when the key is
    // pressed and released within the same frame, which would open and close things twice.
    const onKeyDown = (event) => this.onKeyDown(event);
    window.addEventListener('keydown', onKeyDown);
    this.events.once('shutdown', () => window.removeEventListener('keydown', onKeyDown));

    const solids = this.buildRoom();
    this.placeBooks();
    this.createPlayer();
    this.physics.add.collider(this.player, solids);
    this.dialogue = new DialogueBox(this);
    this.createCounter();

    this.overlay = new BookOverlay(document.getElementById('book-overlay'), {
      onCloseRequest: () => this.closeBook(),
    });
    this.events.once('shutdown', () => this.overlay.close());
  }

  buildRoom() {
    const solids = this.physics.add.staticGroup();
    const addTile = (tile, color) => {
      const { x, y } = tileCenter(tile);
      const rect = this.add.rectangle(x, y, TILE, TILE, color);
      solids.add(rect);
      return rect;
    };
    this.room.walls.forEach((tile) => addTile(tile, COLORS.wall));
    this.room.shelves.forEach((tile) => addTile(tile, COLORS.shelf).setStrokeStyle(2, COLORS.shelfEdge));
    return solids;
  }

  placeBooks() {
    const checked = validateSongs(songsData);
    const placed = placeBooks(checked.songs, this.room.slots);
    [...checked.problems, ...placed.problems].forEach((problem) => console.warn(`[Yabujin Vault] ${problem}`));

    // Books by tile, so the player can find the one in front of them.
    this.books = new Map();
    for (const { song, slot } of placed.books) {
      const { x, y } = tileCenter(slot);
      const spine = this.add.rectangle(x, y, 12, 24, COLORS.spine).setStrokeStyle(2, COLORS.shelfEdge).setDepth(1);
      this.books.set(tileKey(slot), { song, spine });
    }

    this.discovery = createDiscovery(browserStorage(), [...this.books.values()].map((book) => book.song.id));
    for (const book of this.books.values()) {
      if (this.discovery.has(book.song.id)) book.spine.setFillStyle(foundColor(book.song.id));
    }
  }

  createCounter() {
    this.counter = this.add
      .text(12, 8, '', { fontFamily: 'monospace', fontSize: '16px', color: '#ffffff' })
      .setDepth(10);
    this.updateCounter();
  }

  updateCounter() {
    this.counter.setText(STRINGS.discovered(this.discovery.count, this.discovery.total));
  }

  discover(book) {
    if (!this.discovery.add(book.song.id)) return;
    book.spine.setFillStyle(foundColor(book.song.id));
    this.updateCounter();
  }

  createPlayer() {
    const { x, y } = tileCenter(this.room.spawn);
    this.player = this.add.rectangle(x, y, 18, 22, COLORS.player).setDepth(5);
    this.physics.add.existing(this.player);
    this.player.body.setCollideWorldBounds(true);
    this.eye = this.add.rectangle(x, y, 6, 6, COLORS.eye).setDepth(6);
    this.facing = DOWN;
  }

  onKeyDown(event) {
    if (event.repeat) return;
    const confirm = CONFIRM_KEYS.includes(event.code);
    if (this.mode === 'walking' && confirm) this.interact();
    else if (this.mode === 'dialogue' && confirm) this.dialogue.advance();
    else if (this.mode === 'dialogue' && event.code === 'KeyX') this.dialogue.skip();
    else if (this.mode === 'book' && CLOSE_KEYS.includes(event.code)) this.closeBook();
  }

  interact() {
    const book = this.books.get(tileKey(this.frontTile()));
    if (!book) return;
    this.mode = 'dialogue';
    this.dialogue.show(dialoguePages(book.song), () => {
      this.discover(book);
      this.mode = 'book';
      this.overlay.open(book.song);
    });
  }

  closeBook() {
    if (this.mode !== 'book') return;
    this.overlay.close();
    this.mode = 'walking';
  }

  // The tile just in front of the player, in the direction they face.
  frontTile() {
    const x = this.player.x + this.facing.x * (this.player.width / 2 + 12);
    const y = this.player.y + this.facing.y * (this.player.height / 2 + 12);
    return { col: Math.floor(x / TILE), row: Math.floor(y / TILE) };
  }

  update() {
    if (this.mode !== 'walking') {
      this.player.body.setVelocity(0, 0);
      return;
    }

    const dx = (this.cursors.right.isDown ? 1 : 0) - (this.cursors.left.isDown ? 1 : 0);
    const dy = (this.cursors.down.isDown ? 1 : 0) - (this.cursors.up.isDown ? 1 : 0);

    const velocity = new Phaser.Math.Vector2(dx, dy).normalize().scale(PLAYER_SPEED);
    this.player.body.setVelocity(velocity.x, velocity.y);
    this.updateFacing(dx, dy);
    this.eye.setPosition(this.player.x + this.facing.x * 5, this.player.y + this.facing.y * 6);
  }

  updateFacing(dx, dy) {
    if (dx && !dy) this.facing = dx < 0 ? LEFT : RIGHT;
    else if (dy && !dx) this.facing = dy < 0 ? UP : DOWN;
    else if (dx && dy) {
      // Diagonal: keep facing one of the pressed directions, otherwise face vertically.
      const keeps = this.facing.x === dx || this.facing.y === dy;
      if (!keeps) this.facing = dy < 0 ? UP : DOWN;
    }
  }
}
