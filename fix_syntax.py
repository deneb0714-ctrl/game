import sys
with open('src/scenes/BossScene.js', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("let trueDemonLordImg = document.getElementById('trueDemonLordImg'); if (trueDemonLordImg) trueDemonLordImg.remove();", "let __img = document.getElementById('trueDemonLordImg'); if (__img) __img.remove();")

with open('src/scenes/BossScene.js', 'w', encoding='utf-8') as f:
    f.write(content)
