/**
 * RE:UNIT — Title Scene
 * Atmospheric title screen with GSAP effects.
 */
import Phaser from 'phaser';
import { gsap } from 'gsap';
import { GAME_WIDTH, GAME_HEIGHT, COLORS, DEPTH } from '../data/constants.js';

export class TitleScene extends Phaser.Scene {
  constructor() {
    super({ key: 'TitleScene' });
  }

  create() {
    this.cameras.main.setBackgroundColor(COLORS.BG_DARK);
    this._idleTimer = 0;
    this._idleTriggered = false;

    this._createBackground();
    this._createRain();
    this._createTitle();
    this._createStartPrompt();
    this._createScanlines();

    // Version
    this.add.text(GAME_WIDTH - 20, GAME_HEIGHT - 30, 'v0.1.0', {
      fontFamily: 'Orbitron', fontSize: '14px', color: COLORS.GRAY_HEX,
    }).setOrigin(1, 1).setDepth(DEPTH.UI);

    // Input
    this.input.on('pointerdown', () => this._startGame());
    this.input.keyboard.on('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') this._startGame();
    });
  }

  update(time, delta) {
    this._idleTimer += delta;
    if (this._idleTimer > 30000 && !this._idleTriggered) {
      this._triggerIdleEffect();
    }
    this.input.on('pointermove', () => { this._idleTimer = 0; });
  }

  _createBackground() {
    const bg = this.add.tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, 'bg_far');
    bg.setOrigin(0, 0).setDepth(DEPTH.BG_FAR).setTint(0x667799).setAlpha(0.6);
    const bgMid = this.add.tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, 'bg_mid');
    bgMid.setOrigin(0, 0).setDepth(DEPTH.BG_MID).setAlpha(0.7);
    this.time.addEvent({
      delay: 16, loop: true,
      callback: () => { bg.tilePositionX += 0.15; bgMid.tilePositionX += 0.35; },
    });
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT, GAME_WIDTH, 300, COLORS.CYAN, 0.04)
      .setDepth(DEPTH.BG_NEAR);
  }

  _createRain() {
    this.add.particles(0, -50, 'rain', {
      x: { min: 0, max: GAME_WIDTH }, y: -20, quantity: 3, frequency: 30,
      lifespan: 1800, speedY: { min: 400, max: 700 }, speedX: { min: -30, max: -80 },
      scale: { min: 0.5, max: 1.5 }, alpha: { start: 0.4, end: 0.1 },
    }).setDepth(DEPTH.BG_NEAR + 1);
  }

  _createTitle() {
    this._title = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT * 0.35, 'RE:UNIT', {
      fontFamily: 'Orbitron', fontSize: '120px', fontStyle: 'bold',
      color: COLORS.CYAN_HEX,
      shadow: { offsetX: 0, offsetY: 0, color: COLORS.CYAN_HEX, blur: 30, fill: true },
    }).setOrigin(0.5).setDepth(DEPTH.UI).setAlpha(0);

    gsap.fromTo(this._title, { alpha: 0, y: GAME_HEIGHT * 0.35 - 40 },
      { alpha: 1, y: GAME_HEIGHT * 0.35, duration: 1.5, ease: 'power3.out', delay: 0.3 });

    this._subtitle = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT * 0.48, '終末都市弾幕アクション', {
      fontFamily: 'Noto Sans JP', fontSize: '28px', color: COLORS.GRAY_HEX,
    }).setOrigin(0.5).setDepth(DEPTH.UI).setAlpha(0);

    gsap.to(this._subtitle, { alpha: 0.7, duration: 2, delay: 1.2 });

    this.time.addEvent({
      delay: 4000, loop: true,
      callback: () => this._glitchTitle(),
    });
  }

  _createStartPrompt() {
    this._startText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT * 0.7, '[ PRESS START ]', {
      fontFamily: 'Orbitron', fontSize: '24px', color: COLORS.WHITE_HEX,
      shadow: { offsetX: 0, offsetY: 0, color: COLORS.CYAN_HEX, blur: 12, fill: true },
    }).setOrigin(0.5).setDepth(DEPTH.UI).setAlpha(0);

    gsap.to(this._startText, {
      alpha: 1, duration: 1, delay: 2.5,
      onComplete: () => {
        gsap.to(this._startText, { alpha: 0.3, duration: 1.2, yoyo: true, repeat: -1, ease: 'sine.inOut' });
      },
    });
  }

  _createScanlines() {
    const g = this.add.graphics();
    g.setDepth(DEPTH.OVERLAY).setAlpha(0.5);
    for (let y = 0; y < GAME_HEIGHT; y += 3) {
      g.fillStyle(0x000000, 0.06);
      g.fillRect(0, y, GAME_WIDTH, 1);
    }
  }

  _glitchTitle() {
    if (!this._title?.active) return;
    const ox = this._title.x;
    gsap.timeline()
      .to(this._title, { x: ox + 6, duration: 0.03 })
      .to(this._title, { x: ox - 4, duration: 0.03 })
      .to(this._title, { x: ox, duration: 0.03 });
    this._title.setTint(0xff0044);
    this.time.delayedCall(80, () => { if (this._title?.active) this._title.clearTint(); });
  }

  _triggerIdleEffect() {
    this._idleTriggered = true;
    this.cameras.main.shake(200, 0.005);
    const ht = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT * 0.85, '...お前は誰だ？', {
      fontFamily: 'Noto Sans JP', fontSize: '20px', color: COLORS.RED_HEX,
    }).setOrigin(0.5).setDepth(DEPTH.UI).setAlpha(0);
    gsap.to(ht, { alpha: 0.6, duration: 2, onComplete: () => gsap.to(ht, { alpha: 0, duration: 3, delay: 2 }) });
  }

  _startGame() {
    this.cameras.main.flash(300, 0, 209, 255);
    this.cameras.main.fade(500, 0, 0, 0);
    this.time.delayedCall(600, () => this.scene.start('BattleScene'));
  }
}
