export interface Vec2 {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type SlashDir = 'left' | 'right' | 'up' | 'down';

export type RoomId = 'crossroads' | 'cavern' | 'boss_arena';

export type EnemyType = 'crawler' | 'flyer' | 'guard' | 'totem' | 'boss';

export interface Platform extends Rect {
  style?: 'stone' | 'moss' | 'pillar' | 'bridge';
}

export interface Spike extends Rect {
  orientation: 'up' | 'down' | 'left' | 'right';
}

export interface Bench {
  x: number;
  y: number;
  w: number;
  h: number;
  roomId: RoomId;
}

export interface RoomTransition {
  x: number;
  y: number;
  w: number;
  h: number;
  targetRoom: RoomId;
  spawnX: number;
  spawnY: number;
}

export interface EnemySpawn {
  type: EnemyType;
  x: number;
  y: number;
}

export interface RoomData {
  id: RoomId;
  name: string;
  subtitle: string;
  width: number;
  height: number;
  ambientColor: string;
  bgTop: string;
  bgBottom: string;
  platforms: Platform[];
  spikes: Spike[];
  benches: Bench[];
  transitions: RoomTransition[];
  spawns: EnemySpawn[];
}

export interface SlashHitbox {
  rect: Rect;
  dir: SlashDir;
  timer: number;
  duration: number;
  hitIds: Set<number>;
  pogoTriggered: boolean;
}

export interface Projectile {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  life: number;
  color: string;
  fromBoss: boolean;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  life: number;
  maxLife: number;
  color: string;
  gravity?: number;
  glow?: boolean;
}

export interface Afterimage {
  x: number;
  y: number;
  facing: 1 | -1;
  alpha: number;
  life: number;
  maxLife: number;
}
