import sys
with open('src/scenes/BossScene.js', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add isLabTransition logic to update()
content = content.replace("    this.updateHUD();", """    if (this.isLabTransition) {
        if (this.enemyBullets) this.enemyBullets.clear(true, true);
        if (this.playerBullets) this.playerBullets.clear(true, true);
        if (this.playerHitboxGraphics) this.playerHitboxGraphics.clear();
        if (this.currentBoss) { this.currentBoss.setActive(false); this.currentBoss.setVisible(false); }
        if (this.sisterBoss) { this.sisterBoss.setActive(false); this.sisterBoss.setVisible(false); }
    }
    this.updateHUD();""")

# 2. Set isLabTransition = true in Freedom Ending and remove the tween
freedom_tween = "this.tweens.add({ targets: [trueDemonLordBg, trueDemonLord], alpha: 0, duration: 1000 });"
content = content.replace(freedom_tween, """let fadeImg = document.getElementById('trueDemonLordImg');
                          if(fadeImg) { fadeImg.style.transition = 'opacity 1s'; fadeImg.style.opacity = '0'; }""")

freedom_hide_start = "// 立ち絵と背景を消して、真の魔王を表示"
content = content.replace(freedom_hide_start, "this.isLabTransition = true;\n                          " + freedom_hide_start)


# 3. Set isLabTransition = true in Bad Ending and fix DOM block
bad_dom_block = """                      // Put the entire Phaser DOM container behind the canvas
                      if (this.game.domContainer) {
                          this.game.domContainer.style.zIndex = '-1';
                      }

                      let trueDemonLord = this.add.dom(w / 2, h / 2, 'img').setDepth(89);
                      trueDemonLord.node.src = 'assets/images/true_demon_lord.gif?v=' + window.GAME_VERSION;
                      trueDemonLord.node.style.width = '1920px';
                      trueDemonLord.node.style.height = '1080px';
                      trueDemonLord.node.style.objectFit = 'cover';
                      trueDemonLord.node.style.pointerEvents = 'none';
                      trueDemonLord.updateSize();"""

new_bad_dom_block = """                      let trueDemonLordImg = document.createElement('img');
                      trueDemonLordImg.id = 'trueDemonLordImg';
                      trueDemonLordImg.src = 'assets/images/true_demon_lord.gif?v=' + window.GAME_VERSION;
                      trueDemonLordImg.style.position = 'absolute';
                      trueDemonLordImg.style.top = '0';
                      trueDemonLordImg.style.left = '0';
                      trueDemonLordImg.style.width = '100%';
                      trueDemonLordImg.style.height = '100%';
                      trueDemonLordImg.style.objectFit = 'cover';
                      trueDemonLordImg.style.zIndex = '-1';
                      trueDemonLordImg.style.pointerEvents = 'none';
                      document.getElementById('game-root').appendChild(trueDemonLordImg);"""

content = content.replace(bad_dom_block, "this.isLabTransition = true;\n" + new_bad_dom_block)

# Remove trueDemonLordBg tween if it exists in bad ending (it doesn't seem to, but just in case)
content = content.replace("this.tweens.add({ targets: [trueDemonLordBg, trueDemonLord], alpha: 0, duration: 1000 });", "")

with open('src/scenes/BossScene.js', 'w', encoding='utf-8') as f:
    f.write(content)
