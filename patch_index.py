import sys
import codecs

with codecs.open('index.html', 'r', 'utf-8') as f:
    content = f.read()

content = content.replace("window.GAME_VERSION = 'v390';", "window.GAME_VERSION = 'v396';")

with codecs.open('index.html', 'w', 'utf-8') as f:
    f.write(content)

print("Updated GAME_VERSION to v396")
