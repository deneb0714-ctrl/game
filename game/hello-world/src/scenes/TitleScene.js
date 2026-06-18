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

    // New Title Background
    const bgKey = (window.MOT && window.MOT.flags && window.MOT.flags.useGlitchTitle) ? 'title_bg_glitch' : 'title_bg';
    const bg = this.add.image(w / 2, h / 2, bgKey);
    bg.setDisplaySize(w, h);

    if (bgKey !== 'title_bg_glitch' && this.textures.exists('hero_title_anim')) {
      if (!this.anims.exists('play_hero_title')) {
        this.anims.create({
          key: 'play_hero_title',
          frames: this.anims.generateFrameNumbers('hero_title_anim', { start: 0, end: 25 }),
          frameRate: 8, // ~120ms per frame
          repeat: 0
        });
      }
      this.heroGif = this.add.sprite(w / 4, h, 'hero_title_anim', 0);
      this.heroGif.setOrigin(0.5, 1);
      this.heroGif.setScale(1.8);
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
    }).setOrigin(1, 1);
  }

  createButton(x, y, label, delay, callback) {
    const btn = this.add.image(x, y, 'ui_button').setInteractive({ useHandCursor: true });
    const txt = this.add.text(x, y, label, {
      fontFamily: '"Press Start 2P"',
      fontSize: '18px',
      color: '#4FD1FF'
    }).setOrigin(0.5);

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
