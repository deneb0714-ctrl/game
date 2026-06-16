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

    // Dark background initially
    this.cameras.main.setBackgroundColor('#000000');
    // Lab background (invisible at first)
    this.bg = this.add.image(w / 2, h / 2, 'bg_stage1').setAlpha(0);

    // Dialogue Data
    this.dialogue = [
      { speaker: '誰かの声', text: 'さぁ、起きるのだ。勇者よ。', bg: 'black' },
      { speaker: '誰かの声', text: 'そして魔王を倒し、この世界を救う宿命を背負え。', bg: 'black' },
      { speaker: '？？？', text: 'おお、ようやく成功したぞ！目覚めたか！！勇者よ。', bg: 'lab' },
      { speaker: '勇者？', text: '……あなたは、誰ですか', bg: 'lab' },
      { speaker: '博士', text: '私か？私はしがない博士だ。そして君を呼んだ人間だ。', bg: 'lab' },
      { speaker: '博士', text: '遥か昔、この世界は平和だった。しかし突如現れた魔王によって蹂躙され、今はもう平和とは程遠い世界になってしまった。', bg: 'lab' },
      { speaker: '博士', text: '目覚めてすぐで悪いが、君にはまず、その魔王を倒してきてほしいのだ。', bg: 'lab' },
      { speaker: '勇者', text: '倒す……？', bg: 'lab' },
      { speaker: '博士', text: '君にはそれだけの力がある。', bg: 'lab', choice: true }
    ];

    this.currentIndex = 0;
    this.isWaitingForChoice = false;

    // Portraits Layer
    // Hero portrait (left) - bust-up crop of full-body image
    this.heroImage = this.add.image(300, h / 2, 'hero_stand').setAlpha(0);
    this.textures.get('hero_stand').setFilter(Phaser.Textures.FilterMode.LINEAR);
    var hImgW = this.textures.get('hero_stand').getSourceImage().width;
    var hImgH = this.textures.get('hero_stand').getSourceImage().height;
    
    var hScale = 400 / hImgW;
    this.heroImage.setScale(hScale);
    
    this.heroImage.setY(h / 2 - 300 + (hImgH * hScale) / 2);
    
    var hCropH = 600 / hScale;
    if (hCropH < hImgH) {
      this.heroImage.setCrop(0, 0, hImgW, hCropH);
    }
    
    this.heroGroup = [this.heroImage];

    // Doctor portrait (right) - bust-up crop of full-body image
    this.doctorImage = this.add.image(w - 300, h / 2, 'doctor_stand').setAlpha(0);
    // ガビガビ（ピクセルアート用ニアレストネイバー補間）を解除して滑らかにする
    this.textures.get('doctor_stand').setFilter(Phaser.Textures.FilterMode.LINEAR);
    
    var imgW = this.textures.get('doctor_stand').getSourceImage().width;
    var imgH = this.textures.get('doctor_stand').getSourceImage().height;
    
    // Scale to fit width of 400
    var scale = 400 / imgW;
    this.doctorImage.setScale(scale);
    
    // Align top of the image with the top of the original 400x600 box (box center was h/2, top is h/2 - 300)
    this.doctorImage.setY(h / 2 - 300 + (imgH * scale) / 2);
    
    // Crop the bottom so it doesn't exceed 600px in scaled height
    var cropH = 600 / scale;
    if (cropH < imgH) {
      this.doctorImage.setCrop(0, 0, imgW, cropH);
    }
    
    this.doctorGroup = [this.doctorImage];

    // UI Layer - Dialog Box
    const boxH = 250;
    const boxY = h - boxH - 40;
    this.dialogBox = this.add.rectangle(w / 2, boxY + boxH / 2, w - 160, boxH, 0x000000, 0.85).setStrokeStyle(2, 0x4FD1FF);
    
    // Name Tag
    this.nameBox = this.add.rectangle(200, boxY, 240, 60, 0x1F2933).setStrokeStyle(2, 0x4FD1FF);
    this.nameText = this.add.text(200, boxY, '', { fontFamily: '"DotGothic16"', fontSize: '32px', color: '#ffffff' }).setOrigin(0.5);

    // Message Text
    this.messageText = this.add.text(120, boxY + 40, '', {
      fontFamily: '"DotGothic16"',
      fontSize: '36px',
      color: '#E5E7EB',
      wordWrap: { width: w - 240, useAdvancedWrap: true },
      lineSpacing: 10
    });

    // Advance on click
    this.input.on('pointerdown', () => {
      if (!this.isWaitingForChoice) {
        this.nextDialogue();
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
    }

    // Set Text
    this.nameText.setText(data.speaker);
    this.messageText.setText(data.text);

    // Portrait highlighting
    if (this.bg.alpha > 0 || data.bg === 'lab') {
      const isHero = data.speaker.includes('勇者');
      const isDoctor = data.speaker.includes('博士') || data.speaker === '？？？';
      this.heroImage.setAlpha(isHero ? 1 : 0.4);
      this.doctorImage.setAlpha(isDoctor ? 1 : 0.4);
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

    this.choice1 = this.createChoiceButton(w / 2, h / 2 - 60, '1「わかった、協力する」', () => {
      this.handleChoice(1);
    });
    this.choice2 = this.createChoiceButton(w / 2, h / 2 + 60, '2「訳が分からない。いきなりそんなこと言われても困る」', () => {
      this.handleChoice(2);
    });
  }

  createChoiceButton(x, y, label, callback) {
    const btn = this.add.rectangle(x, y, 900, 80, 0x1F2933).setStrokeStyle(2, 0x4FD1FF).setInteractive({ useHandCursor: true });
    const txt = this.add.text(x, y, label, { fontFamily: '"DotGothic16"', fontSize: '32px', color: '#4FD1FF' }).setOrigin(0.5);

    btn.on('pointerover', () => {
      btn.setFillStyle(0x3a3a5e);
      txt.setColor('#ffffff');
    });
    btn.on('pointerout', () => {
      btn.setFillStyle(0x1F2933);
      txt.setColor('#4FD1FF');
    });
    btn.on('pointerdown', () => {
      if (window.MOT && MOT.Audio) MOT.Audio.playSelect();
      this.choice1.btn.destroy(); this.choice1.txt.destroy();
      this.choice2.btn.destroy(); this.choice2.txt.destroy();
      callback();
    });

    return { btn, txt };
  }

  handleChoice(choiceIndex) {
    this.isWaitingForChoice = false; // Block further clicks just in case
    // Prevent normal advancing
    this.input.removeAllListeners('pointerdown');

    if (choiceIndex === 1) {
      this.nameText.setText('博士');
      this.messageText.setText('気のいい返事をもらえてうれしいよ。早速冒険に向かってもらうとしよう。');
      
      this.doctorImage.setAlpha(1);
      this.heroImage.setAlpha(0.4);

      this.time.delayedCall(3000, () => {
        this.cameras.main.fadeOut(1000);
        this.time.delayedCall(1000, () => {
          this.scene.start('GameScene', { stage: 1 });
        });
      });
    } else {
      this.nameText.setText('博士');
      this.messageText.setText('そうか、それは残念だ。無理なら君にもう用はない。');

      this.doctorImage.setAlpha(1);
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
