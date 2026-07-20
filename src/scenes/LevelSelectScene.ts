import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, LEVELS } from '../config';
import { loadProgress } from '../game/progressStore';
import { RunTimer } from '../game/rules/timer';

const COLS = 5;
const CARD_W = 200;
const CARD_H = 120;
const CELL_W = 220;
const CELL_H = 160;
const GRID_X = (GAME_WIDTH - (COLS * CELL_W - (CELL_W - CARD_W))) / 2;
const GRID_Y = 150;

const KEY_NAMES = ['LEFT', 'RIGHT', 'UP', 'DOWN', 'ENTER', 'SPACE', 'ESC', 'E'] as const;
type KeyName = (typeof KEY_NAMES)[number];

/** Full-screen level picker: arrows + ENTER, or point and click. */
export class LevelSelectScene extends Phaser.Scene {
  private cards: Phaser.GameObjects.Rectangle[] = [];
  private selected = 0;
  private keys!: Record<KeyName, Phaser.Input.Keyboard.Key>;
  private held = new Set<KeyName>();

  constructor() {
    super('level-select');
  }

  create(): void {
    this.cards = [];
    this.selected = 0;
    this.held.clear();
    const progress = loadProgress();
    const style = { fontFamily: 'monospace', color: '#dfe6ee' };

    this.add
      .text(GAME_WIDTH / 2, 70, 'SELECT LEVEL', { ...style, fontSize: '48px', fontStyle: 'bold' })
      .setOrigin(0.5);
    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 60, '←↑↓→  select   ENTER  fly   E  export stats   ESC  back', {
        ...style,
        fontSize: '22px',
        color: '#8899aa',
      })
      .setOrigin(0.5);

    LEVELS.forEach((_, i) => {
      const x = GRID_X + (i % COLS) * CELL_W;
      const y = GRID_Y + Math.floor(i / COLS) * CELL_H;
      const stats = progress[i];

      const card = this.add
        .rectangle(x, y, CARD_W, CARD_H, 0x111721)
        .setOrigin(0)
        .setStrokeStyle(1, 0x2d3748)
        .setInteractive({ useHandCursor: true });
      this.add
        .text(x + CARD_W / 2, y + 38, String(i + 1).padStart(2, '0'), {
          ...style,
          fontSize: '40px',
          fontStyle: 'bold',
        })
        .setOrigin(0.5);
      const status =
        stats?.bestMs != null
          ? `✓ ${RunTimer.format(stats.bestMs)}`
          : stats
            ? `${stats.plays} ${stats.plays === 1 ? 'try' : 'tries'}`
            : '—';
      const color = stats?.bestMs != null ? '#48bb78' : stats ? '#f6e05e' : '#556270';
      this.add
        .text(x + CARD_W / 2, y + 86, status, { ...style, fontSize: '22px', color })
        .setOrigin(0.5);

      card.on('pointerover', () => this.select(i));
      card.on('pointerup', () => this.launch(i));
      this.cards.push(card);
    });
    this.select(0);

    // Polled (like GameScene's cursors) instead of keydown events: Phaser can
    // re-emit keydown for held keys when several key events land in one
    // frame, which would skip the selection several extra steps.
    this.keys = this.input.keyboard!.addKeys(KEY_NAMES.join(',')) as Record<
      KeyName,
      Phaser.Input.Keyboard.Key
    >;
  }

  update(): void {
    this.onPress('LEFT', () => this.select(this.selected - 1));
    this.onPress('RIGHT', () => this.select(this.selected + 1));
    this.onPress('UP', () => this.select(this.selected - COLS, true));
    this.onPress('DOWN', () => this.select(this.selected + COLS, true));
    this.onPress('ENTER', () => this.launch(this.selected));
    this.onPress('SPACE', () => this.launch(this.selected));
    this.onPress('ESC', () => this.scene.start('title'));
    this.onPress('E', () => exportStats());
  }

  /** Edge-detects a polled key: fires once per press, no key repeat. */
  private onPress(name: KeyName, action: () => void): void {
    if (this.keys[name].isDown) {
      if (!this.held.has(name)) {
        this.held.add(name);
        action();
      }
    } else {
      this.held.delete(name);
    }
  }

  /** Row moves (strict) stop at the grid edge; column moves wrap around. */
  private select(index: number, strict = false): void {
    if (strict && (index < 0 || index >= this.cards.length)) return;
    const target = Phaser.Math.Wrap(index, 0, this.cards.length);
    this.cards[this.selected].setStrokeStyle(1, 0x2d3748);
    this.selected = target;
    this.cards[target].setStrokeStyle(3, 0x48bb78);
  }

  private launch(levelIndex: number): void {
    this.scene.start('game', { levelIndex });
  }
}

/** Downloads all level stats as a JSON file the player can send in. */
function exportStats(): void {
  const progress = loadProgress();
  const levels = LEVELS.map((_, i) => ({
    level: i + 1,
    ...(progress[i] ?? { plays: 0, bestMs: null, bestFuel: null }),
  }));
  const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), levels }, null, 2)], {
    type: 'application/json',
  });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'rocket-power-stats.json';
  a.click();
  URL.revokeObjectURL(a.href);
}
