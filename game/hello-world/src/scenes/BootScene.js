// =============================================
// BootScene.js – アセットプリロード＋プロシージャルスプライト生成
// =============================================
window.MOT = window.MOT || {};

class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload() {
    // Loading bar
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;
    const barW = 400, barH = 30;
    const barX = (w - barW) / 2, barY = h / 2;

    const bg = this.add.graphics();
    bg.fillStyle(0x1F2933, 1);
    bg.fillRect(barX, barY, barW, barH);

    const bar = this.add.graphics();
    this.load.on('progress', function (v) {
      bar.clear();
      bar.fillStyle(0x4FD1FF, 1);
      bar.fillRect(barX + 4, barY + 4, (barW - 8) * v, barH - 8);
    });

    const loadText = this.add.text(w / 2, barY - 40, 'LOADING...', {
      fontFamily: '"Press Start 2P"', fontSize: '20px', color: '#4FD1FF'
    }).setOrigin(0.5);

    this.load.on('complete', function () {
      bar.destroy(); bg.destroy(); loadText.destroy();
    });

    // Load a tiny transparent pixel just to have something to load
    // All real textures are generated procedurally in create()
    this.load.image('_placeholder', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==');

    // 幹部1筋肉（添付画像）
    this.load.image('boss1_muscle', window.BOSS1_B64);
    
    // 幹部2戦闘狂（添付画像）
    this.load.image('boss2_combat', window.BOSS2_B64);
    
    // 博士の顔アイコン
    this.load.image('doctor_face', window.DOCTOR_B64);

    // 博士の立ち絵
    this.load.image('doctor_stand', window.DOCTOR_STAND_B64);
    
    // 主人公の立ち絵
    this.load.image('hero_stand', window.HERO_STAND_B64);

    // Title background (Hello World)
    this.load.image('title_bg', window.TITLE_BG_B64);
    
    // Title background (Glitch)
    this.load.image('title_bg_glitch', window.TITLE_BG_GLITCH_B64);

    // Hero Title GIF (SpriteSheet)
    if (window.HERO_TITLE_SHEET_B64) {
      this.load.spritesheet('hero_title_anim', window.HERO_TITLE_SHEET_B64, {
        frameWidth: 960,
        frameHeight: 540
      });
    }
  }

  create() {
    this.generateAllTextures();
    this.scene.start('TitleScene');
  }

  generateAllTextures() {
    this.makePlayer();
    this.makeEnemyBasic();
    this.makeMinion1();
    this.makeBoss1();
    this.makeBoss2();
    this.makeBoss3();
    this.makeBoss3Sister();
    this.makeWingLeft();
    this.makeWingRight();
    this.makeDemonLord();
    this.makeBullets();
    this.makeSlash();
    this.makeItems();
    this.makeBackgrounds();
    this.makeUIButton();
    this.makeParticles();
  }

  // --- Player: 48x48 人造人間 (blue energy lines) ---
  makePlayer() {
    const g = this.make.graphics({ add: false });
    const s = 4; // pixel size
    // Body shape (12x12 grid, drawn at 4x scale = 48x48)
    const body = [
      '....BBBB....',
      '...BCCCBB...',
      '..BCCCCCCB..',
      '..BCCEECCB..',
      '..BCCCCCCB..',
      '...BCCCBB...',
      '..BBBBBBB...',
      '.BBAABBABB..',
      '.BBAABBABB..',
      '..BB.BB.BB..',
      '..BB.BB.BB..',
      '..BB.BB.BB..',
    ];
    const colors = { 'B': 0x1a1a2e, 'C': 0x3a3a5e, 'A': 0x4FD1FF, 'E': 0x4FD1FF, '.': -1 };
    this.drawPixelArt(g, body, colors, s, 0, 0);
    g.generateTexture('player', 48, 48);
    g.destroy();
  }

  // --- Basic enemy ---
  makeEnemyBasic() {
    const g = this.make.graphics({ add: false });
    const s = 4;
    const data = [
      '..RRRR..',
      '.RRRRRRR',
      'RRDRRDRR',
      'RRRRRRRR',
      'RRRRRRRR',
      '.RRRRRRR',
      '..RRRR..',
      '...RR...',
    ];
    const colors = { 'R': 0x993333, 'D': 0x220000, '.': -1 };
    this.drawPixelArt(g, data, colors, s, 0, 0);
    g.generateTexture('enemy_basic', 32, 32);
    g.destroy();
  }

  // --- Minion1 (下っ端1, 情けない表情) ---
  makeMinion1() {
    const g = this.make.graphics({ add: false });
    const s = 4;
    const data = [
      '..PPPP..',
      '.PPPPPP.',
      'PP.PP.PP',
      'PPPPPPPP',
      'PP.PP.PP',
      '.PPPPPP.',
      '..PPPP..',
      '.PP..PP.',
    ];
    const colors = { 'P': 0x8866aa, '.': -1 };
    this.drawPixelArt(g, data, colors, s, 0, 0);
    g.generateTexture('minion1', 32, 32);
    g.destroy();
  }

