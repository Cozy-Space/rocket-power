import Phaser from 'phaser';
import { AssetKeys, TILESET_NAME } from '../assets/manifest';
import {
  ANGULAR_VELOCITY,
  FUEL_BURN_RATE,
  HUD_UPDATE_INTERVAL_MS,
  LANDING_THRESHOLDS,
  LEVELS,
  MAX_SPEED,
  RETRO_THRUST_MULTIPLIER,
  SETTLE_CONFIG,
  SETTLE_TIME_SCALE,
  THRUST_ACCEL,
  TILE_SIZE,
} from '../config';
import { EVT_HUD_UPDATE, EVT_RUN_ENDED, type HudUpdate, type RunEnded } from '../game/events';
import { loadMarkers, type LevelMarkers } from '../game/LevelLoader';
import { loadProgress, saveProgress } from '../game/progressStore';
import { bevelGid } from '../game/rules/bevel';
import { borderedGid, exposureMask, ROCK } from '../game/rules/borders';
import { recordRun } from '../game/rules/progress';
import { Rocket } from '../game/Rocket';
import { burn, createFuel, fuelFraction, hasFuel, type FuelState } from '../game/rules/fuel';
import { evaluateTouchdown } from '../game/rules/landing';
import { rectOverlapsTriangle, TRIANGLE_TILES } from '../game/rules/triangles';
import { createSettle, stepSettle, type SettleState } from '../game/rules/settle';
import type { RunResult } from '../game/rules/types';
import { RunTimer } from '../game/rules/timer';

type RunPhase = 'flying' | 'settling' | 'ended';

export class GameScene extends Phaser.Scene {
  private rocket!: Rocket;
  private markers!: LevelMarkers;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private fuel!: FuelState;
  private timer!: RunTimer;
  /**
   * Velocity sampled at the end of each update. Arcade physics separates
   * bodies and zeroes velocity before collide callbacks run, so this is the
   * only reliable pre-impact velocity.
   */
  private lastVelocity = new Phaser.Math.Vector2();
  private phase: RunPhase = 'flying';
  private levelIndex = 0;
  private settle!: SettleState;
  /** Base-pivot position of the sprite at the moment of touchdown. */
  private settleOrigin = new Phaser.Math.Vector2();
  private timerStarted = false;
  private hudAccumulator = 0;

  constructor() {
    super('game');
  }

  create(): void {
    const data = (this.scene.settings.data ?? {}) as { levelIndex?: number };
    this.levelIndex = Phaser.Math.Clamp(data.levelIndex ?? 0, 0, LEVELS.length - 1);
    this.registry.set('levelIndex', this.levelIndex);
    const level = LEVELS[this.levelIndex];

    const map = this.make.tilemap({ key: level.key });
    const tileset = map.addTilesetImage(TILESET_NAME, AssetKeys.CaveTiles);
    if (!tileset) {
      throw new Error(`Tileset '${TILESET_NAME}' not found in level '${level.key}'`);
    }
    const terrain = map.createLayer('terrain', tileset);
    if (!terrain) {
      throw new Error(`Tile layer 'terrain' not found in level '${level.key}'`);
    }
    this.bevelRockCorners(terrain, map);
    this.applyRockBorders(terrain, map);
    terrain.setCollisionByExclusion([-1]);

    this.markers = loadMarkers(map);
    this.rocket = new Rocket(this, this.markers.spawn.x, this.markers.spawn.y);
    this.rocket.body.setMaxSpeed(MAX_SPEED);
    // Triangle tiles register contact only once the body reaches their solid
    // half, so the AABB overlap at first contact can approach a full tile.
    // The default bias (16) treats that as tunneling and skips separation —
    // the rocket would fall straight through a triangle's solid half.
    this.physics.world.TILE_BIAS = TILE_SIZE;
    this.physics.add.collider(
      this.rocket.sprite,
      terrain,
      () => this.onTerrainContact(),
      (_sprite, tile) => this.touchesTile(tile),
    );

    this.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
    this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
    this.cameras.main.startFollow(this.rocket.sprite, true, 0.08, 0.08);

    this.cursors = this.input.keyboard!.createCursorKeys();
    this.fuel = createFuel(level.fuel);
    // Started on the first update: this.time.now is stale during create()
    // right after scene start, which would add the boot time to the run.
    this.timer = new RunTimer();
    this.timerStarted = false;
    this.lastVelocity.reset();
    this.phase = 'flying';
    this.hudAccumulator = 0;

    if (!this.scene.isActive('ui')) {
      this.scene.launch('ui');
    }
  }

  update(time: number, delta: number): void {
    if (this.phase === 'ended') return;
    if (this.phase === 'settling') {
      this.updateSettling(delta);
      return;
    }
    if (!this.timerStarted) {
      this.timerStarted = true;
      this.timer.start(time);
    }

    if (this.cursors.left.isDown) {
      this.rocket.rotate(-ANGULAR_VELOCITY);
    } else if (this.cursors.right.isDown) {
      this.rocket.rotate(ANGULAR_VELOCITY);
    } else {
      this.rocket.rotate(0);
    }

    const thrusting = this.cursors.up.isDown && hasFuel(this.fuel);
    if (thrusting) {
      this.rocket.thrust(THRUST_ACCEL, RETRO_THRUST_MULTIPLIER);
      this.fuel = burn(this.fuel, delta, FUEL_BURN_RATE);
    } else {
      this.rocket.cutThrust();
    }
    this.rocket.setFlameVisible(thrusting);

    this.hudAccumulator += delta;
    if (this.hudAccumulator >= HUD_UPDATE_INTERVAL_MS) {
      this.hudAccumulator = 0;
      const hud: HudUpdate = {
        fuelFraction: fuelFraction(this.fuel),
        speed: this.rocket.body.velocity.length(),
        elapsedMs: this.timer.elapsedMs(time),
      };
      this.game.events.emit(EVT_HUD_UPDATE, hud);
    }

    // Sample AFTER this frame's physics step: it becomes the pre-impact
    // velocity seen by next frame's collide callback.
    this.lastVelocity.copy(this.rocket.body.velocity);
  }

