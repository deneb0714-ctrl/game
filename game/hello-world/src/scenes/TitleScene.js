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
      
      // プログラムによる動的なマトリックス風・文字降らしエフェクト（単一テキスト・完全整列版）
      const sourceSeq = "01010100 01010010 01010101 01010011 01010100 00100000 01001110 01001111 00100000 01001111 01001110 01000101 00100000 01011001 01001111 01010101 00100000 01000001 01010010 01000101 00100000 01001110 01001111 01010100 00100000 01000001 00100000 01000100 01001111 01001100 01001100 ";
      this.sourceSeq = sourceSeq;
      // 左右に動かすため、画面幅より少し広く（72文字＝8単語分）確保して見切れを防ぐ
      this.matrixCols = 72; 
      this.matrixRows = Math.ceil(h / 68) + 3; 

      this.matrixTextObj = this.add.text(w / 2, 0, "", {
        fontFamily: '"HG 明朝B", "HG Mincho B", "MS Mincho", serif',
        fontSize: '60px', 
        fontWeight: 'bold',
        color: '#044f60', 
        align: 'center',
        lineSpacing: 8
      }).setOrigin(0.5, 0).setDepth(1);

      this.matrixTimer = 0;
      this.matrixXOffset = 0; // Yの代わりにXオフセットを使用
      this.matrixStartIdx = 0;
      
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
      
      this.helloImg = this.add.image(w / 2, h / 2, 'title_1x_hello_world').setDisplaySize(w, h).setDepth(3);
      this.add.image(w / 2, h / 2, 'title_1x_baria').setDisplaySize(w, h).setDepth(3);
    } else {
      // エラータイトルの場合は静止画とSTARTボタンのみ
      this.add.image(w / 2, h / 2, 'title_bg_glitch').setDisplaySize(w, h).setDepth(0);
      this.heroGif = null;
      this.matrixTextObj = null;
    }

    // 砂嵐（ノイズ）用のテクスチャを動的に生成
    if (!this.textures.exists('tv_noise')) {
      const size = 256;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      const imgData = ctx.createImageData(size, size);
      for (let i = 0; i < imgData.data.length; i += 4) {
        const val = Math.floor(Math.random() * 255);
        imgData.data[i] = val;     // R
        imgData.data[i+1] = val;   // G
        imgData.data[i+2] = val;   // B
        imgData.data[i+3] = 255;   // A (はっきりと見せるため不透明に)
      }
      ctx.putImageData(imgData, 0, 0);
      this.textures.addCanvas('tv_noise', canvas);
    }

    // ノイズ用のTileSpriteを画面全体に配置
    this.noiseSprite = this.add.tileSprite(w / 2, h / 2, w, h, 'tv_noise').setDepth(8).setAlpha(0);
    if (!isGlitch && this.helloImg) {
      // 全体のノイズを消し、hello world.png のみにノイズを走らせるためのマスクを設定
      const mask = this.helloImg.createBitmapMask();
      this.noiseSprite.setMask(mask);
    }
    this.isNoisy = false;
    this.noiseTimer = Phaser.Math.Between(2000, 5000); // 最初のノイズまでの時間

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

    // デバッグ用: 数字キーでエンディング直接遷移
    this.input.keyboard.on('keydown', (event) => {
      const keyMap = {
        '1': 'TRUE_PACIFIST',
        '2': 'PUPPET_BAD',
        '3': 'NORMAL_EVERYDAY',
        '4': 'HIDDEN_BRAINWASH',
        '5': 'HAPPY_FRIEND',
        '6': 'NORMAL_USELESS',
        '7': 'BAD_GAMEOVER'
      };
      if (keyMap[event.key]) {
        // テスト用に強制的にエンディングを上書き
        MOT.decideEnding = () => MOT.ENDINGS[keyMap[event.key]];
        this.cameras.main.fadeOut(500, 0, 0, 0);
        this.time.delayedCall(500, () => {
          this.scene.start('EndingScene');
        });
      }
    });
  }

  update(time, delta) {
    if (this.matrixTextObj) {
      this.matrixTimer += delta;
      let doFlicker = false;
      if (this.matrixTimer > 80 || this.matrixTextObj.text === "") { 
        this.matrixTimer = 0;
        doFlicker = true;
      }
      
      // スクロール処理 (左から右へ)
      this.matrixXOffset += 45 * delta / 1000;
      const charWidth = 30; 
      
      if (this.matrixXOffset >= charWidth) {
        this.matrixXOffset -= charWidth;
        this.matrixStartIdx = (this.matrixStartIdx - 1);
        if (this.matrixStartIdx < 0) {
          this.matrixStartIdx += this.sourceSeq.length;
        }
        doFlicker = true;
      }
      
      const w = this.cameras.main.width;
      this.matrixTextObj.x = (w / 2) + this.matrixXOffset;
      this.matrixTextObj.y = -20; 

      if (doFlicker) {
        let displayStr = "";
        let currIdx = this.matrixStartIdx;
        
        for (let r = 0; r < this.matrixRows; r++) {
          for (let c = 0; c < this.matrixCols; c++) {
            if (Math.random() < 0.06) {
              displayStr += " ";
            } else {
              displayStr += this.sourceSeq[currIdx];
            }
            currIdx = (currIdx + 1) % this.sourceSeq.length;
          }
          displayStr += "\n";
        }
        this.matrixTextObj.setText(displayStr);
      }
    }

    // 不定期な砂嵐ノイズ処理
    if (this.noiseSprite) {
      this.noiseTimer -= delta;
      if (!this.isNoisy) {
        // ノイズ発生待機中
        if (this.noiseTimer <= 0) {
          this.isNoisy = true;
          this.noiseTimer = Phaser.Math.Between(50, 300); // ノイズが続く時間(ms)
        }
      } else {
        // ノイズ表示中（アルファを上げてはっきりと見せる）
        this.noiseSprite.setAlpha(Phaser.Math.FloatBetween(0.6, 1.0));
        this.noiseSprite.tilePositionX = Phaser.Math.Between(0, 256);
        this.noiseSprite.tilePositionY = Phaser.Math.Between(0, 256);

        // さらにタイトル文字自体を物理的にブレさせる（グリッチ効果）
        if (this.helloImg) {
          const w = this.cameras.main.width;
          const h = this.cameras.main.height;
          this.helloImg.x = (w / 2) + Phaser.Math.Between(-8, 8);
          this.helloImg.y = (h / 2) + Phaser.Math.Between(-4, 4);
        }

        if (this.noiseTimer <= 0) {
          this.isNoisy = false;
          this.noiseSprite.setAlpha(0);
          this.noiseTimer = Phaser.Math.Between(2000, 6000); // 次にノイズが来るまでの時間(ms)
          
          // ブレを元の位置に戻す
          if (this.helloImg) {
            const w = this.cameras.main.width;
            const h = this.cameras.main.height;
            this.helloImg.x = w / 2;
            this.helloImg.y = h / 2;
          }
        }
      }
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
