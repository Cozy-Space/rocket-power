import Phaser from 'phaser';
import { AssetKeys, TILESET_NAME } from '../assets/manifest';
import {
  ANGULAR_VELOCITY,
  CAMERA_LOOKAHEAD_MAX_X,
  CAMERA_LOOKAHEAD_MAX_Y,
  CAMERA_LOOKAHEAD_S,
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
import { exposureMask, PAD, ROCK } from '../game/rules/borders';
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
  private controls!: Record<'left' | 'right' | 'thrust', Phaser.Input.Keyboard.Key[]>;
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
    terrain.setCollisionByExclusion([-1]);
    // Glows along the rock/air silhouette (alpha edge), both sides; WebGL only.
    terrain.postFX.addGlow(0xffffff, 2, 2);

    this.addParallaxDust(map);

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

    const cursors = this.input.keyboard!.createCursorKeys();
    const alias = this.input.keyboard!.addKeys('W,A,D,I,J,L') as Record<
      string,
      Phaser.Input.Keyboard.Key
    >;
    this.controls = {
      left: [cursors.left, alias.A, alias.J],
      right: [cursors.right, alias.D, alias.L],
      thrust: [cursors.up, alias.W, alias.I],
    };
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
    // Look ahead of the velocity: followOffset is subtracted from the target,
    // so a negative offset shifts the view toward where the rocket is going.
    // The follow lerp (0.08) smooths the shift; no extra easing needed.
    const v = this.rocket.body.velocity;
    this.cameras.main.setFollowOffset(
      -Phaser.Math.Clamp(v.x * CAMERA_LOOKAHEAD_S, -CAMERA_LOOKAHEAD_MAX_X, CAMERA_LOOKAHEAD_MAX_X),
      -Phaser.Math.Clamp(v.y * CAMERA_LOOKAHEAD_S, -CAMERA_LOOKAHEAD_MAX_Y, CAMERA_LOOKAHEAD_MAX_Y),
    );
    if (this.phase === 'settling') {
      this.updateSettling(delta);
      return;
    }
    if (!this.timerStarted) {
      this.timerStarted = true;
      this.timer.start(time);
    }

    const down = (keys: Phaser.Input.Keyboard.Key[]) => keys.some((k) => k.isDown);
    if (down(this.controls.left)) {
      this.rocket.rotate(-ANGULAR_VELOCITY);
    } else if (down(this.controls.right)) {
      this.rocket.rotate(ANGULAR_VELOCITY);
    } else {
      this.rocket.rotate(0);
    }

    const thrusting = down(this.controls.thrust) && hasFuel(this.fuel);
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
   * Faint dust motes behind the terrain. The scrollFactor < 1 layers drift
   * against the rock — a speed/position cue in featureless stretches of air —
   * while the scrollFactor 1 layer sits in the terrain's own plane as a fixed
   * reference.
   * Static in world space; the parallax alone is the motion cue, so there is
   * no per-frame cost. Drawn at depth -1: rock occludes them, they only show
   * in open air.
   */
  private addParallaxDust(map: Phaser.Tilemaps.Tilemap): void {
    const layers = [
      { scroll: 0.4, radius: 1.5, alpha: 0.15 },
      { scroll: 0.7, radius: 2.5, alpha: 0.25 },
      { scroll: 1, radius: 3, alpha: 0.3 },
    ];
    const perLayer = Math.ceil((map.widthInPixels * map.heightInPixels) / 60_000);
    for (const { scroll, radius, alpha } of layers) {
      for (let i = 0; i < perLayer; i++) {
        this.add
          .circle(
            Phaser.Math.Between(0, map.widthInPixels),
            Phaser.Math.Between(0, map.heightInPixels),
            radius,
            0xffffff,
            alpha,
          )
          .setScrollFactor(scroll)
          .setDepth(-1);
      }
    }
  }

  /**
   * Auto-tiling: chamfers convex rock corners into triangle tiles.
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
      // The pad's hazard-stripe art belongs on its surface only; buried pad
      // tiles (pad directly above) render as plain rock.
      if (tile.index === PAD && gidAt(tile.x, tile.y - 1) === PAD) {
        bevels.push([tile, ROCK]);
        return;
      }
      if (tile.index !== ROCK) return;
      const gid = bevelGid(exposureMask(gidAt, tile.x, tile.y));
      if (gid !== null) bevels.push([tile, gid]);
    });
    for (const [tile, gid] of bevels) tile.index = gid;
  }

  /** Grid accessor for the auto-tiling pass; the map edge reads as rock. */
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
      this.fuel.capacity - this.fuel.remaining,
    );
    saveProgress(progress);

    const payload: RunEnded = { result, elapsedMs, bestMs: progress[this.levelIndex].bestMs };
    this.game.events.emit(EVT_RUN_ENDED, payload);
  }
}
