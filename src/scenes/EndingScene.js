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

    if (!ending.description) {
        this.cameras.main.setBackgroundColor(ending.bgColor || '#000000');
        this.showEndingScreen(w, h, ending);
        return;
    }

    // Start with black background for text phase
    this.cameras.main.setBackgroundColor('#000000');
    this.cameras.main.fadeIn(1000, 0, 0, 0);

    // Dialogue Box Phase
    this.textPhaseElements = [];
    
    let bgImg = null;
    if (ending.bgImage) {
        bgImg = this.add.image(w / 2, h / 2, ending.bgImage).setDisplaySize(w, h).setDepth(10).setAlpha(0);
        this.tweens.add({ targets: bgImg, alpha: 1, duration: 1000 });
        this.textPhaseElements.push(bgImg);
    }
    
    let dialogBox = this.add.rectangle(w / 2, h - 150, 1400, 200, 0x0a0a14)
        .setStrokeStyle(4, 0x4FD1FF)
        .setDepth(20)
        .setAlpha(0);
        
    var desc = this.add.text(w / 2 - 660, h - 220, '', {
      fontFamily: '"DotGothic16"',
      fontSize: '28px',
      color: '#E5E7EB',
      align: 'left',
      lineSpacing: 25,
      wordWrap: { width: 1320, useAdvancedWrap: true }
    }).setOrigin(0).setDepth(21).setAlpha(0);

    let nameBg = this.add.rectangle(w / 2 - 700, h - 250 - 40, 200, 40, 0x4FD1FF).setOrigin(0, 0).setDepth(21).setAlpha(0);
    let nameText = this.add.text(w / 2 - 690, h - 250 - 32, '', { fontFamily: '"DotGothic16"', fontSize: '24px', color: '#000000' }).setOrigin(0, 0).setDepth(22).setAlpha(0);

    this.textPhaseElements.push(dialogBox, desc, nameBg, nameText);

    // Build pages
    var pages = [];
    const parseDesc = (descVal, isPost) => {
        if (!descVal) return;
        if (Array.isArray(descVal)) {
            descVal.forEach(d => {
                if (typeof d === 'string') pages.push({text: d, speaker: null, isPost: isPost});
                else pages.push({text: d.text, speaker: d.speaker, isPost: isPost});
            });
        } else {
            pages.push({text: descVal, speaker: null, isPost: isPost});
        }
    };
    parseDesc(ending.description, false);
    parseDesc(ending.postDescription, true);

    if (pages.length === 0) {
      dialogBox.destroy();
      desc.destroy();
      nameBg.destroy();
      nameText.destroy();
      this.showEndingScreen(w, h, ending);
      return;
    }
    this.tweens.add({ targets: [dialogBox, desc, nameBg, nameText], alpha: 1, duration: 1000, onComplete: () => {
        var pageIdx = 0;
        var fullDesc = pages[pageIdx].text;
        var charIdx = 0;
        var isTyping = true;
        var typeTimer = null;

        const startPage = () => {
            let p = pages[pageIdx];
            fullDesc = p.text;
            desc.setText('');
            charIdx = 0;
            isTyping = true;
            if (this.nextIcon) this.nextIcon.setVisible(false);

            if (p.speaker) {
                nameBg.setVisible(true);
                nameText.setVisible(true);
                nameText.setText(p.speaker);
            } else {
                nameBg.setVisible(false);
                nameText.setVisible(false);
            }

            let proceedTyping = () => {
                if (!isTyping) return; // User already skipped
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
            };

            if (p.isPost && ending.bgImagePost && !this.bgImagePostShown) {
                this.bgImagePostShown = true;
                if (ending.key === 'normal_daily') {
                    isTyping = true;
                    // static effect
                    let noiseObj = this.add.image(w/2, h/2, 'noise_tex').setDisplaySize(w, h).setDepth(11).setAlpha(0.6).setBlendMode(Phaser.BlendModes.ADD);
                    this.tweens.add({
                        targets: noiseObj,
                        alpha: 0.3,
                        duration: 50,
                        yoyo: true,
                        repeat: -1
                    });
                    this.cameras.main.shake(1000, 0.02);
                    if (window.MOT && MOT.Audio && MOT.Audio.playCrack) MOT.Audio.playCrack();
                    else if (window.MOT && MOT.Audio && MOT.Audio.playExplosion) MOT.Audio.playExplosion();
                    
                    this.time.delayedCall(1000, () => {
                        if (bgImg) { bgImg.setTexture('cg_daily_2'); bgImg.setDisplaySize(w, h); }
                        noiseObj.destroy();
                        this.time.delayedCall(1500, () => {
                            if (bgImg) { bgImg.setTexture('cg_daily_3'); bgImg.setDisplaySize(w, h); }
                            proceedTyping();
                        });
                    });
                } else {
                    if (bgImg) {
                        this.tweens.add({ targets: bgImg, alpha: 0, duration: 500, onComplete: () => { bgImg.destroy(); }});
                    }
                    bgImg = this.add.image(w / 2, h / 2, ending.bgImagePost).setDisplaySize(w, h).setDepth(10).setAlpha(0);
                    this.tweens.add({ targets: bgImg, alpha: 1, duration: 1000 });
                    this.textPhaseElements.push(bgImg);
                    proceedTyping();
                }
            } else {
                proceedTyping();
            }
        };

        startPage();

        const finishTextPhase = () => {
            if (isTyping) {
                if (typeTimer) typeTimer.remove();
                isTyping = false;
                desc.setText(fullDesc);
                this.showNextCursor(w, h, dialogBox);
            } else {
                pageIdx++;
                if (pageIdx < pages.length) {
                    startPage();
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
    if (window.MOT && MOT.saveEnding) MOT.saveEnding(ending.key);
    // Change background smoothly (we do this by adding a colored rect and fading it in)
    let endBg = this.add.rectangle(w/2, h/2, w, h, parseInt(ending.bgColor.replace('#', '0x'))).setDepth(0).setAlpha(0);
    this.tweens.add({ targets: endBg, alpha: 1, duration: 1500 });
    
    if (ending.bgImageEnding) {
        let cgBg = this.add.image(w/2, h/2, ending.bgImageEnding).setDisplaySize(w, h).setDepth(0.5).setAlpha(0);
        this.tweens.add({ targets: cgBg, alpha: 1, duration: 1500 });
    }

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
    // (Removed END_ORPHAN sprite to show CG background instead)

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
        const hasSave = window.MOT && MOT.hasSaveData && MOT.hasSaveData();
        const menuOptions = [];

        if (hasSave) {
          menuOptions.push({
            label: 'CONTINUE',
            y: h * 0.86,
            action: () => {
              if (MOT.Audio && MOT.Audio.playSelect) MOT.Audio.playSelect();
              const saveData = MOT.loadGame();
              if (saveData && saveData.flags) {
                MOT.flags = JSON.parse(JSON.stringify(saveData.flags));
                MOT.flags.diedCount = 0;
                MOT.flags.playerHP = MOT.flags.playerMaxHP || 5;
                MOT.flags.useGlitchTitle = false;
              }
              this.cameras.main.fadeOut(800, 5, 8, 20);
              this.time.delayedCall(800, function () {
                const startIdx = (saveData && saveData.bossIndex !== undefined) ? saveData.bossIndex : 0;
                this.scene.start('BossScene', { startBossIndex: startIdx, fromContinue: true });
              }, [], this);
            }
          });
          menuOptions.push({
            label: 'TITLE に戻る',
            y: h * 0.94,
            action: () => {
              if (MOT.Audio && MOT.Audio.playSelect) MOT.Audio.playSelect();
              this.cameras.main.fadeOut(800, 0, 0, 0);
              this.time.delayedCall(800, function () {
                this.scene.start('TitleScene');
              }, [], this);
            }
          });
        } else {
          menuOptions.push({
            label: 'TITLE に戻る',
            y: h * 0.90,
            action: () => {
              if (MOT.Audio && MOT.Audio.playSelect) MOT.Audio.playSelect();
              this.cameras.main.fadeOut(800, 0, 0, 0);
              this.time.delayedCall(800, function () {
                this.scene.start('TitleScene');
              }, [], this);
            }
          });
        }

        this.setupGameOverMenu(w, h, menuOptions);
      });
  }

  setupGameOverMenu(w, h, menuOptions) {
    this.gameOverMenuIndex = 0;
    this.gameOverMenuButtons = [];
    this.gameOverMenuActionTaken = false;

    // 操作ガイドテキスト
    const guideText = this.add.text(w / 2, h * 0.985, '▶ ↑↓ / W S : 選択  |  [ENTER] : 決定', {
      fontFamily: '"DotGothic16", sans-serif',
      fontSize: '18px',
      color: '#9CA3AF'
    }).setOrigin(0.5, 1).setAlpha(0).setDepth(11);
    this.tweens.add({ targets: guideText, alpha: 0.8, duration: 600 });
    this.tweens.add({ targets: guideText, alpha: 0.35, yoyo: true, repeat: -1, duration: 800, delay: 600 });

    const self = this;
    menuOptions.forEach((opt, idx) => {
      const btn = this.add.image(w / 2, opt.y, 'ui_button').setInteractive({ useHandCursor: true }).setAlpha(0).setDepth(10);
      const txt = this.add.text(w / 2, opt.y, opt.label, {
        fontFamily: '"DotGothic16"',
        fontSize: '24px',
        color: '#4FD1FF'
      }).setOrigin(0.5).setAlpha(0).setDepth(11);

      this.tweens.add({ targets: [btn, txt], alpha: 1, duration: 800 });

      const item = { btn, txt, action: opt.action };
      this.gameOverMenuButtons.push(item);

      btn.on('pointerover', function () {
        if (self.gameOverMenuActionTaken) return;
        self.gameOverMenuIndex = idx;
        self.updateGameOverMenuSelection();
      });

      btn.on('pointerdown', function () {
        if (self.gameOverMenuActionTaken) return;
        self.gameOverMenuActionTaken = true;
        if (self._onGameOverKeyDown) {
          self.input.keyboard.off('keydown', self._onGameOverKeyDown);
        }
        opt.action();
      });
    });

    this.updateGameOverMenuSelection = function() {
      self.gameOverMenuButtons.forEach((item, idx) => {
        if (idx === self.gameOverMenuIndex) {
          self.tweens.add({ targets: [item.btn, item.txt], scale: 1.10, duration: 120 });
          item.btn.setTint(0x4FD1FF);
          item.txt.setColor('#ffffff');
        } else {
          self.tweens.add({ targets: [item.btn, item.txt], scale: 1.0, duration: 120 });
          item.btn.clearTint();
          item.txt.setColor('#4FD1FF');
        }
      });
    };

    this.updateGameOverMenuSelection();

    this._onGameOverKeyDown = (event) => {
      if (self.gameOverMenuActionTaken) return;
      if (event.code === 'KeyW' || event.code === 'ArrowUp') {
        if (MOT.Audio && MOT.Audio.playSelect) MOT.Audio.playSelect();
        self.gameOverMenuIndex = (self.gameOverMenuIndex - 1 + self.gameOverMenuButtons.length) % self.gameOverMenuButtons.length;
        self.updateGameOverMenuSelection();
      } else if (event.code === 'KeyS' || event.code === 'ArrowDown') {
        if (MOT.Audio && MOT.Audio.playSelect) MOT.Audio.playSelect();
        self.gameOverMenuIndex = (self.gameOverMenuIndex + 1) % self.gameOverMenuButtons.length;
        self.updateGameOverMenuSelection();
      } else if (event.code === 'Enter' || event.code === 'Space') {
        self.gameOverMenuActionTaken = true;
        if (self._onGameOverKeyDown) {
          self.input.keyboard.off('keydown', self._onGameOverKeyDown);
        }
        const selected = self.gameOverMenuButtons[self.gameOverMenuIndex];
        if (selected && selected.action) {
          selected.action();
        }
      }
    };

    this.input.keyboard.on('keydown', this._onGameOverKeyDown);

    this.events.once('shutdown', () => {
      if (self._onGameOverKeyDown) {
        self.input.keyboard.off('keydown', self._onGameOverKeyDown);
      }
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

    let actionTriggered = false;
    const doReturn = () => {
      if (actionTriggered) return;
      actionTriggered = true;
      if (onKeyDown) this.input.keyboard.off('keydown', onKeyDown);
      if (MOT.Audio && MOT.Audio.playSelect) MOT.Audio.playSelect();
      this.cameras.main.fadeOut(800, 0, 0, 0);
      this.time.delayedCall(800, function () {
        this.scene.start('TitleScene');
      }, [], this);
    };

    const onKeyDown = (event) => {
      if (event.code === 'Enter' || event.code === 'Space') {
        doReturn();
      }
    };
    this.input.keyboard.on('keydown', onKeyDown);
    this.events.once('shutdown', () => {
      this.input.keyboard.off('keydown', onKeyDown);
    });

    btn.on('pointerover', function () {
      this.tweens.add({ targets: [btn, txt], scale: 1.08, duration: 150 });
      btn.setTint(0x4FD1FF);
      txt.setColor('#ffffff');
    }, this);
    btn.on('pointerout', function () {
      this.tweens.add({ targets: [btn, txt], scale: 1.0, duration: 150 });
      btn.clearTint();
      txt.setColor('#4FD1FF');
    }, this);
    btn.on('pointerdown', doReturn, this);
  }

  createContinueButton(x, y) {
    if (!window.MOT || !MOT.loadGame || !MOT.hasSaveData()) return;
    
    var btn = this.add.image(x, y, 'ui_button').setInteractive({ useHandCursor: true }).setAlpha(0).setDepth(10);
    var txt = this.add.text(x, y, 'CONTINUE', {
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
      if (MOT.Audio && MOT.Audio.playSelect) MOT.Audio.playSelect();
      const saveData = MOT.loadGame();
      if (saveData && saveData.flags) {
        MOT.flags = JSON.parse(JSON.stringify(saveData.flags));
        MOT.flags.diedCount = 0;
        MOT.flags.playerHP = MOT.flags.playerMaxHP || 5;
        MOT.flags.useGlitchTitle = false;
      }
      this.cameras.main.fadeOut(800, 5, 8, 20);
      this.time.delayedCall(800, function () {
        const startIdx = (saveData && saveData.bossIndex !== undefined) ? saveData.bossIndex : 0;
        this.scene.start('BossScene', { startBossIndex: startIdx, fromContinue: true });
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
