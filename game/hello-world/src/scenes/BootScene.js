// =============================================
// BootScene.js – アセットプリロード＋プロシージャルスプライト生成
// =============================================
window.MOT = window.MOT || {};

class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload() {
    // Loading bar (moved to bottom right)
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;
    const barW = 300, barH = 20;
    const barX = w - barW - 40, barY = h - barH - 40;

    const bg = this.add.graphics();
    bg.fillStyle(0x1F2933, 1);
    bg.fillRect(barX, barY, barW, barH);

    const bar = this.add.graphics();
    this.load.on('progress', function (v) {
      bar.clear();
      bar.fillStyle(0x4FD1FF, 1);
      // Real load might be fast, but we show it anyway
      bar.fillRect(barX + 4, barY + 4, (barW - 8) * v, barH - 8);
    });

    // 背景を暗くする
    this.add.rectangle(0, 0, w, h, 0x080808).setOrigin(0);

    const lines = [
      "...link established",
      "...signal drift: 0.03",
      "",
      "こんにちは。『\ufffdGGS 』よ。",
      "",
      "世界構造の誤差、観測値より逸脱。",
      "あなたには、それを正すだけの力がある。",
      "",
      "悪性因子、未除去。",
      "この世界を救う宿命を背負いなさい。",
      "",
      "...trace lost",
      "...reconnecting..."
    ];
    
    // 画面中央付近に配置するための計算
    const startX = w / 2 - 450;
    const startY = h / 2 - 350;

    const textObj = this.add.text(startX, startY, '', {
      fontFamily: '"Courier New", Courier, monospace',
      fontSize: '36px',
      color: '#00FF00',
      fontStyle: 'bold',
      lineSpacing: 20
    });

    this.isTypingDone = false;
    this.isLoadDone = false;

    let currentLine = 0;
    let currentChar = 0;
    let displayText = "";

    const typeNextChar = () => {
      if (currentLine >= lines.length) {
        this.isTypingDone = true;
        if (this.isLoadDone) {
          this.time.delayedCall(1500, () => {
            this.scene.start('TitleScene');
          });
        }
        return;
      }
      
      const lineText = lines[currentLine];
      if (currentChar < lineText.length) {
        displayText += lineText[currentChar];
        textObj.setText(displayText);
        currentChar++;
        
        let delay = 30; 
        if (lineText[currentChar - 1] === '。' || lineText[currentChar - 1] === '、') delay = 250;
        
        this.time.delayedCall(delay, typeNextChar);
      } else {
        displayText += "\n";
        textObj.setText(displayText);
        currentLine++;
        currentChar = 0;
        
        let delay = 300; 
        if (lineText === "") delay = 100;
        
        this.time.delayedCall(delay, typeNextChar);
      }
    };
    
    // タイピング開始
    this.time.delayedCall(500, typeNextChar);

    const loadText = this.add.text(barX + barW / 2, barY - 20, 'LOADING...', {
      fontFamily: '"Press Start 2P"', fontSize: '14px', color: '#4FD1FF'
    }).setOrigin(0.5);

    this.load.on('complete', () => {
      bar.destroy(); bg.destroy(); loadText.destroy();
    });

