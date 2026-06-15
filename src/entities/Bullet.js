/**
 * RE:UNIT — Bullet Entity (Object-Pooled)
 * High-performance bullet system using Phaser group pooling.
 */
import Phaser from 'phaser';
import { DEPTH } from '../data/constants.js';

export class Bullet extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, '__DEFAULT');
    this.setDepth(DEPTH.BULLETS);
    this.damage = 10;
    this.patternType = 'linear';
    this._elapsed = 0;
    this._waveAmp = 0;
    this._waveFreq = 0;
    this._baseVelY = 0;
    this._spiralAngle = 0;
    this._spiralSpeed = 0;
    this._spiralRadius = 0;
    this._originX = 0;
    this._originY = 0;
  }

  /**
   * Fire this bullet from pool
   */
  fire(x, y, velX, velY, damage, texture, patternType, patternOpts) {
    this.setTexture(texture || 'bullet_player');
    this.setActive(true);
    this.setVisible(true);
    this.setAlpha(1);
    
    if (this.body) {
      this.body.enable = true;
      this.body.reset(x, y);
      this.setVelocity(velX, velY);
    }

    this.damage = damage || 10;
    this.patternType = patternType || 'linear';
    this._elapsed = 0;

    switch (this.patternType) {
      case 'wave':
        this._waveAmp = patternOpts?.amplitude || 80;
        this._waveFreq = patternOpts?.frequency || 0.005;
        this._baseVelY = velY;
        break;
      case 'spiral':
        this._spiralAngle = patternOpts?.startAngle || 0;
        this._spiralSpeed = patternOpts?.angularSpeed || 3;
        this._spiralRadius = patternOpts?.radius || 2;
        this._originX = x;
        this._originY = y;
        break;
    }
  }

  preUpdate(time, delta) {
    super.preUpdate(time, delta);
    if (!this.active) return;

    this._elapsed += delta;

    // Kill if off-screen
    if (this.x < -100 || this.x > 2100 || this.y < -100 || this.y > 1200) {
      this.kill();
      return;
    }

    // Pattern-specific updates
    if (this.body) {
      switch (this.patternType) {
        case 'wave': {
          const waveOffset = Math.sin(this._elapsed * this._waveFreq) * this._waveAmp;
          this.setVelocityY(this._baseVelY + waveOffset);
          break;
        }
        case 'spiral': {
          this._spiralAngle += this._spiralSpeed * (delta / 1000);
          const extraX = Math.cos(this._spiralAngle) * this._spiralRadius;
          const extraY = Math.sin(this._spiralAngle) * this._spiralRadius;
          this.setVelocity(this.body.velocity.x + extraX, this.body.velocity.y + extraY);
          break;
        }
      }
    }
  }

  kill() {
    this.setActive(false);
    this.setVisible(false);
    if (this.body) {
      this.body.enable = false;
      this.body.stop();
    }
  }
}

/**
 * Create a bullet group (object pool)
 */
export function createBulletPool(scene, size, texture) {
  const group = scene.physics.add.group({
    classType: Bullet,
    maxSize: size,
    runChildUpdate: true,
    allowGravity: false,
  });

  // Pre-populate the pool
  for (let i = 0; i < size; i++) {
    const b = new Bullet(scene, 0, 0);
    b.setTexture(texture || '__DEFAULT');
    group.add(b, true);
    b.kill();
  }

  return group;
}
