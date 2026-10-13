import { STRINGS } from './strings.js';

// The text field for "Speak the words." A DOM input inside the dialogue box; as a Phaser DOM
// element it stays positioned and scaled with the canvas.
export class SpeakPrompt {
  constructor(scene) {
    this.field = document.createElement('input');
    this.field.className = 'speak-input';
    this.field.type = 'text';
    this.field.maxLength = 60;
    this.field.autocomplete = 'off';
    this.field.spellcheck = false;
    this.field.setAttribute('aria-label', STRINGS.gate.prompt);
    this.element = scene.add.dom(0, 0, this.field).setOrigin(0).setVisible(false);
  }

  get value() {
    return this.field.value;
  }

  open({ x, y }) {
    this.field.value = '';
    this.element.setPosition(x, y).setVisible(true);
    // Phaser only shows the element on its next render; a hidden field can't take focus.
    this.field.style.display = 'block';
    this.field.focus({ preventScroll: true });
  }

  close() {
    this.field.blur();
    this.element.setVisible(false);
  }
}
