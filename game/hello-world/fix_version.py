
import codecs
content = codecs.open('index.html', 'r', 'utf-8').read()
content = content.replace('window.GAME_VERSION = \'v390\'', 'window.GAME_VERSION = \'v397\'')
with codecs.open('index.html', 'w', 'utf-8') as f:
    f.write(content)

