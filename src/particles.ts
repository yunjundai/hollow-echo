import { Afterimage, Particle } from './types';

export class ParticleSystem {
  public particles: Particle[] = [];
  public afterimages: Afterimage[] = [];

  public clear() {
    this.particles = [];
    this.afterimages = [];
  }

  public spawnBurst(
    x: number,
    y: number,
    count: number,
    color: string,
    speedMin = 60,
    speedMax = 240,
    sizeMin = 2,
    sizeMax = 5,
    lifeMin = 0.2,
    lifeMax = 0.55,
    gravity = 320,
    glow = true
  ) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = speedMin + Math.random() * (speedMax - speedMin);
      const maxLife = lifeMin + Math.random() * (lifeMax - lifeMin);
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: sizeMin + Math.random() * (sizeMax - sizeMin),
        alpha: 1,
        life: maxLife,
        maxLife,
        color,
        gravity,
        glow,
      });
    }
  }

  public spawnSlashSparks(x: number, y: number, dirX: number, dirY: number, color = '#e6f4ff') {
    for (let i = 0; i < 12; i++) {
      const baseAngle = Math.atan2(dirY, dirX);
      const angle = baseAngle + (Math.random() - 0.5) * 1.4;
      const speed = 120 + Math.random() * 280;
      const maxLife = 0.16 + Math.random() * 0.24;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 2 + Math.random() * 3.5,
        alpha: 1,
        life: maxLife,
        maxLife,
        color,
        gravity: 160,
        glow: true,
      });
    }
  }

  public spawnSoulWisp(x: number, y: number, targetX: number, targetY: number) {
    const dx = targetX - x;
    const dy = targetY - y;
    const dist = Math.hypot(dx, dy) || 1;
    const speed = 150 + Math.random() * 90;
    const maxLife = 0.35 + Math.random() * 0.25;
    this.particles.push({
      x,
      y,
      vx: (dx / dist) * speed + (Math.random() - 0.5) * 60,
      vy: (dy / dist) * speed + (Math.random() - 0.5) * 60,
      size: 2.5 + Math.random() * 3,
      alpha: 0.95,
      life: maxLife,
      maxLife,
      color: '#ffffff',
      gravity: -40,
      glow: true,
    });
  }

  public spawnDust(x: number, y: number, count = 6) {
    for (let i = 0; i < count; i++) {
      const maxLife = 0.22 + Math.random() * 0.25;
      this.particles.push({
        x: x + (Math.random() - 0.5) * 18,
        y,
        vx: (Math.random() - 0.5) * 90,
        vy: -20 - Math.random() * 55,
        size: 2 + Math.random() * 3,
        alpha: 0.65,
        life: maxLife,
        maxLife,
        color: '#9fb4cf',
        gravity: 90,
        glow: false,
      });
    }
  }

  public addAfterimage(x: number, y: number, facing: 1 | -1) {
    this.afterimages.push({
      x,
      y,
      facing,
      alpha: 0.55,
      life: 0.2,
      maxLife: 0.2,
    });
  }

  public update(dt: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      p.vy += (p.gravity ?? 0) * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.97;
      p.alpha = Math.max(0, p.life / p.maxLife);
    }

    for (let i = this.afterimages.length - 1; i >= 0; i--) {
      const a = this.afterimages[i];
      a.life -= dt;
      if (a.life <= 0) {
        this.afterimages.splice(i, 1);
        continue;
      }
      a.alpha = (a.life / a.maxLife) * 0.5;
    }
  }
}
