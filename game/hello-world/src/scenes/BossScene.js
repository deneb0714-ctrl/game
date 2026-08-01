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

    // デバッグ用: 博士戦(4)へ直接飛ぶ場合、キューにdoctorを追加
    if (this.currentBossIndex === 4 && this.bossQueue.indexOf('doctor') === -1) {
      this.bossQueue.push('doctor');
    }

    if (isSkipping || (data && data.jumpToEndingSetup)) {
      if (!MOT.flags) MOT.flags = {};
      MOT.flags.playerMaxHP = MOT.flags.playerMaxHP || 5;
      if (!data || !data.normalTransition) {
        MOT.flags.playerHP = MOT.flags.playerMaxHP;
        MOT.flags.energy = 0;
      }
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
    this.events.on('shutdown', () => {
      if (this.boss1Bgm) this.boss1Bgm.stop();
      if (this.boss2Bgm) this.boss2Bgm.stop();
      if (this.twinsBgm) this.twinsBgm.stop();
    });
  }

  create() {
    this.sound.stopAll();
    this.events.on('shutdown', () => {
      if (this.twinsBgm) this.twinsBgm.stop();
    });
    const w = 1920, h = 1080;
    var bgKey = 'bg_boss_stage2';
    if (this.currentBossIndex === 1) bgKey = 'bg_boss_stage3';
    else if (this.currentBossIndex === 2) bgKey = 'bg_boss_stage4';
    else if (this.currentBossIndex === 3) bgKey = 'bg_boss_stage5';
    if (this.currentBossIndex === 0 && this.textures.exists('bg_boss1_static') && this.textures.get('bg_boss1_static').key !== '__MISSING') {
      this.bg = this.add.image(w / 2, h / 2, 'bg_boss1_static').setOrigin(0.5, 0.5);
      let scale = Math.max(1920 / this.bg.width, 1080 / this.bg.height);
      this.bg.setScale(scale);
    } else {
      this.bg = this.add.image(0, 0, bgKey).setOrigin(0, 0);
      this.bg.setScale(4);
    }

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
    MOT.createVirtualGamepad(this, this.player);

    this.barrierHitbox = this.physics.add.sprite(-100, 460, null).setVisible(false);
    this.barrierHitbox.body.setCircle(60);
    this.physics.add.overlap(this.barrierHitbox, this.enemyBullets, (hitbox, bullet) => {
      if (this.barrierActive) {
        this.onPlayerHit(this.player, bullet);
      }
    });

    this.physics.add.overlap(this.player, this.enemyBullets, this.onPlayerHit, null, this);
    this.inunekoGroup = this.physics.add.group();
    this.physics.add.overlap(this.playerBullets, this.inunekoGroup, this.onBossHit, null, this);
    this.physics.add.overlap(this.playerBullets, this.enemyGroup, this.onBossHit, null, this);
    this.physics.add.overlap(this.player, this.enemyGroup, this.onPlayerHit, null, this);
    this.physics.add.overlap(this.player, this.itemGroup, MOT.collectItem.bind(null, this), null, this);

    this.createHUD();
    this.cameras.main.fadeIn(800, 5, 8, 20);

    // Start first boss or intermission when resuming from continue
    if (!(this.startData && this.startData.jumpToEndingSetup)) {
      if (this.startData && this.startData.fromContinue && this.currentBossIndex > 0 && this.bossQueue[this.currentBossIndex] !== 'doctor') {
        this.time.delayedCall(1000, function () { this.startIntermission(); }, [], this);
      } else {
        this.time.delayedCall(1000, function () { this.startBoss(); }, [], this);
      }
    }


  }

  getBossConfig(key) {
    var configs = {
      boss1: {
        texture: 'boss1_combat', name: 'クラトス', hp: 80, scale: 2.0,
        intro: '「貴様が博士の人形か。\nこの俺の拳で叩き潰してやる！」',
        defeat: '「馬鹿な…この俺が…！」',
        choices: [
          { text: '止めを刺す', flag: function () { MOT.modifyFlag('brutality', 1); MOT.modifyFlag('obeyDoctor', 1); } },
          { text: '見逃す', flag: function () { MOT.modifyFlag('showMercy', 1); MOT.modifyFlag('favor.boss1', 1); } }
        ]
      },
      boss2: {
        texture: 'boss2_battle_anim', name: 'トゥレロス', hp: 120, scale: 0.3,
        intro: '「ヒャハハ！ 踊れ踊れぇ！！\n俺の双銃から逃げられるかなぁ！？」',
        defeat: '「アハハハハ…最高にイカれた気分だぜ…」',
        choices: [
          { text: '止めを刺す', flag: function () { MOT.modifyFlag('brutality', 1); MOT.modifyFlag('favor.boss2', -1); } },
          { text: '見逃す', flag: function () { MOT.modifyFlag('showMercy', 1); MOT.modifyFlag('favor.boss2', 1); } }
        ]
      },
      boss3_twins: {
        texture: 'boss3_battle_anim', name: 'エディオ', hp: 150, scale: 0.25,
        texture2: 'sister_shoot1', name2: 'エナリア', hp2: 150, scale2: 1.2,
        // Intro and defeat are handled custom via playTwinsIntro and post-battle logic
      },
      demon_lord: {
        texture: 'demon_stand_combat', name: '魔王 – ヴェリタス', hp: 300, scale: 0.5,
        intro: '「…来たか、博士の人形よ。\nお前に真実を伝えなければならない。」',
        defeat: '「聞いてくれ。博士こそが…この世界を壊そうとしている。\n俺は…それを止めたかっただけだ。」',
        choices: []
      },
      doctor: {
        texture: 'doctor_combat', name: '博士', hp: 450, scale: 2.5,
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
    this.cutsceneActive = false;

    // Spawn boss (hidden initially)
    var bossSpawnY = 460;
    var boss = this.physics.add.sprite(1920, bossSpawnY, cfg.texture);
    if (key === 'boss1') boss.play('boss1_idle');
    if (key === 'demon_lord') boss.play('demon_combat_anim');
    if (key === 'boss2') boss.play('boss2_battle_play');
    if (key === 'boss3_twins') boss.play('boss3_battle_play');
    boss.setScale(cfg.scale);
    boss.setDepth(8);
    this.enemyGroup.add(boss);
    this.currentBoss = boss;
    boss.hp = cfg.hp;
    boss.configKey = key;
    boss.setVisible(false);
    boss.body.enable = false;

    if (key === 'boss3_twins') {
      if (!this.anims.exists('sister_shoot_anim')) {
        this.anims.create({
          key: 'sister_shoot_anim',
          frames: [
            { key: 'sister_shoot1', duration: 1500 },
            { key: 'sister_shoot1_blink', duration: 150 },
            { key: 'sister_shoot1', duration: 1500 },
            { key: 'sister_shoot1_blink', duration: 150 },
            { key: 'sister_shoot2', duration: 1500 },
            { key: 'sister_shoot2_blink', duration: 150 },
            { key: 'sister_shoot2', duration: 1500 },
            { key: 'sister_shoot2_blink', duration: 150 }
          ],
          repeat: -1
        });
      }
      if (!this.anims.exists('sister_revive_anim')) {
        this.anims.create({
          key: 'sister_revive_anim',
          frames: [
            { key: 'sister_revive1' },
            { key: 'sister_revive2' }
          ],
          frameRate: 6,
          repeat: -1
        });
      }
      var sister = this.physics.add.sprite(1920, 700, cfg.texture2);
      sister.setScale(cfg.scale2);
      sister.play('sister_shoot_anim');
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
    if (key === 'boss1') areaText = ''; // Removed redundant dialogue
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
    this.cutsceneActive = true;
    if (key !== 'demon_lord' && key !== 'doctor') {
      this.cutsceneActive = false;
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
               this.cutsceneActive = false;
                this.dialogActive = false;
               this.physics.resume();
               this.startBossLaneMovement();
               this.boss4Bgm = this.sound.add('demon_lord_bgm', { loop: true, volume: 0.2 });
               this.boss4Bgm.play();
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
              this.doctorImage = this.add.image(w - 300, h / 2, 'doctor_awaken_smile_weapon').setAlpha(0).setDepth(90);
             var docScale = 600 / this.doctorImage.width;
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
         if (key === 'boss1') {
           this.minionsToKill = 1;
           this.time.delayedCall(100, () => {
             var dummy = this.enemyGroup.create(-1000, -1000, 'enemy_basic');
             dummy.isScenarioMinion = true;
             this.onBossHit({ active: true, damage: 9999, silent: true, destroy: () => {} }, dummy);
           });
         } else {
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
    var maleLabel = this.add.text(w - 300, h / 2 - 160, 'エディオ', { fontFamily: '"DotGothic16"', fontSize: '40px', color: '#ffffff' }).setOrigin(0.5).setAlpha(0).setDepth(90);
    
    // Female Frame (Sister)
    var femaleFrame = this.add.rectangle(w - 300, h / 2 + 160, 300, 300, 0x1F2933).setAlpha(0).setDepth(90).setStrokeStyle(4, 0xFF4B6E);
    var femaleLabel = this.add.text(w - 300, h / 2 + 160, 'エナリア', { fontFamily: '"DotGothic16"', fontSize: '40px', color: '#ffffff' }).setOrigin(0.5).setAlpha(0).setDepth(90);

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
      maleLabel.setText('？？？');
      femaleLabel.setText('？？？');

      await sayTwin('？？？', '「…来たか」');
      await sayTwin('？？？', '「来たわね。兄様」');
      
      await sayDevice('「…？！お前たちは…」');
      await sayHero('「？」');
      await sayDevice('「こいつらに名前なんてない。さっさと倒せ。」');
      
      await sayTwin('？？？', '「やめてよ。魔王様に付けてもらった素敵な名前があるんだ。僕がエディオで、」');
      
      maleLabel.setText('エディオ');
      femaleLabel.setText('エナリア');
      
      await sayTwin('エナリア', '「私がエナリア。魔王様が、捨てられてた私たちを拾ってくれたの。」');
      
      await sayTwin('エディオ', '「君は博士に騙されている。悪いことは言わないからこちらの味方になった方がいいよ。」');
      await sayTwin('エナリア', '「どうするの？勇者さん。」');
      
      let choice = await new Promise(res => {
        this.showChoice([
          { text: '1. 話を聞く（ボスを倒さない）', callback: () => { MOT.Audio.playSelect(); res(1); } },
          { text: '2. 話を聞かない（ボスを倒す）', callback: () => { MOT.Audio.playSelect(); res(2); } }
        ]);
      });
      
      if (choice === 1) {
        await sayTwin('エディオ', '「そうか、わかってくれて嬉しいよ。魔王様の所へ行くといい。ここを通すよ。」');
        // ボス戦スキップ処理
        this.tweens.add({
          targets: [dimBg, this.heroImage, maleFrame, maleLabel, femaleFrame, femaleLabel], alpha: 0, duration: 500,
          onComplete: () => {
            dimBg.destroy(); this.heroImage.destroy(); maleFrame.destroy(); maleLabel.destroy(); femaleFrame.destroy(); femaleLabel.destroy();
            MOT.modifyFlag('favor.boss3', 1);
            MOT.modifyFlag('showMercy', 1);
            if (this.currentBoss) {
              this.currentBoss.skipped = true;
              this.onBossHit({ active: true, damage: 9999, silent: true, destroy: function(){} }, this.currentBoss);
            }
          }
        });
      } else {
        await sayTwin('エナリア', '「そう、なら力ずくで止めるまでよ！」');
        await sayTwin('エディオ', '「覚悟しなよ！」');
        this.tweens.add({
          targets: [dimBg, this.heroImage, maleFrame, maleLabel, femaleFrame, femaleLabel], alpha: 0, duration: 500,
          onComplete: () => {
            dimBg.destroy(); this.heroImage.destroy(); maleFrame.destroy(); maleLabel.destroy(); femaleFrame.destroy(); femaleLabel.destroy();
            onComplete();
          }
        });
      }
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
        // 攻撃しないようにコメントアウト
        // const angleDeg = Phaser.Math.RadToDeg(Phaser.Math.Angle.Between(this.inunekoEnemy.x, this.inunekoEnemy.y, this.player.x, this.player.y));
        // MOT.fireFan(this, this.inunekoEnemy.x, this.inunekoEnemy.y, 3, 250, angleDeg, 40);
      }
    });

    // 補助魔法（8〜15秒ごとにランダムで弾幕加速 or バリア）
    const supportAction = () => {
      if (this.bossDefeated || this.dialogActive || this.cutsceneActive || !this.inunekoEnemy || !this.inunekoEnemy.visible) {
        if (!this.bossDefeated) {
          this.time.delayedCall(Phaser.Math.Between(8000, 15000), supportAction);
        }
        return;
      }
      const action = Phaser.Math.Between(0, 1);
      if (action === 0) {
        this.inunekoSpeedBoost();
      } else {
        this.inunekoBarrier(boss);
      }
      this.time.delayedCall(Phaser.Math.Between(8000, 15000), supportAction);
    };
    this.time.delayedCall(Phaser.Math.Between(8000, 15000), supportAction);
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
    // レーザー全体でのカスタム当たり判定
    if (this.player && this.player.active && this.player.alpha > 0 && !this.player.isInvincible) {
      if (this.enemyBullets) {
        this.enemyBullets.getChildren().forEach(b => {
          if (b.active && b.texture.key === 'bullet_laser') {
            let px = this.player.body.center.x;
            let py = this.player.body.center.y;
            let pr = Math.max(this.player.body.width, this.player.body.height) / 2;
            
            let dx = px - b.x;
            let dy = py - b.y;
            let lx = Math.cos(b.rotation);
            let ly = Math.sin(b.rotation);
            
            let t = dx * lx + dy * ly;
            if (t >= 0 && t <= 400) {
              let projX = b.x + t * lx;
              let projY = b.y + t * ly;
              let distSq = (px - projX) * (px - projX) + (py - projY) * (py - projY);
              if (distSq <= (pr + 6) * (pr + 6)) {
                this.onPlayerHit(this.player, b);
              }
            }
          }
        });
      }
    }

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
      let isDialogOrChoice = this.dialogActive || this.choiceActive || (this.choiceContainer && this.choiceContainer.active);
      MOT.DoctorDirective.update(this, delta, this.player, isDialogOrChoice);
    }

    let isDialog = this.dialogActive || this.choiceActive || (this.choiceContainer && this.choiceContainer.active);
    
    // 会話が終わった瞬間（dialogActive が true から false に変わった時）に、バリアのクールタイムを最大（0%からチャージ）にする
    if (!isDialog && this.lastDialogActive) {
      // 2秒（2000ms）のフルクールタイムをセットし、戦闘開始直後のバリアを完全に防ぐ
      this.barrierCooldown = 2000;
    }
    this.lastDialogActive = isDialog;

    if (isDialog) {
      return;
    }
    
    if (this.cutsceneActive) {
      MOT.handleMovement(this, this.player);
      
      // バリアの更新（移動時に追従させるため）
      if (this.barrierCooldown > 0) {
        this.barrierCooldown -= delta;
        if (this.barrierCooldown < 0) this.barrierCooldown = 0;
      }
      if (this.barrierActive) {
        this.barrierTime += delta;
        if (this.barrierVisual) {
          this.barrierVisual.setPosition(this.player.x, this.player.y);
          this.barrierHitbox.setPosition(this.player.x, this.player.y);
        }
        if (this.barrierTime >= 3000) {
          this.deactivateBarrier();
        }
      }
      return;
    }

    // 軽量なレーザー当たり判定
    if (this.activeLasers) {
      for (let laser of this.activeLasers) {
        if (!laser.active) continue;
        let px = this.player.x;
        let py = this.player.y;
        let l2 = (laser.x2 - laser.x1)**2 + (laser.y2 - laser.y1)**2;
        if (l2 === 0) continue;
        let t = ((px - laser.x1) * (laser.x2 - laser.x1) + (py - laser.y1) * (laser.y2 - laser.y1)) / l2;
        t = Math.max(0, Math.min(1, t));
        let projX = laser.x1 + t * (laser.x2 - laser.x1);
        let projY = laser.y1 + t * (laser.y2 - laser.y1);
        let dist = Math.sqrt((px - projX)**2 + (py - projY)**2);
        if (dist < laser.thickness / 2) {
          this.onPlayerHit(this.player, { destroy: () => {} });
        }
      }
      this.activeLasers = this.activeLasers.filter(l => l.active);
    }

    MOT.handleMovement(this, this.player);

    // 博士戦の味方支援システム
    if (this.currentBoss && this.currentBoss.configKey === 'doctor' && !this.dialogActive) {
      if (!this.assistTimer) this.assistTimer = 0;
      this.assistTimer += delta;
      if (this.assistTimer >= 8000 + Phaser.Math.Between(0, 4000)) { // 8-12 seconds
        this.assistTimer = 0;
        this.triggerAllyAssist();
      }
    }

    // Auto-shoot
    let canShoot = this.currentBoss && this.currentBoss.active && this.currentBoss.visible && this.bossHP > 0;
    if (canShoot) {
      this.autoShootTimer += delta;
      let shootInterval = this.heroAttackSpeedBoost ? 80 : 200;
      if (this.autoShootTimer >= shootInterval) {
        this.autoShootTimer = 0;
        var b = this.playerBullets.create(this.player.x + 30, this.player.y, 'bullet_player');
        if (b) {
          b.setVelocityX(this.heroFirepowerBoost ? 1000 : 600); 
          b.setScale(this.heroFirepowerBoost ? 4 : 2);
          if (this.heroFirepowerBoost) {
            b.setTint(0xffaa00);
            b.damage = 2;
          }
          MOT.Audio.playShot();
          this.time.delayedCall(4000, function () { if (b.active) b.destroy(); });
        }
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
        this.barrierHitbox.setPosition(this.player.x, this.player.y);
      }
      if (this.barrierTime >= 3000) {
        this.deactivateBarrier();
      }
    }

    // Boss attacks
    if (this.currentBoss && this.currentBoss.active && this.currentBoss.visible) {
      this.bossAttackTimer += delta;
      var interval = this.bossHP < this.bossMaxHP * 0.5 ? 600 : 1000;
      if (this.currentBoss.configKey === 'boss1') interval = 3000; // ボス1の攻撃頻度を下げる
      if (this.inunekoBoostActive) interval = Math.floor(interval * 0.5); // 犬猫スター弾幕加速
      if (this.currentBoss.configKey === 'boss3_twins') interval = 1200; // 兄の攻撃頻度を上げる
      if (this.currentBoss.configKey === 'doctor') interval = this.bossHP < this.bossMaxHP * 0.5 ? 1400 : 1800; // 博士の攻撃頻度を上げる
      if (this.currentBoss.configKey === 'demon_lord') interval = this.bossHP < this.bossMaxHP * 0.5 ? 2500 : 3000; // 魔王の螺旋弾幕（2.4秒）と重ならないように大幅緩和
      
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
        MOT.fireCircle(this, this.sisterBoss.x, this.sisterBoss.y, 8, 200, 0x7CFF00, 'bullet_star');
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

    let now = this.time.now;
    this.enemyBullets.getChildren().forEach(function (b) {
      if (b.updateBehavior) b.updateBehavior(now, delta);
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
      if (this.currentBoss.attackSide === undefined) this.currentBoss.attackSide = 'right';
      
      let animKey = this.currentBoss.attackSide === 'right' ? 'boss1_attack_right' : 'boss1_attack_left';
      this.currentBoss.play(animKey);
      this.currentBoss.once('animationcomplete', () => {
         if (this.currentBoss && this.currentBoss.active) {
            this.currentBoss.play('boss1_idle');
         }
      });
      
      this.attackSlash(x, y, this.currentBoss.attackSide);
      
      this.currentBoss.attackSide = this.currentBoss.attackSide === 'right' ? 'left' : 'right';
      return;
    }

    // boss2（戦闘狂）は双銃攻撃
    if (this.currentBoss.configKey === 'boss2') {
      this.attackDualGuns(x, y);
      return;
    }
    
    // boss3_twins（兄）の攻撃パターン
    if (this.currentBoss.configKey === 'boss3_twins') {
      if (this.isLaneBeamActive) return; // 薙ぎ払いビーム中は通常弾幕を出さない
      
      let pattern = Phaser.Math.Between(0, 2);
      if (pattern === 0 || pattern === 1) {
        // 高速の斜め追尾レーザー（速度を1400に上げてレーザー感を強調）
        MOT.fireHoming(this, x, y, 1000, this.player, 0x4FD1FF, 'bullet_laser');
      } else {
        // レーン丸ごと攻撃（5秒警告後）
        this.fireLaneBeam();
      }
      return;
    }

    // doctor（博士）の攻撃パターン
    if (this.currentBoss.configKey === 'doctor') {
      let silver = 0xE0E0E0; // 白よりのシルバー
      let docPattern = Phaser.Math.Between(0, 6); // パターンを7種類に増加
      
      if (docPattern !== 6) {
        if (this.currentBoss && this.currentBoss.active && this.currentBoss.texture.key !== 'doctor_combat') {
          this.currentBoss.setTexture('doctor_combat');
        }
      }
      
      if (docPattern === 0) {
        // 幹部1の斬撃（シルバー化）
        var laneYs = [220, 460, 700];
        let ty = laneYs[Phaser.Math.Between(0, 2)];
        var slash = this.enemyBullets.create(x, ty, 'slash_attack');
        if (slash) {
          slash.setVelocityX(-400); slash.setScale(2); slash.setDepth(9); slash.setTintFill(silver);
          this.time.delayedCall(5000, () => { if (slash.active) slash.destroy(); });
        }
      } else if (docPattern === 1) {
        // 幹部2の銃弾（シルバー化）
        var laneYs = [220, 460, 700];
        let ty = laneYs[Phaser.Math.Between(0, 2)];
        MOT.fireLinear(this, x, ty, -800, 0, silver, 'bullet_enemy_white');
        this.time.delayedCall(200, () => MOT.fireLinear(this, x, ty, -800, 0, silver, 'bullet_enemy_white'));
      } else if (docPattern === 2) {
        // 兄のレーザー（シルバー化）
        MOT.fireHoming(this, x, y, 1000, this.player, silver, 'bullet_laser');
        this.time.delayedCall(300, () => MOT.fireHoming(this, x, y, 1400, this.player, silver, 'bullet_laser'));
      } else if (docPattern === 3) {
        // 魔王の分裂球（シルバー化）
        let ball = MOT.fireLinear(this, x, y, -400, 0, silver, 'bullet_enemy_white');
        if (ball) {
          ball.setScale(3);
          let self = this;
          ball.updateBehavior = function(now, delta) {
            if (this.x < 1100 && !this.hasSplit) {
              this.hasSplit = true;
              let bx = this.x, by = this.y;
              this.destroy(); MOT.Audio.playShot();
              let targetAngle = Phaser.Math.Angle.Between(bx, by, self.player.x, self.player.y);
              for (let i = 0; i < 3; i++) {
                let angle = targetAngle - 0.4 + 0.4 * i;
                let b = MOT.fireLinear(self, bx, by, Math.cos(angle)*400, Math.sin(angle)*400, silver, 'bullet_enemy_white');
                if(b) b.setScale(1.5);
              }
            }
          };
        }
      } else if (docPattern === 4) {
        // 魔王の螺旋弾幕（シルバー化）
        let spiralCount = 20; 
        let baseAngle = Phaser.Math.FloatBetween(0, Math.PI * 2);
        let direction = Phaser.Math.Between(0, 1) === 0 ? 1 : -1;
        for (let i = 0; i < spiralCount; i++) {
          this.time.delayedCall(i * 80, () => {
             if (!this.currentBoss || !this.currentBoss.active) return;
             let angle = baseAngle + i * 0.3 * direction;
             let b = MOT.fireLinear(this, this.currentBoss.x, this.currentBoss.y, Math.cos(angle)*400, Math.sin(angle)*400, silver, 'bullet_enemy_white');
             if (b) b.setScale(1.2);
          });
        }
      } else if (docPattern === 5) {
        // 妹のダイヤ弾幕（シルバー化）
        let ty = Phaser.Math.Between(100, 980);
        let bx = this.currentBoss ? this.currentBoss.x : 1600;
        MOT.fireCircle(this, bx, ty, 10, 260, silver, 'bullet_diamond');
        this.time.delayedCall(300, () => MOT.fireCircle(this, bx, ty, 10, 320, silver, 'bullet_diamond'));
      } else {
        // 新技：斜め極太ブラスター（顔なし）
        let numBlasters = Phaser.Math.Between(4, 6); // 4〜6体に増加
        
        if (this.currentBoss && this.currentBoss.active) {
          this.currentBoss.setTexture('doctor_combat_beam');
          this.time.delayedCall(2500, () => {
            if (this.currentBoss && this.currentBoss.active && this.currentBoss.configKey === 'doctor' && this.currentBoss.texture.key === 'doctor_combat_beam') {
              this.currentBoss.setTexture('doctor_combat');
            }
          });
        }
        
        for (let i = 0; i < numBlasters; i++) {
          this.time.delayedCall(i * 300, () => {
            if (!this.currentBoss || !this.currentBoss.active) return;
            
            // 出現位置を画面の右・上・下のいずれかの端にランダム配置
            let edge = Phaser.Math.Between(0, 2);
            let spawnX, spawnY;
            if (edge === 0) { // 右端
              spawnX = Phaser.Math.Between(1550, 1700);
              spawnY = Phaser.Math.Between(100, 980);
            } else if (edge === 1) { // 上端（右寄り）
              spawnX = Phaser.Math.Between(1000, 1700);
              spawnY = Phaser.Math.Between(100, 200);
            } else { // 下端（右寄り）
              spawnX = Phaser.Math.Between(1000, 1700);
              spawnY = Phaser.Math.Between(880, 980);
            }
            
            // プレイヤーを狙う角度
            let targetAngle = Phaser.Math.Angle.Between(spawnX, spawnY, this.player.x, this.player.y);
            
            // 発射前の警告線（ビジュアルのみ）
            let beamLength = 2500;
            let warnRect = this.add.rectangle(spawnX, spawnY, beamLength, 150, 0xff0000, 0.4).setDepth(8);
            warnRect.setOrigin(0, 0.5);
            warnRect.setRotation(targetAngle);
            
            // 顔が拡大していた時間(400ms)だけ待機したのち警告をフェードアウトして発射
            this.tweens.add({
              targets: warnRect, alpha: 0, duration: 600, delay: 400, onComplete: () => {
                if (warnRect) warnRect.destroy();
                if (!this.currentBoss || !this.currentBoss.active) return;
                
                // 極太レーザー発射 (ビジュアル)
                MOT.Audio.playShot();
                let beamThickness = 150;
                let beam = this.add.rectangle(spawnX, spawnY, beamLength, beamThickness, silver, 1).setDepth(9);
                beam.setOrigin(0, 0.5);
                beam.setRotation(targetAngle);
                
                // 軽量な線分当たり判定用データを登録
                if (!this.activeLasers) this.activeLasers = [];
                let laserData = {
                  x1: spawnX,
                  y1: spawnY,
                  x2: spawnX + Math.cos(targetAngle) * beamLength,
                  y2: spawnY + Math.sin(targetAngle) * beamLength,
                  thickness: beamThickness,
                  active: true
                };
                this.activeLasers.push(laserData);
                
                this.tweens.add({
                  targets: beam, alpha: 0, duration: 500, onComplete: () => {
                    beam.destroy();
                    laserData.active = false;
                  }
                });
              }
            });
          });
        }
      }
      return;
    }

    // demon_lord（魔王）の攻撃パターン
    if (this.currentBoss.configKey === 'demon_lord') {
      if (this.currentBoss.demonPatternIdx === undefined) {
        this.currentBoss.demonPatternIdx = 0;
      } else {
        this.currentBoss.demonPatternIdx = (this.currentBoss.demonPatternIdx + 1) % 2;
      }
      let pattern = this.currentBoss.demonPatternIdx;
      
      if (pattern === 0) {
        // パターンA: 分裂する紫色の球
        let ball = MOT.fireLinear(this, x, y, -400, 0, 0xd000ff, 'bullet_enemy_white');
        if (ball) {
          ball.setScale(3);
          let self = this;
          let splitType = Phaser.Math.Between(0, 2); 
          
          ball.updateBehavior = function(now, delta) {
            // 勇者と魔王の中間付近 (x < 1100) で分裂
            if (this.x < 1100 && !this.hasSplit) {
              this.hasSplit = true;
              let bx = this.x;
              let by = this.y;
              this.destroy();
              
              MOT.Audio.playShot();
              
              let targetAngle = Phaser.Math.Angle.Between(bx, by, self.player.x, self.player.y);
              let spread = 0.4;
              
              for (let i = 0; i < 3; i++) {
                let angle = targetAngle - spread + spread * i;
                let b = MOT.fireLinear(self, bx, by, Math.cos(angle)*400, Math.sin(angle)*400, 0xff00ff, 'bullet_enemy_white');
                if (b) {
                  b.setScale(1.5);
                  b.spawnTime = now;
                  b.baseAngle = angle;
                  
                  if (splitType === 1) {
                    // 蛇行（ウェーブ）軌道
                    b.updateBehavior = function(t, d) {
                      let elapsed = t - this.spawnTime;
                      let currentAngle = this.baseAngle + Math.sin(elapsed * 0.01) * 0.6;
                      this.setVelocity(Math.cos(currentAngle)*400, Math.sin(currentAngle)*400);
                    };
                  } else if (splitType === 2) {
                    // 透明化
                    b.updateBehavior = function(t, d) {
                      let elapsed = t - this.spawnTime;
                      if (elapsed > 300) {
                        this.alpha = Math.max(0.1, Math.abs(Math.cos(elapsed * 0.008)));
                      }
                    };
                  }
                }
              }
            }
          };
        }
      } else {
        // パターンB: 螺旋弾幕
        let spiralCount = 30;
        let delayPerShot = 80;
        let baseAngle = Phaser.Math.FloatBetween(0, Math.PI * 2);
        let direction = Phaser.Math.Between(0, 1) === 0 ? 1 : -1;
        
        for (let i = 0; i < spiralCount; i++) {
          this.time.delayedCall(i * delayPerShot, () => {
             if (!this.currentBoss || !this.currentBoss.active) return;
             let angle = baseAngle + i * 0.3 * direction;
             let b = MOT.fireLinear(this, this.currentBoss.x, this.currentBoss.y, Math.cos(angle)*350, Math.sin(angle)*350, 0xaa00ff, 'bullet_enemy_white');
             if (b) b.setScale(1.2);
             if (i % 3 === 0) MOT.Audio.playShot();
          });
        }
      }
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
  attackSlash(bx, by, side) {
    var originY = by;
    // 右振りは上から、左振りは下から
    if (side === 'right') {
      originY -= 150; // ボスの頭上
    } else {
      originY += 150; // ボスの足元
    }

    // 進行方向（左）を中心に、上下に少し角度を付けた3WAY
    // Phaserでは0が右、180が左
    var angles = [180 - 15, 180, 180 + 15]; 
    angles.forEach(angle => {
      this.fire3WaySlash(bx, originY, angle);
    });
  }

  fire3WaySlash(fromX, fromY, angleDeg) {
    var slash = this.enemyBullets.create(fromX, fromY, 'boss1_wind_slash');
    if (!slash) return;
    slash.damage = 2; // ボス1の斬撃ダメージ
    
    // 風圧っぽさを出すための調整
    slash.setScale(1.5); // サイズは少し大きくする程度
    slash.setDepth(9);
    
    // 角度に合わせて回転させる
    slash.setAngle(angleDeg);
    
    // 速度設定
    var speed = 350;
    var rad = Phaser.Math.DegToRad(angleDeg);
    slash.setVelocity(Math.cos(rad) * speed, Math.sin(rad) * speed);

    // 7秒後に自動破棄
    this.time.delayedCall(7000, function () { if (slash.active) slash.destroy(); });
  }

  // 5秒間の警告のあと、レーン全体を薙ぎ払う極太レーザー
  fireLaneBeam() {
    if (this.dialogActive) return;
    this.isLaneBeamActive = true;
    
    const laneYs = [220, 460, 700];
    const targetY = laneYs[Phaser.Math.Between(0, 2)];
    
    // 警告演出 (赤い半透明の帯を点滅させる)
    let warningRect = this.add.rectangle(1920 / 2, targetY, 1920, 100, 0xff0000, 0.2).setDepth(8);
    this.tweens.add({
      targets: warningRect,
      alpha: 0.5,
      duration: 250,
      yoyo: true,
      repeat: 19 // 計5秒 (20回 * 250ms = 5000ms)
    });
    
    // 5秒後に極太レーザー発射
    this.time.delayedCall(5000, () => {
      if (warningRect) warningRect.destroy();
      
      // レーザー実体
      let beam = this.add.rectangle(1920 / 2, targetY, 1920, 100, 0x4FD1FF, 1).setDepth(9);
      this.physics.add.existing(beam);
      beam.body.setAllowGravity(false);
      beam.body.setImmovable(true);
      
      // プレイヤーとの衝突判定
      let collider = this.physics.add.overlap(this.player, beam, (p, b) => {
        this.onPlayerHit(p, { destroy: () => {} });
      });
      
      // レーザー消滅
      this.tweens.add({
        targets: beam,
        alpha: 0,
        duration: 800,
        onComplete: () => {
          collider.destroy();
          beam.destroy();
          this.isLaneBeamActive = false;
        }
      });
    });
  }

  // 単一斬撃弾を発射する
  fireSlash(fromX, fromY) {
    var slash = this.enemyBullets.create(fromX, fromY, 'slash_attack');
    if (!slash) return;
    slash.damage = 2; // ボス1の斬撃ダメージを2にする
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
    var b = this.enemyBullets.create(fromX, fromY, 'boss2_bullet');
    if (b) {
      b.setVelocityX(-800); // 高速の弾丸（難易度アップ）
      b.setScale(1.2);
      b.setAngle(180); // 画像が右向き想定なので、180度回転で左向き（先端が左）になる
      b.setBlendMode(Phaser.BlendModes.ADD); // 光るエフェクト
      b.setDepth(9);
      this.time.delayedCall(4000, function () { if (b.active) b.destroy(); });
    }
  }

  onPlayerHit(player, obj) {
    if (this.playerInvincible || this.dialogActive) return;

    if (this.barrierActive) {
      const isJustGuard = (this.time.now - this.barrierActivatedTime) <= 150; // シビアな判定 (150ms)

      if (obj.isScenarioMinion) {
        this.onBossHit({ active: true, damage: 9999, silent: false, destroy: function(){} }, obj);
      } else {
        obj.destroy();
      }
      this.deactivateBarrier();
      
      // 同時にヒットした別の弾の判定を無視するための短い無敵時間を付与
      this.playerInvincible = true;
      this.time.delayedCall(150, () => {
          this.playerInvincible = false;
      });

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

        // バリア反射時の音階と色変化（回数を重ねるごとに変化）
        if (this.barrierGuardCount === undefined) this.barrierGuardCount = 0;
        
        const freqs = [
          493.88, // 0: Si (B4)
          523.25, // 1: Do (C5)
          587.33, // 2: Re (D5)
          659.25, // 3: Mi (E5)
          698.46, // 4: Fa (F5) - 赤になる
          783.99, // 5: So (G5)
          880.00, // 6: La (A5)
          987.77, // 7: Si (B5)
          1046.50, // 8: Do (C6)
          1174.66, // 9: Re (D6)
          1318.51, // 10: Mi (E6)
          1396.91, // 11: Fa (F6)
          1567.98  // 12: So (G6) - 2回目のソで黄色に戻る
        ];
        
        let idx = this.barrierGuardCount;
        if (idx >= freqs.length) idx = freqs.length - 1;
        
        let isRed = (idx >= 4 && idx < 12);
        let color = isRed ? 0xff0000 : 0xffff00;
        
        if (window.MOT && MOT.Audio && MOT.Audio.playMusicalNote) {
            MOT.Audio.playMusicalNote(freqs[idx]);
        }
        
        // 以前通りの単発反射弾
        const reflectBullet = this.playerBullets.create(player.x + 30, player.y, 'bullet_player');
        if (reflectBullet) {
          reflectBullet.setVelocityX(1200);
          reflectBullet.setScale(3);
          reflectBullet.setTint(color); 
          reflectBullet.damage = 5; 
          this.time.delayedCall(2000, function () {
            if (reflectBullet.active) reflectBullet.destroy();
          });
        }
        
        this.barrierGuardCount++;
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

    if (obj.isScenarioMinion) {
      this.onBossHit({ active: true, damage: 9999, silent: false, destroy: function(){} }, obj);
    } else {
      obj.destroy();
    }
    let dmg = obj.damage || 1;
    MOT.flags.playerHP -= dmg;
    this.cameras.main.shake(150, 0.008);
    this.playerInvincible = true;
    player.setTint(0xFF4B6E);
    this.tweens.add({
      targets: player, alpha: 0.3, yoyo: true, repeat: 3, duration: 100,
      onComplete: function () { player.setAlpha(1); player.clearTint(); this.playerInvincible = false; }.bind(this)
    });
    if (MOT.flags.playerHP <= 0) {
      if (this.currentBoss && this.currentBoss.configKey === 'doctor' && Phaser.Math.Between(0, 100) < 50) {
        // 兄が確率で助けてくれる
        MOT.flags.playerHP = 1;
        this.playerInvincible = true;
        this.time.delayedCall(3000, () => { this.playerInvincible = false; });
        
        MOT.Audio.playBleep();
        let w = 1920, h = 1080;
        if (this.assistDialog) {
          this.assistDialog.destroy();
          this.assistText.destroy();
          if (this.assistImage) this.assistImage.destroy();
        }
        this.assistDialog = this.add.rectangle(w / 2, h - 80, 1200, 120, 0x0a0a14).setStrokeStyle(4, 0x4FD1FF).setDepth(200);
        this.assistText = this.add.text(w / 2 - 400, h - 110, 'エディオ「勝手に死なれると妹が悲しむからな…立て！」\n【効果：HP1で復活】', { fontFamily: '"DotGothic16"', fontSize: '28px', color: '#fff', wordWrap: { width: 900 } }).setOrigin(0, 0).setDepth(201);
        this.assistImage = this.add.sprite(w / 2 - 500, h - 80, 'boss3_battle_anim').setScale(0.25).setDepth(201);
        this.assistImage.play('boss3_battle_play');
        
        this.time.delayedCall(3000, () => {
          if (this.assistDialog) {
            this.tweens.add({ targets: [this.assistDialog, this.assistText, this.assistImage], alpha: 0, duration: 500, onComplete: () => {
              if (this.assistDialog) this.assistDialog.destroy();
              if (this.assistText) this.assistText.destroy();
              if (this.assistImage) this.assistImage.destroy();
              this.assistDialog = null;
            }});
          }
        });
        return; // 死亡処理をスキップして続行
      }
      
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

            var bossImage = null;
            if (this.currentBoss && (this.currentBoss.configKey === 'boss1' || this.currentBoss.configKey === 'boss2' || this.currentBoss.configKey === 'boss3_twins')) {
              var defaultTex = 'boss1_normal';
              if (this.currentBoss.configKey === 'boss2') defaultTex = 'boss2_normal';
              if (this.currentBoss.configKey === 'boss3_twins') defaultTex = 'brother_normal';
              bossImage = this.add.image(w - 300, h / 2, defaultTex).setAlpha(0).setDepth(90);
              var bScale = 750 / bossImage.width;
              if (this.textures.exists(defaultTex)) {
                var tmpTex = this.textures.get(defaultTex).getSourceImage();
                if (tmpTex && tmpTex.width > 0) bScale = 750 / tmpTex.width;
              }
              bossImage.setScale(bScale);
              bossImage.setY(100 + (bossImage.height * bScale) / 2);
              
              if (this.currentBoss.configKey === 'boss3_twins') {
                this.time.addEvent({
                  delay: 3500, loop: true, callback: () => {
                    if (bossImage && bossImage.active && bossImage.alpha > 0) {
                      let k = bossImage.texture.key;
                      let blinkTo = null;
                      if (k === 'brother_normal') blinkTo = 'brother_closed';
                      if (blinkTo) {
                        bossImage.setTexture(blinkTo);
                        this.time.delayedCall(150, () => {
                          if (bossImage && bossImage.active && bossImage.texture.key === blinkTo) {
                            bossImage.setTexture(k);
                          }
                        });
                      }
                    }
                  }
                });
              }

              enemyFrame.setVisible(false);
              enemyLabel.setVisible(false);
            }

            // Add sisterImage for boss3_twins scenario intro
            var sisterImage = null;
            if (this.currentBoss && this.currentBoss.configKey === 'boss3_twins') {
              sisterImage = this.add.image(w - 450, h / 2, 'sister_normal').setAlpha(0).setDepth(90);
              var sScale = 750 / 600; 
              if (this.textures.exists('sister_normal')) {
                var tex = this.textures.get('sister_normal').getSourceImage();
                if (tex && tex.width > 0) sScale = 750 / tex.width;
              }
              sisterImage.setScale(sScale);
              sisterImage.setY(100 + (sisterImage.height * sScale) / 2);
              bossImage.setX(w - 200); // 兄を右へ
              
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
              [dimBg, bossImage, sisterImage, this.heroImage].filter(Boolean).forEach(t => t.setVisible(true));
              if (!bossImage) { if (enemyFrame) enemyFrame.setVisible(true); if (enemyLabel) enemyLabel.setVisible(true); }
              else { if (enemyFrame) enemyFrame.setVisible(false); if (enemyLabel) enemyLabel.setVisible(false); }
              this.tweens.add({ targets: dimBg, alpha: 0.6, duration: 300 });
              this.tweens.add({targets: this.heroImage, alpha: 0.4, duration: 300});
              if (bossImage) this.tweens.add({ targets: bossImage, alpha: 0.4, duration: 300 });
              else this.tweens.add({ targets: [enemyFrame, enemyLabel], alpha: 0, duration: 300 });
              if(sisterImage) this.tweens.add({ targets: sisterImage, alpha: 0.4, duration: 300 });
              this.showDeviceDialogue(text, res);
            });
            const sayEnemyUnknown = (text, tex = null, speaker = '男') => new Promise(res => {
              [dimBg, bossImage, sisterImage, this.heroImage].filter(Boolean).forEach(t => t.setVisible(true));
              if (!bossImage) { if (enemyFrame) enemyFrame.setVisible(true); if (enemyLabel) enemyLabel.setVisible(true); }
              else { if (enemyFrame) enemyFrame.setVisible(false); if (enemyLabel) enemyLabel.setVisible(false); }
              lastEnemySpeaker = speaker;
              let useTex = tex;
              if (useTex === null) {
                 useTex = 'boss1_normal';
                 if (this.currentBoss && this.currentBoss.configKey === 'boss2') useTex = 'boss2_normal';
                 if (this.currentBoss && this.currentBoss.configKey === 'boss3_twins') useTex = 'brother_normal';
              }
              this.tweens.add({ targets: dimBg, alpha: 0.6, duration: 300 });
              if (lastEnemySpeaker === '女' && sisterImage) {
                if (bossImage) { this.tweens.add({ targets: bossImage, alpha: 0.4, duration: 300 }); bossImage.setDepth(90); }
                this.tweens.add({ targets: sisterImage, alpha: 1, duration: 300 });
                sisterImage.setDepth(91);
              } else {
                if (bossImage) {
                  this.tweens.add({ targets: bossImage, alpha: 1, duration: 300 });
                  bossImage.setTexture(useTex);
                  bossImage.setDepth(91);
                } else {
                  this.tweens.add({ targets: [enemyFrame, enemyLabel], alpha: 1, duration: 300 });
                  enemyLabel.setText('???');
                }
                if(sisterImage) { this.tweens.add({targets: sisterImage, alpha: 0.4, duration: 300}); sisterImage.setDepth(90); }
              }
              if (bossImage) bossImage.setTint(0x000000);
              if (sisterImage) sisterImage.setTint(0x000000);
              this.tweens.add({targets: this.heroImage, alpha: 0.4, duration: 300});
              this.showDialogue('???', text, res);
            });
            const sayEnemyName = (name, text, tex = null, speakerGender = null) => new Promise(res => {
              [dimBg, bossImage, sisterImage, this.heroImage].filter(Boolean).forEach(t => t.setVisible(true));
              if (!bossImage) { if (enemyFrame) enemyFrame.setVisible(true); if (enemyLabel) enemyLabel.setVisible(true); }
              else { if (enemyFrame) enemyFrame.setVisible(false); if (enemyLabel) enemyLabel.setVisible(false); }
              if (speakerGender === '女' || speakerGender === '男') lastEnemySpeaker = speakerGender;
              else if (name === '女' || name === '男') lastEnemySpeaker = name;
              let useTex = tex;
              if (useTex === null) {
                 useTex = 'boss1_normal';
                 if (this.currentBoss && this.currentBoss.configKey === 'boss2') useTex = 'boss2_normal';
                 if (this.currentBoss && this.currentBoss.configKey === 'boss3_twins') useTex = 'brother_normal';
              }
              this.tweens.add({ targets: dimBg, alpha: 0.6, duration: 300 });
              this.tweens.add({targets: this.heroImage, alpha: 0.4, duration: 300});
              if (lastEnemySpeaker === '女' && sisterImage) {
                if (bossImage) { this.tweens.add({ targets: bossImage, alpha: 0.4, duration: 300 }); bossImage.setDepth(90); }
                else this.tweens.add({ targets: [enemyFrame, enemyLabel], alpha: 0, duration: 300 });
                this.tweens.add({ targets: sisterImage, alpha: 1, duration: 300 });
                sisterImage.setDepth(91);
              } else {
                if (bossImage) {
                  this.tweens.add({ targets: bossImage, alpha: 1, duration: 300 });
                  bossImage.setTexture(useTex);
                  bossImage.setDepth(91);
                } else {
                  this.tweens.add({ targets: [enemyFrame, enemyLabel], alpha: 1, duration: 300 });
                  enemyLabel.setText(name);
                }
                if(sisterImage) { this.tweens.add({ targets: sisterImage, alpha: 0.4, duration: 300 }); sisterImage.setDepth(90); }
              }
              if (bossImage) bossImage.clearTint();
              if (sisterImage) sisterImage.clearTint();
              this.showDialogue(name, text, res);
            });
            const sayInuneko = (text, tex = 'inuneko_stand') => new Promise(res => {
      [dimBg, bossImage, sisterImage, this.heroImage, this.demonImage, this.inunekoImage].filter(Boolean).forEach(t => t.setVisible(true));
      if (!bossImage) { if (enemyFrame) enemyFrame.setVisible(true); if (enemyLabel) enemyLabel.setVisible(true); }
      else { if (enemyFrame) enemyFrame.setVisible(false); if (enemyLabel) enemyLabel.setVisible(false); }
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
      [dimBg, bossImage, sisterImage, this.heroImage].filter(Boolean).forEach(t => t.setVisible(true));
      if (!bossImage) { if (enemyFrame) enemyFrame.setVisible(true); if (enemyLabel) enemyLabel.setVisible(true); }
      else { if (enemyFrame) enemyFrame.setVisible(false); if (enemyLabel) enemyLabel.setVisible(false); }
      this.tweens.add({ targets: dimBg, alpha: 0.6, duration: 300 });
      this.tweens.add({targets: this.heroImage, alpha: 1, duration: 300});
      if (bossImage) this.tweens.add({ targets: bossImage, alpha: 0.4, duration: 300 });
      else this.tweens.add({ targets: [enemyFrame, enemyLabel], alpha: 0, duration: 300 });
      if(sisterImage) this.tweens.add({ targets: sisterImage, alpha: 0.4, duration: 300 });
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
                await sayDevice('「まずい。魔王軍のやつらに気付かれた。だが、”勇者”の君なら倒せるだろう。」');
                await sayDevice('「奴の名前はクラトス。ここに来たのが他の幹部じゃなくてまだ良かったか……。」');
                
                [dimBg, enemyFrame, enemyLabel, bossImage, sisterImage, this.heroImage].filter(Boolean).forEach(t => t.setVisible(false));
                // Show boss
                this.currentBoss.setVisible(true); this.currentBoss.body.enable = true;
                this.cameras.main.shake(400, 0.015);
                await new Promise(r => this.tweens.add({ targets: this.currentBoss, x: 1400, duration: 1200, ease: 'Power2', onComplete: r }));
                this.tweens.add({ targets: this.currentBoss, y: this.currentBoss.y - 30, yoyo: true, repeat: -1, duration: 1000, ease: 'Sine.easeInOut' });
                
                await sayEnemyName('クラトス', '「なんだ？帰らないのか？」', 'boss1_normal');
                await sayEnemyName('クラトス', '「……というかお前、”勇者”なのか？勇者の割には弱そうなやつだな。」', 'boss1_normal');
                await sayHero('「……『弱そう』って初対面なはずなのに失礼だな。」');
                await sayEnemyName('クラトス', '「おっと、悪い悪い。でも、俺だって無駄に傷付けたいわけじゃないからな。それに、任務も楽に達成できそうでラッキーなこった！」', 'boss1_sweat');
                await sayHero('「任務？」');
                await sayEnemyName('クラトス', '「ああ、魔王様から”勇者”を連れてこいって命じられてんだ。お前も戦う気満々って感じだしやるしかないよな！！」', 'boss1_normal');
                await sayDevice('「クラトスは見かけ通りに己の力のみで戦うことを良しとする。銃を持ってはいるが、あれを本来の使い方で使うことはない。あれで打撃を飛ばしてくるから、気を付けろよ。」');
                await sayHero('「つまり、脳ｋ……」');
                await sayEnemyName('クラトス', '「何ぼそぼそ言ってんだ！！！戦うぞ！」', 'boss1_angry');

                
              } else if (key === 'boss2') {
                await sayEnemyUnknown('「あは、お客さんだ！」', 'boss2_normal');
                await sayDevice('「やはり来たか。奴はトゥレロス。魔王のみに従う犬だ。」');
                await sayDevice('「若くして魔王軍に入ったが、魔王の言うことしか聞かず、己の楽しさだけを求める狂人だ。奴は2丁の拳銃を使って戦う。片方だけに気を取られるなよ」');
                
                [dimBg, enemyFrame, enemyLabel, bossImage, sisterImage, this.heroImage].filter(Boolean).forEach(t => t.setVisible(false));
                this.currentBoss.setVisible(true); this.currentBoss.body.enable = true;
                this.cameras.main.shake(400, 0.015);
                await new Promise(r => this.tweens.add({ targets: this.currentBoss, x: 1400, duration: 1200, ease: 'Power2', onComplete: r }));
                this.tweens.add({ targets: this.currentBoss, y: this.currentBoss.y - 30, yoyo: true, repeat: -1, duration: 1000, ease: 'Sine.easeInOut' });
                
                await sayEnemyName('トゥレロス', '「クラトスは負けたみたいだね。あいつ力はあるくせに馬鹿だから負けるんだよ。まぁいいや。さっさと君を倒して魔王様のところに帰ろう。」', 'boss2_normal');
                await sayHero('「（……やっぱり脳筋だったのか）」');
                await sayHero('「倒すんじゃなくて、連れて帰るんじゃないのか？」');
                await sayEnemyName('トゥレロス', '「うん？そういえばそうだった！でもなんで君が知ってるの？」', 'boss2_normal');
                await sayEnemyName('トゥレロス', '「わかった。あの馬鹿が言いやがったな……。」', 'boss2_normal');
                await sayHero('「でも、僕も負けるつもりはないよ。」');
                await sayEnemyName('トゥレロス', '「いいね！！楽しくなりそうで嬉しいよ！」', 'boss2_normal');
                
              } else if (key === 'boss3_twins') {
                await sayEnemyUnknown('「…来たか」', 'brother_normal', '男');
                await sayEnemyUnknown('「来たわね。兄様」', 'sister_normal', '女');
                await sayDevice('「…!?お前たちは…」');
                await sayHero('「？」');
                
                [dimBg, enemyFrame, enemyLabel, bossImage, sisterImage, this.heroImage].filter(Boolean).forEach(t => t.setVisible(false));
                this.currentBoss.setVisible(true); this.currentBoss.body.enable = true;
                this.sisterBoss.setVisible(true); this.sisterBoss.body.enable = true;
                this.cameras.main.shake(400, 0.015);
                await new Promise(r => this.tweens.add({ targets: [this.currentBoss, this.sisterBoss], x: 1400, duration: 1200, ease: 'Power2', onComplete: r }));
                this.tweens.add({ targets: this.currentBoss, y: this.currentBoss.y - 30, yoyo: true, repeat: -1, duration: 1000, ease: 'Sine.easeInOut' });
                this.tweens.add({ targets: this.sisterBoss, y: this.sisterBoss.y + 30, yoyo: true, repeat: -1, duration: 1100, ease: 'Sine.easeInOut' });
                
                await sayDevice('「こいつらに名前なんてない。さっさと倒せ。」');
                await sayEnemyName('エディオ', '「やめてよ。魔王様に付けてもらった素敵な名前があるんだ。僕がエディオで、」', 'brother_normal', '男');
                await sayEnemyName('エナリア', '「私がエナリア。魔王様が、捨てられてた私たちを拾ってくれたの。」', 'sister_normal', '女');
                await sayEnemyName('エディオ', '「君は博士に騙されている。悪いことは言わないからこちらの味方になった方がいい」', 'brother_normal', '男');
                await sayDevice('「彼らの言葉に耳を傾けてはいけない。早く倒すんだ。」');
                await sayHero('「…」');
                await sayEnemyName('エナリア', '「…そう。意思は硬いのね。仕方ないわ兄様」', 'sister_normal', '女');
                await sayEnemyName('エディオ', '「君を彼女の元にはいかせない。ここで食い止めるよ」', 'brother_normal', '男');
              }
              
              this.tweens.add({
                targets: [dimBg, enemyFrame, enemyLabel, bossImage, this.heroImage].filter(Boolean), alpha: 0, duration: 500,
                onComplete: () => { dimBg.destroy(); enemyFrame.destroy(); enemyLabel.destroy(); if(bossImage) bossImage.destroy(); if(this.heroImage) this.heroImage.destroy(); if(sisterImage) sisterImage.destroy(); }
              });
              if(sisterImage) this.tweens.add({ targets: sisterImage, alpha: 0, duration: 500 });
              this.dialogActive = false;
              this.physics.resume();
              this.startBossLaneMovement();
              if (this.sisterBoss && this.sisterBoss.active) {
                 this.sisterBoss.play('sister_shoot_anim');
              }
              if (key === 'boss1') {
                this.boss1Bgm = this.sound.add('boss1_bgm', { loop: true, volume: 0.2 });
                this.boss1Bgm.play();
              }
              if (key === 'boss2') {
                this.boss2Bgm = this.sound.add('boss2_bgm', { loop: true, volume: 0.2 });
                this.boss2Bgm.play();
              }
              if (key === 'boss3_twins') {
                this.startSisterLaneMovement();
                this.twinsBgm = this.sound.add('twins_bgm', { loop: true, volume: 0.2 });
                this.twinsBgm.play();
              }
              if (key === 'demon_lord') {
                this.boss4Bgm = this.sound.add('demon_lord_bgm', { loop: true, volume: 0.2 });
                this.boss4Bgm.play();
              }
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


    if (this.currentBoss.configKey === 'boss3_twins') {
      boss.hp -= dmg;
      boss.setTint(0xffffff);
      this.time.delayedCall(50, function () { if (boss.active) boss.clearTint(); });
      
      if (Phaser.Math.Between(0, 100) < 50) {
        MOT.spawnEnergyItem(this, boss.x, boss.y);
      }
      
      if (boss.hp <= 0 && boss.active) {
        boss.active = false;
        boss.setVisible(false);
        boss.body.enable = false;
        this.showExplosion(boss.x, boss.y);
        
        // --- 復活処理（6秒） ---
        let otherBoss = (boss === this.currentBoss) ? this.sisterBoss : this.currentBoss;
        if (otherBoss && otherBoss.active) {
          let isBrotherDefeated = (boss === this.currentBoss);
          
          if (this.twinReviveTimer) this.twinReviveTimer.destroy();
          if (this.twinReviveAnimTimer) this.twinReviveAnimTimer.destroy();
          this.cameras.main.shake(500, 0.01);
          
          let totalReviveTime = 6000;
          let animDuration = 2500;
          let delayBeforeAnim = totalReviveTime - animDuration;

          if (isBrotherDefeated && this.sisterBoss) {
              // 蘇生直前の数秒間のみ蘇生アニメーションを再生
              this.twinReviveAnimTimer = this.time.delayedCall(delayBeforeAnim, () => {
                  if (this.sisterBoss && this.sisterBoss.active) {
                      this.sisterBoss.play('sister_revive_anim');
                  }
              });
          }
          
          this.twinReviveTimer = this.time.delayedCall(totalReviveTime, () => {
             boss.active = true;
             boss.setVisible(true);
             boss.body.enable = true;
             boss.hp = 1; // 復活時のHP
             this.showExplosion(boss.x, boss.y); 
             
             if (isBrotherDefeated && this.sisterBoss && this.sisterBoss.active) {
                 this.sisterBoss.play('sister_shoot_anim');
             }
             
             let speakerText = isBrotherDefeated ? 'エナリア「兄さん！起きて！」' : 'エディオ「しっかりしろ！」';
             let speakerColor = isBrotherDefeated ? '#FF4B6E' : '#4FD1FF';
             let floatText = this.add.text(otherBoss.x, otherBoss.y - 80, speakerText, { fontFamily: '"DotGothic16"', fontSize: '28px', color: speakerColor }).setOrigin(0.5).setDepth(200);
             this.tweens.add({ targets: floatText, y: floatText.y - 40, alpha: 0, duration: 2500, ease: 'Power1', onComplete: () => floatText.destroy() });
          });
        }
      }
      
      if (this.currentBoss.hp <= 0 && this.sisterBoss && this.sisterBoss.hp <= 0 && !this.bossDefeated) {
        if (this.twinReviveTimer) this.twinReviveTimer.destroy();
        if (this.twinReviveAnimTimer) this.twinReviveAnimTimer.destroy();
        this.bossDefeated = true;
        this.onTwinsDefeated();
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
      this.cutsceneActive = true;
      if (this.boss1Bgm) this.boss1Bgm.stop();
      if (this.boss2Bgm) this.boss2Bgm.stop();
      if (this.boss4Bgm) this.boss4Bgm.stop();
      
      if (this.bossLaneTimer) {
        this.bossLaneTimer.destroy();
      }
      this.enemyBullets.clear(true, true);

      // Disable boss to prevent further hits/attacks
      boss.body.enable = false;

      var key = boss.configKey;
      var cfg = this.getBossConfig(key);
      this.cameras.main.shake(1000, 0.02);
      
      // 連続爆発エフェクト
      this.time.addEvent({
        delay: 200,
        repeat: 11,
        callback: () => {
          if (this.showExplosion) this.showExplosion(boss.x + Phaser.Math.Between(-100, 100), boss.y + Phaser.Math.Between(-100, 100));
          if (window.MOT && MOT.Audio) MOT.Audio.playExplosion();
        }
      });

      // Boss defeat flash (Give time to collect items)
      this.tweens.add({
        targets: boss, alpha: 0.3, yoyo: true, repeat: 8, duration: 150,
        onComplete: () => {
          this.dialogActive = true;
          this.physics.pause();
          this.player.setVelocity(0, 0);

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
              this.showDialogue('クラトス', text, res);
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
                MOT.Audio.playSelect(); // 銃声SE
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
            var boss2DefImg = this.add.image(w - 300, h / 2, 'boss2_surprised_dying').setAlpha(0).setDepth(90);
            var b2dW = boss2DefImg.width || 576;
            var b2dH = boss2DefImg.height || 1024;
            var b2dScale = 750 / b2dW;
            if (this.textures.exists('boss2_surprised_dying')) {
              var t2 = this.textures.get('boss2_surprised_dying').getSourceImage();
              if (t2 && t2.width > 0) b2dScale = 750 / t2.width;
            }
            boss2DefImg.setScale(b2dScale);
            boss2DefImg.setY(100 + (b2dH * b2dScale) / 2);

            const sayEnemyB2 = (text, tex = 'boss2_normal_dying') => new Promise(res => {
              this.tweens.add({ targets: dimBg, alpha: 0.6, duration: 300 });
              this.tweens.add({ targets: boss2DefImg, alpha: 1, duration: 300 });
              this.tweens.add({ targets: this.heroImage, alpha: 0.4, duration: 300 });
              boss2DefImg.setTexture(tex);
              this.showDialogue('トゥレロス', text, res);
            });
            const sayHeroB2 = (text) => new Promise(res => {
              this.tweens.add({ targets: dimBg, alpha: 0.6, duration: 300 });
              this.tweens.add({ targets: this.heroImage, alpha: 1, duration: 300 });
              this.tweens.add({ targets: boss2DefImg, alpha: 0.4, duration: 300 });
              if (text === '「……」' || text === '「……。」' || text === '「…」') {
                this.heroImage.setTexture('hero_stand_silent');
              } else {
                this.heroImage.setTexture('hero_stand');
              }
              this.heroImage.setScale(750 / this.heroImage.width);
              this.heroImage.setY(100 + (this.heroImage.height * this.heroImage.scaleY) / 2);
              this.showDialogue('勇者', text, res);
            });
            const sayDeviceB2 = (text) => new Promise(res => {
              this.tweens.add({ targets: dimBg, alpha: 0.6, duration: 300 });
              this.tweens.add({ targets: this.heroImage, alpha: 0.4, duration: 300 });
              this.tweens.add({ targets: boss2DefImg, alpha: 0.4, duration: 300 });
              this.showDeviceDialogue(text, res);
            });

            (async () => {
              // 立ち絵フェードイン
              this.tweens.add({ targets: dimBg, alpha: 0.6, duration: 400 });
              this.tweens.add({ targets: this.heroImage, alpha: 0.4, duration: 400 });
              this.tweens.add({ targets: boss2DefImg, alpha: 1, duration: 400 });
              await new Promise(r => this.time.delayedCall(500, r));

              if (MOT.flags.killedBoss1) {
                await sayDeviceB2('「先ほどと同じように、止めを刺すんだ。こいつを倒せば幹部は残り半分になる。」');
              } else {
                await sayDeviceB2('「今回はわかっているな？世界のために、逃がさないで止めを刺せ。」');
              }
              let c = await askChoice('1. 心臓を打ち抜く', '2. 見逃す');
              if (c === 1) { MOT.flags.dollPoints++; MOT.flags.killedTwins = true; MOT.flags.killedBoss2 = true;
                if (MOT.flags.killedBoss1) {
                  await sayEnemyB2('「はは…！あいつと同じで負けるのはむかつくけど、戦いは楽しかったしまあいいかな」', 'boss2_normal_dying');
                  MOT.Audio.playSelect(); // 銃声SE
                  await sayDeviceB2('「よくやった。また一歩平和に近づいたな。幹部は残り二人だ。気を抜かずそのまま進んでいくといい」');
                } else {
                  await sayEnemyB2('「はは…！負けたのはむかつくけど、戦いは楽しかったしまあいいかな」', 'boss2_normal_dying');
                  MOT.Audio.playSelect(); // 銃声SE
                  await sayDeviceB2('「それでいい。そのまま進んで残りの幹部も魔王も倒すんだ」');
                }
                boss2DefImg.destroy();
                this.proceedToNextArea(boss, false);
              } else {
                MOT.flags.killedBoss2 = false;
                if (MOT.flags.killedBoss1) {
                  await sayEnemyB2('「なんで殺さない？」', 'boss2_angry_dying');
                  await sayEnemyB2('「あの脳筋野郎にしたように僕も殺せばいい。それとも、僕には殺す価値すらもないって言いたいの？」', 'boss2_angry_dying');
                  await sayEnemyB2('「ま、事実負けちゃったからどうこう言う資格なんてないんだけど……ね。」', 'boss2_eyes_closed_dying');
                  
                  await new Promise(r => this.tweens.add({ targets: boss, x: 2200, duration: 1500, ease: 'Power2', onComplete: r }));
                  boss2DefImg.destroy();
                  await sayDeviceB2('「おい、何をしている？なぜ止めを刺さなかった。」');
                } else {
                  await sayEnemyB2('「はは、君はやっぱり殺さないんだ。舐めてるの？」', 'boss2_normal_dying');
                  await sayEnemyB2('「とはいえ、僕も今は限界だから引こうかな。次は負けないから！」', 'boss2_eyes_closed_dying');
                  
                  await new Promise(r => this.tweens.add({ targets: boss, x: 2200, duration: 1500, ease: 'Power2', onComplete: r }));
                  boss2DefImg.destroy();
                  await sayDeviceB2('「またか。お前は何がしたい？この世界を終わらせたいのか？」');
                  await sayDeviceB2('「それとも、役立たずとして処分でもされたいのか？」');
                  await sayHeroB2('「……。」');
                }
                this.proceedToNextArea(boss, true);
              }
            })();
          } else if (key === 'boss3_twins') {
            if (boss.skipped) {
              this.proceedToNextArea(boss, true);
            } else {
              this.onTwinsDefeated();
            }
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

    const sayHero = (text) => new Promise(res => { this.tweens.add({ targets: dimBg, alpha: 0.6, duration: 300 }); this.tweens.add({targets: this.heroImage, alpha: 1, duration: 300}); this.tweens.add({ targets: this.demonImage, alpha: 0.4, duration: 300 }); if(this.inunekoImage) this.tweens.add({ targets: this.inunekoImage, alpha: 0.4, duration: 300 }); if (text === '「……」' || text === '「……。」' || text === '「…」') { this.heroImage.setTexture('hero_stand_silent'); } else if (text === '「……それでも僕は、殺したくない……！！」') { this.heroImage.setTexture('hero_cry'); } else { this.heroImage.setTexture('hero_stand'); } this.heroImage.setScale(750 / this.heroImage.width); this.heroImage.setY(100 + (this.heroImage.height * this.heroImage.scaleY) / 2); this.showDialogue('勇者', text, res); });
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
              
              var redBarrier = null;

              const drawCrack = (startX, startY, scale) => {
                // メインの枝を生成する再帰関数
                const generateBranch = (x, y, angle, depth, length, thickness) => {
                  if (depth === 0) return;
                  
                  // 赤と白を交えた鋭い線
                  let color = Math.random() > 0.7 ? 0xffffff : 0xff0000;
                  crackGraphics.lineStyle(thickness, color, Math.random() * 0.5 + 0.5);
                  crackGraphics.beginPath();
                  crackGraphics.moveTo(x, y);
                  
                  let endX = x + Math.cos(angle) * length;
                  let endY = y + Math.sin(angle) * length;
                  endX += Phaser.Math.Between(-10, 10);
                  endY += Phaser.Math.Between(-10, 10);
                  
                  crackGraphics.lineTo(endX, endY);
                  crackGraphics.strokePath();
                  
                  let numBranches = Phaser.Math.Between(1, 3);
                  for (let i = 0; i < numBranches; i++) {
                    let newAngle = angle + Phaser.Math.FloatBetween(-0.5, 0.5);
                    generateBranch(endX, endY, newAngle, depth - 1, length * 0.7, Math.max(1, thickness - 1));
                  }
                };

                // 放射状のひび割れを生成
                let numMainBranches = Phaser.Math.Between(2, 4);
                for (let i = 0; i < numMainBranches; i++) {
                   let angle = (i / numMainBranches) * Math.PI * 2 + Phaser.Math.FloatBetween(-0.3, 0.3);
                   generateBranch(startX, startY, angle, Phaser.Math.Between(2, 4), Phaser.Math.Between(20, 50) * scale, 3);
                }
              };

              const shatterOption1 = () => {
                // box1とtxt1を隠す
                box1.setVisible(false);
                txt1.setVisible(false);
                
                // 大量の破片パーティクルを生成
                for (let i = 0; i < 40; i++) {
                  let color = Math.random() > 0.5 ? 0x4FD1FF : 0xffffff;
                  let shard = this.add.rectangle(w/2 + Phaser.Math.Between(-250, 250), y1 + Phaser.Math.Between(-40, 40), Phaser.Math.Between(5, 30), Phaser.Math.Between(5, 30), color);
                  this.choiceContainer.add(shard);
                  this.tweens.add({
                    targets: shard,
                    x: shard.x + Phaser.Math.Between(-500, 500),
                    y: shard.y + Phaser.Math.Between(-200, 800),
                    rotation: Phaser.Math.Between(-15, 15),
                    alpha: 0,
                    duration: 1500 + Phaser.Math.Between(0, 1000),
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
                      
                      // 赤いバリアオーバーレイを生成
                      redBarrier = this.add.rectangle(w/2, h/2, w, h, 0xff0000, 0.1).setBlendMode(Phaser.BlendModes.ADD);
                      this.choiceContainer.addAt(redBarrier, 1); // 背景のすぐ上に追加
                      
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
                      if (redBarrier) redBarrier.setAlpha(0.1 + (downPresses / 20) * 0.6); // どんどん赤く強く発光する
                      
                      // 揺れの処理（1回目から20回目まで、単一の数式で徐々に大きくする）
                      if (downPresses < 20) {
                        // 1〜19回目まで、累乗を使って最初はほぼ0、後半急激に大きくなるようにする
                        let ratio = downPresses / 20; // 0.05 〜 0.95
                        let shakeIntensity = Math.pow(ratio, 3) * 0.015; // 0.015が最大の揺れ幅
                        let shakeDuration = 50 + (downPresses * 5); // 55ms 〜 145ms
                        
                        this.cameras.main.shake(shakeDuration, shakeIntensity);
                      }
                      
                      // 10回目以降からヒビが入り、徐々に広がる
                      if (downPresses >= 10 && downPresses < 20) {
                        let scale = (downPresses - 9) * 0.5; // 0.5, 1.0, 1.5...
                        drawCrack(w/2, y2 - 40, scale);
                        if (MOT.Audio.playBleep) MOT.Audio.playBleep();
                      }
                      
                      if (downPresses >= 20) {
                        isAnimating = true;
                        shattered = true;
                        // ブレイクスルー演出
                        this.cameras.main.shake(800, 0.05);
                        if (MOT.Audio.playShatter) MOT.Audio.playShatter();
                        else MOT.Audio.playExplosion();
                        
                        shatterOption1(); // 殺す選択肢を粉砕
                        crackGraphics.clear(); // ヒビ割れクリア
                        
                        // バリア破壊演出
                        if (redBarrier) {
                          this.tweens.add({
                            targets: redBarrier,
                            alpha: 0,
                            scale: 1.5,
                            duration: 500,
                            onComplete: () => { redBarrier.destroy(); }
                          });
                        }
                        
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
                        this.cameras.main.shake(150, 0.015);
                        if (MOT.Audio.playCrack) MOT.Audio.playCrack();
                        drawCrack(w/2 + Phaser.Math.Between(-300, 300), y1 + 50 + Phaser.Math.Between(-150, 150));
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
              let forceSpare = (Kills === 0 && Satsui >= 20 && DP < 20);
              let c;
              if (forceSpare) {
                  // 主人公の立ち絵を覚醒差分に変更
                  if (this.heroImage) {
                      this.heroImage.setTexture('hero_stand');
                      this.heroImage.setScale(750 / 1080);
                      this.heroImage.setY(100 + (1920 * (750 / 1080)) / 2);
                  } else {
                      this.heroImage = this.add.image(300, 1080 / 2, 'hero_stand').setAlpha(0).setDepth(90);
                      this.heroImage.setScale(750 / 1080);
                      this.heroImage.setY(100 + (1920 * (750 / 1080)) / 2);
                  }
                  
                  await sayDevice('「よくやった。早く止めを刺すんだ。そして、見逃した幹部も殺しに行け。」');
                  await sayHero('「…」');
                  c = await new Promise(resolve => {
                      if (this.choiceContainer) this.choiceContainer.destroy();
                      this.choiceContainer = this.add.container(0, 0).setDepth(200);
                      var w = 1920, h = 1080;
                      var bg = this.add.rectangle(w/2, h/2, w, h, 0x000000, 0.4).setInteractive();
                      this.choiceContainer.add(bg);
                      var y1 = h/2 - 20, y2 = h/2 + 80;
                      
                      var box1 = this.add.rectangle(w/2, y1, 500, 80, 0x333333, 0.8).setStrokeStyle(2, 0x555555);
                      var txt1 = this.add.text(w/2, y1, '1. 心臓を打ち抜く', { fontFamily: '"DotGothic16"', fontSize: '32px', color: '#777777' }).setOrigin(0.5);
                      var box2 = this.add.rectangle(w/2, y2, 500, 80, 0x1F2933, 0.8).setStrokeStyle(2, 0x4FD1FF);
                      var txt2 = this.add.text(w/2, y2, '2. 見逃す', { fontFamily: '"DotGothic16"', fontSize: '32px', color: '#ffffff' }).setOrigin(0.5);
                      
                      var cursor = this.add.text(w/2 - 280, y2, '▶', { fontFamily: '"DotGothic16"', fontSize: '32px', color: '#39FF14' }).setOrigin(0.5);
                      this.choiceContainer.add([box1, txt1, box2, txt2, cursor]);
                      
                      var currentIndex = 2;
                      const kh = (e) => {
                          if (e.key === 'ArrowUp' || e.key === 'w') {
                              if (MOT.Audio.playBleep) MOT.Audio.playBleep();
                          } else if (e.key === 'Enter' || e.key === ' ') {
                              this.input.keyboard.off('keydown', kh);
                              this.choiceContainer.destroy();
                              if (MOT.Audio.playSelect) MOT.Audio.playSelect();
                              resolve(2);
                          }
                      };
                      this.input.keyboard.on('keydown', kh);
                  });
              } else {
                  await sayDevice('「よくやった。さぁ早くとどめを！」');
                  await sayDemon('「ぐっ…ここまでか…」');
                  
                  let isFreedomRoute = (Kills === 0 && MOT.flags.dollPoints < 20 && MOT.flags.killingIntent >= 20);
                  if (isFreedomRoute) {
                      c = await new Promise(res => {
                          this.showChoice([
                              { text: '見逃す', callback: () => { if(MOT.Audio.playSelect) MOT.Audio.playSelect(); res(2); } }
                          ]);
                      });
                  } else {
                      c = await askShatterChoice('1. 心臓を打ち抜く', '2. 見逃す', Kills === 0);
                  }
              }
              
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
                          var docScale = 600 / this.textures.get('doctor_stand').getSourceImage().width;
                          let doctorImage = this.add.image(1920 - 300, 1080 / 2, 'doctor_awaken_straight_dying').setAlpha(0).setDepth(90);
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
                           const sayHeroLab = (text) => new Promise(res => { this.tweens.add({ targets: dimBg, alpha: 0.6, duration: 300 }); this.tweens.add({targets: doctorImage, alpha: 0.4, duration: 300}); if(this.heroImage) this.tweens.add({targets: this.heroImage, alpha: 1, duration: 300}); this.showDialogue('勇者', text, res); });
                           
                           await sayDoctorLab('「驚いた...まさかお前がここまでやるとはな」');
                           await sayHeroLab('「…」');
                           await sayDoctorLab('「なにをしている？早くとどめを刺せ。同情などいらん。何の足しにもならないからな。」');
                           
                           // 選択肢 (1. 殺さない 2. 殺せない)
                           let selectedOpt = 1;
                           await new Promise(resolve => {
                               let btnElements = [];
                               const w = 1920, h = 1080;
                               let overlay = this.add.graphics().fillStyle(0x000000, 0.5).fillRect(0,0,w,h).setDepth(203);
                               btnElements.push(overlay);
                               
                               let texts = [
                                   "1. 殺さない",
                                   "2. 殺せない"
                               ];
                               let startY = h / 2 - 40;
                               
                               texts.forEach((txtStr, i) => {
                                   let y = startY + i * 100;
                                   let btn = this.add.image(w/2, y, 'ui_button_wide').setInteractive({useHandCursor: true}).setDepth(204).setAlpha(0);
                                   let txt = this.add.text(w/2, y, txtStr, { fontFamily: '"DotGothic16"', fontSize: '28px', color: '#E5E7EB' }).setOrigin(0.5).setDepth(205).setAlpha(0);
                                   this.tweens.add({ targets: [btn, txt], alpha: 1, duration: 300, delay: i*100 });
                                   btn.on('pointerdown', () => {
                                       selectedOpt = i + 1;
                                       this.input.keyboard.off('keydown', kh);
                                       btnElements.forEach(el => el.destroy());
                                       resolve();
                                   });
                                   btnElements.push(btn, txt);
                               });
                               
                               let cursor = this.add.text(w / 2 - 280, startY, '▶', { fontFamily: '"DotGothic16"', fontSize: '28px', color: '#39FF14' }).setOrigin(0.5).setDepth(206);
                               btnElements.push(cursor);
                               let idx = 0;
                               const kh = (e) => {
                                   if(e.key==='ArrowUp' || e.key==='w') { idx = Math.max(0, idx-1); cursor.setY(startY + idx*100); }
                                   if(e.key==='ArrowDown' || e.key==='s') { idx = Math.min(texts.length-1, idx+1); cursor.setY(startY + idx*100); }
                                   if(e.key==='Enter' || e.key===' ') {
                                       selectedOpt = idx + 1;
                                       this.input.keyboard.off('keydown', kh);
                                       btnElements.forEach(el => el.destroy());
                                       resolve();
                                   }
                               };
                               this.input.keyboard.on('keydown', kh);
                           });
                           
                           if (selectedOpt === 1) {
                               await sayDoctorLab('「…なんだ、ここでも殺さないのか。わかっているのか？その女の言う通り、私はお前を騙していたんだ。」');
                               await sayDoctorLab('「お前は”勇者”なんかじゃない、俺の最高傑作のはずだったんだがな。」');
                               
                               // 自害直前に立ち絵を「覚醒_真顔_武器展開」に変更
                               if (doctorImage) doctorImage.setTexture('doctor_awaken_straight_weapon');
                               
                               await sayHeroLab('「あなたがやったことは許せない。だけど、ここであなたを殺したら僕はあなたと同じになってしまう。」');
                               await sayDoctorLab('「そうか……。」');
                               await sayDoctorLab('「ついぞ俺の実験が成功することはなかった。もうここには用はない。さらばだ011101。」');
                               await sayHeroLab('「！」');
                           } else {
                               // 自害直前に立ち絵を「覚醒_真顔_武器展開」に変更
                               if (doctorImage) doctorImage.setTexture('doctor_awaken_straight_weapon');
                               
                               await sayHeroLab('「できない...。あなたがやったことは許せないけど、それでもあなたは僕の...」');
                               await sayDoctorLab('「全く...本当にどうしようもない欠陥品だな。」');
                               await sayDoctorLab('「私は、自分の目的のためにしか生きられない。お前が何を思っていてもな。」');
                               await sayDoctorLab('「さらばだ、011101。もう、お前に用はない。好きに生きるんだな。」');
                               await sayHeroLab('「！」');
                           }
                           
                           // 銃声SE ＆ カメラシェイク
                           if (MOT.Audio && MOT.Audio.playShatter) {
                               MOT.Audio.playShatter();
                           } else if (MOT.Audio && MOT.Audio.playSelect) {
                               MOT.Audio.playSelect();
                           }
                           this.cameras.main.shake(600, 0.06);
                           await new Promise(r => this.time.delayedCall(1200, r));
                           
                           ending('END_ORPHAN');
                      }
                  }
              } else {
                  // 魔王を生かす
                  MOT.flags.killedDemonLord = false;
                  
                  // 生かした場合の分岐演出 (True Demon Lord or others)
                  if (Kills === 0 && Satsui >= 20 && DP < 20) {
                      // 自由の身エンドの特別演出
                          const localSayDevice = (text) => new Promise(res => { this.tweens.add({ targets: this.dimBg, alpha: 0.6, duration: 300 }); if(this.heroImage) this.tweens.add({targets: this.heroImage, alpha: 0.4, duration: 300}); if(this.inunekoImage) this.tweens.add({targets: this.inunekoImage, alpha: 0.4, duration: 300}); if(this.demonImage) this.tweens.add({targets: this.demonImage, alpha: 0.4, duration: 300}); this.showDeviceDialogue(text, res); });
                          const localSayInuneko = (text) => new Promise(res => { this.tweens.add({ targets: this.dimBg, alpha: 0.6, duration: 300 }); if(this.heroImage) this.tweens.add({targets: this.heroImage, alpha: 0.4, duration: 300}); if(this.demonImage) this.tweens.add({targets: this.demonImage, alpha: 0.4, duration: 300}); if(this.inunekoImage) this.tweens.add({targets: this.inunekoImage, alpha: 1, duration: 300}); this.showDialogue('犬猫☆すたー', text, res); });
                          const localSayDemon = (text) => new Promise(res => { this.tweens.add({ targets: this.dimBg, alpha: 0.6, duration: 300 }); if(this.heroImage) this.tweens.add({targets: this.heroImage, alpha: 0.4, duration: 300}); if(this.inunekoImage) this.tweens.add({targets: this.inunekoImage, alpha: 0.4, duration: 300}); if(this.demonImage) this.tweens.add({targets: this.demonImage, alpha: 1, duration: 300}); this.showDialogue('魔王', text, res); });
                          const sayHero = (text) => new Promise(res => { this.tweens.add({ targets: this.dimBg, alpha: 0.6, duration: 300 }); if(this.demonImage) this.tweens.add({targets: this.demonImage, alpha: 0.4, duration: 300}); if(this.inunekoImage) this.tweens.add({targets: this.inunekoImage, alpha: 0.4, duration: 300}); if(this.heroImage) this.tweens.add({targets: this.heroImage, alpha: 1, duration: 300}); this.showDialogue('勇者', text, res); });

                          await localSayDemon('「殺すならわらわだけで十分であろう！？わらわを殺せば組織は終わる！お前の目的だって達成される！！！」');
                          
                          if (!this.inunekoImage || !this.inunekoImage.active) {
                              this.inunekoImage = this.add.image(1920 - 120, 1080 / 2 - 250, 'inuneko_stand').setAlpha(0).setDepth(91);
                              this.inunekoImage.setScale(300 / 691);
                              this.inunekoImage.setY(350);
                              this.tweens.add({targets: this.inunekoImage, alpha: 0.4, duration: 300});
                          }
                          await localSayInuneko('「何を言っとるにゃ！？魔王様も殺すなわん！！」');
                          
                          await sayHero('「…」');
                          await localSayDevice('「何をしている？早くしろ。」');
                          if (MOT.Audio.playShatter) MOT.Audio.playShatter(); // （破壊音SE（通信機を壊す））
                          this.cameras.main.shake(300, 0.05);
                          await new Promise(r => this.time.delayedCall(500, r));
                          
                          await sayHero('「うるさいな」');
                          await localSayDemon('「勇者……？」');
                          await sayHero('「もうここに用はない。」');
                          await sayHero('「君も好きにするといい。僕は帰らないと。」');
                          await localSayDemon('「帰る……？あやつの元にか……？わらわたちの元に来る方がいいのではないか？」');
                          await sayHero('「君と僕は目的も手段も違う。」');
                          await sayHero('「安心するといい。これからは平和に暮らせるはずだ。」');
                          await localSayDemon('「は……？」');
                          await localSayInuneko('「なにを言ってるわん？」');
                          await localSayDemon('「ちょっとまて！何を馬鹿なことを言っとるんじゃ！」');

                          // フェードアウト
                          this.cameras.main.fadeOut(1000);
                          await new Promise(r => this.time.delayedCall(1000, r));
                          
                          let blackText = this.add.text(1920/2, 1080/2, '主人公は、魔王の引き留める声も聴かずに博士の研究室に戻る。', {fontFamily: '"DotGothic16"', fontSize: '32px', color: '#fff'}).setOrigin(0.5).setDepth(300).setAlpha(0);
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
                          var docScale = 600 / this.doctorImage.width;
                          this.doctorImage.setScale(docScale);
                          this.doctorImage.setY(100 + (this.doctorImage.height * docScale) / 2);
                          
                          // 勇者（覚醒）の立ち絵
                          this.heroImage = this.add.image(300, 1080 / 2, 'hero_stand').setAlpha(0).setDepth(90);
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
                          const sayHeroLab = (text) => new Promise(res => { this.tweens.add({ targets: this.dimBg, alpha: 0.6, duration: 300 }); this.tweens.add({targets: this.heroImage, alpha: 1, duration: 300}); this.tweens.add({ targets: this.doctorImage, alpha: 0.4, duration: 300 }); this.showDialogue('主人公', text, res); });
                          
                          await sayHeroLab('「…」');
                          await sayDoctorLab('「おい、通信機を破壊したな？それに魔王すら殺していないとはどういうことだ。」');
                          await sayDoctorLab('「あまり好き勝手されるのは困るんだがな。」');
                          
                          // 5つの選択肢
                          if (this.choiceContainer) this.choiceContainer.destroy();
                          this.choiceContainer = this.add.container(0, 0).setDepth(200);
                          var w = 1920, h = 1080;
                          var bgChoice = this.add.rectangle(w / 2, h / 2, w, h, 0x000000, 0.4).setInteractive();
                          this.choiceContainer.add(bgChoice);
                          var titleChoice = this.add.text(w / 2, h / 2 - 220, '選択してください', { fontFamily: '"DotGothic16"', fontSize: '40px', color: '#ffffff' }).setOrigin(0.5);
                          this.choiceContainer.add(titleChoice);
                          
                          let yStart = h / 2 - 150;
                          for(let i=0; i<5; i++){
                              let numTxt = (i + 1).toString();
                              let box = this.add.rectangle(w / 2, yStart + i * 60, 500, 50, 0x1F2933, 0.8).setStrokeStyle(2, 0x4FD1FF);
                              let txt = this.add.text(w / 2, yStart + i * 60, numTxt + ' 博士を倒す', { fontFamily: '"DotGothic16"', fontSize: '24px', color: '#ffffff' }).setOrigin(0.5);
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
                          
                          await sayHeroLab('「…」');
                          await sayDoctorLab('「こちらに銃を構えてどうした？ああ、私を倒したいとでも言うのか。」');
                          await sayDoctorLab('「残念だが、お前にその権限はない。」');
                          await sayDoctorLab('「反抗するのならお前を……」');
                          await sayDoctorLab('「……！？」');
                          await sayHeroLab('「いつまでも自分が優位に立てるとは思わない方がいい。」');
                          await sayHeroLab('「僕にこれだけの力を与えたのは貴方だ。」');
                          await sayDoctorLab('「まさか、システムを乗っ取られるとはな！！！ははは、面白い。」');
                          await sayHeroLab('「僕はその力を掌握した。それが意味することは……分かっているでしょう？」');
                          await sayDoctorLab('「そうだな。お前は晴れて自由の身になったというわけだ。そして、私を殺してお前は何がしたい？」');
                          await sayHeroLab('「僕はもう、誰の命令も聞かない、それだけだ。」');
                          await sayDoctorLab('「そうか。やはりお前は私の最高傑作のようだ！！！まさか、思想まで似てしまうとは。想定外だが、それもいいだろう。」');
                          await sayHeroLab('「うるさいな！もうお前は必要ない。」');
                          
                          if (MOT.Audio.playSelect) MOT.Audio.playSelect();
                          this.cameras.main.shake(1000, 0.05);
                          let glass = this.add.rectangle(w/2, h/2, w, h, 0xffffff).setAlpha(0).setDepth(400).setBlendMode(Phaser.BlendModes.ADD);
                          this.tweens.add({targets: glass, alpha: 1, duration: 100, yoyo: true, repeat: 3});
                          await new Promise(r => this.time.delayedCall(1000, r));
                          
                          await sayHeroLab('「……。」');

                          this.cameras.main.fadeOut(1000);
                          await new Promise(r => this.time.delayedCall(1000, r));

                          ending('hidden_freedom');
                      } else if (Kills === 0) {
                          if (this.heroImage) {
                              this.heroImage.setTexture('hero_stand');
                              this.heroImage.setScale(750 / this.heroImage.width);
                              this.heroImage.setY(100 + (this.heroImage.height * this.heroImage.scaleY) / 2);
                          }
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
                          
                          if (!this.doctorImage || !this.doctorImage.active) {
                              this.doctorImage = this.add.image(1920 - 300, 1080 / 2, 'doctor_awaken_smile').setAlpha(0).setDepth(90);
                          } else {
                              this.doctorImage.setTexture('doctor_awaken_smile');
                          }
                          this.textures.get('doctor_awaken_smile').setFilter(Phaser.Textures.FilterMode.LINEAR);
                          var docScale = 600 / (this.textures.get('doctor_awaken_smile').getSourceImage().width || 750);
                          this.doctorImage.setScale(docScale);
                          this.doctorImage.setY(100 + ((this.textures.get('doctor_awaken_smile').getSourceImage().height || 1000) * docScale) / 2);

                          const localSayDoctor = (text, tex='doctor_awaken_smile') => new Promise(res => {
                              this.doctorImage.setTexture(tex);
                              this.tweens.add({ targets: dimBg, alpha: 0.6, duration: 300 });
                              if(this.heroImage) this.tweens.add({targets: this.heroImage, alpha: 0.4, duration: 300});
                              if(this.demonImage) this.tweens.add({targets: this.demonImage, alpha: 0, duration: 300});
                              if(this.inunekoImage) this.tweens.add({targets: this.inunekoImage, alpha: 0, duration: 300});
                              if(this.doctorImage) this.tweens.add({targets: this.doctorImage, alpha: 1, duration: 300});
                              this.showDialogue('博士', text, res);
                          });
                          
                          const localSayHero = (text) => new Promise(res => {
                              this.tweens.add({ targets: dimBg, alpha: 0.6, duration: 300 });
                              if(this.heroImage) this.tweens.add({targets: this.heroImage, alpha: 1, duration: 300});
                              if(this.demonImage) this.tweens.add({targets: this.demonImage, alpha: 0, duration: 300});
                              if(this.inunekoImage) this.tweens.add({targets: this.inunekoImage, alpha: 0, duration: 300});
                              if(this.doctorImage) this.tweens.add({targets: this.doctorImage, alpha: 0.4, duration: 300});
                              this.showDialogue('勇者', text, res);
                          });
                          
                          const localSayDemon = (text) => new Promise(res => {
                              this.tweens.add({ targets: dimBg, alpha: 0.6, duration: 300 });
                              if(this.heroImage) this.tweens.add({targets: this.heroImage, alpha: 0.4, duration: 300});
                              if(this.demonImage) this.tweens.add({targets: this.demonImage, alpha: 1, duration: 300});
                              if(this.inunekoImage) this.tweens.add({targets: this.inunekoImage, alpha: 0.4, duration: 300});
                              if(this.doctorImage) this.tweens.add({targets: this.doctorImage, alpha: 0, duration: 300});
                              this.showDialogue('魔王', text, res);
                          });
                          
                          const localSayInuneko = (text) => new Promise(res => {
                              this.tweens.add({ targets: dimBg, alpha: 0.6, duration: 300 });
                              if(this.heroImage) this.tweens.add({targets: this.heroImage, alpha: 0.4, duration: 300});
                              if(this.demonImage) this.tweens.add({targets: this.demonImage, alpha: 0.4, duration: 300});
                              if(this.inunekoImage) this.tweens.add({targets: this.inunekoImage, alpha: 1, duration: 300});
                              if(this.doctorImage) this.tweens.add({targets: this.doctorImage, alpha: 0, duration: 300});
                              this.showDialogue('犬猫☆スター', text, res);
                          });

                          await localSayDoctor('「…はははは。すべて話されてしまったみたいだな」');
                          await localSayHero('「！」');
                          await localSayHero('「僕は……ずっとあなたに嘘をつかれていたんだね。」');
                          await localSayDoctor('「嘘？違うな、そいつらを殺せば平和な世界が訪れる。」');
                          await localSayDoctor('「私にとってな。」');
                          await localSayHero('「でもそれは、あなた以外にとって最悪の世界そのもの。」');
                          await localSayDoctor('「そうだな。しかしそれがどうした？自分の望む世界を目指すのは普通のことだろう？」');
                          await localSayDoctor('「それと、魔族に恐怖し、滅んでほしいと願う人間はごまんといる。そいつらにとっても、いい世界となるだろう？」');
                          
                          await localSayDemon('「わらわたちはただ生きているだけだ！むやみに人を傷つけたりせん！」');
                          await localSayInuneko('「そうわん！魔王様は、お前とは違って優しいにゃん！！」');
                          
                          await localSayHero('「僕は今までの敵と戦ってきて、皆が魔王のために命を賭して戦ってきたのを見た。」');
                          await localSayHero('「沢山の人に慕われている魔王が、悪い奴だと思えない」');
                          
                          await localSayDoctor('「……面白い。ただの人形であるはずのお前が、そんな感情を持つなんてな。」');
                          await localSayHero('「人形…？」');
                          await localSayDoctor('「そうだ。お前は、勇者でもなんでもない。ただの兵器だよ。だからこそ、命令を下し、ただ魔王を殺すだけの存在になるはずだった。」');
                          await localSayHero('「でも、僕はみんなを殺したくないと思った。」');
                          await localSayHero('「みんな、魔王を殺しに来ているはずの僕も殺そうとしなかった。」');
                          await localSayHero('「僕は知った。魔族は悪い奴じゃないって。みんなを殺そうとしているあなたこそ、この世界の悪だ！！！」');
                          await localSayHero('「だからもう、あなたに従ったりはしない。」');
                          
                          await localSayDoctor('「……そうか。だが、それでも理解不能だな。そもそも、お前には思考力は組み込んでいなかった。しかし、お前には思考力が備わっていた。」');
                          await localSayDoctor('「私が何度殺せと指示をし、選択権を奪ってもお前は最後まで従わなかった。」');
                          await localSayDoctor('「最初から可笑しかった。お前は自分を勇者と認識したら、何も聞かず、考えず戦いに行くはずだった。」');
                          await localSayDoctor('「お前はどうだ？勇者と呼びかけた私に対し、誰だと聞いた。ただ起動に時間がかかっているだけかと思ったが、その時には既に組み換えられていたんだな。」');
                          
                          await localSayHero('「違う！僕の考えは、決められたものなんかじゃない！」');
                          await localSayDoctor('「本当にそう思っているのか？」');
                          
                          await localSayDoctor('「もっとも、お前が誰に操られていようが、何を選ぼうと、もう関係ない。私の準備はすべて整った。」');
                          await localSayDoctor('「これまで集めたデータ、幾度となく繰り返した実験。すべて申し分ない。」');
                          await localSayDoctor('「私は、今この瞬間のためだけに動いてきた！」');
                          
                          await localSayDemon('「なんだ？！」');
                          await localSayInuneko('「にゃわわ！？」');
                          
                          await localSayDoctor('「さぁ、最終決戦といこうじゃないか！」', 'doctor_awaken_straight_weapon');

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
                      var docScale = 600 / this.textures.get('doctor_stand').getSourceImage().width;
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
            if (this.currentBoss) {
              this.currentBoss.setVisible(false);
              this.currentBoss.setActive(false);
            }
            if (this.bossHpBg) this.bossHpBg.setVisible(false);
            if (this.bossHpBar) this.bossHpBar.setVisible(false);
            if (this.bossHPText) this.bossHPText.setVisible(false);

            this.textures.get('doctor_stand').setFilter(Phaser.Textures.FilterMode.LINEAR);
            let doctorImage = this.add.image(1920 - 300, 1080 / 2, 'doctor_awaken_normal_dying').setAlpha(0).setDepth(90);
            var docScale = 600 / this.textures.get('doctor_stand').getSourceImage().width;
            doctorImage.setScale(docScale);
            doctorImage.setY(100 + (this.textures.get('doctor_stand').getSourceImage().height * docScale) / 2);
            this.doctorImage = doctorImage;
            this.tweens.add({ targets: doctorImage, alpha: 1, duration: 300 });

            const sayDoctor = (text, tex) => new Promise(res => {
              this.tweens.add({ targets: dimBg, alpha: 0.6, duration: 300 });
              if (this.heroImage) this.tweens.add({ targets: this.heroImage, alpha: 0.4, duration: 300 });
              if (doctorImage) {
                this.tweens.add({ targets: doctorImage, alpha: 1, duration: 300 });
                if (tex) {
                  doctorImage.setTexture(tex);
                  var dScale = 600 / this.textures.get('doctor_stand').getSourceImage().width;
                  doctorImage.setScale(dScale);
                  doctorImage.setY(100 + (this.textures.get('doctor_stand').getSourceImage().height * dScale) / 2);
                }
              }
              this.showDialogue('博士', text, res);
            });

            const sayHero = (text) => new Promise(res => {
              this.tweens.add({ targets: dimBg, alpha: 0.6, duration: 300 });
              if (this.heroImage) {
                this.tweens.add({ targets: this.heroImage, alpha: 1, duration: 300 });
                if (text === '「……」' || text === '「……。」' || text === '「…」') {
                  this.heroImage.setTexture('hero_stand_silent');
                } else if (text === '「！」') {
                  this.heroImage.setTexture('hero_cry');
                } else {
                  this.heroImage.setTexture('hero_stand');
                }
                var hScale = 750 / this.heroImage.width;
                this.heroImage.setScale(hScale);
                this.heroImage.setY(100 + (this.heroImage.height * hScale) / 2);
              }
              if (doctorImage) this.tweens.add({ targets: doctorImage, alpha: 0.4, duration: 300 });
              this.showDialogue('勇者', text, res);
            });

            const askChoice = (label1, label2) => new Promise(res => {
              this.showChoice([
                { text: label1, callback: () => { MOT.Audio.playSelect(); res(1); } },
                { text: label2, callback: () => { MOT.Audio.playSelect(); res(2); } }
              ]);
            });

            (async () => {
              await sayDoctor('「驚いた...まさかお前がここまでやるとはな」', 'doctor_awaken_normal_dying');
              await sayHero('「…」');
              await sayDoctor('「なにをしている？早くとどめを刺せ。同情などいらん。何の足しにもならないからな。」', 'doctor_awaken_normal_dying');

              let c = await askChoice('1. 殺さない', '2. 殺せない');
              if (c === 1) {
                await sayDoctor('「…なんだ、ここでも殺さないのか。わかっているのか？その女の言う通り、私はお前を騙していたんだ。」', 'doctor_awaken_smile_dying');
                await sayDoctor('「お前は”勇者”なんかじゃない、俺の最高傑作のはずだったんだがな。」', 'doctor_awaken_smile_dying');
                await sayHero('「あなたがやったことは許せない。だけど、ここであなたを殺したら僕はあなたと同じになってしまう。」');
                await sayDoctor('「そうか……。」', 'doctor_awaken_straight_dying');
                await sayDoctor('「ついぞ俺の実験が成功することはなかった。もうここには用はない。さらばだ011101。」', 'doctor_awaken_smile_weapon');
              } else {
                await sayHero('「できない...。あなたがやったことは許せないけど、それでもあなたは僕の...」');
                await sayDoctor('「全く...本当にどうしようもない欠陥品だな。」', 'doctor_awaken_smile_dying');
                await sayDoctor('「私は、自分の目的のためにしか生きられない。お前が何を思っていてもな。」', 'doctor_awaken_smile_dying');
                await sayDoctor('「さらばだ、011101。もう、お前に用はない。好きに生きるんだな。」', 'doctor_awaken_smile_weapon');
              }
              await sayHero('「！」');
              
              if (MOT.Audio && MOT.Audio.playShatter) {
                MOT.Audio.playShatter();
              } else if (MOT.Audio && MOT.Audio.playSelect) {
                MOT.Audio.playSelect();
              }
              this.cameras.main.shake(600, 0.06);
              await new Promise(r => this.time.delayedCall(1200, r));
              
              MOT.flags.finalEnding = 'END_ORPHAN';
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
                           if(this.boss1Bgm) this.boss1Bgm.stop();
                           if(this.boss2Bgm) this.boss2Bgm.stop();
                           if(this.twinsBgm) this.twinsBgm.stop();
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
    if (this.twinsBgm) {
      this.twinsBgm.stop();
    }
    
    this.cutsceneActive = true;
    if (this.bossLaneTimer) this.bossLaneTimer.destroy();
    if (this.sisterLaneTimer) this.sisterLaneTimer.destroy();
    this.enemyBullets.clear(true, true);

    this.currentBoss.body.enable = false;
    this.sisterBoss.body.enable = false;
    
    this.cameras.main.shake(1000, 0.02);
    
    // 連続爆発エフェクト
    this.time.addEvent({
      delay: 200,
      repeat: 11,
      callback: () => {
        let tx = Phaser.Math.Between(0, 1) ? this.currentBoss.x : this.sisterBoss.x;
        let ty = Phaser.Math.Between(0, 1) ? this.currentBoss.y : this.sisterBoss.y;
        if (this.showExplosion) this.showExplosion(tx + Phaser.Math.Between(-100, 100), ty + Phaser.Math.Between(-100, 100));
        if (window.MOT && MOT.Audio) MOT.Audio.playExplosion();
      }
    });
    
    // Both sprites remain visible or become visible
    this.currentBoss.setVisible(true).setAlpha(1);
    this.sisterBoss.setVisible(true).setAlpha(1);
    
    this.tweens.add({
      targets: [this.currentBoss, this.sisterBoss], alpha: 0.3, yoyo: true, repeat: 8, duration: 150,
      onComplete: () => {
        this.dialogActive = true;
        this.physics.pause();
        this.player.setVelocity(0, 0);

        var w = 1920, h = 1080;
        var dimBg = this.add.rectangle(w/2, h/2, w, h, 0x000000, 0.6).setAlpha(0).setDepth(89);
        this.dimBg = dimBg;
        this.heroImage = this.add.image(300, h / 2, 'hero_stand').setAlpha(0).setDepth(90);
        var hScale = 750 / this.heroImage.width;
        this.heroImage.setScale(hScale);
        this.heroImage.setY(100 + (this.heroImage.height * hScale) / 2);

        // Sister Portrait (Default to 'sister_hurt' for post-defeat)
        this.sisterImage = this.add.image(1920 - 600, h / 2, 'sister_hurt').setAlpha(0).setDepth(90);
        // Fallback scale if texture not loaded, otherwise dynamic
        var sScale = 750 / 600; 
        if (this.textures.exists('sister_hurt')) {
          var tex = this.textures.get('sister_hurt').getSourceImage();
          if (tex && tex.width > 0) sScale = 750 / tex.width;
        }
        this.sisterImage.setScale(sScale);
        this.sisterImage.setY(100 + (this.sisterImage.height * sScale) / 2);

        // Brother Portrait (Default to 'brother_dying' for post-defeat)
        this.brotherImage = this.add.image(1920 - 300, h / 2, 'brother_dying').setAlpha(0).setDepth(90);
        var bScale = 750 / 600;
        if (this.textures.exists('brother_dying')) {
          var tex2 = this.textures.get('brother_dying').getSourceImage();
          if (tex2 && tex2.width > 0) bScale = 750 / tex2.width;
        }
        this.brotherImage.setScale(bScale);
        this.brotherImage.setY(100 + (this.brotherImage.height * bScale) / 2);

        // Sister & Brother Blinking logic
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
            if (this.brotherImage && this.brotherImage.active && this.brotherImage.alpha > 0) {
              let k = this.brotherImage.texture.key;
              let blinkTo = null;
              if (k === 'brother_dying') blinkTo = 'brother_dying_closed';
              if (k === 'brother_hurt') blinkTo = 'brother_hurt_closed';
              if (blinkTo) {
                this.brotherImage.setTexture(blinkTo);
                this.time.delayedCall(150, () => {
                  if (this.brotherImage && this.brotherImage.active && this.brotherImage.texture.key === blinkTo) {
                    this.brotherImage.setTexture(k);
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
        const sayDevice = (text) => new Promise(res => { this.tweens.add({ targets: dimBg, alpha: 0.6, duration: 300 }); this.tweens.add({targets: this.heroImage, alpha: 0.4, duration: 300}); if(this.sisterImage) this.tweens.add({targets: this.sisterImage, alpha: 0.4, duration: 300}); if(this.brotherImage) this.tweens.add({targets: this.brotherImage, alpha: 0.4, duration: 300}); this.showDeviceDialogue(text, res); });
        
        const sayHero = (text) => new Promise(res => { this.tweens.add({ targets: dimBg, alpha: 0.6, duration: 300 }); this.tweens.add({targets: this.heroImage, alpha: 1, duration: 300}); if(this.sisterImage) this.tweens.add({targets: this.sisterImage, alpha: 0.4, duration: 300}); if(this.brotherImage) this.tweens.add({targets: this.brotherImage, alpha: 0.4, duration: 300}); if (text === '「……」' || text === '「……。」' || text === '「…」') { this.heroImage.setTexture('hero_stand_silent'); } else { this.heroImage.setTexture('hero_stand'); } this.heroImage.setScale(750 / this.heroImage.width); this.heroImage.setY(100 + (this.heroImage.height * this.heroImage.scaleY) / 2); this.showDialogue('勇者', text, res); });
        const sayMan = (text, name = '男') => new Promise(res => { this.tweens.add({ targets: dimBg, alpha: 0.6, duration: 300 }); this.tweens.add({targets: this.heroImage, alpha: 0.4, duration: 300}); if(this.sisterImage) { this.tweens.add({targets: this.sisterImage, alpha: 0.4, duration: 300}); this.sisterImage.setDepth(90); } if(this.brotherImage) { this.tweens.add({targets: this.brotherImage, alpha: 1, duration: 300}); this.brotherImage.setDepth(91); } this.showDialogue(name, text, res); });
        const sayWoman = (text, name = '女') => new Promise(res => { this.tweens.add({ targets: dimBg, alpha: 0.6, duration: 300 }); this.tweens.add({targets: this.heroImage, alpha: 0.4, duration: 300}); if(this.sisterImage) { this.tweens.add({targets: this.sisterImage, alpha: 1, duration: 300}); this.sisterImage.setDepth(91); } if(this.brotherImage) { this.tweens.add({targets: this.brotherImage, alpha: 0.4, duration: 300}); this.brotherImage.setDepth(90); } this.showDialogue(name, text, res); });

        (async () => {
          await sayDevice('「さぁ早くとどめを刺せ！」');
          let c = await askChoice('1. 心臓を打ち抜く', '2. 見逃す');
          if (c === 1) { MOT.flags.dollPoints++; MOT.flags.killedTwins = true;
            if (MOT.flags.killedBoss1 && MOT.flags.killedBoss2) {
              await sayMan('「目を...覚ましてくれ...」', 'エディオ');
              await sayWoman('「このままいけば、あなた取返しのつかないことになるわ...」', 'エナリア');
              MOT.Audio.playSelect(); MOT.Audio.playSelect(); // 銃声SE2回
              await sayDevice('「よくやった。君は役に立つみたいだ。こいつらとは違うな…いや、なんでもない。そのまま進んでくれ。そろそろ魔王城に着くはずだ。」');
            } else {
              await sayMan('「これも、因果なのかな...僕たちは奴から逃げきれなかった」', 'エディオ');
              await sayWoman('「兄さま！！」', 'エナリア');
              MOT.Audio.playSelect(); MOT.Audio.playSelect(); // 銃声SE2回
              await sayDevice('「まさか生きていたとはな…いや、なんでもない。そのまま進んでくれ」');
              await sayDevice('「魔王を逃がすなんてしたらわかっているな？」');
            }
            this.skipToDemonLord(false);
          } else {
            if (this.brotherImage) this.brotherImage.setTexture('brother_hurt');
            if (MOT.flags.killedBoss1 || MOT.flags.killedBoss2) {
              await sayMan('「君も何かおかしいって気が付いて来ただろう？博士の言うことなんて聞くべきじゃない」', '男');
              await sayWoman('「兄さまの言う通りよ。そんな奴、従う価値もない。」', '女');
              if(this.sisterImage) {
                this.tweens.add({ targets: this.sisterImage, alpha: 0, duration: 300, onComplete: () => { if(this.sisterImage) { this.sisterImage.destroy(); this.sisterImage = null; } } });
              }
              if(this.brotherImage) {
                this.tweens.add({ targets: this.brotherImage, alpha: 0, duration: 300, onComplete: () => { if(this.brotherImage) { this.brotherImage.destroy(); this.brotherImage = null; } } });
              }
              await new Promise(r => this.tweens.add({ targets: [this.currentBoss, this.sisterBoss], x: 2200, duration: 1500, ease: 'Power2', onComplete: r }));
              await sayDevice('「なぜ殺さない！よりによってあいつらを生かすとは！！」');
            } else {
              await sayMan('「君は、最初から気が付いてるんじゃないか？博士がおかしいって。」', '男');
              await sayWoman('「あなたは誰も殺してない。だから、こっち側に来なさい。魔王様も許してくれる。」', '女');
              if(this.sisterImage) {
                this.tweens.add({ targets: this.sisterImage, alpha: 0, duration: 300, onComplete: () => { if(this.sisterImage) { this.sisterImage.destroy(); this.sisterImage = null; } } });
              }
              if(this.brotherImage) {
                this.tweens.add({ targets: this.brotherImage, alpha: 0, duration: 300, onComplete: () => { if(this.brotherImage) { this.brotherImage.destroy(); this.brotherImage = null; } } });
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
      this.bg.setOrigin(0, 0);
      this.bg.setPosition(0, 0);
      this.bg.setScale(4);
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
          this.player.setCollideWorldBounds(true);
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
    if (this.sisterImage) { this.sisterImage.destroy(); this.sisterImage = null; }
  }

  proceedToNextArea(boss, isSpared = false) {
    this.clearConversationUI();
    
    // Clear bullets immediately so they don't hit the player during transition
    this.enemyBullets.clear(true, true);
    this.playerBullets.clear(true, true);
    
    var resumeFn = function() {
      this.currentBoss = null;
      this.currentBossIndex++;
      
      // ─── 自動セーブ処理（各ボス撃破直後） ───
      if (this.currentBossIndex > 0 && this.currentBossIndex <= 4) {
        if (MOT.saveGame) MOT.saveGame(this.currentBossIndex);
        try {
          const saveNotify = this.add.text(1920 / 2, 80, '💾 進行状況を自動セーブしました', {
            fontFamily: "'DotGothic16', sans-serif",
            fontSize: '28px',
            color: '#00FF88',
            backgroundColor: 'rgba(5,8,20,0.85)',
            padding: { x: 20, y: 10 }
          }).setOrigin(0.5).setDepth(99999);
          this.tweens.add({
            targets: saveNotify,
            alpha: 0,
            delay: 2500,
            duration: 1000,
            onComplete: () => { if (saveNotify) saveNotify.destroy(); }
          });
        } catch (e) {
          console.error('Save notify UI error:', e);
        }
      }
      
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
          this.bg.setOrigin(0, 0);
          this.bg.setPosition(0, 0);
          this.bg.setScale(4);
          
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



    // HPスケールのために仮想的なステージ数を設定する
    this.currentStage = this.currentBossIndex + 2;

    // 幕間フラグ
    this.intermissionActive = true;
    this.cutsceneActive = false;
    
    // BGM再生
    if (this.stageBgm) this.stageBgm.stop();
    this.stageBgm = this.sound.add('bgm_stage', { loop: true, volume: 0.15 });
    this.stageBgm.play();

    // 1.5秒後に雑魚スポーン開始（GameSceneと同じウェーブ形式）
    this.time.delayedCall(1500, function () {
      let schedule = [
        { time: 500, action: 'wave', count: 5, speed: 200 },
        { time: 4500, action: 'wave', count: 7, speed: 220 },
        { time: 8500, action: 'items' },
        { time: 10500, action: 'wave', count: 8, speed: 250 },
        { time: 14500, action: 'items' },
        { time: 16500, action: 'stage_end' }
      ];

      schedule.forEach(event => {
        self.time.delayedCall(event.time, () => {
          if (!self.intermissionActive) return;
          if (event.action === 'wave') {
            if (MOT.spawnWave) {
              MOT.spawnWave(self, event.count, 200, event.speed);
              // 追加された敵（ボス以外）にisIntermissionEnemyフラグを付与し、HPを3に固定
              self.enemyGroup.getChildren().forEach(e => {
                if (!e.configKey) {
                  e.isIntermissionEnemy = true;
                  e.hp = 3;
                }
              });
            }
          } else if (event.action === 'items') {
            if (MOT.spawnHealthItem) MOT.spawnHealthItem(self, 1920, Phaser.Math.Between(300, 700));
          } else if (event.action === 'stage_end') {
            self.checkIntermissionEndTimer = self.time.addEvent({
              delay: 500,
              loop: true,
              callback: () => {
                let hasEnemies = false;
                self.enemyGroup.getChildren().forEach(e => {
                  if (e.isIntermissionEnemy && e.active && e.x > -100) hasEnemies = true;
                });
                if (!hasEnemies) {
                  self.checkIntermissionEndTimer.destroy();
                  self.endIntermission();
                }
              }
            });
          }
        });
      });
      
      // タイムアウト保険：20秒後に強制進行
      self.intermissionTimeout = self.time.delayedCall(20000, function () {
        self.endIntermission();
      });
    });
  }

  // 幕間クリア（全滅 or タイムアウト）→ 次のボスへ
  endIntermission() {
    if (!this.intermissionActive) return;
    this.intermissionActive = false;
    
    if (this.stageBgm) this.stageBgm.stop();
    
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
    this.dialogActive = true;
    this.input.setTopOnly(true);
    if (this.dialogContainer) {
      this.dialogContainer.destroy();
    }
    this.dialogContainer = this.add.container(0, 0).setDepth(200000).setScrollFactor(0);
    const touchZone = this.add.rectangle(960, 540, 1920, 1080, 0x000000, 0.001).setInteractive({ useHandCursor: true });
    this.dialogContainer.add(touchZone);

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

    var contText = this.add.text(w - 100, boxY + boxH - 40, '▶ NEXT [TAP/SPACE]', {
      fontFamily: '"Press Start 2P"', fontSize: '20px', color: '#9CA3AF'
    }).setOrigin(1, 0).setAlpha(0);
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
          if (this.tweens) this.tweens.add({ targets: contText, alpha: 0.3, yoyo: true, repeat: -1, duration: 500 });
        }
      }, callbackScope: this, loop: true
    });

    const advance = () => {
      this.dialogActive = false;
      this.input.off('pointerdown', handleInput);
      if (touchZone && touchZone.active) {
        touchZone.off('pointerdown', handleInput);
        touchZone.destroy();
      }
      this.input.keyboard.off('keydown', handleKey);
      if (this.dialogContainer) {
        this.dialogContainer.destroy();
        this.dialogContainer = null;
      }
      if (onComplete) onComplete();
    };

    let lastTapTime = 0;
    const handleInput = (arg1, arg2, arg3, event) => {
      if (event && typeof event.stopPropagation === 'function') event.stopPropagation();
      else if (arg1 && typeof arg1.stopPropagation === 'function') arg1.stopPropagation();
      const now = Date.now();
      if (now - lastTapTime < 200) return;
      lastTapTime = now;

      if (charIndex < text.length) {
        typeTimer.destroy();
        charIndex = text.length;
        bodyText.setText(text);
        contText.setAlpha(1);
        if (this.tweens) this.tweens.add({ targets: contText, alpha: 0.3, yoyo: true, repeat: -1, duration: 500 });
      } else {
        advance();
      }
    };

    const handleKey = (event) => {
      if (event.key === ' ' || event.code === 'Space' || event.key === 'Enter' || event.code === 'Enter') {
        handleInput();
      }
    };

    touchZone.on('pointerdown', handleInput);
    this.input.off('pointerdown', handleInput);
    this.input.on('pointerdown', handleInput);
    this.input.keyboard.on('keydown', handleKey);
  }


  showChoices(choicesData) {
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;
    
    this.choicesList = [];
    let startY = h / 2 - (choicesData.length - 1) * 60;
    
    choicesData.forEach((data, index) => {
      let btn = this.add.rectangle(w / 2, startY + index * 120, 600, 90, 0x1F2933).setStrokeStyle(2, 0x4FD1FF).setInteractive({ useHandCursor: true }).setDepth(200000).setScrollFactor(0);
      let txt = this.add.text(w / 2, startY + index * 120, data.label, { fontFamily: '"DotGothic16"', fontSize: '26px', color: '#4FD1FF' }).setOrigin(0.5).setDepth(200001).setScrollFactor(0);
      
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
    this.dialogActive = true;
    this.input.setTopOnly(true);
    if (this.dialogContainer) {
      this.dialogContainer.destroy();
    }
    this.dialogContainer = this.add.container(0, 0).setDepth(200000).setScrollFactor(0);
    const touchZone = this.add.rectangle(960, 540, 1920, 1080, 0x000000, 0.001).setInteractive({ useHandCursor: true });
    this.dialogContainer.add(touchZone);

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

    var contText = this.add.text(w - 100, boxY + boxH - 40, '▶ NEXT [TAP/SPACE]', {
      fontFamily: '"Press Start 2P"', fontSize: '20px', color: '#9CA3AF'
    }).setOrigin(1, 0).setAlpha(0);
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
          if (this.tweens) this.tweens.add({ targets: contText, alpha: 0.3, yoyo: true, repeat: -1, duration: 500 });
        }
      }, callbackScope: this, loop: true
    });

    const advance = () => {
      if (!keepOpen) {
        this.dialogActive = false;
      }
      this.input.off('pointerdown', handleInput);
      if (touchZone && touchZone.active) {
        touchZone.off('pointerdown', handleInput);
        touchZone.destroy();
      }
      this.input.keyboard.off('keydown', handleKey);
      if (!keepOpen && this.dialogContainer) {
        this.dialogContainer.destroy();
        this.dialogContainer = null;
      }
      if (onComplete) onComplete();
    };

    let lastTapTime = 0;
    const handleInput = (arg1, arg2, arg3, event) => {
      if (event && typeof event.stopPropagation === 'function') event.stopPropagation();
      else if (arg1 && typeof arg1.stopPropagation === 'function') arg1.stopPropagation();
      const now = Date.now();
      if (now - lastTapTime < 200) return;
      lastTapTime = now;

      if (charIndex < text.length) {
        typeTimer.destroy();
        charIndex = text.length;
        bodyText.setText(text);
        contText.setAlpha(1);
        if (this.tweens) this.tweens.add({ targets: contText, alpha: 0.3, yoyo: true, repeat: -1, duration: 500 });
      } else {
        advance();
      }
    };

    const handleKey = (event) => {
      if (event.key === ' ' || event.code === 'Space' || event.key === 'Enter' || event.code === 'Enter') {
        handleInput();
      }
    };

    touchZone.on('pointerdown', handleInput);
    this.input.off('pointerdown', handleInput);
    this.input.on('pointerdown', handleInput);
    this.input.keyboard.on('keydown', handleKey);
  }

    showChoice(choices) {
    this.choiceActive = true;
    const w = 1920, h = 1080;
    const startY = h / 2 - (choices.length * 45);
    const elements = [];

    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.5);
    overlay.fillRect(0, 0, w, h);
    overlay.setDepth(200000).setScrollFactor(0);
    elements.push(overlay);

    // [ENTER] KEY ガイドテキストを右下に追加
    const contText = this.add.text(w - 100, h - 60, '▶ [ENTER] KEY', {
      fontFamily: '"Press Start 2P"',
      fontSize: '20px',
      color: '#9CA3AF'
    }).setOrigin(1, 0.5).setDepth(200001).setScrollFactor(0);
    this.tweens.add({ targets: contText, alpha: 0.3, yoyo: true, repeat: -1, duration: 500 });
    elements.push(contText);

    const choicesList = [];
    this.selectedChoiceIndex = 0;
    const self = this;

    choices.forEach(function (choice, i) {
      const y = startY + i * 110;
      const btn = self.add.image(w / 2, y, 'ui_button_wide').setInteractive({ useHandCursor: true }).setDepth(200002).setScrollFactor(0);
      
      const txt = self.add.text(w / 2, y, choice.text, {
        fontFamily: '"DotGothic16"',
        fontSize: '26px',
        color: '#E5E7EB'
      }).setOrigin(0.5).setDepth(200003).setScrollFactor(0);

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
        self.choiceActive = false;
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
        self.choiceActive = false;
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

  triggerAllyAssist() {
    if (this.dialogActive) return;

    let allies = ['demon', 'twins', 'boss2', 'boss1'];
    let chosen = allies[Phaser.Math.Between(0, allies.length - 1)];

    let w = 1920, h = 1080;
    
    // UI Create
    if (this.assistDialog) {
      this.assistDialog.destroy();
      this.assistText.destroy();
      if(this.assistImage) this.assistImage.destroy();
    }
    
    this.assistDialog = this.add.rectangle(w / 2, h - 80, 1200, 120, 0x0a0a14).setStrokeStyle(4, 0x4FD1FF).setDepth(200);
    this.assistText = this.add.text(w / 2 - 400, h - 110, '', { fontFamily: '"DotGothic16"', fontSize: '28px', color: '#fff', wordWrap: { width: 900 } }).setOrigin(0, 0).setDepth(201);
    
    let tex = '';
    let msg = '';
    
    if (chosen === 'demon') {
      tex = 'demon_stand_combat';
      msg = 'ヴェリタス「人間よ、少しは休むがよい！」\n【効果：HP回復】';
      MOT.flags.playerHP = Math.min((MOT.flags.playerMaxHP || 5), MOT.flags.playerHP + 2);
    } else if (chosen === 'twins') {
      tex = 'boss3_sister'; // 妹立ち絵
      msg = 'エナリア「ふんっ、今回だけ特別に守ってあげるんだから！」\n【効果：無敵バリア展開】';
      this.barrierActive = true;
      this.barrierTime = 0;
      this.barrierCooldown = 0;
      if (!this.barrierVisual) {
        this.barrierVisual = this.add.circle(this.player.x, this.player.y, 60, 0x00FFaa, 0.3);
        this.barrierVisual.setStrokeStyle(4, 0x00FFaa, 0.8);
        this.barrierVisual.setDepth(9);
      }
    } else if (chosen === 'boss2') {
      tex = 'boss2_battle_anim';
      msg = '戦闘狂「もっと速く、もっと激しく撃ちまくれぇ！！」\n【効果：連射速度超UP】';
      this.heroAttackSpeedBoost = true;
      this.time.delayedCall(8000, () => { this.heroAttackSpeedBoost = false; });
    } else if (chosen === 'boss1') {
      tex = 'boss1_muscle';
      msg = '筋肉「お前の力、そんなものではないだろう！！」\n【効果：攻撃力＆サイズUP】';
      this.heroFirepowerBoost = true;
      this.time.delayedCall(8000, () => { this.heroFirepowerBoost = false; });
    }
    
    this.assistImage = this.add.sprite(w / 2 - 500, h - 80, tex).setScale(0.15).setDepth(201);
    // scale and animation correction
    if (chosen === 'twins') this.assistImage.setScale(1.5);
    else if (chosen === 'demon') this.assistImage.setScale(0.25);
    else if (chosen === 'boss2') {
      this.assistImage.setScale(0.3);
      this.assistImage.play('boss2_battle_play');
    }
    
    this.assistText.setText(msg);
    MOT.Audio.playBleep(); 
    
    // Auto hide
    this.time.delayedCall(3000, () => {
      if (this.assistDialog) {
        this.tweens.add({ targets: [this.assistDialog, this.assistText, this.assistImage], alpha: 0, duration: 500, onComplete: () => {
          if (this.assistDialog) this.assistDialog.destroy();
          if (this.assistText) this.assistText.destroy();
          if (this.assistImage) this.assistImage.destroy();
          this.assistDialog = null;
        }});
      }
    });
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
      
      this.batteryUI = this.add.graphics().setDepth(100).setScrollFactor(0);
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
    if (dollPct <= 0) {
      this.iconPersonFill.setVisible(false);
    } else {
      this.iconPersonFill.setVisible(true);
      const cropY = 60 - 60 * dollPct;
      this.iconPersonFill.setCrop(0, cropY, 32, 64 - cropY);
    }

    // Killing Intent update
    const intentValue = MOT.flags.killingIntent || 0;
    const intentPct = Phaser.Math.Clamp(intentValue / 100, 0, 1);
    if (this.batteryUI) {
      this.batteryUI.clear();
      // 電池のキャップ部分
      this.batteryUI.fillStyle(0x555555, 1);
      this.batteryUI.fillRect(450 + 12, 44, 24, 6);
      // 電池の枠線
      this.batteryUI.lineStyle(3, 0x555555, 1);
      this.batteryUI.strokeRect(450 + 3, 44 + 6, 42, 87);
      
      // 赤い中身（殺意ゲージ）
      if (intentPct > 0) {
        this.batteryUI.fillStyle(0xFF0000, 1);
        const fillMaxHeight = 81;
        const fillH = fillMaxHeight * intentPct;
        const fillY = (44 + 6 + 84) - fillH;
        this.batteryUI.fillRect(450 + 6, fillY, 36, fillH);
      }
    }

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
        var bpct = Math.max(0, this.bossHP) / this.bossMaxHP;
        this.bossHPBar.fillStyle(0x1F2933, 1); this.bossHPBar.fillRect(560, 50, 800, 20);
        if (bpct > 0) {
          this.bossHPBar.fillStyle(0xFF2E2E, 1); this.bossHPBar.fillRect(562, 52, 796 * bpct, 16);
        }
        this.bossHPBar.lineStyle(1, 0xFF2E2E, 0.6); this.bossHPBar.strokeRect(560, 50, 800, 20);
      }
    } else {
      this.bossHPText.setText('');
      if (this.sisterHPText) this.sisterHPText.setVisible(false);
    }
  }
}

window.BossScene = BossScene;


