// =============================================
// StoryScene.js – プロローグシーン
// =============================================
class StoryScene extends Phaser.Scene {
  constructor() {
    super({ key: 'StoryScene' });
  }

  create() {
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;

    // Initialize global flags
    window.MOT = window.MOT || {};
    MOT.flags = MOT.flags || {};
    if (MOT.resetFlags) {
      MOT.resetFlags();
    }

    // Dark background initially
    this.cameras.main.setBackgroundColor('#000000');
    // Lab background (invisible at first)
    this.bg = this.add.image(w / 2, h / 2, 'bg_lab').setAlpha(0);

    // Dialogue Data
    this.dialogue = [
      { speaker: '『博士』', text: '...link established', bg: 'black' },
      { speaker: '『博士』', text: '...signal drift: 0.03', bg: 'black' },
      { speaker: '『博士』', text: 'こんにちは。『▱▱』よ。', bg: 'black' },
      { speaker: '『博士』', text: '世界構造の誤差、観測値より逸脱。あなたには、それを正すだけの力がある。', bg: 'black' },
      { speaker: '『博士』', text: '悪性因子、未除去。この世界を救う宿命を背負いなさい。', bg: 'black' },
      { speaker: '『博士』', text: '...trace lost', bg: 'black' },
      { speaker: '『博士』', text: '...reconnecting...', bg: 'black' },

      { speaker: '？？？', text: 'おお、ようやく成功したぞ！目覚めたか！！勇者よ。', bg: 'lab' },
      { speaker: '勇者', text: '……あなたは、誰ですか', bg: 'lab' },
      { speaker: '博士', text: '私か？私はしがない博士だ。そして君をこの世界に呼び覚ました人間だ。', bg: 'lab' },
      { speaker: '博士', text: '遥か昔、この世界は平和だった。しかし突如現れた魔王によって蹂躙され、今はもう平和とは程遠くなってしまった。', bg: 'lab' },
      { speaker: '博士', text: '目覚めてすぐで悪いが、君にはまず、その魔王を倒してきてほしい。', bg: 'lab' },
      { speaker: '勇者', text: '倒す……？', bg: 'lab' },
      { speaker: '博士', text: '君にはそれだけの力がある。', bg: 'lab', choice: true }
    ];

    this.currentIndex = 0;
    this.isWaitingForChoice = false;

    // Portraits Layer
    // Hero portrait (now on the right)
    this.heroImage = this.add.image(w - 300, h / 2, 'hero_stand').setAlpha(0);
    
    var hScale = 750 / this.heroImage.width;
    this.heroImage.setScale(hScale);
    this.heroImage.setY(100 + (this.heroImage.height * hScale) / 2);
    
    this.heroGroup = [this.heroImage];

    // Doctor portrait (now on the left)
    this.doctorImage = this.add.image(300, h / 2, 'doctor_normal').setAlpha(0);
    this.textures.get('doctor_normal').setFilter(Phaser.Textures.FilterMode.LINEAR);
    
    var imgW = this.textures.get('doctor_normal').getSourceImage().width;
    var imgH = this.textures.get('doctor_normal').getSourceImage().height;
    
    var scale = 750 / imgW;
    this.doctorImage.setScale(scale);
    this.doctorImage.setY(100 + (imgH * scale) / 2);
    
    this.doctorGroup = [this.doctorImage];

    // Device comm UI (Doctor's face in a small frame)
    this.deviceCommGroup = this.add.group();
    this.deviceCommFrame = this.add.rectangle(120, h - 320 - 40 + 160, 200, 200, 0x1F2933).setStrokeStyle(4, 0x4FD1FF).setAlpha(0).setDepth(150);
    this.deviceCommFace = this.add.image(120, h - 320 - 40 + 160, 'doctor_face').setAlpha(0).setDepth(151);
    
    // Scale doctor_face to fit inside the 200x200 frame
    let faceW = this.textures.get('doctor_face').getSourceImage().width;
    let faceH = this.textures.get('doctor_face').getSourceImage().height;
    let faceScale = Math.min(190 / faceW, 190 / faceH);
    this.deviceCommFace.setScale(faceScale);
    
    this.deviceCommGroup.add(this.deviceCommFrame);
    this.deviceCommGroup.add(this.deviceCommFace);

    // UI Layer - Dialog Box
    const boxH = 320;
    const boxY = h - boxH - 40;
    this.dialogBox = this.add.rectangle(w / 2, boxY + boxH / 2, w - 160, boxH, 0x000000, 0.85).setStrokeStyle(2, 0x4FD1FF);
    
    // Area Name
    this.areaNameText = this.add.text(1920 - 30, 20, '曙光技研', { fontFamily: '"DotGothic16"', fontSize: '32px', color: '#FFFFFF', backgroundColor: 'rgba(0,0,0,0.5)', padding: { x: 10, y: 5 } }).setOrigin(1, 0).setDepth(100).setAlpha(0);
    
    // Name Tag
    this.nameBox = this.add.rectangle(400, boxY, 240, 60, 0x1F2933).setStrokeStyle(2, 0x4FD1FF);
    this.nameText = this.add.text(400, boxY, '', { fontFamily: '"DotGothic16"', fontSize: '44px', color: '#ffffff' }).setOrigin(0.5);

    // Message Text
    this.messageText = this.add.text(260, boxY + 40, '', {
      fontFamily: '"DotGothic16"',
      fontSize: '48px',
      color: '#E5E7EB',
      wordWrap: { width: w - 300, useAdvancedWrap: true },
      lineSpacing: 10
    });

    // Advance Guide text
    this.contText = this.add.text(w - 240, boxY + boxH - 40, '▶ [SPACE] KEY', {
      fontFamily: '"Press Start 2P"',
      fontSize: '20px',
      color: '#9CA3AF'
    }).setAlpha(0);
    this.tweens.add({ targets: this.contText, alpha: 0.3, yoyo: true, repeat: -1, duration: 500 });

    // Advance on click
    this.input.on('pointerdown', () => {
      if (!this.isWaitingForChoice) {
        this.nextDialogue();
      }
    });

    // Advance on key press (Spaceのみ)
    this.input.keyboard.on('keydown', (event) => {
      if (event.key === ' ' || event.code === 'Space') {
        if (!this.isWaitingForChoice) {
          this.nextDialogue();
        }
      }
    });

    // Start Scene
    this.cameras.main.fadeIn(1000);
    this.showDialogue(this.currentIndex);
  }

