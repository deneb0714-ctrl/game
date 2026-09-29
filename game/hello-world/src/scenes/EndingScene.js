// =============================================
// EndingScene.js – エンディング表示
// =============================================
class EndingScene extends Phaser.Scene {
  constructor() {
    super({ key: 'EndingScene' });
  }

  init(data) {
    if (data && data.endingKey) {
      if (!window.MOT) window.MOT = {};
      if (!MOT.flags) MOT.flags = {};
      MOT.flags.finalEnding = data.endingKey;
    }
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
        const isHappyEnd = (ending.key === 'hello_world' || ending.key === 'END_ORPHAN');
        if (isHappyEnd) {
            this.cameras.main.setBackgroundColor('#050814');
            this.playCreditsRoll(w, h, ending, () => {
                this.showEndingScreen(w, h, ending);
            });
            return;
        }
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
                else pages.push({text: d.text, speaker: d.speaker, isPost: isPost, bgImage: d.bgImage});
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

            if (p.bgImage) {
                if (bgImg) {
                    this.tweens.add({ targets: bgImg, alpha: 0, duration: 400, onComplete: () => { if (bgImg) bgImg.destroy(); }});
                }
                bgImg = this.add.image(w / 2, h / 2, p.bgImage).setDisplaySize(w, h).setDepth(10).setAlpha(0);
                this.tweens.add({ targets: bgImg, alpha: 1, duration: 800 });
                this.textPhaseElements.push(bgImg);
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

            if (p.isPost && ending.bgImagePost && !this.bgImagePostShown && !p.bgImage) {
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
    
    let cgKey = ending.bgImageEnding || ending.bgImagePost || ending.bgImage;
    if (cgKey) {
        let cgBg = this.add.image(w/2, h/2, cgKey).setDisplaySize(w, h).setDepth(0.5).setAlpha(0);
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

    // Ending title & Subtitle (右下に配置し、背景CGを隠さないレイアウト)
    const rightX = w - 70;
    var titleColor = '#' + ending.color.toString(16).padStart(6, '0');

    // 右下の文字視認性を高めるエレガントな半透明ダークパネル
    let infoPanel = this.add.rectangle(rightX - 300, h - 140, 640, 240, 0x050814, 0.65)
      .setStrokeStyle(2, ending.color, 0.4)
      .setOrigin(0.5)
      .setAlpha(0)
      .setDepth(4);
    this.tweens.add({ targets: infoPanel, alpha: 0.65, duration: 800, delay: 200 });

    var title = this.add.text(rightX, h - 195, ending.title, {
      fontFamily: '"Press Start 2P"',
      fontSize: '46px',
      color: titleColor,
      stroke: '#000000',
      strokeThickness: 8,
      align: 'right',
      shadow: { offsetX: 3, offsetY: 3, color: '#000000', blur: 8, stroke: true, fill: true }
    }).setOrigin(1, 1).setAlpha(0).setDepth(5);

    var subtitle = this.add.text(rightX, h - 145, ending.subtitle, {
      fontFamily: '"DotGothic16"',
      fontSize: '32px',
      color: '#E5E7EB',
      stroke: '#000000',
      strokeThickness: 6,
      align: 'right',
      shadow: { offsetX: 2, offsetY: 2, color: '#000000', blur: 6, stroke: true, fill: true }
    }).setOrigin(1, 1).setAlpha(0).setDepth(5);

    this.tweens.add({ targets: title, alpha: 1, y: h - 205, duration: 800, ease: 'Power2', delay: 300 });
    this.tweens.add({ targets: subtitle, alpha: 1, duration: 800, delay: 500 });

    // Show ending-specific sprite
    var spriteKey = null;

    if (spriteKey) {
      var endSprite = this.add.image(w / 2, h * 0.8, spriteKey).setScale(4).setAlpha(0).setDepth(4);
      this.tweens.add({ targets: endSprite, alpha: 1, duration: 2000, delay: 3000, ease: 'Power2' });
    }

    // Title button (右下情報群の下部に配置。待ち時間を短縮しすぐにEnterキーで決定可能に)
    this.time.delayedCall(400, () => {
      this.createReturnButton(rightX - 160, h - 70);
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
                const prevIntroSeen = (MOT.flags && MOT.flags.bossIntroSeen) ? Object.assign({}, MOT.flags.bossIntroSeen) : {};
                if (MOT.loadFlags) {
                  MOT.loadFlags(saveData.flags);
                } else {
                  const newFlags = JSON.parse(JSON.stringify(saveData.flags));
                  delete newFlags.maxEnergy;
                  Object.assign(MOT.flags, newFlags);
                }
                if (!MOT.flags.bossIntroSeen) MOT.flags.bossIntroSeen = {};
                Object.assign(MOT.flags.bossIntroSeen, prevIntroSeen);
                MOT.flags.diedCount = 0;
                MOT.flags.playerHP = MOT.flags.playerMaxHP || 5;
                MOT.flags.useGlitchTitle = false;
              }
              this.cameras.main.fadeOut(800, 5, 8, 20);
              this.time.delayedCall(800, function () {
                const startIdx = (saveData && saveData.bossIndex !== undefined) ? saveData.bossIndex : 0;
                const isDoctorP2 = Boolean((saveData && saveData.flags && (saveData.flags.doctorPhase2 || saveData.flags.isDoctorPhase2)) || (MOT.flags && (MOT.flags.doctorPhase2 || MOT.flags.isDoctorPhase2)));
                this.scene.start('BossScene', { startBossIndex: startIdx, fromContinue: true, isDoctorPhase2: isDoctorP2 });
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

    // 操作ガイドテキストは削除

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
    var txt = this.add.text(x, y, 'TITLE に戻る [Enter]', {
      fontFamily: '"DotGothic16"',
      fontSize: '22px',
      color: '#4FD1FF',
      stroke: '#000000',
      strokeThickness: 3
    }).setOrigin(0.5).setAlpha(0).setDepth(11);

    this.tweens.add({ 
      targets: [btn, txt], 
      alpha: 1, 
      duration: 500,
      onComplete: () => {
        // キーボード操作中であることを示す穏やかなパルス演出
        this.tweens.add({
          targets: [btn, txt],
          scale: 1.05,
          duration: 900,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut'
        });
      }
    });

    let actionTriggered = false;
    const doReturn = () => {
      if (actionTriggered) return;
      actionTriggered = true;
      cleanup();
      if (MOT.Audio && MOT.Audio.playSelect) MOT.Audio.playSelect();
      this.cameras.main.fadeOut(800, 0, 0, 0);
      this.time.delayedCall(800, function () {
        this.scene.start('TitleScene');
      }, [], this);
    };

    const onKeyDown = (event) => {
      if (actionTriggered) return;
      const isEnter = event.code === 'Enter' || event.key === 'Enter' || event.code === 'NumpadEnter' || event.keyCode === 13;
      const isSpace = event.code === 'Space' || event.key === ' ' || event.keyCode === 32;
      if (isEnter || isSpace) {
        doReturn();
      }
    };

    const cleanup = () => {
      this.input.keyboard.off('keydown', onKeyDown);
      this.input.keyboard.off('keydown-ENTER', doReturn);
      this.input.keyboard.off('keydown-SPACE', doReturn);
    };

    this.input.keyboard.on('keydown', onKeyDown);
    this.input.keyboard.on('keydown-ENTER', doReturn);
    this.input.keyboard.on('keydown-SPACE', doReturn);

    this.events.once('shutdown', cleanup);

    btn.on('pointerover', function () {
      btn.setTint(0x4FD1FF);
      txt.setColor('#ffffff');
    }, this);
    btn.on('pointerout', function () {
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
        const prevIntroSeen = (MOT.flags && MOT.flags.bossIntroSeen) ? Object.assign({}, MOT.flags.bossIntroSeen) : {};
        if (MOT.loadFlags) {
          MOT.loadFlags(saveData.flags);
        } else {
          const newFlags = JSON.parse(JSON.stringify(saveData.flags));
          delete newFlags.maxEnergy;
          Object.assign(MOT.flags, newFlags);
        }
        if (!MOT.flags.bossIntroSeen) MOT.flags.bossIntroSeen = {};
        Object.assign(MOT.flags.bossIntroSeen, prevIntroSeen);
        MOT.flags.diedCount = 0;
        MOT.flags.playerHP = MOT.flags.playerMaxHP || 5;
        MOT.flags.useGlitchTitle = false;
      }
      this.cameras.main.fadeOut(800, 5, 8, 20);
      this.time.delayedCall(800, function () {
        const startIdx = (saveData && saveData.bossIndex !== undefined) ? saveData.bossIndex : 0;
        const isDoctorP2 = Boolean((saveData && saveData.flags && (saveData.flags.doctorPhase2 || saveData.flags.isDoctorPhase2)) || (MOT.flags && (MOT.flags.doctorPhase2 || MOT.flags.isDoctorPhase2)));
        this.scene.start('BossScene', { startBossIndex: startIdx, fromContinue: true, isDoctorPhase2: isDoctorP2 });
      }, [], this);
    }, this);
  }

  playCreditsRoll(w, h, ending, onComplete) {
    try {
      if (this.sound.get('twins_bgm')) {
        this.sound.get('twins_bgm').stop();
      }
      this.sound.play('twins_bgm', { loop: true, volume: 0.25 });
    } catch (e) {
      console.warn("Failed to play credits BGM:", e);
    }

    // Background floating particles
    const particles = [];
    for (let i = 0; i < 70; i++) {
      const p = this.add.circle(
        Phaser.Math.Between(0, w),
        Phaser.Math.Between(0, h),
        Phaser.Math.Between(2, 5),
        Phaser.Math.RND.pick([0x4FD1FF, 0xFFFFFF, 0x93C5FD, 0xFEF08A]),
        Phaser.Math.FloatBetween(0.1, 0.45)
      ).setDepth(1);
      this.tweens.add({
        targets: p,
        y: p.y - Phaser.Math.Between(60, 240),
        alpha: { from: p.alpha, to: 0 },
        duration: Phaser.Math.Between(4000, 8000),
        repeat: -1,
        yoyo: true,
        ease: 'Sine.easeInOut'
      });
      particles.push(p);
    }

    // Credits container
    const creditContainer = this.add.container(w / 2, h + 60).setDepth(10);

    const creditsData = [
      { type: 'title', text: 'Hello World' },
      { type: 'sub', text: '— Staff Credits —' },
      { type: 'spacer', height: 90 },

      { type: 'category', text: '【 ゲーム制作 / 企画 / シナリオ 】' },
      { type: 'name', text: '[Hello World] 制作チーム' },
      { type: 'name', text: 'たまご' },
      { type: 'name', text: 'かすてゐら' },
      { type: 'name', text: 'こひぺん' },
      { type: 'spacer', height: 75 },

      { type: 'category', text: '【 キャラクターデザイン ＆ イラスト 】' },
      { type: 'name', text: '[Hello World] 制作チーム' },
      { type: 'spacer', height: 75 },

      { type: 'category', text: '【 音楽提供 】' },
      { type: 'name', text: '9uo (@muranaka_san)' },
      { type: 'spacer', height: 75 },

      { type: 'category', text: '【 背景素材提供 】' },
      { type: 'name', text: 'ゲームまてりあるず (https://game-materials.com/)' },
      { type: 'sub', text: '：墓、森' },
      { type: 'spacer', height: 25 },
      { type: 'name', text: 'AIPICT (https://aipict.com/)' },
      { type: 'sub', text: '：研究室' },
      { type: 'spacer', height: 25 },
      { type: 'name', text: 'みんちりえ (https://min-chi.material.jp/)' },
      { type: 'sub', text: '：森、墓地' },
      { type: 'spacer', height: 75 },

      { type: 'category', text: '【 開発プラットフォーム 】' },
      { type: 'name', text: 'Powered by Google Antigravity' },
      { type: 'spacer', height: 75 },

      { type: 'category', text: '【 Special Thanks 】' },
      { type: 'name', text: '奥村研究室' },
      { type: 'spacer', height: 60 },
      { type: 'name', text: 'and' },
      { type: 'special', text: 'YOU (Player)' },
      { type: 'spacer', height: 130 },

      { type: 'end', text: 'Thank you for playing!' }
    ];

    let currentY = 0;
    creditsData.forEach(item => {
      let textObj = null;
      if (item.type === 'title') {
        textObj = this.add.text(0, currentY, item.text, {
          fontFamily: '"Press Start 2P"',
          fontSize: '48px',
          color: '#4FD1FF',
          stroke: '#000000',
          strokeThickness: 6,
          align: 'center'
        }).setOrigin(0.5);
        currentY += 60;
      } else if (item.type === 'sub') {
        textObj = this.add.text(0, currentY, item.text, {
          fontFamily: '"DotGothic16"',
          fontSize: '26px',
          color: '#9CA3AF',
          align: 'center'
        }).setOrigin(0.5);
        currentY += 40;
      } else if (item.type === 'category') {
        textObj = this.add.text(0, currentY, item.text, {
          fontFamily: '"DotGothic16"',
          fontSize: '30px',
          color: '#38BDF8',
          fontStyle: 'bold',
          align: 'center'
        }).setOrigin(0.5);
        currentY += 45;
      } else if (item.type === 'name') {
        textObj = this.add.text(0, currentY, item.text, {
          fontFamily: '"DotGothic16"',
          fontSize: '32px',
          color: '#F3F4F6',
          align: 'center'
        }).setOrigin(0.5);
        currentY += 45;
      } else if (item.type === 'special') {
        textObj = this.add.text(0, currentY, item.text, {
          fontFamily: '"Press Start 2P"',
          fontSize: '36px',
          color: '#FDE047',
          stroke: '#000000',
          strokeThickness: 4,
          align: 'center'
        }).setOrigin(0.5);
        currentY += 50;
      } else if (item.type === 'end') {
        textObj = this.add.text(0, currentY, item.text, {
          fontFamily: '"Press Start 2P"',
          fontSize: '34px',
          color: '#FFFFFF',
          stroke: '#4FD1FF',
          strokeThickness: 3,
          align: 'center'
        }).setOrigin(0.5);
        currentY += 50;
      } else if (item.type === 'spacer') {
        currentY += item.height;
      }
      if (textObj) {
        creditContainer.add(textObj);
      }
    });

    // Skip notification
    const skipNotice = this.add.text(w - 40, h - 30, 'SPACE / ENTER / クリック でスキップ', {
      fontFamily: '"DotGothic16"',
      fontSize: '22px',
      color: '#9CA3AF'
    }).setOrigin(1, 1).setDepth(20).setAlpha(0.6);
    this.tweens.add({
      targets: skipNotice,
      alpha: { from: 0.25, to: 0.8 },
      duration: 1200,
      yoyo: true,
      repeat: -1
    });

    let isFinished = false;
    let scrollTween = null;

    const finishRoll = () => {
      if (isFinished) return;
      isFinished = true;

      this.input.off('pointerdown', finishRoll);
      this.input.keyboard.off('keydown-ENTER', finishRoll);
      this.input.keyboard.off('keydown-SPACE', finishRoll);

      if (scrollTween) scrollTween.stop();

      this.tweens.add({
        targets: [creditContainer, skipNotice],
        alpha: 0,
        duration: 900,
        onComplete: () => {
          creditContainer.destroy();
          skipNotice.destroy();
          particles.forEach(p => p.destroy());
          if (onComplete) onComplete();
        }
      });
    };

    this.input.on('pointerdown', finishRoll);
    this.input.keyboard.on('keydown-ENTER', finishRoll);
    this.input.keyboard.on('keydown-SPACE', finishRoll);

    const totalDistance = h + currentY + 200;
    const duration = Math.max(24000, totalDistance * 11);

    scrollTween = this.tweens.add({
      targets: creditContainer,
      y: -currentY - 120,
      duration: duration,
      ease: 'Linear',
      onComplete: () => {
        this.time.delayedCall(1500, () => {
          finishRoll();
        });
      }
    });
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
