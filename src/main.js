/**
 * RE:UNIT — Main Entry Point
 * Phaser game initialization.
 */
import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from './data/constants.js';
import { BootScene } from './scenes/BootScene.js';
import { TitleScene } from './scenes/TitleScene.js';
import { BattleScene } from './scenes/BattleScene.js';
import { GameOverScene } from './scenes/GameOverScene.js';

const config = {
  type: Phaser.AUTO,
  parent: 'game-container',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: COLORS.BG_HEX,
  pixelArt: true,

  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },

  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 },
      debug: false,
    },
  },

  scene: [BootScene, TitleScene, BattleScene, GameOverScene],

  render: {
    antialias: false,
    pixelArt: true,
    roundPixels: true,
  },

  input: {
    activePointers: 3,
  },
};

// Add CRT overlay
document.addEventListener('DOMContentLoaded', () => {
  const overlay = document.createElement('div');
  overlay.className = 'crt-overlay';
  document.body.appendChild(overlay);
});

const game = new Phaser.Game(config);
