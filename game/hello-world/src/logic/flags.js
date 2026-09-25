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
  killingIntent: 0
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

  // New Boss Kill Flags
  MOT.flags.killedBoss1 = false;
  MOT.flags.killedBoss2 = false;
  MOT.flags.killedTwins = false;
  MOT.flags.killedDemonLord = false;
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
    if (scene.specialAuraEmitter && scene.specialAuraEmitter.emitting) {
      scene.specialAuraEmitter.stop();
    }
    if (!scene.specialAuraGraphics) {
      scene.specialAuraGraphics = scene.add.graphics();
    }
    scene.specialAuraGraphics.clear();
    const pDepth = (scene.player.depth !== undefined) ? scene.player.depth : 10;
    scene.specialAuraGraphics.setDepth(pDepth + 1);

    const now = Date.now();
    const pulse = (Math.sin(now / 120) + 1) / 2;
    const px = scene.player.x;
    const py = scene.player.y;

    // 1. 周囲のふんわりとした赤い光のグロー（大）
    scene.specialAuraGraphics.fillStyle(0xFF1133, 0.16 + 0.12 * pulse);
    scene.specialAuraGraphics.fillCircle(px, py, 56 + pulse * 12);

    // 2. 内側の赤い光（中）
    scene.specialAuraGraphics.fillStyle(0xFF3355, 0.26 + 0.15 * pulse);
    scene.specialAuraGraphics.fillCircle(px, py, 38 + pulse * 8);

    // 3. 脈動するエナジーリング（外輪）
    scene.specialAuraGraphics.lineStyle(3.5, 0xFF0044, 0.7 + 0.3 * pulse);
    scene.specialAuraGraphics.strokeCircle(px, py, 52 + pulse * 10);

    // 4. 高輝度リング（中輪）
    scene.specialAuraGraphics.lineStyle(2, 0xFFAAAA, 0.8 + 0.2 * pulse);
    scene.specialAuraGraphics.strokeCircle(px, py, 34 + pulse * 5);

    // 5. プレイヤーの足元チャージリング
    scene.specialAuraGraphics.lineStyle(2.5, 0xFF2255, 0.85);
    scene.specialAuraGraphics.strokeCircle(px, py + 30, 26 + pulse * 4);

    // 6. 立ち上る光のスパーク（時間依存で上昇する赤い火の粉）
    for (let i = 0; i < 4; i++) {
      const offsetSeed = (now / 300 + i * 1.57) % 6.28;
      const sparkX = px + Math.sin(offsetSeed * 3 + i) * 28;
      const sparkY = py + 35 - ((now / 8 + i * 25) % 75);
      const sparkAlpha = Math.max(0, 1 - ((py + 35 - sparkY) / 75));
      scene.specialAuraGraphics.fillStyle(0xFFFFFF, sparkAlpha * 0.9);
      scene.specialAuraGraphics.fillCircle(sparkX, sparkY, 2.5);
      scene.specialAuraGraphics.fillStyle(0xFF2255, sparkAlpha * 0.6);
      scene.specialAuraGraphics.fillCircle(sparkX, sparkY, 4.5);
    }

    // プレイヤーの微弱な赤色明滅（視認性向上）
    if (!scene.playerInvincible) {
      const gb = Math.floor(165 + 80 * (1 - pulse));
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

