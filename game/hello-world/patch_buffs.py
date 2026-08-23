import codecs
import re

content = codecs.open('src/scenes/BossScene.js', 'r', 'utf-8').read()

pattern = re.compile(
    r'(create\(\)\s*\{\s*this\.heroAttackSpeedBoost\s*=\s*false;\s*this\.heroFirepowerBoost\s*=\s*false;)',
    re.DOTALL
)

new_logic = r'\1\n      this.inunekoBoostActive = false;\n      this.barrierActive = false;\n      this.playerInvincible = false;'

content = pattern.sub(new_logic, content)

with codecs.open('src/scenes/BossScene.js', 'w', 'utf-8') as f:
    f.write(content)
print("Buff logic updated.")
