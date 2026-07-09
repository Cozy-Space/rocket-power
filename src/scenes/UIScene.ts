import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, LEVELS } from '../config';
import { EVT_HUD_UPDATE, EVT_RUN_ENDED, type HudUpdate, type RunEnded } from '../game/events';
import type { CrashReason } from '../game/rules/types';
import { RunTimer } from '../game/rules/timer';

const CRASH_MESSAGES: Record<CrashReason, string> = {
  'side-impact': 'You hit the wall!',
  'not-on-pad': 'You missed the pad!',
  'too-fast': 'You came in too hot!',
  'tipped-over': 'The rocket tipped over!',
};

const FUEL_BAR_WIDTH = 220;

export class UIScene extends Phaser.Scene {
  private fuelFill!: Phaser.GameObjects.Rectangle;
  private speedText!: Phaser.GameObjects.Text;
  private timerText!: Phaser.GameObjects.Text;
  private overlay!: Phaser.GameObjects.Container;
  private overlayTitle!: Phaser.GameObjects.Text;
  private overlayDetail!: Phaser.GameObjects.Text;
  private landedWithNext = false;

  constructor() {
    super('ui');
  }

  private get levelIndex(): number {
    return (this.registry.get('levelIndex') as number | undefined) ?? 0;
  }

  create(): void {
    const style = { fontFamily: 'monospace', fontSize: '20px', color: '#dfe6ee' };
    this.landedWithNext = false;

    this.add.text(GAME_WIDTH - 24, 20, `LEVEL ${this.levelIndex + 1}`, style).setOrigin(1, 0);
    this.add.text(24, 20, 'FUEL', style);
    this.add
      .rectangle(96, 30, FUEL_BAR_WIDTH + 4, 18)
      .setOrigin(0, 0.5)
      .setStrokeStyle(1, 0x8899aa);
    this.fuelFill = this.add.rectangle(98, 30, FUEL_BAR_WIDTH, 14, 0x48bb78).setOrigin(0, 0.5);

    this.speedText = this.add.text(24, 52, 'SPEED    0', style);
    this.timerText = this.add.text(24, 84, 'TIME  00:00.0', style);

    this.overlayTitle = this.add
      .text(0, -40, '', { ...style, fontSize: '56px', fontStyle: 'bold' })
      .setOrigin(0.5);
    this.overlayDetail = this.add
      .text(0, 30, '', { ...style, fontSize: '24px', color: '#8899aa', align: 'center' })
      .setOrigin(0.5);
    const backdrop = this.add.rectangle(0, 0, GAME_WIDTH, 220, 0x0b0e14, 0.85).setOrigin(0.5);
    this.overlay = this.add
      .container(GAME_WIDTH / 2, GAME_HEIGHT / 2, [backdrop, this.overlayTitle, this.overlayDetail])
      .setVisible(false);

    this.game.events.on(EVT_HUD_UPDATE, this.onHudUpdate, this);
    this.game.events.on(EVT_RUN_ENDED, this.onRunEnded, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.game.events.off(EVT_HUD_UPDATE, this.onHudUpdate, this);
      this.game.events.off(EVT_RUN_ENDED, this.onRunEnded, this);
    });

    this.input.keyboard?.on('keydown-R', () => this.startLevel(this.levelIndex));
    this.input.keyboard?.on('keydown-ENTER', () => {
      if (this.landedWithNext) this.startLevel(this.levelIndex + 1);
    });
    this.input.keyboard?.on('keydown-ESC', () => {
      this.scene.stop('game');
      this.scene.stop();
      this.scene.start('title');
    });
  }

  private onHudUpdate(hud: HudUpdate): void {
    this.fuelFill.width = FUEL_BAR_WIDTH * hud.fuelFraction;
    this.fuelFill.fillColor = hud.fuelFraction > 0.25 ? 0x48bb78 : 0xff5a5a;
    this.speedText.setText(`SPEED  ${String(Math.round(hud.speed)).padStart(3, ' ')}`);
    this.timerText.setText(`TIME  ${RunTimer.format(hud.elapsedMs)}`);
  }

  private onRunEnded({ result, elapsedMs, bestMs }: RunEnded): void {
    if (result.outcome === 'landed') {
      this.landedWithNext = this.levelIndex + 1 < LEVELS.length;
      this.overlayTitle.setText('LANDED!').setColor('#48bb78');
      const timeLine =
        bestMs !== null && bestMs < elapsedMs
          ? `Time: ${RunTimer.format(elapsedMs)}   (best ${RunTimer.format(bestMs)})`
          : `Time: ${RunTimer.format(elapsedMs)}   ★ NEW BEST`;
      this.overlayDetail.setText(
        this.landedWithNext
          ? `${timeLine}\nENTER: next level    R: retry`
          : `${timeLine}\nAll levels complete! R: fly again`,
      );
    } else {
      this.overlayTitle.setText('CRASHED').setColor('#ff5a5a');
      this.overlayDetail.setText(`${CRASH_MESSAGES[result.reason]}\nPress R to retry`);
    }
    this.overlay.setVisible(true);
  }

  private startLevel(levelIndex: number): void {
    this.scene.get('game').scene.restart({ levelIndex });
    this.scene.restart();
  }
}
