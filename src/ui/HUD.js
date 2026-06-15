/**
 * RE:UNIT — HUD
 * HP bar, ultimate gauge, kill/spare counter.
 */
import Phaser from 'phaser';
import { GAME_WIDTH, COLORS, DEPTH, UI } from '../data/constants.js';
import gameState from '../game.js';

export class HUD {
  constructor(scene) {
    this.scene = scene;
    this._createHPBar();
    this._createUltimateBar();
    this._createScoreDisplay();
    this._createKillCounter();
  }

  _createHPBar() {
    const x = 40, y = 40;
    // Label
    this._hpLabel = this.scene.add.text(x, y - 18, 'HP', {
      fontFamily: 'Orbitron', fontSize: '14px', color: COLORS.CYAN_HEX,
    }).setDepth(DEPTH.UI).setScrollFactor(0);

    // BG
    this._hpBg = this.scene.add.rectangle(x, y, UI.HP_BAR_WIDTH, UI.HP_BAR_HEIGHT, 0x333333, 0.6);
    this._hpBg.setOrigin(0, 0.5).setDepth(DEPTH.UI).setScrollFactor(0);

    // Fill
    this._hpFill = this.scene.add.rectangle(x, y, UI.HP_BAR_WIDTH, UI.HP_BAR_HEIGHT, COLORS.CYAN, 0.9);
    this._hpFill.setOrigin(0, 0.5).setDepth(DEPTH.UI).setScrollFactor(0);

    // Border
    this._hpBorder = this.scene.add.rectangle(x, y, UI.HP_BAR_WIDTH, UI.HP_BAR_HEIGHT);
    this._hpBorder.setOrigin(0, 0.5).setDepth(DEPTH.UI).setScrollFactor(0);
    this._hpBorder.setStrokeStyle(1, COLORS.CYAN, 0.4);
    this._hpBorder.setFillStyle(0, 0);

    // HP text
    this._hpText = this.scene.add.text(x + UI.HP_BAR_WIDTH + 10, y, '100', {
      fontFamily: 'Orbitron', fontSize: '16px', color: COLORS.WHITE_HEX,
    }).setOrigin(0, 0.5).setDepth(DEPTH.UI).setScrollFactor(0);
  }

  _createUltimateBar() {
    const x = GAME_WIDTH - 300, y = 40;
    this._ultLabel = this.scene.add.text(x, y - 18, 'ULTIMATE', {
      fontFamily: 'Orbitron', fontSize: '12px', color: COLORS.GRAY_HEX,
    }).setDepth(DEPTH.UI).setScrollFactor(0);

    this._ultBg = this.scene.add.rectangle(x, y, UI.ULTIMATE_BAR_WIDTH, UI.ULTIMATE_BAR_HEIGHT, 0x333333, 0.6);
    this._ultBg.setOrigin(0, 0.5).setDepth(DEPTH.UI).setScrollFactor(0);

    this._ultFill = this.scene.add.rectangle(x, y, 0, UI.ULTIMATE_BAR_HEIGHT, 0x8844ff, 0.9);
    this._ultFill.setOrigin(0, 0.5).setDepth(DEPTH.UI).setScrollFactor(0);

    this._ultBorder = this.scene.add.rectangle(x, y, UI.ULTIMATE_BAR_WIDTH, UI.ULTIMATE_BAR_HEIGHT);
    this._ultBorder.setOrigin(0, 0.5).setDepth(DEPTH.UI).setScrollFactor(0);
    this._ultBorder.setStrokeStyle(1, 0x8844ff, 0.4);
    this._ultBorder.setFillStyle(0, 0);

    this._ultText = this.scene.add.text(x + UI.ULTIMATE_BAR_WIDTH + 10, y, '0%', {
      fontFamily: 'Orbitron', fontSize: '14px', color: COLORS.GRAY_HEX,
    }).setOrigin(0, 0.5).setDepth(DEPTH.UI).setScrollFactor(0);
  }

  _createScoreDisplay() {
    this._scoreText = this.scene.add.text(GAME_WIDTH / 2, 30, 'SCORE: 0', {
      fontFamily: 'Orbitron', fontSize: '18px', color: COLORS.WHITE_HEX,
      shadow: { offsetX: 0, offsetY: 0, color: COLORS.CYAN_HEX, blur: 6, fill: true },
    }).setOrigin(0.5, 0).setDepth(DEPTH.UI).setScrollFactor(0);
  }

  _createKillCounter() {
    this._killText = this.scene.add.text(GAME_WIDTH - 40, 80, '', {
      fontFamily: 'Orbitron', fontSize: '12px', color: COLORS.GRAY_HEX,
      align: 'right',
    }).setOrigin(1, 0).setDepth(DEPTH.UI).setScrollFactor(0);
  }

  update() {
    const hpRatio = Math.max(0, gameState.playerHP / gameState.playerMaxHP);
    this._hpFill.width = UI.HP_BAR_WIDTH * hpRatio;
    this._hpText.setText(Math.ceil(gameState.playerHP).toString());

    // HP color shift
    if (hpRatio < 0.25) {
      this._hpFill.setFillStyle(COLORS.RED_WARN, 0.9);
      this._hpLabel.setColor(COLORS.RED_HEX);
    } else if (hpRatio < 0.5) {
      this._hpFill.setFillStyle(0xFFAA00, 0.9);
      this._hpLabel.setColor('#FFAA00');
    } else {
      this._hpFill.setFillStyle(COLORS.CYAN, 0.9);
      this._hpLabel.setColor(COLORS.CYAN_HEX);
    }

    // Ultimate
    const ultRatio = gameState.ultimateCharge / 100;
    this._ultFill.width = UI.ULTIMATE_BAR_WIDTH * ultRatio;
    this._ultText.setText(`${Math.floor(gameState.ultimateCharge)}%`);
    if (gameState.ultimateCharge >= 100) {
      this._ultFill.setFillStyle(COLORS.CYAN, 1);
      this._ultLabel.setColor(COLORS.CYAN_HEX);
      this._ultText.setColor(COLORS.CYAN_HEX);
    } else {
      this._ultFill.setFillStyle(0x8844ff, 0.9);
      this._ultLabel.setColor(COLORS.GRAY_HEX);
      this._ultText.setColor(COLORS.GRAY_HEX);
    }

    // Score
    this._scoreText.setText(`SCORE: ${gameState.score}`);

    // Kill/Spare
    if (gameState.totalEncounters > 0) {
      this._killText.setText(`KILL:${gameState.killCount} / SPARE:${gameState.spareCount}`);
    }
  }

  /**
   * Flash the HP bar red on damage
   */
  flashDamage() {
    this.scene.tweens.add({
      targets: this._hpFill,
      alpha: { from: 0.3, to: 0.9 },
      duration: 100,
      yoyo: true,
    });
  }
}
