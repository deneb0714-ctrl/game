// =============================================
// flags.js – 好感度・フラグ管理
// =============================================
window.MOT = window.MOT || {};

MOT.flags = {
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
  heardDemonLord: false,
  diedCount: 0,
  energy: 0,
  maxEnergyThreshold: 100,
  playerHP: 5,
  playerMaxHP: 5
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
  MOT.flags.favor = { minion1: 0, boss1: 0, boss2: 0, boss3: 0, wingL: 0, wingR: 0 };
  MOT.flags.obeyDoctor = 0;
  MOT.flags.showMercy = 0;
  MOT.flags.brutality = 0;
  MOT.flags.murderousOrbCount = 0;
  MOT.flags.heardDemonLord = false;
  MOT.flags.diedCount = 0;
  MOT.flags.energy = 0;
  MOT.flags.playerHP = 5;
  MOT.flags.playerMaxHP = 5;
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
    return;
  }

  const isSpecialReady = (MOT.flags.energy >= MOT.flags.maxEnergyThreshold);
  if (isSpecialReady) {
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
  } else {
    if (scene.specialAuraGraphics) {
      scene.specialAuraGraphics.clear();
    }
  }
};

MOT.incrementMurderousOrb = function () {
  MOT.flags.murderousOrbCount++;
};
