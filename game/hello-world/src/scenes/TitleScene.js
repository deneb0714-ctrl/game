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
      this.matrixCols = 64; // 46pxに合わせて1行の文字数を調整（画面から見切れない程度）
      this.matrixRows = Math.ceil(h / 54) + 3; // 画面を覆う行数（行高さを約54pxと想定）

      this.matrixTextObj = this.add.text(w / 2, 0, "", {
        fontFamily: '"HG 明朝B", "HG Mincho B", "MS Mincho", serif',
        fontSize: '46px', // ご指定の46ptに近い大きさに拡大
        fontWeight: 'bold',
        color: '#044f60',
        align: 'center',
        lineSpacing: 8
      }).setOrigin(0.5, 0).setDepth(1);

      this.matrixTimer = 0;
      this.matrixYOffset = 0;
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
    if (this.matrixTextObj) {
      this.matrixTimer += delta;
      let doFlicker = false;
      if (this.matrixTimer > 80) { // 約80msごとにチカチカを更新
        this.matrixTimer = 0;
        doFlicker = true;
      }
      
      // スクロール処理
      this.matrixYOffset += 40 * delta / 1000;
      const rowHeight = 54; // 46pxフォント + 8px行間
      
      if (this.matrixYOffset >= rowHeight) {
        this.matrixYOffset -= rowHeight;
        // 1行分スクロールしたら、開始文字のインデックスを1行分戻す（上に新しい行が追加されたように見せる）
        this.matrixStartIdx = (this.matrixStartIdx - this.matrixCols) % this.sourceSeq.length;
        if (this.matrixStartIdx < 0) {
          this.matrixStartIdx += this.sourceSeq.length;
        }
        doFlicker = true;
      }
      
      // 全体のY座標を少しずつ移動（画面外の見えない行からスタート）
      this.matrixTextObj.y = this.matrixYOffset - rowHeight;

      // チカチカ処理（個別の文字をランダムでスペースに置き換える）
      if (doFlicker) {
        let displayStr = "";
        let currIdx = this.matrixStartIdx;
        
        for (let r = 0; r < this.matrixRows; r++) {
          for (let c = 0; c < this.matrixCols; c++) {
            // 6%の確率でその瞬間の文字が消える（スペースになる）
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
