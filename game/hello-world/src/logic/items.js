// =============================================
// items.js – アイテム・エネルギー管理
// =============================================
window.MOT = window.MOT || {};

/**
 * Spawn an energy item (or Red Diamond) at position.
 */
MOT.spawnEnergyItem = function (scene, x, y, forceRed = false) {
  const isMurderous = forceRed || Phaser.Math.Between(0, 100) < 15; // 15% chance for Red Diamond
  
  let item;
  if (isMurderous) {
    item = scene.itemGroup.create(x, y, 'item_red_diamond');
    item.itemType = 'red_diamond';
    item.value = 10;
  } else {
    item = scene.itemGroup.create(x, y, 'item_energy');
    item.itemType = 'energy';
    item.value = 12;
  }
  
  item.setVelocityX(Phaser.Math.Between(-400, -200));

  // Floating animation
  scene.tweens.add({
    targets: item,
    y: item.y - 20,
    yoyo: true,
    repeat: -1,
    duration: 600,
    ease: 'Sine.easeInOut'
  });

  return item;
};

/**
 * Spawn a health restore item.
 */
MOT.spawnHealthItem = function (scene, x, y) {
  const item = scene.itemGroup.create(x, y, 'item_health');
  item.setVelocityX(Phaser.Math.Between(-400, -200));
  item.itemType = 'health';
  item.value = 1;

  scene.tweens.add({
    targets: item,
    y: item.y + 15,
    yoyo: true,
    repeat: -1,
    duration: 500,
    ease: 'Sine.easeInOut'
  });

  return item;
};

/**
 * Spawn a Red Diamond item.
 */
MOT.spawnRedDiamond = function (scene, x, y) {
  const item = scene.itemGroup.create(x, y, 'item_red_diamond');
  item.setVelocityX(Phaser.Math.Between(-400, -200));
  item.itemType = 'red_diamond';
  item.value = 10;

  scene.tweens.add({
    targets: item,
    y: item.y + 15,
    yoyo: true,
    repeat: -1,
    duration: 400,
    ease: 'Sine.easeInOut'
  });

  return item;
};

/**
 * Handle item pickup.
 */
MOT.collectItem = function (scene, player, item) {
  if (item.itemType === 'energy' || item.itemType === 'energy_murderous') {
    MOT.addEnergy(item.value);
    
    if (item.itemType === 'energy_murderous') {
      if (MOT.incrementMurderousOrb) MOT.incrementMurderousOrb();
      MOT.showPickupText(scene, item.x, item.y, '+' + item.value + ' EN', 0xFF0000);
    } else {
      MOT.showPickupText(scene, item.x, item.y, '+' + item.value + ' EN', 0x4FD1FF);
    }
  } else if (item.itemType === 'health') {
    MOT.flags.playerHP = Math.min(MOT.flags.playerHP + item.value, MOT.flags.playerMaxHP);
    MOT.showPickupText(scene, item.x, item.y, '+' + item.value + ' HP', 0x4FFF7F);
  } else if (item.itemType === 'red_diamond') {
    MOT.flags.killingIntent = Math.min(100, MOT.flags.killingIntent + item.value);
    MOT.addEnergy(15);
    MOT.showPickupText(scene, item.x, item.y, '殺意 +' + item.value + ' / EN +15', 0xFF0000);
  }
  item.destroy();
};

/**
 * Show floating pickup text.
 */
MOT.showPickupText = function (scene, x, y, text, color) {
  const t = scene.add.text(x, y, text, {
    fontFamily: '"Press Start 2P"',
    fontSize: '16px',
    color: '#' + color.toString(16).padStart(6, '0')
  }).setOrigin(0.5);

  scene.tweens.add({
    targets: t,
    y: y - 60,
    alpha: 0,
    duration: 800,
    ease: 'Power2',
    onComplete: function () { t.destroy(); }
  });
};
