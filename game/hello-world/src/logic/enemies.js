// =============================================
// enemies.js – 敵生成・弾幕パターン
// =============================================
window.MOT = window.MOT || {};

/**
 * Spawn a basic minion enemy that moves left and fires straight bullets.
 */
MOT.spawnBasicEnemy = function (scene, x, y, texture) {
  const enemy = scene.enemyGroup.create(x, y, texture || 'enemy_basic');
  enemy.setVelocityX(-Phaser.Math.Between(100, 250));
  enemy.hp = 3;
  enemy.fireTimer = scene.time.addEvent({
    delay: Phaser.Math.Between(1200, 2000),
    callback: function () {
      if (enemy.active) {
        MOT.fireLinear(scene, enemy.x, enemy.y, -350, 0);
      }
    },
    loop: true
  });
  enemy.on('destroy', function () {
    if (enemy.fireTimer) enemy.fireTimer.destroy();
  });
  return enemy;
};

/**
 * Spawn a wave of enemies in formation.
 */
MOT.spawnWave = function (scene, count, ySpread, speed) {
  const startX = 1950;
  const laneYs = [220, 460, 700];
  for (let i = 0; i < count; i++) {
    const laneY = laneYs[Phaser.Math.Between(0, 2)];
    const enemy = scene.enemyGroup.create(startX + i * 60, laneY, 'enemy_basic');
    enemy.setVelocityX(-(speed || 150));
    enemy.hp = 2;
    // Slight float wobble to keep them dynamic but restricted to their lane
    scene.tweens.add({
      targets: enemy,
      y: laneY + Phaser.Math.Between(-10, 10),
      yoyo: true,
      repeat: -1,
      duration: Phaser.Math.Between(800, 1500),
      ease: 'Sine.easeInOut'
    });
  }
};

/**
 * Fire a linear bullet from position.
 */
MOT.fireLinear = function (scene, x, y, vx, vy, color) {
  if (scene.dialogActive) return;
  const texture = (color !== undefined) ? 'bullet_enemy_white' : 'bullet_enemy';
  const bullet = scene.enemyBullets.create(x, y, texture);
  if (bullet) {
    bullet.setVelocity(vx, vy);
    bullet.setScale(1);
    if (color !== undefined) bullet.setTint(color);
    // Auto-destroy when off-screen
    scene.time.delayedCall(5000, function () {
      if (bullet.active) bullet.destroy();
    });
  }
};

/**
 * Fire a fan-shaped spread of bullets.
 */
MOT.fireFan = function (scene, x, y, count, speed, angleCenter, angleSpread) {
  if (scene.dialogActive) return;
  const startAngle = angleCenter - angleSpread / 2;
  const step = count > 1 ? angleSpread / (count - 1) : 0;
  for (let i = 0; i < count; i++) {
    const angle = Phaser.Math.DegToRad(startAngle + step * i);
    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed;
    MOT.fireLinear(scene, x, y, vx, vy);
  }
};

/**
 * Fire a homing bullet that tracks the player.
 */
MOT.fireHoming = function (scene, x, y, speed, player, color) {
  if (scene.dialogActive) return;
  const texture = (color !== undefined) ? 'bullet_homing_white' : 'bullet_homing';
  const bullet = scene.enemyBullets.create(x, y, texture);
  if (bullet && player && player.active) {
    const angle = Phaser.Math.Angle.Between(x, y, player.x, player.y);
    bullet.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
    bullet.setTint(color !== undefined ? color : 0xFF4B6E);
    scene.time.delayedCall(4000, function () {
      if (bullet.active) bullet.destroy();
    });
  }
};

/**
 * Fire a circular burst of bullets.
 */
MOT.fireCircle = function (scene, x, y, count, speed, color) {
  if (scene.dialogActive) return;
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 / count) * i;
    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed;
    MOT.fireLinear(scene, x, y, vx, vy, color);
  }
};
