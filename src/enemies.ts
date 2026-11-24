import { EnemySpawn, EnemyType, Platform, Projectile, Rect } from './types';
import { Player, rectsOverlap } from './player';
import { ParticleSystem } from './particles';
import { SoundEngine } from './audio';

let nextEnemyId = 1;
let nextProjId = 1;

export class Enemy {
  public id: number;
  public type: EnemyType;
  public x: number;
  public y: number;
  public w: number;
  public h: number;
  public vx = 0;
  public vy = 0;
  public facing: 1 | -1 = -1;

  public hp: number;
  public maxHp: number;
  public dead = false;
  public hitFlash = 0;
  public onGround = false;

  // AI state
  public aiState: 'idle' | 'patrol' | 'windup' | 'lunge' | 'jump_slam' | 'volley' | 'recover' = 'patrol';
  public aiTimer = 0;
  public patrolDir: 1 | -1 = -1;
  public animTime = Math.random() * 10;

  // Totem harvest limit
  public soulCharges = 5;

  constructor(spawn: EnemySpawn) {
    this.id = nextEnemyId++;
    this.type = spawn.type;
    this.x = spawn.x;
    this.y = spawn.y;

    switch (spawn.type) {
      case 'crawler':
        this.w = 40;
        this.h = 34;
        this.hp = 3;
        this.maxHp = 3;
        break;
      case 'flyer':
        this.w = 38;
        this.h = 34;
        this.hp = 2;
        this.maxHp = 2;
        break;
      case 'guard':
        this.w = 46;
        this.h = 64;
        this.hp = 5;
        this.maxHp = 5;
        break;
      case 'totem':
        this.w = 44;
        this.h = 68;
        this.hp = 999;
        this.maxHp = 999;
        break;
      case 'boss':
        this.w = 72;
        this.h = 108;
        this.hp = 28;
        this.maxHp = 28;
        this.aiState = 'idle';
        this.aiTimer = 1.1;
        break;
    }
  }

  public get rect(): Rect {
    return { x: this.x, y: this.y, w: this.w, h: this.h };
  }

  public get centerX(): number {
    return this.x + this.w / 2;
  }

  public get centerY(): number {
    return this.y + this.h / 2;
  }

  public get isBoss(): boolean {
    return this.type === 'boss';
  }

  public get isPhase2(): boolean {
    return this.type === 'boss' && this.hp <= this.maxHp / 2;
  }

  public takeHit(
    damage: number,
    knockX: number,
    knockY: number,
    particles: ParticleSystem,
    sound: SoundEngine
  ): { killed: boolean; grantSoul: boolean } {
    this.hitFlash = 0.14;

    if (this.type === 'totem') {
      sound.playClang();
      if (this.soulCharges > 0) {
        this.soulCharges--;
        particles.spawnBurst(this.centerX, this.centerY - 10, 12, '#ffffff', 70, 210, 2, 4.5, 0.2, 0.5, -50);
        return { killed: false, grantSoul: true };
      }
      particles.spawnBurst(this.centerX, this.centerY, 5, '#7e90a8', 40, 120, 2, 3, 0.15, 0.3, 180);
      return { killed: false, grantSoul: false };
    }

    this.hp -= damage;
    sound.playHit(this.type === 'boss' || this.type === 'guard');

    if (this.type !== 'boss') {
      this.vx = knockX;
      this.vy = knockY;
    } else {
      this.vx += knockX * 0.18;
    }

    particles.spawnSlashSparks(this.centerX, this.centerY, knockX, knockY, this.type === 'boss' ? '#c8d6ff' : '#ffb870');

    if (this.hp <= 0) {
      this.dead = true;
      particles.spawnBurst(
        this.centerX,
        this.centerY,
        this.type === 'boss' ? 60 : 22,
        this.type === 'boss' ? '#dbe8ff' : '#ff9955',
        100,
        this.type === 'boss' ? 420 : 280,
        3,
        this.type === 'boss' ? 8 : 6,
        0.3,
        this.type === 'boss' ? 1.1 : 0.6,
        240
      );
      if (this.type === 'boss') {
        sound.playBossSlam();
      }
      return { killed: true, grantSoul: true };
    }

    return { killed: false, grantSoul: true };
  }

