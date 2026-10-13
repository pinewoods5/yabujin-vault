import Phaser from 'phaser';
import { STRINGS } from './strings.js';

export class LibraryScene extends Phaser.Scene {
  constructor() {
    super('library');
  }

  create() {
    const { width, height } = this.scale;
    this.add
      .text(width / 2, height / 2, STRINGS.title, { fontFamily: 'monospace', fontSize: '32px', color: '#ffffff' })
      .setOrigin(0.5);
  }
}
