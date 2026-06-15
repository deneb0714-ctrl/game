/**
 * RE:UNIT — Enemy Entity
 * Configurable enemy with AI states and bullet patterns.
 */
import Phaser from 'phaser';
import { ENEMY, COLORS, DEPTH, PATTERNS } from '../data/constants.js';

export class Enemy extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, config) {
    super(scene, x, y, config.texture || 'enemy_grunt');
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setDepth(DEPTH.ENTITIES);

    // Config
    this.config = config;
    this.hp = config.hp || ENEMY.GRUNT.HP;
    this.maxHP = this.hp;
    this.moveSpeed = config.speed || ENEMY.GRUNT.SPEED;
    this.fireRate = config.fireRate || ENEMY.GRUNT.FIRE_RATE;
    this.bulletSpeed = config.bulletSpeed || ENEMY.GRUNT.BULLET_SPEED;
    this.bulletPattern = config.pattern || PATTERNS.AIMED;
    this.scoreValue = config.score || ENEMY.GRUNT.SCORE;
    this.canBeSpared = config.canBeSpared !== false;
    this.isBoss = config.isBoss || false;

    // State
    this.fireTimer = Phaser.Math.Between(0, this.fireRate);
    this.aiState = 'patrol'; // 'patrol', 'chase', 'attack', 'retreat', 'stunned'
    this.stunTimer = 0;
    this.isDying = false;
    this.patrolDir = 1;
    this._spawnX = x;
    this._spawnY = y;
    this._aiTimer = 0;
    this._patrolRange = config.patrolRange || 200;

    // Body
    this.body.setSize(this.width * 0.7, this.height * 0.8);
    this.body.setAllowGravity(false);

