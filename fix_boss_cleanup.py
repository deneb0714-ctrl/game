import sys
content = open('src/scenes/BossScene.js', 'r', encoding='utf-8').read()
content = content.replace("this.scene.start('EndingScene", "let trueDemonLordImg = document.getElementById('trueDemonLordImg'); if (trueDemonLordImg) trueDemonLordImg.remove(); this.scene.start('EndingScene")
with open('src/scenes/BossScene.js', 'w', encoding='utf-8') as f:
    f.write(content)