  /**
   * Auto-tiling pass 1: chamfers convex rock corners into triangle tiles.
   * Masks are computed against the authored grid first and applied after, so
   * neighboring corners bevel independently of iteration order.
   */
  private bevelRockCorners(
    terrain: Phaser.Tilemaps.TilemapLayer,
    map: Phaser.Tilemaps.Tilemap,
  ): void {
    const gidAt = this.gidReader(terrain, map);
    const bevels: Array<[Phaser.Tilemaps.Tile, number]> = [];
    terrain.forEachTile((tile) => {
      if (tile.index !== ROCK) return;
      const gid = bevelGid(exposureMask(gidAt, tile.x, tile.y));
      if (gid !== null) bevels.push([tile, gid]);
    });
    for (const [tile, gid] of bevels) tile.index = gid;
  }

  /**
   * Auto-tiling pass 2: swaps rock tiles that face air for the border variant
   * with a rim on each exposed edge. Levels are authored with plain rock
   * only, so both passes also cover Tiled-edited maps. Border gids count as
   * full cover in the mask, so swapping in place is safe here.
   */
  private applyRockBorders(
    terrain: Phaser.Tilemaps.TilemapLayer,
    map: Phaser.Tilemaps.Tilemap,
  ): void {
    const gidAt = this.gidReader(terrain, map);
    terrain.forEachTile((tile) => {
      if (tile.index === ROCK) {
        tile.index = borderedGid(exposureMask(gidAt, tile.x, tile.y));
      }
    });
  }

  /** Grid accessor for the auto-tiling passes; the map edge reads as rock. */
  private gidReader(
    terrain: Phaser.Tilemaps.TilemapLayer,
    map: Phaser.Tilemaps.Tilemap,
  ): (x: number, y: number) => number {
    return (x, y) => {
      if (x < 0 || y < 0 || x >= map.width || y >= map.height) return ROCK;
      return terrain.getTileAt(x, y)?.index ?? 0;
    };
  }

  /**
   * Collision filter: Arcade physics collides AABBs, so a triangle tile only
   * counts when the body actually reaches into its solid half — the empty
   * half is flyable space. Square tiles always collide.
   */
  private touchesTile(tileObj: unknown): boolean {
    const tile = tileObj as Phaser.Tilemaps.Tile;
    const kind = TRIANGLE_TILES[tile.index];
    if (!kind) return true;
    const body = this.rocket.body;
    return rectOverlapsTriangle(
      kind,
      {
        left: body.left - tile.pixelX,
        right: body.right - tile.pixelX,
        top: body.top - tile.pixelY,
        bottom: body.bottom - tile.pixelY,
      },
      tile.width,
    );
  }

  private onTerrainContact(): void {
    if (this.phase !== 'flying') return;
    this.timer.stop(this.time.now);

    const body = this.rocket.body;
    const check = evaluateTouchdown(
      {
        velocityX: this.lastVelocity.x,
        velocityY: this.lastVelocity.y,
        contactFromBelow: body.blocked.down,
        onPad: this.markers.padRect.contains(body.center.x, body.bottom),
      },
      LANDING_THRESHOLDS,
    );

    if (!check.ok) {
      this.rocket.freeze();
      this.finishRun({ outcome: 'crashed', reason: check.reason });
      return;
    }

    // Touchdown survived — now physics decides whether the rocket stands.
    const angularVel = body.angularVelocity;
    this.rocket.freeze();
    this.rocket.enterGroundPivot();
    this.settleOrigin.set(this.rocket.sprite.x, this.rocket.sprite.y);
    this.settle = createSettle(
      {
        angleDeg: this.rocket.sprite.angle,
        angularVelDeg: angularVel,
        velocityX: this.lastVelocity.x,
        velocityY: this.lastVelocity.y,
      },
      SETTLE_CONFIG,
    );
    this.phase = 'settling';
  }

  private updateSettling(delta: number): void {
    this.settle = stepSettle(this.settle, delta * SETTLE_TIME_SCALE, SETTLE_CONFIG);
    this.rocket.sprite.setPosition(
      this.settleOrigin.x + this.settle.slideOffset,
      this.settleOrigin.y - this.settle.height,
    );
    this.rocket.setAngle(this.settle.angleDeg);

    if (this.settle.status === 'upright') {
      this.finishRun({ outcome: 'landed' });
    } else if (this.settle.status === 'tipped') {
      this.finishRun({ outcome: 'crashed', reason: 'tipped-over' });
    }
  }

  private finishRun(result: RunResult): void {
    this.phase = 'ended';
    if (result.outcome === 'crashed') {
      this.rocket.markCrashed();
      this.cameras.main.shake(250, 0.01);
    }

    const elapsedMs = this.timer.elapsedMs(this.time.now);
    const progress = recordRun(
      loadProgress(),
      this.levelIndex,
      result.outcome === 'landed',
      elapsedMs,
    );
    saveProgress(progress);

    const payload: RunEnded = { result, elapsedMs, bestMs: progress[this.levelIndex].bestMs };
    this.game.events.emit(EVT_RUN_ENDED, payload);
  }
}
