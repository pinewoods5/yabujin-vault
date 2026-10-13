import { FONT_FAMILY, TEST_STRING } from './font.js';

const CHAR_DELAY_MS = 30;
const MAX_LINES = 3;
const MARGIN = 16;
const HEIGHT = 132;
const PADDING = 24;

// Undertale-style box at the bottom of the screen. Text types out one character at a time;
// skip() shows the whole page, advance() skips or turns to the next page.
// Pages are { text, tint?, mirrored? }; onPage(page) is called as each box of a page starts.
// Like Undertale, the box moves to the top of the screen when `atTop` (the player is low down).
export class DialogueBox {
  constructor(scene) {
    this.scene = scene;
    const { width, height } = scene.scale;
    const top = height - HEIGHT - MARGIN;
    this.topOffset = MARGIN - top;
    const textWidth = width - MARGIN * 2 - PADDING * 2;

    const frame = scene.add
      .rectangle(MARGIN, top, width - MARGIN * 2, HEIGHT, 0x000000)
      .setOrigin(0)
      .setStrokeStyle(4, 0xffffff);
    this.text = scene.add.text(MARGIN + PADDING, top + 22, '', {
      fontFamily: FONT_FAMILY,
      fontSize: '22px',
      color: '#ffffff',
      lineSpacing: 8,
      testString: TEST_STRING,
      fixedWidth: textWidth, // mirrored text flips within the box
      wordWrap: { width: textWidth, useAdvancedWrap: true },
    });
    this.container = scene.add.container(0, 0, [frame, this.text]).setDepth(20).setVisible(false);
  }

  get typing() {
    return this.shown < this.current.length;
  }

  show(pages, { onPage, onDone, atTop = false } = {}) {
    this.container.y = atTop ? this.topOffset : 0;
    // Wrap up front so words don't jump lines while typing, and split pages that don't fit.
    // A word longer than a whole line (LIMBO's endless numbers) is not split into pages: it fills
    // the box and keeps scrolling as it types.
    this.boxes = pages.flatMap((page) => {
      const lines = this.text.getWrappedText(page.text);
      const endless = page.text.split(/\s+/).some((word) => this.text.getWrappedText(word).length > 1);
      if (endless && lines.length > MAX_LINES) {
        // Hard spaces make the page one long word, so it breaks per character and fills every line.
        return [{ ...page, lines: this.text.getWrappedText(page.text.replace(/ /g, '\u00a0')), scroll: true }];
      }
      const boxes = [];
      for (let i = 0; i < lines.length; i += MAX_LINES) boxes.push({ ...page, lines: lines.slice(i, i + MAX_LINES) });
      return boxes;
    });
    this.box = 0;
    this.onPage = onPage;
    this.onDone = onDone;
    this.container.setVisible(true);
    this.startBox();
  }

  startBox() {
    const box = this.boxes[this.box];
    this.current = box.lines.join('\n');
    this.shown = 0;
    this.text.setFlipX(Boolean(box.mirrored));
    this.render();
    this.onPage?.(box);
    this.timer = this.scene.time.addEvent({ delay: CHAR_DELAY_MS, loop: true, callback: () => this.typeNext() });
  }

  render() {
    const typed = this.current.slice(0, this.shown);
    // A scrolling box only keeps its newest lines, like text running past a window.
    this.text.setText(this.boxes[this.box].scroll ? typed.split('\n').slice(-MAX_LINES).join('\n') : typed);
  }

  typeNext() {
    this.shown += 1;
    this.render();
    if (!this.typing) this.timer.remove();
  }

  skip() {
    if (!this.typing) return;
    this.timer.remove();
    this.shown = this.current.length;
    this.render();
  }

  advance() {
    if (this.typing) return this.skip();
    this.box += 1;
    if (this.box < this.boxes.length) return this.startBox();
    this.hide();
    this.onDone?.();
  }

  // Shows a line at once and keeps the box open (for a question); returns where an answer goes.
  hold(text, { atTop = false } = {}) {
    this.timer?.remove();
    this.container.y = atTop ? this.topOffset : 0;
    this.text.setFlipX(false).setText(text);
    this.container.setVisible(true);
    return { x: this.text.x, y: this.text.y + this.container.y + 44 };
  }

  hide() {
    this.timer?.remove();
    this.container.setVisible(false);
    this.text.setFlipX(false);
  }
}
