import { STRINGS } from './strings.js';

const ROBE = 0x3b2a5a;
const GOLD = 0xd4af37;

// The Azeroy Gatekeeper: a scripted NPC standing in front of the Garden door.
export class Gatekeeper {
  constructor(scene, tile, center) {
    this.scene = scene;
    this.tile = tile;
    const { x, y } = center(tile);
    this.figure = scene.add.rectangle(x, y, 22, 28, ROBE).setStrokeStyle(2, GOLD).setDepth(5);
    this.eyes = scene.add.rectangle(x, y - 6, 10, 3, GOLD).setDepth(6);
    scene.physics.add.existing(this.figure, true);
    this.met = false;
  }

  talk() {
    if (this.met) return this.scene.say(['...']);
    this.met = true;
    this.scene.say(STRINGS.gate.intro);
  }
}
