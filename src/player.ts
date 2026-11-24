import { PHYSICS } from './constants';
import { InputManager } from './input';
import { Platform, Rect, SlashDir, SlashHitbox } from './types';
import { ParticleSystem } from './particles';
import { SoundEngine } from './audio';

export function rectsOverlap(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export class Player {
  public x = 160;
  public y = 420;
  public w = 28;
  public h = 46;

  public vx = 0;
  public vy = 0;
  public facing: 1 | -1 = 1;

  public onGround = false;
  public wasOnGround = false;
  public onWall: -1 | 0 | 1 = 0; // -1 = left wall, 1 = right wall

  public coyoteTimer = 0;
  public doubleJumpAvailable = true;
  public wallJumpLockTimer = 0;

  // Dash
  public dashTimer = 0;
  public dashCooldown = 0;
  public dashAvailable = true;
  public dashDir: 1 | -1 = 1;
  private afterimageAccum = 0;

  // Combat
  public slashCooldown = 0;
  public activeSlash: SlashHitbox | null = null;

  // Health & Soul
  public masks = PHYSICS.MAX_MASKS;
  public maxMasks = PHYSICS.MAX_MASKS;
  public soul = 33;
  public invulnTimer = 0;
  public hurtTimer = 0;

  // Focus healing
  public focusing = false;
  public focusTimer = 0;
  private focusParticleAccum = 0;

  // Safe ground for spike respawn
  public safeX = 160;
  public safeY = 420;

  // Animation timers
  public runAnimTime = 0;
  public capeSway = 0;
  public restingOnBench = false;

  public get rect(): Rect {
    return { x: this.x, y: this.y, w: this.w, h: this.h };
  }

  public get centerX(): number {
    return this.x + this.w / 2;
  }

  public get centerY(): number {
    return this.y + this.h / 2;
  }

  public resetToSpawn(x: number, y: number, restoreVitals = false) {
    this.x = x;
    this.y = y;
    this.safeX = x;
    this.safeY = y;
    this.vx = 0;
    this.vy = 0;
    this.dashTimer = 0;
    this.activeSlash = null;
    this.focusing = false;
    this.focusTimer = 0;
    this.restingOnBench = false;
    if (restoreVitals) {
      this.masks = this.maxMasks;
      this.soul = Math.max(this.soul, 33);
      this.invulnTimer = 0;
    }
  }

  public addSoul(amount: number) {
    this.soul = Math.min(PHYSICS.MAX_SOUL, this.soul + amount);
  }

  public triggerPogo(particles: ParticleSystem) {
    this.vy = PHYSICS.POGO_VELOCITY;
    this.doubleJumpAvailable = true;
    this.dashAvailable = true;
    this.coyoteTimer = 0;
    particles.spawnBurst(this.centerX, this.y + this.h + 8, 8, '#d9f2ff', 60, 180, 2, 4, 0.15, 0.3, 120);
  }

  public takeDamage(
    damage: number,
    sourceX: number,
    sound: SoundEngine,
    particles: ParticleSystem
  ): boolean {
    if (this.invulnTimer > 0) return false;
    this.masks = Math.max(0, this.masks - damage);
    this.invulnTimer = PHYSICS.INVULN_DURATION;
    this.hurtTimer = 0.22;
    this.dashTimer = 0;
    this.focusing = false;
    this.focusTimer = 0;
    this.restingOnBench = false;

    const pushDir = this.centerX < sourceX ? -1 : 1;
    this.vx = pushDir * PHYSICS.HURT_KNOCKBACK_X;
    this.vy = PHYSICS.HURT_KNOCKBACK_Y;

    sound.playHurt();
    particles.spawnBurst(this.centerX, this.centerY, 18, '#ffffff', 120, 340, 3, 6, 0.2, 0.5, 420);
    particles.spawnBurst(this.centerX, this.centerY, 10, '#1e2a3d', 80, 220, 4, 7, 0.25, 0.55, 300, false);
    return true;
  }

  public update(
    dt: number,
    input: InputManager,
    platforms: Platform[],
    particles: ParticleSystem,
    sound: SoundEngine,
    roomWidth: number,
    roomHeight: number
  ) {
    this.wasOnGround = this.onGround;

    if (this.invulnTimer > 0) this.invulnTimer = Math.max(0, this.invulnTimer - dt);
    if (this.hurtTimer > 0) this.hurtTimer = Math.max(0, this.hurtTimer - dt);
    if (this.dashCooldown > 0) this.dashCooldown = Math.max(0, this.dashCooldown - dt);
    if (this.slashCooldown > 0) this.slashCooldown = Math.max(0, this.slashCooldown - dt);
    if (this.wallJumpLockTimer > 0) this.wallJumpLockTimer = Math.max(0, this.wallJumpLockTimer - dt);

    // Update active slash timer
    if (this.activeSlash) {
      this.activeSlash.timer -= dt;
      this.activeSlash.rect = this.computeSlashRect(this.activeSlash.dir);
      if (this.activeSlash.timer <= 0) {
        this.activeSlash = null;
      }
    }

    // Wake up from bench if player moves or acts
    if (this.restingOnBench) {
      if (input.left || input.right || input.jumpHeld || input.attackBuffer > 0 || input.dashBuffer > 0) {
        this.restingOnBench = false;
      } else {
        this.vx = 0;
        this.vy = 0;
        return;
      }
    }

    // Focus healing (hold L / C on ground when soul >= 33 and missing health)
    const wantsFocus =
      input.focusHeld &&
      this.onGround &&
      this.hurtTimer <= 0 &&
      this.dashTimer <= 0 &&
      this.soul >= PHYSICS.FOCUS_COST &&
      this.masks < this.maxMasks &&
      !input.left &&
      !input.right;

    if (wantsFocus) {
      this.focusing = true;
      this.vx *= 0.7;
      this.focusTimer += dt;
      this.focusParticleAccum += dt;
      if (this.focusParticleAccum >= 0.045) {
        this.focusParticleAccum = 0;
        const angle = Math.random() * Math.PI * 2;
        const r = 46 + Math.random() * 24;
        particles.spawnSoulWisp(
          this.centerX + Math.cos(angle) * r,
          this.centerY + Math.sin(angle) * r,
          this.centerX,
          this.centerY
        );
      }
      if (this.focusTimer >= PHYSICS.FOCUS_TIME) {
        this.focusTimer = 0;
        this.soul = Math.max(0, this.soul - PHYSICS.FOCUS_COST);
        this.masks = Math.min(this.maxMasks, this.masks + 1);
        sound.playHeal();
        particles.spawnBurst(this.centerX, this.centerY, 24, '#ffffff', 80, 260, 2.5, 5.5, 0.25, 0.6, -40);
      }
    } else {
      this.focusing = false;
      this.focusTimer = 0;
    }

    // Horizontal input
    const moveDir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    if (moveDir !== 0 && this.dashTimer <= 0 && this.wallJumpLockTimer <= 0 && !this.focusing) {
      this.facing = moveDir as 1 | -1;
    }

    // Dash trigger
    if (
      !this.focusing &&
      this.hurtTimer <= 0 &&
      this.dashCooldown <= 0 &&
      this.dashAvailable &&
      input.consumeDash()
    ) {
      this.dashTimer = PHYSICS.DASH_DURATION;
      this.dashCooldown = PHYSICS.DASH_COOLDOWN;
      this.dashAvailable = false;
      this.dashDir = this.onWall !== 0 && !this.onGround ? ((-this.onWall) as 1 | -1) : this.facing;
      this.facing = this.dashDir;
      this.vy = 0;
      this.vx = this.dashDir * PHYSICS.DASH_SPEED;
      sound.playDash();
      particles.spawnBurst(this.centerX, this.centerY, 10, '#8ec8ff', 60, 180, 2, 4, 0.15, 0.35, 0);
    }

    // Nail slash trigger
    if (!this.focusing && this.hurtTimer <= 0 && this.slashCooldown <= 0 && input.consumeAttack()) {
      let dir: SlashDir = this.facing === 1 ? 'right' : 'left';
      if (input.up) {
        dir = 'up';
      } else if (input.down && !this.onGround) {
        dir = 'down';
      }
      this.slashCooldown = PHYSICS.SLASH_COOLDOWN;
      this.activeSlash = {
        dir,
        rect: this.computeSlashRect(dir),
        timer: PHYSICS.SLASH_DURATION,
        duration: PHYSICS.SLASH_DURATION,
        hitIds: new Set<number>(),
        pogoTriggered: false,
      };
      sound.playSlash();
    }

    // Movement & physics
    if (this.dashTimer > 0) {
      this.dashTimer -= dt;
      this.vx = this.dashDir * PHYSICS.DASH_SPEED;
      this.vy = 0;
      this.afterimageAccum += dt;
      if (this.afterimageAccum >= 0.025) {
        this.afterimageAccum = 0;
        particles.addAfterimage(this.x, this.y, this.facing);
      }
    } else {
      // Horizontal acceleration
      if (this.hurtTimer <= 0 && this.wallJumpLockTimer <= 0 && !this.focusing) {
        const targetVx = moveDir * PHYSICS.MOVE_SPEED;
        const accel = this.onGround
          ? moveDir !== 0
            ? PHYSICS.GROUND_ACCEL
            : PHYSICS.GROUND_DECEL
          : moveDir !== 0
            ? PHYSICS.AIR_ACCEL
            : PHYSICS.AIR_DECEL;
        if (this.vx < targetVx) {
          this.vx = Math.min(targetVx, this.vx + accel * dt);
        } else if (this.vx > targetVx) {
          this.vx = Math.max(targetVx, this.vx - accel * dt);
        }
      }

      // Coyote time
      if (this.onGround) {
        this.coyoteTimer = PHYSICS.COYOTE_TIME;
        this.doubleJumpAvailable = true;
        this.dashAvailable = true;
      } else {
        this.coyoteTimer = Math.max(0, this.coyoteTimer - dt);
      }

      // Jump / Wall Jump / Double Jump
      if (!this.focusing && this.hurtTimer <= 0 && input.jumpBuffer > 0) {
        if (this.coyoteTimer > 0) {
          // Ground or coyote jump
          input.consumeJump();
          this.vy = PHYSICS.JUMP_VELOCITY;
          this.onGround = false;
          this.coyoteTimer = 0;
          sound.playJump(false);
          particles.spawnDust(this.centerX, this.y + this.h, 6);
        } else if (this.onWall !== 0 && !this.onGround) {
          // Mantis Claw Wall Jump
          input.consumeJump();
          this.vx = -this.onWall * PHYSICS.WALL_JUMP_VX;
          this.vy = PHYSICS.WALL_JUMP_VY;
          this.facing = (-this.onWall) as 1 | -1;
          this.wallJumpLockTimer = PHYSICS.WALL_JUMP_LOCK;
          this.doubleJumpAvailable = true;
          this.dashAvailable = true;
          sound.playJump(false);
          particles.spawnDust(this.onWall === 1 ? this.x + this.w : this.x, this.centerY, 7);
        } else if (this.doubleJumpAvailable) {
          // Monarch Wings Double Jump
          input.consumeJump();
          this.vy = PHYSICS.DOUBLE_JUMP_VELOCITY;
          this.doubleJumpAvailable = false;
          sound.playJump(true);
          particles.spawnBurst(this.centerX, this.y + this.h, 12, '#eef7ff', 60, 170, 2, 4.5, 0.18, 0.35, -30);
        }
      }

      // Variable jump height cut
      if (input.jumpReleased && this.vy < -120) {
        this.vy *= PHYSICS.JUMP_CUT_MULT;
      }

      // Gravity & wall slide
      const grav = this.vy > 0 ? PHYSICS.GRAVITY * PHYSICS.FALL_GRAVITY_MULT : PHYSICS.GRAVITY;
      this.vy = Math.min(PHYSICS.MAX_FALL_SPEED, this.vy + grav * dt);

      if (this.onWall !== 0 && !this.onGround && this.vy > PHYSICS.WALL_SLIDE_SPEED && moveDir === this.onWall) {
        this.vy = PHYSICS.WALL_SLIDE_SPEED;
      }
    }

    // Move & resolve collisions X
    this.x += this.vx * dt;
    this.onWall = 0;
    for (const p of platforms) {
      if (rectsOverlap(this.rect, p)) {
        if (this.vx > 0) {
          this.x = p.x - this.w;
          this.vx = 0;
          this.onWall = 1;
        } else if (this.vx < 0) {
          this.x = p.x + p.w;
          this.vx = 0;
          this.onWall = -1;
        }
      }
    }

    // Check wall proximity even if vx == 0 (for wall slide/jump responsiveness)
    if (this.onWall === 0 && !this.onGround) {
      const rightProbe: Rect = { x: this.x + this.w, y: this.y + 6, w: 3, h: this.h - 12 };
      const leftProbe: Rect = { x: this.x - 3, y: this.y + 6, w: 3, h: this.h - 12 };
      for (const p of platforms) {
        if (rectsOverlap(rightProbe, p)) {
          this.onWall = 1;
          break;
        }
        if (rectsOverlap(leftProbe, p)) {
          this.onWall = -1;
          break;
        }
      }
    }

    // Move & resolve collisions Y
    this.y += this.vy * dt;
    this.onGround = false;
    for (const p of platforms) {
      if (rectsOverlap(this.rect, p)) {
        if (this.vy > 0) {
          this.y = p.y - this.h;
          if (!this.wasOnGround && this.vy > 260) {
            particles.spawnDust(this.centerX, this.y + this.h, 6);
          }
          this.vy = 0;
          this.onGround = true;
        } else if (this.vy < 0) {
          this.y = p.y + p.h;
          this.vy = 0;
        }
      }
    }

    // Clamp to room bounds (allow transition zones on edges)
    this.x = Math.max(-20, Math.min(roomWidth - this.w + 20, this.x));
    this.y = Math.max(-40, Math.min(roomHeight + 120, this.y));

    // Record safe ground position (slightly inset from platform edges)
    if (this.onGround) {
      for (const p of platforms) {
        if (
          Math.abs(this.y + this.h - p.y) < 2 &&
          this.x > p.x + 12 &&
          this.x + this.w < p.x + p.w - 12
        ) {
          this.safeX = this.x;
          this.safeY = this.y;
          break;
        }
      }
    }

    // Animation state
    if (this.onGround && Math.abs(this.vx) > 20) {
      this.runAnimTime += dt * 11;
    } else {
      this.runAnimTime = 0;
    }
    this.capeSway += ((-this.vx * 0.025) - this.capeSway) * Math.min(1, dt * 12);
  }

  private computeSlashRect(dir: SlashDir): Rect {
    const cx = this.centerX;
    const cy = this.centerY;
    if (dir === 'right') {
      return { x: cx + 6, y: cy - 30, w: 72, h: 56 };
    }
    if (dir === 'left') {
      return { x: cx - 78, y: cy - 30, w: 72, h: 56 };
    }
    if (dir === 'up') {
      return { x: cx - 38, y: cy - 82, w: 76, h: 66 };
    }
    // down (generous hitbox for crisp Pogo feel)
    return { x: cx - 38, y: cy + 12, w: 76, h: 66 };
  }
}
