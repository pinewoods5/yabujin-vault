const CHAR_DELAY_MS = 30;
const MAX_LINES = 3;
const MARGIN = 16;
const HEIGHT = 132;

// Undertale-style box at the bottom of the screen. Text types out one character at a time;
// skip() shows the whole page, advance() skips or turns to the next page.
// Pages are { text }.
export class DialogueBox {
  constructor(scene) {
    this.scene = scene;
    const { width, height } = scene.scale;
    const top = height - HEIGHT - MARGIN;

    const frame = scene.add
      .rectangle(MARGIN, top, width - MARGIN * 2, HEIGHT, 0x000000)
      .setOrigin(0)
      .setStrokeStyle(4, 0xffffff);
    this.text = scene.add.text(MARGIN + 24, top + 22, '', {
      fontFamily: 'monospace',
      fontSize: '22px',
      color: '#ffffff',
      lineSpacing: 8,
      wordWrap: { width: width - MARGIN * 2 - 48 },
    });
    this.container = scene.add.container(0, 0, [frame, this.text]).setDepth(20).setVisible(false);
  }

  get typing() {
    return this.shown < this.current.length;
  }

  show(pages, { onDone } = {}) {
    // Wrap up front so words don't jump lines while typing, and split pages that don't fit.
    this.boxes = pages.flatMap((page) => {
      const lines = this.text.getWrappedText(page.text);
      const boxes = [];
      for (let i = 0; i < lines.length; i += MAX_LINES) boxes.push({ ...page, lines: lines.slice(i, i + MAX_LINES) });
      return boxes;
    });
    this.box = 0;
    this.onDone = onDone;
    this.container.setVisible(true);
    this.startBox();
  }

  startBox() {
    this.current = this.boxes[this.box].lines.join('\n');
    this.shown = 0;
    this.text.setText('');
    this.timer = this.scene.time.addEvent({ delay: CHAR_DELAY_MS, loop: true, callback: () => this.typeNext() });
  }

  typeNext() {
    this.shown += 1;
    this.text.setText(this.current.slice(0, this.shown));
    if (!this.typing) this.timer.remove();
  }

  skip() {
    if (!this.typing) return;
    this.timer.remove();
    this.shown = this.current.length;
    this.text.setText(this.current);
  }

  advance() {
    if (this.typing) return this.skip();
    this.box += 1;
    if (this.box < this.boxes.length) return this.startBox();
    this.container.setVisible(false);
    this.onDone?.();
  }
}