  showDialogue(index) {
    if (index >= this.dialogue.length) return;
    const data = this.dialogue[index];

    // Background transition
    if (data.bg === 'lab' && this.bg.alpha === 0) {
      this.tweens.add({ targets: this.bg, alpha: 1, duration: 1000 });
      this.tweens.add({ targets: this.heroGroup, alpha: 1, duration: 1000 });
      this.tweens.add({ targets: this.doctorGroup, alpha: 1, duration: 1000 });
      this.tweens.add({ targets: this.areaNameText, alpha: 1, duration: 1000 });
    }

    // Set Text
    this.nameText.setText(data.speaker);
    this.messageText.setText(data.text);

    // ガイドの表示制御
    if (data.choice) {
      this.contText.setText('▶ [ENTER] KEY');
      this.contText.setAlpha(1);
    } else {
      this.contText.setText('▶ [SPACE] KEY');
      this.contText.setAlpha(1);
    }

    // まばたき演出 (勇者のセリフが切り替わるときのみ)
    const isHero = data.speaker && data.speaker.includes('勇者');
    if (isHero && this.heroImage && this.heroImage.active) {
      this.heroImage.setTexture('hero_stand_blink');
      this.time.delayedCall(150, () => {
        if (this.heroImage && this.heroImage.active) {
          this.heroImage.setTexture('hero_stand');
        }
      });
    }

    // Portrait highlighting and Device UI
    if (data.speaker === '『博士』') {
      this.heroImage.setAlpha(0);
      this.doctorImage.setAlpha(0);
      this.deviceCommFrame.setAlpha(1);
      this.deviceCommFace.setAlpha(1);
      this.nameText.setText('博士');
    } else {
      this.deviceCommFrame.setAlpha(0);
      this.deviceCommFace.setAlpha(0);
      if (this.bg.alpha > 0 || data.bg === 'lab') {
        const isHero = data.speaker.includes('勇者');
        const isDoctor = data.speaker.includes('博士') || data.speaker === '？？？';
        this.heroImage.setAlpha(isHero ? 1 : 0.4);
        this.doctorImage.setAlpha(isDoctor ? 1 : 0.4);
      }
    }

    // Handle Choice
    if (data.choice) {
      this.isWaitingForChoice = true;
      this.time.delayedCall(500, () => {
        this.showChoices();
      });
    }
  }

  nextDialogue() {
    this.currentIndex++;
    if (this.currentIndex < this.dialogue.length) {
      this.showDialogue(this.currentIndex);
    }
  }

    showChoices() {
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;

    this.choice1 = this.createChoiceButton(w / 2, h / 2 - 120, '1「わかった、協力する」', () => {
      this.handleChoice(1);
    });
    this.choice2 = this.createChoiceButton(w / 2, h / 2, '2「訳が分からない。いきなりそんなこと言われても困る」', () => {
      this.handleChoice(2);
    });
    this.choice3 = this.createChoiceButton(w / 2, h / 2 + 120, '3「わかった。早く冒険に行かせて（チュートリアルスキップ）」', () => {
      this.handleChoice(3);
    });

    this.choicesList = [this.choice1, this.choice2, this.choice3];
    this.selectedChoiceIndex = 0;
    this.updateChoiceSelection();

    const self = this;
    this.input.keyboard.on('keydown', function (event) {
      if (!self.isWaitingForChoice) return;
      if (event.code === 'KeyW' || event.code === 'ArrowUp') {
        self.selectedChoiceIndex = (self.selectedChoiceIndex - 1 + self.choicesList.length) % self.choicesList.length;
        self.updateChoiceSelection();
      } else if (event.code === 'KeyS' || event.code === 'ArrowDown') {
        self.selectedChoiceIndex = (self.selectedChoiceIndex + 1) % self.choicesList.length;
        self.updateChoiceSelection();
      } else if (event.code === 'Enter') {
        self.input.keyboard.off('keydown');
        if (window.MOT && MOT.Audio) MOT.Audio.playSelect();
        self.destroyChoices();
        self.choicesList[self.selectedChoiceIndex].callback();
      }
    });
  }

