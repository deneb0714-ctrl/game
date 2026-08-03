// =============================================
// EndingScene.js – エンディング表示
// =============================================
class EndingScene extends Phaser.Scene {
  constructor() {
    super({ key: 'EndingScene' });
  }

  create() {
    this.sound.stopAll();
    var w = 1920, h = 1080;
    var endingKey = MOT.flags.finalEnding || MOT.decideEnding().key;
    var ending = MOT.ENDINGS[endingKey] || MOT.ENDINGS.normal_daily;

    if (ending.key === 'BAD_GAMEOVER') {
        this.cameras.main.setBackgroundColor(ending.bgColor);
        this.showGameOver(w, h, ending);
        return;
    }

    if (ending.key === 'bad_shutdown' || !ending.description) {
        this.cameras.main.setBackgroundColor(ending.bgColor || '#000000');
        this.showEndingScreen(w, h, ending);
        return;
    }

    // Start with black background for text phase
    this.cameras.main.setBackgroundColor('#000000');
    this.cameras.main.fadeIn(1000, 0, 0, 0);

    // Dialogue Box Phase
    this.textPhaseElements = [];
    
    let dialogBox = this.add.rectangle(w / 2, h - 150, 1400, 200, 0x0a0a14)
        .setStrokeStyle(4, 0x4FD1FF)
        .setDepth(20)
        .setAlpha(0);
        
    var desc = this.add.text(w / 2, h - 150, '', {
      fontFamily: '"DotGothic16"',
      fontSize: '28px',
      color: '#E5E7EB',
      align: 'left',
      lineSpacing: 25,
      wordWrap: { width: 1400, useAdvancedWrap: true }
    }).setOrigin(0.5).setDepth(21).setAlpha(0);

    this.textPhaseElements.push(dialogBox, desc);

    this.tweens.add({ targets: [dialogBox, desc], alpha: 1, duration: 1000, onComplete: () => {
        var fullDesc = ending.description;
        var charIdx = 0;
        var isTyping = true;
        var currentPhase = 1;
        
        var typeTimer = this.time.addEvent({
          delay: 50,
          callback: () => {
            charIdx++;
            desc.setText(fullDesc.substring(0, charIdx));
            if (charIdx >= fullDesc.length) {
              isTyping = false;
              this.showNextCursor(w, h, dialogBox);
            }
          },
          repeat: fullDesc.length - 1
        });

        const finishTextPhase = () => {
            if (isTyping) {
                typeTimer.remove();
                isTyping = false;
                desc.setText(fullDesc);
                this.showNextCursor(w, h, dialogBox);
            } else {
                if (currentPhase === 1 && ending.postDescription) {
                    currentPhase = 2;
                    fullDesc = ending.postDescription;
                    desc.setText('');
                    charIdx = 0;
                    isTyping = true;
                    if (this.nextIcon) this.nextIcon.setVisible(false);
                    typeTimer = this.time.addEvent({
                      delay: 50,
                      callback: () => {
                        charIdx++;
                        desc.setText(fullDesc.substring(0, charIdx));
                        if (charIdx >= fullDesc.length) {
                          isTyping = false;
                          this.showNextCursor(w, h, dialogBox);
                        }
                      },
                      repeat: fullDesc.length - 1
                    });
                } else {
                    this.input.off('pointerdown', finishTextPhase);
                    this.input.keyboard.off('keydown-ENTER', finishTextPhase);
                    this.input.keyboard.off('keydown-SPACE', finishTextPhase);
                    
                    if (this.nextIcon) {
                        this.nextIcon.destroy();
                        this.nextIcon = null;
                    }
                    
                    this.tweens.add({ 
                        targets: this.textPhaseElements, 
                        alpha: 0, 
                        duration: 1000, 
                        onComplete: () => {
                            this.showEndingScreen(w, h, ending);
                        }
                    });
                }
            }
        };
        
        this.input.on('pointerdown', finishTextPhase);
        this.input.keyboard.on('keydown-ENTER', finishTextPhase);
        this.input.keyboard.on('keydown-SPACE', finishTextPhase);
    }});
  }

  showNextCursor(w, h, dialogBox) {
      if (this.nextIcon) {
          this.nextIcon.setVisible(true);
          return;
      }
      this.nextIcon = this.add.text(dialogBox.x + dialogBox.width/2 - 40, dialogBox.y + dialogBox.height/2 - 40, '▼', {fontFamily: '"DotGothic16"', fontSize: '24px', color: '#4FD1FF'}).setDepth(21).setOrigin(0.5);
      this.tweens.add({ targets: this.nextIcon, alpha: 0, yoyo: true, repeat: -1, duration: 500 });
      this.textPhaseElements.push(this.nextIcon);
  }

