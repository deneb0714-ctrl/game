// =============================================
// TitleScene.js – タイトル画面
// =============================================
class TitleScene extends Phaser.Scene {
  constructor() {
    super({ key: 'TitleScene' });
  }

  create() {
    this.sound.stopAll();
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;

    const isGlitch = (window.MOT && window.MOT.flags && window.MOT.flags.useGlitchTitle);
    const isShutdown = (window.MOT && window.MOT.flags && window.MOT.flags.finalEnding === 'bad_shutdown');

    if (isShutdown) {
      // 強制シャットダウン後の特殊タイトル
      this.add.image(w / 2, h / 2, '404_bg').setDisplaySize(w, h).setDepth(0);
      let notFoundImg = this.add.image(0, h / 2, 'not_found_text').setOrigin(0, 0.5).setDepth(1);
      // 画面の高さにぴったり合わせる
      let scaleY = h / notFoundImg.height;
      notFoundImg.setScale(scaleY);
      this.heroGif = null;
      this.matrixTextObj = null;
    } else {
      // 共通: 主人公のアニメーションをロード
      if (this.textures.exists('hero_title_anim')) {
        if (!this.anims.exists('play_hero_title')) {
          this.anims.create({
            key: 'play_hero_title',
            frames: this.anims.generateFrameNumbers('hero_title_anim', { start: 0, end: 35 }),
            frameRate: 12.5,
            repeat: 0
          });
        }
        
        // エラータイトル・通常タイトルともに全く同じ位置・サイズ（x=0, scale=2.25）に統一
        this.heroGif = this.add.sprite(0, h, 'hero_title_anim', 0).setOrigin(0, 1).setScale(2.25).setDepth(2);
      } else {
        this.heroGif = null;
      }

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
        
        this.helloImg = this.add.image(w / 2, h / 2, 'title_1x_hello_world').setDisplaySize(w, h).setDepth(3);
        this.add.image(w / 2, h / 2, 'title_1x_baria').setDisplaySize(w, h).setDepth(3);
      } else {
        // エラータイトルの場合
        this.add.image(w / 2, h / 2, 'title_bg_glitch').setDisplaySize(w, h).setDepth(0);
        this.matrixTextObj = null;
        
        // 色を反転して不気味な演出にする
        if (this.heroGif) {
          try {
            // preFXによるテクスチャ境界での見切れ（アホ毛のカット）を防ぐため postFX を使用
            if (this.heroGif.postFX) {
              this.heroGif.postFX.addColorMatrix().negative();
            } else if (this.heroGif.preFX) {
              this.heroGif.preFX.addColorMatrix().negative();
              this.heroGif.preFX.setPadding(32); // 見切れ防止
            } else {
              this.heroGif.setTint(0xff0000);
            }
          } catch (e) {
            console.warn("Negative FX failed:", e);
            this.heroGif.setTint(0xff0000);
          }
        }
      }
    }

    if (!isShutdown) {
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
    } else {
      this.noiseSprite = null;
    }

    // Fade in camera
    this.cameras.main.fadeIn(600, 5, 8, 20);

    // START, CONTINUE, CREDITS buttons
    const hasSave = (window.MOT && MOT.hasSaveData && MOT.hasSaveData());
    const startY = hasSave ? h * 0.75 : h * 0.80;

    this.createButton(w / 2, startY, 'START', 500, function () {
      if (window.MOT && MOT.clearSaveData) MOT.clearSaveData();
      if (window.MOT && MOT.resetFlags) MOT.resetFlags();
      if (this.heroGif) {
        this.heroGif.play('play_hero_title');
        this.heroGif.once('animationcomplete', function() {
          this.cameras.main.fadeOut(500, 5, 8, 20);
          this.time.delayedCall(500, function () {
            this.scene.start('StoryScene', { bossIndex: 0 });
          }, [], this);
        }, this);
      } else {
        this.cameras.main.fadeOut(500, 5, 8, 20);
        this.time.delayedCall(500, function () {
          this.scene.start('StoryScene', { bossIndex: 0 });
        }, [], this);
      }
    }.bind(this));

