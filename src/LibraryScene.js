import Phaser from 'phaser';
import songsData from '../data/songs.json';
import { TILE, parseRoom } from './room.js';
import { validateSongs, placeBooks } from './songs.js';

const PLAYER_SPEED = 120;
const COLORS = { wall: 0x2b2140, shelf: 0x5a3a22, shelfEdge: 0x2e1c10, spine: 0x77727f, player: 0xffffff, eye: 0x100818 };
const UP = { x: 0, y: -1 };
const DOWN = { x: 0, y: 1 };
const LEFT = { x: -1, y: 0 };
const RIGHT = { x: 1, y: 0 };

const tileCenter = ({ col, row }) => ({ x: col * TILE + TILE / 2, y: row * TILE + TILE / 2 });
const tileKey = ({ col, row }) => `${col},${row}`;

export class LibraryScene extends Phaser.Scene {
  constructor() {
    super('library');
  }

  create() {
    this.room = parseRoom();
    this.cursors = this.input.keyboard.createCursorKeys();

    const solids = this.buildRoom();
    this.placeBooks();
    this.createPlayer();
    this.physics.add.collider(this.player, solids);
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
  }

  createPlayer() {
    const { x, y } = tileCenter(this.room.spawn);
    this.player = this.add.rectangle(x, y, 18, 22, COLORS.player).setDepth(5);
    this.physics.add.existing(this.player);
    this.player.body.setCollideWorldBounds(true);
    this.eye = this.add.rectangle(x, y, 6, 6, COLORS.eye).setDepth(6);
    this.facing = DOWN;
  }

  update() {
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
