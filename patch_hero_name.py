import sys
import codecs

with codecs.open('src/scenes/BossScene.js', 'r', 'utf-8') as f:
    content = f.read()

original = "this.showDialogue('勇者', text, res);"
new_text = "this.showDialogue(MOT.flags.heroName || '勇者', text, res);"

content = content.replace(original, new_text)

with codecs.open('src/scenes/BossScene.js', 'w', 'utf-8') as f:
    f.write(content)

print("Replaced all hardcoded 勇者 in showDialogue")
