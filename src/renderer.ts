import { CANVAS_HEIGHT, CANVAS_WIDTH, PHYSICS } from './constants';
import { Enemy } from './enemies';
import { ParticleSystem } from './particles';
import { Player } from './player';
import { Bench, Platform, Projectile, RoomData, SlashHitbox, Spike } from './types';

interface AmbientSpore {
  x: number;
  y: number;
  r: number;
  speed: number;
  phase: number;
}

export class Renderer {
  private spores: AmbientSpore[] = [];

  constructor() {
    for (let i = 0; i < 65; i++) {
      this.spores.push({
        x: Math.random() * CANVAS_WIDTH,
        y: Math.random() * CANVAS_HEIGHT,
        r: 1.2 + Math.random() * 2.4,
        speed: 8 + Math.random() * 20,
        phase: Math.random() * Math.PI * 2,
      });
    }
  }

  public render(
    ctx: CanvasRenderingContext2D,
    room: RoomData,
    player: Player,
    enemies: Enemy[],
    projectiles: Projectile[],
    particles: ParticleSystem,
    camX: number,
    camY: number,
    time: number,
    nearBench: Bench | null,
    banner: { title: string; subtitle: string; alpha: number },
    fadeAlpha: number,
    bossDefeated: boolean,
    muted: boolean,
    showTitleScreen: boolean
  ) {
    ctx.save();

    // 1. Deep cavern gradient background
    const bgGrad = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    bgGrad.addColorStop(0, room.bgTop);
    bgGrad.addColorStop(1, room.bgBottom);
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // 2. Parallax gothic ruins & volumetric light shafts
    this.drawParallaxBackground(ctx, room, camX, camY, time);

    // 3. World-space camera transform
    ctx.save();
    ctx.translate(-Math.round(camX), -Math.round(camY));

    // Doorway glow indicators
    for (const tr of room.transitions) {
      const grad = ctx.createLinearGradient(tr.x, tr.y, tr.x + tr.w, tr.y);
      grad.addColorStop(0, 'rgba(180, 215, 255, 0.02)');
      grad.addColorStop(0.5, 'rgba(180, 215, 255, 0.22)');
      grad.addColorStop(1, 'rgba(180, 215, 255, 0.02)');
      ctx.fillStyle = grad;
      ctx.fillRect(tr.x - 10, tr.y, tr.w + 20, tr.h);
    }

    // Platforms
    for (const p of room.platforms) {
      this.drawPlatform(ctx, p, room.ambientColor);
    }

    // Spikes
    for (const s of room.spikes) {
      this.drawSpikes(ctx, s);
    }

    // Benches
    for (const b of room.benches) {
      this.drawBench(ctx, b, time, nearBench === b);
    }

    // Dash afterimages
    for (const a of particles.afterimages) {
      ctx.save();
      ctx.globalAlpha = a.alpha;
      this.drawKnightSprite(ctx, a.x, a.y, player.w, player.h, a.facing, 0, 0, false, true);
      ctx.restore();
    }

    // Enemies
    for (const e of enemies) {
      if (!e.dead) {
        this.drawEnemy(ctx, e, time);
      }
    }

    // Projectiles
    for (const proj of projectiles) {
      this.drawProjectile(ctx, proj);
    }

    // Player
    const blink = player.invulnTimer > 0 && Math.floor(time * 22) % 2 === 0;
    if (!blink) {
      this.drawPlayer(ctx, player, time);
    }

    // Active Nail Slash Arc
    if (player.activeSlash) {
      this.drawSlashArc(ctx, player.activeSlash, player);
    }

    // World particles
    for (const p of particles.particles) {
      ctx.save();
      ctx.globalAlpha = p.alpha;
      if (p.glow) {
        ctx.shadowBlur = 12;
        ctx.shadowColor = p.color;
      }
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    ctx.restore(); // End world-space transform

    // 4. Foreground floating ambient spores
    this.drawAmbientSpores(ctx, room.ambientColor, camX, camY, time);

    // 5. Atmospheric vignette + player lantern halo
    this.drawLightingOverlay(ctx, player.centerX - camX, player.centerY - camY);

    // 6. HUD (Soul Vessel + Health Masks + Room Indicator + Boss Bar)
    this.drawHUD(ctx, player, room, enemies, bossDefeated, muted, time);

    // 7. Area transition banner
    if (banner.alpha > 0.01) {
      this.drawAreaBanner(ctx, banner.title, banner.subtitle, banner.alpha);
    }

    // 8. Room transition fade
    if (fadeAlpha > 0.01) {
      ctx.fillStyle = `rgba(4, 6, 12, ${fadeAlpha})`;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    }

    // 9. Title screen overlay
    if (showTitleScreen) {
      this.drawTitleScreen(ctx, time);
    }

    ctx.restore();
  }

  private drawParallaxBackground(
    ctx: CanvasRenderingContext2D,
    room: RoomData,
    camX: number,
    camY: number,
    time: number
  ) {
    // Distant volumetric shafts
    ctx.save();
    for (let i = 0; i < 4; i++) {
      const sx = ((i * 420 - camX * 0.12) % (CANVAS_WIDTH + 400)) - 120;
      const grad = ctx.createLinearGradient(sx, 0, sx + 160, CANVAS_HEIGHT);
      grad.addColorStop(0, 'rgba(150, 195, 245, 0.08)');
      grad.addColorStop(1, 'rgba(150, 195, 245, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(sx, 0);
      ctx.lineTo(sx + 130, 0);
      ctx.lineTo(sx + 270, CANVAS_HEIGHT);
      ctx.lineTo(sx + 70, CANVAS_HEIGHT);
      ctx.closePath();
      ctx.fill();
    }

    // Layer 1: Far gothic arches (0.2x parallax)
    ctx.fillStyle = 'rgba(10, 18, 30, 0.72)';
    const archSpacing = 280;
    const offsetFar = -(camX * 0.2) % archSpacing;
    for (let x = offsetFar - archSpacing; x < CANVAS_WIDTH + archSpacing; x += archSpacing) {
      // Pillar
      ctx.fillRect(x, 80, 42, CANVAS_HEIGHT);
      // Pointed arch top
      ctx.beginPath();
      ctx.moveTo(x + 42, 220);
      ctx.quadraticCurveTo(x + archSpacing / 2, 70, x + archSpacing, 220);
      ctx.lineTo(x + archSpacing, 80);
      ctx.lineTo(x + 42, 80);
      ctx.closePath();
      ctx.fill();
    }

    // Layer 2: Mid-ground broken ruins & glowing runestones (0.45x parallax)
    const colSpacing = 360;
    const offsetMid = -(camX * 0.45) % colSpacing;
    for (let i = -1; i < 6; i++) {
      const x = offsetMid + i * colSpacing;
      const h = 280 + ((i * 73) % 140);
      ctx.fillStyle = 'rgba(14, 24, 40, 0.85)';
      ctx.fillRect(x, CANVAS_HEIGHT - h - camY * 0.12, 54, h + 200);
      // Subtle rune glow
      const pulse = 0.25 + 0.15 * Math.sin(time * 2 + i);
      ctx.fillStyle = room.ambientColor;
      ctx.globalAlpha = pulse;
      ctx.fillRect(x + 22, CANVAS_HEIGHT - h + 40 - camY * 0.12, 10, 44);
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }

  private drawPlatform(ctx: CanvasRenderingContext2D, p: Platform, accent: string) {
    // Base dark stone body
    const grad = ctx.createLinearGradient(p.x, p.y, p.x, p.y + p.h);
    if (p.style === 'moss') {
      grad.addColorStop(0, '#1e333a');
      grad.addColorStop(0.18, '#131d2b');
      grad.addColorStop(1, '#090e17');
    } else if (p.style === 'bridge') {
      grad.addColorStop(0, '#2a374b');
      grad.addColorStop(1, '#121925');
    } else {
      grad.addColorStop(0, '#1e2a3b');
      grad.addColorStop(1, '#0b1019');
    }
    ctx.fillStyle = grad;
    ctx.fillRect(p.x, p.y, p.w, p.h);

    // Crisp hand-drawn stone rim highlight on top
    ctx.fillStyle = p.style === 'moss' ? '#4ca393' : '#536c8d';
    ctx.fillRect(p.x, p.y, p.w, 4);

    // Subtle beveled border
    ctx.strokeStyle = 'rgba(165, 200, 240, 0.22)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(p.x + 0.75, p.y + 0.75, p.w - 1.5, p.h - 1.5);

    // Carved stone brick seams
    ctx.strokeStyle = 'rgba(4, 8, 14, 0.45)';
    ctx.lineWidth = 1;
    const step = 64;
    for (let sx = p.x + step; sx < p.x + p.w - 12; sx += step) {
      ctx.beginPath();
      ctx.moveTo(sx, p.y + 4);
      ctx.lineTo(sx, p.y + Math.min(p.h, 36));
      ctx.stroke();
    }

    // Pillar decorative rune
    if (p.style === 'pillar' && p.h > 120) {
      ctx.save();
      ctx.strokeStyle = accent;
      ctx.globalAlpha = 0.28;
      ctx.lineWidth = 2;
      ctx.strokeRect(p.x + 14, p.y + 24, p.w - 28, p.h - 48);
      ctx.restore();
    }
  }

  private drawSpikes(ctx: CanvasRenderingContext2D, s: Spike) {
    const toothW = 16;
    const count = Math.max(1, Math.floor(s.w / toothW));
    const actualW = s.w / count;

    for (let i = 0; i < count; i++) {
      const tx = s.x + i * actualW;
      ctx.beginPath();
      ctx.moveTo(tx, s.y + s.h);
      ctx.lineTo(tx + actualW * 0.5, s.y);
      ctx.lineTo(tx + actualW, s.y + s.h);
      ctx.closePath();

      const grad = ctx.createLinearGradient(tx, s.y, tx, s.y + s.h);
      grad.addColorStop(0, '#d8e6f8');
      grad.addColorStop(0.45, '#596e87');
      grad.addColorStop(1, '#1a2433');
      ctx.fillStyle = grad;
      ctx.fill();

      ctx.strokeStyle = 'rgba(220, 240, 255, 0.45)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  private drawBench(ctx: CanvasRenderingContext2D, b: Bench, time: number, showPrompt: boolean) {
    ctx.save();
    // Warm lantern glow behind bench
    const glowR = 90 + Math.sin(time * 2.5) * 8;
    const halo = ctx.createRadialGradient(b.x + b.w / 2, b.y, 6, b.x + b.w / 2, b.y, glowR);
    halo.addColorStop(0, 'rgba(255, 224, 155, 0.34)');
    halo.addColorStop(0.5, 'rgba(130, 190, 240, 0.12)');
    halo.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(b.x + b.w / 2, b.y, glowR, 0, Math.PI * 2);
    ctx.fill();

    // Ornate iron backrest & seat
    ctx.strokeStyle = '#9bb3cc';
    ctx.fillStyle = '#253244';
    ctx.lineWidth = 3;

    // Legs
    ctx.beginPath();
    ctx.moveTo(b.x + 12, b.y + b.h);
    ctx.lineTo(b.x + 16, b.y + 14);
    ctx.moveTo(b.x + b.w - 12, b.y + b.h);
    ctx.lineTo(b.x + b.w - 16, b.y + 14);
    ctx.stroke();

    // Seat plank
    ctx.fillRect(b.x + 6, b.y + 14, b.w - 12, 8);
    ctx.strokeRect(b.x + 6, b.y + 14, b.w - 12, 8);

    // Curved ornate backrest
    ctx.beginPath();
    ctx.moveTo(b.x + 12, b.y + 14);
    ctx.quadraticCurveTo(b.x + b.w / 2, b.y - 12, b.x + b.w - 12, b.y + 14);
    ctx.stroke();

    // Small lantern post beside bench
    const lx = b.x - 16;
    const ly = b.y - 36;
    ctx.strokeStyle = '#6f859e';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(lx, b.y + b.h);
    ctx.lineTo(lx, ly);
    ctx.lineTo(lx + 12, ly);
    ctx.stroke();

    ctx.fillStyle = '#ffe7a8';
    ctx.shadowBlur = 14;
    ctx.shadowColor = '#ffd573';
    ctx.beginPath();
    ctx.arc(lx + 12, ly + 8, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    if (showPrompt) {
      ctx.font = '600 13px "Segoe UI", "Noto Sans TC", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#eef5ff';
      ctx.fillText('[E] 坐下休息並存檔', b.x + b.w / 2, b.y - 26 + Math.sin(time * 4) * 3);
    }
    ctx.restore();
  }

  private drawPlayer(ctx: CanvasRenderingContext2D, player: Player, time: number) {
    // Focus healing aura ring
    if (player.focusing) {
      const progress = Math.min(1, player.focusTimer / PHYSICS.FOCUS_TIME);
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.shadowBlur = 16;
      ctx.shadowColor = '#ffffff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(player.centerX, player.centerY, 34 - progress * 8, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress);
      ctx.stroke();
      ctx.restore();
    }

    this.drawKnightSprite(
      ctx,
      player.x,
      player.y,
      player.w,
      player.h,
      player.facing,
      player.capeSway,
      player.runAnimTime,
      player.restingOnBench,
      false
    );

    // Subtle nail weapon at side when not slashing
    if (!player.activeSlash && !player.restingOnBench) {
      ctx.save();
      ctx.strokeStyle = '#cbd8e8';
      ctx.lineWidth = 2.5;
      const hx = player.centerX - player.facing * 8;
      const hy = player.y + 30;
      ctx.beginPath();
      ctx.moveTo(hx, hy);
      ctx.lineTo(hx - player.facing * 18, hy + 6 + Math.sin(time * 3) * 1);
      ctx.stroke();
      ctx.restore();
    }
  }

  private drawKnightSprite(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    facing: 1 | -1,
    capeSway: number,
    runAnimTime: number,
    resting: boolean,
    isShadow: boolean
  ) {
    ctx.save();
    const cx = x + w / 2;
    const bob = resting ? 3 : Math.sin(runAnimTime * 2) * 1.8;

    // Cloak / Body (flowing navy-slate silhouette)
    ctx.fillStyle = isShadow ? '#6ea8dc' : '#26344a';
    ctx.beginPath();
    ctx.moveTo(cx - 10, y + 22 + bob);
    ctx.lineTo(cx + 10, y + 22 + bob);
    ctx.lineTo(cx + 14 + capeSway, y + h - 3);
    ctx.quadraticCurveTo(cx + capeSway * 0.5, y + h + 2, cx - 14 + capeSway, y + h - 3);
    ctx.closePath();
    ctx.fill();

    // Inner void legs
    if (!isShadow && !resting) {
      const stride = Math.sin(runAnimTime) * 4;
      ctx.strokeStyle = '#070a10';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(cx - 4, y + h - 8);
      ctx.lineTo(cx - 4 + stride, y + h);
      ctx.moveTo(cx + 4, y + h - 8);
      ctx.lineTo(cx + 4 - stride, y + h);
      ctx.stroke();
    }

    // Iconic Pale Horned Mask (Head)
    const headY = y + 13 + bob;
    ctx.fillStyle = isShadow ? '#9fd0ff' : '#f1f5fb';
    ctx.beginPath();
    ctx.ellipse(cx, headY, 12.5, 11.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Curved Horns
    ctx.beginPath();
    // Left horn
    ctx.moveTo(cx - 9, headY - 6);
    ctx.quadraticCurveTo(cx - 14, headY - 21, cx - 4, headY - 24);
    ctx.quadraticCurveTo(cx - 6, headY - 14, cx - 3, headY - 10);
    // Right horn
    ctx.moveTo(cx + 9, headY - 6);
    ctx.quadraticCurveTo(cx + 14, headY - 21, cx + 4, headY - 24);
    ctx.quadraticCurveTo(cx + 6, headY - 14, cx + 3, headY - 10);
    ctx.fill();

    // Deep Void Eyes
    if (!isShadow) {
      ctx.fillStyle = '#07090f';
      const eyeOffset = facing * 3.5;
      ctx.beginPath();
      ctx.ellipse(cx + eyeOffset - 3.5, headY + 1, 2.4, 3.6, 0, 0, Math.PI * 2);
      ctx.ellipse(cx + eyeOffset + 4.5, headY + 1, 2.4, 3.6, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  private drawSlashArc(ctx: CanvasRenderingContext2D, slash: SlashHitbox, player: Player) {
    const t = 1 - slash.timer / slash.duration;
    const alpha = Math.max(0, 1 - t * 0.9);
    const cx = player.centerX;
    const cy = player.centerY;

    ctx.save();
    ctx.translate(cx, cy);
    if (slash.dir === 'left') ctx.rotate(Math.PI);
    else if (slash.dir === 'up') ctx.rotate(-Math.PI / 2);
    else if (slash.dir === 'down') ctx.rotate(Math.PI / 2);

    ctx.globalAlpha = alpha;
    ctx.shadowBlur = 18;
    ctx.shadowColor = '#a6dcff';

    // Outer crescent swipe
    ctx.fillStyle = 'rgba(218, 240, 255, 0.85)';
    ctx.beginPath();
    ctx.arc(14, 0, 58, -1.15, 1.15);
    ctx.arc(2, 0, 40, 1.05, -1.05, true);
    ctx.closePath();
    ctx.fill();

    // Bright white inner edge
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(14, 0, 56, -1.05, 1.05);
    ctx.stroke();

    ctx.restore();
  }

  private drawEnemy(ctx: CanvasRenderingContext2D, e: Enemy, time: number) {
    ctx.save();
    const flash = e.hitFlash > 0;
    const cx = e.centerX;
    const cy = e.centerY;

    if (e.type === 'totem') {
      // Ancient carved soul totem
      ctx.fillStyle = flash ? '#ffffff' : '#35455c';
      ctx.beginPath();
      ctx.roundRect(e.x + 4, e.y + 8, e.w - 8, e.h - 8, [16, 16, 4, 4]);
      ctx.fill();
      ctx.strokeStyle = '#738ca8';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Glowing soul eyes if charges remain
      if (e.soulCharges > 0) {
        const pulse = 0.7 + 0.3 * Math.sin(time * 4);
        ctx.fillStyle = `rgba(255, 255, 255, ${pulse})`;
        ctx.shadowBlur = 12;
        ctx.shadowColor = '#d4ecff';
        ctx.beginPath();
        ctx.arc(cx - 7, e.y + 28, 3.5, 0, Math.PI * 2);
        ctx.arc(cx + 7, e.y + 28, 3.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      return;
    }

    if (e.type === 'crawler') {
      // Armored bug carapace
      ctx.fillStyle = flash ? '#ffffff' : '#2c2536';
      ctx.beginPath();
      ctx.ellipse(cx, cy + 4, e.w / 2, e.h / 2 - 2, 0, Math.PI, 0);
      ctx.lineTo(e.x + e.w, e.y + e.h);
      ctx.lineTo(e.x, e.y + e.h);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#6c5a7a';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Glowing orange infection eye
      ctx.fillStyle = '#ff9838';
      ctx.shadowBlur = 8;
      ctx.shadowColor = '#ff7b1c';
      ctx.beginPath();
      ctx.arc(cx + e.facing * 10, cy + 2, 3.5, 0, Math.PI * 2);
      ctx.fill();
    } else if (e.type === 'flyer') {
      // Flapping wings
      const flap = Math.sin(time * 24) * 10;
      ctx.strokeStyle = 'rgba(210, 225, 245, 0.65)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(cx, cy - 4);
      ctx.lineTo(cx - 18, cy - 14 + flap);
      ctx.moveTo(cx, cy - 4);
      ctx.lineTo(cx + 18, cy - 14 + flap);
      ctx.stroke();

      // Body
      ctx.fillStyle = flash ? '#ffffff' : '#2d2433';
      ctx.beginPath();
      ctx.ellipse(cx, cy, 15, 13, 0, 0, Math.PI * 2);
      ctx.fill();

      // Glowing eyes
      ctx.fillStyle = '#ff9436';
      ctx.shadowBlur = 8;
      ctx.shadowColor = '#ff7b1c';
      ctx.beginPath();
      ctx.arc(cx + e.facing * 6, cy - 1, 3.2, 0, Math.PI * 2);
      ctx.fill();
    } else if (e.type === 'guard') {
      const telegraph = e.aiState === 'windup';
      ctx.fillStyle = flash ? '#ffffff' : telegraph ? '#4f3a52' : '#252a3d';
      ctx.beginPath();
      ctx.roundRect(e.x + 4, e.y + 18, e.w - 8, e.h - 18, 8);
      ctx.fill();

      // Horned helmet
      ctx.fillStyle = flash ? '#ffffff' : '#c6d1e0';
      ctx.beginPath();
      ctx.ellipse(cx, e.y + 16, 15, 13, 0, 0, Math.PI * 2);
      ctx.fill();

      // Glowing eyes
      ctx.fillStyle = telegraph ? '#ffdf70' : '#ff8c2b';
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#ff8c2b';
      ctx.beginPath();
      ctx.arc(cx + e.facing * 5, e.y + 16, 3.2, 0, Math.PI * 2);
      ctx.fill();

      // Greatclub / Lance telegraph
      ctx.shadowBlur = telegraph ? 14 : 0;
      ctx.shadowColor = '#ffcf70';
      ctx.strokeStyle = telegraph ? '#ffe6a3' : '#9aa9bf';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(cx, cy + 4);
      ctx.lineTo(cx + e.facing * (telegraph ? -22 : 34), cy + (telegraph ? -8 : 6));
      ctx.stroke();
    } else if (e.type === 'boss') {
      const telegraph = e.aiState === 'windup' || e.aiState === 'volley';
      // Phase 2 aura
      if (e.isPhase2) {
        ctx.save();
        const aura = ctx.createRadialGradient(cx, cy, 10, cx, cy, 85);
        aura.addColorStop(0, 'rgba(155, 175, 255, 0.3)');
        aura.addColorStop(1, 'rgba(155, 175, 255, 0)');
        ctx.fillStyle = aura;
        ctx.beginPath();
        ctx.arc(cx, cy, 85, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Tall tattered dark cloak
      ctx.fillStyle = flash ? '#ffffff' : '#1b1d33';
      ctx.beginPath();
      ctx.moveTo(cx - 24, e.y + 30);
      ctx.lineTo(cx + 24, e.y + 30);
      ctx.lineTo(cx + 34, e.y + e.h);
      ctx.lineTo(cx - 34, e.y + e.h);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#6c7cb5';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Pale Sentinel Crowned Mask
      ctx.fillStyle = flash ? '#ffffff' : '#e6eefc';
      ctx.beginPath();
      ctx.ellipse(cx, e.y + 24, 21, 19, 0, 0, Math.PI * 2);
      ctx.fill();

      // Tall Regal Horns
      ctx.beginPath();
      ctx.moveTo(cx - 15, e.y + 14);
      ctx.quadraticCurveTo(cx - 28, e.y - 22, cx - 8, e.y - 34);
      ctx.quadraticCurveTo(cx - 10, e.y - 10, cx - 5, e.y + 8);
      ctx.moveTo(cx + 15, e.y + 14);
      ctx.quadraticCurveTo(cx + 28, e.y - 22, cx + 8, e.y - 34);
      ctx.quadraticCurveTo(cx + 10, e.y - 10, cx + 5, e.y + 8);
      ctx.fill();

      // Glowing Boss Eyes
      ctx.fillStyle = e.isPhase2 ? '#9fd3ff' : '#ffb35c';
      ctx.shadowBlur = 14;
      ctx.shadowColor = e.isPhase2 ? '#7ab8ff' : '#ff8c2b';
      ctx.beginPath();
      ctx.ellipse(cx + e.facing * 7 - 5, e.y + 25, 3.2, 5, 0, 0, Math.PI * 2);
      ctx.ellipse(cx + e.facing * 7 + 5, e.y + 25, 3.2, 5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Greatnail Blade
      ctx.shadowBlur = telegraph ? 18 : 6;
      ctx.shadowColor = '#b3ccff';
      ctx.strokeStyle = telegraph ? '#ffffff' : '#b7c7e6';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(cx, cy + 4);
      ctx.lineTo(cx + e.facing * (telegraph ? -48 : 62), cy + (telegraph ? -18 : 10));
      ctx.stroke();
    }

    ctx.restore();
  }

  private drawProjectile(ctx: CanvasRenderingContext2D, proj: Projectile) {
    ctx.save();
    ctx.shadowBlur = 16;
    ctx.shadowColor = proj.color;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(proj.x, proj.y, proj.radius * 0.6, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = proj.color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(proj.x, proj.y, proj.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  private drawAmbientSpores(
    ctx: CanvasRenderingContext2D,
    color: string,
    camX: number,
    camY: number,
    time: number
  ) {
    ctx.save();
    ctx.fillStyle = color;
    for (const s of this.spores) {
      const sx = ((s.x - camX * 0.65 + Math.sin(time * 0.7 + s.phase) * 28) % CANVAS_WIDTH + CANVAS_WIDTH) % CANVAS_WIDTH;
      const sy = ((s.y - time * s.speed - camY * 0.35) % CANVAS_HEIGHT + CANVAS_HEIGHT) % CANVAS_HEIGHT;
      ctx.globalAlpha = 0.25 + 0.25 * Math.sin(time * 2 + s.phase);
      ctx.beginPath();
      ctx.arc(sx, sy, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  private drawLightingOverlay(ctx: CanvasRenderingContext2D, px: number, py: number) {
    ctx.save();
    // Subtle dark vignette around screen edges
    const vig = ctx.createRadialGradient(
      CANVAS_WIDTH / 2,
      CANVAS_HEIGHT / 2,
      CANVAS_HEIGHT * 0.38,
      CANVAS_WIDTH / 2,
      CANVAS_HEIGHT / 2,
      CANVAS_WIDTH * 0.72
    );
    vig.addColorStop(0, 'rgba(0, 0, 0, 0)');
    vig.addColorStop(1, 'rgba(2, 4, 9, 0.56)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Soft pale lantern aura around Knight
    const light = ctx.createRadialGradient(px, py, 10, px, py, 190);
    light.addColorStop(0, 'rgba(180, 220, 255, 0.09)');
    light.addColorStop(1, 'rgba(180, 220, 255, 0)');
    ctx.fillStyle = light;
    ctx.fillRect(px - 190, py - 190, 380, 380);
    ctx.restore();
  }

  private drawHUD(
    ctx: CanvasRenderingContext2D,
    player: Player,
    room: RoomData,
    enemies: Enemy[],
    bossDefeated: boolean,
    muted: boolean,
    time: number
  ) {
    ctx.save();

    // 1. Soul Vessel Orb (top-left)
    const ox = 66;
    const oy = 64;
    const r = 32;
    const soulRatio = player.soul / PHYSICS.MAX_SOUL;
    const canHeal = player.soul >= PHYSICS.FOCUS_COST;

    // Outer frame
    ctx.fillStyle = '#0c131f';
    ctx.beginPath();
    ctx.arc(ox, oy, r + 4, 0, Math.PI * 2);
    ctx.fill();

    // Clipped liquid soul inside orb
    ctx.save();
    ctx.beginPath();
    ctx.arc(ox, oy, r, 0, Math.PI * 2);
    ctx.clip();

    const fillY = oy + r - soulRatio * (r * 2);
    ctx.fillStyle = canHeal ? '#f2f7ff' : '#7b93b3';
    ctx.beginPath();
    ctx.moveTo(ox - r, oy + r);
    for (let x = -r; x <= r; x += 4) {
      const wave = Math.sin(time * 5 + x * 0.14) * 2.5;
      ctx.lineTo(ox + x, fillY + wave);
    }
    ctx.lineTo(ox + r, oy + r);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Vessel metallic rim
    ctx.strokeStyle = canHeal ? '#ffffff' : '#6c82a1';
    ctx.lineWidth = canHeal ? 3 : 2;
    if (canHeal) {
      ctx.shadowBlur = 12;
      ctx.shadowColor = '#b5dcff';
    }
    ctx.beginPath();
    ctx.arc(ox, oy, r + 1, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Soul numeric label
    ctx.font = '600 11px ui-monospace, monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = soulRatio > 0.55 ? '#0e1726' : '#dce8f8';
    ctx.fillText(`${Math.floor(player.soul)}`, ox, oy + 4);

    // 2. White Health Masks
    for (let i = 0; i < player.maxMasks; i++) {
      const mx = 124 + i * 38;
      const my = 56;
      const filled = i < player.masks;
      this.drawMaskIcon(ctx, mx, my, filled);
    }

    // Focus hint when injured & enough soul
    if (player.masks < player.maxMasks && canHeal) {
      ctx.font = '600 12px "Segoe UI", "Noto Sans TC", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillStyle = `rgba(220, 240, 255, ${0.65 + 0.35 * Math.sin(time * 5)})`;
      ctx.fillText('長按 [L] 或 [C] 凝聚靈魂回血', 112, 96);
    }

    // 3. Top-right room name & audio status
    ctx.textAlign = 'right';
    ctx.font = '600 14px "Segoe UI", "Noto Sans TC", sans-serif';
    ctx.fillStyle = 'rgba(215, 230, 248, 0.85)';
    ctx.fillText(room.name, CANVAS_WIDTH - 28, 36);

    ctx.font = '11px ui-monospace, monospace';
    ctx.fillStyle = 'rgba(150, 175, 205, 0.65)';
    ctx.fillText(muted ? 'SFX: MUTED [M]' : 'SFX: ON [M]', CANVAS_WIDTH - 28, 56);

    // 4. Boss HP bar
    const boss = enemies.find((e) => e.isBoss && !e.dead);
    if (boss) {
      const barW = 540;
      const barH = 12;
      const bx = (CANVAS_WIDTH - barW) / 2;
      const by = CANVAS_HEIGHT - 74;

      ctx.textAlign = 'center';
      ctx.font = '600 16px "Segoe UI", "Noto Sans TC", sans-serif';
      ctx.fillStyle = '#e8f0ff';
      ctx.fillText('空洞守望者 · HOLLOW SENTINEL', CANVAS_WIDTH / 2, by - 12);

      ctx.fillStyle = 'rgba(10, 14, 24, 0.85)';
      ctx.fillRect(bx - 3, by - 3, barW + 6, barH + 6);
      ctx.strokeStyle = 'rgba(180, 205, 245, 0.5)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(bx - 3, by - 3, barW + 6, barH + 6);

      const ratio = Math.max(0, boss.hp / boss.maxHp);
      ctx.fillStyle = boss.isPhase2 ? '#98c4ff' : '#d8e4ff';
      ctx.fillRect(bx, by, barW * ratio, barH);
    } else if (room.id === 'boss_arena' && bossDefeated) {
      ctx.textAlign = 'center';
      ctx.font = '600 22px "Segoe UI", "Noto Sans TC", sans-serif';
      ctx.fillStyle = '#eef5ff';
      ctx.fillText('空洞守望者已被擊敗', CANVAS_WIDTH / 2, 130);
      ctx.font = '14px "Segoe UI", "Noto Sans TC", sans-serif';
      ctx.fillStyle = '#a9c1de';
      ctx.fillText('可向左返回棘刺裂谷，或按 [R] 重新挑戰聖殿', CANVAS_WIDTH / 2, 158);
    }

    ctx.restore();
  }

  private drawMaskIcon(ctx: CanvasRenderingContext2D, x: number, y: number, filled: boolean) {
    ctx.save();
    ctx.fillStyle = filled ? '#f2f6fc' : 'rgba(24, 34, 48, 0.75)';
    ctx.strokeStyle = filled ? '#ffffff' : '#536782';
    ctx.lineWidth = 1.8;

    ctx.beginPath();
    ctx.moveTo(x, y - 13);
    ctx.quadraticCurveTo(x + 12, y - 11, x + 11, y + 2);
    ctx.quadraticCurveTo(x + 8, y + 13, x, y + 15);
    ctx.quadraticCurveTo(x - 8, y + 13, x - 11, y + 2);
    ctx.quadraticCurveTo(x - 12, y - 11, x, y - 13);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    if (filled) {
      ctx.fillStyle = '#090d16';
      ctx.beginPath();
      ctx.ellipse(x - 4, y + 1, 2, 3.2, 0, 0, Math.PI * 2);
      ctx.ellipse(x + 4, y + 1, 2, 3.2, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  private drawAreaBanner(ctx: CanvasRenderingContext2D, title: string, subtitle: string, alpha: number) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.textAlign = 'center';

    ctx.font = '600 34px "Segoe UI", "Noto Sans TC", serif';
    ctx.fillStyle = '#f2f7ff';
    ctx.shadowBlur = 16;
    ctx.shadowColor = 'rgba(120, 175, 240, 0.55)';
    ctx.fillText(title, CANVAS_WIDTH / 2, 170);

    // Ornamental divider line
    ctx.strokeStyle = 'rgba(210, 230, 255, 0.65)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(CANVAS_WIDTH / 2 - 140, 186);
    ctx.lineTo(CANVAS_WIDTH / 2 + 140, 186);
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.font = '500 13px ui-monospace, monospace';
    ctx.fillStyle = '#b4c9e3';
    ctx.fillText(subtitle, CANVAS_WIDTH / 2, 206);
    ctx.restore();
  }

  private drawTitleScreen(ctx: CanvasRenderingContext2D, time: number) {
    ctx.save();
    ctx.fillStyle = 'rgba(5, 8, 15, 0.72)';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#f2f7ff';
    ctx.shadowBlur = 24;
    ctx.shadowColor = 'rgba(130, 190, 255, 0.65)';
    ctx.font = '700 54px "Segoe UI", "Noto Sans TC", serif';
    ctx.fillText('HOLLOW ECHO', CANVAS_WIDTH / 2, 290);

    ctx.shadowBlur = 0;
    ctx.font = '500 18px "Segoe UI", "Noto Sans TC", sans-serif';
    ctx.fillStyle = '#a7bedb';
    ctx.fillText('類空洞騎士 2D 動作探索原型（Vertical Slice）', CANVAS_WIDTH / 2, 332);

    ctx.strokeStyle = 'rgba(180, 210, 245, 0.45)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(CANVAS_WIDTH / 2 - 190, 358);
    ctx.lineTo(CANVAS_WIDTH / 2 + 190, 358);
    ctx.stroke();

    ctx.font = '500 15px "Segoe UI", "Noto Sans TC", sans-serif';
    ctx.fillStyle = '#d3e2f5';
    ctx.fillText('包含：四向揮砍與下劈彈跳（Pogo）、二段跳、蹬牆跳、衝刺、靈魂回血、三區地圖與首領戰', CANVAS_WIDTH / 2, 396);

    const pulse = 0.55 + 0.45 * Math.sin(time * 4);
    ctx.fillStyle = `rgba(255, 255, 255, ${pulse})`;
    ctx.font = '600 20px "Segoe UI", "Noto Sans TC", sans-serif';
    ctx.fillText('按任意鍵開始探索', CANVAS_WIDTH / 2, 476);

    ctx.restore();
  }
}
