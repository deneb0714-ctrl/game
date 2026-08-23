import codecs
import re

content = codecs.open('src/scenes/BossScene.js', 'r', 'utf-8').read().splitlines()
for i, line in enumerate(content):
    # ignore lines with //
    l = re.sub(r'//.*', '', line)
    # ignore escaped quotes
    l = l.replace("\\'", '')
    if l.count("'") % 2 != 0:
        print(f'Odd single quotes at line {i+1}: {line}')
