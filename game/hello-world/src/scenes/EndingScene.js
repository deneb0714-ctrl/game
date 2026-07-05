// =============================================
// EndingScene.js – エンディング表示
// =============================================
class EndingScene extends Phaser.Scene {
  constructor() {
    super({ key: 'EndingScene' });
  }

  create() {
    var w = 1920, h = 1080;
    var endingKey = MOT.flags.finalEnding || MOT.decideEnding().key;
    var ending = MOT.ENDINGS[endingKey] || MOT.ENDINGS.NORMAL_EVERYDAY;

    this.cameras.main.setBackgroundColor(ending.bgColor);

    if (ending.key === 'BAD_GAMEOVER') {
      // 砂嵐（ノイズ）用のテクスチャ生成
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
    }

    this.cameras.main.fadeIn(1500, 0, 0, 0);

    // Background particles themed to ending
    if (ending.key !== 'BAD_GAMEOVER') {
      for (var i = 0; i < 40; i++) {
      var p = this.add.circle(
        Phaser.Math.Between(0, w),
        Phaser.Math.Between(0, h),
        Phaser.Math.Between(1, 4),
        ending.color,
        Phaser.Math.FloatBetween(0.05, 0.25)
      );
      this.tweens.add({
        targets: p,
        y: p.y - Phaser.Math.Between(30, 150),
        alpha: 0,
        duration: Phaser.Math.Between(3000, 7000),
        repeat: -1,
        yoyo: true,
        ease: 'Sine.easeInOut'
      });
      }
    }

    // Ending title
    var titleColor = '#' + ending.color.toString(16).padStart(6, '0');
    var title = this.add.text(w / 2, h * 0.2, ending.title, {
      fontFamily: '"Press Start 2P"',
      fontSize: '42px',
      color: titleColor,
      stroke: '#000000',
      strokeThickness: 4
    }).setOrigin(0.5).setAlpha(0);

    // Subtitle
    var subtitle = this.add.text(w / 2, h * 0.30, ending.subtitle, {
      fontFamily: '"DotGothic16"',
      fontSize: '28px',
      color: '#9CA3AF'
    }).setOrigin(0.5).setAlpha(0);

    if (ending.key === 'BAD_GAMEOVER') {
        title.setVisible(false);
        subtitle.setVisible(false);
    }

    // Description
    var desc = this.add.text(w / 2, h * 0.50, ending.description, {
      fontFamily: '"DotGothic16"',
      fontSize: '22px',
      color: '#E5E7EB',
      align: 'center',
      lineSpacing: 12,
      wordWrap: { width: 900 }
    }).setOrigin(0.5).setAlpha(0);

    // Animate in
    this.tweens.add({ targets: title, alpha: 1, y: h * 0.18, duration: 1200, ease: 'Power2', delay: 500 });
    this.tweens.add({ targets: subtitle, alpha: 1, duration: 1000, delay: 1500 });

    // Typewriter for description
    var fullDesc = ending.description;
    desc.setText('');
    desc.setAlpha(1);
    var charIdx = 0;
    this.time.delayedCall(2500, function () {
      this.time.addEvent({
        delay: 45,
        callback: function () {
          charIdx++;
          desc.setText(fullDesc.substring(0, charIdx));
        },
        repeat: fullDesc.length - 1
      });
    }, [], this);

    // Show ending-specific sprite
    var spriteKey = null;
    if (ending.key === 'END_ORPHAN') spriteKey = 'demon_lord'; // 魔王に拾われる

    var endSprite = null;
    if (spriteKey) {
      endSprite = this.add.image(w / 2, h * 0.78, spriteKey).setScale(4).setAlpha(0);
      var spriteDelay = 3000;
      this.tweens.add({
        targets: endSprite, alpha: 1, duration: 2000, delay: spriteDelay,
        ease: 'Power2'
      });
    }

    if (ending.key === 'BAD_GAMEOVER') {
      desc.setVisible(false);
    }

    // Title button (appears after a delay)
    this.time.delayedCall(6000, function () {
      this.createReturnButton(w / 2, h * 0.92);
    }, [], this);
  }

  createReturnButton(x, y) {
    var btn = this.add.image(x, y, 'ui_button').setInteractive({ useHandCursor: true }).setAlpha(0);
    var txt = this.add.text(x, y, 'TITLE に戻る', {
      fontFamily: '"DotGothic16"',
      fontSize: '20px',
      color: '#4FD1FF'
    }).setOrigin(0.5).setAlpha(0);

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
      this.cameras.main.fadeOut(800, 0, 0, 0);
      this.time.delayedCall(800, function () {
        this.scene.start('TitleScene');
      }, [], this);
    }, this);
  }

  update(time, delta) {
    if (this.noiseSprite) {
        // 砂嵐のノイズアニメーション
        this.noiseSprite.tilePositionX = Phaser.Math.Between(0, 256);
        this.noiseSprite.tilePositionY = Phaser.Math.Between(0, 256);
        
        // ランダムな激しい点滅を無くし、一定のアルファ値で目に優しくする
        this.noiseSprite.setAlpha(0.15);
    }
  }
}

window.EndingScene = EndingScene;