  // --- Boss1 (長男, 鎧) ---
  makeBoss1() {
    const g = this.make.graphics({ add: false });
    const s = 4;
    const data = [
      '...GGGG...',
      '..GGGGGG..',
      '.GGWGGWGG.',
      '.GGGGGGGG.',
      '.GGGGGGGG.',
      'GGGGGGGGGG',
      'GSSGSSGSSG',
      'GSSGSSGSSG',
      '.GGGGGGGG.',
      '.GGG..GGG.',
      '.GGG..GGG.',
      '.GGG..GGG.',
    ];
    const colors = { 'G': 0x666688, 'S': 0x8888aa, 'W': 0xffffff, '.': -1 };
    this.drawPixelArt(g, data, colors, s, 0, 0);
    g.generateTexture('boss1', 40, 48);
    g.destroy();
  }

  // --- Boss2 (次男, 炎モチーフ) ---
  makeBoss2() {
    const g = this.make.graphics({ add: false });
    const s = 4;
    const data = [
      '..OOOO..',
      '.OOOOOO.',
      'OOWOOWOOO',
      'OOOOOOOOO',
      '.OOYOOOO.',
      'RROOOORR.',
      'RROOOORRR',
      'RRRRRRRRR',
      '.RROORR..',
      '.RR..RR..',
    ];
    const colors = { 'O': 0xFF8C00, 'R': 0xFF2E2E, 'W': 0xffffff, 'Y': 0xFFFF00, '.': -1 };
    this.drawPixelArt(g, data, colors, s, 0, 0);
    g.generateTexture('boss2', 36, 40);
    g.destroy();
  }

  // --- Boss3 (三男, 冷静) ---
  makeBoss3() {
    const g = this.make.graphics({ add: false });
    const s = 4;
    const data = [
      '..IIII..',
      '.IIIIII.',
      'IIWIIIWI',
      'IIIIIIII',
      '.IIIIII.',
      '.IIIIII.',
      'IIDDDDII',
      'IIDDDDII',
      '.II..II.',
      '.II..II.',
    ];
    const colors = { 'I': 0x334466, 'D': 0x2a2a4a, 'W': 0x99ddff, '.': -1 };
    this.drawPixelArt(g, data, colors, s, 0, 0);
    g.generateTexture('boss3', 32, 40);
    g.destroy();
  }

  // --- Boss 3 Sister (赤・ピンク系) ---
  makeBoss3Sister() {
    const g = this.make.graphics({ add: false });
    const s = 4;
    const data = [
      '..IIII..',
      '.IIIIII.',
      'IIWIIIWI',
      'IIIIIIII',
      '.IIIIII.',
      '.IIIIII.',
      'IIDDDDII',
      'IIDDDDII',
      '.II..II.',
      '.II..II.',
    ];
    const colors = { 'I': 0x663344, 'D': 0x4a2a2a, 'W': 0xff99dd, '.': -1 };
    this.drawPixelArt(g, data, colors, s, 0, 0);
    g.generateTexture('boss3_sister', 32, 40);
    g.destroy();
  }

  // --- Wing Left (冷静, 青系) ---
  makeWingLeft() {
    const g = this.make.graphics({ add: false });
    const s = 3;
    const data = [
      '....BBBB....',
      '...BBBBBB...',
      '..BBWBBWBB..',
      '..BBBBBBBB..',
      '..BBBBBBBB..',
      '.BBBBBBBBBB.',
      'BBBB.BB.BBBB',
      'BBB..BB..BBB',
      'BB...BB...BB',
      '.B...BB...B.',
      '....BBBB....',
      '....B..B....',
      '....B..B....',
    ];
    const colors = { 'B': 0x2255aa, 'W': 0xaaddff, '.': -1 };
    this.drawPixelArt(g, data, colors, s, 0, 0);
    g.generateTexture('wing_left', 36, 39);
    g.destroy();
  }

  // --- Wing Right (激情, 赤系) ---
  makeWingRight() {
    const g = this.make.graphics({ add: false });
    const s = 3;
    const data = [
      '....RRRR....',
      '...RRRRRR...',
      '..RRWRRWRR..',
      '..RRRRRRRR..',
      '..RRRRRRRR..',
      '.RRRRRRRRRR.',
      'RRRR.RR.RRRR',
      'RRR..RR..RRR',
      'RR...RR...RR',
      '.R...RR...R.',
      '....RRRR....',
      '....R..R....',
      '....R..R....',
    ];
    const colors = { 'R': 0xaa2233, 'W': 0xffaaaa, '.': -1 };
    this.drawPixelArt(g, data, colors, s, 0, 0);
    g.generateTexture('wing_right', 36, 39);
    g.destroy();
  }

