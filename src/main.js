import Phaser from 'phaser';
import { LibraryScene } from './LibraryScene.js';

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: 640,
  height: 480,
  backgroundColor: '#100818',
  pixelArt: true,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  physics: { default: 'arcade', arcade: { debug: false } },
  scene: [LibraryScene],
});