    // Load a tiny transparent pixel just to have something to load
    // All real textures are generated procedurally in create()
    this.load.image('_placeholder', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==');

    // 博士の顔アイコン (assets/images から読み込むためBase64は削除)

    const v = window.GAME_VERSION || 'v1';
    
    // 双子用BGM
    this.load.audio('twins_bgm', 'assets/audio/twins_bgm.mp3');
    this.load.audio('boss1_bgm', 'assets/audio/boss1_bgm.mp3');
    this.load.audio('boss2_bgm', 'assets/audio/boss2_bgm.wav');
    this.load.audio('bgm_stage', 'assets/audio/bgm_stage.mp3');

    // 博士の立ち絵
    this.load.image('doctor_stand', 'assets/images/doctor_normal.png?v=' + v);
    this.load.image('doctor_stand_open', 'assets/images/doctor_open_eyes.png?v=' + v);
    
    // 主人公の立ち絵は以下で読み込みます
    
    // 主人公の戦闘時・他者との会話時の立ち絵
    this.load.spritesheet('hero_stand_combat', 'assets/images/hero_combat_sheet.png?v=' + v, {
      frameWidth: 63,
      frameHeight: 112
    });
    this.load.spritesheet('demon_stand_combat', 'assets/images/demon_lord_sheet.png?v=' + v, {
      frameWidth: 315,
      frameHeight: 560
    });

    // 主人公の瞬き（表情切り替え用）
    this.load.image('hero_stand_blink', 'assets/images/hero_stand_blink.png?v=' + v);
    this.load.image('hero_stand', 'assets/images/hero_stand.png?v=' + v);
    this.load.image('hero_stand_silent', 'assets/images/hero_stand_silent.png?v=' + v);
    this.load.image('hero_stand_corrupted', 'assets/images/hero_stand_corrupted.png?v=' + v);
    this.load.image('hero_cry', 'assets/images/hero_cry.png?v=' + v);
    this.load.image('doctor_awaken_smile_weapon', 'assets/images/' + encodeURIComponent('覚醒_笑_武器展開') + '.png?v=' + v);
    this.load.image('doctor_awaken_straight_dying', 'assets/images/' + encodeURIComponent('覚醒_真顔_瀕死') + '.png?v=' + v);
    this.load.image('doctor_awaken_straight_weapon', 'assets/images/' + encodeURIComponent('覚醒_真顔_武器展開') + '.png?v=' + v);


    this.load.image('demon_lord_normal', 'assets/images/demon_lord_normal.png?v=' + v);
    this.load.image('demon_lord_blink', 'assets/images/demon_lord_blink.png?v=' + v);
    
    // Inuneko Star
    this.load.image('inuneko_stand', 'assets/images/inuneko_stand.png?v=' + v);
    this.load.image('inuneko_blink', 'assets/images/inuneko_blink.png?v=' + v);
    this.load.image('inuneko_dying', 'assets/images/inuneko_dying.png?v=' + v);
    this.load.spritesheet('inuneko_combat', 'assets/images/inuneko_combat_sheet.png?v=' + v, { frameWidth: 315, frameHeight: 560 });
    
    this.load.image('icon_person', 'assets/images/icon_person.png?v=' + v);
    this.load.image('demon_lord_dying', 'assets/images/demon_lord_dying.png?v=' + v);
    this.load.image('demon_lord_shock', 'assets/images/demon_lord_shock.png?v=' + v);
    this.load.image('demon_lord_eyes_closed', 'assets/images/demon_lord_eyes_closed.png?v=' + v);

    // Boss 1 and 2
    this.load.image('boss1_muscle', 'assets/images/boss1_muscle.png?v=' + v);
    this.load.image('boss1_normal', 'assets/images/boss1_normal.png?v=' + v);
    this.load.image('boss1_angry', 'assets/images/boss1_angry.png?v=' + v);
    this.load.image('boss1_dying', 'assets/images/boss1_hurt_normal.png?v=' + v);
    this.load.image('boss1_sweat', 'assets/images/boss1_sweat.png?v=' + v);
    this.load.image('boss1_hurt_angry', 'assets/images/boss1_hurt_angry.png?v=' + v);
    
    // 新しいエフェクト・弾幕画像
    this.load.image('boss1_wind_slash', 'assets/images/boss1_wind_slash.png?v=' + v);
    this.load.image('boss2_bullet', 'assets/images/boss2_bullet.png?v=' + v);
    this.load.spritesheet('boss1_combat', 'assets/images/boss1_combat_sheet.png?v=' + v, { frameWidth: 100, frameHeight: 100 });
    this.load.image('boss2_combat', 'assets/images/boss2_combat.jpg?v=' + v);
    this.load.spritesheet('boss2_battle_anim', 'assets/images/boss2_battle.png?v=' + v, { frameWidth: 543, frameHeight: 560 });
    this.load.spritesheet('boss3_battle_anim', 'assets/images/boss3_battle.png?v=' + v, { frameWidth: 560, frameHeight: 533 });
    this.load.image('boss2_normal', 'assets/images/boss2_normal.png?v=' + v);
    this.load.image('boss2_normal_dying', 'assets/images/boss2_normal_dying.png?v=' + v);
    this.load.image('boss2_angry', 'assets/images/boss2_angry.png?v=' + v);
    this.load.image('boss2_angry_dying', 'assets/images/boss2_angry_dying.png?v=' + v);
    this.load.image('boss2_eyes_closed', 'assets/images/boss2_eyes_closed.png?v=' + v);
    this.load.image('boss2_eyes_closed_dying', 'assets/images/boss2_eyes_closed_dying.png?v=' + v);
    this.load.image('boss2_surprised', 'assets/images/boss2_surprised.png?v=' + v);
    this.load.image('boss2_surprised_dying', 'assets/images/boss2_surprised_dying.png?v=' + v);
    
    // Doctor
    this.load.image('doctor_normal', 'assets/images/doctor_normal.png?v=' + v);
    this.load.image('doctor_open_eyes', 'assets/images/doctor_open_eyes.png?v=' + v);
    this.load.image('doctor_face', 'assets/images/doctor_face.png?v=' + v);

    // Inuneko Star
    this.load.image('inuneko_stand', 'assets/images/inuneko_stand.png?v=' + v);
    this.load.image('inuneko_dying', 'assets/images/inuneko_dying.png?v=' + v);
    this.load.image('inuneko_blink', 'assets/images/inuneko_blink.png?v=' + v);
    this.load.image('sister_normal', 'assets/images/sister_normal.png?v=' + v);
    this.load.image('sister_blink', 'assets/images/sister_blink.png?v=' + v);
    this.load.image('sister_hurt', 'assets/images/sister_hurt.png?v=' + v);
    this.load.image('brother_normal', 'assets/images/brother_normal.png?v=' + v);
    this.load.image('brother_closed', 'assets/images/brother_closed.png?v=' + v);
    this.load.image('brother_dying', 'assets/images/brother_dying.png?v=' + v);
    this.load.image('brother_dying_closed', 'assets/images/brother_dying_closed.png?v=' + v);
    this.load.image('brother_hurt', 'assets/images/brother_hurt.png?v=' + v);
    this.load.image('brother_hurt_closed', 'assets/images/brother_hurt_closed.png?v=' + v);


    // Hero New
    this.load.image('hero_silent_new', 'assets/images/hero_silent_new.png?v=' + v);

    // Icons
    this.load.image('icon_person', 'assets/images/icon_person.png?v=' + v);
    this.load.image('icon_battery', 'assets/images/icon_battery.png?v=' + v);
    this.load.image('icon_battery', 'assets/images/icon_battery.png?v=' + v);

    // Title background (Hello World)
    this.load.image('title_bg', 'assets/images/title_bg.png?v=' + v);
    
    // Title 1X assets
    this.load.image('title_1x_back', 'assets/images/title_1x_back.png?v=' + v);
    this.load.image('title_1x_number', 'assets/images/title_1x_number.png?v=' + v);
    this.load.image('title_1x_hello_world', 'assets/images/title_1x_hello_world.png?v=' + v);
    this.load.image('title_1x_baria', 'assets/images/title_1x_baria.png?v=' + v);
    this.load.image('game_over_img', 'assets/images/game_over_img.png?v=' + v);
    
    // Title background (Glitch)
    this.load.image('title_bg_glitch', 'assets/images/title_bg_glitch.png?v=' + v);
    
    // 強制シャットダウン用タイトル画像
    this.load.image('404_bg', 'assets/images/404_bg.png?v=' + v);
    this.load.image('not_found_text', 'assets/images/not_found_text.png?v=' + v);

    // Hero Title GIF (SpriteSheet)
    this.load.spritesheet('hero_title_anim', 'assets/images/hero_title_sheet.png?v=' + v, {
      frameWidth: 960,
      frameHeight: 540
    });
    
    // Custom Backgrounds (swapped per user request)
    this.load.image('bg_stage1_scroll', 'assets/images/bg_boss1_static.png?v=' + v);
    this.load.image('bg_boss1_static', 'assets/images/bg_stage1_scroll.jpg?v=' + v);
    
    this.load.image('bg_lab', 'assets/bg_lab.png');
  }