  // --- Demon Lord (魔王, 大型 128x128) ---
  makeDemonLord() {
    const g = this.make.graphics({ add: false });
    const s = 8;
    const data = [
      'D..DDDDDD..D',
      'DD.DDDDDD.DD',
      'DDDDDDDDDDD.',
      '.DDWDDDDWDD.',
      '.DDDDDDDDD..',
      '.DDDDRDDDD..',
      '..DDDDDDDD..',
      '.DDDDDDDDDD.',
      'DDDDSDDSDDD.',
      'DDDDDDDDDDDD',
      '.DDDDDDDDD..',
      '.DDD.DD.DDD..',
      '..DD.DD.DD...',
      '..DD.DD.DD...',
    ];
    const colors = { 'D': 0x440022, 'W': 0xFF2E2E, 'R': 0x880000, 'S': 0x660033, '.': -1 };
    this.drawPixelArt(g, data, colors, s, 0, 0);
    g.generateTexture('demon_lord', 96, 112);
    g.destroy();
  }

  // --- Bullets ---
  makeBullets() {
    // Player bullet (cyan)
    const g1 = this.make.graphics({ add: false });
    g1.fillStyle(0x4FD1FF, 1);
    g1.fillRect(0, 0, 12, 4);
    g1.fillStyle(0xffffff, 0.8);
    g1.fillRect(2, 1, 8, 2);
    g1.generateTexture('bullet_player', 12, 4);
    g1.destroy();

    // Enemy bullet (red)
    const g2 = this.make.graphics({ add: false });
    g2.fillStyle(0xFF4B6E, 1);
    g2.fillCircle(6, 6, 6);
    g2.fillStyle(0xffffff, 0.5);
    g2.fillCircle(4, 4, 2);
    g2.generateTexture('bullet_enemy', 12, 12);
    g2.destroy();

    // Homing bullet (pink glow)
    const g3 = this.make.graphics({ add: false });
    g3.fillStyle(0xFF2E2E, 0.4);
    g3.fillCircle(8, 8, 8);
    g3.fillStyle(0xFF4B6E, 1);
    g3.fillCircle(8, 8, 5);
    g3.fillStyle(0xffffff, 0.6);
    g3.fillCircle(6, 6, 2);
    g3.generateTexture('bullet_homing', 16, 16);
    g3.destroy();
  }

  // --- Slash attack texture (斬撃弾) ---
  makeSlash() {
    // 縦長の斬撃（垂直方向）
    const g = this.make.graphics({ add: false });
    // アウターグロー
    g.fillStyle(0xFF8C00, 0.5);
    g.fillRect(4, 0, 16, 64);
    // メイン斬撃線（オレンジで太め）
    g.fillStyle(0xFF4B00, 1);
    g.fillRect(8, 0, 8, 64);
    // 中心の白い光り
    g.fillStyle(0xFFFFFF, 0.8);
    g.fillRect(10, 4, 4, 56);
    // 上端・下端の尖り演出
    g.fillStyle(0xFF6600, 1);
    g.fillTriangle(12, 0, 8, 12, 16, 12);
    g.fillTriangle(12, 64, 8, 52, 16, 52);
    g.generateTexture('slash_attack', 24, 64);
    g.destroy();
  }

  // --- Items ---
  makeItems() {
    // Energy item (cyan diamond)
    const g1 = this.make.graphics({ add: false });
    g1.fillStyle(0x4FD1FF, 1);
    g1.fillTriangle(10, 0, 0, 10, 10, 20);
    g1.fillTriangle(10, 0, 20, 10, 10, 20);
    g1.fillStyle(0xffffff, 0.5);
    g1.fillTriangle(10, 2, 3, 10, 10, 16);
    g1.generateTexture('item_energy', 20, 20);
    g1.destroy();

    // Health item (green cross)
    const g2 = this.make.graphics({ add: false });
    g2.fillStyle(0x4FFF7F, 1);
    g2.fillRect(6, 0, 8, 20);
    g2.fillRect(0, 6, 20, 8);
    g2.generateTexture('item_health', 20, 20);
    g2.destroy();
  }

