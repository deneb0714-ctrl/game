import codecs
import re

content = codecs.open('src/scenes/BossScene.js', 'r', 'utf-8').read()

pattern = re.compile(
    r'let c = 1;\s*while \(c === 1\) \{\s*c = await askShatterChoice\(.*?\}\s*\}',
    re.DOTALL
)

new_choice_logic = """let c = await askShatterChoice('1. 殺す', '2. 殺さない', true);
                          if (c === 1) {
                              ending('normal_unresistable');
                              return;
                          }"""

content = pattern.sub(new_choice_logic, content)

with codecs.open('src/scenes/BossScene.js', 'w', 'utf-8') as f:
    f.write(content)
print("Choice logic updated to end.")