  public update(
    dt: number,
    player: Player,
    platforms: Platform[],
    projectiles: Projectile[],
    particles: ParticleSystem,
    sound: SoundEngine,
    onShake: (mag: number) => void
  ) {
    if (this.dead) return;
    this.animTime += dt;
    if (this.hitFlash > 0) this.hitFlash = Math.max(0, this.hitFlash - dt);

    if (this.type === 'totem') {
      return;
    }

    if (this.type === 'crawler') {
      this.updateCrawler(dt, platforms);
    } else if (this.type === 'flyer') {
      this.updateFlyer(dt, player, platforms);
    } else if (this.type === 'guard') {
      this.updateGuard(dt, player, platforms);
    } else if (this.type === 'boss') {
      this.updateBoss(dt, player, platforms, projectiles, particles, sound, onShake);
    }
  }

  private updateCrawler(dt: number, platforms: Platform[]) {
    const speed = 95;
    if (Math.abs(this.vx) < speed + 20) {
      this.vx = this.patrolDir * speed;
    } else {
      this.vx *= 0.88;
    }
    this.facing = this.patrolDir;

    this.vy = Math.min(820, this.vy + 1600 * dt);
    const hitWall = this.moveAndCollide(dt, platforms);
    if (hitWall) {
      this.patrolDir = (this.patrolDir * -1) as 1 | -1;
    }

    // Edge turn-around check
    if (this.onGround) {
      const probeX = this.patrolDir === 1 ? this.x + this.w + 4 : this.x - 4;
      const probe: Rect = { x: probeX, y: this.y + this.h + 4, w: 4, h: 10 };
      const hasGroundAhead = platforms.some((p) => rectsOverlap(probe, p));
      if (!hasGroundAhead) {
        this.patrolDir = (this.patrolDir * -1) as 1 | -1;
      }
    }
  }

  private updateFlyer(dt: number, player: Player, platforms: Platform[]) {
    const dx = player.centerX - this.centerX;
    const dy = player.centerY - this.centerY;
    const dist = Math.hypot(dx, dy);

    if (dist < 420) {
      const targetVx = (dx / (dist || 1)) * 155;
      const targetVy = (dy / (dist || 1)) * 135;
      this.vx += (targetVx - this.vx) * Math.min(1, dt * 3.8);
      this.vy += (targetVy - this.vy) * Math.min(1, dt * 3.8);
      this.facing = dx >= 0 ? 1 : -1;
    } else {
      this.vx *= 0.92;
      this.vy = Math.sin(this.animTime * 3) * 32;
    }

    this.moveAndCollide(dt, platforms);
  }

  private updateGuard(dt: number, player: Player, platforms: Platform[]) {
    const dx = player.centerX - this.centerX;
    const dist = Math.abs(dx);
    const sameLevel = Math.abs(player.centerY - this.centerY) < 120;

    this.aiTimer = Math.max(0, this.aiTimer - dt);

    if (this.aiState === 'patrol') {
      if (dist < 280 && sameLevel && this.aiTimer <= 0) {
        this.facing = dx >= 0 ? 1 : -1;
        this.aiState = 'windup';
        this.aiTimer = 0.45;
        this.vx = 0;
      } else {
        this.vx += (this.patrolDir * 70 - this.vx) * Math.min(1, dt * 6);
        this.facing = this.patrolDir;
      }
    } else if (this.aiState === 'windup') {
      this.vx *= 0.8;
      if (this.aiTimer <= 0) {
        this.aiState = 'lunge';
        this.aiTimer = 0.34;
        this.vx = this.facing * 410;
      }
    } else if (this.aiState === 'lunge') {
      if (this.aiTimer <= 0) {
        this.aiState = 'recover';
        this.aiTimer = 0.65;
      }
    } else if (this.aiState === 'recover') {
      this.vx *= 0.85;
      if (this.aiTimer <= 0) {
        this.aiState = 'patrol';
      }
    }

    this.vy = Math.min(820, this.vy + 1650 * dt);
    const hitWall = this.moveAndCollide(dt, platforms);
    if (hitWall && this.aiState === 'patrol') {
      this.patrolDir = (this.patrolDir * -1) as 1 | -1;
    }
    if (this.onGround && this.aiState === 'patrol') {
      const probeX = this.patrolDir === 1 ? this.x + this.w + 4 : this.x - 4;
      const probe: Rect = { x: probeX, y: this.y + this.h + 4, w: 4, h: 10 };
      if (!platforms.some((p) => rectsOverlap(probe, p))) {
        this.patrolDir = (this.patrolDir * -1) as 1 | -1;
      }
    }
  }

