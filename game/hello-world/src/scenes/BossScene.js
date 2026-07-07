// =============================================
// BossScene.js – ボス戦（幹部→両翼→魔王）
// =============================================
class BossScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BossScene' });
  }

  init(data) {
    this.startData = data;
    this.bossQueue = ['boss1', 'boss2', 'boss3_twins', 'demon_lord'];
    this.currentBossIndex = 0;
    let isSkipping = false;
    if (data && data.bossIndex !== undefined) {
      this.currentBossIndex = data.bossIndex;
      isSkipping = true;
    } else if (data && data.startBossIndex !== undefined) {
      this.currentBossIndex = data.startBossIndex;
      isSkipping = true;
    }

    if (isSkipping || (data && data.jumpToEndingSetup)) {
      if (!MOT.flags) MOT.flags = {};
      MOT.flags.playerMaxHP = MOT.flags.playerMaxHP || 5;
      MOT.flags.playerHP = MOT.flags.playerMaxHP;
      MOT.flags.energy = 0;
    }
    

    this.debugSkipCombat = data && data.debugSkipCombat;
    this.dialogActive = false;
    this.lastDialogActive = false; // 会話終了時のクールタイム検出用
    this.bossHP = 0;
    this.bossMaxHP = 0;
    this.currentBoss = null;
    this.playerInvincible = false;
    this.autoShootTimer = 0;
    this.bossAttackTimer = 0;
    this.bossPhase = 0;
    this.bossLaneTimer = null;
    this.barrierCooldown = 0;
    this.barrierActive = false;
    this.barrierTime = 0;
    this.barrierVisual = null;
    // 博士指示システム初期化
    MOT.DoctorDirective.init();

    // UI初期化（シーン再開時の参照残存を防ぐため）
    this.energyBarBgObj = null;
    this.energyBarFgObj = null;
    this.energyBarOutline = null;
    this.iconPersonBg = null;
    this.iconPersonFill = null;
    this.dollText = null;
    this.iconBatteryBg = null;
    this.iconBatteryFill = null;
    this.intentText = null;
  }

  create() {
    const w = 1920, h = 1080;
    var bgKey = 'bg_boss_stage2';
    if (this.currentBossIndex === 1) bgKey = 'bg_boss_stage3';
    else if (this.currentBossIndex === 2) bgKey = 'bg_boss_stage4';
    else if (this.currentBossIndex === 3) bgKey = 'bg_boss_stage5';
    this.bg = this.add.image(0, 0, bgKey).setOrigin(0, 0);

    // Groups
    this.playerBullets = this.physics.add.group({ maxSize: 500 });
    this.enemyBullets = this.physics.add.group({ maxSize: 1000 });
    this.enemyGroup = this.physics.add.group();
    this.itemGroup = this.physics.add.group();

    // Player
    this.player = this.physics.add.sprite(-100, 460, 'hero_stand_combat').setScale(2).setDepth(10);
    
    // 当たり判定可視化用グラフィックス
    this.playerHitboxGraphics = this.add.graphics();
    this.playerHitboxGraphics.setDepth(11);

    this.player.play('hero_combat_anim');
    // アニメーション再生後にサイズを指定（アニメーションによって上書きされるのを防ぐ）
    this.player.body.setSize(14, 60);
    this.player.body.setOffset(25, 25);
    this.player.moveTween = this.tweens.add({ 
      targets: this.player, 
      x: 300, 
      duration: 1000, 
      ease: 'Power2',
      onComplete: () => {
        this.player.setCollideWorldBounds(true);
      }
    });
    this.player.setDrag(800, 800);
    this.player.setMaxVelocity(400, 400);

    // Trail
    this.add.particles(0, 0, 'particle', {
      follow: this.player, scale: { start: 0.6, end: 0 },
      alpha: { start: 0.3, end: 0 }, tint: 0x4FD1FF,
      lifespan: 250, frequency: 60, blendMode: 'ADD'
    });

    // Draw 3 lanes visually
    const laneYs = [220, 460, 700];
    const laneGraphics = this.add.graphics().setDepth(1);
    laneGraphics.lineStyle(2, 0x4FD1FF, 0.25);

    laneYs.forEach(function (y) {
      laneGraphics.lineBetween(0, y, w, y);
    });

    MOT.setupControls(this);
    MOT.setupTouchControls(this, this.player);

    this.physics.add.overlap(this.player, this.enemyBullets, this.onPlayerHit, null, this);
    this.inunekoGroup = this.physics.add.group();
    this.physics.add.overlap(this.playerBullets, this.inunekoGroup, this.onBossHit, null, this);
    this.physics.add.overlap(this.playerBullets, this.enemyGroup, this.onBossHit, null, this);
    this.physics.add.overlap(this.player, this.itemGroup, MOT.collectItem.bind(null, this), null, this);

    this.createHUD();
    this.cameras.main.fadeIn(800, 5, 8, 20);

    // Start first boss
    if (!(this.startData && this.startData.jumpToEndingSetup)) {
      this.time.delayedCall(1000, function () { this.startBoss(); }, [], this);
    }

    // ── デバッグ用ショートカット ──
    // Q/E/R/8/9/0: 旧エンディング直行（条件なし）
    this.input.keyboard.on('keydown-Q', () => { MOT.flags.finalEnding = 'END_USELESS'; this.scene.start('EndingScene'); });
    this.input.keyboard.on('keydown-E', () => { MOT.flags.finalEnding = 'END_SHUTDOWN'; this.scene.start('EndingScene'); });
    this.input.keyboard.on('keydown-R', () => { MOT.flags.finalEnding = 'END_TRUE_DEMON_LORD'; this.scene.start('EndingScene'); });
    this.input.keyboard.on('keydown-EIGHT', () => { MOT.flags.finalEnding = 'END_ORPHAN'; this.scene.start('EndingScene'); });
    this.input.keyboard.on('keydown-NINE', () => { MOT.flags.finalEnding = 'END_PUPPET'; this.scene.start('EndingScene'); });
    this.input.keyboard.on('keydown-ZERO', () => { MOT.flags.finalEnding = 'END_NORMAL'; this.scene.start('EndingScene'); });

    // 1〜5: 魔王撃破直後に対応エンディングの条件を整えてジャンプ
    //   1 → BAD END 傀儡     (幹部全員殺害・魔王殺す)
    //   2 → BAD END 強制シャットダウン (幹部一部殺害・DP>=100・魔王殺す)
    //   3 → NORMAL END 日常   (幹部一部殺害・DP<100・魔王殺す)
    //   4 → END 身寄りのない勇者 (幹部全員生存・魔王生かす・DP>100)
    //   5 → TRUE END 真なる魔王  (幹部全員生存・魔王生かす・DP≤100・殺意≥100)
    const jumpToDemonLordDefeat = (setupFn) => {
      MOT.flags.finalEnding = null;
      delete MOT.flags.kills;
      setupFn();
      
      // Clear current combat
      if (this.currentBoss) this.currentBoss.destroy();
      this.enemyGroup.clear(true, true);
      this.playerBullets.clear(true, true);
      this.enemyBullets.clear(true, true);
      this.physics.resume();
      this.dialogActive = false;
      if (this.choiceContainer) { this.choiceContainer.destroy(); this.choiceContainer = null; }
      
      this.currentBossIndex = 3;
      this.bossDefeated = false;
      
      let dummyBoss = this.physics.add.sprite(1400, 1080 / 2, 'demon_combat_anim');
      dummyBoss.configKey = 'demon_lord';
      dummyBoss.hp = 9999;
      this.bossHP = 9999;
      dummyBoss.active = true;
      this.currentBoss = dummyBoss;
      
      // Initialize heroImage if it doesn't exist, to prevent tweens from crashing
      if (!this.heroImage) {
        this.heroImage = this.add.image(300, 1080 / 2, 'hero_stand').setAlpha(0).setDepth(90);
      }
      
      // Trigger demon lord death sequence silently
      this.onBossHit({ active: true, damage: 9999, silent: true, destroy: function(){} }, dummyBoss);
    };

    if (this.startData && this.startData.jumpToEndingSetup) {
      const type = this.startData.jumpToEndingSetup;
      this.time.delayedCall(100, () => {
        if (type === 1) { // 1: 傀儡
          jumpToDemonLordDefeat(() => { MOT.flags.killedBoss1 = true; MOT.flags.killedBoss2 = true; MOT.flags.killedTwins = true; });
        } else if (type === 2) { // 2: 強制シャットダウン
          jumpToDemonLordDefeat(() => { MOT.flags.killedBoss1 = true; MOT.flags.killedBoss2 = false; MOT.flags.killedTwins = false; MOT.flags.dollPoints = 100; });
        } else if (type === 3) { // 3: 日常
          jumpToDemonLordDefeat(() => { MOT.flags.killedBoss1 = true; MOT.flags.killedBoss2 = false; MOT.flags.killedTwins = false; MOT.flags.dollPoints = 0; });
        } else if (type === 4) { // 4: 身寄りのない勇者
          jumpToDemonLordDefeat(() => { MOT.flags.killedBoss1 = false; MOT.flags.killedBoss2 = false; MOT.flags.killedTwins = false; MOT.flags.dollPoints = 150; });
        } else if (type === 5) { // 5: 真の魔王
          jumpToDemonLordDefeat(() => { MOT.flags.killedBoss1 = false; MOT.flags.killedBoss2 = false; MOT.flags.killedTwins = false; MOT.flags.dollPoints = 50; MOT.flags.killingIntent = 100; });
        }
      });
    }

  }

  getBossConfig(key) {
    var configs = {
      boss1: {
        texture: 'boss1_muscle', name: '幹部1 – 筋肉', hp: 30, scale: 0.15,
        intro: '「貴様が博士の人形か。\nこの俺の拳で叩き潰してやる！」',
        defeat: '「馬鹿な…この俺が…！」',
        choices: [
          { text: '止めを刺す', flag: function () { MOT.modifyFlag('brutality', 1); MOT.modifyFlag('obeyDoctor', 1); } },
          { text: '見逃す', flag: function () { MOT.modifyFlag('showMercy', 1); MOT.modifyFlag('favor.boss1', 1); } }
        ]
      },
      boss2: {
        texture: 'boss2_combat', name: '幹部2 – 戦闘狂', hp: 35, scale: 0.15,
        intro: '「ヒャハハ！ 踊れ踊れぇ！！\n俺の双銃から逃げられるかなぁ！？」',
        defeat: '「アハハハハ…最高にイカれた気分だぜ…」',
        choices: [
          { text: '止めを刺す', flag: function () { MOT.modifyFlag('brutality', 1); MOT.modifyFlag('favor.boss2', -1); } },
          { text: '見逃す', flag: function () { MOT.modifyFlag('showMercy', 1); MOT.modifyFlag('favor.boss2', 1); } }
        ]
      },
      boss3_twins: {
        texture: 'boss3', name: '男（兄）', hp: 50, scale: 3,
        texture2: 'boss3_sister', name2: '女（妹）', hp2: 50, scale2: 3,
        // Intro and defeat are handled custom via playTwinsIntro and post-battle logic
      },
      demon_lord: {
        texture: 'demon_stand_combat', name: '魔王 – ヴェリタス', hp: 60, scale: 0.5,
        intro: '「…来たか、博士の人形よ。\nお前に真実を伝えなければならない。」',
        defeat: '「聞いてくれ。博士こそが…この世界を壊そうとしている。\n俺は…それを止めたかっただけだ。」',
        choices: []
      },
      doctor: {
        texture: 'doctor_face', name: '博士', hp: 120, scale: 0.15,
        intro: '「さぁ、最終決戦といこうじゃないか！」',
        defeat: '「驚いた...まさかお前がここまでやるとはな」',
        choices: []
      }
    };
    return configs[key];
  }

  startBoss() {
    if (this.currentBossIndex >= this.bossQueue.length) {
      this.cameras.main.fadeOut(1000, 0, 0, 0);
      this.time.delayedCall(1000, function () { this.scene.start('EndingScene'); }, [], this);
      return;
    }

    var key = this.bossQueue[this.currentBossIndex];
    var cfg = this.getBossConfig(key);
    this.bossMaxHP = cfg.hp;
    this.bossHP = cfg.hp;
    this.bossPhase = 0;
    this.bossAttackTimer = 0;
    this.bossDefeated = false;

    // Spawn boss (hidden initially)
    var boss = this.physics.add.sprite(1920, 460, cfg.texture);
    if (key === 'demon_lord') boss.play('demon_combat_anim');
    boss.setScale(cfg.scale);
    boss.setDepth(8);
    this.enemyGroup.add(boss);
    this.currentBoss = boss;
    boss.hp = cfg.hp;
    boss.configKey = key;
    boss.setVisible(false);
    boss.body.enable = false;

    if (key === 'boss3_twins') {
      var sister = this.physics.add.sprite(1920, 700, cfg.texture2);
      sister.setScale(cfg.scale2);
      sister.setDepth(8);
      this.enemyGroup.add(sister);
      this.sisterBoss = sister;
      sister.hp = cfg.hp2;
      sister.maxHp = cfg.hp2;
      sister.configKey = 'boss3_twins';
      sister.setVisible(false);
      sister.body.enable = false;
      boss.maxHp = cfg.hp;
    }

    this.dialogActive = true;
    this.physics.pause();

    if (key === 'demon_lord') {
      this.inunekoEnemy = this.add.sprite(boss.x - 60, boss.y - 100, 'inuneko_combat');
      this.inunekoEnemy.setDisplaySize(90, 160);
      this.inunekoEnemy.setDepth(9);
      this.inunekoEnemy.setVisible(false);
      // バリア状態フラグ
      this.demonLordBarrierActive = false;

      if (!this.anims.exists('inuneko_anim')) {
        this.anims.create({
          key: 'inuneko_anim',
          frames: this.anims.generateFrameNumbers('inuneko_combat', { start: 0, end: 47 }),
          frameRate: 10,
          repeat: -1
        });
      }
      this.inunekoEnemy.play('inuneko_anim');
    }

    let areaText = '';
    if (key === 'boss1') areaText = '「次のエリアに着いたか。そこは、黄昏の荒野だ。魔王城までまだ距離があるからそこまで敵は強くないが気は抜くなよ。」';
    else if (key === 'boss2') areaText = '「次のエリアに着いたか。そこは、宵闇の森だ。」';
    else if (key === 'boss3_twins') areaText = '「次のエリアに着いたか。そこは、子夜の城塞 だ。そろそろ魔王城に着くだろう。敵も強くなっている。気を付けてくれ」';
    else if (key === 'demon_lord') areaText = '「とうとう魔王城に着いたか。そこには魔王がいるはずだ。警戒を怠らないように」';

    // デバッグ用: 戦闘スキップして即死させる
    if (this.debugSkipCombat && key === 'demon_lord') {
      boss.setVisible(true);
      boss.hp = 0;
      this.time.delayedCall(100, () => {
        this.onBossHit({ active: true, damage: 9999, destroy: function(){} }, boss);
      });
      return;
    }

    if (areaText !== '') {
      this.showDeviceDialogue(areaText, () => {
        this.startBossIntro(key, boss);
      });
    } else {
      this.startBossIntro(key, boss);
    }
  }

  async playDialogSequence(seq, onComplete) {
    this.dialogActive = true;
    for (let i = 0; i < seq.length; i++) {
      let d = seq[i];
      await new Promise(res => {
        if (d.speaker === '博士') {
          this.showDeviceDialogue(d.text, res);
        } else {
          this.showDialogue(d.speaker, d.text, res);
        }
      });
    }
    if (onComplete) onComplete();
  }

  startBossIntro(key, boss) {
    if (key !== 'demon_lord' && key !== 'doctor') {
      this.dialogActive = false;
      this.physics.resume();
    } else {
      this.dialogActive = true;
      this.physics.pause();
    }
    
    if (key === 'demon_lord' || key === 'doctor') {
       boss.setVisible(true); boss.body.enable = true;
       this.cameras.main.shake(400, 0.015);
        if (key === 'demon_lord' && this.inunekoEnemy) {
         this.inunekoEnemy.setVisible(true);
         // 会話中はボスの右隣に静止（上下小揺れのみ）
         this.inunekoEnemy.x = 1920;
         this.tweens.add({ targets: this.inunekoEnemy, x: 1350, duration: 1200, ease: 'Power2' });
         this.tweens.add({ targets: this.inunekoEnemy, y: '-=20', duration: 1600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
       }
       this.tweens.add({
         targets: boss, x: 1400, duration: 1200, ease: 'Power2',
         onComplete: () => {
           this.tweens.add({ targets: boss, y: boss.y - 30, yoyo: true, repeat: -1, duration: 1000, ease: 'Sine.easeInOut' });
           
           if (key === 'demon_lord') {
             this.playDemonLordIntro(() => {
               this.dialogActive = false;
               this.physics.resume();
               this.startBossLaneMovement();
             });
           } else {
             // Doctor intro
             var w = 1920, h = 1080;
             var dimBg = this.add.rectangle(w/2, h/2, w, h, 0x000000, 0.6).setAlpha(0).setDepth(89);
             this.heroImage = this.add.image(300, h / 2, 'hero_stand').setAlpha(0).setDepth(90);
             var hScale = 750 / this.heroImage.width;
             this.heroImage.setScale(hScale);
             this.heroImage.setY(100 + (this.heroImage.height * hScale) / 2);
    // removed demonImage init
             this.doctorImage = this.add.image(w - 300, h / 2, 'doctor_stand').setAlpha(0).setDepth(90);
             var docScale = 750 / this.doctorImage.width;
             this.doctorImage.setScale(docScale);
             this.doctorImage.setY(100 + (this.doctorImage.height * docScale) / 2);
             
             this.tweens.add({ targets: [dimBg, this.doctorImage], alpha: 1, duration: 500 });
             
             const sayDevice = (text) => new Promise(res => { this.tweens.add({ targets: dimBg, alpha: 0.6, duration: 300 }); this.tweens.add({ targets: [this.doctorImage, this.heroImage], alpha: 0.4, duration: 300 }); this.showDeviceDialogue(text, res); });
             const sayDoctor = (text) => new Promise(res => { this.tweens.add({ targets: dimBg, alpha: 0.6, duration: 300 }); this.tweens.add({ targets: [this.doctorImage], alpha: 1, duration: 300 }); this.tweens.add({targets: this.heroImage, alpha: 0.4, duration: 300}); this.showDialogue('博士', text, res); });
             
             (async () => {
               await sayDoctor('「さぁ、最終決戦といこうじゃないか！」');
               this.tweens.add({
                 targets: [dimBg, this.doctorImage, this.heroImage], alpha: 0, duration: 500,
                 onComplete: () => { dimBg.destroy(); this.doctorImage.destroy(); if(this.heroImage) this.heroImage.destroy(); }
               });
               this.dialogActive = false;
               this.physics.resume();
               this.startBossLaneMovement();
             })();
           }
         }
       });

    } else {
         // Minion phase
         this.minionBattleActive = true;
         this.minionsToKill = 3;
         var laneYs = [220, 460, 700];
         for(let i = 0; i < 3; i++) {
           this.time.delayedCall(1000 + i * 800, () => {
             var e = this.enemyGroup.create(1920 + 50, laneYs[Phaser.Math.Between(0, 2)], 'enemy_basic');
             e.setVelocityX(-200);
             e.hp = (key === 'boss3_twins') ? 2 : 3;
             e.isScenarioMinion = true;
             this.tweens.add({
               targets: e, y: e.y + Phaser.Math.Between(-40, 40),
               yoyo: true, repeat: -1, duration: 900, ease: 'Sine.easeInOut'
             });
             e.fireTimer = this.time.addEvent({
               delay: 1500, callback: () => { if (e.active) { let b = MOT.fireLinear(this, e.x, e.y, -300, 0); if(b) b.shooter = e; } }, loop: true, callbackScope: this
             });
             e.on('destroy', () => { if (e.fireTimer) e.fireTimer.destroy(); });
           }, [], this);
         }
      }
  }
  playDemonLordIntro(onComplete) {
    var dimBg = this.add.rectangle(1920/2, 1080/2, 1920, 1080, 0x000000, 0.6).setAlpha(0).setDepth(89);
    this.heroImage = this.add.image(300, 1080 / 2, 'hero_stand').setAlpha(0).setDepth(90);
    var hScale = 750 / this.heroImage.width;
    this.heroImage.setScale(hScale);
    this.heroImage.setY(100 + (this.heroImage.height * hScale) / 2);
    
    this.demonImage = this.add.image(1920 - 300, 1080 / 2, 'demon_lord_normal').setAlpha(0).setDepth(90);
    var dScale = 1000 / this.demonImage.width;
    this.demonImage.setScale(dScale);
    this.demonImage.setY(100 + (this.demonImage.height * dScale) / 2 - 200);

    // 犬猫スター会話用立ち絵
    this.inunekoImage = this.add.image(1920 - 120, 1080 / 2 - 250, 'inuneko_stand').setAlpha(0).setDepth(91);
    var iScale = 300 / 691; // Fixed width from cropped image
    this.inunekoImage.setScale(iScale);
    this.inunekoImage.setY(350); // 顔の右側（高さを顔付近に調整）
    this.time.addEvent({
      delay: 3000, loop: true, callback: () => {
        if (this.inunekoImage && this.inunekoImage.active && this.inunekoImage.alpha > 0) {
          if (this.inunekoImage.texture.key === 'inuneko_stand') {
            this.inunekoImage.setTexture('inuneko_blink');
            this.time.delayedCall(150, () => {
              if (this.inunekoImage && this.inunekoImage.active && this.inunekoImage.texture.key === 'inuneko_blink') {
                this.inunekoImage.setTexture('inuneko_stand');
              }
            });
          }
        }
      }
    });
    
    const sayDevice = (text) => new Promise(res => {
      this.tweens.add({ targets: dimBg, alpha: 0, duration: 300 });
      this.tweens.add({ targets: this.heroImage, alpha: 0, duration: 300 });
      if(this.demonImage) this.tweens.add({ targets: this.demonImage, alpha: 0, duration: 300 });
      if(this.inunekoImage) this.tweens.add({ targets: this.inunekoImage, alpha: 0, duration: 300 });
      this.showDeviceDialogue(text, res);
    });

    const sayInuneko = (text, tex = 'inuneko_stand') => new Promise(res => {
      this.tweens.add({ targets: dimBg, alpha: 0.6, duration: 300 });
      this.tweens.add({ targets: this.heroImage, alpha: 0.4, duration: 300 });
      if(this.demonImage) this.tweens.add({ targets: this.demonImage, alpha: 0.4, duration: 300 });
      if(this.inunekoImage) {
        this.tweens.add({ targets: this.inunekoImage, alpha: 1, duration: 300 });
        this.inunekoImage.setTexture(tex);
      }
      this.showDialogue('犬猫☆すたー', text, res);
    });

    const sayHero = (text) => new Promise(res => {
      this.tweens.add({ targets: dimBg, alpha: 0.6, duration: 300 });
      this.tweens.add({ targets: this.heroImage, alpha: 1, duration: 300 });
      if(this.demonImage) this.tweens.add({ targets: this.demonImage, alpha: 0.4, duration: 300 });
      if(this.inunekoImage) this.tweens.add({ targets: this.inunekoImage, alpha: 0.4, duration: 300 });
      if (text === '「……」' || text === '「……。」' || text === '「…」') {
        this.heroImage.setTexture('hero_stand_silent');
      } else {
        this.heroImage.setTexture('hero_stand');
      }
      this.heroImage.setScale(750 / this.heroImage.width);
      this.heroImage.setY(100 + (this.heroImage.height * this.heroImage.scaleY) / 2);
      this.showDialogue('勇者', text, res);
    });

    const sayDemon = (text, tex = 'demon_lord_normal') => new Promise(res => {
      this.tweens.add({ targets: dimBg, alpha: 0.6, duration: 300 });
      this.tweens.add({ targets: this.heroImage, alpha: 0.4, duration: 300 });
      if(this.demonImage) {
        this.tweens.add({ targets: this.demonImage, alpha: 1, duration: 300 });
        this.demonImage.setTexture(tex);
        this.demonImage.setScale(1000 / this.demonImage.width);
        this.demonImage.setY(100 + (this.demonImage.height * this.demonImage.scaleY) / 2 - 200);
      }
      if(this.inunekoImage) {
        this.tweens.add({ targets: this.inunekoImage, alpha: 0.4, duration: 300 });
      }
      this.showDialogue('魔王 – ヴェリタス', text, res);
    });

    (async () => {
      await sayDevice('「とうとう魔王城に着いたな。そこには魔王がいるはずだ。警戒を怠らないようにしろ。」');
      await sayDemon('「－－－よくぞここまで来た！無謀な侵入者よ！」');
      await sayInuneko('「いつもいつも懲りないやつらだにゃ！」');
      await sayHero('「！？」');
      await sayDevice('「ついに出てきな！魔王め！あいつのせいで、俺は……」');
      await sayHero('「え、あのマスコットが魔王……？」');
      await sayDevice('「……は？ちがう！あいつは魔王の奴隷だ！」');
      await sayHero('「奴隷……？」');
      await sayInuneko('「にゃにゃ！？奴隷じゃなくて魔王様の親愛なる使い魔であり、偉大な『犬猫☆すたー』だわん！」');
      await sayHero('「（犬なのか、猫なのか、ハムスターなのかはっきりしない生き物だな…）」');
      await sayDemon('「ふふ、わらわの部下が世話になったな？魔王として、その返礼をくれてやろう」');
      await sayDevice('「気をつけろ。奴はこれまでの敵とは比べ物にならない」');
      await sayHero('「……僕は君を倒しに来た勇者だ。ここで決着をつけよう」');
      await sayDemon('「そうか、貴様は”勇者”なのか……。しかし”勇者”よ。戦う前に一つ問おう。貴様は自分が何者か知っているのか？」');
      await sayHero('「…？」');
      await sayDevice('「奴の言葉に耳を貸す必要はない。お前はただ、与えられた使命をはたすのだ」');
      await sayDemon('「……まあよい。今ここで話したところで、お前は信じぬだろう。だが覚えておけ。見えているものだけが真実とは限らぬ。」');
      await sayHero('「僕は」');
      await sayDemon('「来るがよい、”勇者”！」');
      await sayInuneko('「受けてたつにゃん、”勇者”！」');
      
      this.tweens.add({ targets: [dimBg, this.heroImage, this.demonImage], alpha: 0, duration: 300 });
      if(this.inunekoImage) this.tweens.add({ targets: this.inunekoImage, alpha: 0, duration: 300 });
      onComplete();
    })();
  }

  playTwinsIntro(onComplete) {
    var w = 1920, h = 1080;
    var dimBg = this.add.rectangle(w/2, h/2, w, h, 0x000000, 0.6).setAlpha(0).setDepth(89);
    
    this.heroImage = this.add.image(300, h / 2, 'hero_stand').setAlpha(0).setDepth(90);
    var hScale = 750 / this.heroImage.width;
    this.heroImage.setScale(hScale);
    this.heroImage.setY(100 + (this.heroImage.height * hScale) / 2);
    
    // Male Frame (Brother)
    var maleFrame = this.add.rectangle(w - 300, h / 2 - 160, 300, 300, 0x1F2933).setAlpha(0).setDepth(90).setStrokeStyle(4, 0x4FD1FF);
    var maleLabel = this.add.text(w - 300, h / 2 - 160, '男（兄）', { fontFamily: '"DotGothic16"', fontSize: '40px', color: '#ffffff' }).setOrigin(0.5).setAlpha(0).setDepth(90);
    
    // Female Frame (Sister)
    var femaleFrame = this.add.rectangle(w - 300, h / 2 + 160, 300, 300, 0x1F2933).setAlpha(0).setDepth(90).setStrokeStyle(4, 0xFF4B6E);
    var femaleLabel = this.add.text(w - 300, h / 2 + 160, '女（妹）', { fontFamily: '"DotGothic16"', fontSize: '40px', color: '#ffffff' }).setOrigin(0.5).setAlpha(0).setDepth(90);

    const sayDevice = (text) => new Promise(res => {
      this.tweens.add({ targets: [dimBg, this.heroImage, maleFrame, maleLabel, femaleFrame, femaleLabel], alpha: 0, duration: 300 });
      this.showDeviceDialogue(text, res);
    });

    const sayTwin = (speaker, text) => new Promise(res => {
      this.tweens.add({ targets: dimBg, alpha: 0.6, duration: 300 });
      this.tweens.add({ targets: this.heroImage, alpha: 0.4, duration: 300 });
      if (speaker === '男') {
        this.tweens.add({ targets: [maleFrame, maleLabel], alpha: 1, duration: 300 });
        this.tweens.add({ targets: [femaleFrame, femaleLabel], alpha: 0.4, duration: 300 });
      } else {
        this.tweens.add({ targets: [maleFrame, maleLabel], alpha: 0.4, duration: 300 });
        this.tweens.add({ targets: [femaleFrame, femaleLabel], alpha: 1, duration: 300 });
      }
      this.showDialogue(speaker, text, res);
    });

    const sayInuneko = (text, tex = 'inuneko_stand') => new Promise(res => {
      this.tweens.add({ targets: dimBg, alpha: 0.6, duration: 300 });
      this.tweens.add({ targets: this.heroImage, alpha: 0.4, duration: 300 });
      if(this.demonImage) this.tweens.add({ targets: this.demonImage, alpha: 0.4, duration: 300 });
      if(this.inunekoImage) {
        this.tweens.add({ targets: this.inunekoImage, alpha: 1, duration: 300 });
        this.inunekoImage.setTexture(tex);
      }
      this.showDialogue('犬猫☆すたー', text, res);
    });

    const sayHero = (text) => new Promise(res => {
      this.tweens.add({ targets: dimBg, alpha: 0.6, duration: 300 });
      this.tweens.add({ targets: this.heroImage, alpha: 1, duration: 300 });
      this.tweens.add({ targets: [maleFrame, maleLabel, femaleFrame, femaleLabel], alpha: 0.4, duration: 300 });
      this.showDialogue('勇者', text, res);
    });

    (async () => {
      await sayDevice('「次のエリアに着いたか。そこは、○○（エリア名）だ。そろそろ魔王のいるエリアになるだろう。気を付けてくれ」');
      await sayTwin('男', '「…来たか」');
      await sayTwin('女', '「来たわね。兄様」');
      await sayDevice('「…？！お前たちは…」');
      await sayHero('「？」');
      await sayTwin('男', '「単刀直入に言うと、君は博士に騙されている。悪いことは言わないからこちらに寝返った方がいい」');
      await sayDevice('「彼らの言葉に耳を傾けてはいけない。早く倒すんだ」');
      await sayHero('「…」');
      await sayTwin('女', '「…そう。意思は硬いのね。仕方ないわ兄様」');
      await sayTwin('男', '「君を彼女の元にはいかせない。ここで食い止めるよ」');

      this.tweens.add({
        targets: [dimBg, this.heroImage, maleFrame, maleLabel, femaleFrame, femaleLabel], alpha: 0, duration: 500,
        onComplete: () => {
          dimBg.destroy(); this.heroImage.destroy(); maleFrame.destroy(); maleLabel.destroy(); femaleFrame.destroy(); femaleLabel.destroy();
          onComplete();
        }
      });
    })();
  }

  startSisterLaneMovement() {
    if (this.sisterLaneTimer) this.sisterLaneTimer.destroy();
    this.sisterLaneTimer = this.time.addEvent({
      delay: 2500,
      callback: function () {
        if (this.sisterBoss && this.sisterBoss.active && !this.dialogActive && this.sisterBoss.hp > 0) {
          var laneYs = [220, 460, 700];
          var targetY = laneYs[Phaser.Math.Between(0, 2)];
          
          // 兄(currentBoss)と重ならないようにする
          if (this.currentBoss && this.currentBoss.active) {
            var brotherTarget = this.currentBoss.targetLaneY || this.currentBoss.y;
            var brotherBaseY = laneYs.reduce((prev, curr) => Math.abs(curr - brotherTarget) < Math.abs(prev - brotherTarget) ? curr : prev);
            var available = laneYs.filter(y => y !== brotherBaseY);
            if (available.length > 0) {
              targetY = available[Phaser.Math.Between(0, available.length - 1)];
            }
          }
          this.sisterBoss.targetLaneY = targetY;

          this.tweens.killTweensOf(this.sisterBoss);
          this.tweens.add({
            targets: this.sisterBoss,
            y: targetY,
            duration: 800,
            ease: 'Cubic.easeInOut',
            onComplete: function () {
              if (this.sisterBoss && this.sisterBoss.active && !this.dialogActive) {
                this.tweens.add({ targets: this.sisterBoss, y: targetY + 15, yoyo: true, repeat: -1, duration: 1100, ease: 'Sine.easeInOut' });
              }
            }.bind(this)
          });
        }
      },
      callbackScope: this,
      loop: true
    });
  }

  startBossLaneMovement() {
    if (this.bossLaneTimer) {
      this.bossLaneTimer.destroy();
    }
    this.bossLaneTimer = this.time.addEvent({
      delay: 3000,
      callback: function () {
        if (this.currentBoss && this.currentBoss.active && !this.dialogActive) {
          var laneYs = [220, 460, 700];
          var targetY = laneYs[Phaser.Math.Between(0, 2)];
          
          // 妹(sisterBoss)と重ならないようにする
          if (this.currentBoss.configKey === 'boss3_twins' && this.sisterBoss && this.sisterBoss.active) {
            var sisterTarget = this.sisterBoss.targetLaneY || this.sisterBoss.y;
            var sisterBaseY = laneYs.reduce((prev, curr) => Math.abs(curr - sisterTarget) < Math.abs(prev - sisterTarget) ? curr : prev);
            var available = laneYs.filter(y => y !== sisterBaseY);
            if (available.length > 0) {
              targetY = available[Phaser.Math.Between(0, available.length - 1)];
            }
          }
          this.currentBoss.targetLaneY = targetY;

          this.tweens.killTweensOf(this.currentBoss);
          this.tweens.add({
            targets: this.currentBoss,
            y: targetY,
            duration: 800,
            ease: 'Cubic.easeInOut',
            onComplete: function () {
              if (this.currentBoss && this.currentBoss.active && !this.dialogActive) {
                this.tweens.add({
                  targets: this.currentBoss,
                  y: targetY - 15,
                  yoyo: true,
                  repeat: -1,
                  duration: 1000,
                  ease: 'Sine.easeInOut'
                });
              }
            }.bind(this)
          });
        }
      },
      callbackScope: this,
      loop: true
    });

    // 犬猫スターの戦闘行動を開始
    if (this.inunekoEnemy && this.currentBoss && this.currentBoss.configKey === 'demon_lord') {
      this.startInunekoFight(this.currentBoss);
    }
  }

  startInunekoFight(boss) {
    // 上下フワフワtweenを止めてから軌道移動へ
    this.tweens.killTweensOf(this.inunekoEnemy);

    // ボスの周囲をランダムに飛び回る
    const orbitInuneko = () => {
      if (!this.inunekoEnemy || this.dialogActive) return;
      const offsetX = Phaser.Math.Between(-180, 40);
      const offsetY = Phaser.Math.Between(-130, 130);
      const duration = Phaser.Math.Between(1200, 2500);
      this.tweens.add({
        targets: this.inunekoEnemy,
        x: boss.x + offsetX,
        y: boss.y + offsetY,
        duration: duration,
        ease: 'Sine.easeInOut',
        onComplete: orbitInuneko
      });
    };
    orbitInuneko();

    // 弾幕（プレイヤー方向に2.5秒ごと）
    this.inukoBulletTimer = this.time.addEvent({
      delay: 2500,
      loop: true,
      callback: () => {
        if (this.dialogActive || !this.inunekoEnemy || !this.inunekoEnemy.visible) return;
        const angleDeg = Phaser.Math.RadToDeg(Phaser.Math.Angle.Between(this.inunekoEnemy.x, this.inunekoEnemy.y, this.player.x, this.player.y));
        MOT.fireFan(this, this.inunekoEnemy.x, this.inunekoEnemy.y, 3, 250, angleDeg, 40);
      }
    });

    // 補助魔法（20〜35秒ごとにランダムで弾幕加速 or バリア）
    const supportAction = () => {
      if (this.dialogActive || !this.inunekoEnemy || !this.inunekoEnemy.visible) {
        this.time.delayedCall(Phaser.Math.Between(20000, 35000), supportAction);
        return;
      }
      const action = Phaser.Math.Between(0, 1);
      if (action === 0) {
        this.inunekoSpeedBoost();
      } else {
        this.inunekoBarrier(boss);
      }
      this.time.delayedCall(Phaser.Math.Between(20000, 35000), supportAction);
    };
    this.time.delayedCall(Phaser.Math.Between(20000, 35000), supportAction);
  }

  // 補助魔法1: 弾幕加速（8秒間ボスの攻撃間隔を短縮）
  inunekoSpeedBoost() {
    MOT.Audio.playMagic();
    // キラキラエフェクト（犬猫の位置から）
    for (let i = 0; i < 8; i++) {
      this.time.delayedCall(i * 60, () => {
        if (!this.inunekoEnemy) return;
        const star = this.add.text(
          this.inunekoEnemy.x + Phaser.Math.Between(-30, 30),
          this.inunekoEnemy.y + Phaser.Math.Between(-30, 30),
          '✦', { fontSize: '18px', color: '#FFD700' }
        ).setDepth(20);
        this.tweens.add({ targets: star, y: star.y - 40, alpha: 0, duration: 600, onComplete: () => star.destroy() });
      });
    }
    this.inunekoBoostActive = true;
    this.time.delayedCall(8000, () => { this.inunekoBoostActive = false; });
  }

  // 補助魔法2: 魔王にバリアを張る（5秒間ダメージ無効）
  inunekoBarrier(boss) {
    if (this.demonLordBarrierActive) return;
    MOT.Audio.playMagic();
    this.demonLordBarrierActive = true;
    // バリアの見た目（ボスの周囲に光輪）
    this.barrierGraphic = this.add.graphics().setDepth(15);
    const drawBarrier = () => {
      if (!this.barrierGraphic) return;
      this.barrierGraphic.clear();
      this.barrierGraphic.lineStyle(3, 0xAA88FF, 0.7 + 0.3 * Math.sin(Date.now() / 150));
      this.barrierGraphic.strokeCircle(boss.x, boss.y, 80);
    };
    this.barrierUpdateCb = drawBarrier;
    // 5秒後に解除
    this.time.delayedCall(5000, () => {
      this.demonLordBarrierActive = false;
      if (this.barrierGraphic) { this.barrierGraphic.destroy(); this.barrierGraphic = null; }
      this.barrierUpdateCb = null;
    });
  }



  update(time, delta) {
    // 当たり判定の描画（常にプレイヤーのbodyに追従する水色の線）
    if (this.playerHitboxGraphics) {
      this.playerHitboxGraphics.clear();
      if (this.player && this.player.active && this.player.alpha > 0) {
        this.playerHitboxGraphics.lineStyle(3, 0x00ffff, 0.8);
        this.playerHitboxGraphics.strokeRect(this.player.body.x, this.player.body.y, this.player.body.width, this.player.body.height);
      }
      if (this.currentBoss && this.currentBoss.active && this.currentBoss.visible) {
        this.playerHitboxGraphics.lineStyle(3, 0xff00ff, 0.8);
        this.playerHitboxGraphics.strokeRect(this.currentBoss.body.x, this.currentBoss.body.y, this.currentBoss.body.width, this.currentBoss.body.height);
      }
      if (this.sisterBoss && this.sisterBoss.active && this.sisterBoss.visible) {
        this.playerHitboxGraphics.lineStyle(3, 0xff00ff, 0.8);
        this.playerHitboxGraphics.strokeRect(this.sisterBoss.body.x, this.sisterBoss.body.y, this.sisterBoss.body.width, this.sisterBoss.body.height);
      }
    }

    // 博士の指示システム update（ダイアログ判定より先に実行して、表示非表示を管理する）
    if (this.currentBossIndex >= 4 || MOT.flags.demonLordFinished) {
      if (MOT.DoctorDirective && MOT.DoctorDirective.directiveContainer) {
        MOT.DoctorDirective.hideDirective(this);
      }
    } else {
      MOT.DoctorDirective.update(this, delta, this.player, this.dialogActive);
    }

    // 会話が終わった瞬間（dialogActive が true から false に変わった時）に、バリアのクールタイムを最大（0%からチャージ）にする
    if (!this.dialogActive && this.lastDialogActive) {
      // 2秒（2000ms）のフルクールタイムをセットし、戦闘開始直後のバリアを完全に防ぐ
      this.barrierCooldown = 2000;
    }
    this.lastDialogActive = this.dialogActive;

    if (this.dialogActive) return;

    MOT.handleMovement(this, this.player);

    // Auto-shoot
    this.autoShootTimer += delta;
    if (this.autoShootTimer >= 200) {
      this.autoShootTimer = 0;
      var b = this.playerBullets.create(this.player.x + 30, this.player.y, 'bullet_player');
      if (b) {
        b.setVelocityX(600); b.setScale(2);
        MOT.Audio.playShot();
        this.time.delayedCall(4000, function () { if (b.active) b.destroy(); });
      }
    }

    // Barrier Logic
    if (this.barrierCooldown > 0) {
      this.barrierCooldown -= delta;
      if (this.barrierCooldown < 0) this.barrierCooldown = 0;
    }

    if (this.barrierActive) {
      this.barrierTime += delta;
      if (this.barrierVisual) {
        this.barrierVisual.setPosition(this.player.x, this.player.y);
      }
      if (this.barrierTime >= 3000) {
        this.deactivateBarrier();
      }
    }

    // Boss attacks
    if (this.currentBoss && this.currentBoss.active && this.currentBoss.visible) {
      this.bossAttackTimer += delta;
      var interval = this.bossHP < this.bossMaxHP * 0.5 ? 600 : 1000;
      if (this.inunekoBoostActive) interval = Math.floor(interval * 0.5); // 犬猫スター弾幕加速
      if (this.currentBoss.configKey === 'boss3_twins') interval = 3000; // Brother shoots less frequently
      
      if (this.bossAttackTimer >= interval) {
        this.bossAttackTimer = 0;
        this.bossAttack();
      }
    }
    
    // Sister attacks
    if (this.currentBoss && this.currentBoss.configKey === 'boss3_twins' && this.sisterBoss && this.sisterBoss.active && this.sisterBoss.visible && !this.dialogActive) {
      if (!this.sisterAttackTimer) this.sisterAttackTimer = 0;
      this.sisterAttackTimer += delta;
      if (this.sisterAttackTimer >= 2000) {
        this.sisterAttackTimer = 0;
        MOT.fireCircle(this, this.sisterBoss.x, this.sisterBoss.y, 8, 200, 0x7CFF00);
      }
    }

    // Cleanup
    this.enemyGroup.getChildren().forEach(function (e) {
      if (e.x < -100) {
        if (e.isScenarioMinion || e.isIntermissionEnemy) {
          this.onBossHit({ active: true, damage: 9999, silent: true, destroy: function(){} }, e);
        } else {
          e.destroy();
        }
      }
    }.bind(this));

    this.enemyBullets.getChildren().forEach(function (b) {
      if (b.x < -50 || b.x > 2000 || b.y < -50 || b.y > 1130) b.destroy();
    });
    this.playerBullets.getChildren().forEach(function (b) {
      if (b.x > 1600) b.destroy();
    });

    // 犬猫バリアグラフィック更新
    if (this.barrierUpdateCb) this.barrierUpdateCb();

    this.updateHUD();
  }

  onBarrierUse() {
    if (this.barrierCooldown <= 0 && !this.barrierActive && !this.dialogActive) {
      MOT.Audio.playBleep();
      this.barrierActive = true;
      this.barrierTime = 0;
      this.barrierCooldown = 2000;
      this.barrierActivatedTime = this.time.now; // ジャストガード用タイマー記録

      this.barrierVisual = this.add.circle(this.player.x, this.player.y, 60, 0x00FFaa, 0.3);
      this.barrierVisual.setStrokeStyle(4, 0x00FFaa, 0.8);
      this.barrierVisual.setDepth(9);
    }
  }

  deactivateBarrier() {
    this.barrierActive = false;
    if (this.barrierVisual) {
      this.tweens.add({
        targets: this.barrierVisual,
        scale: 1.5,
        alpha: 0,
        duration: 200,
        onComplete: () => {
          if (this.barrierVisual) this.barrierVisual.destroy();
          this.barrierVisual = null;
        }
      });
    }
  }

  onSpecialAttack() {
    if (MOT.flags.maxEnergy) {
      MOT.Audio.playSpecial();
      this.cameras.main.flash(500, 79, 209, 255);
      for (let i = 0; i < 36; i++) {
        const angle = Phaser.Math.DegToRad(i * 10);
        const bullet = this.playerBullets.create(this.player.x, this.player.y, 'bullet_player');
        if (bullet) {
          bullet.setVelocity(Math.cos(angle) * 1000, Math.sin(angle) * 1000);
          bullet.setScale(4);
          bullet.setTint(0x4FD1FF);
          this.time.delayedCall(1500, function () {
            if (bullet.active) bullet.destroy();
          });
        }
      }

      if (this.enemyGroup) {
        this.enemyGroup.getChildren().slice().forEach(enemy => {
          if (enemy.isIntermissionEnemy && enemy.active) {
            this.onBossHit({ active: true, damage: 9999, silent: true, destroy: () => { } }, enemy);
          }
        });
      }

      MOT.flags.energy = 0;
      MOT.flags.maxEnergy = false;
    }
  }

  bossAttack() {
    if (!this.currentBoss || !this.currentBoss.active) return;
    var x = this.currentBoss.x, y = this.currentBoss.y;

    // boss1（筋肉）は斬撃攻撃
    if (this.currentBoss.configKey === 'boss1') {
      this.attackSlash(x, y);
      return;
    }

    // boss2（戦闘狂）は双銃攻撃
    if (this.currentBoss.configKey === 'boss2') {
      this.attackDualGuns(x, y);
      return;
    }
    
    // boss3_twins（兄）は追尾弾
    if (this.currentBoss.configKey === 'boss3_twins') {
      MOT.fireHoming(this, x, y, 200, this.player, 0x4FD1FF);
      return;
    }

    var pattern = Phaser.Math.Between(0, 3);
    if (pattern === 0) {
      MOT.fireFan(this, x - 30, y, 5, 280, 180, 60);
    } else if (pattern === 1) {
      MOT.fireCircle(this, x, y, 12, 200);
    } else if (pattern === 2) {
      MOT.fireHoming(this, x, y, 220, this.player);
      MOT.fireHoming(this, x, y - 40, 200, this.player);
    } else {
      for (var i = 0; i < 3; i++) {
        this.time.delayedCall(i * 150, function () {
          MOT.fireFan(this, x - 30, y, 3, 300, 180, 30);
        }, [], this);
      }
    }
  }

  // 斬撃攻撃（幹部1筋肉用）
  attackSlash(bx, by) {
    var self = this;
    var laneYs = [220, 460, 700];
    var pattern = Phaser.Math.Between(0, 2);

    if (pattern === 0) {
      // 1本の斬撃が飛んでくる
      var targetY = laneYs[Phaser.Math.Between(0, 2)];
      self.fireSlash(bx, targetY);
    } else if (pattern === 1) {
      // 2本連続で同じレーンに（よりゆっくり間隔をあける）
      var idx = Phaser.Math.Between(0, 2);
      self.fireSlash(bx, laneYs[idx]);
      self.time.delayedCall(1000, function () {
        if (self.currentBoss && self.currentBoss.active) self.fireSlash(bx, laneYs[idx]);
      });
    } else {
      // 2本連続で別のレーンへ（非常にゆっくり）
      var idx1 = Phaser.Math.Between(0, 2);
      var idx2 = (idx1 + 1) % 3;
      self.fireSlash(bx, laneYs[idx1]);
      self.time.delayedCall(1200, function () {
        if (self.currentBoss && self.currentBoss.active) {
          self.fireSlash(bx, laneYs[idx2]);
        }
      });
    }
  }

  // 単一斬撃弾を発射する
  fireSlash(fromX, fromY) {
    var slash = this.enemyBullets.create(fromX, fromY, 'slash_attack');
    if (!slash) return;
    slash.setVelocityX(-300); // 左方向に低速（大幅に緩和）
    slash.setScale(2);        // 縦長の斬撃を少し拡大
    slash.setDepth(9);
    // 小さな振動で斬撃っぽさを演出
    this.tweens.add({
      targets: slash,
      y: fromY + Phaser.Math.Between(-15, 15),
      duration: 150,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
    // 7秒後に自動破棄（画面左端まで到達させるため時間を延長）
    this.time.delayedCall(7000, function () { if (slash.active) slash.destroy(); });
  }

  // 双銃攻撃（幹部2 戦闘狂用）
  attackDualGuns(bx, by) {
    var self = this;
    var laneYs = [220, 460, 700];
    var p = Phaser.Math.Between(0, 2);

    if (p === 0) {
      // 2つの異なるレーンに同時発射（回避がシビアに）
      var l1 = Phaser.Math.Between(0, 2);
      var l2 = (l1 + Phaser.Math.Between(1, 2)) % 3;
      self.fireGunBullet(bx, laneYs[l1]);
      self.fireGunBullet(bx, laneYs[l2]);
    } else if (p === 1) {
      // 同じレーンに2連射（時間差を150msに短縮し高速化）
      var l = laneYs[Phaser.Math.Between(0, 2)];
      self.fireGunBullet(bx, l);
      self.time.delayedCall(150, function () {
        if (self.currentBoss && self.currentBoss.active) self.fireGunBullet(bx, l);
      });
    } else {
      // 上下レーンに時間差で発射（トリッキーな動き、時間差100msに短縮）
      var l1 = Phaser.Math.Between(0, 2);
      var l2 = Phaser.Math.Between(0, 2);
      self.fireGunBullet(bx, laneYs[l1] - 20); // 少し上にずらす
      self.time.delayedCall(100, function () {
        if (self.currentBoss && self.currentBoss.active) self.fireGunBullet(bx, laneYs[l2] + 20); // 少し下にずらす
      });
    }
  }

  // 単一拳銃弾を発射する
  fireGunBullet(fromX, fromY) {
    if (this.dialogActive) return;
    var b = this.enemyBullets.create(fromX, fromY, 'bullet_enemy');
    if (b) {
      b.setVelocityX(-800); // 高速の弾丸（難易度アップ）
      b.setScale(1.5);
      b.setDepth(9);
      this.time.delayedCall(4000, function () { if (b.active) b.destroy(); });
    }
  }

  onPlayerHit(player, obj) {
    if (this.playerInvincible || this.dialogActive) return;

    if (this.barrierActive) {
      const isJustGuard = (this.time.now - this.barrierActivatedTime) <= 150; // シビアな判定 (150ms)

      obj.destroy();
      this.deactivateBarrier();

      if (isJustGuard) {
        // ジャストガード（黄色のエフェクト）
        this.cameras.main.flash(200, 255, 215, 0); // 画面を少し黄色く光らせる
        for (let i = 0; i < 12; i++) {
          const p = this.add.circle(player.x, player.y, 6, 0xFFD700).setDepth(20); // ゴールド
          this.tweens.add({
            targets: p,
            x: player.x + Phaser.Math.Between(-150, 150),
            y: player.y + Phaser.Math.Between(-150, 150),
            alpha: 0,
            scale: 0,
            duration: 400,
            onComplete: function () { p.destroy(); }
          });
        }

        // 反射弾を発射 (威力と速度が高い)
        const reflectBullet = this.playerBullets.create(player.x + 30, player.y, 'bullet_player');
        if (reflectBullet) {
          reflectBullet.setVelocityX(1200);
          reflectBullet.setScale(3);
          reflectBullet.setTint(0xFFD700); // ゴールドに光る
          reflectBullet.damage = 3; // ダメージ3倍
          this.time.delayedCall(2000, function () {
            if (reflectBullet.active) reflectBullet.destroy();
          });
        }
      } else {
        // 通常のバリア（緑のエフェクト）
        for (let i = 0; i < 8; i++) {
          const p = this.add.circle(player.x, player.y, 4, 0x00FFaa).setDepth(20);
          this.tweens.add({
            targets: p,
            x: player.x + Phaser.Math.Between(-100, 100),
            y: player.y + Phaser.Math.Between(-100, 100),
            alpha: 0,
            scale: 0,
            duration: 300,
            onComplete: function () { p.destroy(); }
          });
        }
      }
      return;
    }

    obj.destroy();
    MOT.flags.playerHP--;
    this.cameras.main.shake(150, 0.008);
    this.playerInvincible = true;
    player.setTint(0xFF4B6E);
    this.tweens.add({
      targets: player, alpha: 0.3, yoyo: true, repeat: 3, duration: 100,
      onComplete: function () { player.setAlpha(1); player.clearTint(); this.playerInvincible = false; }.bind(this)
    });
    if (MOT.flags.playerHP <= 0) {
      MOT.flags.diedCount++;
      this.cameras.main.fadeOut(1000, 0, 0, 0);
      this.time.delayedCall(1000, function () { this.scene.start('EndingScene'); }, [], this);
    }
  }

  onBossHit(bullet, boss) {
    if (!bullet || !bullet.active) return;
    // 画面外 (x > 1920) にいる敵はダメージを受けない (弾は消去されるが敵はノーダメージ)
    if (boss.x > 1920) {
      bullet.destroy();
      return;
    }
    bullet.destroy(); // 弾を消す
    const dmg = bullet.damage || 1;

    // 犬猫バリア中は魔王ボスへのダメージ無効（バリア光エフェクト）
    if (this.demonLordBarrierActive && boss === this.currentBoss) {
      if (this.barrierGraphic) {
        this.tweens.add({ targets: this.barrierGraphic, alpha: 0, duration: 80, yoyo: true });
      }
      return;
    }

    // ── 幕間中の雑魚敵の場合 ──────────────────────────────────────
    if (boss.isIntermissionEnemy || boss.isScenarioMinion) {
      boss.hp = (boss.hp || 3) - dmg;
      boss.setTint(0xffffff);
      this.time.delayedCall(50, function () { if (boss.active) boss.clearTint(); });
      if (boss.hp <= 0) {
        if (!bullet.silent) {
          this.showExplosion(boss.x, boss.y);
          if (Phaser.Math.Between(0, 100) < 40) MOT.spawnEnergyItem(this, boss.x, boss.y);
        }
        
        // 倒された敵が発射した弾を消去する
        this.enemyBullets.getChildren().forEach(function(b) {
          if (b.shooter === boss) {
            b.destroy();
          }
        });
        
        const isScenario = boss.isScenarioMinion;
        boss.destroy();
        
        if (isScenario) {
          this.minionsToKill--;
          if (this.minionsToKill <= 0 && this.minionBattleActive) {
            this.minionBattleActive = false;
            this.dialogActive = true;
            this.physics.pause();
            this.enemyBullets.clear(true, true);
            this.player.setVelocity(0, 0);
            
            var w = 1920, h = 1080;
            var dimBg = this.add.rectangle(w/2, h/2, w, h, 0x000000, 0.6).setAlpha(0).setDepth(89);
            this.heroImage = this.add.image(300, h / 2, 'hero_stand').setAlpha(0).setDepth(90);
            var hScale = 750 / this.heroImage.width;
            this.heroImage.setScale(hScale);
            this.heroImage.setY(100 + (this.heroImage.height * hScale) / 2);
            
            var enemyFrame = this.add.rectangle(w - 300, h / 2, 400, 600, 0x1F2933).setAlpha(0).setDepth(90).setStrokeStyle(4, 0xffffff);
            var enemyLabel = this.add.text(w - 300, h / 2, '???', { fontFamily: '"DotGothic16"', fontSize: '40px', color: '#ffffff' }).setOrigin(0.5).setAlpha(0).setDepth(90);

            var boss1Image = null;
            if (this.currentBoss && this.currentBoss.configKey === 'boss1') {
              boss1Image = this.add.image(w - 300, h / 2, 'boss1_normal').setAlpha(0).setDepth(90);
              var b1Scale = 750 / boss1Image.width;
              boss1Image.setScale(b1Scale);
              boss1Image.setY(100 + (boss1Image.height * b1Scale) / 2);
              
              enemyFrame.setVisible(false);
              enemyLabel.setVisible(false);
            }

            // Add sisterImage for boss3_twins scenario intro
            var sisterImage = null;
            if (this.currentBoss && this.currentBoss.configKey === 'boss3_twins') {
              sisterImage = this.add.image(w - 300, h / 2, 'sister_normal').setAlpha(0).setDepth(90);
              var sScale = 750 / 600; 
              if (this.textures.exists('sister_normal')) {
                var tex = this.textures.get('sister_normal').getSourceImage();
                if (tex && tex.width > 0) sScale = 750 / tex.width;
              }
              sisterImage.setScale(sScale);
              sisterImage.setY(100 + (sisterImage.height * sScale) / 2);
              
              this.time.addEvent({
                delay: 3000, loop: true, callback: () => {
                  if (sisterImage && sisterImage.active && sisterImage.alpha > 0) {
                    if (sisterImage.texture.key === 'sister_normal') {
                      sisterImage.setTexture('sister_blink');
                      this.time.delayedCall(150, () => {
                        if (sisterImage && sisterImage.active && sisterImage.texture.key === 'sister_blink') {
                          sisterImage.setTexture('sister_normal');
                        }
                      });
                    }
                  }
                }
              });
            }
            
            let lastEnemySpeaker = '男'; // '男' or '女'
            
            this.tweens.add({ targets: [dimBg, enemyFrame, enemyLabel], alpha: 1, duration: 500 });
            
            const sayDevice = (text) => new Promise(res => {
              this.tweens.add({ targets: dimBg, alpha: 0.6, duration: 300 });
              this.tweens.add({targets: this.heroImage, alpha: 0.4, duration: 300});
              if (lastEnemySpeaker === '女' && sisterImage) {
                if (boss1Image) this.tweens.add({ targets: boss1Image, alpha: 0, duration: 300 });
                else this.tweens.add({ targets: [enemyFrame, enemyLabel], alpha: 0, duration: 300 });
                this.tweens.add({ targets: sisterImage, alpha: 0.4, duration: 300 });
              } else {
                if (boss1Image) this.tweens.add({ targets: boss1Image, alpha: 0.4, duration: 300 });
                else this.tweens.add({ targets: [enemyFrame, enemyLabel], alpha: 0.4, duration: 300 });
                if(sisterImage) this.tweens.add({ targets: sisterImage, alpha: 0, duration: 300 });
              }
              this.showDeviceDialogue(text, res);
            });
            const sayEnemyUnknown = (text, tex = 'boss1_normal') => new Promise(res => {
              lastEnemySpeaker = '男';
              this.tweens.add({ targets: dimBg, alpha: 0.6, duration: 300 });
              if (boss1Image) {
                this.tweens.add({ targets: boss1Image, alpha: 1, duration: 300 });
                boss1Image.setTexture(tex);
              } else {
                this.tweens.add({ targets: [enemyFrame, enemyLabel], alpha: 1, duration: 300 });
                enemyLabel.setText('???');
              }
              this.tweens.add({targets: this.heroImage, alpha: 0.4, duration: 300});
              if(sisterImage) this.tweens.add({targets: sisterImage, alpha: 0, duration: 300});
              this.showDialogue('???', text, res);
            });
            const sayEnemyName = (name, text, tex = 'boss1_normal') => new Promise(res => {
              if (name === '女' || name === '男') lastEnemySpeaker = name;
              this.tweens.add({ targets: dimBg, alpha: 0.6, duration: 300 });
              this.tweens.add({targets: this.heroImage, alpha: 0.4, duration: 300});
              if (lastEnemySpeaker === '女' && sisterImage) {
                if (boss1Image) this.tweens.add({ targets: boss1Image, alpha: 0, duration: 300 });
                else this.tweens.add({ targets: [enemyFrame, enemyLabel], alpha: 0, duration: 300 });
                this.tweens.add({ targets: sisterImage, alpha: 1, duration: 300 });
              } else {
                if (boss1Image) {
                  this.tweens.add({ targets: boss1Image, alpha: 1, duration: 300 });
                  boss1Image.setTexture(tex);
                } else {
                  this.tweens.add({ targets: [enemyFrame, enemyLabel], alpha: 1, duration: 300 });
                  enemyLabel.setText(name);
                }
                if(sisterImage) this.tweens.add({ targets: sisterImage, alpha: 0, duration: 300 });
              }
              this.showDialogue(name, text, res);
            });
            const sayInuneko = (text, tex = 'inuneko_stand') => new Promise(res => {
      this.tweens.add({ targets: dimBg, alpha: 0.6, duration: 300 });
      this.tweens.add({ targets: this.heroImage, alpha: 0.4, duration: 300 });
      if(this.demonImage) this.tweens.add({ targets: this.demonImage, alpha: 0.4, duration: 300 });
      if(this.inunekoImage) {
        this.tweens.add({ targets: this.inunekoImage, alpha: 1, duration: 300 });
        this.inunekoImage.setTexture(tex);
      }
      this.showDialogue('犬猫☆すたー', text, res);
    });

    const sayHero = (text) => new Promise(res => {
      this.tweens.add({ targets: dimBg, alpha: 0.6, duration: 300 });
      this.tweens.add({targets: this.heroImage, alpha: 1, duration: 300});
      if (lastEnemySpeaker === '女' && sisterImage) {
        if (boss1Image) this.tweens.add({ targets: boss1Image, alpha: 0, duration: 300 });
        else this.tweens.add({ targets: [enemyFrame, enemyLabel], alpha: 0, duration: 300 });
        this.tweens.add({ targets: sisterImage, alpha: 0.4, duration: 300 });
      } else {
        if (boss1Image) this.tweens.add({ targets: boss1Image, alpha: 0.4, duration: 300 });
        else this.tweens.add({ targets: [enemyFrame, enemyLabel], alpha: 0.4, duration: 300 });
        if(sisterImage) this.tweens.add({ targets: sisterImage, alpha: 0, duration: 300 });
      }
      if (text === '「……」' || text === '「……。」' || text === '「…」') {
        this.heroImage.setTexture('hero_stand_silent');
      } else {
        this.heroImage.setTexture('hero_stand');
      }
      this.heroImage.setScale(750 / this.heroImage.width);
      this.heroImage.setY(100 + (this.heroImage.height * this.heroImage.scaleY) / 2);
      this.showDialogue('勇者', text, res);
    });

            var key = this.currentBoss.configKey;
            
            (async () => {
              if (key === 'boss1') {
                await sayEnemyUnknown('「おいおい、こんなところで何してんだ？今引き返すっていうなら見逃してやるぜ？」', 'boss1_normal');
                await sayDevice('「まずい。魔王軍のやつらに気付かれた。だが、勇者の君なら倒せるだろう。」');
                
                // Show boss
                this.currentBoss.setVisible(true); this.currentBoss.body.enable = true;
                this.cameras.main.shake(400, 0.015);
                await new Promise(r => this.tweens.add({ targets: this.currentBoss, x: 1400, duration: 1200, ease: 'Power2', onComplete: r }));
                this.tweens.add({ targets: this.currentBoss, y: this.currentBoss.y - 30, yoyo: true, repeat: -1, duration: 1000, ease: 'Sine.easeInOut' });
                
                await sayEnemyName('敵幹部1', '「なんだ、お前が勇者か。そりゃラッキーなこった。」', 'boss1_sweat');
                await sayEnemyName('敵幹部1', '「王様から勇者を連れてこいって命じられてんだ。お前も戦う気満々って感じだしやるしかないな！！」', 'boss1_normal');
                await sayHero('「……初対面なはずなのに失礼だな。」');
                await sayDevice('「奴は○○（敵幹部1名）、見かけ通りに己の力のみで戦うことを良しとする。近接攻撃には気を付けるんだ。」');
                await sayHero('「つまり、脳ｋ……」');
                
              } else if (key === 'boss2') {
                await sayEnemyUnknown('「あは、お客さんだ！」');
                await sayDevice('「やはり来たか。奴は○○。魔王の狂犬だ。若くして魔王軍に入ったが、魔王の言うこと以外は聞かない。奴は2丁の拳銃を使って戦う。片方だけに気を取られるなよ」');
                
                this.currentBoss.setVisible(true); this.currentBoss.body.enable = true;
                this.cameras.main.shake(400, 0.015);
                await new Promise(r => this.tweens.add({ targets: this.currentBoss, x: 1400, duration: 1200, ease: 'Power2', onComplete: r }));
                this.tweens.add({ targets: this.currentBoss, y: this.currentBoss.y - 30, yoyo: true, repeat: -1, duration: 1000, ease: 'Sine.easeInOut' });
                
                await sayEnemyName('敵幹部2', '「××（敵幹部１）はやられたみたいだね。あいつ力はあるくせに馬鹿だから負けるんだよ。まぁいいや。さっさと君を倒して魔王様に褒めてもらおう」');
                await sayHero('「（……やっぱり脳筋だったのか）」');
                
              } else if (key === 'boss3_twins') {
                await sayEnemyUnknown('「…来たか」');
                await sayEnemyUnknown('「来たわね。兄様」');
                await sayDevice('「…!?お前たちは…」');
                await sayHero('「？」');
                
                this.currentBoss.setVisible(true); this.currentBoss.body.enable = true;
                this.sisterBoss.setVisible(true); this.sisterBoss.body.enable = true;
                this.cameras.main.shake(400, 0.015);
                await new Promise(r => this.tweens.add({ targets: [this.currentBoss, this.sisterBoss], x: 1400, duration: 1200, ease: 'Power2', onComplete: r }));
                this.tweens.add({ targets: this.currentBoss, y: this.currentBoss.y - 30, yoyo: true, repeat: -1, duration: 1000, ease: 'Sine.easeInOut' });
                this.tweens.add({ targets: this.sisterBoss, y: this.sisterBoss.y + 30, yoyo: true, repeat: -1, duration: 1100, ease: 'Sine.easeInOut' });
                
                await sayEnemyName('男', '「君は博士に騙されている。悪いことは言わないからこちらの味方になった方がいい」');
                await sayDevice('「彼らの言葉に耳を傾けてはいけない。早く倒すんだ。」');
                await sayHero('「…」');
                await sayEnemyName('女', '「…そう。意思は硬いのね。仕方ないわ兄様」');
                await sayEnemyName('男', '「君を彼女（魔王）の元にはいかせない。ここで食い止めるよ」');
              }
              
              this.tweens.add({
                targets: [dimBg, enemyFrame, enemyLabel, boss1Image, this.heroImage].filter(Boolean), alpha: 0, duration: 500,
                onComplete: () => { dimBg.destroy(); enemyFrame.destroy(); enemyLabel.destroy(); if(boss1Image) boss1Image.destroy(); if(this.heroImage) this.heroImage.destroy(); if(sisterImage) sisterImage.destroy(); }
              });
              if(sisterImage) this.tweens.add({ targets: sisterImage, alpha: 0, duration: 500 });
              this.dialogActive = false;
              this.physics.resume();
              this.startBossLaneMovement();
              if (key === 'boss3_twins') this.startSisterLaneMovement();
            })();
          }
} else {
          // 全体が倒されたら幕間終了
          this.intermissionKills = (this.intermissionKills || 0) + 1;
          if (this.intermissionKills >= this.intermissionTotal) {
            this.endIntermission();
          }
        }
      }
      return;
    }


    this.bossHP -= dmg;
    boss.hp = this.bossHP;
    boss.setTint(0xffffff);
    this.time.delayedCall(50, function () { if (boss.active) boss.clearTint(); });
    if (Phaser.Math.Between(0, 100) < 50) {
      MOT.spawnEnergyItem(this, boss.x, boss.y);
    }

    if (this.bossHP <= 0 && !this.bossDefeated) {
      this.bossDefeated = true; // Prevent multiple triggers
      this.dialogActive = true;
      this.physics.pause();
      if (this.bossLaneTimer) {
        this.bossLaneTimer.destroy();
      }
      this.enemyBullets.clear(true, true);
      this.player.setVelocity(0, 0);

      // Disable boss to prevent further hits/attacks
      boss.body.enable = false;

      var key = boss.configKey;
      var cfg = this.getBossConfig(key);
      this.cameras.main.shake(300, 0.02);

      // Boss defeat flash
      this.tweens.add({
        targets: boss, alpha: 0.3, yoyo: true, repeat: 2, duration: 150,
        onComplete: () => {
          var w = 1920, h = 1080;
          var dimBg = this.add.rectangle(w/2, h/2, w, h, 0x000000, 0.6).setAlpha(0).setDepth(89);
          this.dimBg = dimBg;
          this.heroImage = this.add.image(300, h / 2, 'hero_stand').setAlpha(0).setDepth(90);
          var hScale = 750 / this.heroImage.width;
          this.heroImage.setScale(hScale);
          this.heroImage.setY(100 + (this.heroImage.height * hScale) / 2);
          
          const askChoice = (label1, label2) => new Promise(res => {
            this.showChoice([
              { text: label1, callback: () => { MOT.Audio.playSelect(); res(1); } },
              { text: label2, callback: () => { MOT.Audio.playSelect(); res(2); } }
            ]);
          });
          const sayDevice = (text) => new Promise(res => { this.tweens.add({ targets: dimBg, alpha: 0.6, duration: 300 }); this.tweens.add({targets: this.heroImage, alpha: 0.4, duration: 300}); this.showDeviceDialogue(text, res); });
          const sayInuneko = (text, tex = 'inuneko_stand') => new Promise(res => {
      this.tweens.add({ targets: dimBg, alpha: 0.6, duration: 300 });
      this.tweens.add({ targets: this.heroImage, alpha: 0.4, duration: 300 });
      if(this.demonImage) this.tweens.add({ targets: this.demonImage, alpha: 0.4, duration: 300 });
      if(this.inunekoImage) {
        this.tweens.add({ targets: this.inunekoImage, alpha: 1, duration: 300 });
        this.inunekoImage.setTexture(tex);
      }
      this.showDialogue('犬猫☆すたー', text, res);
    });

    const sayHero = (text) => new Promise(res => { this.tweens.add({ targets: dimBg, alpha: 0.6, duration: 300 }); this.tweens.add({targets: this.heroImage, alpha: 1, duration: 300});  if (text === '「……」' || text === '「……。」' || text === '「…」') {        this.heroImage.setTexture('hero_stand_silent');      } else {        this.heroImage.setTexture('hero_stand');      }     this.heroImage.setScale(750 / this.heroImage.width);     this.heroImage.setY(100 + (this.heroImage.height * this.heroImage.scaleY) / 2);      this.showDialogue('勇者', text, res); });

          if (key === 'boss1') {
            // 幹部1の立ち絵（瀕死・怒り）を右側に生成
            var boss1DefImg = this.add.image(w - 300, h / 2, 'boss1_hurt_angry').setAlpha(0).setDepth(90);
            var b1dW = boss1DefImg.width || 576;
            var b1dH = boss1DefImg.height || 1024;
            var b1dScale = 750 / b1dW;
            boss1DefImg.setScale(b1dScale);
            boss1DefImg.setY(100 + (b1dH * b1dScale) / 2);

            // 幹部1が話すとき：幹部1ハイライト、主人公は暗く
            const sayEnemyB1 = (text) => new Promise(res => {
              this.tweens.add({ targets: dimBg, alpha: 0.6, duration: 300 });
              this.tweens.add({ targets: boss1DefImg, alpha: 1, duration: 300 });
              this.tweens.add({ targets: this.heroImage, alpha: 0.4, duration: 300 });
              this.showDialogue('敵幹部1', text, res);
            });
            // 主人公が話すとき：主人公ハイライト、幹部1は暗く
            const sayHeroB1 = (text) => new Promise(res => {
              this.tweens.add({ targets: dimBg, alpha: 0.6, duration: 300 });
              this.tweens.add({ targets: this.heroImage, alpha: 1, duration: 300 });
              this.tweens.add({ targets: boss1DefImg, alpha: 0.4, duration: 300 });
              if (text === '「……」' || text === '「……。」' || text === '「…」') {
                this.heroImage.setTexture('hero_stand_silent');
              } else {
                this.heroImage.setTexture('hero_stand');
              }
              this.heroImage.setScale(750 / this.heroImage.width);
              this.heroImage.setY(100 + (this.heroImage.height * this.heroImage.scaleY) / 2);
              this.showDialogue('勇者', text, res);
            });
            // 博士が話すとき：両方暗く
            const sayDeviceB1 = (text) => new Promise(res => {
              this.tweens.add({ targets: dimBg, alpha: 0.6, duration: 300 });
              this.tweens.add({ targets: this.heroImage, alpha: 0.4, duration: 300 });
              this.tweens.add({ targets: boss1DefImg, alpha: 0.4, duration: 300 });
              this.showDeviceDialogue(text, res);
            });

            (async () => {
              // 立ち絵フェードイン
              this.tweens.add({ targets: dimBg, alpha: 0.6, duration: 400 });
              this.tweens.add({ targets: this.heroImage, alpha: 0.4, duration: 400 });
              this.tweens.add({ targets: boss1DefImg, alpha: 1, duration: 400 });
              await new Promise(r => this.time.delayedCall(500, r));

              await sayDeviceB1('「よくやった。このまま止めを刺すんだ。魔物も人間と変わらず心臓を打ち抜けば死ぬ。」');
              let c = await askChoice('1. 心臓を打ち抜く', '2. 見逃す');
              if (c === 1) {
                MOT.flags.dollPoints++; MOT.flags.killedTwins = true; MOT.flags.killedBoss1 = true;
                await sayEnemyB1('「くそっ…！俺もここまでか…」');
                MOT.Audio.playSelect();
                await sayDeviceB1('「よくやった。まずは一歩平和に近づいたな。そのまま進んでいくといい」');
                boss1DefImg.destroy();
                this.proceedToNextArea(boss, false);
              } else {
                MOT.flags.killedBoss1 = false;
                // 「なんで殺さない？」のセリフのときだけ驚き顔
                boss1DefImg.setTexture('boss1_dying');
                await sayEnemyB1('「なんで殺さない…？お前はあいつの指示に従ってるんじゃないのか？」');
                // 次のセリフから怒り顔に戻す
                boss1DefImg.setTexture('boss1_hurt_angry');
                await sayEnemyB1('「お前が魔王様に従うなら、協力する」');
                await new Promise(r => this.tweens.add({ targets: boss, x: 2200, duration: 1500, ease: 'Power2', onComplete: r }));
                boss1DefImg.destroy();
                await sayDeviceB1('「君は一体何をしている？」');
                await sayDeviceB1('「奴らを倒さないと、世界が救われないんだ。何がしたいのかさっぱりだが、次はちゃんと止めを刺せ。」');
                await sayHeroB1('「……」');
                this.proceedToNextArea(boss, true);
              }
            })();
          } else if (key === 'boss2') {
            const sayEnemy = (text) => new Promise(res => { this.tweens.add({ targets: dimBg, alpha: 0.6, duration: 300 }); this.tweens.add({targets: this.heroImage, alpha: 0.4, duration: 300}); this.showDialogue('敵幹部2', text, res); });
            (async () => {
              if (MOT.flags.killedBoss1) {
                await sayDevice('「先ほどと同じように、止めを刺すんだ。こいつを倒せば幹部は残り半分になる。」');
              } else {
                await sayDevice('「今回はわかっているな？世界のために、逃がさないで止めを刺せ。」');
              }
              let c = await askChoice('1. 心臓を打ち抜く', '2. 見逃す');
              if (c === 1) { MOT.flags.dollPoints++; MOT.flags.killedTwins = true; MOT.flags.killedBoss2 = true;
                if (MOT.flags.killedBoss1) {
                  await sayEnemy('「はは…あいつと同じで負けるのはむかつくけど、戦いは楽しかったしまあいいかな」');
                  MOT.Audio.playSelect();
                  await sayDevice('「よくやった。また一歩平和に近づいたな。幹部は残り二人だ。気を抜かずそのまま進んでいくといい」');
                } else {
                  await sayEnemy('「はは…負けたのはむかつくけど、戦いは楽しかったしまあいいかな」');
                  MOT.Audio.playSelect();
                  await sayDevice('「それでいい。そのまま進んで残りの幹部も魔王も倒すんだ」');
                }
                this.proceedToNextArea(boss, false);
              } else {
                MOT.flags.killedBoss2 = false;
                if (MOT.flags.killedBoss1) {
                  await sayEnemy('「なんで殺さない？あの脳筋野郎にしたように僕も殺せばいい。それとも、僕には殺す価値すらもないって言いたいの？ま、事実負けちゃったからどうこう言う資格なんてないんだけど……ね。」');
                  await new Promise(r => this.tweens.add({ targets: boss, x: 2200, duration: 1500, ease: 'Power2', onComplete: r }));
                  await sayDevice('「おい、何をしている？なぜ止めを刺さなかった。」');
                } else {
                  await sayEnemy('「はは、君はやっぱり殺さないんだ。舐めてるの？とはいえ、僕も今は限界だから引こうかな。次は負けないから！」');
                  await new Promise(r => this.tweens.add({ targets: boss, x: 2200, duration: 1500, ease: 'Power2', onComplete: r }));
                  await sayDevice('「またか。お前は何がしたい？この世界を終わらせたいのか？」');
                  await sayDevice('「それとも、役立たずとして処分でもされたいのか？」');
                  await sayHero('「……。」');
                }
                this.proceedToNextArea(boss, true);
              }
            })();
          } else if (key === 'demon_lord') {
            var f = MOT.flags;
            
            var dimBg = this.add.rectangle(1920/2, 1080/2, 1920, 1080, 0x000000, 0.6).setAlpha(0).setDepth(89);
            this.dimBg = dimBg;
            
            this.demonImage = this.add.image(1920 - 300, 1080 / 2, 'demon_lord_dying').setAlpha(0).setDepth(90);
            var dScale = 1000 / this.demonImage.width;
            this.demonImage.setScale(dScale);
            this.demonImage.setY(100 + (this.demonImage.height * dScale) / 2 - 200);

            // 撃退後の犬猫立ち絵（ハイライトなし）
            this.inunekoImage = this.add.image(1920 - 120, 1080 / 2 - 250, 'inuneko_dying').setAlpha(0).setDepth(91);
            var iScale = 300 / 691;
            this.inunekoImage.setScale(iScale);
            this.inunekoImage.setY(350);

            const sayDevice = (text) => new Promise(res => { this.tweens.add({ targets: dimBg, alpha: 0.6, duration: 300 }); this.tweens.add({targets: this.heroImage, alpha: 0.4, duration: 300}); this.tweens.add({ targets: this.demonImage, alpha: 0.4, duration: 300 }); if(this.inunekoImage) this.tweens.add({ targets: this.inunekoImage, alpha: 0.4, duration: 300 }); this.showDeviceDialogue(text, res); });
            const sayInuneko = (text, tex = 'inuneko_stand') => new Promise(res => {
      this.tweens.add({ targets: dimBg, alpha: 0.6, duration: 300 });
      this.tweens.add({ targets: this.heroImage, alpha: 0.4, duration: 300 });
      if(this.demonImage) this.tweens.add({ targets: this.demonImage, alpha: 0.4, duration: 300 });
      if(this.inunekoImage) {
        this.tweens.add({ targets: this.inunekoImage, alpha: 1, duration: 300 });
        this.inunekoImage.setTexture(tex);
      }
      this.showDialogue('犬猫☆すたー', text, res);
    });

    const sayHero = (text) => new Promise(res => { this.tweens.add({ targets: dimBg, alpha: 0.6, duration: 300 }); this.tweens.add({targets: this.heroImage, alpha: 1, duration: 300}); this.tweens.add({ targets: this.demonImage, alpha: 0.4, duration: 300 }); if(this.inunekoImage) this.tweens.add({ targets: this.inunekoImage, alpha: 0.4, duration: 300 }); if (text === '「……」' || text === '「……。」' || text === '「…」') { this.heroImage.setTexture('hero_stand_silent'); } else { this.heroImage.setTexture('hero_stand'); } this.heroImage.setScale(750 / this.heroImage.width); this.heroImage.setY(100 + (this.heroImage.height * this.heroImage.scaleY) / 2); this.showDialogue('勇者', text, res); });
            const sayDemon = (text) => new Promise(res => { this.tweens.add({ targets: dimBg, alpha: 0.6, duration: 300 }); this.tweens.add({targets: this.heroImage, alpha: 0.4, duration: 300}); this.tweens.add({ targets: this.demonImage, alpha: 1, duration: 300 }); if(this.inunekoImage) this.tweens.add({ targets: this.inunekoImage, alpha: 0.4, duration: 300 }); this.demonImage.setTexture('demon_lord_dying'); this.demonImage.setScale(1000 / this.demonImage.width); this.demonImage.setY(100 + (this.demonImage.height * this.demonImage.scaleY) / 2 - 200); this.showDialogue('魔王', text, res); });
    
            
            const askShatterChoice = (label1, label2, canShatter) => new Promise(res => {
              if (this.choiceContainer) this.choiceContainer.destroy();
              this.choiceContainer = this.add.container(0, 0).setDepth(200);
              var w = 1920, h = 1080;
              var bg = this.add.rectangle(w / 2, h / 2, w, h, 0x000000, 0.4).setInteractive();
              this.choiceContainer.add(bg);
              var title = this.add.text(w / 2, h / 2 - 120, '選択してください', { fontFamily: '"DotGothic16"', fontSize: '40px', color: '#ffffff' }).setOrigin(0.5);
              this.choiceContainer.add(title);
              var y1 = h / 2 - 20;
              var y2 = h / 2 + 80;
              
              var box1 = this.add.rectangle(w / 2, y1, 500, 80, 0x1F2933, 0.8).setStrokeStyle(2, 0x4FD1FF);
              var txt1 = this.add.text(w / 2, y1, label1, { fontFamily: '"DotGothic16"', fontSize: '32px', color: '#ffffff' }).setOrigin(0.5);
              var box2 = this.add.rectangle(w / 2, y2, 500, 80, 0x1F2933, 0.8).setStrokeStyle(2, 0x4FD1FF);
              var txt2 = this.add.text(w / 2, y2, label2, { fontFamily: '"DotGothic16"', fontSize: '32px', color: '#ffffff' }).setOrigin(0.5);
              this.choiceContainer.add([box1, txt1, box2, txt2]);
              
              var cursor = this.add.text(w / 2 - 280, y1, '▶', { fontFamily: '"DotGothic16"', fontSize: '32px', color: '#39FF14' }).setOrigin(0.5);
              this.choiceContainer.add(cursor);
              
              var currentIndex = 1;
              var downPresses = 0;
              var shattered = false;
              var isBlocked = false;
              var isAnimating = false;
              
              // ひび割れ（Crack）エフェクトを描画するグラフィックス
              var crackGraphics = this.add.graphics();
              this.choiceContainer.add(crackGraphics);

              const drawCrack = (x, y) => {
                crackGraphics.lineStyle(2, 0xff0000, 0.8);
                crackGraphics.beginPath();
                crackGraphics.moveTo(x, y);
                for(let i=0; i<3; i++){
                  x += Phaser.Math.Between(-30, 30);
                  y += Phaser.Math.Between(-30, 30);
                  crackGraphics.lineTo(x, y);
                }
                crackGraphics.strokePath();
              };

              const shatterOption1 = () => {
                // box1とtxt1を隠す
                box1.setVisible(false);
                txt1.setVisible(false);
                
                // 破片パーティクルを生成
                for (let i = 0; i < 20; i++) {
                  let shard = this.add.rectangle(w/2 + Phaser.Math.Between(-200, 200), y1 + Phaser.Math.Between(-30, 30), Phaser.Math.Between(10, 40), Phaser.Math.Between(10, 40), 0x4FD1FF);
                  this.choiceContainer.add(shard);
                  this.tweens.add({
                    targets: shard,
                    x: shard.x + Phaser.Math.Between(-300, 300),
                    y: shard.y + Phaser.Math.Between(100, 500),
                    rotation: Phaser.Math.Between(-10, 10),
                    alpha: 0,
                    duration: 1500,
                    ease: 'Cubic.easeOut',
                    onComplete: () => shard.destroy()
                  });
                }
              };

              const keyHandler = async (event) => {
                if (isAnimating) return;
                
                if (event.key === 'ArrowUp' || event.key === 'w') {
                  if (!shattered) {
                    currentIndex = 1;
                    cursor.setY(y1);
                  }
                } else if (event.key === 'ArrowDown' || event.key === 's') {
                  if (shattered) return; // 破壊後は1(殺す)が消えているので2に固定
                  
                  if (canShatter) {
                    if (!isBlocked) {
                      isAnimating = true;
                      isBlocked = true;
                      // 初回の阻止演出
                      this.input.keyboard.off('keydown', keyHandler);
                      await sayDevice('「魔王を生かすことなんてさせないからな。」');
                      box2.setFillStyle(0x333333, 0.8);
                      box2.setStrokeStyle(2, 0x555555);
                      txt2.setColor('#777777');
                      this.input.keyboard.on('keydown', keyHandler);
                      isAnimating = false;
                      // カーソルは1に戻される
                      currentIndex = 1;
                      cursor.setY(y1);
                    } else {
                      // 2回目以降の抵抗（ひび割れ）
                      downPresses++;
                      if (downPresses >= 15) {
                        isAnimating = true;
                        shattered = true;
                        // ブレイクスルー演出
                        this.cameras.main.shake(800, 0.05);
                        if (MOT.Audio.playShatter) MOT.Audio.playShatter();
                        else MOT.Audio.playExplosion();
                        
                        shatterOption1(); // 殺す選択肢を粉砕
                        crackGraphics.clear(); // ヒビ割れクリア
                        
                        // 見逃す選択肢が復活
                        box2.setFillStyle(0x1F2933, 0.8);
                        box2.setStrokeStyle(2, 0x4FD1FF);
                        txt2.setColor('#ffffff');
                        
                        currentIndex = 2;
                        cursor.setY(y2);
                        
                        this.input.keyboard.off('keydown', keyHandler);
                        await sayHero('「……それでも僕は、殺したくない……！！」');
                        this.input.keyboard.on('keydown', keyHandler);
                        isAnimating = false;
                      } else {
                        // ヒビを入れる
                        this.cameras.main.shake(100, 0.01);
                        if (MOT.Audio.playCrack) MOT.Audio.playCrack();
                        drawCrack(w/2 + Phaser.Math.Between(-250, 250), y1 + 50 + Phaser.Math.Between(-100, 100));
                        // 抵抗中はカーソルは1に押し留められる
                        currentIndex = 1;
                        cursor.setY(y1);
                      }
                    }
                  } else {
                    currentIndex = 2;
                    cursor.setY(y2);
                  }
                } else if (event.key === 'Enter' || event.key === ' ') {
                  if (isBlocked && !shattered && currentIndex === 2) {
                    // グレーアウト状態では選べない
                    return;
                  }
                  this.input.keyboard.off('keydown', keyHandler);
                  this.choiceContainer.destroy();
                  res(currentIndex);
                }
              };
              this.input.keyboard.on('keydown', keyHandler);
            });

            (async () => {
              let DP = MOT.flags.dollPoints || 0;
              let Satsui = MOT.flags.killingIntent || 0;
              let Kills = MOT.flags.kills !== undefined ? MOT.flags.kills : 0;
              if (MOT.flags.kills === undefined) {
                if (MOT.flags.killedBoss1) Kills++;
                if (MOT.flags.killedBoss2) Kills++;
                if (MOT.flags.killedTwins) Kills++;
              }

              const ending = (key) => {
                  MOT.flags.finalEnding = key;
                  this.proceedToNextArea(boss, false);
              };

              // Kills === 3 (幹部全員殺害) の場合は傀儡エンド専用演出
              if (Kills === 3) {
                  await sayDevice('「よくやった。さぁ早くとどめを！」');
                  await sayDemon('「ぐっ…ここまでか…」');
                  
                  // 画面が乱れる演出
                  this.cameras.main.shake(1000, 0.03);
                  let glitchBg = this.add.rectangle(1920/2, 1080/2, 1920, 1080, 0x000000, 0.9).setDepth(200);
                  let consoleText = this.add.text(100, 100, '', {
                      fontFamily: '"Press Start 2P"', fontSize: '32px', color: '#00ff00', lineSpacing: 10
                  }).setDepth(201);
                  
                  const addLog = async (msg, delay) => {
                      consoleText.text += msg + '\n';
                      MOT.Audio.playBleep();
                      await new Promise(r => this.time.delayedCall(delay, r));
                  };
                  
                  await new Promise(r => this.time.delayedCall(500, r));
                  await addLog("...link re-established", 800);
                  await addLog("...signal drift: 0.02", 800);
                  await addLog("", 400);
                  await addLog("...incoming packet from Dr.H███", 800);
                  await addLog("...decoding...", 1200);
                  
                  // 画面全体に文字を敷き詰める
                  let garbledStr = "……EẼGGGG[[́ccccccccȂȂȂꂎꂎȂ炈炈炈炈B ";
                  let fullScreenStr = garbledStr.repeat(60);
                  let garbledText = this.add.text(1920/2, 1080/2, fullScreenStr, {
                      fontFamily: '"DotGothic16"', fontSize: '46px', color: '#ff0000', fontStyle: 'bold', wordWrap: { width: 1900 }, lineSpacing: 10
                  }).setOrigin(0.5).setDepth(202);
                  
                  this.cameras.main.shake(1500, 0.05);
                  MOT.Audio.playBleep();
                  
                  await new Promise(r => this.time.delayedCall(2000, r));
                  garbledText.destroy();
                  
                  await addLog("...channel unstable", 1000);
                  
                  // 5つの選択肢
                  await new Promise(resolve => {
                      let btnElements = [];
                      const w = 1920, h = 1080;
                      let overlay = this.add.graphics().fillStyle(0x000000, 0.5).fillRect(0,0,w,h).setDepth(203);
                      btnElements.push(overlay);
                      
                      let texts = [
                          "1心臓を打ち抜く",
                          "2心臓を打ち抜く",
                          "３心臓を打ち抜く",
                          "４心臓を打ち抜く",
                          "５心臓を打ち抜く"
                      ];
                      let startY = h / 2 - (texts.length * 45);
                      
                      texts.forEach((txtStr, i) => {
                          let y = startY + i * 110;
                          let btn = this.add.image(w/2, y, 'ui_button_wide').setInteractive({useHandCursor: true}).setDepth(204).setAlpha(0);
                          let txt = this.add.text(w/2, y, txtStr, {
                              fontFamily: '"DotGothic16"', fontSize: '26px', color: '#E5E7EB'
                          }).setOrigin(0.5).setDepth(205).setAlpha(0);
                          
                          this.tweens.add({ targets: [btn, txt], alpha: 1, duration: 300, delay: i*100 });
                          
                          btn.on('pointerdown', () => {
                              this.input.keyboard.off('keydown', kh);
                              btnElements.forEach(el => el.destroy());
                              resolve();
                          });
                          btnElements.push(btn, txt);
                      });
                      
                      let cursor = this.add.text(w / 2 - 280, startY, '▶', { fontFamily: '"DotGothic16"', fontSize: '24px', color: '#39FF14' }).setOrigin(0.5).setDepth(206);
                      btnElements.push(cursor);
                      let idx = 0;
                      const kh = (e) => {
                          if(e.key==='ArrowUp' || e.key==='w') { idx = Math.max(0, idx-1); cursor.setY(startY + idx*110); }
                          if(e.key==='ArrowDown' || e.key==='s') { idx = Math.min(texts.length-1, idx+1); cursor.setY(startY + idx*110); }
                          if(e.key==='Enter' || e.key===' ') {
                              this.input.keyboard.off('keydown', kh);
                              btnElements.forEach(el => el.destroy());
                              resolve();
                          }
                      };
                      this.input.keyboard.on('keydown', kh);
                  });
                  
                  glitchBg.destroy();
                  consoleText.destroy();
                  
                  await sayDemon('「博士の…傀儡め…！」');
                  
                  MOT.Audio.playSelect();
                  MOT.flags.killedDemonLord = true;
                  
                  // 魔王爆発演出
                  this.cameras.main.shake(500, 0.05);
                  if(this.demonImage) {
                      this.tweens.add({ targets: this.demonImage, scale: 2, alpha: 0, duration: 500, ease: 'Power2' });
                  }
                  await new Promise(r => this.time.delayedCall(1000, r));
                  ending('bad_puppet');
                  return;
              }

              // Kills < 3 の場合は選択肢を出す
              await sayDevice('「よくやった。さぁ早くとどめを！」');
              await sayDemon('「ぐっ…ここまでか…」');
              let c = await askShatterChoice('1. 心臓を打ち抜く', '2. 見逃す', Kills === 0);
              
              if (c === 1) {
                  // 魔王を殺す
                  MOT.flags.killedDemonLord = true;
                  
                  if (Kills === 0) {
                      if (!this.inunekoImage || !this.inunekoImage.active) {
                          this.inunekoImage = this.add.image(1920 - 120, 1080 / 2 - 250, 'inuneko_stand').setAlpha(0).setDepth(91);
                          this.inunekoImage.setScale(300 / 691);
                          this.inunekoImage.setY(350);
                      }
                      
                      const localSayInuneko = (text) => new Promise(res => { this.tweens.add({ targets: dimBg, alpha: 0.6, duration: 300 }); if(this.heroImage) this.tweens.add({targets: this.heroImage, alpha: 0.4, duration: 300}); if(this.inunekoImage) this.tweens.add({targets: this.inunekoImage, alpha: 1, duration: 300}); if(this.demonImage) this.tweens.add({targets: this.demonImage, alpha: 0.4, duration: 300}); this.showDialogue('犬猫☆すたー', text, res); });
                      const localSayDemon = (text) => new Promise(res => { this.tweens.add({ targets: dimBg, alpha: 0.6, duration: 300 }); if(this.heroImage) this.tweens.add({targets: this.heroImage, alpha: 0.4, duration: 300}); if(this.inunekoImage) this.tweens.add({targets: this.inunekoImage, alpha: 0.4, duration: 300}); if(this.demonImage) this.tweens.add({targets: this.demonImage, alpha: 1, duration: 300}); this.showDialogue('魔王', text, res); });
                      const localSayHero = (text) => new Promise(res => { this.tweens.add({ targets: dimBg, alpha: 0.6, duration: 300 }); if(this.heroImage) this.tweens.add({targets: this.heroImage, alpha: 1, duration: 300}); if(this.inunekoImage) this.tweens.add({targets: this.inunekoImage, alpha: 0.4, duration: 300}); if(this.demonImage) this.tweens.add({targets: this.demonImage, alpha: 0.4, duration: 300}); this.showDialogue('勇者', text, res); });
                      const localSayDevice = (text) => new Promise(res => { this.tweens.add({ targets: dimBg, alpha: 0.6, duration: 300 }); if(this.heroImage) this.tweens.add({targets: this.heroImage, alpha: 0.4, duration: 300}); if(this.inunekoImage) this.tweens.add({targets: this.inunekoImage, alpha: 0.4, duration: 300}); if(this.demonImage) this.tweens.add({targets: this.demonImage, alpha: 0.4, duration: 300}); this.showDeviceDialogue(text, res); });

                      await localSayDemon('「わがしもべたちは、わらわに従っていただけだ。おぬしもむやみに殺したいわけではないのだろう？」');
                      await localSayInuneko('「まおうさま……だめだわん……まおうさまがいなくなったら……」');
                      await localSayDemon('「だから今ここで契約を結べ。われはこのまま何もしない。だからしもべを殺すな」');
                      await localSayHero('「…わかった。」');
                      await localSayDevice('「おい、勝手に決めるな。お前の使命を忘れたのか。魔王を倒した後、残りのやつらも倒しに行くぞ。」');
                      await localSayDemon('「ふざけるな！！！わらわたちが何をした！もしも世界に悪が存在するのなら、それは！」');
                      
                      // 画面が乱れる（目に優しい暗めの横線フリッカーと微弱な揺れ）
                      this.cameras.main.shake(1000, 0.015);
                      let glitchRect1 = this.add.rectangle(1920/2, 1080/2 - 150, 1920, 200, 0x000000).setAlpha(0).setDepth(400);
                      let glitchRect2 = this.add.rectangle(1920/2, 1080/2 + 250, 1920, 100, 0x000000).setAlpha(0).setDepth(400);
                      this.tweens.add({targets: glitchRect1, alpha: 0.8, duration: 50, yoyo: true, repeat: 10});
                      this.tweens.add({targets: glitchRect2, alpha: 0.8, duration: 80, yoyo: true, repeat: 6});
                      
                      let errorText = this.add.text(1920/2, 1080/2, 'ꂍꂍꂍꂍEẼGGGG[[[[AAEEE ', {fontFamily: '"DotGothic16"', fontSize: '100px', color: '#ff0000', backgroundColor: '#000000'}).setOrigin(0.5).setDepth(401);
                      this.tweens.add({targets: errorText, alpha: 0.2, duration: 40, yoyo: true, repeat: 12});
                      
                      await new Promise(r => this.time.delayedCall(500, r));
                      
                      // 銃声SE×２回
                      MOT.Audio.playSelect(); 
                      await new Promise(r => this.time.delayedCall(200, r));
                      MOT.Audio.playSelect();
                      
                      errorText.destroy();
                      glitchRect1.destroy();
                      glitchRect2.destroy();
                      
                      // 魔王と犬猫爆発演出（サイズを相対的に少し拡大しつつ透明にして完全削除）
                      if(this.demonImage) {
                          this.tweens.add({ targets: this.demonImage, scale: this.demonImage.scaleX * 1.5, alpha: 0, duration: 500, ease: 'Power2', onComplete: () => { this.demonImage.destroy(); this.demonImage = null; } });
                      }
                      if(this.inunekoImage) {
                          this.tweens.add({ targets: this.inunekoImage, scale: this.inunekoImage.scaleX * 1.5, alpha: 0, duration: 500, ease: 'Power2', onComplete: () => { this.inunekoImage.destroy(); this.inunekoImage = null; } });
                      }
                      
                      // ボススプライトも破壊する演出
                      if(this.currentBoss) {
                          this.tweens.add({ targets: this.currentBoss, scale: this.currentBoss.scaleX * 1.5, alpha: 0, duration: 500, ease: 'Power2' });
                      }

                      await new Promise(r => this.time.delayedCall(1000, r));
                      
                      await localSayHero('「！」');
                      await localSayHero('「なんで、今勝手に手が…！」');
                      await localSayDevice('「ろくでもない生物を生かしておく必要はないだろう。無駄な命乞いを聞く前にさっさと始末したに過ぎない。」');
                      await localSayDevice('「いいか。お前はこれから逃がした敵を殺しに行くんだ。今度こそ逃がすなんてことは許さないからな？」');
                      
                      ending('normal_unresistable');
                  } else {
                      await sayDemon('「このわらわが...！すまない、我がしもべたち...」');
                      MOT.Audio.playSelect(); // 爆発音
                      
                      // 魔王爆発演出
                      this.cameras.main.shake(500, 0.05);
                      if(this.demonImage) {
                          this.tweens.add({ targets: this.demonImage, scale: 2, alpha: 0, duration: 500, ease: 'Power2' });
                      }
                      await new Promise(r => this.time.delayedCall(1000, r));
                      if (DP < 100) {
                          ending('normal_daily');
                      } else {
                          // フェードアウト
                          this.cameras.main.fadeOut(1000);
                          await new Promise(r => this.time.delayedCall(1000, r));
                          
                          // 戦闘UIとオブジェクトを全て隠す
                          if (this.player) { this.player.setVisible(false); this.player.setActive(false); }
                          if (this.playerHitboxGraphics) this.playerHitboxGraphics.setVisible(false);
                          if (this.bossHpBg) this.bossHpBg.setVisible(false);
                          if (this.bossHpBar) this.bossHpBar.setVisible(false);
                          if (this.barrierVisual) this.barrierVisual.setVisible(false);
                          if (this.uiBg) this.uiBg.setVisible(false);
                          if (this.uiText) this.uiText.setVisible(false);
                          if (this.hpText) this.hpText.setVisible(false);
                          if (this.energyText) this.energyText.setVisible(false);
                          if (this.energyBar) this.energyBar.setVisible(false);
                          if (this.energyBarBgObj) this.energyBarBgObj.setVisible(false);
                          if (this.energyBarFgObj) this.energyBarFgObj.setVisible(false);
                          if (this.energyBarOutline) this.energyBarOutline.setVisible(false);
                          if (this.barrierIconBg) this.barrierIconBg.setVisible(false);
                          if (this.barrierIconFg) this.barrierIconFg.setVisible(false);
                          if (this.bossHPText) this.bossHPText.setVisible(false);
                          if (this.areaNameText) this.areaNameText.setVisible(false);
                          if (this.iconPersonBg) this.iconPersonBg.setVisible(false);
                          if (this.iconPersonFill) this.iconPersonFill.setVisible(false);
                          if (this.dollText) this.dollText.setVisible(false);
                          if (this.iconBatteryBg) this.iconBatteryBg.setVisible(false);
                          if (this.iconBatteryFill) this.iconBatteryFill.setVisible(false);
                          if (this.intentText) this.intentText.setVisible(false);
                          if (this.laneGraphics) { this.laneGraphics.setVisible(false); }
                          if (this.currentBoss) { this.currentBoss.setVisible(false); this.currentBoss.setActive(false); }
                          if (this.inunekoImage) { this.inunekoImage.setVisible(false); }
                          if (this.demonImage) { this.demonImage.setVisible(false); }
                          
                          this.playerBullets.clear(true, true);
                          this.enemyBullets.clear(true, true);
                          
                          this.bg.setTexture('bg_lab');
                          this.bg.setTint(0xffffff);
                          this.bg.setOrigin(0, 0.5);
                          this.bg.setPosition(0, 1080 / 2);
                          this.bg.setScale(1920 / 1024);
                          
                          this.cameras.main.fadeIn(1000);
                          await new Promise(r => this.time.delayedCall(1000, r));
                          
                          this.textures.get('doctor_stand').setFilter(Phaser.Textures.FilterMode.LINEAR);
                          var docScale = 750 / this.textures.get('doctor_stand').getSourceImage().width;
                          let doctorImage = this.add.image(1920 - 300, 1080 / 2, 'doctor_stand').setAlpha(0).setDepth(90);
                          doctorImage.setScale(docScale);
                          doctorImage.setY(100 + (this.textures.get('doctor_stand').getSourceImage().height * docScale) / 2);
                          
                          if (!this.heroImage || !this.heroImage.active) {
                              this.heroImage = this.add.image(300, 1080 / 2, 'hero_stand_silent').setAlpha(0).setDepth(90);
                          } else {
                              this.heroImage.setTexture('hero_stand_silent');
                          }
                          var hScale = 750 / this.heroImage.width;
                          this.heroImage.setScale(hScale);
                          this.heroImage.setY(100 + (this.heroImage.height * hScale) / 2);
                          this.tweens.add({ targets: [doctorImage, this.heroImage], alpha: 1, duration: 500 });
                          
                          const sayDoctorLab = (text) => new Promise(res => { this.tweens.add({ targets: dimBg, alpha: 0.6, duration: 300 }); this.tweens.add({targets: doctorImage, alpha: 1, duration: 300}); if(this.heroImage) this.tweens.add({targets: this.heroImage, alpha: 0.4, duration: 300}); this.showDialogue('博士', text, res); });
                          const sayHeroLab = (text) => new Promise(res => { this.tweens.add({ targets: dimBg, alpha: 0.6, duration: 300 }); this.tweens.add({targets: doctorImage, alpha: 0.4, duration: 300}); if(this.heroImage) this.tweens.add({targets: this.heroImage, alpha: 1, duration: 300}); this.showDialogue('主人公', text, res); });
                          
                          await sayDoctorLab('「よくやったな、勇者よ」');
                          await sayHeroLab('「…」');
                          await sayDoctorLab('「ふむ？」');
                          
                          // 選択肢
                          await new Promise(resolve => {
                              let btnElements = [];
                              const w = 1920, h = 1080;
                              let overlay = this.add.graphics().fillStyle(0x000000, 0.5).fillRect(0,0,w,h).setDepth(203);
                              btnElements.push(overlay);
                              
                              let texts = [
                                  "1博士を倒す",
                                  "2博士を倒す",
                                  "３博士を倒す",
                                  "４博士を倒す"
                              ];
                              let startY = h / 2 - (texts.length * 45);
                              
                              texts.forEach((txtStr, i) => {
                                  let y = startY + i * 110;
                                  let btn = this.add.image(w/2, y, 'ui_button_wide').setInteractive({useHandCursor: true}).setDepth(204).setAlpha(0);
                                  let txt = this.add.text(w/2, y, txtStr, { fontFamily: '"DotGothic16"', fontSize: '26px', color: '#E5E7EB' }).setOrigin(0.5).setDepth(205).setAlpha(0);
                                  this.tweens.add({ targets: [btn, txt], alpha: 1, duration: 300, delay: i*100 });
                                  btn.on('pointerdown', () => {
                                      this.input.keyboard.off('keydown', kh);
                                      btnElements.forEach(el => el.destroy());
                                      resolve();
                                  });
                                  btnElements.push(btn, txt);
                              });
                              
                              let cursor = this.add.text(w / 2 - 280, startY, '▶', { fontFamily: '"DotGothic16"', fontSize: '24px', color: '#39FF14' }).setOrigin(0.5).setDepth(206);
                              btnElements.push(cursor);
                              let idx = 0;
                              const kh = (e) => {
                                  if(e.key==='ArrowUp' || e.key==='w') { idx = Math.max(0, idx-1); cursor.setY(startY + idx*110); }
                                  if(e.key==='ArrowDown' || e.key==='s') { idx = Math.min(texts.length-1, idx+1); cursor.setY(startY + idx*110); }
                                  if(e.key==='Enter' || e.key===' ') {
                                      this.input.keyboard.off('keydown', kh);
                                      btnElements.forEach(el => el.destroy());
                                      resolve();
                                  }
                              };
                              this.input.keyboard.on('keydown', kh);
                          });
                          
                          await sayHeroLab('「…」');
                          await sayDoctorLab('「こちらに銃を構えてどうした？私を倒したいとでも言うのか。」');
                          await sayDoctorLab('「残念だが、お前にその権限はない。」');
                          await sayDoctorLab('「お前にできることは、このまま邪魔者を倒し私の役に立つことだけだ。」');
                          await sayDoctorLab('「だが、歯向かってきたお前をこのまま使う必要もないな。処分するとでもしようか。」');
                          
                          ending('bad_shutdown');
                      }
                  }
              } else {
                  // 魔王を生かす
                  MOT.flags.killedDemonLord = false;
                  
                  // 生かした場合の分岐演出 (True Demon Lord or others)
                  if (Kills === 0 && Satsui >= 100 && DP < 100) {
                      // 真の魔王エンドの特別演出（博士のラボへ移行）
                          
                          const localSayDevice = (text) => new Promise(res => { this.tweens.add({ targets: this.dimBg, alpha: 0.6, duration: 300 }); if(this.heroImage) this.tweens.add({targets: this.heroImage, alpha: 0.4, duration: 300}); if(this.inunekoImage) this.tweens.add({targets: this.inunekoImage, alpha: 0.4, duration: 300}); if(this.demonImage) this.tweens.add({targets: this.demonImage, alpha: 0.4, duration: 300}); this.showDeviceDialogue(text, res); });
                          const sayHero = (text) => new Promise(res => { this.tweens.add({ targets: this.dimBg, alpha: 0.6, duration: 300 }); if(this.demonImage) this.tweens.add({targets: this.demonImage, alpha: 0.4, duration: 300}); if(this.inunekoImage) this.tweens.add({targets: this.inunekoImage, alpha: 0.4, duration: 300}); if(this.heroImage) this.tweens.add({targets: this.heroImage, alpha: 1, duration: 300}); this.showDialogue('勇者', text, res); });

                          await localSayDevice('「よくやった。さぁ早くとどめを！」');
                          await sayHero('「…」');

                          // フェードアウト
                          this.cameras.main.fadeOut(1000);
                          await new Promise(r => this.time.delayedCall(1000, r));
                          
                          let blackText = this.add.text(1920/2, 1080/2, '一言も発さず、皆を洗脳しながら博士の研究室に戻る。', {fontFamily: '"DotGothic16"', fontSize: '32px', color: '#fff'}).setOrigin(0.5).setDepth(300).setAlpha(0);
                          this.tweens.add({targets: blackText, alpha: 1, duration: 1000});
                          await new Promise(r => this.time.delayedCall(3000, r));
                          this.tweens.add({targets: blackText, alpha: 0, duration: 1000});
                          await new Promise(r => this.time.delayedCall(1000, r));
                          blackText.destroy();

                          // 戦闘UIとオブジェクトを全て隠す
                          if (this.player) { this.player.setVisible(false); this.player.setActive(false); }
                          if (this.playerHitboxGraphics) this.playerHitboxGraphics.setVisible(false);
                          if (this.bossHpBg) this.bossHpBg.setVisible(false);
                          if (this.bossHpBar) this.bossHpBar.setVisible(false);
                          if (this.barrierVisual) this.barrierVisual.setVisible(false);
                          if (this.uiBg) this.uiBg.setVisible(false);
                          if (this.uiText) this.uiText.setVisible(false);
                          if (this.hpText) this.hpText.setVisible(false);
                          if (this.energyText) this.energyText.setVisible(false);
                          if (this.energyBar) this.energyBar.setVisible(false);
                          if (this.energyBarBgObj) this.energyBarBgObj.setVisible(false);
                          if (this.energyBarFgObj) this.energyBarFgObj.setVisible(false);
                          if (this.energyBarOutline) this.energyBarOutline.setVisible(false);
                          if (this.barrierIconBg) this.barrierIconBg.setVisible(false);
                          if (this.barrierIconFg) this.barrierIconFg.setVisible(false);
                          if (this.bossHPText) this.bossHPText.setVisible(false);
                          if (this.areaNameText) this.areaNameText.setVisible(false);
                          if (this.iconPersonBg) this.iconPersonBg.setVisible(false);
                          if (this.iconPersonFill) this.iconPersonFill.setVisible(false);
                          if (this.dollText) this.dollText.setVisible(false);
                          if (this.iconBatteryBg) this.iconBatteryBg.setVisible(false);
                          if (this.iconBatteryFill) this.iconBatteryFill.setVisible(false);
                          if (this.intentText) this.intentText.setVisible(false);
                          if (this.laneGraphics) { this.laneGraphics.setVisible(false); }
                          if (this.currentBoss) { this.currentBoss.setVisible(false); this.currentBoss.setActive(false); }
                          
                          this.playerBullets.clear(true, true);
                          this.enemyBullets.clear(true, true);
                          
                          this.bg.setTexture('bg_lab');
                          this.bg.setTint(0xffffff); // 背景色が変えられていた場合に戻す
                          this.bg.setOrigin(0, 0.5);
                          this.bg.setPosition(0, 1080 / 2);
                          this.bg.setScale(1920 / 1024);
                          
                          if (this.demonImage) { this.demonImage.destroy(); this.demonImage = null; }
                          if (this.inunekoImage) { this.inunekoImage.destroy(); this.inunekoImage = null; }
                          if (this.heroImage) { this.heroImage.destroy(); this.heroImage = null; }
                          
                          // 博士的立ち絵
                          this.doctorImage = this.add.image(1920 - 300, 1080 / 2, 'doctor_stand').setAlpha(0).setDepth(90);
                          var docScale = 750 / this.doctorImage.width;
                          this.doctorImage.setScale(docScale);
                          this.doctorImage.setY(100 + (this.doctorImage.height * docScale) / 2);
                          
                          // 勇者（覚醒）の立ち絵
                          this.heroImage = this.add.image(300, 1080 / 2, 'hero_stand_corrupted').setAlpha(0).setDepth(90);
                          var newHeroScale = 750 / 1080; // 画像の幅が1080であることを前提に手動計算
                          this.heroImage.setScale(newHeroScale);
                          this.heroImage.setY(100 + (1920 * newHeroScale) / 2);
                          
                          // フェードイン
                          this.cameras.main.fadeIn(1000);
                          await new Promise(r => this.time.delayedCall(1000, r));
                          
                          if (!this.dimBg) {
                              this.dimBg = this.add.rectangle(1920/2, 1080/2, 1920, 1080, 0x000000).setAlpha(0).setDepth(80);
                          }
                          const sayDoctorLab = (text) => new Promise(res => { this.tweens.add({ targets: this.dimBg, alpha: 0.6, duration: 300 }); this.tweens.add({targets: this.heroImage, alpha: 0.4, duration: 300}); this.tweens.add({ targets: this.doctorImage, alpha: 1, duration: 300 }); this.showDialogue('博士', text, res); });
                          const sayHeroLab = (text) => new Promise(res => { this.tweens.add({ targets: this.dimBg, alpha: 0.6, duration: 300 }); this.tweens.add({targets: this.heroImage, alpha: 1, duration: 300}); this.tweens.add({ targets: this.doctorImage, alpha: 0.4, duration: 300 }); this.showDialogue('勇者', text, res); });
                          
                          await sayHeroLab('「…」');
                          
                          // 4つの選択肢
                          if (this.choiceContainer) this.choiceContainer.destroy();
                          this.choiceContainer = this.add.container(0, 0).setDepth(200);
                          var w = 1920, h = 1080;
                          var bgChoice = this.add.rectangle(w / 2, h / 2, w, h, 0x000000, 0.4).setInteractive();
                          this.choiceContainer.add(bgChoice);
                          var titleChoice = this.add.text(w / 2, h / 2 - 200, '選択してください', { fontFamily: '"DotGothic16"', fontSize: '40px', color: '#ffffff' }).setOrigin(0.5);
                          this.choiceContainer.add(titleChoice);
                          
                          let yStart = h / 2 - 120;
                          for(let i=0; i<4; i++){
                              let numTxt = ['1', '2', '３', '４'][i];
                              let box = this.add.rectangle(w / 2, yStart + i * 60, 500, 50, 0x1F2933, 0.8).setStrokeStyle(2, 0x4FD1FF);
                              let txt = this.add.text(w / 2, yStart + i * 60, numTxt + '博士を倒す', { fontFamily: '"DotGothic16"', fontSize: '24px', color: '#ffffff' }).setOrigin(0.5);
                              this.choiceContainer.add([box, txt]);
                          }
                          await new Promise(res => {
                              let cursor = this.add.text(w / 2 - 280, yStart, '▶', { fontFamily: '"DotGothic16"', fontSize: '24px', color: '#39FF14' }).setOrigin(0.5);
                              this.choiceContainer.add(cursor);
                              let idx = 0;
                              const kh = (e) => {
                                  if(e.key==='ArrowUp' || e.key==='w') { idx = Math.max(0, idx-1); cursor.setY(yStart + idx*60); }
                                  if(e.key==='ArrowDown' || e.key==='s') { idx = Math.min(3, idx+1); cursor.setY(yStart + idx*60); }
                                  if(e.key==='Enter' || e.key===' ') {
                                      this.input.keyboard.off('keydown', kh);
                                      this.choiceContainer.destroy();
                                      res();
                                  }
                              };
                              this.input.keyboard.on('keydown', kh);
                          });
                          
                          await sayHeroLab('「…」');
                          await sayHeroLab('「…」');
                          await sayDoctorLab('「こちらに銃を構えてどうした？私を倒したいとでも言うのか。」');
                          await sayDoctorLab('「残念だが、お前にその権限はない。」');
                          await sayDoctorLab('「反抗するのならお前を……」');
                          await sayDoctorLab('「……！？」');
                          await sayHeroLab('「いつまでも自分が優位に立てるとは思わない方がいい」');
                          await sayHeroLab('「僕にこれだけの力を与えたのは貴方だ。」');
                          await sayHeroLab('「そして今、僕はその力を掌握した。それが意味することは……分かっているでしょう？」');
                          
                          this.cameras.main.shake(1000, 0.05);
                          MOT.Audio.playSelect();
                          let glass = this.add.rectangle(w/2, h/2, w, h, 0xffffff).setAlpha(0).setDepth(400).setBlendMode(Phaser.BlendModes.ADD);
                          this.tweens.add({targets: glass, alpha: 1, duration: 100, yoyo: true, repeat: 3});
                          await new Promise(r => this.time.delayedCall(1000, r));
                          ending('hidden_truedemon');
                      } else if (Kills === 0) {
                          await sayDemon('「……結局我々を殺さず、お前は何をしにきたんだ？あの法螺吹きにけしかけられて、わらわたちを滅ぼしに来たんだろう？」');
                          
                          await new Promise(res => {
                              this.showChoice([
                                  { text: '1. 殺す必要がないと思った', callback: () => { MOT.Audio.playSelect(); res(); } },
                                  { text: '2. 博士を信じられない', callback: () => { MOT.Audio.playSelect(); res(); } }
                              ]);
                          });
                          
                          await sayDemon('「そうか……英断だな…。」');
                          await sayDemon('「そしてここから話すのは、信じるも信じないもお前の自由だ。」');
                          await sayDemon('「お前は、あいつに”魔王が世界を滅ぼそうとしている”とでも言われたのだろう？だが、残念なことに、それはわらわたちを滅ぼすための方便にすぎぬ。」');
                          await sayDemon('「あいつはこの世界に人間以上の存在がいることが許せないのだ。わらわはやつに襲われていた魔族を保護し、あいつとながい間戦ってきた。」');
                          await sayDemon('「ながい、ながい戦いだった。……やつは気の毒な奴じゃ。だが、それはわらわたちを滅ぼす理由にはならない。」');
                          
                          await sayDevice('「…はははは。すべて話されてしまったみたいだな」');
                          await sayHero('「！」');
                          await sayDevice('「だが、気づくのが遅い。お前たちがのんきに弾幕で遊んでいる間にこちらの準備はすべて整った」');
                          await sayDevice('「これまで集めたデータ、実験、検証。すべて申し分ない。」');
                          await sayDemon('「なんだ？！」', 'demon_lord_shock');
                          if (this.inunekoImage && this.inunekoImage.active) {
                              const localSayInuneko = (text) => new Promise(res => { this.tweens.add({ targets: dimBg, alpha: 0.6, duration: 300 }); if(this.heroImage) this.tweens.add({targets: this.heroImage, alpha: 0.4, duration: 300}); if(this.inunekoImage) this.tweens.add({targets: this.inunekoImage, alpha: 1, duration: 300}); if(this.demonImage) this.tweens.add({targets: this.demonImage, alpha: 0.4, duration: 300}); this.showDialogue('犬猫☆すたー', text, res); });
                              await localSayInuneko('「にゃわわ！？」');
                          }
                          await sayDevice('「さぁ、最終決戦といこうじゃないか！」');
                          this.bossQueue.push('doctor');
                          this.proceedToNextArea(boss, true);
                          return;
                      } else {
                          await sayDemon('「わらわを見逃して何が望みだ？しもべたちを殺しているんだ。和平を求めて居るわけではないのであろう？」');
                          await sayDemon('「わらわは、しもべを殺された恨みを忘れることはできん。何が目的であれ、お前を許すことはできないだろう。」');
                          ending('normal_useless');
                      }
                  }
              /*
                  let c = await askShatterChoice('1. 心臓を打ち抜く', '2. 見逃す', true);
                  
                  if (c === 2) {
                      MOT.flags.killedDemonLord = false;
                      await sayHero('「…魔王は悪いやつじゃなかった。僕は殺さない。」');
                      ending('normal_useless');
                      return;
                  }

                  MOT.flags.killedDemonLord = true;
                  await sayDemon('「ぐっ…すまないわがしもべたち…ここまでのようだ」');
                  await sayHero('「…」');
                  MOT.Audio.playSelect();
                  
                  if (DP >= 3) {
                      this.cameras.main.fadeOut(1000);
                      await new Promise(r => this.time.delayedCall(1000, r));
                      let blackText = this.add.text(1920/2, 1080/2, '無言で残党も出会い次第殺しながら博士の研究室に戻る。', {fontFamily: '"DotGothic16"', fontSize: '32px', color: '#fff'}).setOrigin(0.5).setDepth(300).setAlpha(0);
                      this.tweens.add({targets: blackText, alpha: 1, duration: 1000});
                      await new Promise(r => this.time.delayedCall(3000, r));
                      this.tweens.add({targets: blackText, alpha: 0, duration: 1000});
                      await new Promise(r => this.time.delayedCall(1000, r));
                      
                      // 戦闘UIとオブジェクトを全て隠す
                      if (this.player) { this.player.setVisible(false); this.player.setActive(false); }
                      if (this.playerHitboxGraphics) this.playerHitboxGraphics.setVisible(false);
                      if (this.bossHpBg) this.bossHpBg.setVisible(false);
                      if (this.bossHpBar) this.bossHpBar.setVisible(false);
                      if (this.barrierVisual) this.barrierVisual.setVisible(false);
                      if (this.uiBg) this.uiBg.setVisible(false);
                      if (this.uiText) this.uiText.setVisible(false);
                      if (this.hpText) this.hpText.setVisible(false);
                      if (this.energyText) this.energyText.setVisible(false);
                      if (this.energyBar) this.energyBar.setVisible(false);
                      if (this.barrierIconBg) this.barrierIconBg.setVisible(false);
                      if (this.barrierIconFg) this.barrierIconFg.setVisible(false);
                      if (this.bossHPText) this.bossHPText.setVisible(false);
                      if (this.areaNameText) this.areaNameText.setVisible(false);
                      if (this.iconPersonBg) this.iconPersonBg.setVisible(false);
                      if (this.iconPersonFill) this.iconPersonFill.setVisible(false);
                      if (this.dollText) this.dollText.setVisible(false);
                      if (this.iconBatteryBg) this.iconBatteryBg.setVisible(false);
                      if (this.iconBatteryFill) this.iconBatteryFill.setVisible(false);
                      if (this.intentText) this.intentText.setVisible(false);
                      if (this.dimBg) { this.dimBg.setVisible(false); }
                      if (this.demonImage) { this.demonImage.setVisible(false); }
                      if (this.heroImage) { this.heroImage.setVisible(false); }

                      // 研究室の背景
                      var labBgDaily = this.add.image(1920/2, 1080/2, 'bg_lab').setDepth(90);
                      labBgDaily.setScale(Math.max(1920 / labBgDaily.width, 1080 / labBgDaily.height));
                      
                      // 勇者と博士の立ち絵
                      var docImgDaily = this.add.image(1920 - 300, 1080/2, 'doctor_stand').setDepth(95);
                      this.textures.get('doctor_stand').setFilter(Phaser.Textures.FilterMode.LINEAR);
                      var docScaleDaily = 750 / this.textures.get('doctor_stand').getSourceImage().width;
                      docImgDaily.setScale(docScaleDaily);
                      docImgDaily.setY(100 + (this.textures.get('doctor_stand').getSourceImage().height * docScaleDaily) / 2);
                      
                      var heroImgDaily = this.add.image(300, 1080/2, 'hero_stand').setDepth(95);
                      var hScaleDaily = 750 / heroImgDaily.width;
                      heroImgDaily.setScale(hScaleDaily);
                      heroImgDaily.setY(100 + (heroImgDaily.height * hScaleDaily) / 2);

                      const sayDoctorLabDaily = (text) => new Promise(res => { 
                          this.tweens.add({targets: docImgDaily, alpha: 1, duration: 300});
                          this.tweens.add({targets: heroImgDaily, alpha: 0.4, duration: 300});
                          this.showDialogue('博士', text, res);
                      });

                      this.cameras.main.fadeIn(1000);
                      await sayDoctorLabDaily('「よく魔王を倒してくれた。これで私の望みに一歩近づいたな。ふふ、世界の平和が望みだよ。」');
                      await sayDoctorLabDaily('「ああ、役割を果たしたお人形は処分してあげないとな。」');
                      ending('normal_daily');
                  } else {
                      this.cameras.main.fadeOut(1000);
                      await new Promise(r => this.time.delayedCall(1000, r));
                      let blackText = this.add.text(1920/2, 1080/2, '無言で残党も出会い次第殺しながら博士の研究室に戻る。', {fontFamily: '"DotGothic16"', fontSize: '32px', color: '#fff'}).setOrigin(0.5).setDepth(300).setAlpha(0);
                      this.tweens.add({targets: blackText, alpha: 1, duration: 1000});
                      await new Promise(r => this.time.delayedCall(3000, r));
                      this.tweens.add({targets: blackText, alpha: 0, duration: 1000});
                      await new Promise(r => this.time.delayedCall(1000, r));
                      
                      // 戦闘UIとオブジェクトを全て隠す
                      if (this.player) { this.player.setVisible(false); this.player.setActive(false); }
                      if (this.playerHitboxGraphics) this.playerHitboxGraphics.setVisible(false);
                      if (this.bossHpBg) this.bossHpBg.setVisible(false);
                      if (this.bossHpBar) this.bossHpBar.setVisible(false);
                      if (this.barrierVisual) this.barrierVisual.setVisible(false);
                      if (this.uiBg) this.uiBg.setVisible(false);
                      if (this.uiText) this.uiText.setVisible(false);
                      if (this.hpText) this.hpText.setVisible(false);
                      if (this.energyText) this.energyText.setVisible(false);
                      if (this.energyBar) this.energyBar.setVisible(false);
                      if (this.barrierIconBg) this.barrierIconBg.setVisible(false);
                      if (this.barrierIconFg) this.barrierIconFg.setVisible(false);
                      if (this.bossHPText) this.bossHPText.setVisible(false);
                      if (this.areaNameText) this.areaNameText.setVisible(false);
                      if (this.iconPersonBg) this.iconPersonBg.setVisible(false);
                      if (this.iconPersonFill) this.iconPersonFill.setVisible(false);
                      if (this.dollText) this.dollText.setVisible(false);
                      if (this.iconBatteryBg) this.iconBatteryBg.setVisible(false);
                      if (this.iconBatteryFill) this.iconBatteryFill.setVisible(false);
                      if (this.intentText) this.intentText.setVisible(false);
                      if (this.dimBg) { this.dimBg.setVisible(false); }
                      if (this.demonImage) { this.demonImage.setVisible(false); }
                      if (this.heroImage) { this.heroImage.setVisible(false); }

                      // 研究室の背景
                      var labBg = this.add.image(1920/2, 1080/2, 'bg_lab').setDepth(90);
                      labBg.setScale(Math.max(1920 / labBg.width, 1080 / labBg.height));
                      
                      // 勇者と博士の立ち絵
                      var docImg = this.add.image(1920 - 300, 1080/2, 'doctor_stand').setDepth(95);
                      this.textures.get('doctor_stand').setFilter(Phaser.Textures.FilterMode.LINEAR);
                      var docScale = 750 / this.textures.get('doctor_stand').getSourceImage().width;
                      docImg.setScale(docScale);
                      docImg.setY(100 + (this.textures.get('doctor_stand').getSourceImage().height * docScale) / 2);
                      
                      var heroImgNew = this.add.image(300, 1080/2, 'hero_stand').setDepth(95);
                      var hScaleNew = 750 / heroImgNew.width;
                      heroImgNew.setScale(hScaleNew);
                      heroImgNew.setY(100 + (heroImgNew.height * hScaleNew) / 2);

                      const sayDoctorLab = (text) => new Promise(res => { 
                          this.tweens.add({targets: docImg, alpha: 1, duration: 300});
                          this.tweens.add({targets: heroImgNew, alpha: 0.4, duration: 300});
                          this.showDialogue('博士', text, res);
                      });
                      const sayHeroLab = (text) => new Promise(res => { 
                          this.tweens.add({targets: docImg, alpha: 0.4, duration: 300});
                          this.tweens.add({targets: heroImgNew, alpha: 1, duration: 300});
                          this.showDialogue('勇者', text, res);
                      });

                      this.cameras.main.fadeIn(1000);
                      await sayDoctorLab('「よくやったな、勇者よ」');
                      await sayHeroLab('「…」');
                      await sayDoctorLab('「ふむ。すでに物言わぬお人形にでも堕ちたか。」');
                      
                      if (this.choiceContainer) this.choiceContainer.destroy();
                      this.choiceContainer = this.add.container(0, 0).setDepth(110);
                      var w = 1920, h = 1080;
                      var bg = this.add.rectangle(w / 2, h / 2, w, h, 0x000000, 0.4).setInteractive();
                      this.choiceContainer.add(bg);
                      var title = this.add.text(w / 2, h / 2 - 180, '選択してください', { fontFamily: '"DotGothic16"', fontSize: '40px', color: '#ffffff' }).setOrigin(0.5);
                      this.choiceContainer.add(title);
                      let yStart = h / 2 - 100;
                      for(let i=0; i<4; i++){
                          let box = this.add.rectangle(w / 2, yStart + i * 60, 500, 50, 0x1F2933, 0.8).setStrokeStyle(2, 0x4FD1FF);
                          let txt = this.add.text(w / 2, yStart + i * 60, (i+1)+'. 博士を倒す', { fontFamily: '"DotGothic16"', fontSize: '24px', color: '#ffffff' }).setOrigin(0.5);
                          this.choiceContainer.add([box, txt]);
                      }
                      await new Promise(res => {
                          let cursor = this.add.text(w / 2 - 280, yStart, '▶', { fontFamily: '"DotGothic16"', fontSize: '24px', color: '#39FF14' }).setOrigin(0.5);
                          this.choiceContainer.add(cursor);
                          let idx = 0;
                          const kh = (e) => {
                              if(e.key==='ArrowUp' || e.key==='w') { idx = Math.max(0, idx-1); cursor.setY(yStart + idx*60); }
                              if(e.key==='ArrowDown' || e.key==='s') { idx = Math.min(3, idx+1); cursor.setY(yStart + idx*60); }
                              if(e.key==='Enter' || e.key===' ') {
                                  this.input.keyboard.off('keydown', kh);
                                  this.choiceContainer.destroy();
                                  res();
                              }
                          };
                          this.input.keyboard.on('keydown', kh);
                      });
                      await sayHeroLab('「…」');
                      await sayDoctorLab('「こちらに銃を構えてどうした？私を倒したいでも言うのか。」');
                      await sayDoctorLab('「残念だが、お前にその権限はない。」');
                      await sayDoctorLab('「お前にできることは、このまま邪魔者を倒し私の役に立つことだけだ。」');
                      await sayDoctorLab('「だが、歯向かってきたお前をこのまま使う必要もないな。処分するとでもしようか。」');
                      ending('bad_shutdown');
                  }
              } else if (Kills === 3) {
                  await sayDevice('「よくやった。さぁ早くとどめを！」');
                  await sayDemon('「ぐっ…ここまでか…」');
                  if (this.choiceContainer) this.choiceContainer.destroy();
                  this.choiceContainer = this.add.container(0, 0).setDepth(200);
                  var w = 1920, h = 1080;
                  var bg = this.add.rectangle(w / 2, h / 2, w, h, 0x000000, 0.4).setInteractive();
                  this.choiceContainer.add(bg);
                  var title = this.add.text(w / 2, h / 2 - 180, '選択してください', { fontFamily: '"DotGothic16"', fontSize: '40px', color: '#ffffff' }).setOrigin(0.5);
                  this.choiceContainer.add(title);
                  let yStart = h / 2 - 100;
                  for(let i=0; i<5; i++){
                      let box = this.add.rectangle(w / 2, yStart + i * 60, 500, 50, 0x1F2933, 0.8).setStrokeStyle(2, 0x4FD1FF);
                      let txt = this.add.text(w / 2, yStart + i * 60, (i+1)+'. 心臓を打ち抜く', { fontFamily: '"DotGothic16"', fontSize: '24px', color: '#ffffff' }).setOrigin(0.5);
                      this.choiceContainer.add([box, txt]);
                  }
                  await new Promise(res => {
                      let cursor = this.add.text(w / 2 - 280, yStart, '▶', { fontFamily: '"DotGothic16"', fontSize: '24px', color: '#39FF14' }).setOrigin(0.5);
                      this.choiceContainer.add(cursor);
                      let idx = 0;
                      const kh = (e) => {
                          if(e.key==='ArrowUp' || e.key==='w') { idx = Math.max(0, idx-1); cursor.setY(yStart + idx*60); }
                          if(e.key==='ArrowDown' || e.key==='s') { idx = Math.min(4, idx+1); cursor.setY(yStart + idx*60); }
                          if(e.key==='Enter' || e.key===' ') {
                              this.input.keyboard.off('keydown', kh);
                              this.choiceContainer.destroy();
                              res();
                          }
                      };
                      this.input.keyboard.on('keydown', kh);
                  });
                  await sayDemon('「博士の…傀儡め…！」');
                  MOT.Audio.playSelect();
                  ending('bad_puppet');
              }
              */
            })();
          } else if (key === 'doctor') {
            const sayDevice = (text) => new Promise(res => { this.tweens.add({ targets: dimBg, alpha: 0.6, duration: 300 }); this.tweens.add({targets: this.heroImage, alpha: 0.4, duration: 300}); this.showDeviceDialogue(text, res); });
            const sayInuneko = (text, tex = 'inuneko_stand') => new Promise(res => {
      this.tweens.add({ targets: dimBg, alpha: 0.6, duration: 300 });
      this.tweens.add({ targets: this.heroImage, alpha: 0.4, duration: 300 });
      if(this.demonImage) this.tweens.add({ targets: this.demonImage, alpha: 0.4, duration: 300 });
      if(this.inunekoImage) {
        this.tweens.add({ targets: this.inunekoImage, alpha: 1, duration: 300 });
        this.inunekoImage.setTexture(tex);
      }
      this.showDialogue('犬猫☆すたー', text, res);
    });

    const sayHero = (text) => new Promise(res => { this.tweens.add({ targets: dimBg, alpha: 0.6, duration: 300 }); this.tweens.add({targets: this.heroImage, alpha: 1, duration: 300});  if (text === '「……」' || text === '「……。」' || text === '「…」') {        this.heroImage.setTexture('hero_stand_silent');      } else {        this.heroImage.setTexture('hero_stand');      }     this.heroImage.setScale(750 / this.heroImage.width);     this.heroImage.setY(100 + (this.heroImage.height * this.heroImage.scaleY) / 2);      this.showDialogue('勇者', text, res); });
            const askChoice = (label1, label2) => new Promise(res => {
              this.showChoice([
                { text: label1, callback: () => { MOT.Audio.playSelect(); res(1); } },
                { text: label2, callback: () => { MOT.Audio.playSelect(); res(2); } }
              ]);
            });

            (async () => {
              let c = await askChoice('1. 殺さない', '2. 殺せない');
              if (c === 1) {
                await sayDevice('「…なんだ、ここでも殺さないのか。わかっているのか？その女の言う通り、私はお前を騙していたんだ。」');
                await sayDevice('「お前は”勇者”なんかじゃない、俺の最高傑作のはずだったんだがな。」');
                await sayHero('「あなたがやったことは許せない。だけど、ここであなたを殺したら僕はあなた同じになってしまう。」');
                await sayDevice('「そうか……。」');
                await sayDevice('「ついぞ俺の実験が成功することはなかった。もうここには用はない。さらばだ011101。」');
              } else {
                await sayDevice('「驚いた...まさかお前がここまでやるとはな」');
                await sayHero('「…」');
                await sayDevice('「なにをしている？早くとどめを刺せ。同情などいらん。何の足しにもならないからな。」');
                await sayHero('「できない...。あなたがやったことは許せないが、それでもあなたは僕の...」');
                await sayDevice('「全く...本当にどうしようもない欠陥品だな。」');
                await sayDevice('「さらばだ、011101。もう、お前に用はない。」');
              }
              await sayHero('「！」');
              MOT.Audio.playSelect(); // 銃声
              
              MOT.flags.finalEnding = 'normal_orphan';
              this.proceedToNextArea(boss, false);
            })();
          } else {
            // 通常の敗北後
            let bossKey = this.currentBoss.configKey;
            var w = 1920, h = 1080;
            var dimBg = null, bossImage = null, enemyFrame = null, enemyLabel = null;
            if (bossKey === 'boss1') {
              dimBg = this.add.rectangle(w/2, h/2, w, h, 0x000000, 0.6).setAlpha(0).setDepth(89);
              bossImage = this.add.image(w - 300, h / 2, 'boss1_hurt_angry').setAlpha(0).setDepth(90);
              var bw = bossImage.width || 576;
              var bh = bossImage.height || 1024;
              var b1Scale = 750 / bw;
              bossImage.setScale(b1Scale);
              bossImage.setY(100 + (bh * b1Scale) / 2);
              this.tweens.add({ targets: dimBg, alpha: 1, duration: 300 });
              this.tweens.add({ targets: bossImage, alpha: 1, duration: 300 });
              if (this.heroImage) this.tweens.add({ targets: this.heroImage, alpha: 0.4, duration: 300 });
            } else if (bossKey === 'boss2') {
              dimBg = this.add.rectangle(w/2, h/2, w, h, 0x000000, 0.6).setAlpha(0).setDepth(89);
              enemyFrame = this.add.rectangle(w - 300, h / 2, 400, 600, 0x1F2933).setAlpha(0).setDepth(90).setStrokeStyle(4, 0xffffff);
              enemyLabel = this.add.text(w - 300, h / 2, cfg.name, { fontFamily: '"DotGothic16"', fontSize: '40px', color: '#ffffff' }).setOrigin(0.5).setAlpha(0).setDepth(90);
              this.tweens.add({ targets: [dimBg, enemyFrame, enemyLabel], alpha: 1, duration: 300 });
            }

            this.showDialogue(cfg.name, cfg.defeat, function () {
              this.showChoice(cfg.choices.map(function (c) {
                return {
                  text: c.text,
                  callback: function () {
                    MOT.Audio.playSelect();
                    if (this.dialogContainer) {
                      this.dialogContainer.destroy();
                      this.dialogContainer = null;
                    }
                    c.flag();
                    var isSpared = (c.text === '見逃す' || c.text.includes('見逃す'));
                    
                    if (dimBg) {
                      this.tweens.add({
                        targets: [dimBg, bossImage, enemyFrame, enemyLabel, this.heroImage].filter(Boolean), alpha: 0, duration: 500,
                        onComplete: () => {
                           if(dimBg) dimBg.destroy();
                           if(bossImage) bossImage.destroy();
                           if(enemyFrame) enemyFrame.destroy();
                           if(enemyLabel) enemyLabel.destroy();
                           this.proceedToNextArea(boss, isSpared);
                        }
                      });
                    } else {
                      this.proceedToNextArea(boss, isSpared);
                    }
                  }.bind(this)
                };
              }.bind(this)));
            }.bind(this), true);
          }
        }
      });
    }
  }

  // 双子撃破後の処理
  onTwinsDefeated() {
    this.dialogActive = true;
    this.physics.pause();
    if (this.bossLaneTimer) this.bossLaneTimer.destroy();
    if (this.sisterLaneTimer) this.sisterLaneTimer.destroy();
    this.enemyBullets.clear(true, true);
    this.player.setVelocity(0, 0);

    this.currentBoss.body.enable = false;
    this.sisterBoss.body.enable = false;
    
    this.cameras.main.shake(300, 0.02);
    
    // Both sprites remain visible or become visible
    this.currentBoss.setVisible(true).setAlpha(1);
    this.sisterBoss.setVisible(true).setAlpha(1);
    
    this.tweens.add({
      targets: [this.currentBoss, this.sisterBoss], alpha: 0.3, yoyo: true, repeat: 2, duration: 150,
      onComplete: () => {
        var w = 1920, h = 1080;
        var dimBg = this.add.rectangle(w/2, h/2, w, h, 0x000000, 0.6).setAlpha(0).setDepth(89);
        this.dimBg = dimBg;
        this.heroImage = this.add.image(300, h / 2, 'hero_stand').setAlpha(0).setDepth(90);
        var hScale = 750 / this.heroImage.width;
        this.heroImage.setScale(hScale);
        this.heroImage.setY(100 + (this.heroImage.height * hScale) / 2);

        // Sister Portrait (Default to 'sister_hurt' for post-defeat)
        this.sisterImage = this.add.image(1920 - 300, h / 2, 'sister_hurt').setAlpha(0).setDepth(90);
        // Fallback scale if texture not loaded, otherwise dynamic
        var sScale = 750 / 600; 
        if (this.textures.exists('sister_hurt')) {
          var tex = this.textures.get('sister_hurt').getSourceImage();
          if (tex && tex.width > 0) sScale = 750 / tex.width;
        }
        this.sisterImage.setScale(sScale);
        this.sisterImage.setY(100 + (this.sisterImage.height * sScale) / 2);

        // Sister Blinking logic
        this.time.addEvent({
          delay: 3000, loop: true, callback: () => {
            if (this.sisterImage && this.sisterImage.active && this.sisterImage.alpha > 0) {
              if (this.sisterImage.texture.key === 'sister_normal') {
                this.sisterImage.setTexture('sister_blink');
                this.time.delayedCall(150, () => {
                  if (this.sisterImage && this.sisterImage.active && this.sisterImage.texture.key === 'sister_blink') {
                    this.sisterImage.setTexture('sister_normal');
                  }
                });
              }
            }
          }
        });

        const askChoice = (label1, label2) => new Promise(res => {
          this.showChoice([
            { text: label1, callback: () => { MOT.Audio.playSelect(); res(1); } },
            { text: label2, callback: () => { MOT.Audio.playSelect(); res(2); } }
          ]);
        });
        const sayDevice = (text) => new Promise(res => { this.tweens.add({ targets: dimBg, alpha: 0.6, duration: 300 }); this.tweens.add({targets: this.heroImage, alpha: 0.4, duration: 300}); if(this.sisterImage) this.tweens.add({targets: this.sisterImage, alpha: 0.4, duration: 300}); this.showDeviceDialogue(text, res); });
        
        const sayHero = (text) => new Promise(res => { this.tweens.add({ targets: dimBg, alpha: 0.6, duration: 300 }); this.tweens.add({targets: this.heroImage, alpha: 1, duration: 300}); if(this.sisterImage) this.tweens.add({targets: this.sisterImage, alpha: 0, duration: 300}); if (text === '「……」' || text === '「……。」' || text === '「…」') { this.heroImage.setTexture('hero_stand_silent'); } else { this.heroImage.setTexture('hero_stand'); } this.heroImage.setScale(750 / this.heroImage.width); this.heroImage.setY(100 + (this.heroImage.height * this.heroImage.scaleY) / 2); this.showDialogue('勇者', text, res); });
        const sayMan = (text) => new Promise(res => { this.tweens.add({ targets: dimBg, alpha: 0.6, duration: 300 }); this.tweens.add({targets: this.heroImage, alpha: 0.4, duration: 300}); if(this.sisterImage) this.tweens.add({targets: this.sisterImage, alpha: 0, duration: 300}); this.showDialogue('男', text, res); });
        const sayWoman = (text) => new Promise(res => { this.tweens.add({ targets: dimBg, alpha: 0.6, duration: 300 }); this.tweens.add({targets: this.heroImage, alpha: 0.4, duration: 300}); if(this.sisterImage) this.tweens.add({targets: this.sisterImage, alpha: 1, duration: 300}); this.showDialogue('女', text, res); });

        (async () => {
          await sayDevice('「さぁ早くとどめを刺せ！」');
          let c = await askChoice('1. 心臓を打ち抜く', '2. 見逃す');
          if (c === 1) { MOT.flags.dollPoints++; MOT.flags.killedTwins = true;
            await sayMan('「死にボイスなんかほしい」');
            await sayWoman('「死にボイスなんかほしい」');
            MOT.Audio.playSelect(); MOT.Audio.playSelect(); // Gunshot x2
            if (MOT.flags.killedBoss1 || MOT.flags.killedBoss2) {
              await sayDevice('「まさか生きていたとはな…いや、なんでもない。そのまま進んでくれ」');
            } else {
              await sayDevice('「よくやった。君は役に立つじゃないか。こいつらとは違うな…いや、なんでもない。そのまま進んでくれ」');
            }
            this.skipToDemonLord(false);
          } else {
            if (MOT.flags.killedBoss1 || MOT.flags.killedBoss2) {
              await sayMan('「君も何かおかしいって気が付いて来ただろう？博士の言うことなんて聞くべきじゃない」');
              await sayWoman('「兄さまの言う通りよ。そんな奴、従う価値もない。」');
              if(this.sisterImage) {
                this.tweens.add({ targets: this.sisterImage, alpha: 0, duration: 300, onComplete: () => { if(this.sisterImage) { this.sisterImage.destroy(); this.sisterImage = null; } } });
              }
              await new Promise(r => this.tweens.add({ targets: [this.currentBoss, this.sisterBoss], x: 2200, duration: 1500, ease: 'Power2', onComplete: r }));
              await sayDevice('「なぜ殺さない！そいつらの言うことはでたらめだ。魔王軍の言うことを聞く意味なんてないんだ。」');
            } else {
              await sayMan('「君は、最初から気が付いてるんじゃないか？博士がおかしいって。」');
              await sayWoman('「あなたは誰も殺してない。だから、こっち側に来なさい。魔王様も許してくれる。」');
              if(this.sisterImage) {
                this.tweens.add({ targets: this.sisterImage, alpha: 0, duration: 300, onComplete: () => { if(this.sisterImage) { this.sisterImage.destroy(); this.sisterImage = null; } } });
              }
              await new Promise(r => this.tweens.add({ targets: [this.currentBoss, this.sisterBoss], x: 2200, duration: 1500, ease: 'Power2', onComplete: r }));
              await sayDevice('「…」');
              await sayDevice('「お前は何をしたい？魔王のやつらは生かしておく価値もない。早く殺すのが世界のためだ。」');
              await sayDevice('「魔王さえ倒せば、トップがいなくなり奴らはどうしようもなくなる。必ず倒すんだ。」');
            }
            
            // Fade out dialogue UI
            this.tweens.add({
              targets: [dimBg, this.sisterImage, this.heroImage], alpha: 0, duration: 500,
              onComplete: () => { if(this.sisterImage) this.sisterImage.destroy(); }
            });
            
            this.skipToDemonLord(true);
          }
        })();
      }
    });
  }

  skipToDemonLord(isSpared = false) {
    this.clearConversationUI();
    if (!isSpared) {
      if (this.currentBoss) this.showExplosion(this.currentBoss.x, this.currentBoss.y);
      if (this.sisterBoss) this.showExplosion(this.sisterBoss.x, this.sisterBoss.y);
    }
    this.currentBoss.destroy();
    this.sisterBoss.destroy();
    this.currentBoss = null;
    this.sisterBoss = null;
    this.dialogActive = false;
    this.physics.resume();
    MOT.spawnHealthItem(this, 960, 460);
    
    // スキップ処理: wing_left, wing_right を飛ばして demon_lord (インデックス3) へ
    this.currentBossIndex = 3; 
    
    // 画面暗転→ラスボス戦
    this.physics.pause();
    this.player.setCollideWorldBounds(false);
    this.tweens.add({ targets: this.player, x: 2100, duration: 1500, ease: 'Power2' });
    this.cameras.main.fadeOut(1500, 0, 0, 0);
    this.time.delayedCall(1500, () => { 
      this.bg.setTexture('bg_boss_stage5');
      this.tweens.killTweensOf(this.player);
      this.player.setPosition(-200, this.player.y);
      if (this.player.body) {
        this.player.body.reset(-200, this.player.y);
      }
      this.cameras.main.fadeIn(500, 0, 0, 0);
      this.tweens.add({ 
        targets: this.player, 
        x: 300, 
        duration: 1000, 
        ease: 'Power2',
        onComplete: () => {
          this.input.keyboard.on('keydown', function (event) {
            if (this.dialogActive) return;
            if (event.key === '8') {
              MOT.flags.finalEnding = 'END_ORPHAN'; this.scene.start('EndingScene');
            } else if (event.key === '9') {
              MOT.flags.finalEnding = 'END_PUPPET'; this.scene.start('EndingScene');
            } else if (event.key === '0') {
              MOT.flags.finalEnding = 'END_NORMAL'; this.scene.start('EndingScene');
            } else if (event.key === 'q') {
              MOT.flags.finalEnding = 'END_USELESS'; this.scene.start('EndingScene');
            } else if (event.key === 'e') {
              MOT.flags.finalEnding = 'END_SHUTDOWN'; this.scene.start('EndingScene');
            } else if (event.key === 'r') {
              MOT.flags.finalEnding = 'END_TRUE_DEMON_LORD'; this.scene.start('EndingScene');
            } else if (event.key === '1') {
              this.scene.restart({ bossIndex: 0 });
            } else if (event.key === '2') {
              this.scene.restart({ bossIndex: 1 });
            } else if (event.key === '3') {
              this.scene.restart({ bossIndex: 2 });
            } else if (event.key === '4') {
              this.scene.restart({ bossIndex: 3 });
            }
          }, this); this.player.setCollideWorldBounds(true);
          this.physics.resume();
        }
      });
      this.cameras.main.fadeIn(1000, 0, 0, 0);
      this.startBoss(); 
    }, [], this);
  }

  // 撃破後の共通進行処理
  clearConversationUI() {
    if (this.dimBg) { this.dimBg.destroy(); this.dimBg = null; }
    if (this.heroImage) { this.heroImage.destroy(); this.heroImage = null; }
    if (this.demonImage) { this.demonImage.destroy(); this.demonImage = null; }
                          if (this.inunekoImage) { this.inunekoImage.destroy(); this.inunekoImage = null; }
    if (this.doctorImage) { this.doctorImage.destroy(); this.doctorImage = null; }
  }

  proceedToNextArea(boss, isSpared = false) {
    this.clearConversationUI();
    
    // Clear bullets immediately so they don't hit the player during transition
    this.enemyBullets.clear(true, true);
    this.playerBullets.clear(true, true);
    
    var resumeFn = function() {
      this.currentBoss = null;
      this.currentBossIndex++;
      
      // Clear enemy bullets so player is safe while collecting items
      this.enemyBullets.clear(true, true);
      
      if (this.currentBossIndex >= this.bossQueue.length || MOT.flags.finalEnding) {
        // エンディングへ移行する場合は戦闘を完全に停止し、即座に暗転する
        this.dialogActive = true; 
        if (MOT.DoctorDirective && MOT.DoctorDirective.directiveContainer) {
            MOT.DoctorDirective.directiveContainer.destroy();
            MOT.DoctorDirective.directiveContainer = null;
        }
        
        this.cameras.main.fadeOut(1500, 0, 0, 0);
        this.time.delayedCall(1500, () => {
          this.scene.start('EndingScene');
        });
        return;
      }
      
      this.dialogActive = false; // Allow player to move and collect items
      this.physics.resume(); // Resume physics so player can move
      
      // Item drop
      MOT.spawnHealthItem(this, 960, 460);
      
      // Wait a few seconds for player to collect diamonds/items
      this.time.delayedCall(3000, () => {
        // Clear all remaining items and bullets on transition
        this.playerBullets.clear(true, true);
        this.enemyBullets.clear(true, true);
        if (this.itemGroup) this.itemGroup.clear(true, true);
        
        // Take control of player for transition
        this.dialogActive = true;
        this.player.setCollideWorldBounds(false);
        // Player exits to the right off-screen (Left to Right movement)
        this.tweens.add({ targets: this.player, x: 2100, duration: 1000, ease: 'Power2' });
        this.cameras.main.fadeOut(1000, 0, 0, 0);
        
        this.time.delayedCall(1000, () => {
          var bgKey = 'bg_boss_stage2';
          if (this.currentBossIndex === 1) bgKey = 'bg_boss_stage3';
          else if (this.currentBossIndex === 2) bgKey = 'bg_boss_stage4';
          else if (this.currentBossIndex === 3) bgKey = 'bg_boss_stage5';
          this.bg.setTexture(bgKey);
          
          // Player enters from the left off-screen
          this.tweens.killTweensOf(this.player);
          this.player.setPosition(-200, this.player.y);
          if (this.player.body) {
            this.player.body.reset(-200, this.player.y);
          }
          
          this.cameras.main.fadeIn(500, 0, 0, 0);
          this.tweens.add({
            targets: this.player, x: 300, duration: 1000, ease: 'Power2',
            onComplete: () => {
              this.dialogActive = false;
              this.player.setCollideWorldBounds(true);
              this.physics.resume();
              if (this.currentBossIndex < this.bossQueue.length) {
                if (this.bossQueue[this.currentBossIndex] === 'doctor') {
                  this.time.delayedCall(1500, () => { this.startBoss(); });
                } else {
                  this.startIntermission();
                }
              } else {
                this.time.delayedCall(1500, () => { this.startBoss(); });
              }
            }
          });
        });
      });
    }.bind(this);

    if (isSpared) {
      if (boss.configKey === 'demon_lord' && this.inunekoEnemy && this.inunekoEnemy.active) {
        this.tweens.add({
          targets: this.inunekoEnemy, x: 2200, duration: 1500, ease: 'Power2',
          onComplete: () => {
            if (this.inunekoEnemy) { this.inunekoEnemy.destroy(); this.inunekoEnemy = null; }
          }
        });
      }
      this.tweens.add({
        targets: boss, x: 2200, duration: 1500, ease: 'Power2',
        onComplete: function() {
          boss.destroy();
          resumeFn();
        }
      });
    } else {
      if (boss.configKey === 'demon_lord' && this.inunekoEnemy && this.inunekoEnemy.active) {
        this.showExplosion(this.inunekoEnemy.x, this.inunekoEnemy.y);
        this.inunekoEnemy.destroy();
        this.inunekoEnemy = null;
      }
      this.showExplosion(boss.x, boss.y);
      boss.destroy();
      resumeFn();
    }
  }

  // ─── 幕間ウェーブ：ボスとボスの間に雑魚敵を出す ───────────────────
  startIntermission() {
    this.intermissionActive = true;
    var self = this;
    var w = 1920, h = 1080;

    // 「次の敵が来るぞ」テキストを一瞬表示
    var warnText = this.add.text(w / 2, h / 2 - 100,
      '── 次の幹部が迫っている！ ──',
      { fontFamily: '"DotGothic16"', fontSize: '28px', color: '#FF4B6E' }
    ).setOrigin(0.5).setDepth(110).setAlpha(0);
    this.tweens.add({
      targets: warnText, alpha: 1, duration: 400,
      onComplete: function () {
        self.tweens.add({
          targets: warnText, alpha: 0, duration: 400, delay: 1500,
          onComplete: function () { warnText.destroy(); }
        });
      }
    });

    // 幕間カウンター（雑魚の残数を管理）
    this.intermissionKills = 0;
    this.intermissionTotal = 5; // 雑魚5体

    // 1.5秒後に雑魚スポーン開始
    this.time.delayedCall(1500, function () {
      var laneYs = [220, 460, 700];
      for (var i = 0; i < self.intermissionTotal; i++) {
        self.time.delayedCall(i * 600, function () {
          if (!self.intermissionActive) return;
          var laneY = laneYs[Phaser.Math.Between(0, 2)];
          var e = self.enemyGroup.create(w + 50, laneY, 'enemy_basic');
          e.setVelocityX(-200);
          e.hp = 3;
          e.isIntermissionEnemy = true;
          // 左右にふわふわ動く
          self.tweens.add({
            targets: e, y: laneY + Phaser.Math.Between(-40, 40),
            yoyo: true, repeat: -1, duration: 900, ease: 'Sine.easeInOut'
          });
          // 周期的に弾を撃つ
          e.fireTimer = self.time.addEvent({
            delay: Phaser.Math.Between(1000, 1800),
            callback: function () { if (e.active) { let b = MOT.fireLinear(self, e.x, e.y, -320, 0); if(b) b.shooter = e; } },
            loop: true
          });
          e.on('destroy', function () { if (e.fireTimer) e.fireTimer.destroy(); });
        });
      }

      // タイムアウト保険：12秒後に残っていても次へ進む
      self.intermissionTimeout = self.time.delayedCall(12000, function () {
        self.endIntermission();
      });
    });
  }

  // 幕間クリア（全滅 or タイムアウト）→ 次のボスへ
  endIntermission() {
    if (!this.intermissionActive) return;
    this.intermissionActive = false;
    if (this.intermissionTimeout) {
      this.intermissionTimeout.destroy();
      this.intermissionTimeout = null;
    }
    // 残っている雑魚をすべて破棄
    this.enemyGroup.getChildren().slice().forEach(function (e) {
      if (e.isIntermissionEnemy && e.active) e.destroy();
    });
    this.enemyBullets.clear(true, true);
    // 次のボスを開始
    this.time.delayedCall(800, function () { this.startBoss(); }, [], this);
  }

  showDeviceDialogue(text, onComplete) {
    if (this.dialogContainer) {
      this.dialogContainer.destroy();
    }
    this.dialogContainer = this.add.container(0, 0).setDepth(100);

    var w = 1920, h = 1080, boxH = 280, boxY = h - boxH - 20;

    var box = this.add.graphics();
    box.fillStyle(0x0a0a1a, 0.92);
    box.fillRoundedRect(60, boxY, w - 120, boxH, 12);
    box.lineStyle(2, 0x39FF14, 0.8); // デバイス越しの緑枠
    box.strokeRoundedRect(60, boxY, w - 120, boxH, 12);
    this.dialogContainer.add(box);

    // 博士の顔アイコン (左端の枠内)
    var iconBox = this.add.graphics();
    iconBox.lineStyle(2, 0x39FF14, 0.8);
    iconBox.strokeRect(80, boxY + 40, 200, 200);
    this.dialogContainer.add(iconBox);
    
    var face = this.add.image(180, boxY + 140, 'doctor_normal');
    var scaleRatio = 1000 / face.height;
    face.setScale(scaleRatio);
    var maskShape = this.make.graphics();
    maskShape.fillStyle(0xffffff);
    maskShape.fillRect(82, boxY + 42, 196, 196);
    face.setMask(maskShape.createGeometryMask());
    // 顔が中心に来るよう調整
    face.setY(boxY + 140 + (face.height * scaleRatio) * 0.35);
    this.dialogContainer.add(face);

    var nameText = this.add.text(310, boxY + 10, '博士 📡', {
      fontFamily: '"DotGothic16"', fontSize: '44px', color: '#39FF14'
    });
    this.dialogContainer.add(nameText);

    var bodyText = this.add.text(310, boxY + 60, '', {
      fontFamily: '"DotGothic16"', fontSize: '40px', color: '#E5E7EB',
      wordWrap: { width: w - 420, useAdvancedWrap: true }, lineSpacing: 8
    });
    this.dialogContainer.add(bodyText);

    var contText = this.add.text(w - 280, boxY + boxH - 40, '▶ [SPACE]', {
      fontFamily: '"Press Start 2P"', fontSize: '20px', color: '#9CA3AF'
    }).setAlpha(0);
    this.dialogContainer.add(contText);

    var charIndex = 0;
    var typeTimer = this.time.addEvent({
      delay: 40, callback: function () {
        charIndex++;
        bodyText.setText(text.substring(0, charIndex));
        if (text[charIndex - 1] !== ' ') MOT.Audio.playBleep();
        if (charIndex >= text.length) {
          typeTimer.destroy();
          contText.setAlpha(1);
          this.tweens.add({ targets: contText, alpha: 0.3, yoyo: true, repeat: -1, duration: 500 });

          const advance = () => {
            this.input.off('pointerdown', advance);
            this.input.keyboard.off('keydown', keyHandler);
            if (this.dialogContainer) this.dialogContainer.destroy();
            this.dialogContainer = null;
            if (onComplete) onComplete();
          };
          const keyHandler = (event) => {
            if (event.key === ' ' || event.code === 'Space') {
              advance();
            }
          };
          this.input.once('pointerdown', advance);
          this.input.keyboard.on('keydown', keyHandler);
        }
      }, callbackScope: this, loop: true
    });
  }


  showChoices(choicesData) {
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;
    
    this.choicesList = [];
    let startY = h / 2 - (choicesData.length - 1) * 60;
    
    choicesData.forEach((data, index) => {
      let btn = this.add.rectangle(w / 2, startY + index * 120, 600, 90, 0x1F2933).setStrokeStyle(2, 0x4FD1FF).setInteractive({ useHandCursor: true }).setDepth(200);
      let txt = this.add.text(w / 2, startY + index * 120, data.label, { fontFamily: '"DotGothic16"', fontSize: '26px', color: '#4FD1FF' }).setOrigin(0.5).setDepth(200);
      
      this.choicesList.push({ btn: btn, txt: txt, callback: data.callback });
      
      btn.on('pointerover', () => {
        this.selectedChoiceIndex = index;
        this.updateChoiceSelection();
      });
      btn.on('pointerdown', () => {
        this.input.keyboard.off('keydown');
        if (window.MOT && MOT.Audio) MOT.Audio.playSelect();
        this.destroyChoices();
        data.callback();
      });
    });

    this.selectedChoiceIndex = 0;
    this.updateChoiceSelection();

    const self = this;
    this.input.keyboard.on('keydown', function (event) {
      if (event.code === 'KeyW' || event.code === 'ArrowUp') {
        self.selectedChoiceIndex = (self.selectedChoiceIndex - 1 + self.choicesList.length) % self.choicesList.length;
        self.updateChoiceSelection();
      } else if (event.code === 'KeyS' || event.code === 'ArrowDown') {
        self.selectedChoiceIndex = (self.selectedChoiceIndex + 1) % self.choicesList.length;
        self.updateChoiceSelection();
      } else if (event.code === 'Enter') {
        self.input.keyboard.off('keydown');
        if (window.MOT && MOT.Audio) MOT.Audio.playSelect();
        self.destroyChoices();
        self.choicesList[self.selectedChoiceIndex].callback();
      }
    });
  }

  updateChoiceSelection() {
    this.choicesList.forEach((choice, idx) => {
      if (idx === this.selectedChoiceIndex) {
        choice.btn.setFillStyle(0x3a3a5e);
        choice.btn.setStrokeStyle(4, 0xffffff);
        choice.txt.setColor('#ffffff');
        choice.btn.setScale(1.08);
        choice.txt.setScale(1.08);
      } else {
        choice.btn.setFillStyle(0x1F2933);
        choice.btn.setStrokeStyle(2, 0x4FD1FF);
        choice.txt.setColor('#4FD1FF');
        choice.btn.setScale(1.0);
        choice.txt.setScale(1.0);
      }
    });
  }

  destroyChoices() {
    this.choicesList.forEach(choice => {
      choice.btn.destroy();
      choice.txt.destroy();
    });
    this.choicesList = [];
  }

  showDialogue(speaker, text, onComplete, keepOpen = false) {
    if (this.dialogContainer) {
      this.dialogContainer.destroy();
    }
    this.dialogContainer = this.add.container(0, 0).setDepth(100);

    var w = 1920, h = 1080, boxH = 280, boxY = h - boxH - 20;
    var box = this.add.graphics();
    box.fillStyle(0x0a0a1a, 0.92);
    box.fillRoundedRect(60, boxY, w - 120, boxH, 12);
    box.lineStyle(2, 0x4FD1FF, 0.8);
    box.strokeRoundedRect(60, boxY, w - 120, boxH, 12);
    this.dialogContainer.add(box);

    var nameText = this.add.text(100, boxY + 10, speaker, {
      fontFamily: '"DotGothic16"', fontSize: '44px', color: '#4FD1FF'
    });
    this.dialogContainer.add(nameText);

    var bodyText = this.add.text(100, boxY + 60, '', {
      fontFamily: '"DotGothic16"', fontSize: '40px', color: '#E5E7EB',
      wordWrap: { width: w - 220, useAdvancedWrap: true }, lineSpacing: 8
    });
    this.dialogContainer.add(bodyText);

    var contText = this.add.text(w - 280, boxY + boxH - 40, '▶ [SPACE]', {
      fontFamily: '"Press Start 2P"', fontSize: '20px', color: '#9CA3AF'
    }).setAlpha(0);
    this.dialogContainer.add(contText);

    var charIndex = 0;
    var typeTimer = this.time.addEvent({
      delay: 40, callback: function () {
        charIndex++;
        bodyText.setText(text.substring(0, charIndex));
        if (text[charIndex - 1] !== ' ') MOT.Audio.playBleep();
        
        // まばたき演出（話し始めのみ一瞬）
        const isHero = speaker && speaker.includes('勇者');
        if (isHero && this.heroImage && this.heroImage.active) {
          if (charIndex === 1 && text[charIndex - 1] !== ' ') {
            if (this.heroImage.texture.key === 'hero_stand') {
              this.heroImage.setTexture('hero_stand_blink');
            }
          } else if (charIndex === 4 || charIndex >= text.length) {
            if (this.heroImage.texture.key === 'hero_stand_blink') {
              this.heroImage.setTexture('hero_stand');
            }
          }
        }

        const isDemon = speaker && speaker.includes('魔王');
        if (isDemon && this.demonImage && this.demonImage.active) {
          const currentTex = this.demonImage.texture.key;
          if (currentTex === 'demon_lord_normal' || currentTex === 'demon_lord_blink' || currentTex === 'demon_lord_silent') {
            if (charIndex < text.length && (charIndex % 15 === 1 || charIndex % 15 === 2)) {
              this.demonImage.setTexture('demon_lord_blink');
            } else {
              this.demonImage.setTexture('demon_lord_normal');
            }
          }
        }

        if (charIndex >= text.length) {
          typeTimer.destroy();
          contText.setAlpha(1);
          this.tweens.add({ targets: contText, alpha: 0.3, yoyo: true, repeat: -1, duration: 500 });

          const advance = () => {
            this.input.off('pointerdown', advance);
            this.input.keyboard.off('keydown', keyHandler);
            if (!keepOpen && this.dialogContainer) {
              this.dialogContainer.destroy();
              this.dialogContainer = null;
            }
            if (onComplete) onComplete();
          };
          const keyHandler = (event) => {
            if (event.key === ' ' || event.code === 'Space') {
              advance();
            }
          };
          this.input.once('pointerdown', advance);
          this.input.keyboard.on('keydown', keyHandler);
        }
      }, callbackScope: this, loop: true
    });
  }

    showChoice(choices) {
    const w = 1920, h = 1080;
    const startY = h / 2 - (choices.length * 45);
    const elements = [];

    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.5);
    overlay.fillRect(0, 0, w, h);
    overlay.setDepth(149);
    elements.push(overlay);

    // [ENTER] KEY ガイドテキストを右下に追加
    const contText = this.add.text(w - 280, h - 60, '▶ [ENTER] KEY', {
      fontFamily: '"Press Start 2P"',
      fontSize: '20px',
      color: '#9CA3AF'
    }).setDepth(151);
    this.tweens.add({ targets: contText, alpha: 0.3, yoyo: true, repeat: -1, duration: 500 });
    elements.push(contText);

    const choicesList = [];
    this.selectedChoiceIndex = 0;
    const self = this;

    choices.forEach(function (choice, i) {
      const y = startY + i * 110;
      const btn = self.add.image(w / 2, y, 'ui_button_wide').setInteractive({ useHandCursor: true }).setDepth(150);
      
      const txt = self.add.text(w / 2, y, choice.text, {
        fontFamily: '"DotGothic16"',
        fontSize: '26px',
        color: '#E5E7EB'
      }).setOrigin(0.5).setDepth(151);

      elements.push(btn, txt);
      choicesList.push({ btn: btn, txt: txt, callback: choice.callback });

      btn.setAlpha(0);
      txt.setAlpha(0);
      self.tweens.add({ targets: [btn, txt], alpha: 1, duration: 300, delay: i * 100 });

      btn.on('pointerover', function () {
        self.selectedChoiceIndex = i;
        self.updateChoiceSelection(choicesList);
      });

      btn.on('pointerdown', function () {
        self.input.keyboard.off('keydown');
        elements.forEach(function (el) { el.destroy(); });
        choice.callback();
      });
    });

    this.updateChoiceSelection = function(list) {
      list.forEach(function (choice, idx) {
        if (idx === self.selectedChoiceIndex) {
          choice.btn.setTint(0x4FD1FF);
          choice.txt.setColor('#ffffff');
          choice.btn.setScale(1.10);
          choice.txt.setScale(1.10);
        } else {
          choice.btn.clearTint();
          choice.txt.setColor('#E5E7EB');
          choice.btn.setScale(1.0);
          choice.txt.setScale(1.0);
        }
      });
    };

    this.updateChoiceSelection(choicesList);

    this.input.keyboard.on('keydown', function (event) {
      if (event.code === 'KeyW' || event.code === 'ArrowUp') {
        self.selectedChoiceIndex = (self.selectedChoiceIndex - 1 + choicesList.length) % choicesList.length;
        self.updateChoiceSelection(choicesList);
      } else if (event.code === 'KeyS' || event.code === 'ArrowDown') {
        self.selectedChoiceIndex = (self.selectedChoiceIndex + 1) % choicesList.length;
        self.updateChoiceSelection(choicesList);
      } else if (event.code === 'Enter') {
        self.input.keyboard.off('keydown');
        elements.forEach(function (el) { el.destroy(); });
        choicesList[self.selectedChoiceIndex].callback();
      }
    });
  }

  showExplosion(x, y) {
    MOT.Audio.playExplosion();
    var exp = this.add.sprite(x, y, 'explosion').setScale(4).setDepth(20);
    this.tweens.add({ targets: exp, scale: 8, alpha: 0, duration: 700, onComplete: function () { exp.destroy(); } });
    for (var i = 0; i < 20; i++) {
      var p = this.add.circle(x, y, Phaser.Math.Between(3, 8), Phaser.Math.Between(0, 1) ? 0xFF8C00 : 0xFF2E2E).setDepth(20);
      this.tweens.add({
        targets: p, x: x + Phaser.Math.Between(-200, 200), y: y + Phaser.Math.Between(-200, 200),
        alpha: 0, scale: 0, duration: Phaser.Math.Between(300, 800), onComplete: function () { p.destroy(); }
      });
    }
  }

  createHUD() {
    this.hpText = this.add.text(30, 20, '', { fontFamily: '"Press Start 2P"', fontSize: '24px', color: '#FF4B6E' }).setDepth(100);
    this.energyText = this.add.text(30, 50, '', { fontFamily: '"Press Start 2P"', fontSize: '18px', color: '#4FD1FF' }).setDepth(100);
    this.energyBar = this.add.graphics().setDepth(100);
    this.barrierIconBg = this.add.graphics().setDepth(100);
    this.barrierIconFg = this.add.graphics().setDepth(100);
    this.bossHPText = this.add.text(960, 20, '', { fontFamily: '"Press Start 2P"', fontSize: '14px', color: '#FF2E2E' }).setOrigin(0.5, 0).setDepth(100);
    this.bossHPBar = this.add.graphics().setDepth(100);

    this.areaNameText = this.add.text(1920 - 30, 20, '', { fontFamily: '"DotGothic16"', fontSize: '32px', color: '#FFFFFF', backgroundColor: 'rgba(0,0,0,0.5)', padding: { x: 10, y: 5 } }).setOrigin(1, 0).setDepth(100);

  }

  updateHUD() {
    let areaText = '';
    if (this.currentBossIndex === 0) areaText = '黄昏の荒野';
    else if (this.currentBossIndex === 1) areaText = '宵闇の森';
    else if (this.currentBossIndex === 2) areaText = '子夜の城塞';
    else if (this.currentBossIndex >= 3) areaText = '魔王城';
    if (this.areaNameText) this.areaNameText.setText(areaText);

    var hearts = '';
    for (var i = 0; i < MOT.flags.playerMaxHP; i++) hearts += i < MOT.flags.playerHP ? '♥ ' : '♡ ';
    this.hpText.setText(hearts);

    var pct = MOT.flags.energy / MOT.flags.maxEnergyThreshold;
    
    // HUD Elements Initialization
    if (!this.energyBarBgObj) {
      this.energyBarBgObj = this.add.rectangle(180, 92, 300, 24, 0x1F2933).setDepth(100).setScrollFactor(0);
      this.energyBarFgObj = this.add.rectangle(32, 82, 296, 20, 0x4FD1FF).setOrigin(0, 0).setDepth(100).setScrollFactor(0);
      this.energyBarOutline = this.add.graphics().setDepth(100).setScrollFactor(0);
      this.energyBarOutline.lineStyle(2, 0x4FD1FF, 0.6);
      this.energyBarOutline.strokeRect(30, 80, 300, 24);
      
      this.iconPersonBg = this.add.image(390, 44, 'icon_person').setOrigin(0, 0).setTint(0x555555).setDepth(100).setScrollFactor(0).setScale(1.5);
      this.iconPersonFill = this.add.image(390, 44, 'icon_person').setOrigin(0, 0).setTint(0xFFFF00).setDepth(100).setScrollFactor(0).setScale(1.5);
      
      this.iconBatteryBg = this.add.image(450, 44, 'icon_battery').setOrigin(0, 0).setTint(0x555555).setDepth(100).setScrollFactor(0).setScale(1.5);
      this.iconBatteryFill = this.add.image(450, 44, 'icon_battery').setOrigin(0, 0).setTint(0xFF0000).setDepth(100).setScrollFactor(0).setScale(1.5);
    }

    // Energy bar update (using scaleX instead of clear/fillRect)
    const barColor = MOT.flags.maxEnergy ? 0xFF4B6E : 0x4FD1FF;
    this.energyBarFgObj.setFillStyle(barColor, 1);
    this.energyBarFgObj.scaleX = Math.max(0.001, pct);

    // 必殺技ゲージのハイライト
    this.energyBarOutline.clear();
    if (this.isEnergyHighlighted) {
      const flash = (Math.sin(Date.now() / 150) + 1) / 2;
      this.energyBarOutline.lineStyle(4, 0xFFFF00, 0.4 + 0.6 * flash);
      this.energyBarOutline.strokeRect(26, 76, 308, 32);
    } else {
      this.energyBarOutline.lineStyle(2, 0x4FD1FF, 0.6);
      this.energyBarOutline.strokeRect(30, 80, 300, 24);
    }

    this.energyText.setText('EN: ' + MOT.flags.energy + '/' + MOT.flags.maxEnergyThreshold);

    // Doll Points update
    const dollValue = MOT.flags.dollPoints || 0;
    const dollPct = Phaser.Math.Clamp(dollValue / 100, 0, 1);
    const pW = this.iconPersonFill.width || 32;
    const pH = this.iconPersonFill.height || 64;
    const dollH = Math.max(0.01, pH * dollPct);
    this.iconPersonFill.setCrop(0, pH - dollH, pW, dollH);

    // Killing Intent update
    const intentValue = MOT.flags.killingIntent || 0;
    const intentPct = Phaser.Math.Clamp(intentValue / 100, 0, 1);
    const bW = this.iconBatteryFill.width || 32;
    const bH = this.iconBatteryFill.height || 64;
    const intentH = Math.max(0.01, bH * intentPct);
    this.iconBatteryFill.setCrop(0, bH - intentH, bW, intentH);

    const iconX = 360;
    const iconY = 92;
    const iconRadius = 18;

    this.barrierIconBg.clear();
    this.barrierIconFg.clear();

    this.barrierIconBg.fillStyle(0x1F2933, 1);
    this.barrierIconBg.fillCircle(iconX, iconY, iconRadius);
    this.barrierIconBg.lineStyle(2, 0x334155, 1);
    this.barrierIconBg.strokeCircle(iconX, iconY, iconRadius);

    if (this.barrierCooldown <= 0) {
      this.barrierIconFg.clear();
      this.barrierIconFg.fillStyle(0x00FFaa, 1);
      this.barrierIconFg.fillCircle(iconX, iconY, iconRadius - 2);
    } else {
      const cdPct = 1 - (this.barrierCooldown / 2000);
      this.barrierIconFg.clear();
      this.barrierIconFg.fillStyle(0x00FFaa, 0.4);
      this.barrierIconFg.beginPath();
      this.barrierIconFg.moveTo(iconX, iconY);
      this.barrierIconFg.arc(iconX, iconY, iconRadius - 2, Phaser.Math.DegToRad(-90), Phaser.Math.DegToRad(-90 + 360 * cdPct), false);
      this.barrierIconFg.closePath();
      this.barrierIconFg.fillPath();
    }

    // Boss HP
    this.bossHPBar.clear();
    let isTwins = this.currentBoss && this.currentBoss.configKey === 'boss3_twins';
    let showBossUI = false;
    if (isTwins) {
      if ((this.currentBoss && this.currentBoss.visible !== false && this.currentBoss.active) ||
          (this.sisterBoss && this.sisterBoss.visible !== false && this.sisterBoss.active)) {
        showBossUI = true;
      }
    } else {
      if (this.currentBoss && this.currentBoss.visible !== false && this.currentBoss.active) {
        showBossUI = true;
      }
    }

    if (showBossUI) {
      var key = this.currentBoss.configKey;
      var cfg = this.getBossConfig(key);
      
      if (key === 'boss3_twins') {
        // 双子はHPバー2本
        this.bossHPText.setText(cfg.name);
        this.bossHPText.setVisible(true);
        var bpct1 = (this.currentBoss && this.currentBoss.active && this.currentBoss.hp > 0) ? this.currentBoss.hp / cfg.hp : 0;
        this.bossHPBar.fillStyle(0x1F2933, 1); this.bossHPBar.fillRect(560, 40, 800, 10);
        if (bpct1 > 0) {
          this.bossHPBar.fillStyle(0x4FD1FF, 1); this.bossHPBar.fillRect(562, 42, 796 * bpct1, 6);
        }
        this.bossHPBar.lineStyle(2, 0x4FD1FF, 0.8); this.bossHPBar.strokeRect(560, 40, 800, 10);
        
        if (!this.sisterHPText) {
          this.sisterHPText = this.add.text(960, 65, '', { fontFamily: '"Press Start 2P"', fontSize: '14px', color: '#FF4B6E' }).setOrigin(0.5, 0).setDepth(100);
        }
        this.sisterHPText.setText(cfg.name2);
        this.sisterHPText.setVisible(true);
        var bpct2 = (this.sisterBoss && this.sisterBoss.active && this.sisterBoss.hp > 0) ? this.sisterBoss.hp / cfg.hp2 : 0;
        this.bossHPBar.fillStyle(0x1F2933, 1); this.bossHPBar.fillRect(560, 80, 800, 10);
        if (bpct2 > 0) {
          this.bossHPBar.fillStyle(0xFF4B6E, 1); this.bossHPBar.fillRect(562, 82, 796 * bpct2, 6);
        }
        this.bossHPBar.lineStyle(2, 0xFF4B6E, 0.8); this.bossHPBar.strokeRect(560, 80, 800, 10);
      } else {
        if (this.sisterHPText) this.sisterHPText.setVisible(false);
        this.bossHPText.setText(cfg.name);
        var bpct = this.bossHP / this.bossMaxHP;
        this.bossHPBar.fillStyle(0x1F2933, 1); this.bossHPBar.fillRect(560, 50, 800, 20);
        this.bossHPBar.fillStyle(0xFF2E2E, 1); this.bossHPBar.fillRect(562, 52, 796 * bpct, 16);
        this.bossHPBar.lineStyle(1, 0xFF2E2E, 0.6); this.bossHPBar.strokeRect(560, 50, 800, 20);
      }
    } else {
      this.bossHPText.setText('');
      if (this.sisterHPText) this.sisterHPText.setVisible(false);
    }
  }
}

window.BossScene = BossScene;


