import sys
import re

# Patch items.js
with open('src/logic/items.js', 'r', encoding='utf-8') as f:
    content = f.read()

snap_logic = """
  const lanes = [220, 460, 700];
  let closestY = lanes[0];
  let minDist = Math.abs(y - lanes[0]);
  for(let i = 1; i < lanes.length; i++) {
      if(Math.abs(y - lanes[i]) < minDist) { minDist = Math.abs(y - lanes[i]); closestY = lanes[i]; }
  }
  y = closestY;
"""

# Energy item
content = content.replace("MOT.spawnEnergyItem = function (scene, x, y, forceRed = false) {\n  const isMurderous = forceRed || Phaser.Math.Between(0, 100) < 15;",
                          "MOT.spawnEnergyItem = function (scene, x, y, forceRed = false) {\n" + snap_logic + "  const isMurderous = forceRed || Phaser.Math.Between(0, 100) < 5;")

# Health item
content = content.replace("MOT.spawnHealthItem = function (scene, x, y) {\n  const item = scene.itemGroup.create(x, y, 'item_health');",
                          "MOT.spawnHealthItem = function (scene, x, y) {\n" + snap_logic + "  const item = scene.itemGroup.create(x, y, 'item_health');")

# Red diamond
content = content.replace("MOT.spawnRedDiamond = function (scene, x, y) {\n  const item = scene.itemGroup.create(x, y, 'item_red_diamond');",
                          "MOT.spawnRedDiamond = function (scene, x, y) {\n" + snap_logic + "  const item = scene.itemGroup.create(x, y, 'item_red_diamond');")

with open('src/logic/items.js', 'w', encoding='utf-8') as f:
    f.write(content)

# Patch BossScene.js
with open('src/scenes/BossScene.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Twin revive HP
content = re.sub(r'boss\.hp\s*=\s*1\s*;', 'boss.hp = Math.max(1, otherBoss.hp);', content)

# Spawn health item during boss fight
# (Replace all exact occurrences)
content = content.replace("MOT.spawnEnergyItem(this, boss.x, boss.y);", 
                          "if(Phaser.Math.Between(0, 100) < 5) MOT.spawnHealthItem(this, boss.x, boss.y); else MOT.spawnEnergyItem(this, boss.x, boss.y);")

with open('src/scenes/BossScene.js', 'w', encoding='utf-8') as f:
    f.write(content)
