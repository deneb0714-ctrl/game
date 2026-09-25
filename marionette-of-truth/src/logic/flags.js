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

MOT.loadFlags = function (savedFlags) {
  if (!savedFlags) return;
  const newFlags = JSON.parse(JSON.stringify(savedFlags));
  delete newFlags.maxEnergy; // getterを上書きして破壊しないように削除
  Object.assign(MOT.flags, newFlags);
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
    scene.specialAuraGraphics.setBlendMode(Phaser.BlendModes.ADD);
    const pDepth = (scene.player.depth !== undefined) ? scene.player.depth : 10;
    scene.specialAuraGraphics.setDepth(pDepth - 1);

    const now = Date.now();
    const pulse = (Math.sin(now / 200) + 1) / 2;
    const px = scene.player.x;
    const py = scene.player.y;

    scene.specialAuraGraphics.fillStyle(0xFF2244, 0.08 + 0.06 * pulse);
    scene.specialAuraGraphics.fillCircle(px, py, 58 + pulse * 10);

    scene.specialAuraGraphics.fillStyle(0xFF3366, 0.14 + 0.08 * pulse);
    scene.specialAuraGraphics.fillCircle(px, py, 40 + pulse * 6);

    scene.specialAuraGraphics.fillStyle(0xFF5588, 0.20 + 0.10 * pulse);
    scene.specialAuraGraphics.fillCircle(px, py, 24 + pulse * 4);

    scene.specialAuraGraphics.fillStyle(0xFF2255, 0.14 + 0.08 * pulse);
    scene.specialAuraGraphics.fillEllipse(px, py + 36, 42 + pulse * 6, 14 + pulse * 3);

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
    if (scene._specialTintActive && !scene.playerInvincible) {
      scene.player.clearTint();
      scene._specialTintActive = false;
    }
  }
};

MOT.incrementMurderousOrb = function () {
  MOT.flags.murderousOrbCount++;
};
