// =============================================
// controls.js – PC/スマホ操作 (3×3 Grid Movement)
// =============================================
// グリッド構成:
//   列 (col) 0=左, 1=中, 2=右  → X: [150, 300, 450]
//   レーン (lane) 0=上, 1=中, 2=下 → Y: [300, 540, 780]
// =============================================
window.MOT = window.MOT || {};

const LANE_YS  = [300, 540, 780];
const COL_XS   = [150, 300, 450];
const MOVE_DUR = 140; // ms（スナップ速度）

/**
 * 指定グリッドセル (lane, col) へプレイヤーをスナップ移動する。
 */
MOT.moveToCell = function (scene, player, lane, col) {
  lane = Phaser.Math.Clamp(lane, 0, 2);
  col  = Phaser.Math.Clamp(col,  0, 2);

  // 変化なしなら何もしない
  if (lane === player.currentLane && col === player.currentCol) return;

  player.currentLane = lane;
  player.currentCol  = col;

  // 既存のトゥイーンを止める
  if (player.moveTween) player.moveTween.stop();

  player.moveTween = scene.tweens.add({
    targets:  player,
    x:        COL_XS[col],
    y:        LANE_YS[lane],
    duration: MOVE_DUR,
    ease:     'Cubic.easeOut',
    onComplete: function () { player.moveTween = null; }
  });
};

/**
 * キーボード／タッチの初期化。
 */
MOT.setupControls = function (scene) {
  scene.cursors  = scene.input.keyboard.createCursorKeys();
  scene.wasd     = scene.input.keyboard.addKeys({
    up:    Phaser.Input.Keyboard.KeyCodes.W,
    down:  Phaser.Input.Keyboard.KeyCodes.S,
    left:  Phaser.Input.Keyboard.KeyCodes.A,
    right: Phaser.Input.Keyboard.KeyCodes.D
  });
  scene.enterKey = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
  scene.spaceKey = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
};

/**
 * update() 内で毎フレーム呼ぶ移動処理。
 */
MOT.handleMovement = function (scene, player) {
  // 初期化（初回のみ）
  if (player.currentLane === undefined) {
    player.currentLane = 1;
    player.currentCol  = 0; // 一番左の列からスタート
    player.x = COL_XS[0];
    player.y = LANE_YS[1];
    player.setVelocity(0, 0);
  }

  // 物理速度は常にゼロ（位置はトゥイーンで制御）
  player.setVelocity(0, 0);

  // ── キーボード入力 (JustDown で1回だけ反応) ──
  const upDown    = Phaser.Input.Keyboard.JustDown(scene.cursors.up)    || Phaser.Input.Keyboard.JustDown(scene.wasd.up);
  const downDown  = Phaser.Input.Keyboard.JustDown(scene.cursors.down)  || Phaser.Input.Keyboard.JustDown(scene.wasd.down);
  const leftDown  = Phaser.Input.Keyboard.JustDown(scene.cursors.left)  || Phaser.Input.Keyboard.JustDown(scene.wasd.left);
  const rightDown = Phaser.Input.Keyboard.JustDown(scene.cursors.right) || Phaser.Input.Keyboard.JustDown(scene.wasd.right);

  if (upDown) {
    MOT.moveToCell(scene, player, player.currentLane - 1, player.currentCol);
  } else if (downDown) {
    MOT.moveToCell(scene, player, player.currentLane + 1, player.currentCol);
  } else if (leftDown) {
    MOT.moveToCell(scene, player, player.currentLane, player.currentCol - 1);
  } else if (rightDown) {
    MOT.moveToCell(scene, player, player.currentLane, player.currentCol + 1);
  }

  // 必殺技（Enter）
  if (Phaser.Input.Keyboard.JustDown(scene.enterKey)) {
    if (scene.onSpecialAttack) scene.onSpecialAttack();
  }

  // バリア（Space）
  if (Phaser.Input.Keyboard.JustDown(scene.spaceKey)) {
    if (scene.onBarrierUse) scene.onBarrierUse();
  }
};

/**
 * スワイプ操作のセットアップ（上下左右 4方向対応）。
 */
MOT.setupTouchControls = function (scene, player) {
  let startX = 0;
  let startY = 0;
  let isSwiping = false;
  const threshold = 50; // スワイプ判定距離 (px)

  scene.input.on('pointerdown', function (pointer) {
    startX = pointer.x;
    startY = pointer.y;
    isSwiping = true;
  });

  scene.input.on('pointermove', function (pointer) {
    if (!pointer.isDown || !isSwiping) return;

    const dx = pointer.x - startX;
    const dy = pointer.y - startY;
    const adx = Math.abs(dx);
    const ady = Math.abs(dy);

    if (adx < threshold && ady < threshold) return; // まだ閾値未満

    isSwiping = false; // スワイプを1回だけ消費

    if (ady > adx) {
      // 上下スワイプ → レーン変更
      if (dy < 0) {
        MOT.moveToCell(scene, player, player.currentLane - 1, player.currentCol);
      } else {
        MOT.moveToCell(scene, player, player.currentLane + 1, player.currentCol);
      }
    } else {
      // 左右スワイプ → 列変更
      if (dx < 0) {
        MOT.moveToCell(scene, player, player.currentLane, player.currentCol - 1);
      } else {
        MOT.moveToCell(scene, player, player.currentLane, player.currentCol + 1);
      }
    }
  });

  scene.input.on('pointerup', function () {
    isSwiping = false;
  });
};