    // HP bar
    this._hpBarBg = scene.add.rectangle(x, y - 40, 50, 6, 0x333333);
    this._hpBarFg = scene.add.rectangle(x, y - 40, 50, 6, COLORS.RED_WARN);
    this._hpBarBg.setDepth(DEPTH.UI);
    this._hpBarFg.setDepth(DEPTH.UI);
    this._hpBarBg.setOrigin(0.5, 0.5);
    this._hpBarFg.setOrigin(0, 0.5);
    this._hpBarFg.x = x - 25;
  }

  preUpdate(time, delta) {
    super.preUpdate(time, delta);
    if (!this.active || this.isDying) return;

    // Stun
    if (this.stunTimer > 0) {
      this.stunTimer -= delta;
      this.setVelocity(0, 0);
      this.setTint(0x88CCFF);
      this._updateHPBar();
      return;
    }
    this.clearTint();

    this._updateAI(time, delta);
    this._updateHPBar();
  }

  _updateAI(time, delta) {
    this._aiTimer += delta;

    switch (this.aiState) {
      case 'patrol':
        this._doPatrol(delta);
        // Switch to attack periodically
        if (this._aiTimer > 2000) {
          this.aiState = 'attack';
          this._aiTimer = 0;
        }
        break;

      case 'attack':
        this.fireTimer -= delta;
        if (this.fireTimer <= 0) {
          this.fireTimer = this.fireRate;
          this._firePattern();
        }
        // Slow drift
        this.setVelocityX(Math.sin(time / 1000) * this.moveSpeed * 0.3);
        if (this._aiTimer > 3000) {
          this.aiState = 'patrol';
          this._aiTimer = 0;
        }
        break;

      case 'chase': {
        const player = this.scene._player;
        if (player && !player.isDead) {
          const angle = Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y);
          this.setVelocity(
            Math.cos(angle) * this.moveSpeed,
            Math.sin(angle) * this.moveSpeed
          );
        }
        this.fireTimer -= delta;
        if (this.fireTimer <= 0) {
          this.fireTimer = this.fireRate;
          this._firePattern();
        }
        if (this._aiTimer > 4000) {
          this.aiState = 'retreat';
          this._aiTimer = 0;
        }
        break;
      }

      case 'retreat': {
        // Move away from player
        const player = this.scene._player;
        if (player) {
          const angle = Phaser.Math.Angle.Between(player.x, player.y, this.x, this.y);
          this.setVelocity(
            Math.cos(angle) * this.moveSpeed * 0.6,
            Math.sin(angle) * this.moveSpeed * 0.6
          );
        }
        if (this._aiTimer > 1500) {
          this.aiState = 'patrol';
          this._aiTimer = 0;
        }
        break;
      }
    }
  }

  _doPatrol(delta) {
    this.setVelocityX(this.patrolDir * this.moveSpeed * 0.5);
    this.setVelocityY(Math.sin(this._aiTimer / 500) * 30);

    if (this.x > this._spawnX + this._patrolRange) this.patrolDir = -1;
    if (this.x < this._spawnX - this._patrolRange) this.patrolDir = 1;
  }

  _firePattern() {
    const pool = this.scene._enemyBullets;
    if (!pool) return;

    const player = this.scene._player;
    if (!player || player.isDead) return;

    switch (this.bulletPattern) {
      case PATTERNS.AIMED:
        this._fireAimed(pool, player);
        break;
      case PATTERNS.RADIAL:
        this._fireRadial(pool);
        break;
      case PATTERNS.WAVE:
        this._fireWave(pool, player);
        break;
      case PATTERNS.SCATTER:
        this._fireScatter(pool);
        break;
      case PATTERNS.SPIRAL:
        this._fireSpiral(pool);
        break;
      default:
        this._fireAimed(pool, player);
    }
  }

  _fireAimed(pool, player) {
    const bullet = pool.getFirstDead(false);
    if (!bullet) return;
    const angle = Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y);
    bullet.fire(
      this.x, this.y,
      Math.cos(angle) * this.bulletSpeed,
      Math.sin(angle) * this.bulletSpeed,
      15, 'bullet_enemy', 'linear'
    );
  }

  _fireRadial(pool) {
    const count = this.isBoss ? 16 : 8;
    for (let i = 0; i < count; i++) {
      const bullet = pool.getFirstDead(false);
      if (!bullet) continue;
      const angle = (Math.PI * 2 / count) * i;
      bullet.fire(
        this.x, this.y,
        Math.cos(angle) * this.bulletSpeed,
        Math.sin(angle) * this.bulletSpeed,
        10, 'bullet_enemy', 'linear'
      );
    }
  }

  _fireWave(pool, player) {
    for (let i = -1; i <= 1; i++) {
      const bullet = pool.getFirstDead(false);
      if (!bullet) continue;
      const angle = Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y) + (i * 0.2);
      bullet.fire(
        this.x, this.y,
        Math.cos(angle) * this.bulletSpeed,
        Math.sin(angle) * this.bulletSpeed,
        10, 'bullet_enemy', 'wave',
        { amplitude: 60 + Math.abs(i) * 40, frequency: 0.004 }
      );
    }
  }

  _fireScatter(pool) {
    const count = 5;
    for (let i = 0; i < count; i++) {
      const bullet = pool.getFirstDead(false);
      if (!bullet) continue;
      const angle = Phaser.Math.RND.angle();
      const speed = Phaser.Math.Between(this.bulletSpeed * 0.6, this.bulletSpeed);
      bullet.fire(
        this.x, this.y,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        8, 'bullet_enemy', 'linear'
      );
    }
  }

  _fireSpiral(pool) {
    const baseAngle = (Date.now() / 200) % (Math.PI * 2);
    for (let i = 0; i < 3; i++) {
      const bullet = pool.getFirstDead(false);
      if (!bullet) continue;
      const angle = baseAngle + (Math.PI * 2 / 3) * i;
      bullet.fire(
        this.x, this.y,
        Math.cos(angle) * this.bulletSpeed * 0.8,
        Math.sin(angle) * this.bulletSpeed * 0.8,
        12, 'bullet_enemy', 'spiral',
        { startAngle: angle, angularSpeed: 2, radius: 1.5 }
      );
    }
  }

  _updateHPBar() {
    this._hpBarBg.setPosition(this.x, this.y - 40);
    this._hpBarFg.setPosition(this.x - 25, this.y - 40);
    const ratio = Math.max(0, this.hp / this.maxHP);
    this._hpBarFg.setScale(ratio, 1);

    // Color shift based on HP
    if (ratio < 0.3) {
      this._hpBarFg.setFillStyle(COLORS.RED_WARN);
    } else if (ratio < 0.6) {
      this._hpBarFg.setFillStyle(0xFFAA00);
    }
  }

  /**
   * Take damage
   */
  takeDamage(amount) {
    if (this.isDying) return;

    this.hp -= amount;
    this.setTintFill(0xffffff);
    this.scene.time.delayedCall(60, () => {
      if (!this.isDying) this.clearTint();
    });

    // Hit particles (using global emitter)
    if (this.scene._hitEmitter) {
      this.scene._hitEmitter.emitParticleAt(this.x, this.y, 4);
    }

    if (this.hp <= 0) {
      this.hp = 0;
      this._startDeath();
    } else {
      // Aggro on hit
      if (this.aiState === 'patrol') {
        this.aiState = 'chase';
        this._aiTimer = 0;
      }
    }
  }

  /**
   * Stun this enemy
   */
  stun(duration) {
    this.stunTimer = duration;
    this.aiState = 'patrol';
    this._aiTimer = 0;
  }

  _startDeath() {
    this.isDying = true;
    this.setVelocity(0, 0);
    if (this.body) {
      this.body.enable = false;
    }

    // Death explosion (using global emitter)
    if (this.scene._deathEmitter) {
      this.scene._deathEmitter.emitParticleAt(this.x, this.y, 15);
    }

    // Flash and fade
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      scaleX: 1.3,
      scaleY: 1.3,
      duration: 300,
      onComplete: () => {
        this._hpBarBg.destroy();
        this._hpBarFg.destroy();
        this.destroy();
      },
    });

    // Emit event for morality/scoring
    this.scene.events.emit('enemy-killed', this);
  }

  destroy(fromScene) {
    if (this._hpBarBg) this._hpBarBg.destroy();
    if (this._hpBarFg) this._hpBarFg.destroy();
    super.destroy(fromScene);
  }
}
