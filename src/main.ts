import { Game } from './game';

const canvas = document.getElementById('game') as HTMLCanvasElement | null;
if (!canvas) {
  throw new Error('找不到 #game Canvas 元素');
}

const game = new Game(canvas);
game.start();