  create() {
    this.generateAllTextures();
    
    // アニメーションの作成
    this.anims.create({
      key: 'boss1_idle',
      frames: this.anims.generateFrameNumbers('boss1_combat', { start: 0, end: 1 }),
      frameRate: 2,
      repeat: -1
    });

    this.anims.create({
      key: 'boss1_attack_right',
      frames: this.anims.generateFrameNumbers('boss1_combat', { frames: [4, 5, 2, 3] }),
      frameRate: 6,
      repeat: 0
    });

    this.anims.create({
      key: 'boss1_attack_left',
      frames: this.anims.generateFrameNumbers('boss1_combat', { frames: [0, 1, 6, 7] }),
      frameRate: 6,
      repeat: 0
    });

    this.anims.create({
      key: 'boss2_battle_play',
      frames: this.anims.generateFrameNumbers('boss2_battle_anim', { start: 0, end: 28 }),
      frameRate: 15,
      repeat: -1
    });

    this.anims.create({
      key: 'boss3_battle_play',
      frames: this.anims.generateFrameNumbers('boss3_battle_anim', { start: 0, end: 19 }),
      frameRate: 15,
      repeat: -1
    });

    this.anims.create({
      key: 'hero_combat_anim',
      frames: this.anims.generateFrameNumbers('hero_stand_combat', { start: 0, end: 59 }),
      frameRate: 15,
      repeat: -1
    });
    
    this.anims.create({
      key: 'demon_combat_anim',
      frames: this.anims.generateFrameNumbers('demon_stand_combat', { start: 0, end: 39 }),
      frameRate: 15,
      repeat: -1
    });

    // 高解像度画像（立ち絵など）を縮小時にガビガビにならないようLINEARフィルタを一括適用
    const highResKeys = [
      'doctor_stand', 'doctor_stand_open', 'doctor_normal', 'doctor_open_eyes', 'doctor_face',
      'boss1_muscle', 'boss1_normal', 'boss1_angry', 'boss1_dying', 'boss1_sweat', 'boss1_hurt_angry', 'boss2_combat',
      'hero_stand', 'hero_stand_silent', 'hero_stand_corrupted', 'hero_stand_blink',
      'demon_lord_normal', 'demon_lord_blink', 'demon_lord_dying', 'demon_lord_shock', 'demon_lord_eyes_closed',
      'inuneko_stand', 'inuneko_blink', 'inuneko_dying'
    ];
    highResKeys.forEach(k => {
      if (this.textures.exists(k)) {
        this.textures.get(k).setFilter(Phaser.Textures.FilterMode.LINEAR);
      }
    });

    this.isLoadDone = true;
    if (this.isTypingDone) {
      this.time.delayedCall(1500, () => {
        this.scene.start('TitleScene');
      });
    }
  }

