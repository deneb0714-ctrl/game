// =============================================
// controls.js – PC/スマホ操作
// =============================================
window.MOT = window.MOT || {};

MOT.setupControls = function (scene) {
  // PC: カーソルキー + WASD
  scene.cursors = scene.input.keyboard.createCursorKeys();
  scene.wasd = scene.input.keyboard.addKeys({
    up: Phaser.Input.Keyboard.KeyCodes.W,
    down: Phaser.Input.Keyboard.KeyCodes.S,
    left: Phaser.Input.Keyboard.KeyCodes.A,
    right: Phaser.Input.Keyboard.KeyCodes.D
  });
};

MOT.handleMovement = function (scene, player) {
  const speed = 400;
  let vx = 0;
  let vy = 0;

  // Keyboard
  if (scene.cursors.left.isDown || scene.wasd.left.isDown) vx = -speed;
  if (scene.cursors.right.isDown || scene.wasd.right.isDown) vx = speed;
  if (scene.cursors.up.isDown || scene.wasd.up.isDown) vy = -speed;
  if (scene.cursors.down.isDown || scene.wasd.down.isDown) vy = speed;

  // Special Attack (Enter)
  if (Phaser.Input.Keyboard.JustDown(scene.enterKey)) {
    if (scene.onSpecialAttack) scene.onSpecialAttack();
  }

  player.setVelocity(vx, vy);

  // Clamp X to left 1/3
  const limitX = scene.cameras.main.width / 3;
  if (player.x > limitX) {
    player.x = limitX;
    if (player.body.velocity.x > 0) player.body.velocity.x = 0;
  }
};

MOT.setupControls = function (scene) {
  // PC: カーソルキー + WASD + Enter
  scene.cursors = scene.input.keyboard.createCursorKeys();
  scene.wasd = scene.input.keyboard.addKeys({
    up: Phaser.Input.Keyboard.KeyCodes.W,
    down: Phaser.Input.Keyboard.KeyCodes.S,
    left: Phaser.Input.Keyboard.KeyCodes.A,
    right: Phaser.Input.Keyboard.KeyCodes.D
  });
  scene.enterKey = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
};

MOT.setupTouchControls = function (scene, player) {
  let touching = false;

  scene.input.on('pointerdown', function (pointer) {
    touching = true;
    // Check for double click or just trigger special if energy is full?
    // Let's use a simple tap on player or similar? 
    // Actually, let's just make any tap trigger special if energy is full and not moving much.
  });

  scene.input.on('pointermove', function (pointer) {
    if (pointer.isDown && touching) {
      // Smooth follow with lerp
      const targetX = pointer.x;
      const targetY = pointer.y;
      
      const limitX = scene.cameras.main.width / 3;
      const clampedX = Math.min(targetX, limitX);
      
      const dx = clampedX - player.x;
      const dy = targetY - player.y;
      
      player.setVelocity(dx * 4, dy * 4);
    }
  });

  scene.input.on('pointerup', function () {
    touching = false;
    player.setVelocity(0, 0);
  });
};
