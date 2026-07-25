// =============================================
// controls.js – PC/スマホ操作 (3×3 Grid Movement)
// =============================================
// グリッド構成:
//   列 (col) 0=左, 1=中, 2=右  → X: [150, 300, 450]
//   レーン (lane) 0=上, 1=中, 2=下 → Y: [220, 460, 700]
// =============================================
window.MOT = window.MOT || {};

const LANE_YS  = [220, 460, 700];
const COL_XS   = [150, 300, 450];
const MOVE_DUR = 140; // ms（スナップ速度）

/**
 * 指定グリッドセル (lane, col) へプレイヤーをスナップ移動する。
 */
MOT.moveToCell = function (scene, player, lane, col) {
  if (scene.dialogActive || (scene.dialogContainer && scene.dialogContainer.active) || (scene.physics && scene.physics.world && scene.physics.world.isPaused)) return;
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
    player.currentCol  = 1; // 中央の列からスタート (X=300)
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
    if (scene.dialogActive || (scene.dialogContainer && scene.dialogContainer.active) || (scene.physics && scene.physics.world && scene.physics.world.isPaused)) return;
    if (pointer.y > 780 || pointer.y < 70) return; // UIボタン領域（下部ボタン＆上部トグル）でのタッチはスワイプ判定から除外
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

/**
 * スマホ／タッチ対応：バーチャルゲームパッド（十字キー＆アクションボタン＆切替UI）を生成
 */
MOT.createVirtualGamepad = function (scene, player) {
  const isTouchDevice = scene.sys.game.device.input.touch || (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0) || window.innerWidth < 1024;
  
  scene.virtualGamepadGroup = scene.add.group();
  let isVisible = isTouchDevice; // スマホ/タッチ端末なら初期表示、PCなら非表示
  
  // ── 1. 十字キー (D-Pad) ──
  const dpadConfigs = [
    { label: '▲', x: 180, y: 850, w: 75, h: 70, action: () => MOT.moveToCell(scene, player, player.currentLane - 1, player.currentCol) },
    { label: '▼', x: 180, y: 1030, w: 75, h: 70, action: () => MOT.moveToCell(scene, player, player.currentLane + 1, player.currentCol) },
    { label: '◀', x: 85,  y: 940, w: 75, h: 70, action: () => MOT.moveToCell(scene, player, player.currentLane, player.currentCol - 1) },
    { label: '▶', x: 275, y: 940, w: 75, h: 70, action: () => MOT.moveToCell(scene, player, player.currentLane, player.currentCol + 1) }
  ];

  dpadConfigs.forEach(cfg => {
    const bg = scene.add.rectangle(cfg.x, cfg.y, cfg.w, cfg.h, 0x1F2933, 0.75)
      .setStrokeStyle(2, 0x4FD1FF)
      .setDepth(10000)
      .setInteractive({ useHandCursor: true });
    const txt = scene.add.text(cfg.x, cfg.y, cfg.label, {
      fontFamily: "'DotGothic16', sans-serif",
      fontSize: '32px',
      color: '#4FD1FF'
    }).setOrigin(0.5).setDepth(10001);
    
    bg.on('pointerdown', () => {
      bg.setFillStyle(0x4FD1FF, 0.95);
      txt.setColor('#050814');
      cfg.action();
    });
    const resetStyle = () => {
      bg.setFillStyle(0x1F2933, 0.75);
      txt.setColor('#4FD1FF');
    };
    bg.on('pointerup', resetStyle);
    bg.on('pointerout', resetStyle);
    
    scene.virtualGamepadGroup.add(bg);
    scene.virtualGamepadGroup.add(txt);
  });

  // ── 2. アクションボタン（バリア＆必殺技） ──
  // バリアボタン [SPACE]
  const barrierBg = scene.add.rectangle(1520, 950, 220, 85, 0x0B3B24, 0.85)
    .setStrokeStyle(3, 0x00FF88)
    .setDepth(10000)
    .setInteractive({ useHandCursor: true });
  const barrierTxt = scene.add.text(1520, 950, '🛡️ バリア [SPACE]', {
    fontFamily: "'DotGothic16', sans-serif",
    fontSize: '22px',
    fontStyle: 'bold',
    color: '#00FF88'
  }).setOrigin(0.5).setDepth(10001);

  barrierBg.on('pointerdown', () => {
    barrierBg.setFillStyle(0x00FF88, 0.95);
    barrierTxt.setColor('#050814');
    if (scene.onBarrierUse) scene.onBarrierUse();
  });
  const resetBarrier = () => {
    barrierBg.setFillStyle(0x0B3B24, 0.85);
    barrierTxt.setColor('#00FF88');
  };
  barrierBg.on('pointerup', resetBarrier);
  barrierBg.on('pointerout', resetBarrier);
  scene.virtualGamepadGroup.add(barrierBg);
  scene.virtualGamepadGroup.add(barrierTxt);

  // 必殺技ボタン [ENTER]
  const specialBg = scene.add.rectangle(1770, 950, 240, 85, 0x3B0B19, 0.85)
    .setStrokeStyle(3, 0xFF4B6E)
    .setDepth(10000)
    .setInteractive({ useHandCursor: true });
  const specialTxt = scene.add.text(1770, 950, '⚡ 必殺技 [ENTER]', {
    fontFamily: "'DotGothic16', sans-serif",
    fontSize: '22px',
    fontStyle: 'bold',
    color: '#FF4B6E'
  }).setOrigin(0.5).setDepth(10001);

  specialBg.on('pointerdown', () => {
    specialBg.setFillStyle(0xFF4B6E, 0.95);
    specialTxt.setColor('#050814');
    if (scene.onSpecialAttack) scene.onSpecialAttack();
  });
  const resetSpecial = () => {
    specialBg.setFillStyle(0x3B0B19, 0.85);
    specialTxt.setColor('#FF4B6E');
  };
  specialBg.on('pointerup', resetSpecial);
  specialBg.on('pointerout', resetSpecial);
  scene.virtualGamepadGroup.add(specialBg);
  scene.virtualGamepadGroup.add(specialTxt);

  // ── 3. 表示切替トグルボタン（右上に常設） ──
  const toggleBg = scene.add.rectangle(1920 - 110, 35, 190, 48, 0x1F2933, 0.85)
    .setStrokeStyle(2, 0x4FD1FF)
    .setDepth(10002)
    .setInteractive({ useHandCursor: true });
  const toggleTxt = scene.add.text(1920 - 110, 35, '📱 スマホUI 切替', {
    fontFamily: "'DotGothic16', sans-serif",
    fontSize: '18px',
    color: '#4FD1FF'
  }).setOrigin(0.5).setDepth(10003);

  const updateVisibility = () => {
    scene.virtualGamepadGroup.setVisible(isVisible);
    toggleBg.setFillStyle(isVisible ? 0x4FD1FF : 0x1F2933, 0.85);
    toggleTxt.setColor(isVisible ? '#050814' : '#4FD1FF');
  };

  toggleBg.on('pointerdown', () => {
    isVisible = !isVisible;
    updateVisibility();
  });

  // 初期可視状態を適用
  updateVisibility();
};
