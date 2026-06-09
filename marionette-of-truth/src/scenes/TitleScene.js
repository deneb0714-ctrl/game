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

    // Dark background with particles
    this.cameras.main.setBackgroundColor('#050814');

    // Floating particles
    this.particles = [];
    for (let i = 0; i < 60; i++) {
      const p = this.add.circle(
        Phaser.Math.Between(0, w),
        Phaser.Math.Between(0, h),
        Phaser.Math.Between(1, 3),
        0x4FD1FF,
        Phaser.Math.FloatBetween(0.1, 0.4)
      );
      this.tweens.add({
        targets: p,
        y: p.y - Phaser.Math.Between(50, 200),
        alpha: 0,
        duration: Phaser.Math.Between(2000, 5000),
        repeat: -1,
        yoyo: true,
        ease: 'Sine.easeInOut'
      });
      this.particles.push(p);
    }

    // Title text with glow effect
    const titleShadow = this.add.text(w / 2 + 3, h * 0.28 + 3, '真理のマリオネット', {
      fontFamily: '"DotGothic16"',
      fontSize: '72px',
      color: '#000000'
    }).setOrigin(0.5).setAlpha(0.5);

    const title = this.add.text(w / 2, h * 0.28, '真理のマリオネット', {
      fontFamily: '"DotGothic16"',
      fontSize: '72px',
      color: '#4FD1FF'
    }).setOrigin(0.5);

    // Subtitle
    const subtitle = this.add.text(w / 2, h * 0.40, 'Marionette of Truth', {
      fontFamily: '"Press Start 2P"',
      fontSize: '22px',
      color: '#9CA3AF'
    }).setOrigin(0.5).setAlpha(0);

    // Title glow pulse
    this.tweens.add({
      targets: title,
      alpha: { from: 1, to: 0.7 },
      yoyo: true,
      repeat: -1,
      duration: 1500,
      ease: 'Sine.easeInOut'
    });

    // Bounce in title
    title.setScale(0.8);
    titleShadow.setScale(0.8);
    this.tweens.add({
      targets: [title, titleShadow],
      scale: 1,
      duration: 800,
      ease: 'Back.easeOut'
    });

    // Fade in subtitle
    this.tweens.add({
      targets: subtitle,
      alpha: 1,
      duration: 600,
      delay: 500,
      ease: 'Power2'
    });

    // Player sprite preview
    const playerPreview = this.add.image(w / 2, h * 0.55, 'player').setScale(3);
    playerPreview.setAlpha(0);
    this.tweens.add({
      targets: playerPreview,
      alpha: 1,
      y: h * 0.52,
      duration: 800,
      delay: 800,
      ease: 'Power2'
    });
    // Player floating
    this.tweens.add({
      targets: playerPreview,
      y: h * 0.52 - 15,
      yoyo: true,
      repeat: -1,
      duration: 1200,
      delay: 1600,
      ease: 'Sine.easeInOut'
    });

    // START button
    this.createButton(w / 2, h * 0.72, 'START', 1000, function () {
      this.cameras.main.fadeOut(500, 5, 8, 20);
      this.time.delayedCall(500, function () {
        MOT.resetFlags();
        this.scene.start('StoryScene');
      }, [], this);
    }.bind(this));

    // Version text
    this.add.text(w - 20, h - 20, 'v0.1.0', {
      fontFamily: '"Press Start 2P"',
      fontSize: '10px',
      color: '#333344'
    }).setOrigin(1, 1);

    // Fade in camera
    this.cameras.main.fadeIn(600, 5, 8, 20);
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
