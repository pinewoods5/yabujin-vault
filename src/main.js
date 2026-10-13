import Phaser from 'phaser';
import { RoomScene } from './RoomScene.js';
import { BookOverlay } from './BookOverlay.js';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: 640,
  height: 480,
  backgroundColor: '#100818',
  pixelArt: true,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  physics: { default: 'arcade', arcade: { debug: false } },
  scene: [RoomScene],
});

// One book overlay for the whole game: rooms come and go, its window listeners stay single.
game.registry.set('overlay', new BookOverlay(document.getElementById('book-overlay')));
