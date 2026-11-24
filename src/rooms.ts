import { RoomData, RoomId } from './types';

export const ROOMS: Record<RoomId, RoomData> = {
  crossroads: {
    id: 'crossroads',
    name: '遺忘交界',
    subtitle: 'FORGOTTEN CROSSROADS',
    width: 2400,
    height: 920,
    ambientColor: '#6ea8dc',
    bgTop: '#08101c',
    bgBottom: '#142235',
    platforms: [
      // Ceiling & Left Wall
      { x: 0, y: 0, w: 2400, h: 48, style: 'stone' },
      { x: 0, y: 0, w: 48, h: 920, style: 'stone' },
      // Right boundary walls with doorway opening (y: 520..760)
      { x: 2352, y: 0, w: 48, h: 520, style: 'stone' },
      { x: 2352, y: 760, w: 48, h: 160, style: 'stone' },

      // Main sanctuary floor (starting bench area)
      { x: 48, y: 760, w: 720, h: 160, style: 'moss' },
      // Pit floor with spikes
      { x: 768, y: 848, w: 360, h: 72, style: 'stone' },
      // Middle ruins floor
      { x: 1128, y: 760, w: 1224, h: 160, style: 'stone' },

      // Elevated stepping stones & ruins
      { x: 380, y: 620, w: 170, h: 28, style: 'bridge' },
      { x: 640, y: 520, w: 190, h: 28, style: 'stone' },
      { x: 890, y: 650, w: 140, h: 26, style: 'bridge' },
      { x: 1210, y: 600, w: 220, h: 28, style: 'moss' },
      { x: 1520, y: 470, w: 210, h: 28, style: 'stone' },
      { x: 1840, y: 600, w: 200, h: 28, style: 'bridge' },

      // Central ruin pillar for wall jump practice
      { x: 1440, y: 220, w: 64, h: 280, style: 'pillar' },
      { x: 1120, y: 340, w: 240, h: 28, style: 'stone' },
    ],
    spikes: [
      { x: 774, y: 824, w: 348, h: 24, orientation: 'up' },
    ],
    benches: [
      { x: 185, y: 724, w: 88, h: 36, roomId: 'crossroads' },
    ],
    transitions: [
      {
        x: 2358,
        y: 520,
        w: 42,
        h: 240,
        targetRoom: 'cavern',
        spawnX: 90,
        spawnY: 690,
      },
    ],
    spawns: [
      { type: 'totem', x: 560, y: 692 },
      { type: 'crawler', x: 1240, y: 726 },
      { type: 'crawler', x: 1680, y: 726 },
      { type: 'flyer', x: 960, y: 460 },
      { type: 'flyer', x: 1620, y: 360 },
      { type: 'guard', x: 2040, y: 696 },
    ],
  },

  cavern: {
    id: 'cavern',
    name: '棘刺裂谷',
    subtitle: 'THORNED CHASM',
    width: 2480,
    height: 980,
    ambientColor: '#5ec7b7',
    bgTop: '#07131a',
    bgBottom: '#102732',
    platforms: [
      // Ceiling
      { x: 0, y: 0, w: 2480, h: 48, style: 'stone' },
      // Left wall with doorway (y: 560..800)
      { x: 0, y: 0, w: 48, h: 560, style: 'stone' },
      { x: 0, y: 800, w: 48, h: 180, style: 'stone' },
      // Right wall with doorway to boss (y: 520..760)
      { x: 2432, y: 0, w: 48, h: 520, style: 'stone' },
      { x: 2432, y: 760, w: 48, h: 220, style: 'stone' },

      // Left entry ledge
      { x: 48, y: 800, w: 340, h: 180, style: 'moss' },

      // Deep spike canyon floor
      { x: 388, y: 904, w: 1240, h: 76, style: 'stone' },

      // Pogo gauntlet islands & pillars
      { x: 520, y: 730, w: 110, h: 26, style: 'bridge' },
      { x: 780, y: 660, w: 110, h: 26, style: 'stone' },
      { x: 1050, y: 730, w: 120, h: 26, style: 'bridge' },
      { x: 1320, y: 640, w: 140, h: 26, style: 'moss' },

      // Wall-jump chimney shaft (left & right vertical pillars)
      { x: 1628, y: 420, w: 72, h: 560, style: 'pillar' },
      { x: 1850, y: 210, w: 72, h: 470, style: 'pillar' },
      // Upper bridge over chimney
      { x: 1380, y: 310, w: 250, h: 28, style: 'stone' },

      // Right sanctuary floor before Boss Arena
      { x: 1700, y: 760, w: 732, h: 220, style: 'stone' },
      { x: 2020, y: 600, w: 190, h: 26, style: 'bridge' },
    ],
    spikes: [
      // Long spike floor ideal for Pogo bounce practice
      { x: 396, y: 880, w: 1224, h: 24, orientation: 'up' },
      // Upper spike hazard on central pillar top
      { x: 1636, y: 396, w: 56, h: 24, orientation: 'up' },
    ],
    benches: [
      { x: 2120, y: 724, w: 88, h: 36, roomId: 'cavern' },
    ],
    transitions: [
      {
        x: 0,
        y: 560,
        w: 42,
        h: 240,
        targetRoom: 'crossroads',
        spawnX: 2260,
        spawnY: 690,
      },
      {
        x: 2438,
        y: 520,
        w: 42,
        h: 240,
        targetRoom: 'boss_arena',
        spawnX: 100,
        spawnY: 670,
      },
    ],
    spawns: [
      { type: 'totem', x: 260, y: 732 },
      { type: 'flyer', x: 660, y: 520 },
      { type: 'flyer', x: 960, y: 490 },
      { type: 'flyer', x: 1240, y: 460 },
      { type: 'crawler', x: 1440, y: 276 },
      { type: 'guard', x: 1900, y: 696 },
      { type: 'totem', x: 2280, y: 692 },
    ],
  },

  boss_arena: {
    id: 'boss_arena',
    name: '守望者聖殿',
    subtitle: 'SANCTUM OF THE SENTINEL',
    width: 1680,
    height: 860,
    ambientColor: '#98a6ff',
    bgTop: '#0b0a1a',
    bgBottom: '#1a1834',
    platforms: [
      // Ceiling
      { x: 0, y: 0, w: 1680, h: 48, style: 'stone' },
      // Left wall with return doorway (y: 500..740)
      { x: 0, y: 0, w: 48, h: 500, style: 'stone' },
      { x: 0, y: 740, w: 48, h: 120, style: 'stone' },
      // Right solid wall
      { x: 1632, y: 0, w: 48, h: 860, style: 'stone' },

      // Arena floor
      { x: 48, y: 740, w: 1584, h: 120, style: 'stone' },

      // Symmetrical side ledges for dodging boss shockwaves
      { x: 240, y: 560, w: 200, h: 24, style: 'bridge' },
      { x: 1240, y: 560, w: 200, h: 24, style: 'bridge' },
      { x: 740, y: 450, w: 200, h: 24, style: 'bridge' },
    ],
    spikes: [],
    benches: [],
    transitions: [
      {
        x: 0,
        y: 500,
        w: 42,
        h: 240,
        targetRoom: 'cavern',
        spawnX: 2330,
        spawnY: 690,
      },
    ],
    spawns: [
      { type: 'boss', x: 1120, y: 630 },
    ],
  },
};