  private updateBoss(
    dt: number,
    player: Player,
    platforms: Platform[],
    projectiles: Projectile[],
    particles: ParticleSystem,
    sound: SoundEngine,
    onShake: (mag: number) => void
  ) {
    const speedMult = this.isPhase2 ? 1.28 : 1;
    const dx = player.centerX - this.centerX;
    this.aiTimer -= dt;

    if (this.aiState === 'idle' || this.aiState === 'recover') {
      this.vx *= 0.84;
      this.facing = dx >= 0 ? 1 : -1;
      if (this.aiTimer <= 0) {
        const roll = Math.random();
        if (roll < 0.38) {
          this.aiState = 'windup';
          this.aiTimer = 0.48 / speedMult;
        } else if (roll < 0.72) {
          this.aiState = 'jump_slam';
          this.aiTimer = 1.6;
          this.vy = -780;
          this.vx = Math.max(-420, Math.min(420, dx * 1.15));
          sound.playJump(false);
        } else {
          this.aiState = 'volley';
          this.aiTimer = 0.55 / speedMult;
        }
      }
    } else if (this.aiState === 'windup') {
      this.vx *= 0.75;
      this.facing = dx >= 0 ? 1 : -1;
      if (this.aiTimer <= 0) {
        this.aiState = 'lunge';
        this.aiTimer = 0.38 / speedMult;
        this.vx = this.facing * 680 * speedMult;
        sound.playDash();
        particles.spawnBurst(this.centerX, this.centerY, 12, '#a7b8ff', 80, 220, 3, 5, 0.2, 0.4, 0);
      }
    } else if (this.aiState === 'lunge') {
      if (this.aiTimer <= 0) {
        this.aiState = 'recover';
        this.aiTimer = 0.65 / speedMult;
      }
    } else if (this.aiState === 'jump_slam') {
      if (this.onGround && this.vy >= 0 && this.aiTimer < 1.45) {
        // Landed: trigger twin ground shockwaves
        sound.playBossSlam();
        onShake(10);
        particles.spawnBurst(this.centerX, this.y + this.h, 24, '#c4d4ff', 100, 340, 3, 6, 0.2, 0.5, 220);
        for (const dir of [-1, 1]) {
          projectiles.push({
            id: nextProjId++,
            x: this.centerX + dir * 24,
            y: this.y + this.h - 18,
            vx: dir * (430 * speedMult),
            vy: 0,
            radius: 15,
            life: 2.2,
            color: '#9fb4ff',
            fromBoss: true,
          });
        }
        this.aiState = 'recover';
        this.aiTimer = 0.75 / speedMult;
      }
    } else if (this.aiState === 'volley') {
      this.vx *= 0.8;
      this.facing = dx >= 0 ? 1 : -1;
      if (this.aiTimer <= 0) {
        const count = this.isPhase2 ? 5 : 3;
        const baseAngle = Math.atan2(player.centerY - this.centerY, player.centerX - this.centerX);
        const spread = 0.26;
        for (let i = 0; i < count; i++) {
          const offset = (i - (count - 1) / 2) * spread;
          const angle = baseAngle + offset;
          const spd = 340 * speedMult;
          projectiles.push({
            id: nextProjId++,
            x: this.centerX,
            y: this.centerY - 12,
            vx: Math.cos(angle) * spd,
            vy: Math.sin(angle) * spd,
            radius: 10,
            life: 3.0,
            color: '#d8e4ff',
            fromBoss: true,
          });
        }
        sound.playSlash();
        this.aiState = 'recover';
        this.aiTimer = 0.9 / speedMult;
      }
    }

    this.vy = Math.min(960, this.vy + 1750 * dt);
    this.moveAndCollide(dt, platforms);
  }

  private moveAndCollide(dt: number, platforms: Platform[]): boolean {
    let hitWall = false;
    this.x += this.vx * dt;
    for (const p of platforms) {
      if (rectsOverlap(this.rect, p)) {
        if (this.vx > 0) {
          this.x = p.x - this.w;
          this.vx = 0;
          hitWall = true;
        } else if (this.vx < 0) {
          this.x = p.x + p.w;
          this.vx = 0;
          hitWall = true;
        }
      }
    }

    this.y += this.vy * dt;
    this.onGround = false;
    for (const p of platforms) {
      if (rectsOverlap(this.rect, p)) {
        if (this.vy > 0) {
          this.y = p.y - this.h;
          this.vy = 0;
          this.onGround = true;
        } else if (this.vy < 0) {
          this.y = p.y + p.h;
          this.vy = 0;
        }
      }
    }
    return hitWall;
  }
}
