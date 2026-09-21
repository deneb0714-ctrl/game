import codecs

content = codecs.open('src/scenes/EndingScene.js', 'r', 'utf-8').read()

old_code = '''    // Dialogue Box Phase
    this.textPhaseElements = [];
    
    let dialogBox = this.add.rectangle(w / 2, h - 150, 1400, 200, 0x0a0a14)'''

new_code = '''    // Dialogue Box Phase
    this.textPhaseElements = [];
    
    let bgImg = null;
    if (ending.bgImage) {
        bgImg = this.add.image(w / 2, h / 2, ending.bgImage).setDisplaySize(w, h).setDepth(10).setAlpha(0);
        this.tweens.add({ targets: bgImg, alpha: 1, duration: 1000 });
        this.textPhaseElements.push(bgImg);
    }
    
    let dialogBox = this.add.rectangle(w / 2, h - 150, 1400, 200, 0x0a0a14)'''

content = content.replace(old_code, new_code)

old_phase2 = '''                if (currentPhase === 1 && ending.postDescription) {
                    currentPhase = 2;
                    fullDesc = ending.postDescription;
                    desc.setText('');
                    charIdx = 0;
                    isTyping = true;
                    if (this.nextIcon) this.nextIcon.setVisible(false);
                    typeTimer = this.time.addEvent({'''

new_phase2 = '''                if (currentPhase === 1 && ending.postDescription) {
                    currentPhase = 2;
                    fullDesc = ending.postDescription;
                    desc.setText('');
                    charIdx = 0;
                    isTyping = true;
                    if (this.nextIcon) this.nextIcon.setVisible(false);
                    
                    if (ending.bgImagePost) {
                        if (bgImg) {
                            this.tweens.add({ targets: bgImg, alpha: 0, duration: 500, onComplete: () => { bgImg.destroy(); }});
                        }
                        bgImg = this.add.image(w / 2, h / 2, ending.bgImagePost).setDisplaySize(w, h).setDepth(10).setAlpha(0);
                        this.tweens.add({ targets: bgImg, alpha: 1, duration: 1000 });
                        this.textPhaseElements.push(bgImg);
                    }
                    
                    typeTimer = this.time.addEvent({'''

content = content.replace(old_phase2, new_phase2)

with codecs.open('src/scenes/EndingScene.js', 'w', 'utf-8') as f:
    f.write(content)
print('Updated EndingScene.js')
