// =============================================
// specialCutin.js – 主人公必殺技カットイン演出システム
// 「目を閉じる」→「目を開ける」のドラマチック演出
// =============================================
window.MOT = window.MOT || {};

/**
 * 主人公の必殺技カットインを再生する
 * @param {Phaser.Scene} scene 呼び出し元シーン
 * @param {Function} onExecuteAttack 攻撃判定・弾幕放出コールバック
 */
MOT.playHeroSpecialCutin = function (scene, onExecuteAttack) {
  if (scene._specialCutinRunning) return;
  scene._specialCutinRunning = true;

  // プレイヤーを演出中無敵化
  const prevInvulnerable = scene.player ? scene.player.isInvulnerable : false;
  if (scene.player) {
    scene.player.isInvulnerable = true;
  }

  const w = (scene.cameras && scene.cameras.main) ? scene.cameras.main.width : 1920;
  const h = (scene.cameras && scene.cameras.main) ? scene.cameras.main.height : 1080;

  // 最前面コンテナ（深度 99999）
  const container = scene.add.container(0, 0).setDepth(99999);

  // 1. 背景のダークオーバーレイ
  const darkBg = scene.add.rectangle(0, 0, w, h, 0x030814, 0.72).setOrigin(0);
  container.add(darkBg);

  // 2. シネマティックレターボックス（上下の黒帯）
  const letterboxH = 140;
  const topBar = scene.add.rectangle(0, -letterboxH, w, letterboxH, 0x000000, 0.95).setOrigin(0);
  const bottomBar = scene.add.rectangle(0, h, w, letterboxH, 0x000000, 0.95).setOrigin(0);
  container.add([topBar, bottomBar]);

  scene.tweens.add({
    targets: topBar,
    y: 0,
    duration: 180,
    ease: 'Cubic.easeOut'
  });
  scene.tweens.add({
    targets: bottomBar,
    y: h - letterboxH,
    duration: 180,
    ease: 'Cubic.easeOut'
  });

  // 3. スタイリッシュな斜めカットイン帯（サイバーネオンバナー）
  const bannerGfx = scene.add.graphics();
  bannerGfx.fillStyle(0x071526, 0.92);
  bannerGfx.beginPath();
  bannerGfx.moveTo(-200, 200);
  bannerGfx.lineTo(w + 300, 110);
  bannerGfx.lineTo(w + 300, 890);
  bannerGfx.lineTo(-200, 980);
  bannerGfx.closePath();
  bannerGfx.fillPath();

  // ネオンシアンのボーダーライン
  bannerGfx.lineStyle(3, 0x4FD1FF, 0.95);
  bannerGfx.strokePath();
  bannerGfx.lineStyle(1.5, 0x00FFFF, 0.45);
  bannerGfx.lineBetween(-200, 215, w + 300, 125);
  bannerGfx.lineBetween(-200, 965, w + 300, 875);
  container.add(bannerGfx);

  bannerGfx.x = -w;
  scene.tweens.add({
    targets: bannerGfx,
    x: 0,
    duration: 220,
    ease: 'Power2.easeOut'
  });

  // 4. 背景のスピードライン（集中線・流線）
  const speedLines = scene.add.graphics();
  container.add(speedLines);
  const drawSpeedLines = () => {
    speedLines.clear();
    speedLines.lineStyle(1.5, 0x4FD1FF, 0.35);
    for (let i = 0; i < 22; i++) {
      const y = Phaser.Math.Between(180, 900);
      const len = Phaser.Math.Between(300, 850);
      const startX = Phaser.Math.Between(-100, w);
      speedLines.lineBetween(startX, y, startX + len, y - 25);
    }
  };
  drawSpeedLines();
  const speedLineTimer = scene.time.addEvent({
    delay: 50,
    callback: drawSpeedLines,
    loop: true
  });

  // 5. 背景の装飾テキスト
  const bgText = scene.add.text(w * 0.46, h * 0.50, 'SPECIAL ATTACK  ///  SYSTEM OVERRIDE', {
    fontFamily: 'DotGothic16, monospace',
    fontSize: '64px',
    color: '#00F0FF',
    fontStyle: 'bold'
  }).setOrigin(0.5).setAlpha(0.18).setAngle(-2);
  container.add(bgText);

  // 6. 主人公カットインスプライト（まずは「目を閉じる」を表示）
  // 600x800 画像を画面比に合わせて配置
  const heroX = w * 0.58;
  const heroY = h * 0.52;
  const heroCutin = scene.add.sprite(heroX + 100, heroY, 'hero_special_cutin_closed');
  heroCutin.setScale(0.92);
  heroCutin.setAlpha(0);
  container.add(heroCutin);

  // チャージ音再生
  if (MOT.Audio && MOT.Audio.playCutinCharge) {
    MOT.Audio.playCutinCharge();
  }

  // スライドイン（目を閉じる）
  scene.tweens.add({
    targets: heroCutin,
    x: heroX,
    alpha: 1,
    scaleX: 0.98,
    scaleY: 0.98,
    duration: 320,
    ease: 'Cubic.easeOut'
  });

  // エネルギー集束リング（手元・頭部あたりで回転収束）
  const chargeRing = scene.add.graphics();
  container.add(chargeRing);
  chargeRing.x = heroX - 35;
  chargeRing.y = heroY - 140;
  scene.tweens.addCounter({
    from: 150,
    to: 12,
    duration: 400,
    onUpdate: (tween) => {
      chargeRing.clear();
      const r = tween.getValue();
      chargeRing.lineStyle(3, 0x00F0FF, 0.85);
      chargeRing.strokeCircle(0, 0, r);
      chargeRing.lineStyle(1.5, 0xFFFFFF, 0.95);
      chargeRing.strokeCircle(0, 0, r * 0.6);
    }
  });

  // 7. 【目を開ける】瞬間への切り替え（約420ms後）
  scene.time.delayedCall(420, () => {
    if (!heroCutin.active) return;

    // テクスチャを目を開けた画像に切り替え！
    heroCutin.setTexture('hero_special_cutin_open');
    heroCutin.setScale(1.04);

    // 開放インパクト音
    if (MOT.Audio && MOT.Audio.playCutinRelease) {
      MOT.Audio.playCutinRelease();
    }

    // 画面フラッシュ（白＆シアン）
    const flash = scene.add.rectangle(0, 0, w, h, 0xFFFFFF, 0.85).setOrigin(0);
    container.add(flash);
    scene.tweens.add({
      targets: flash,
      alpha: 0,
      duration: 180,
      onComplete: () => flash.destroy()
    });

    // カメラ揺れ
    if (scene.cameras && scene.cameras.main) {
      scene.cameras.main.shake(200, 0.012);
    }

    // 開眼ショックウェーブリング（一気に拡大拡散）
    const burstRing = scene.add.graphics();
    container.add(burstRing);
    burstRing.x = heroX - 25;
    burstRing.y = heroY - 145;
    scene.tweens.addCounter({
      from: 12,
      to: 460,
      duration: 360,
      ease: 'Quad.easeOut',
      onUpdate: (tween) => {
        burstRing.clear();
        const r = tween.getValue();
        const a = Math.max(0, 1 - (r / 460));
        burstRing.lineStyle(5, 0x00F0FF, a);
        burstRing.strokeCircle(0, 0, r);
        burstRing.lineStyle(2, 0xFFFFFF, a * 0.9);
        burstRing.strokeCircle(0, 0, r * 0.85);
      },
      onComplete: () => burstRing.destroy()
    });

    // 力強いカットインテキスト
    const burstText = scene.add.text(w * 0.28, h * 0.48, 'BURST!!', {
      fontFamily: 'DotGothic16, monospace',
      fontSize: '84px',
      color: '#FFFFFF',
      stroke: '#00F0FF',
      strokeThickness: 8,
      fontStyle: 'bold'
    }).setOrigin(0.5).setScale(1.8).setAlpha(0);
    container.add(burstText);

    scene.tweens.add({
      targets: burstText,
      scale: 1.0,
      alpha: 1,
      duration: 120,
      ease: 'Back.easeOut'
    });

    // 8. 攻撃実行（弾幕・敵撃破）
    scene.time.delayedCall(220, () => {
      if (onExecuteAttack) onExecuteAttack();
    });

    // 9. 退場・フィニッシュアニメーション（開眼後380msで高速スライドアウト）
    scene.time.delayedCall(380, () => {
      speedLineTimer.remove();

      // 残像スプライト生成
      for (let i = 0; i < 2; i++) {
        const ghost = scene.add.sprite(heroCutin.x - (i + 1) * 35, heroCutin.y, 'hero_special_cutin_open');
        ghost.setScale(heroCutin.scaleX);
        ghost.setTint(0x00F0FF);
        ghost.setAlpha(0.45 - i * 0.2);
        container.add(ghost);
        scene.tweens.add({
          targets: ghost,
          alpha: 0,
          x: ghost.x - 140,
          duration: 180,
          onComplete: () => ghost.destroy()
        });
      }

      // キャラクター本体の高速離脱
      scene.tweens.add({
        targets: heroCutin,
        x: heroCutin.x - 320,
        alpha: 0,
        scaleX: 1.15,
        duration: 200,
        ease: 'Cubic.easeIn'
      });

      // レターボックス引き上げ
      scene.tweens.add({
        targets: topBar,
        y: -letterboxH,
        duration: 220,
        ease: 'Cubic.easeIn'
      });
      scene.tweens.add({
        targets: bottomBar,
        y: h,
        duration: 220,
        ease: 'Cubic.easeIn'
      });

      // 背景帯・テキスト・暗幕フェードアウト
      scene.tweens.add({
        targets: [bannerGfx, darkBg, burstText, bgText],
        alpha: 0,
        duration: 220,
        onComplete: () => {
          container.destroy();
          scene._specialCutinRunning = false;

          // プレイヤー無敵を少し継続してから解除（安全マージン）
          scene.time.delayedCall(400, () => {
            if (scene.player && !prevInvulnerable) {
              scene.player.isInvulnerable = false;
            }
          });
        }
      });
    });
  });
};
