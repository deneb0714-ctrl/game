import codecs
import re

content = codecs.open('src/scenes/BossScene.js', 'r', 'utf-8').read()

pattern = re.compile(
    r'let downCount = 0;.*?await sayDemon\(',
    re.DOTALL
)

new_choice_logic = """let c = 1;
                          while (c === 1) {
                              c = await askChoice('1. 殺す', '2. 殺さない', true);
                              if (c === 1) {
                                  if(MOT.Audio.playError) MOT.Audio.playError();
                              }
                          }
                          await sayDemon("""

content = pattern.sub(new_choice_logic, content)

with codecs.open('src/scenes/BossScene.js', 'w', 'utf-8') as f:
    f.write(content)
print("Choice logic updated.")