    if (hasSave) {
      this.createButton(w / 2, h * 0.84, 'CONTINUE', 700, function () {
        const saveData = window.MOT && MOT.loadGame ? MOT.loadGame() : null;
        if (saveData && saveData.flags) {
          MOT.flags = JSON.parse(JSON.stringify(saveData.flags));
          MOT.flags.diedCount = 0;
          MOT.flags.playerHP = MOT.flags.playerMaxHP || 5;
          MOT.flags.useGlitchTitle = false;
        }
        if (this.heroGif) {
          this.heroGif.play('play_hero_title');
          this.heroGif.once('animationcomplete', function() {
            this.cameras.main.fadeOut(500, 5, 8, 20);
            this.time.delayedCall(500, function () {
              this.scene.start('BossScene', { startBossIndex: saveData ? saveData.bossIndex : 1, fromContinue: true });
            }, [], this);
          }, this);
        } else {
          this.cameras.main.fadeOut(500, 5, 8, 20);
          this.time.delayedCall(500, function () {
            this.scene.start('BossScene', { startBossIndex: saveData ? saveData.bossIndex : 1, fromContinue: true });
          }, [], this);
        }
      }.bind(this));
    }

    const creditsX = w - 80;
    const creditsY = h * 0.45;
    this.createButton(creditsX, creditsY, 'CREDITS', hasSave ? 900 : 700, function () {
      this.showCredits();
    }.bind(this));

    const charX = w - 80;
    const charY = h * 0.45 + 50;
    this.createButton(charX, charY, 'CHARACTER', hasSave ? 1100 : 900, function () {
      this.showCharacterList();
    }.bind(this));

    // Version text
    const versionText = window.GAME_VERSION ? `v0.1.0 (${window.GAME_VERSION})` : 'v0.1.0';
    this.add.text(w - 20, h - 20, versionText, {
      fontFamily: '"Press Start 2P"',
      fontSize: '10px',
      color: '#ffffff'
    }).setOrigin(1, 1).setDepth(10);

    // Debug shortcuts

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

