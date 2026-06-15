/**
 * RE:UNIT — Boot Scene
 * Terminal-style boot sequence with procedural asset generation.
 */
import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '../data/constants.js';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload() {
    // We generate all placeholder assets procedurally
    this._generateTextures();
  }

  create() {
    this.cameras.main.setBackgroundColor(COLORS.BG_DARK);

    // Boot terminal text
    this._lines = [
      '> SYSTEM INITIALIZATION...',
      '> LOADING CORE MODULES......... OK',
      '> NEURAL LINK STATUS: ACTIVE',
      '> MEMORY INTEGRITY: ███░░░░░ 38%',
      '> WARNING: IDENTITY DATA CORRUPTED',
      '> WEAPON SYSTEMS: ONLINE',
      '> COMBAT PROTOCOL: ENABLED',
      '',
      '> [ UNIT-07 BOOTING... ]',
      '',
      '> 「聞こえるか、勇者」',
    ];

    this._textObjects = [];
    this._currentLine = 0;
    this._charIndex = 0;
    this._timer = 0;

    // Scanline overlay
    const scanlines = this.add.graphics();
    scanlines.setDepth(200);
    for (let y = 0; y < GAME_HEIGHT; y += 3) {
      scanlines.fillStyle(0x000000, 0.06);
      scanlines.fillRect(0, y, GAME_WIDTH, 1);
    }

    // Start typing
    this.time.addEvent({
      delay: 45,
      callback: this._typeChar,
      callbackScope: this,
      loop: true,
    });

    // Transition after all text
    this.time.delayedCall(6000, () => {
      // Glitch flash
      this.cameras.main.flash(200, 0, 209, 255);
      this.time.delayedCall(400, () => {
        this.scene.start('TitleScene');
      });
    });
  }

  _typeChar() {
    if (this._currentLine >= this._lines.length) return;

    const line = this._lines[this._currentLine];

    if (this._charIndex === 0) {
      const y = 180 + this._currentLine * 42;
      const text = this.add.text(200, y, '', {
        fontFamily: 'Orbitron, monospace',
        fontSize: '22px',
        color: this._currentLine === this._lines.length - 1 ? COLORS.CYAN_HEX : COLORS.WHITE_HEX,
        shadow: {
          offsetX: 0, offsetY: 0, color: COLORS.CYAN_HEX, blur: 8, fill: true,
        },
      });
      text.setDepth(100);
      this._textObjects.push(text);

      // Glitch effect on certain lines
      if (line.includes('WARNING') || line.includes('CORRUPTED')) {
        text.setColor(COLORS.RED_HEX);
        text.setShadow(0, 0, COLORS.RED_HEX, 8, true);

        // Random offset flicker
        this.tweens.add({
          targets: text,
          x: { from: 198, to: 202 },
          duration: 60,
          yoyo: true,
          repeat: 3,
        });
      }
    }

    const textObj = this._textObjects[this._currentLine];
    if (this._charIndex < line.length) {
      textObj.setText(line.substring(0, this._charIndex + 1));
      this._charIndex++;
    } else {
      this._charIndex = 0;
      this._currentLine++;
    }
  }

  /**
   * Generate all placeholder textures procedurally
   */
  _generateTextures() {
    // ── Player sprite (cyan humanoid) ──
    this._genPlayerSprites();

    // ── Enemy sprites ──
    this._genEnemySprites();

    // ── Bullets ──
    this._genBulletSprites();

    // ── Particle ──
    const particleGfx = this.make.graphics({ add: false });
    particleGfx.fillStyle(0xffffff, 1);
    particleGfx.fillCircle(4, 4, 4);
    particleGfx.generateTexture('particle', 8, 8);
    particleGfx.destroy();

    // ── Background tiles ──
    this._genBackgroundTiles();

    // ── UI elements ──
    this._genUISprites();
  }

  _genPlayerSprites() {
    // Idle frame
    const idle = this.make.graphics({ add: false });
    // Body
    idle.fillStyle(0x111827, 1);
    idle.fillRoundedRect(8, 12, 32, 40, 4);
    // Visor
    idle.fillStyle(COLORS.CYAN, 1);
    idle.fillRect(14, 16, 22, 8);
    // Core glow
    idle.fillStyle(COLORS.CYAN, 0.6);
    idle.fillCircle(24, 36, 5);
    // Arms
    idle.fillStyle(0x1a2332, 1);
    idle.fillRect(4, 20, 6, 24);
    idle.fillRect(38, 20, 6, 24);
    // Legs
    idle.fillStyle(0x1a2332, 1);
    idle.fillRect(12, 52, 8, 12);
    idle.fillRect(28, 52, 8, 12);
    // Outline glow
    idle.lineStyle(1, COLORS.CYAN, 0.3);
    idle.strokeRoundedRect(8, 12, 32, 40, 4);
    idle.generateTexture('player_idle', 48, 64);
    idle.destroy();

    // Run frame (slightly different pose)
    const run = this.make.graphics({ add: false });
    run.fillStyle(0x111827, 1);
    run.fillRoundedRect(8, 10, 32, 40, 4);
    run.fillStyle(COLORS.CYAN, 1);
    run.fillRect(14, 14, 22, 8);
    run.fillStyle(COLORS.CYAN, 0.6);
    run.fillCircle(24, 34, 5);
    run.fillStyle(0x1a2332, 1);
    run.fillRect(2, 18, 6, 24);
    run.fillRect(40, 22, 6, 24);
    run.fillRect(10, 50, 8, 14);
    run.fillRect(30, 48, 8, 14);
    run.lineStyle(1, COLORS.CYAN, 0.3);
    run.strokeRoundedRect(8, 10, 32, 40, 4);
    run.generateTexture('player_run', 48, 64);
    run.destroy();

    // Shoot frame
    const shoot = this.make.graphics({ add: false });
    shoot.fillStyle(0x111827, 1);
    shoot.fillRoundedRect(8, 12, 32, 40, 4);
    shoot.fillStyle(COLORS.CYAN, 1);
    shoot.fillRect(14, 16, 22, 8);
    shoot.fillStyle(COLORS.CYAN, 0.8);
    shoot.fillCircle(24, 36, 6);
    // Extended arm
    shoot.fillStyle(0x1a2332, 1);
    shoot.fillRect(38, 20, 14, 6);
    shoot.fillRect(4, 22, 6, 22);
    // Muzzle flash
    shoot.fillStyle(COLORS.CYAN, 0.9);
    shoot.fillCircle(52, 23, 4);
    shoot.fillStyle(0x1a2332, 1);
    shoot.fillRect(12, 52, 8, 12);
    shoot.fillRect(28, 52, 8, 12);
    shoot.generateTexture('player_shoot', 56, 64);
    shoot.destroy();
  }

  _genEnemySprites() {
    // Grunt — red diamond shape
    const grunt = this.make.graphics({ add: false });
    grunt.fillStyle(0x330000, 1);
    grunt.fillRect(8, 8, 32, 32);
    grunt.fillStyle(COLORS.RED_WARN, 1);
    grunt.fillTriangle(24, 4, 4, 24, 44, 24);
    grunt.fillTriangle(24, 44, 4, 24, 44, 24);
    // Eye
    grunt.fillStyle(0xff8888, 1);
    grunt.fillCircle(24, 22, 5);
    grunt.fillStyle(0xffffff, 1);
    grunt.fillCircle(24, 22, 2);
    grunt.lineStyle(1, COLORS.RED_WARN, 0.5);
    grunt.strokeCircle(24, 24, 20);
    grunt.generateTexture('enemy_grunt', 48, 48);
    grunt.destroy();

    // Fast enemy — thin triangle
    const fast = this.make.graphics({ add: false });
    fast.fillStyle(0xff6600, 1);
    fast.fillTriangle(24, 2, 4, 44, 44, 44);
    fast.fillStyle(0xffaa00, 0.8);
    fast.fillCircle(24, 28, 6);
    fast.fillStyle(0xffffff, 1);
    fast.fillCircle(24, 28, 2);
    fast.lineStyle(1, 0xff8800, 0.5);
    fast.strokeTriangle(24, 2, 4, 44, 44, 44);
    fast.generateTexture('enemy_fast', 48, 48);
    fast.destroy();

    // Heavy enemy — large hexagon
    const heavy = this.make.graphics({ add: false });
    heavy.fillStyle(0x440022, 1);
    const hx = [32, 56, 56, 32, 8, 8];
    const hy = [4, 18, 46, 60, 46, 18];
    heavy.beginPath();
    heavy.moveTo(hx[0], hy[0]);
    for (let i = 1; i < 6; i++) heavy.lineTo(hx[i], hy[i]);
    heavy.closePath();
    heavy.fillPath();
    heavy.fillStyle(COLORS.RED_WARN, 0.8);
    heavy.fillCircle(32, 32, 10);
    heavy.fillStyle(0xff0000, 1);
    heavy.fillCircle(32, 32, 4);
    heavy.lineStyle(2, COLORS.RED_WARN, 0.4);
    heavy.strokeCircle(32, 32, 16);
    heavy.generateTexture('enemy_heavy', 64, 64);
    heavy.destroy();

    // Mid-boss — large octagon
    const mboss = this.make.graphics({ add: false });
    mboss.fillStyle(0x1a0020, 1);
    mboss.fillRoundedRect(8, 8, 80, 80, 12);
    mboss.fillStyle(0x8800aa, 0.8);
    mboss.fillRoundedRect(16, 16, 64, 64, 8);
    mboss.fillStyle(COLORS.RED_WARN, 1);
    mboss.fillCircle(48, 48, 16);
    mboss.fillStyle(0xff0000, 1);
    mboss.fillCircle(48, 48, 8);
    mboss.fillStyle(0xffffff, 0.8);
    mboss.fillCircle(48, 48, 3);
    mboss.lineStyle(2, 0xff00ff, 0.5);
    mboss.strokeRoundedRect(8, 8, 80, 80, 12);
    mboss.generateTexture('enemy_midboss', 96, 96);
    mboss.destroy();
  }

  _genBulletSprites() {
    // Player bullet — cyan diamond
    const pb = this.make.graphics({ add: false });
    pb.fillStyle(COLORS.CYAN, 1);
    pb.fillRect(4, 2, 8, 4);
    pb.fillStyle(0xffffff, 0.9);
    pb.fillRect(6, 3, 4, 2);
    // Glow
    pb.fillStyle(COLORS.CYAN, 0.3);
    pb.fillCircle(8, 4, 6);
    pb.generateTexture('bullet_player', 16, 8);
    pb.destroy();

    // Enemy bullet — red/magenta circle
    const eb = this.make.graphics({ add: false });
    eb.fillStyle(0xff2266, 0.4);
    eb.fillCircle(8, 8, 8);
    eb.fillStyle(COLORS.RED_WARN, 1);
    eb.fillCircle(8, 8, 5);
    eb.fillStyle(0xff8888, 1);
    eb.fillCircle(8, 8, 2);
    eb.generateTexture('bullet_enemy', 16, 16);
    eb.destroy();
  }

  _genBackgroundTiles() {
    // Far city silhouette
    const far = this.make.graphics({ add: false });
    far.fillStyle(0x0a0e18, 1);
    far.fillRect(0, 0, 512, 512);
    // Buildings silhouette
    for (let i = 0; i < 20; i++) {
      const bx = i * 28 + Phaser.Math.Between(-5, 5);
      const bh = Phaser.Math.Between(80, 300);
      const bw = Phaser.Math.Between(16, 36);
      far.fillStyle(0x0d1220, 1);
      far.fillRect(bx, 512 - bh, bw, bh);
      // Random windows
      for (let wy = 512 - bh + 10; wy < 512; wy += 20) {
        for (let wx = bx + 4; wx < bx + bw - 4; wx += 8) {
          if (Math.random() > 0.6) {
            const wColor = Math.random() > 0.8 ? 0x00D1FF : 0x1a2040;
            far.fillStyle(wColor, Math.random() * 0.5 + 0.2);
            far.fillRect(wx, wy, 4, 6);
          }
        }
      }
    }
    far.generateTexture('bg_far', 512, 512);
    far.destroy();

    // Mid layer — closer buildings with more detail
    const mid = this.make.graphics({ add: false });
    mid.fillStyle(0x00000000, 0);
    mid.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 12; i++) {
      const bx = i * 44 + Phaser.Math.Between(-8, 8);
      const bh = Phaser.Math.Between(120, 380);
      const bw = Phaser.Math.Between(24, 48);
      mid.fillStyle(0x111827, 1);
      mid.fillRect(bx, 512 - bh, bw, bh);
      // Neon accent
      mid.fillStyle(Math.random() > 0.5 ? 0x00D1FF : 0xFF3B3B, 0.15);
      mid.fillRect(bx, 512 - bh, bw, 3);
      // Windows
      for (let wy = 512 - bh + 8; wy < 508; wy += 16) {
        for (let wx = bx + 3; wx < bx + bw - 3; wx += 10) {
          if (Math.random() > 0.5) {
            const wColor = Math.random() > 0.7 ? 0x00D1FF : (Math.random() > 0.9 ? 0xFF3B3B : 0x1a2844);
            mid.fillStyle(wColor, Math.random() * 0.6 + 0.2);
            mid.fillRect(wx, wy, 5, 7);
          }
        }
      }
    }
    mid.generateTexture('bg_mid', 512, 512);
    mid.destroy();

    // Ground
    const ground = this.make.graphics({ add: false });
    ground.fillStyle(0x0f1520, 1);
    ground.fillRect(0, 0, 128, 32);
    ground.lineStyle(1, COLORS.CYAN, 0.15);
    ground.lineBetween(0, 0, 128, 0);
    // Debris marks
    for (let i = 0; i < 8; i++) {
      ground.fillStyle(0x182030, 1);
      ground.fillRect(Phaser.Math.Between(0, 120), Phaser.Math.Between(4, 28), Phaser.Math.Between(4, 12), 2);
    }
    ground.generateTexture('ground_tile', 128, 32);
    ground.destroy();

    // Rain particle
    const rain = this.make.graphics({ add: false });
    rain.fillStyle(0x5588cc, 0.4);
    rain.fillRect(0, 0, 1, 12);
    rain.generateTexture('rain', 1, 12);
    rain.destroy();
  }

  _genUISprites() {
    // Dialogue box background
    const dlgBg = this.make.graphics({ add: false });
    dlgBg.fillStyle(0x0B0F1A, 0.92);
    dlgBg.fillRoundedRect(0, 0, 800, 200, 8);
    dlgBg.lineStyle(2, COLORS.CYAN, 0.6);
    dlgBg.strokeRoundedRect(0, 0, 800, 200, 8);
    dlgBg.generateTexture('dialogue_bg', 800, 200);
    dlgBg.destroy();

    // Button
    const btn = this.make.graphics({ add: false });
    btn.fillStyle(0x111827, 0.9);
    btn.fillRoundedRect(0, 0, 200, 48, 6);
    btn.lineStyle(1, COLORS.CYAN, 0.5);
    btn.strokeRoundedRect(0, 0, 200, 48, 6);
    btn.generateTexture('btn_default', 200, 48);
    btn.destroy();
  }
}