  updateChoiceSelection() {
    const self = this;
    this.choicesList.forEach(function (choice, idx) {
      if (idx === self.selectedChoiceIndex) {
        choice.btn.setFillStyle(0x3a3a5e);
        choice.btn.setStrokeStyle(4, 0xffffff);
        choice.txt.setColor('#ffffff');
        choice.btn.setScale(1.08);
        choice.txt.setScale(1.08);
      } else {
        choice.btn.setFillStyle(0x1F2933);
        choice.btn.setStrokeStyle(2, 0x4FD1FF);
        choice.txt.setColor('#4FD1FF');
        choice.btn.setScale(1.0);
        choice.txt.setScale(1.0);
      }
    });
  }

  destroyChoices() {
    if (this.choice1) {
      if (this.choice1.btn) this.choice1.btn.destroy();
      if (this.choice1.txt) this.choice1.txt.destroy();
    }
    if (this.choice2) {
      if (this.choice2.btn) this.choice2.btn.destroy();
      if (this.choice2.txt) this.choice2.txt.destroy();
    }
    if (this.choice3) {
      if (this.choice3.btn) this.choice3.btn.destroy();
      if (this.choice3.txt) this.choice3.txt.destroy();
    }
  }

  createChoiceButton(x, y, label, callback) {
    const btn = this.add.rectangle(x, y, 1100, 90, 0x1F2933).setStrokeStyle(2, 0x4FD1FF).setInteractive({ useHandCursor: true });
    const txt = this.add.text(x, y, label, { fontFamily: '"DotGothic16"', fontSize: '26px', color: '#4FD1FF' }).setOrigin(0.5);

    const self = this;
    btn.on('pointerover', () => {
      if (self.choicesList) {
        const foundIdx = self.choicesList.findIndex(c => c.btn === btn);
        if (foundIdx !== -1) {
          self.selectedChoiceIndex = foundIdx;
          self.updateChoiceSelection();
        }
      }
    });
    btn.on('pointerdown', () => {
      self.input.keyboard.off('keydown');
      if (window.MOT && MOT.Audio) MOT.Audio.playSelect();
      self.destroyChoices();
      callback();
    });

    return { btn: btn, txt: txt, callback: callback };
  }

  handleChoice(choiceIndex) {
    this.isWaitingForChoice = false; // Block further clicks just in case
    // Prevent normal advancing
    this.input.removeAllListeners('pointerdown');
    if (this.contText) this.contText.setAlpha(0);

    if (choiceIndex === 1) {
      this.nameText.setText('博士');
      this.messageText.setText('気のいい返事をもらえてうれしいよ。早速冒険に向かってもらうとしよう。');
      
      this.doctorImage.setAlpha(1);
      this.heroImage.setAlpha(0.4);

      this.time.delayedCall(3000, () => {
        this.cameras.main.fadeOut(1000);
        this.cameras.main.once('camerafadeoutcomplete', () => {
          this.scene.start('GameScene', { stage: 1 });
        });
      });
    } else if (choiceIndex === 3) {
      this.nameText.setText('博士');
      this.messageText.setText('そ、そうか。やる気は十分のようで嬉しいよ。');
      
      this.doctorImage.setAlpha(1);
      this.heroImage.setAlpha(0.4);

      this.time.delayedCall(3000, () => {
        this.cameras.main.fadeOut(1000);
        this.cameras.main.once('camerafadeoutcomplete', () => {
          this.scene.start('GameScene', { stage: 2 });
        });
      });
    } else {
      this.nameText.setText('博士');
      this.messageText.setText('そうか、それは残念だ。無理なら君にもう用はない。');

      this.doctorImage.setAlpha(1);
      if (this.textures.exists('doctor_open_eyes')) {
        this.doctorImage.setTexture('doctor_open_eyes');
      }
      this.heroImage.setAlpha(0.4);

      this.time.delayedCall(2000, () => {
        // Fade out over 3 seconds
        this.cameras.main.fadeOut(3000);
        
        // Ticks during fadeout
        this.time.delayedCall(0, () => { if (window.MOT && MOT.Audio) MOT.Audio.playTick(); });
        this.time.delayedCall(1000, () => { if (window.MOT && MOT.Audio) MOT.Audio.playTick(); });
        this.time.delayedCall(2000, () => { if (window.MOT && MOT.Audio) MOT.Audio.playTick(); });

        // Shutdown and transition
        this.time.delayedCall(3000, () => {
          if (window.MOT && MOT.Audio) MOT.Audio.playShutdown();
          this.time.delayedCall(1500, () => {
            MOT.flags = MOT.flags || {};
            MOT.flags.useGlitchTitle = true;
            this.scene.start('TitleScene');
          });
        });
      });
    }
  }
}

window.StoryScene = StoryScene;

