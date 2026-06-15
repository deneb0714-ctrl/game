/**
 * RE:UNIT — Player Entity
 * Handles movement, shooting, damage, and ultimate.
 */
import Phaser from 'phaser';
import { PLAYER, COLORS, DEPTH, COMBAT } from '../data/constants.js';
import gameState from '../game.js';

export class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'player_idle');
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setDepth(DEPTH.PLAYER);
    this.setCollideWorldBounds(true);
    this.body.setSize(PLAYER.WIDTH * 0.6, PLAYER.HEIGHT * 0.85);
    this.body.setOffset(PLAYER.WIDTH * 0.2, PLAYER.HEIGHT * 0.1);

    // State
    this.hp = gameState.playerHP;
    this.maxHP = gameState.playerMaxHP;
    this.isInvincible = false;
    this.isDead = false;
    this.fireTimer = 0;
    this.facing = 1; // 1 = right, -1 = left

    // Trail effect
    this._trailTimer = 0;
  }

  /**
   * Update player each frame
   */
  handleUpdate(time, delta, cursors, pointer, bulletPool) {
    if (this.isDead) return;

    this._handleMovement(cursors, delta);
    this._handleShooting(pointer, bulletPool, delta);
    this._updateTrail(delta);
  }

  _handleMovement(cursors, delta) {
    let vx = 0;
    let vy = 0;

    if (cursors.left.isDown || cursors.a?.isDown) {
      vx = -PLAYER.SPEED;
      this.facing = -1;
    }
    if (cursors.right.isDown || cursors.d?.isDown) {
      vx = PLAYER.SPEED;
      this.facing = 1;
    }
    if (cursors.up.isDown || cursors.w?.isDown) {
      vy = -PLAYER.SPEED;
    }
    if (cursors.down.isDown || cursors.s?.isDown) {
      vy = PLAYER.SPEED;
    }

    // Normalize diagonal movement
    if (vx !== 0 && vy !== 0) {
      const factor = 0.7071; // 1/sqrt(2)
      vx *= factor;
      vy *= factor;
    }

    this.setVelocity(vx, vy);
    this.setFlipX(this.facing === -1);

    // Animation state
    if (vx !== 0 || vy !== 0) {
      if (this.anims.currentAnim?.key !== 'player_run') {
        this.play('player_run', true);
      }
    } else {
      if (this.anims.currentAnim?.key !== 'player_idle') {
        this.play('player_idle', true);
      }
    }
  }

  _handleShooting(pointer, bulletPool, delta) {
    this.fireTimer -= delta;

    if (pointer.isDown && this.fireTimer <= 0) {
      this.fireTimer = PLAYER.FIRE_RATE;
      this._shoot(pointer, bulletPool);
    }
  }

  _shoot(pointer, bulletPool) {
    if (this.isDead || !this.active) return; // STRICT CHECK

    const bullet = bulletPool.getFirstDead(false);
    if (!bullet) return;

    // Calculate direction toward pointer (in world coords)
    const worldPoint = this.scene.cameras.main.getWorldPoint(pointer.x, pointer.y);
    const angle = Phaser.Math.Angle.Between(this.x, this.y, worldPoint.x, worldPoint.y);
    const velX = Math.cos(angle) * PLAYER.BULLET_SPEED;
    const velY = Math.sin(angle) * PLAYER.BULLET_SPEED;

    bullet.fire(
      this.x + this.facing * 24,
      this.y - 4,
      velX,
      velY,
      PLAYER.BULLET_DAMAGE,
      'bullet_player',
      'linear'
    );

    // Muzzle flash
    this._createMuzzleFlash();

    // Play shoot animation briefly
    if (this.anims.exists('player_shoot')) {
      this.play('player_shoot', true);
      this.once('animationcomplete-player_shoot', () => {
        this.play('player_idle', true);
      });
    }
  }

  _createMuzzleFlash() {
    const flash = this.scene.add.circle(
      this.x + this.facing * 32,
      this.y - 4,
      12,
      COLORS.CYAN,
      0.8
    );
    flash.setDepth(DEPTH.EFFECTS);
    this.scene.tweens.add({
      targets: flash,
      alpha: 0,
      scaleX: 2,
      scaleY: 2,
      duration: 80,
      onComplete: () => flash.destroy(),
    });
  }

  _updateTrail(delta) {
    this._trailTimer += delta;
    if (this._trailTimer > 50 && (this.body.velocity.x !== 0 || this.body.velocity.y !== 0)) {
      this._trailTimer = 0;
      const trail = this.scene.add.rectangle(
        this.x, this.y,
        this.width * 0.5, this.height * 0.8,
        COLORS.CYAN,
        0.15
      );
      trail.setDepth(DEPTH.EFFECTS - 1);
      this.scene.tweens.add({
        targets: trail,
        alpha: 0,
        scaleX: 0.3,
        duration: 200,
        onComplete: () => trail.destroy(),
      });
    }
  }

  /**
   * Take damage from enemy
   */
  takeDamage(amount) {
    if (this.isInvincible || this.isDead || !this.active) return;

    // 1. HARD LOCK - Physically disable body to stop ALL overlaps immediately
    this.isInvincible = true;
    if (this.body) this.body.enable = false;
    
    this.hp -= amount;
    if (this.hp < 0) this.hp = 0;
    gameState.playerHP = this.hp;

    if (this.hp <= 0) {
      this._die();
      return;
    }

    // 2. Visually indicate hit
    this.setTintFill(0xffffff);
    
    // 3. Re-enable body after a short grace period (500ms)
    this.scene.time.delayedCall(500, () => {
      if (this.active && !this.isDead) {
        if (this.body) this.body.enable = true;
        this.clearTint();
        this.isInvincible = false;
      }
    });

    // 4. Flicker
    this.scene.tweens.add({
      targets: this,
      alpha: { from: 0.2, to: 1 },
      duration: 100,
      repeat: 4
    });

    this.scene.cameras.main.shake(100, 0.005);
  }

  _die() {
    this.isDead = true;
    this.isInvincible = true;
    this.setVelocity(0, 0);

    // Disable physics body immediately to prevent further collisions
    if (this.body) {
      this.body.enable = false;
    }

    this.setTintFill(COLORS.RED_WARN);

    // Death particles (using global emitter)
    if (this.scene._deathEmitter) {
      this.scene._deathEmitter.emitParticleAt(this.x, this.y, 25);
    }

    // Heavy screen shake
    this.scene.cameras.main.shake(
      COMBAT.SCREEN_SHAKE_HEAVY.duration,
      COMBAT.SCREEN_SHAKE_HEAVY.intensity / 1000
    );

    // DIRECT CALL to scene method (bypass events for stability)
    if (this.scene && typeof this.scene._onPlayerDeath === 'function') {
      this.scene._onPlayerDeath();
    }

    // Fade out
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      duration: 400,
      onComplete: () => {
        this.setVisible(false);
        this.setActive(false);
      },
    });
  }

  /**
   * Fire ultimate ability
   */
  fireUltimate() {
    if (!gameState.useUltimate()) return false;

    const route = gameState.currentRoute;

    // Heavy screen shake
    this.scene.cameras.main.shake(
      COMBAT.SCREEN_SHAKE_HEAVY.duration,
      COMBAT.SCREEN_SHAKE_HEAVY.intensity / 1000
    );

    if (route === 'kill') {
      this._ultimateKillRoute();
    } else {
      this._ultimateSpareRoute();
    }

    return true;
  }

  _ultimateKillRoute() {
    // Red laser beam across screen
    const beam = this.scene.add.rectangle(
      this.x, this.y, 2000, 40, COLORS.RED_WARN, 0.9
    );
    beam.setDepth(DEPTH.EFFECTS);
    this.scene.tweens.add({
      targets: beam,
      scaleY: 3,
      alpha: 0,
      duration: 600,
      ease: 'Power2',
      onComplete: () => beam.destroy(),
    });

    // Flash
    this.scene.cameras.main.flash(300, 255, 50, 50);

    // Damage all enemies
    this.scene.events.emit('ultimate-kill');
  }

  _ultimateSpareRoute() {
    // EMP wave — blue-white expanding circle
    const emp = this.scene.add.circle(this.x, this.y, 10, 0x88CCFF, 0.6);
    emp.setDepth(DEPTH.EFFECTS);
    this.scene.tweens.add({
      targets: emp,
      scaleX: 80,
      scaleY: 80,
      alpha: 0,
      duration: 800,
      ease: 'Cubic.easeOut',
      onComplete: () => emp.destroy(),
    });

    // Flash blue
    this.scene.cameras.main.flash(400, 100, 180, 255);

    // Stun enemies + clear bullets
    this.scene.events.emit('ultimate-spare');
  }
}
