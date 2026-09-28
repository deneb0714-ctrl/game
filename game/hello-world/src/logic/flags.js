// =============================================
// flags.js – 好感度・フラグ管理
// =============================================
window.MOT = window.MOT || {};

MOT.Settings = {
  seVolume: 100,
  bgmVolume: 100,
  specialCutinEnabled: true
};

MOT.flags = {
  heroName: 'メエリア',
  favor: {
    minion1: 0,
    boss1: 0,
    boss2: 0,
    boss3: 0,
    wingL: 0,
    wingR: 0
  },
  obeyDoctor: 0,
  showMercy: 0,
  brutality: 0,
  murderousOrbCount: 0,
  doctorObeyCount: 0,       // 博士の指示に従った回数
  heardDemonLord: false,
  diedCount: 0,
  energy: 0,
  maxEnergyThreshold: 100,
  playerHP: 3,
  playerMaxHP: 3,
  dollPoints: 0,
  killingIntent: 0,
  bossIntroSeen: {}
};

Object.defineProperty(MOT.flags, 'maxEnergy', {
  get: function () {
    return (this.energy >= this.maxEnergyThreshold);
  },
  set: function (val) {
    if (!val) {
      this.energy = 0;
    } else {
      this.energy = this.maxEnergyThreshold;
    }
  },
  configurable: true,
  enumerable: true
});

MOT.resetFlags = function () {
  const currentHeroName = (MOT.flags && MOT.flags.heroName) ? MOT.flags.heroName : 'メエリア';
  MOT.flags.heroName = currentHeroName;
  MOT.flags.favor = { minion1: 0, boss1: 0, boss2: 0, boss3: 0, wingL: 0, wingR: 0 };
  MOT.flags.obeyDoctor = 0;
  MOT.flags.showMercy = 0;
  MOT.flags.brutality = 0;
  MOT.flags.murderousOrbCount = 0;
  MOT.flags.doctorObeyCount = 0;
  MOT.flags.heardDemonLord = false;
  MOT.flags.useGlitchTitle = false;
  MOT.flags.finalEnding = null;
  MOT.flags.diedCount = 0;
  MOT.flags.energy = 0;
  MOT.flags.playerHP = 3;
  MOT.flags.playerMaxHP = 3;
  MOT.flags.dollPoints = 0;
  MOT.flags.killingIntent = 0;
  MOT.flags.bossIntroSeen = {};

  // New Boss Kill Flags
  MOT.flags.killedBoss1 = false;
  MOT.flags.killedBoss2 = false;
  MOT.flags.killedTwins = false;
  MOT.flags.killedDemonLord = false;
};

MOT.loadFlags = function (savedFlags) {
  if (!savedFlags) return;
  const newFlags = typeof savedFlags === 'string' ? JSON.parse(savedFlags) : JSON.parse(JSON.stringify(savedFlags));
  delete newFlags.maxEnergy; // getterを上書きして破壊しないように削除
  const prevIntroSeen = (MOT.flags && MOT.flags.bossIntroSeen) ? Object.assign({}, MOT.flags.bossIntroSeen) : {};
  if (!MOT.flags) MOT.flags = {};
  Object.assign(MOT.flags, newFlags);
  if (!MOT.flags.bossIntroSeen) {
    MOT.flags.bossIntroSeen = {};
  }
  Object.assign(MOT.flags.bossIntroSeen, prevIntroSeen);
};

MOT.modifyFlag = function (key, value) {
  if (key.includes('.')) {
    const parts = key.split('.');
    let obj = MOT.flags;
    for (let i = 0; i < parts.length - 1; i++) {
      obj = obj[parts[i]];
    }
    obj[parts[parts.length - 1]] += value;
  } else {
    if (typeof MOT.flags[key] === 'boolean') {
      MOT.flags[key] = value;
    } else {
      MOT.flags[key] += value;
    }
  }
};

MOT.addEnergy = function (amount) {
  MOT.flags.energy = Math.min(MOT.flags.energy + amount, MOT.flags.maxEnergyThreshold);
};

