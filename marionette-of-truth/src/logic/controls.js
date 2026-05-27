// =============================================
// controls.js – PC/スマホ操作 (3-Lane Movement)
// =============================================
window.MOT = window.MOT || {};

MOT.changeLane = function (scene, player, targetLane) {
  if (targetLane < 0 || targetLane > 2) return;
  player.currentLane = targetLane;
  const laneYs = [300, 540, 780];
  const targetY = laneYs[targetLane];
  
  if (player.laneTween) {
    player.laneTween.stop();
  }
  
  player.laneTween = scene.tweens.add({
    targets: player,
    y: targetY,
    duration: 150, // quick and smooth lane shift
    ease: 'Cubic.easeOut',
    onComplete: function () {
      player.laneTween = null;
    }
  });
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

MOT.handleMovement = function (scene, player) {
  // Initialize lane properties on the player
  if (player.currentLane === undefined) {
    player.currentLane = 1; // start in the middle lane (index 1)
    player.y = 540;
    // Set fixed X depending on the scene
    const fixedX = scene.scene.key === 'BossScene' ? 300 : 200;
    player.x = fixedX;
    player.setVelocity(0, 0);
  }

  // Ensure player's horizontal position is fixed
  const fixedX = scene.scene.key === 'BossScene' ? 300 : 200;
  player.x = fixedX;
  player.setVelocity(0, 0);

  // Keyboard input (JustDown checks single keypresses to change lanes)
  const upJustDown = Phaser.Input.Keyboard.JustDown(scene.cursors.up) || Phaser.Input.Keyboard.JustDown(scene.wasd.up);
  const downJustDown = Phaser.Input.Keyboard.JustDown(scene.cursors.down) || Phaser.Input.Keyboard.JustDown(scene.wasd.down);

  if (upJustDown) {
    if (player.currentLane > 0) {
      MOT.changeLane(scene, player, player.currentLane - 1);
    }
  } else if (downJustDown) {
    if (player.currentLane < 2) {
      MOT.changeLane(scene, player, player.currentLane + 1);
    }
  }

  // Special Attack (Enter)
  if (Phaser.Input.Keyboard.JustDown(scene.enterKey)) {
    if (scene.onSpecialAttack) scene.onSpecialAttack();
  }
};

MOT.setupTouchControls = function (scene, player) {
  let startY = 0;
  let startX = 0;
  let isSwiping = false;
  const threshold = 50; // swipe threshold in pixels

  scene.input.on('pointerdown', function (pointer) {
    startY = pointer.y;
    startX = pointer.x;
    isSwiping = true;
  });

  scene.input.on('pointermove', function (pointer) {
    if (!pointer.isDown || !isSwiping) return;

    const dy = pointer.y - startY;
    const dx = pointer.x - startX;

    if (Math.abs(dy) > threshold && Math.abs(dy) > Math.abs(dx)) {
      isSwiping = false; // consume swipe
      if (dy < 0) {
        if (player.currentLane > 0) {
          MOT.changeLane(scene, player, player.currentLane - 1);
        }
      } else {
        if (player.currentLane < 2) {
          MOT.changeLane(scene, player, player.currentLane + 1);
        }
      }
    }
  });

  scene.input.on('pointerup', function () {
    isSwiping = false;
  });
};
