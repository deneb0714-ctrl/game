// =============================================
// TitleScene.js – タイトル画面
// =============================================
class TitleScene extends Phaser.Scene {
  constructor() {
    super({ key: 'TitleScene' });
  }

  create() {
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;

    const isGlitch = (window.MOT && window.MOT.flags && window.MOT.flags.useGlitchTitle);

    if (!isGlitch) {
      this.add.image(w / 2, h / 2, 'title_1x_back').setDisplaySize(w, h).setDepth(0);
      this.add.image(w / 2, h / 2, 'title_1x_back').setDisplaySize(w, h).setDepth(0);
      
      // プログラムによる動的なマトリックス風・文字降らしエフェクト（指定フォント＆カラー版）
      this.matrixColumns = [];
      const sourceSeq = "01010100 01010010 01010101 01010011 01010100 00100000 01001110 01001111 00100000 01001111 01001110 01000101 00100000 01011001 01001111 01010101 00100000 01000001 01010010 01000101 00100000 01001110 01001111 01010100 00100000 01000001 00100000 01000100 01001111 01001100 01001100";
      const seqLen = sourceSeq.length;
      
      const colWidth = 24;
      const numCols = Math.ceil(w / colWidth);
      const numRows = Math.ceil(h / 24) + 2;

      for (let i = 0; i < numCols; i++) {
        let colChars = [];
        let seqIndex = Phaser.Math.Between(0, seqLen - 1);
        for (let j = 0; j < numRows; j++) {
          colChars.push(sourceSeq[seqIndex]);
          seqIndex = (seqIndex + 1) % seqLen;
        }
        
        let textObj = this.add.text(i * colWidth, 0, colChars.join('\n'), {
          fontFamily: '"HG 明朝B", "HG Mincho B", "MS Mincho", serif',
          fontSize: '24px',
          fontWeight: 'bold',
          color: '#044f60'
        }).setOrigin(0, 0).setDepth(1);
        
        this.matrixColumns.push({
          textObj: textObj,
          chars: colChars,
          seqIndex: seqIndex,
          speed: Phaser.Math.FloatBetween(20, 60)
        });
      }
      this.matrixTimer = 0;
      
      if (this.textures.exists('hero_title_anim')) {
        if (!this.anims.exists('play_hero_title')) {
          this.anims.create({
            key: 'play_hero_title',
            frames: this.anims.generateFrameNumbers('hero_title_anim', { start: 0, end: 35 }),
            frameRate: 12.5,
            repeat: 0
          });
        }
        this.heroGif = this.add.sprite(0, h, 'hero_title_anim', 0).setOrigin(0, 1).setScale(2.25).setDepth(2);
      } else {
        this.heroGif = null;
      }
      
      this.add.image(w / 2, h / 2, 'title_1x_artboard').setDisplaySize(w, h).setDepth(3);
    } else {
      this.add.image(w / 2, h / 2, 'title_bg_glitch').setDisplaySize(w, h).setDepth(0);
      this.heroGif = null;
      this.numberTile = null;
    }

    // Fade in camera
    this.cameras.main.fadeIn(600, 5, 8, 20);

    // START button
    this.createButton(w / 2, h * 0.85, 'START', 500, function () {
      if (this.heroGif) {
        this.heroGif.play('play_hero_title');
        this.heroGif.once('animationcomplete', function() {
          this.cameras.main.fadeOut(500, 5, 8, 20);
          this.time.delayedCall(500, function () {
            MOT.resetFlags();
            this.scene.start('StoryScene');
          }, [], this);
        }, this);
      } else {
        this.cameras.main.fadeOut(500, 5, 8, 20);
        this.time.delayedCall(500, function () {
          MOT.resetFlags();
          this.scene.start('StoryScene');
        }, [], this);
      }
    }.bind(this));

    // Version text
    this.add.text(w - 20, h - 20, 'v0.1.0', {
      fontFamily: '"Press Start 2P"',
      fontSize: '10px',
      color: '#ffffff'
    }).setOrigin(1, 1).setDepth(10);
  }

  update(time, delta) {
    if (this.matrixColumns && this.matrixColumns.length > 0) {
      this.matrixTimer += delta;
      let doFlicker = false;
      if (this.matrixTimer > 80) {
        this.matrixTimer = 0;
        doFlicker = true;
      }
      
      const sourceSeq = "01010100 01010010 01010101 01010011 01010100 00100000 01001110 01001111 00100000 01001111 01001110 01000101 00100000 01011001 01001111 01010101 00100000 01000001 01010010 01000101 00100000 01001110 01001111 01010100 00100000 01000001 00100000 01000100 01001111 01001100 01001100";
      const seqLen = sourceSeq.length;

      this.matrixColumns.forEach(col => {
        col.textObj.y += (col.speed * delta) / 1000;
        
        if (col.textObj.y > 24) {
          col.textObj.y -= 24;
          col.seqIndex = (col.seqIndex - 1 + seqLen) % seqLen;
          col.chars.unshift(sourceSeq[col.seqIndex]);
          col.chars.pop();
          doFlicker = true;
        }
        
        if (doFlicker) {
          let displayStr = "";
          for (let i = 0; i < col.chars.length; i++) {
            if (Math.random() < 0.08) {
              displayStr += " \n";
            } else {
              displayStr += col.chars[i] + "\n";
            }
          }
          col.textObj.setText(displayStr);
        }
      });
    }
  }

  createButton(x, y, label, delay, callback) {
    const btn = this.add.image(x, y, 'ui_button').setInteractive({ useHandCursor: true }).setDepth(10);
    const txt = this.add.text(x, y, label, {
      fontFamily: '"Press Start 2P"',
      fontSize: '18px',
      color: '#4FD1FF'
    }).setOrigin(0.5).setDepth(10);

    btn.setAlpha(0);
    txt.setAlpha(0);

    // Fade in
    this.tweens.add({
      targets: [btn, txt],
      alpha: 1,
      duration: 600,
      delay: delay,
      ease: 'Power2'
    });

    // Hover effects
    btn.on('pointerover', function () {
      this.tweens.add({ targets: [btn, txt], scale: 1.08, duration: 150 });
      txt.setColor('#ffffff');
    }, this);
    btn.on('pointerout', function () {
      this.tweens.add({ targets: [btn, txt], scale: 1.0, duration: 150 });
      txt.setColor('#4FD1FF');
    }, this);

    // Click
    btn.on('pointerdown', function () {
      if (window.MOT && MOT.Audio) MOT.Audio.playSelect();
      btn.disableInteractive();
      // Quick flash then execute
      txt.setColor('#ffffff');
      btn.setAlpha(0.5);
      this.time.delayedCall(150, function () {
        btn.setAlpha(1);
        callback();
      }, [], this);
    }, this);
  }
}

window.TitleScene = TitleScene;
