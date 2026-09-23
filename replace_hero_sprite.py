import re

with open('src/scenes/BossScene.js', 'r', encoding='utf-8') as f:
    code = f.read()

# Replace this.heroImage.width/height with window.HERO_COMBAT_FRAME_WIDTH/HEIGHT
code = re.sub(r"this\.heroImage\.width", r"window.HERO_COMBAT_FRAME_WIDTH", code)
code = re.sub(r"this\.heroImage\.height", r"window.HERO_COMBAT_FRAME_HEIGHT", code)

with open('src/scenes/BossScene.js', 'w', encoding='utf-8') as f:
    f.write(code)
