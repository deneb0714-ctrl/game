/**
 * RE:UNIT — Game Over Scene
 * Terminal-style death screen with retry options.
 */
import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS, DEPTH } from '../data/constants.js';
import gameState from '../game.js';

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameOverScene' });
  }

  create(data) {
    // Dim background
    const bg = this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.8);
    bg.setOrigin(0, 0);

    // Terminal text
    const title = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT * 0.3, 'CRITICAL SYSTEM FAILURE', {
      fontFamily: 'Orbitron',
      fontSize: '48px',
      color: COLORS.RED_HEX,
    }).setOrigin(0.5);

    const subtitle = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT * 0.4, 'SIGNAL LOST // CONNECTION TERMINATED', {
      fontFamily: 'Roboto Mono',
      fontSize: '20px',
      color: COLORS.RED_HEX,
    }).setOrigin(0.5);

    // Stats
    const statsText = `
SCORE: ${gameState.score}
KILLS: ${gameState.killCount}
SPARES: ${gameState.spareCount}
ROUTE: ${gameState.currentRoute.toUpperCase()}
    `.trim();

    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT * 0.55, statsText, {
      fontFamily: 'Roboto Mono',
      fontSize: '18px',
      color: COLORS.CYAN_HEX,
      align: 'center',
    }).setOrigin(0.5);

    // Buttons
    const retryBtn = this._createButton(GAME_WIDTH / 2, GAME_HEIGHT * 0.75, 'REBOOT SYSTEM (RETRY)', () => {
      this._retry();
    });

    const quitBtn = this._createButton(GAME_WIDTH / 2, GAME_HEIGHT * 0.85, 'TERMINATE SESSION (QUIT)', () => {
      this._quit();
    });

    // Initial animations
    this.add.tween({
      targets: [title, subtitle],
      alpha: { from: 0, to: 1 },
      y: '+=20',
      duration: 800,
      ease: 'Power2',
    });

    // Flickering effect
    this.time.addEvent({
      delay: 2000,
      loop: true,
      callback: () => {
        this.cameras.main.shake(100, 0.005);
      }
    });
  }

  _createButton(x, y, label, callback) {
    const btn = this.add.container(x, y);
    
    const bg = this.add.rectangle(0, 0, 300, 50, 0x000000, 0.5);
    bg.setStrokeStyle(2, COLORS.CYAN);
    
    const text = this.add.text(0, 0, label, {
      fontFamily: 'Orbitron',
      fontSize: '18px',
      color: COLORS.CYAN_HEX,
    }).setOrigin(0.5);

    btn.add([bg, text]);
    btn.setSize(300, 50);
    btn.setInteractive({ useHandCursor: true });

    btn.on('pointerover', () => {
      bg.setFillStyle(COLORS.CYAN, 0.2);
      text.setTint(0xffffff);
      this.cameras.main.shake(50, 0.002);
    });

    btn.on('pointerout', () => {
      bg.setFillStyle(0x000000, 0.5);
      text.clearTint();
    });

    btn.on('pointerdown', callback);

    return btn;
  }

  _retry() {
    this.cameras.main.fade(500, 0, 0, 0);
    this.time.delayedCall(500, () => {
      gameState.playerHP = gameState.playerMaxHP;
      gameState.ultimateCharge = 0;
      // We don't call gameState.reset() fully to keep the score/route if desired,
      // but the user said "stage from the beginning", so we should reset wave-related state in BattleScene.
      this.scene.start('BattleScene');
    });
  }

  _quit() {
    this.cameras.main.fade(500, 0, 0, 0);
    this.time.delayedCall(500, () => {
      gameState.reset();
      this.scene.start('TitleScene');
    });
  }
}
