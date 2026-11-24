import { SoundEngine } from './audio';
import { CANVAS_HEIGHT, CANVAS_WIDTH, PHYSICS } from './constants';
import { Enemy } from './enemies';
import { InputManager } from './input';
import { ParticleSystem } from './particles';
import { Player, rectsOverlap } from './player';
import { Renderer } from './renderer';
import { ROOMS } from './rooms';
import { Bench, Projectile, RoomData, RoomId } from './types';

export class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private input = new InputManager();
  private sound = new SoundEngine();
  private particles = new ParticleSystem();
  private renderer = new Renderer();
  private player = new Player();

  private currentRoom: RoomData = ROOMS.crossroads;
  private enemies: Enemy[] = [];
  private projectiles: Projectile[] = [];

  // Checkpoint state
  private checkpointRoom: RoomId = 'crossroads';
  private checkpointX = 215;
  private checkpointY = 710;

  // Camera & juice
  private camX = 0;
  private camY = 0;
  private shakeTimer = 0;
  private shakeMagnitude = 0;
  private hitstopTimer = 0;

  // Room banner & transition fade
  private banner = { title: '', subtitle: '', timer: 0, alpha: 0 };
  private fadeAlpha = 0;
  private bossDefeated = false;
  private showTitleScreen = true;

  private lastTimestamp = 0;
  private elapsedTime = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('無法取得 Canvas 2D Context');
    }
    this.ctx = context;

    this.loadRoom('crossroads', this.checkpointX, this.checkpointY, true);
  }

  public start() {
    this.lastTimestamp = performance.now();
    requestAnimationFrame(this.loop);
  }

  private loop = (now: number) => {
    const rawDt = (now - this.lastTimestamp) / 1000;
    this.lastTimestamp = now;
    const dt = Math.min(rawDt, 1 / 30);
    this.elapsedTime += dt;

    this.update(dt);
    this.render();
    this.input.clearFrameEvents();

    requestAnimationFrame(this.loop);
  };

  private loadRoom(roomId: RoomId, spawnX: number, spawnY: number, restoreVitals = false) {
    this.currentRoom = ROOMS[roomId];
    this.player.resetToSpawn(spawnX, spawnY, restoreVitals);
    this.projectiles = [];
    this.particles.clear();

    this.enemies = this.currentRoom.spawns
      .filter((s) => !(s.type === 'boss' && this.bossDefeated))
      .map((s) => new Enemy(s));

    this.camX = Math.max(0, Math.min(this.currentRoom.width - CANVAS_WIDTH, spawnX - CANVAS_WIDTH / 2));
    this.camY = Math.max(0, Math.min(this.currentRoom.height - CANVAS_HEIGHT, spawnY - CANVAS_HEIGHT / 2));

    this.banner = {
      title: this.currentRoom.name,
      subtitle: this.currentRoom.subtitle,
      timer: 2.8,
      alpha: 1,
    };
    this.fadeAlpha = 0.85;
  }

  private triggerShake(magnitude: number, duration = 0.16) {
    this.shakeMagnitude = Math.max(this.shakeMagnitude, magnitude);
    this.shakeTimer = Math.max(this.shakeTimer, duration);
  }

  private update(dt: number) {
    if (this.input.mutePressed) {
      this.sound.toggleMute();
    }

    if (this.showTitleScreen) {
      if (this.input.anyPressed) {
        this.showTitleScreen = false;
        this.sound.playBench();
      }
      return;
    }

    if (this.fadeAlpha > 0) {
      this.fadeAlpha = Math.max(0, this.fadeAlpha - dt * 2.4);
    }

    if (this.banner.timer > 0) {
      this.banner.timer -= dt;
      this.banner.alpha = this.banner.timer < 0.7 ? Math.max(0, this.banner.timer / 0.7) : 1;
    } else {
      this.banner.alpha = 0;
    }

    if (this.shakeTimer > 0) {
      this.shakeTimer = Math.max(0, this.shakeTimer - dt);
      if (this.shakeTimer <= 0) this.shakeMagnitude = 0;
    }

    // Boss rematch shortcut
    if (this.currentRoom.id === 'boss_arena' && this.bossDefeated && this.input.restartPressed) {
      this.bossDefeated = false;
      this.loadRoom('boss_arena', 120, 670, true);
      return;
    }

    // Hitstop freeze frames (for crunchy Hollow Knight combat impact)
    if (this.hitstopTimer > 0) {
      this.hitstopTimer = Math.max(0, this.hitstopTimer - dt);
      this.particles.update(dt * 0.35);
      return;
    }

    this.input.updateBuffers(dt);

    // 1. Bench interaction check
    const nearBench = this.getNearbyBench();
    if (nearBench && this.player.onGround && this.input.interactPressed && !this.player.restingOnBench) {
      this.player.restingOnBench = true;
      this.player.x = nearBench.x + (nearBench.w - this.player.w) / 2;
      this.player.masks = this.player.maxMasks;
      this.player.soul = Math.max(this.player.soul, 33);
      this.checkpointRoom = nearBench.roomId;
      this.checkpointX = this.player.x;
      this.checkpointY = this.player.y;
      this.sound.playBench();
      this.particles.spawnBurst(this.player.centerX, this.player.centerY, 20, '#ffe8b0', 50, 180, 2, 4.5, 0.3, 0.7, -40);
    }

    // 2. Player physics & controls
    this.player.update(
      dt,
      this.input,
      this.currentRoom.platforms,
      this.particles,
      this.sound,
      this.currentRoom.width,
      this.currentRoom.height
    );

    // 3. Player nail slash collision (enemies, totems, spikes pogo)
    this.resolveSlashCollisions();

    // 4. Update enemies & contact damage
    for (const enemy of this.enemies) {
      if (enemy.dead) continue;
      enemy.update(
        dt,
        this.player,
        this.currentRoom.platforms,
        this.projectiles,
        this.particles,
        this.sound,
        (mag) => this.triggerShake(mag, 0.22)
      );

      if (enemy.type !== 'totem' && rectsOverlap(this.player.rect, enemy.rect)) {
        if (this.player.takeDamage(1, enemy.centerX, this.sound, this.particles)) {
          this.hitstopTimer = PHYSICS.HITSTOP_HURT;
          this.triggerShake(9, 0.22);
        }
      }
    }

    // 5. Update projectiles
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const proj = this.projectiles[i];
      proj.life -= dt;
      proj.x += proj.vx * dt;
      proj.y += proj.vy * dt;

      const projRect = {
        x: proj.x - proj.radius,
        y: proj.y - proj.radius,
        w: proj.radius * 2,
        h: proj.radius * 2,
      };

      const hitWall = this.currentRoom.platforms.some((p) => rectsOverlap(projRect, p));
      if (proj.life <= 0 || hitWall) {
        this.particles.spawnBurst(proj.x, proj.y, 8, proj.color, 50, 140, 2, 3.5, 0.15, 0.3, 0);
        this.projectiles.splice(i, 1);
        continue;
      }

      if (proj.fromBoss && rectsOverlap(this.player.rect, projRect)) {
        if (this.player.takeDamage(1, proj.x, this.sound, this.particles)) {
          this.hitstopTimer = PHYSICS.HITSTOP_HURT;
          this.triggerShake(8, 0.2);
        }
        this.projectiles.splice(i, 1);
      }
    }

    // 6. Spike hazard collisions
    for (const spike of this.currentRoom.spikes) {
      if (rectsOverlap(this.player.rect, spike)) {
        const damaged = this.player.takeDamage(1, spike.x + spike.w / 2, this.sound, this.particles);
        if (damaged) {
          this.hitstopTimer = PHYSICS.HITSTOP_HURT;
          this.triggerShake(8, 0.2);
        }
        if (this.player.masks > 0) {
          // Teleport back to last safe ledge (classic Hollow Knight hazard recovery)
          this.player.x = this.player.safeX;
          this.player.y = this.player.safeY - 4;
          this.player.vx = 0;
          this.player.vy = 0;
          this.fadeAlpha = 0.5;
        }
        break;
      }
    }

    // 7. Death check -> respawn at last bench checkpoint
    if (this.player.masks <= 0) {
      this.loadRoom(this.checkpointRoom, this.checkpointX, this.checkpointY, true);
      return;
    }

    // 8. Room transition triggers
    for (const tr of this.currentRoom.transitions) {
      if (rectsOverlap(this.player.rect, tr)) {
        this.loadRoom(tr.targetRoom, tr.spawnX, tr.spawnY, false);
        return;
      }
    }

    // 9. Particles update
    this.particles.update(dt);

    // 10. Smooth look-ahead camera tracking
    const targetCamX = Math.max(
      0,
      Math.min(this.currentRoom.width - CANVAS_WIDTH, this.player.centerX + this.player.facing * 75 - CANVAS_WIDTH / 2)
    );
    const targetCamY = Math.max(
      0,
      Math.min(this.currentRoom.height - CANVAS_HEIGHT, this.player.centerY - 30 - CANVAS_HEIGHT / 2)
    );
    this.camX += (targetCamX - this.camX) * Math.min(1, dt * 7.5);
    this.camY += (targetCamY - this.camY) * Math.min(1, dt * 6.5);
  }

  private resolveSlashCollisions() {
    const slash = this.player.activeSlash;
    if (!slash) return;

    // 1. Check enemies & soul totems
    for (const enemy of this.enemies) {
      if (enemy.dead || slash.hitIds.has(enemy.id)) continue;
      if (rectsOverlap(slash.rect, enemy.rect)) {
        slash.hitIds.add(enemy.id);

        let knockX = 0;
        let knockY = -120;
        if (slash.dir === 'right') knockX = 280;
        else if (slash.dir === 'left') knockX = -280;
        else if (slash.dir === 'up') knockY = -260;

        const result = enemy.takeHit(PHYSICS.SLASH_DAMAGE, knockX, knockY, this.particles, this.sound);

        if (result.grantSoul) {
          this.player.addSoul(PHYSICS.SOUL_PER_HIT);
        }

        // Hitstop & micro screen shake
        this.hitstopTimer = PHYSICS.HITSTOP_HIT;
        this.triggerShake(enemy.isBoss ? 5.5 : 3.5, 0.1);

        // Directional recoil or Pogo bounce
        if (slash.dir === 'down' && !slash.pogoTriggered) {
          slash.pogoTriggered = true;
          this.player.triggerPogo(this.particles);
        } else if (slash.dir === 'right') {
          this.player.vx = -PHYSICS.SIDE_RECOIL_VX;
        } else if (slash.dir === 'left') {
          this.player.vx = PHYSICS.SIDE_RECOIL_VX;
        }

        if (result.killed && enemy.isBoss) {
          this.bossDefeated = true;
          this.triggerShake(14, 0.45);
        }
      }
    }

    // 2. Check down-slash Pogo against metallic spikes!
    if (slash.dir === 'down' && !slash.pogoTriggered) {
      for (const spike of this.currentRoom.spikes) {
        if (rectsOverlap(slash.rect, spike)) {
          slash.pogoTriggered = true;
          this.player.triggerPogo(this.particles);
          this.sound.playClang();
          this.triggerShake(3, 0.08);
          this.particles.spawnSlashSparks(this.player.centerX, spike.y, 0, -1, '#ffffff');
          break;
        }
      }
    }
  }

  private getNearbyBench(): Bench | null {
    for (const b of this.currentRoom.benches) {
      if (rectsOverlap(this.player.rect, { x: b.x - 20, y: b.y - 20, w: b.w + 40, h: b.h + 30 })) {
        return b;
      }
    }
    return null;
  }

  private render() {
    let shakeX = 0;
    let shakeY = 0;
    if (this.shakeTimer > 0) {
      shakeX = (Math.random() * 2 - 1) * this.shakeMagnitude;
      shakeY = (Math.random() * 2 - 1) * this.shakeMagnitude;
    }

    this.renderer.render(
      this.ctx,
      this.currentRoom,
      this.player,
      this.enemies,
      this.projectiles,
      this.particles,
      this.camX + shakeX,
      this.camY + shakeY,
      this.elapsedTime,
      this.getNearbyBench(),
      this.banner,
      this.fadeAlpha,
      this.bossDefeated,
      this.sound.muted,
      this.showTitleScreen
    );
  }
}
