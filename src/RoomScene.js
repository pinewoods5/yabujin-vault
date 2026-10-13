import Phaser from 'phaser';
import booksData from '../data/books.json';
import { TILE, loadRoom } from './room.js';
import { validateBooks, placeBooks, bookPages, isVisible, counts, speech } from './books.js';
import { DialogueBox } from './DialogueBox.js';
import { browserStorage, createDiscovery, resetProgress } from './discovery.js';
import { STRINGS } from './strings.js';
import { FONT_FAMILY, TEST_STRING } from './font.js';
import { Gatekeeper } from './Gatekeeper.js';
import { SpeakPrompt } from './SpeakPrompt.js';
import { createGarden } from './gate.js';

const PLAYER_SPEED = 120;
const COLORS = {
  shelf: 0x5a3a22,
  shelfEdge: 0x2e1c10,
  spine: 0x77727f,
  void: 0x000000,
  gold: 0xd4af37,
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
const FADE_MS = 250;

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

  // A page load always starts in the library; doors restart the scene in the room behind them.
  init(data) {
    this.roomName = data?.room ?? 'library';
    this.arriving = Boolean(data?.arriving);
  }

  create() {
    // The scene object is reused when it restarts in another room: forget the last room's things.
    this.gatekeeper = null;
    this.speak = null;
    this.doorOpen = false;
    this.room = loadRoom(this.roomName);
    this.cameras.main.setBackgroundColor(this.room.colors.floor).fadeIn(FADE_MS);
    this.mode = 'walking'; // walking | dialogue | book | input | transition
    this.storage = browserStorage();
    this.discovery = createDiscovery(this.storage);
    this.garden = createGarden(this.storage);
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
    if (this.room.door && this.doorUnlocked()) this.openDoor({ animate: false });
    if (this.room.gatekeeper) {
      this.gatekeeper = new Gatekeeper(this, this.room.gatekeeper, { center: tileCenter, garden: this.garden });
      this.physics.add.collider(this.player, this.gatekeeper.figure);
      this.speak = new SpeakPrompt(this);
    }
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
    this.room.walls.forEach((tile) => addTile(tile, this.room.colors.wall));
    this.room.shelfTiles.forEach((tile) => addTile(tile, COLORS.shelf).setStrokeStyle(2, COLORS.shelfEdge));
    // Outside the room stays black, above the room's tint.
    this.room.voids.forEach((tile) => this.add.rectangle(tileCenter(tile).x, tileCenter(tile).y, TILE, TILE, COLORS.void).setDepth(9));
    if (this.room.lectern) {
      const { x, y } = tileCenter(this.room.lectern);
      solids.add(this.add.rectangle(x, y + 4, 24, 20, COLORS.shelf).setStrokeStyle(2, COLORS.shelfEdge));
    }
    if (this.room.door) {
      // A closed door is just more wall, until it opens.
      const { x, y } = tileCenter(this.room.door);
      this.doorBlock = this.add.rectangle(x, y, TILE, TILE, this.room.colors.wall);
      solids.add(this.doorBlock);
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

  // Only the door into the Garden is ever locked.
  doorUnlocked() {
    return this.room.doorTo !== 'garden' || this.garden.open;
  }

  openDoor({ animate }) {
    this.doorBlock.destroy();
    this.doorOpen = true;
    const { x, y } = tileCenter(this.room.door);
    const doorway = this.add.rectangle(x, y, TILE - 4, TILE, 0x000000).setStrokeStyle(2, COLORS.gold);
    const glow = this.add.rectangle(x, y, TILE - 12, TILE - 8, COLORS.gold, 0.35);
    if (!animate) return;
    doorway.setAlpha(0);
    glow.setAlpha(0);
    this.tweens.add({ targets: [doorway, glow], alpha: 1, duration: 900 });
    this.cameras.main.flash(400, 212, 175, 55);
  }

  // The right words were spoken: the door appears and he steps out of the way.
  unlockGarden() {
    this.garden.unlock();
    this.mode = 'transition';
    this.openDoor({ animate: true });
    this.gatekeeper.stepAside({ side: this.player.x > this.gatekeeper.figure.x ? -1 : 1 });
    this.updateCounters();
    this.time.delayedCall(900, () => (this.mode = 'walking'));
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
    const { songs, fragments } = counts(BOOKS, (id) => this.discovery.has(id), this.garden.open);
    this.counters.setText(STRINGS.counters(songs, fragments));
  }

  discover(entry) {
    if (!this.discovery.add(entry.book.id)) return;
    entry.spine.setFillStyle(foundColor(entry.book.id));
    this.updateCounters();
    this.refreshShelves();
  }

  // Through a door you arrive next to it, facing away from it.
  createPlayer() {
    const { spawn, door, doorStep } = this.room;
    const start = this.arriving ? doorStep : spawn;
    const { x, y } = tileCenter(start);
    this.player = this.add.rectangle(x, y, 18, 22, COLORS.player).setDepth(5);
    this.physics.add.existing(this.player);
    this.player.body.setCollideWorldBounds(true);
    this.eye = this.add.rectangle(x, y, 6, 6, COLORS.eye).setDepth(6);
    this.facing = this.arriving ? { x: doorStep.col - door.col, y: doorStep.row - door.row } : DOWN;
  }

  goThrough() {
    this.mode = 'transition';
    this.player.body.setVelocity(0, 0);
    this.cameras.main.fadeOut(FADE_MS);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.restart({ room: this.room.doorTo, arriving: true }));
  }

  onKeyDown(event) {
    if (event.repeat) return;
    if (this.mode === 'input') return this.onInputKey(event);
    if (import.meta.env.DEV && this.mode === 'walking' && event.shiftKey && event.code === 'KeyR') {
      resetProgress(this.storage);
      window.location.reload();
      return;
    }
    const confirm = CONFIRM_KEYS.includes(event.code);
    // Keys the game acts on are used up, so they never also type into a field they just opened.
    if (confirm || CLOSE_KEYS.includes(event.code)) event.preventDefault();
    if (this.mode === 'walking' && confirm) this.interact();
    else if (this.mode === 'dialogue' && confirm) this.dialogue.advance();
    else if (this.mode === 'dialogue' && event.code === 'KeyX') this.dialogue.skip();
    else if (this.mode === 'book' && CLOSE_KEYS.includes(event.code)) this.closeBook();
  }

  interact() {
    const front = tileKey(this.frontTile());
    if (this.gatekeeper && front === tileKey(this.gatekeeper.tile)) return this.gatekeeper.talk();
    const entry = this.books.get(front);
    if (entry?.visible) this.read(entry);
  }

  // A few lines of dialogue (for NPCs), then back to walking and on to `then`.
  say(lines, then) {
    this.mode = 'dialogue';
    this.dialogue.show(speech(lines), {
      atTop: this.playerIsLow(),
      onDone: () => {
        this.mode = 'walking';
        then?.();
      },
    });
  }

  // Songs: pages (or just the title), then the book opens and plays. Lore: pages only.
  read(entry) {
    const { book } = entry;
    this.mode = 'dialogue';
    this.dialogue.show(bookPages(book), {
      atTop: this.playerIsLow(),
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

  // The dialogue box would cover the player down there, so it goes to the top instead.
  playerIsLow() {
    return this.player.y > this.scale.height / 2;
  }

  // A question with a typed answer. Movement is locked and Phaser stops capturing keys, so space
  // and the arrow keys reach the text field.
  ask(prompt, onAnswer) {
    this.mode = 'input';
    this.onAnswer = onAnswer;
    const spot = this.dialogue.hold(`* ${prompt}`, { atTop: this.playerIsLow() });
    this.input.keyboard.disableGlobalCapture();
    this.speak.open(spot);
  }

  onInputKey(event) {
    if (event.code === 'Escape') return this.endAsk();
    const enter = event.code === 'Enter' || event.code === 'NumpadEnter';
    // Enter while an input method is composing belongs to the input method.
    if (!enter || event.isComposing || event.keyCode === 229 || !this.speak.value.trim()) return;
    const answer = this.speak.value;
    this.endAsk();
    this.onAnswer(answer);
  }

  endAsk() {
    this.speak.close();
    this.dialogue.hide();
    this.input.keyboard.enableGlobalCapture();
    this.mode = 'walking';
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

    if (this.doorOpen && this.walkingIntoDoor(dx, dy)) this.goThrough();
  }

  // On the tile in front of an open door and heading for it: no need to line up with the gap.
  walkingIntoDoor(dx, dy) {
    const { door, doorStep } = this.room;
    const here = { col: Math.floor(this.player.x / TILE), row: Math.floor(this.player.y / TILE) };
    const heading = dx * (door.col - doorStep.col) + dy * (door.row - doorStep.row);
    return heading > 0 && tileKey(here) === tileKey(doorStep);
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
