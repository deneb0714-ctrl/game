/**
 * RE:UNIT — Battle Scene
 * Main combat arena with enemies, bullets, and parallax scrolling.
 */
import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS, DEPTH, PLAYER, ENEMY, PATTERNS } from '../data/constants.js';
import { Player } from '../entities/Player.js';
import { Enemy } from '../entities/Enemy.js';
import { createBulletPool } from '../entities/Bullet.js';
import { HUD } from '../ui/HUD.js';
import gameState from '../game.js';

export class BattleScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BattleScene' });
  }

  create() {
    this.cameras.main.setBackgroundColor(COLORS.BG_DARK);
    gameState.playerHP = gameState.playerMaxHP;

    // ── Background ──
    this._createBackground();

    // ── Ground ──
    this._createGround();

    // ── Rain ──
    this._createRain();

    // ── Bullet pools ──
    this._playerBullets = createBulletPool(this, 80, 'bullet_player');
    this._enemyBullets = createBulletPool(this, 300, 'bullet_enemy');

    // ── Player ──
    this._player = new Player(this, PLAYER.START_X, PLAYER.START_Y);
    this._setupPlayerAnims();

    // ── Input ──
    this._cursors = this.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
      w: Phaser.Input.Keyboard.KeyCodes.W,
      a: Phaser.Input.Keyboard.KeyCodes.A,
      s: Phaser.Input.Keyboard.KeyCodes.S,
      d: Phaser.Input.Keyboard.KeyCodes.D,
      space: Phaser.Input.Keyboard.KeyCodes.SPACE,
    });

    // ── Enemies ──
    this._enemies = this.physics.add.group();
    this._spawnWaveTimer = 0;
    this._waveNumber = 0;
    this._spawnInitialWave();

    // ── Collisions ──
    this._setupCollisions();

    // ── Pickups ──
    this._setupPickups();

    // ── HUD ──
    this._hud = new HUD(this);

    // ── Events ──
    this.events.on('enemy-killed', (enemy) => this._onEnemyKilled(enemy));
    this.events.on('ultimate-kill', () => this._onUltimateKill());
    this.events.on('ultimate-spare', () => this._onUltimateSpare());

    // Ultimate input (Space)
    this.input.keyboard.on('keydown-SPACE', () => {
      if (this._player && !this._player.isDead) {
        this._player.fireUltimate();
      }
    });

    // ── Particle Emitters (Global) ──
    this._createEmitters();

    // ── Scanlines ──
    const scanlines = this.add.graphics();
    scanlines.setDepth(DEPTH.OVERLAY).setAlpha(0.3).setScrollFactor(0);
    for (let y = 0; y < GAME_HEIGHT; y += 3) {
      scanlines.fillStyle(0x000000, 0.05);
      scanlines.fillRect(0, y, GAME_WIDTH, 1);
    }

    // Stage label
    this._showStageLabel();
  }

  update(time, delta) {
    if (this._player && !this._player.isDead) {
      this._player.handleUpdate(time, delta, this._cursors, this.input.activePointer, this._playerBullets);
    }

    // Scroll backgrounds
    if (this._bgFar) this._bgFar.tilePositionX += 0.3;
    if (this._bgMid) this._bgMid.tilePositionX += 0.7;
    if (this._groundTile) this._groundTile.tilePositionX += 1.0;

    // Spawn waves
    this._spawnWaveTimer += delta;
    if (this._spawnWaveTimer > 8000) {
      this._spawnWaveTimer = 0;
      this._waveNumber++;
      this._spawnWave();
    }

    // Update HUD
    this._hud.update();

    // Charge ultimate on kills
    // (handled via event)
  }

  _createBackground() {
    this._bgFar = this.add.tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, 'bg_far');
    this._bgFar.setOrigin(0, 0).setDepth(DEPTH.BG_FAR).setTint(0x556688).setAlpha(0.5).setScrollFactor(0);

    this._bgMid = this.add.tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, 'bg_mid');
    this._bgMid.setOrigin(0, 0).setDepth(DEPTH.BG_MID).setAlpha(0.6).setScrollFactor(0);
  }

  _createGround() {
    const groundY = GAME_HEIGHT - 60;
    this._groundTile = this.add.tileSprite(0, groundY, GAME_WIDTH, 32, 'ground_tile');
    this._groundTile.setOrigin(0, 0).setDepth(DEPTH.GROUND).setScrollFactor(0);

    // Ground line glow
    const glow = this.add.rectangle(GAME_WIDTH / 2, groundY, GAME_WIDTH, 2, COLORS.CYAN, 0.2);
    glow.setDepth(DEPTH.GROUND + 1).setScrollFactor(0);

    // Set world bounds
    this.physics.world.setBounds(0, 0, GAME_WIDTH, groundY + 20);
  }

  _createEmitters() {
    // Shared hit emitter
    this._hitEmitter = this.add.particles(0, 0, 'particle', {
      speed: { min: 30, max: 150 },
      scale: { start: 0.8, end: 0 },
      lifespan: 400,
      alpha: { start: 1, end: 0 },
      emitting: false,
    });
    this._hitEmitter.setDepth(DEPTH.EFFECTS);

    // Shared death emitter
    this._deathEmitter = this.add.particles(0, 0, 'particle', {
      speed: { min: 50, max: 250 },
      angle: { min: 0, max: 360 },
      scale: { start: 1.5, end: 0 },
      lifespan: 800,
      alpha: { start: 1, end: 0 },
      emitting: false,
    });
    this._deathEmitter.setDepth(DEPTH.EFFECTS + 1);
  }

  _createRain() {
    this.add.particles(0, -50, 'rain', {
      x: { min: 0, max: GAME_WIDTH }, y: -20,
      quantity: 2, frequency: 40,
      lifespan: 1600,
      speedY: { min: 350, max: 600 },
      speedX: { min: -20, max: -60 },
      scale: { min: 0.3, max: 1.0 },
      alpha: { start: 0.3, end: 0.05 },
    }).setDepth(DEPTH.BG_NEAR + 1);
  }

  _setupPlayerAnims() {
    // Simple static "animations" using single-frame textures
    if (!this.anims.exists('player_idle')) {
      this.anims.create({ key: 'player_idle', frames: [{ key: 'player_idle' }], frameRate: 1 });
    }
    if (!this.anims.exists('player_run')) {
      this.anims.create({ key: 'player_run', frames: [{ key: 'player_run' }], frameRate: 1 });
    }
    if (!this.anims.exists('player_shoot')) {
      this.anims.create({ key: 'player_shoot', frames: [{ key: 'player_shoot' }], frameRate: 8, repeat: 0 });
    }
    this._player.play('player_idle');
  }

  _setupCollisions() {
    // Player bullets hit enemies
    this.physics.add.overlap(this._playerBullets, this._enemies, (bullet, enemy) => {
      if (!bullet.active || !enemy.active || enemy.isDying) return;

      // Disable immediately
      bullet.setActive(false);
      bullet.setVisible(false);
      if (bullet.body) bullet.body.enable = false;

      // Then damage
      enemy.takeDamage(bullet.damage);
    }, null, this);

    // Enemy bullets hit player
    // processCallback (4th arg) runs BEFORE the overlap callback;
    // returning false skips the pair entirely — this prevents
    // multiple bullets in the same physics step from all dealing damage.
    this.physics.add.overlap(
      this._enemyBullets,
      this._player,
      // --- overlap callback (only runs if processCallback returned true) ---
      (bullet) => {
        // Deactivate the bullet
        bullet.setActive(false);
        bullet.setVisible(false);
        if (bullet.body) bullet.body.enable = false;

        // Deal damage
        this._player.takeDamage(5);
        if (this._hud) this._hud.flashDamage();
      },
      // --- processCallback (gate) ---
      (bullet) => {
        // Reject the collision entirely if the player is invincible/dead
        if (!bullet.active) return false;
        if (this._player.isDead || this._player.isInvincible) return false;
        return true;
      },
      this
    );
  }

  _setupPickups() {
    this._pickups = this.physics.add.group();
    
    // Check collection via physics overlap
    this.physics.add.overlap(this._player, this._pickups, (player, pickup) => {
      if (!pickup.active) return;
      pickup.setActive(false);
      gameState.addUltimateCharge(15);
      
      this.tweens.add({
        targets: pickup, scaleX: 2, scaleY: 2, alpha: 0,
        duration: 200, onComplete: () => pickup.destroy(),
      });
    }, null, this);
  }

  _spawnInitialWave() {
    this._spawnEnemy(1400, 300, 'grunt', PATTERNS.AIMED);
    this._spawnEnemy(1600, 500, 'grunt', PATTERNS.RADIAL);
    this._spawnEnemy(1500, 200, 'fast', PATTERNS.AIMED);
  }

  _spawnWave() {
    const w = this._waveNumber;
    const count = Math.min(3 + w, 8);

    for (let i = 0; i < count; i++) {
      const x = Phaser.Math.Between(1200, 1800);
      const y = Phaser.Math.Between(100, GAME_HEIGHT - 150);
      const types = ['grunt', 'grunt', 'fast', 'heavy'];
      const type = types[Phaser.Math.Between(0, Math.min(w, types.length - 1))];
      const patterns = [PATTERNS.AIMED, PATTERNS.RADIAL, PATTERNS.WAVE, PATTERNS.SCATTER];
      const pattern = patterns[Phaser.Math.Between(0, Math.min(w, patterns.length - 1))];

      this.time.delayedCall(i * 400, () => {
        this._spawnEnemy(x, y, type, pattern);
      });
    }

    // Mid-boss every 3 waves
    if (w > 0 && w % 3 === 0) {
      this.time.delayedCall(count * 400 + 500, () => {
        this._spawnEnemy(1600, GAME_HEIGHT / 2, 'midboss', PATTERNS.SPIRAL);
      });
    }
  }

  _spawnEnemy(x, y, type, pattern) {
    const configs = {
      grunt: {
        texture: 'enemy_grunt', ...ENEMY.GRUNT,
        pattern, patrolRange: 200,
      },
      fast: {
        texture: 'enemy_fast', ...ENEMY.GRUNT_FAST,
        pattern, patrolRange: 300,
      },
      heavy: {
        texture: 'enemy_heavy', ...ENEMY.GRUNT_HEAVY,
        pattern, patrolRange: 120,
      },
      midboss: {
        texture: 'enemy_midboss', ...ENEMY.MIDBOSS,
        pattern, patrolRange: 250, isBoss: true,
      },
    };

    const config = configs[type] || configs.grunt;
    const enemy = new Enemy(this, x, y, config);
    this._enemies.add(enemy);

    // Spawn effect
    enemy.setAlpha(0);
    enemy.setScale(0.3);
    this.tweens.add({
      targets: enemy,
      alpha: 1, scaleX: 1, scaleY: 1,
      duration: 400, ease: 'Back.easeOut',
    });
  }

  _onEnemyKilled(enemy) {
    gameState.recordKill();
    gameState.score += enemy.scoreValue || 100;
    gameState.addUltimateCharge(8);

    // Pickup drop
    if (Math.random() > 0.5) {
      this._spawnPickup(enemy.x, enemy.y);
    }
  }

  _spawnPickup(x, y) {
    const pickup = this.add.circle(x, y, 8, COLORS.CYAN, 0.8);
    this.physics.add.existing(pickup);
    pickup.body.setAllowGravity(false);
    this._pickups.add(pickup);
    pickup.setDepth(DEPTH.EFFECTS);

    // Glow pulse
    this.tweens.add({
      targets: pickup,
      scaleX: 1.3, scaleY: 1.3, alpha: 0.5,
      duration: 600, yoyo: true, repeat: -1,
    });

    // Float upward slightly
    this.tweens.add({
      targets: pickup, y: y - 20, duration: 1000, ease: 'Sine.easeInOut',
      yoyo: true, repeat: -1,
    });

    // Auto-destroy after 10s
    this.time.delayedCall(10000, () => { if (pickup && pickup.active) pickup.destroy(); });
  }

  _onUltimateKill() {
    // Damage all active enemies
    this._enemies.getChildren().forEach((enemy) => {
      if (enemy.active && !enemy.isDying) {
        enemy.takeDamage(200);
      }
    });
    // Clear enemy bullets
    this._enemyBullets.getChildren().forEach((b) => { if (b.active) b.kill(); });
  }

  _onUltimateSpare() {
    // Stun all enemies
    this._enemies.getChildren().forEach((enemy) => {
      if (enemy.active && !enemy.isDying) {
        enemy.stun(3000);
      }
    });
    // Clear all enemy bullets
    this._enemyBullets.getChildren().forEach((b) => { if (b.active) b.kill(); });
  }

  _onPlayerDeath() {
    // 1. Dark overlay (NOT camera fade — camera fade hides everything including UI)
    const overlay = this.add.rectangle(
      GAME_WIDTH / 2, GAME_HEIGHT / 2,
      GAME_WIDTH, GAME_HEIGHT,
      0x000000, 0
    ).setDepth(DEPTH.OVERLAY + 5).setScrollFactor(0);

    this.tweens.add({
      targets: overlay,
      alpha: 0.85,
      duration: 1500,
    });

    // 2. "SIGNAL LOST" text
    const deathText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 80, 'SIGNAL LOST', {
      fontFamily: 'Orbitron', fontSize: '72px', color: COLORS.RED_HEX,
    }).setOrigin(0.5).setDepth(DEPTH.OVERLAY + 15).setScrollFactor(0).setAlpha(0);

    this.tweens.add({
      targets: deathText,
      alpha: 1,
      duration: 800,
    });

    // 3. Stats
    const stats = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, `SCORE: ${gameState.score}  |  KILLS: ${gameState.killCount}`, {
      fontFamily: 'Orbitron', fontSize: '18px', color: COLORS.CYAN_HEX,
    }).setOrigin(0.5).setDepth(DEPTH.OVERLAY + 15).setScrollFactor(0).setAlpha(0);

    this.tweens.add({ targets: stats, alpha: 1, duration: 800, delay: 600 });

    // 4. Retry button (appears after 1s)
    this.time.delayedCall(1000, () => {
      // Button background
      const btnBg = this.add.rectangle(
        GAME_WIDTH / 2, GAME_HEIGHT / 2 + 80,
        400, 60, 0x000000, 0.9
      ).setStrokeStyle(2, COLORS.CYAN)
       .setDepth(DEPTH.OVERLAY + 20)
       .setScrollFactor(0)
       .setInteractive({ useHandCursor: true });

      // Button label
      const btnLabel = this.add.text(
        GAME_WIDTH / 2, GAME_HEIGHT / 2 + 80,
        '[ REBOOT SYSTEM ]', {
          fontFamily: 'Orbitron', fontSize: '22px', color: COLORS.CYAN_HEX,
        }
      ).setOrigin(0.5).setDepth(DEPTH.OVERLAY + 21).setScrollFactor(0);

      // Hover
      btnBg.on('pointerover', () => {
        btnBg.setFillStyle(COLORS.CYAN, 0.3);
        btnLabel.setColor('#FFFFFF');
      });
      btnBg.on('pointerout', () => {
        btnBg.setFillStyle(0x000000, 0.9);
        btnLabel.setColor(COLORS.CYAN_HEX);
      });

      // Click -> restart
      btnBg.on('pointerdown', () => {
        gameState.playerHP = gameState.playerMaxHP;
        gameState.ultimateCharge = 0;
        this.scene.restart();
      });

      // Fade in
      btnBg.setAlpha(0);
      btnLabel.setAlpha(0);
      this.tweens.add({ targets: [btnBg, btnLabel], alpha: 1, duration: 500 });
    });
  }

  _showStageLabel() {
    const label = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'STAGE 1\n崩壊高速道路', {
      fontFamily: 'Orbitron', fontSize: '36px', color: COLORS.CYAN_HEX, align: 'center',
      shadow: { offsetX: 0, offsetY: 0, color: COLORS.CYAN_HEX, blur: 20, fill: true },
    }).setOrigin(0.5).setDepth(DEPTH.OVERLAY).setScrollFactor(0).setAlpha(0);

    this.tweens.add({
      targets: label, alpha: 1, duration: 600, hold: 1500,
      yoyo: true, onComplete: () => label.destroy(),
    });
  }
}