  // --- Scrolling backgrounds ---
  makeBackgrounds() {
    // Stage 1: Lab / Wasteland (dark blue with grid lines)
    const g1 = this.make.graphics({ add: false });
    g1.fillStyle(0x050814, 1);
    g1.fillRect(0, 0, 1920, 1080);
    // Grid
    g1.lineStyle(1, 0x0a1428, 0.5);
    for (let x = 0; x < 1920; x += 64) { g1.lineBetween(x, 0, x, 1080); }
    for (let y = 0; y < 1080; y += 64) { g1.lineBetween(0, y, 1920, y); }
    // Machinery
    g1.fillStyle(0x1F2933, 0.8);
    for (let i = 0; i < 8; i++) {
      const rx = Phaser.Math.Between(100, 1800);
      const ry = Phaser.Math.Between(100, 980);
      g1.fillRect(rx, ry, Phaser.Math.Between(30, 80), Phaser.Math.Between(20, 60));
    }
    // Accent lights
    g1.fillStyle(0x4FD1FF, 0.3);
    for (let i = 0; i < 12; i++) {
      g1.fillCircle(Phaser.Math.Between(0, 1920), Phaser.Math.Between(0, 1080), Phaser.Math.Between(2, 5));
    }
    g1.generateTexture('bg_stage1', 1920, 1080);
    g1.destroy();

    // Stage 2: Road to Demon Castle (purple/dark)
    const g2 = this.make.graphics({ add: false });
    g2.fillStyle(0x0a0514, 1);
    g2.fillRect(0, 0, 1920, 1080);
    // Mountains silhouette
    g2.fillStyle(0x150a28, 1);
    for (let x = 0; x < 1920; x += 120) {
      const h = Phaser.Math.Between(200, 500);
      g2.fillTriangle(x, 1080, x + 60, 1080 - h, x + 120, 1080);
    }
    // Stars
    g2.fillStyle(0xE5E7EB, 0.6);
    for (let i = 0; i < 50; i++) {
      g2.fillCircle(Phaser.Math.Between(0, 1920), Phaser.Math.Between(0, 600), 1);
    }
    g2.generateTexture('bg_stage2', 1920, 1080);
    g2.destroy();

    // Boss: Throne room
    const g3 = this.make.graphics({ add: false });
    g3.fillStyle(0x0a0008, 1);
    g3.fillRect(0, 0, 1920, 1080);
    // Columns
    g3.fillStyle(0x220011, 1);
    for (let x = 200; x < 1920; x += 400) {
      g3.fillRect(x, 100, 40, 880);
      g3.fillRect(x - 10, 80, 60, 30);
      g3.fillRect(x - 10, 980, 60, 30);
    }
    // Dark vortex center
    g3.fillStyle(0xFF2E2E, 0.08);
    g3.fillCircle(960, 540, 300);
    g3.fillStyle(0xFF2E2E, 0.05);
    g3.fillCircle(960, 540, 450);
    g3.generateTexture('bg_boss', 1920, 1080);
    g3.destroy();
  }

  // --- UI Button ---
  makeUIButton() {
    const g = this.make.graphics({ add: false });
    g.fillStyle(0x1F2933, 1);
    g.fillRoundedRect(0, 0, 240, 60, 8);
    g.lineStyle(2, 0x4FD1FF, 1);
    g.strokeRoundedRect(0, 0, 240, 60, 8);
    g.generateTexture('ui_button', 240, 60);
    g.destroy();

    // Small button
    const g2 = this.make.graphics({ add: false });
    g2.fillStyle(0x1F2933, 1);
    g2.fillRoundedRect(0, 0, 360, 50, 6);
    g2.lineStyle(2, 0x4FD1FF, 1);
    g2.strokeRoundedRect(0, 0, 360, 50, 6);
    g2.generateTexture('ui_button_wide', 360, 50);
    g2.destroy();
  }

  // --- Particle / FX ---
  makeParticles() {
    const g = this.make.graphics({ add: false });
    g.fillStyle(0xffffff, 1);
    g.fillCircle(4, 4, 4);
    g.generateTexture('particle', 8, 8);
    g.destroy();

    // Explosion frames (single color circles of different sizes)
    const g2 = this.make.graphics({ add: false });
    g2.fillStyle(0xFF8C00, 1);
    g2.fillCircle(16, 16, 16);
    g2.fillStyle(0xFFFF00, 0.7);
    g2.fillCircle(16, 16, 10);
    g2.fillStyle(0xffffff, 0.5);
    g2.fillCircle(16, 16, 5);
    g2.generateTexture('explosion', 32, 32);
    g2.destroy();
  }

  // Utility: draw pixel art from string array
  drawPixelArt(graphics, data, colorMap, pixelSize, offsetX, offsetY) {
    for (let row = 0; row < data.length; row++) {
      for (let col = 0; col < data[row].length; col++) {
        const ch = data[row][col];
        if (colorMap[ch] !== undefined && colorMap[ch] !== -1) {
          graphics.fillStyle(colorMap[ch], 1);
          graphics.fillRect(
            offsetX + col * pixelSize,
            offsetY + row * pixelSize,
            pixelSize,
            pixelSize
          );
        }
      }
    }
  }
}

window.BootScene = BootScene;