  generateAllTextures() {
    this.makePlayer();
    this.makeEnemyBasic();
    this.makeMinion1();
    this.makeBoss1();
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
      '...KKKK...',
      '..KRRRRK..',
      '.KRRRRRRK.',
      'KRRDRRDRRK',
      'KRRRRRRRRK',
      'KRRRRRRRRK',
      '.KRRRRRRK.',
      '..KRRRRK..',
      '...KRRK...',
      '....KK....'
    ];
    const colors = { 'R': 0x993333, 'D': 0x220000, 'K': 0x000000, '.': -1 };
    this.drawPixelArt(g, data, colors, s, 0, 0);
    g.generateTexture('enemy_basic', 40, 40);
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

    // White base bullet for tinting
    const gw = this.make.graphics({ add: false });
    gw.fillStyle(0xffffff, 1);
    gw.fillCircle(6, 6, 6);
    gw.generateTexture('bullet_enemy_white', 12, 12);
    gw.destroy();

    // White homing bullet for tinting
    const gh = this.make.graphics({ add: false });
    gh.fillStyle(0xffffff, 0.4);
    gh.fillCircle(8, 8, 8);
    gh.fillStyle(0xffffff, 1);
    gh.fillCircle(8, 8, 5);
    gh.generateTexture('bullet_homing_white', 16, 16);
    gh.destroy();