  showCredits() {
    if (this.creditsContainer) return;
    this.creditsContainer = this.add.container(0, 0).setDepth(200000);
    const w = 1920, h = 1080;
    
    // Dim background
    const touchZone = this.add.rectangle(w/2, h/2, w, h, 0x000000, 0.7).setInteractive({ useHandCursor: true });
    this.creditsContainer.add(touchZone);

    // Box (dialogue style)
    const boxW = 1200, boxH = 900;
    const boxX = (w - boxW) / 2, boxY = (h - boxH) / 2;
    const box = this.add.graphics();
    box.fillStyle(0x0a0a1a, 0.92);
    box.fillRoundedRect(boxX, boxY, boxW, boxH, 12);
    box.lineStyle(2, 0x4FD1FF, 0.8);
    box.strokeRoundedRect(boxX, boxY, boxW, boxH, 12);
    this.creditsContainer.add(box);

    const creditsText = "クレジット\n\nゲーム制作\n[Hello World] 制作チーム\n・大室朋希\n・土田果奈\n・向下祐布\n\n背景イラスト提供\n背景素材サイト\nゲームまてりあるず\n[【フリー素材】ゲームまてりあるず｜無料の背景イラスト | フリーの背景素材集](https://game-materials.com/)\nAIPICT\n[AIPICT | 背景イラストのフリー素材サイト](https://aipict.com/)\nみんちりえ\n[【フリー素材】 みんちりえ 【背景イラスト配布サイト】](https://min-chi.material.jp/)\n\n音楽提供\n・中村芳哉\n\n開発プラットフォーム\nPowered by Google Antigravity\n\nSpecial Thanks\n奥村研究室";

    const startY = boxY + 50;
    const bodyText = this.add.text(boxX + 60, startY, creditsText, {
      fontFamily: '"DotGothic16"', fontSize: '36px', color: '#E5E7EB',
      wordWrap: { width: boxW - 120, useAdvancedWrap: true }, lineSpacing: 14
    });
    this.creditsContainer.add(bodyText);

    // Mask for scrolling
    const maskGraphics = this.add.graphics();
    maskGraphics.fillStyle(0xffffff);
    maskGraphics.fillRect(boxX, boxY + 20, boxW, boxH - 100);
    const mask = maskGraphics.createGeometryMask();
    bodyText.setMask(mask);

    // Scroll zone
    const scrollZone = this.add.zone(boxX + boxW/2, boxY + boxH/2, boxW, boxH).setInteractive();
    this.creditsContainer.add(scrollZone);

    let isDragging = false;
    let lastY = 0;
    scrollZone.on('pointerdown', (pointer, localX, localY, event) => {
      event.stopPropagation();
      isDragging = true;
      lastY = pointer.y;
    });
    scrollZone.on('wheel', (pointer, deltaX, deltaY, deltaZ, event) => {
      event.stopPropagation();
      let newY = bodyText.y - deltaY;
      let minTextY = startY - Math.max(0, bodyText.height - (boxH - 140));
      if (newY > startY) newY = startY;
      if (newY < minTextY) newY = minTextY;
      bodyText.y = newY;
    });
    
    this.input.on('pointerup', () => {
      isDragging = false;
    });
    this.input.on('pointermove', (pointer) => {
      if (isDragging && this.creditsContainer) {
        let deltaY = pointer.y - lastY;
        lastY = pointer.y;
        let newY = bodyText.y + deltaY;
        let minTextY = startY - Math.max(0, bodyText.height - (boxH - 140));
        if (newY > startY) newY = startY;
        if (newY < minTextY) newY = minTextY;
        bodyText.y = newY;
      }
    });

    const closeText = this.add.text(boxX + boxW - 60, boxY + boxH - 50, '▶ CLOSE [TAP/CLICK]', {
      fontFamily: '"Press Start 2P"', fontSize: '20px', color: '#9CA3AF'
    }).setOrigin(1, 0).setInteractive({ useHandCursor: true });
    this.creditsContainer.add(closeText);
    
    this.tweens.add({ targets: closeText, alpha: 0.3, yoyo: true, repeat: -1, duration: 500 });

    const handleClose = () => {
      if (window.MOT && MOT.Audio) MOT.Audio.playSelect();
      if (maskGraphics) maskGraphics.destroy();
      this.creditsContainer.destroy();
      this.creditsContainer = null;
    };
    touchZone.on('pointerdown', handleClose);
    closeText.on('pointerdown', (pointer, localX, localY, event) => {
      event.stopPropagation();
      handleClose();
    });
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
      if (label !== 'CREDITS') {
        btn.disableInteractive();
      }
      // Quick flash then execute
      txt.setColor('#ffffff');
      btn.setAlpha(0.5);
      this.time.delayedCall(150, function () {
        btn.setAlpha(1);
        callback();
      }, [], this);
    }, this);
  }

  showCharacterList() {
    if (this.charContainer) return;
    this.charContainer = this.add.container(0, 0).setDepth(200000);
    const w = 1920, h = 1080;
    
    const touchZone = this.add.rectangle(w/2, h/2, w, h, 0x000000, 0.7).setInteractive({ useHandCursor: true });
    this.charContainer.add(touchZone);
    
    const boxW = 1400, boxH = 900;
    const boxX = (w - boxW) / 2, boxY = (h - boxH) / 2;
    const box = this.add.graphics();
    box.fillStyle(0x0a0a1a, 0.92);
    box.fillRoundedRect(boxX, boxY, boxW, boxH, 12);
    box.lineStyle(2, 0x4FD1FF, 0.8);
    box.strokeRoundedRect(boxX, boxY, boxW, boxH, 12);
    this.charContainer.add(box);

    const titleText = this.add.text(boxX + boxW/2, boxY + 40, "キャラ一覧", {
      fontFamily: '"DotGothic16"', fontSize: '42px', color: '#4FD1FF'
    }).setOrigin(0.5);
    this.charContainer.add(titleText);
    
    const chars = [
      { id: 'hero', label: '勇者', image: 'hero_stand' },
      { id: 'doctor', label: '博士', image: 'doctor_normal' },
      { id: 'kratos', label: 'クラトス', image: 'boss1_normal' },
      { id: 'touleros', label: 'トゥレロス', image: 'boss2_normal' },
      { id: 'twins', label: 'エディオ＆エナリア', image: 'sister_normal' },
      { id: 'demon', label: '魔王', image: 'demon_lord_normal' }
    ];

    const hasHelloWorld = window.MOT && MOT.hasUnlockedEnding && MOT.hasUnlockedEnding('END_ORPHAN');

    let nameText = this.add.text(boxX + 700, boxY + 200, "", { fontFamily: '"DotGothic16"', fontSize: '42px', color: '#4FD1FF' });
    let descText = this.add.text(boxX + 700, boxY + 280, "", { fontFamily: '"DotGothic16"', fontSize: '28px', color: '#E5E7EB', wordWrap: { width: 600, useAdvancedWrap: true }, lineSpacing: 15 });
    
    this.charContainer.add(nameText);
    this.charContainer.add(descText);

    let currentPortrait = null;
    let secondaryPortrait = null;

    const selectChar = (charData) => {
      let desc = "？？？";
      let dName = charData.label;
      
      if (charData.id === 'hero') {
        dName = hasHelloWorld ? "勇者（メエリア）" : "勇者";
        desc = "博士の研究所で目覚めた勇者。\nこの世界を救う存在になるのか、壊す存在になるのか、それはあなた次第。";
      }

      nameText.setText(dName);
      descText.setText(desc);
      
      if (currentPortrait) {
        currentPortrait.destroy();
        currentPortrait = null;
      }
      if (secondaryPortrait) {
        secondaryPortrait.destroy();
        secondaryPortrait = null;
      }
      
      if (charData.id === 'twins') {
        // Sister on the left, brother on the right
        currentPortrait = this.add.image(boxX + 220, boxY + 500, 'sister_normal');
        secondaryPortrait = this.add.image(boxX + 500, boxY + 500, 'brother_normal');
        
        let scaleS = 600 / currentPortrait.height;
        if (!isFinite(scaleS) || scaleS <= 0) scaleS = 0.5;
        currentPortrait.setScale(scaleS);
        
        let scaleB = 600 / secondaryPortrait.height;
        if (!isFinite(scaleB) || scaleB <= 0) scaleB = 0.5;
        secondaryPortrait.setScale(scaleB);
        
        this.charContainer.add(currentPortrait);
        this.charContainer.add(secondaryPortrait);
      } else {
        currentPortrait = this.add.image(boxX + 350, boxY + 500, charData.image);
        let scale = 600 / currentPortrait.height;
        if (!isFinite(scale) || scale <= 0) scale = 0.5;
        currentPortrait.setScale(scale);
        this.charContainer.add(currentPortrait);
      }
    };

    let btnX = boxX + 145;
    let btnY = boxY + 100;

    chars.forEach((c) => {
      let bBg = this.add.rectangle(btnX, btnY, 160, 40, 0x111122).setStrokeStyle(1, 0x4FD1FF).setInteractive({useHandCursor:true}).setOrigin(0, 0);
      let bTxt = this.add.text(btnX + 80, btnY + 20, c.label, {fontFamily: '"DotGothic16"', fontSize: '18px', color: '#fff'}).setOrigin(0.5);
      
      bBg.on('pointerover', () => bBg.setFillStyle(0x333344));
      bBg.on('pointerout', () => bBg.setFillStyle(0x111122));
      bBg.on('pointerdown', () => selectChar(c));
      
      this.charContainer.add(bBg);
      this.charContainer.add(bTxt);
      
      btnX += 190;
    });

    selectChar(chars[0]);
    
    const closeText = this.add.text(boxX + boxW / 2, boxY + boxH - 40, '[ CLOSE ]', {
      fontFamily: '"Press Start 2P"',
      fontSize: '20px',
      color: '#4FD1FF'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    this.charContainer.add(closeText);

    closeText.on('pointerdown', () => {
      this.charContainer.destroy();
      this.charContainer = null;
      this.canClick = true;
    });
  }
}

window.TitleScene = TitleScene;