  showEndingScreen(w, h, ending) {
    if (window.MOT && MOT.clearSaveData) MOT.clearSaveData();
    // Change background smoothly (we do this by adding a colored rect and fading it in)
    let endBg = this.add.rectangle(w/2, h/2, w, h, parseInt(ending.bgColor.replace('#', '0x'))).setDepth(0).setAlpha(0);
    this.tweens.add({ targets: endBg, alpha: 1, duration: 1500 });

    // Background particles
    for (var i = 0; i < 60; i++) {
        var p = this.add.circle(
            Phaser.Math.Between(0, w),
            Phaser.Math.Between(0, h),
            Phaser.Math.Between(2, 6),
            ending.color,
            Phaser.Math.FloatBetween(0.05, 0.4)
        ).setDepth(1).setAlpha(0);
        
        this.tweens.add({ targets: p, alpha: p.alpha, duration: 1500 }); // Fade in particles
        
        this.tweens.add({
            targets: p,
            y: p.y - Phaser.Math.Between(50, 200),
            alpha: 0,
            duration: Phaser.Math.Between(3000, 7000),
            repeat: -1,
            yoyo: true,
            ease: 'Sine.easeInOut'
        });
    }

    // Ending title (Larger)
    var titleColor = '#' + ending.color.toString(16).padStart(6, '0');
    var title = this.add.text(w / 2, h * 0.35, ending.title, {
      fontFamily: '"Press Start 2P"',
      fontSize: '80px',
      color: titleColor,
      stroke: '#000000',
      strokeThickness: 8
    }).setOrigin(0.5).setAlpha(0).setDepth(5);

    // Subtitle (Larger)
    var subtitle = this.add.text(w / 2, h * 0.55, ending.subtitle, {
      fontFamily: '"DotGothic16"',
      fontSize: '52px',
      color: '#E5E7EB'
    }).setOrigin(0.5).setAlpha(0).setDepth(5);

    this.tweens.add({ targets: title, alpha: 1, y: h * 0.3, duration: 1500, ease: 'Power2', delay: 500 });
    this.tweens.add({ targets: subtitle, alpha: 1, duration: 1500, delay: 1500 });

    // Show ending-specific sprite
    var spriteKey = null;
    if (ending.key === 'END_ORPHAN') spriteKey = 'demon_lord';

    if (spriteKey) {
      var endSprite = this.add.image(w / 2, h * 0.8, spriteKey).setScale(4).setAlpha(0).setDepth(4);
      this.tweens.add({ targets: endSprite, alpha: 1, duration: 2000, delay: 3000, ease: 'Power2' });
    }

    // Title button
    this.time.delayedCall(4000, () => {
      this.createReturnButton(w / 2, h * 0.90);
    });
  }

  showGameOver(w, h, ending) {
      if (!this.textures.exists('tv_noise')) {
        const size = 256;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        const imgData = ctx.createImageData(size, size);
        for (let i = 0; i < imgData.data.length; i += 4) {
          const val = Math.floor(Math.random() * 255);
          imgData.data[i] = val;
          imgData.data[i+1] = val;
          imgData.data[i+2] = val;
          imgData.data[i+3] = 255;
        }
        ctx.putImageData(imgData, 0, 0);
        this.textures.addCanvas('tv_noise', canvas);
      }
      
      this.noiseSprite = this.add.tileSprite(w / 2, h / 2, w, h, 'tv_noise').setDepth(0).setAlpha(0.2);
      
      if (this.textures.exists('game_over_img')) {
        this.add.image(w / 2, h / 2, 'game_over_img').setDisplaySize(w, h).setDepth(1);
      }

      this.cameras.main.fadeIn(1500, 0, 0, 0);
      
      this.time.delayedCall(3000, () => {
        this.createReturnButton(w / 2, h * 0.92);
      });
  }

  createReturnButton(x, y) {
    var btn = this.add.image(x, y, 'ui_button').setInteractive({ useHandCursor: true }).setAlpha(0).setDepth(10);
    var txt = this.add.text(x, y, 'TITLE に戻る', {
      fontFamily: '"DotGothic16"',
      fontSize: '24px',
      color: '#4FD1FF'
    }).setOrigin(0.5).setAlpha(0).setDepth(11);

    this.tweens.add({ targets: [btn, txt], alpha: 1, duration: 800 });

    btn.on('pointerover', function () {
      this.tweens.add({ targets: [btn, txt], scale: 1.08, duration: 150 });
      txt.setColor('#ffffff');
    }, this);
    btn.on('pointerout', function () {
      this.tweens.add({ targets: [btn, txt], scale: 1.0, duration: 150 });
      txt.setColor('#4FD1FF');
    }, this);
    btn.on('pointerdown', function () {
      this.cameras.main.fadeOut(800, 0, 0, 0);
      this.time.delayedCall(800, function () {
        this.scene.start('TitleScene');
      }, [], this);
    }, this);
  }

  update(time, delta) {
    if (this.noiseSprite) {
        this.noiseSprite.tilePositionX = Phaser.Math.Between(0, 256);
        this.noiseSprite.tilePositionY = Phaser.Math.Between(0, 256);
        this.noiseSprite.setAlpha(0.15);
    }
  }
}

window.EndingScene = EndingScene;
