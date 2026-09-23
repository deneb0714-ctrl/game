import codecs
import re
content = codecs.open('src/scenes/BossScene.js', 'r', 'utf-8').read()
# Find any string that spans multiple lines
matches = re.finditer(r"'[^']*?'|\"[^\"]*?\"", content)
for m in matches:
    if '\n' in m.group(0):
        print('Newline in string found at index', m.start())
        print(repr(m.group(0)))
