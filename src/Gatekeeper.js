import { STRINGS } from './strings.js';
import { isRightAnswer, wrongReply } from './gate.js';

const ROBE = 0x3b2a5a;
const GOLD = 0xd4af37;

// The Azeroy Gatekeeper: a scripted NPC standing in front of the Garden door. Once the Garden is
// open he stands beside the door instead.
export class Gatekeeper {
  constructor(scene, home, { center, garden }) {
    this.scene = scene;
    this.home = home;
    this.center = center;
    this.garden = garden;
    this.met = false;
    this.wrongTries = 0;

    const { x, y } = center(home);
    this.figure = scene.add.rectangle(x, y, 22, 28, ROBE).setStrokeStyle(2, GOLD).setDepth(5);
    this.eyes = scene.add.rectangle(x, y - 6, 10, 3, GOLD).setDepth(6);
    scene.physics.add.existing(this.figure, true);
    this.tile = home;
    if (garden.open) this.stepAside({ side: 1, animate: false });
  }

  talk() {
    if (this.garden.open) return this.scene.say([STRINGS.gate.remembers]);
    const ask = () => this.scene.ask(STRINGS.gate.prompt, (answer) => this.answer(answer));
    if (this.met) return ask();
    this.met = true;
    this.scene.say(STRINGS.gate.intro, ask);
  }

  answer(text) {
    if (!isRightAnswer(text)) {
      this.wrongTries += 1;
      return this.scene.say(wrongReply(this.wrongTries));
    }
    this.scene.say(STRINGS.gate.right, () => this.scene.unlockGarden());
  }

  // One tile to the side (-1 left, 1 right), out of the doorway.
  stepAside({ side, animate = true }) {
    this.tile = { col: this.home.col + side, row: this.home.row };
    const { x } = this.center(this.tile);
    const settle = () => this.figure.body.updateFromGameObject();
    if (!animate) {
      this.figure.x = x;
      this.eyes.x = x;
      return settle();
    }
    this.scene.tweens.add({ targets: [this.figure, this.eyes], x, duration: 500, ease: 'Sine.easeInOut', onComplete: settle });
  }
}