MOT.updateSpecialAura = function (scene) {
  if (!scene || !scene.player || !scene.player.active || scene.player.alpha <= 0) {
    if (scene && scene.specialAuraGraphics) {
      scene.specialAuraGraphics.clear();
    }
    if (scene && scene.specialAuraEmitter) {
      scene.specialAuraEmitter.stop();
    }
    if (scene && scene._specialTintActive && !scene.playerInvincible) {
      scene.player.clearTint();
      scene._specialTintActive = false;
    }
    return;
  }

  const isSpecialReady = (MOT.flags.energy >= MOT.flags.maxEnergyThreshold);
  if (isSpecialReady) {
    // 1. 上昇するエネルギー粒子エフェクト（足元から上空へ湧き上がる光の火花・エネルギー粒子）
    if (!scene.specialAuraEmitter) {
      scene.specialAuraEmitter = scene.add.particles(0, 0, 'particle', {
        follow: scene.player,
        followOffset: { x: 0, y: 15 },
        x: { min: -18, max: 18 },
        speedY: { min: -140, max: -60 },
        speedX: { min: -25, max: 25 },
        scale: { start: 1.1, end: 0.1 },
        alpha: { start: 0.85, end: 0 },
        tint: [0xFF1744, 0xFF5252, 0xFFFF00, 0xFF7043],
        lifespan: { min: 350, max: 650 },
        frequency: 30,
        blendMode: 'ADD'
      });
      scene.specialAuraEmitter.setDepth(11);
    } else {
      if (scene.specialAuraEmitter.follow !== scene.player) {
        scene.specialAuraEmitter.follow = scene.player;
      }
      if (!scene.specialAuraEmitter.emitting) {
        scene.specialAuraEmitter.start();
      }
    }

    // 2. 立ち上るエネルギーオーラ＆炎のゆらぎ（円枠は完全撤廃し、勇者から湧き上がる気流を表現）
    if (!scene.specialAuraGraphics) {
      scene.specialAuraGraphics = scene.add.graphics();
    }
    scene.specialAuraGraphics.clear();
    const pDepth = (scene.player.depth !== undefined) ? scene.player.depth : 10;
    scene.specialAuraGraphics.setDepth(Math.max(0, pDepth - 1));

    const now = Date.now();
    const pulse = (Math.sin(now / 160) + 1) / 2; // 0.0〜1.0 の滑らかな脈動
    const px = scene.player.x;
    const py = scene.player.y;

    // (A) 勇者の背後に広がる縦長の柔らかなエネルギー光柱
    scene.specialAuraGraphics.fillStyle(0xFF1744, 0.13 + 0.07 * pulse);
    scene.specialAuraGraphics.fillEllipse(px, py - 6, 48 + pulse * 6, 84 + pulse * 10);

    // (B) より高輝度な黄金・オレンジのエネルギーコア
    scene.specialAuraGraphics.fillStyle(0xFFA000, 0.16 + 0.08 * pulse);
    scene.specialAuraGraphics.fillEllipse(px, py - 4, 30 + pulse * 4, 56 + pulse * 8);

    // (C) 足元から頭上へ立ち上り揺らめくオーラの炎筋（エネルギーの湧出感）
    const t = now / 140;
    const tendrils = [
      { ox: -16, baseY: 28, height: 62 + Math.sin(t * 1.5) * 12, sway: 6, color: 0xFF1744, alpha: 0.50 },
      { ox: -6,  baseY: 32, height: 78 + Math.cos(t * 1.8) * 15, sway: 8, color: 0xFF5252, alpha: 0.60 },
      { ox: 6,   baseY: 30, height: 82 + Math.sin(t * 2.1) * 14, sway: -7, color: 0xFFFF52, alpha: 0.65 },
      { ox: 16,  baseY: 26, height: 64 + Math.cos(t * 1.6) * 12, sway: -5, color: 0xFF7043, alpha: 0.50 }
    ];

    tendrils.forEach(tr => {
      scene.specialAuraGraphics.lineStyle(2.5, tr.color, tr.alpha * (0.8 + 0.2 * pulse));
      scene.specialAuraGraphics.beginPath();
      const sx = px + tr.ox;
      const sy = py + tr.baseY;
      const cx = sx + Math.sin(t + tr.ox) * tr.sway;
      const cy = py - tr.height * 0.35;
      const ex = sx + Math.cos(t * 1.4 + tr.ox) * (tr.sway * 1.4);
      const ey = py + tr.baseY - tr.height;
      scene.specialAuraGraphics.moveTo(sx, sy);
      scene.specialAuraGraphics.quadraticBezierTo(cx, cy, ex, ey);
      scene.specialAuraGraphics.strokePath();
    });

    // 3. プレイヤー本体自身のエネルギー脈動（必殺技チャージ完了状態の明示）
    if (!scene.playerInvincible) {
      const gb = Math.floor(160 + 80 * (1 - pulse));
      const tint = (0xFF << 16) | (gb << 8) | gb;
      scene.player.setTint(tint);
      scene._specialTintActive = true;
    }
  } else {
    if (scene.specialAuraGraphics) {
      scene.specialAuraGraphics.clear();
    }
    if (scene.specialAuraEmitter && scene.specialAuraEmitter.emitting) {
      scene.specialAuraEmitter.stop();
    }
    if (scene._specialTintActive && !scene.playerInvincible) {
      scene.player.clearTint();
      scene._specialTintActive = false;
    }
  }
};