    // Star bullet for twin sister
    const gs = this.make.graphics({ add: false });
    gs.fillStyle(0xffffff, 1);
    // Draw a diamond shape
    gs.beginPath();
    gs.moveTo(10, 0);  // Top
    gs.lineTo(20, 10); // Right
    gs.lineTo(10, 20); // Bottom
    gs.lineTo(0, 10);  // Left
    gs.closePath();
    gs.fillPath();
    gs.generateTexture('bullet_diamond', 20, 20);
    gs.clear();

    // Draw a true 5-pointed star shape
    gs.fillStyle(0xffffff, 1);
    gs.beginPath();
    let cx = 10, cy = 10, spikes = 5, outerRadius = 10, innerRadius = 4;
    let rot = Math.PI / 2 * 3;
    let step = Math.PI / spikes;
    gs.moveTo(cx, cy - outerRadius);
    for (let i = 0; i < spikes; i++) {
      let x = cx + Math.cos(rot) * outerRadius;
      let y = cy + Math.sin(rot) * outerRadius;
      gs.lineTo(x, y);
      rot += step;
      x = cx + Math.cos(rot) * innerRadius;
      y = cy + Math.sin(rot) * innerRadius;
      gs.lineTo(x, y);
      rot += step;
    }
    gs.lineTo(cx, cy - outerRadius);
    gs.closePath();
    gs.fillPath();
    gs.generateTexture('bullet_star', 20, 20);
    gs.destroy();

    // Laser bullet for twin brother (長めのレーザーボルト)
    const gl = this.make.graphics({ add: false });
    gl.fillStyle(0xffffff, 1);
    gl.fillRect(0, 4, 400, 4); 
    gl.fillStyle(0xffffff, 0.5);
    gl.fillRect(0, 2, 400, 8); // Glow
    gl.generateTexture('bullet_laser', 400, 12);
    gl.destroy();
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

    // Red Diamond Item
    const grd = this.make.graphics({ add: false });
    grd.fillStyle(0xFF0000, 1);
    grd.lineStyle(2, 0xFFaaaa, 1);
    // Draw a diamond shape
    grd.beginPath();
    grd.moveTo(10, 0);
    grd.lineTo(20, 10);
    grd.lineTo(10, 20);
    grd.lineTo(0, 10);
    grd.closePath();
    grd.fillPath();
    grd.strokePath();
    grd.generateTexture('item_red_diamond', 20, 20);
    grd.destroy();

    // Health item (green cross)
    const g2 = this.make.graphics({ add: false });
    g2.fillStyle(0x4FFF7F, 1);
    g2.fillRect(8, 2, 4, 16);
    g2.fillRect(2, 8, 16, 4);
    g2.generateTexture('item_health', 20, 20);
    g2.destroy();

