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
      this.numberTile = this.add.tileSprite(w / 2, h / 2, w, h, 'title_1x_number').setDepth(1);
      
      // --- 控えめなノイズ（チラつき）エフェクトの生成 ---
      // 画面全体に3〜5個の黒いブロック（ノイズ）を配置する
      this.noiseBlocks = [];
      const numNoises = 5;
      for (let i = 0; i < numNoises; i++) {
        // 初期位置は画面外
        let block = this.add.rectangle(-100, -100, 64, 64, 0x000000, 0.85).setDepth(1.5);
        this.noiseBlocks.push(block);
      }
      this.noiseTimer = 0;
      // ----------------------------------------
      
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
    if (this.numberTile) {
      // スクロール速度（数字が上から下に落ちていくようにYをマイナス方向へ移動）
      this.numberTile.tilePositionY -= 0.05 * delta;
    }
    
    // 控えめなノイズのチラつきエフェクト
    if (this.noiseBlocks) {
      this.noiseTimer += delta;
      // 約150msごとにノイズブロックの配置をランダムにずらす
      if (this.noiseTimer > 150) {
        this.noiseTimer = 0;
        this.noiseBlocks.forEach(block => {
          block.x = Phaser.Math.Between(0, 1920);
          block.y = Phaser.Math.Between(0, 1080);
          block.width = Phaser.Math.Between(32, 128);
          block.height = Phaser.Math.Between(32, 64);
        });
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
