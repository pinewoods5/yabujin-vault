import Phaser from 'phaser';
import booksData from '../data/books.json';
import { TILE, loadRoom } from './room.js';
import { validateBooks, placeBooks, bookPages, isVisible, counts } from './books.js';
import { DialogueBox } from './DialogueBox.js';
import { browserStorage, createDiscovery, resetProgress } from './discovery.js';
import { STRINGS } from './strings.js';
import { FONT_FAMILY, TEST_STRING } from './font.js';

const PLAYER_SPEED = 120;
const COLORS = {
  wall: 0x2b2140,
  shelf: 0x5a3a22,
  shelfEdge: 0x2e1c10,
  spine: 0x77727f,
  void: 0x000000,
  player: 0xffffff,
  eye: 0x100818,
};
const UP = { x: 0, y: -1 };
const DOWN = { x: 0, y: 1 };
const LEFT = { x: -1, y: 0 };
const RIGHT = { x: 1, y: 0 };
const CONFIRM_KEYS = ['KeyZ', 'Enter', 'NumpadEnter'];
// Arrow keys close the book too: walking away from the shelf stops the music.
const CLOSE_KEYS = ['Escape', 'KeyX', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
const FOUND_COLORS = [0xff4fa3, 0x7cf3ff, 0xc8ff5a, 0xffb347, 0xb28cff, 0xff6b6b];
const PAGE_TINT_ALPHA = 0.35;
const ROOM_TINT_ALPHA = 0.18;

const warn = (problem) => console.warn(`[Yabujin Vault] ${problem}`);
const checked = validateBooks(booksData);
checked.problems.forEach(warn);
const BOOKS = checked.books;

// Where each room's books stand, worked out (and warned about) once per room.
const placements = new Map();
function placementFor(room) {
  if (!placements.has(room.name)) {
    const { placed, problems } = placeBooks(BOOKS, room);
    problems.forEach(warn);
    placements.set(room.name, placed);
  }
  return placements.get(room.name);
}

const tileCenter = ({ col, row }) => ({ x: col * TILE + TILE / 2, y: row * TILE + TILE / 2 });
const tileKey = ({ col, row }) => `${col},${row}`;

// Each found book keeps the same colour between visits.
function foundColor(id) {
  let hash = 0;
  for (const ch of id) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return FOUND_COLORS[hash % FOUND_COLORS.length];
}

export class RoomScene extends Phaser.Scene {
  constructor() {
    super('room');
  }

  init(data) {
    this.roomName = data?.room ?? 'library';
  }

  create() {
    this.room = loadRoom(this.roomName);
    this.mode = 'walking'; // walking | dialogue | book
    this.storage = browserStorage();
    this.discovery = createDiscovery(this.storage);
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
    this.createTint();
    this.dialogue = new DialogueBox(this);
    this.createCounters();

    this.overlay = this.registry.get('overlay');
    this.overlay.onCloseRequest = () => this.closeBook();
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
    this.room.shelfTiles.forEach((tile) => addTile(tile, COLORS.shelf).setStrokeStyle(2, COLORS.shelfEdge));
    this.room.voids.forEach((tile) => this.add.rectangle(tileCenter(tile).x, tileCenter(tile).y, TILE, TILE, COLORS.void));
    if (this.room.lectern) {
      const { x, y } = tileCenter(this.room.lectern);
      solids.add(this.add.rectangle(x, y + 4, 24, 20, COLORS.shelf).setStrokeStyle(2, COLORS.shelfEdge));
    }
    return solids;
  }

  placeBooks() {
    // Books by tile, so the player can find the one in front of them.
    this.books = new Map();
    for (const { book, tile } of placementFor(this.room)) {
      const { x, y } = tileCenter(tile);
      const onLectern = this.room.lectern && tileKey(tile) === tileKey(this.room.lectern);
      const spine = this.add
        .rectangle(x, onLectern ? y - 2 : y, onLectern ? 18 : 12, onLectern ? 10 : 24, COLORS.spine)
        .setStrokeStyle(2, COLORS.shelfEdge)
        .setDepth(1);
      if (this.discovery.has(book.id)) spine.setFillStyle(foundColor(book.id));
      this.books.set(tileKey(tile), { book, spine, visible: false });
    }
    this.refreshShelves({ fade: false });
  }

  // Shows books whose "requires" is met by the songs found so far; new ones fade in.
  refreshShelves({ fade = true } = {}) {
    const songsFound = BOOKS.filter((book) => book.type === 'song' && this.discovery.has(book.id)).length;
    for (const entry of this.books.values()) {
      const visible = isVisible(entry.book, songsFound);
      if (fade && visible && !entry.visible) {
        entry.spine.setVisible(true).setAlpha(0);
        this.tweens.add({ targets: entry.spine, alpha: 1, duration: 900 });
      } else entry.spine.setVisible(visible);
      entry.visible = visible;
    }
  }

  createTint() {
    const { width, height } = this.scale;
    this.tint = this.add.rectangle(0, 0, width, height, 0x000000, 0).setOrigin(0).setDepth(8);
    this.setTint(null);
  }

  // A page's colour washes over the room while it is shown; otherwise the room's own tint.
  setTint(color) {
    const [hex, alpha] = color ? [color, PAGE_TINT_ALPHA] : [this.room.tint, ROOM_TINT_ALPHA];
    if (!hex) this.tint.setFillStyle(0x000000, 0);
    else this.tint.setFillStyle(Phaser.Display.Color.HexStringToColor(hex).color, alpha);
  }

  createCounters() {
    this.counters = this.add
      .text(12, 8, '', { fontFamily: FONT_FAMILY, fontSize: '16px', color: '#ffffff', testString: TEST_STRING })
      .setDepth(10);
    this.updateCounters();
  }

  updateCounters() {
    const { songs, fragments } = counts(BOOKS, (id) => this.discovery.has(id), false);
    this.counters.setText(STRINGS.counters(songs, fragments));
  }

  discover(entry) {
    if (!this.discovery.add(entry.book.id)) return;
    entry.spine.setFillStyle(foundColor(entry.book.id));
    this.updateCounters();
    this.refreshShelves();
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
    if (import.meta.env.DEV && this.mode === 'walking' && event.shiftKey && event.code === 'KeyR') {
      resetProgress(this.storage);
      window.location.reload();
      return;
    }
    const confirm = CONFIRM_KEYS.includes(event.code);
    if (this.mode === 'walking' && confirm) this.interact();
    else if (this.mode === 'dialogue' && confirm) this.dialogue.advance();
    else if (this.mode === 'dialogue' && event.code === 'KeyX') this.dialogue.skip();
    else if (this.mode === 'book' && CLOSE_KEYS.includes(event.code)) this.closeBook();
  }

  interact() {
    const entry = this.books.get(tileKey(this.frontTile()));
    if (entry?.visible) this.read(entry);
  }

  // Songs: pages (or just the title), then the book opens and plays. Lore: pages only.
  read(entry) {
    const { book } = entry;
    this.mode = 'dialogue';
    this.dialogue.show(bookPages(book), {
      onPage: (page) => this.setTint(page.tint),
      onDone: () => {
        this.setTint(null);
        this.discover(entry);
        if (book.type !== 'song') {
          this.mode = 'walking';
          return;
        }
        this.mode = 'book';
        this.overlay.open(book);
      },
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