    // Removed dynamic generation of icon_person and icon_battery to prevent WebGL crash on generated textures
  }

  // --- Scrolling backgrounds ---
  makeBackgrounds() {
    const w = 480;
    const h = 270;

    // Stage 1: Lab / Wasteland (dark blue with grid lines)
    const g1 = this.make.graphics({ add: false });
    g1.fillStyle(0x050814, 1);
    g1.fillRect(0, 0, 480, 270);
    // Grid
    g1.lineStyle(2, 0x0a1428, 0.5);
    for (let x = 0; x <= 480; x += 16) { g1.lineBetween(x, 0, x, 270); }
    for (let y = 0; y <= 270; y += 16) { g1.lineBetween(0, y, 480, y); }
    // Machinery
    g1.fillStyle(0x1F2933, 0.8);
    for (let i = 0; i < 8; i++) {
      const rx = Phaser.Math.Between(25, 450);
      const ry = Phaser.Math.Between(25, 245);
      g1.fillRect(rx, ry, Phaser.Math.Between(7, 20), Phaser.Math.Between(5, 15));
    }
    // Accent lights
    g1.fillStyle(0x4FD1FF, 0.8);
    for (let i = 0; i < 12; i++) {
      g1.fillCircle(Phaser.Math.Between(0, 480), Phaser.Math.Between(0, 270), Phaser.Math.Between(1, 2));
    }
    g1.generateTexture('bg_stage1', w, h);
    g1.destroy();

    // Stage 2: Road to Demon Castle (Yellow/Orange) - Outside
    const g2 = this.make.graphics({ add: false });
    g2.fillStyle(0x1a1500, 1);
    g2.fillRect(0, 0, 480, 270);
    // Mountains silhouette
    g2.fillStyle(0x332600, 1);
    for (let x = 0; x < 480; x += 30) {
      const h_mtn = Phaser.Math.Between(50, 125);
      g2.fillTriangle(x, 270, x + 15, 270 - h_mtn, x + 30, 270);
    }
    // Stars
    g2.fillStyle(0xE5E7EB, 0.8);
    for (let i = 0; i < 50; i++) {
      g2.fillCircle(Phaser.Math.Between(0, 480), Phaser.Math.Between(0, 150), 1);
    }
    g2.generateTexture('bg_stage2', w, h);
    g2.destroy();

    // Boss stages: Inside Demon Castle (Throne room style with different colors)
    const bossColors = [
      { key: 'bg_boss_stage2', bg: 0x1a1500, column: 0x332600, vortex: 0xFFaa2E }, // 黄昏の荒野 (Yellow/Orange)
      { key: 'bg_boss_stage3', bg: 0x220505, column: 0x330a0a, vortex: 0xFF2E2E }, // 宵闇の森 (Red)
      { key: 'bg_boss_stage4', bg: 0x051122, column: 0x0a2233, vortex: 0x2E88FF }, // 子夜の城塞 (Blue)
      { key: 'bg_boss_stage5', bg: 0x0a0514, column: 0x150a28, vortex: 0xaa2EFF }  // 魔王城 (Purple)
    ];

    bossColors.forEach(bc => {
      const g3 = this.make.graphics({ add: false });
      g3.fillStyle(bc.bg, 1);
      g3.fillRect(0, 0, 480, 270);
      // Columns
      g3.fillStyle(bc.column, 1);
      for (let x = 50; x < 480; x += 100) {
        g3.fillRect(x, 25, 10, 220);
        g3.fillRect(x - 2, 20, 14, 8);
        g3.fillRect(x - 2, 245, 14, 8);
      }
      // Dark vortex center
      g3.fillStyle(bc.vortex, 0.08);
      g3.fillCircle(240, 135, 75);
      g3.fillStyle(bc.vortex, 0.05);
      g3.fillCircle(240, 135, 112);
      g3.generateTexture(bc.key, w, h);
      g3.destroy();
    });
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