MOT.incrementMurderousOrb = function () {
  MOT.flags.murderousOrbCount++;
};

// 博士の指示に従った回数をインクリメントする関数
MOT.showPopup = function(text) {
  let scene = MOT.currentScene;
  if (!scene) return;
  const saveNotify = scene.add.text(1920 / 2, 120, text, {
    fontFamily: "'DotGothic16', sans-serif",
    fontSize: "28px",
    color: "#00FF88",
    backgroundColor: "#111111",
    padding: { x: 16, y: 8 }
  }).setOrigin(0.5).setDepth(200000).setAlpha(0).setScrollFactor(0);
  scene.tweens.add({ targets: saveNotify, alpha: 1, duration: 400, yoyo: true, hold: 1500 });
};

MOT.incrementDoctorObeyCount = function () {
  MOT.flags.doctorObeyCount++;
  MOT.flags.dollPoints = Math.min(100, MOT.flags.dollPoints + 5);
    let oldMax = MOT.flags.playerMaxHP;
    MOT.flags.playerMaxHP = 3 + Math.floor(MOT.flags.dollPoints / 25);
    if (MOT.flags.playerMaxHP > oldMax) {
      MOT.flags.playerHP += (MOT.flags.playerMaxHP - oldMax);
      if (MOT.showPopup) {
      if (MOT.flags.playerMaxHP >= 7) {
        MOT.showPopup("最大HPが7で最大になりました。");
      } else {
        MOT.showPopup("最大HPが" + oldMax + "から" + MOT.flags.playerMaxHP + "になりました。");
      }
    }
    }
  console.log('[MOT] doctorObeyCount:', MOT.flags.doctorObeyCount);
};

// =============================================
// セーブ／ロード機能（自動セーブ＆CONTINUE対応）
// =============================================
MOT.saveGame = function(nextBossIndex) {
  try {
    const saveData = {
      version: 1,
      timestamp: Date.now(),
      bossIndex: nextBossIndex,
      flags: JSON.parse(JSON.stringify(MOT.flags))
    };
    localStorage.setItem('MOT_SAVE_DATA', JSON.stringify(saveData));
    console.log('[MOT] Auto-saved progress for bossIndex:', nextBossIndex);
  } catch(e) {
    console.error('[MOT] Failed to save game:', e);
  }
};

MOT.loadGame = function() {
  try {
    const dataStr = localStorage.getItem('MOT_SAVE_DATA');
    if (!dataStr) return null;
    return JSON.parse(dataStr);
  } catch(e) {
    console.error('[MOT] Failed to load save data:', e);
    return null;
  }
};

MOT.hasSaveData = function() {
  const data = MOT.loadGame();
  return data && data.bossIndex !== undefined && data.bossIndex >= 0;
};

MOT.clearSaveData = function() {
  try {
    localStorage.removeItem('MOT_SAVE_DATA');
    console.log('[MOT] Save data cleared.');
  } catch(e) {
    console.error('[MOT] Failed to clear save data:', e);
  }
};

MOT.saveEnding = function(endingKey) {
  try {
    let unlocked = JSON.parse(localStorage.getItem('MOT_UNLOCKED_ENDINGS') || '[]');
    if (!unlocked.includes(endingKey)) {
      unlocked.push(endingKey);
      localStorage.setItem('MOT_UNLOCKED_ENDINGS', JSON.stringify(unlocked));
    }
  } catch(e) {}
};

MOT.hasUnlockedEnding = function(endingKey) {
  try {
    let unlocked = JSON.parse(localStorage.getItem('MOT_UNLOCKED_ENDINGS') || '[]');
    return unlocked.includes(endingKey);
  } catch(e) {
    return false;
  }
};

