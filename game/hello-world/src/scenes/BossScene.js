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
      this.isDoctorPhase1Unwinnable = true;
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
    this.isLaneBeamActive = false;
    this.twinsReviving = false;
    this.twinReviveCooldown = false;
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
      if (this.boss4Bgm) this.boss4Bgm.stop();
      if (this.boss5Bgm) this.boss5Bgm.stop();
    });
  }

  create() {
    MOT.currentScene = this;
      this.heroAttackSpeedBoost = false;
      this.heroFirepowerBoost = false;
      this.inunekoBoostActive = false;
      this.barrierActive = false;
      this.playerInvincible = false;
    if (this.currentBossIndex === 0 && MOT.saveGame && this.startData && !this.startData.fromContinue) {
      MOT.saveGame(0);
    }
    this.sound.stopAll();
    this.events.on('shutdown', () => {
      if (this.twinsBgm) this.twinsBgm.stop();
      if (this.boss4Bgm) this.boss4Bgm.stop();
      if (this.boss5Bgm) this.boss5Bgm.stop();
    });
    const w = 1920, h = 1080;
    var bgKey = 'bg_boss1_static';
    if (this.bossQueue[this.currentBossIndex] !== 'doctor') {
        if (this.currentBossIndex === 0 && this.textures.exists('bg_stage1_scroll')) bgKey = 'bg_stage1_scroll';
        else if (this.currentBossIndex === 1 && this.textures.exists('bg_stage2_scroll')) bgKey = 'bg_stage2_scroll';
        else if (this.currentBossIndex === 2 && this.textures.exists('bg_stage3_scroll')) bgKey = 'bg_stage3_scroll';
        else if (this.currentBossIndex === 3 && this.textures.exists('bg_stage4_scroll')) bgKey = 'bg_stage4_scroll';
    } else {
        if (this.textures.exists('bg_doctor')) bgKey = 'bg_doctor';
    }
    // 
    //     if (this.currentBossIndex === 1) bgKey = 'bg_boss_stage3';
    //     else if (this.currentBossIndex === 2) bgKey = 'bg_boss_stage4';
    //     else if (this.currentBossIndex === 3) bgKey = 'bg_boss_stage5';
    this.bg = this.add.image(0, 0, bgKey);
    if (bgKey.startsWith('bg_boss_stage')) {
        this.bg.setOrigin(0, 0);
        this.bg.setScale(4);
    } else if (bgKey.includes('scroll')) {
        this.bg.setOrigin(0, 0);
        this.bg.setScale(1080 / this.bg.height);
    } else {
        this.bg.setOrigin(0.5, 0.5);
        this.bg.setPosition(w/2, h/2);
        let scale = Math.max(1920 / this.bg.width, 1080 / this.bg.height);
        this.bg.setScale(scale);
    }

    this.scrollBg1 = null;
    this.scrollBg2 = null;
    this.bgScrollWidth = 0;

    // Groups
    this.playerBullets = this.physics.add.group({ maxSize: 500 });
    this.enemyBullets = this.physics.add.group({ maxSize: 1000 });
    this.enemyGroup = this.physics.add.group();
    this.itemGroup = this.physics.add.group();

    // Player
    this.player = this.physics.add.sprite(-100, 460, 'hero_combat_down_open').setScale(1.5).setDepth(10);
    
    // 当たり判定可視化用グラフィックス
//     this.playerHitboxGraphics = this.add.graphics();
//     this.playerHitboxGraphics.setDepth(11);

    this.player.play('hero_combat_anim');
    // アニメーション再生後にサイズを指定（アニメーションによって上書きされるのを防ぐ）
    this.player.body.setSize(19, 80);
    this.player.body.setOffset(40, 10);
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
    this.laneGraphics = this.add.graphics().setDepth(1);
    this.laneGraphics.lineStyle(2, 0x4FD1FF, 0.25);

    laneYs.forEach(y => {
      this.laneGraphics.lineBetween(0, y, w, y);
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
    this.cameras.main.fadeIn(800, 0, 0, 0);

    // Start boss fight directly (including when resuming from continue)
    if (!(this.startData && this.startData.jumpToEndingSetup)) {
      this.time.delayedCall(1000, function () { this.startBoss(); }, [], this);
    }


  }

  getBossConfig(key) {
    var configs = {
      boss1: {
        texture: 'boss1_combat', name: 'クラトス', hp: 160, scale: 2.0,
        intro: '「貴様が博士の人形か。\nこの俺の拳で叩き潰してやる！」',
        defeat: '「馬鹿な…この俺が…！」',
        choices: [
          { text: '止めを刺す', flag: function () { MOT.modifyFlag('brutality', 1); MOT.modifyFlag('obeyDoctor', 1); } },
          { text: '見逃す', flag: function () { MOT.modifyFlag('showMercy', 1); MOT.modifyFlag('favor.boss1', 1); } }
        ]
      },
      boss2: {
        texture: 'boss2_combat_down_open', name: 'トゥレロス', hp: 240, scale: 2.0,
        intro: '「ヒャハハ！ 踊れ踊れぇ！！\n俺の双銃から逃げられるかなぁ！？」',
        defeat: '「アハハハハ…最高にイカれた気分だぜ…」',
        choices: [
          { text: '止めを刺す', flag: function () { MOT.modifyFlag('brutality', 1); MOT.modifyFlag('favor.boss2', -1); } },
          { text: '見逃す', flag: function () { MOT.modifyFlag('showMercy', 1); MOT.modifyFlag('favor.boss2', 1); } }
        ]
      },
      boss3_twins: {
        texture: 'brother_stand_open', name: 'エディオ', hp: 300, scale: 0.9,
        texture2: 'sister_shoot1', name2: 'エナリア', hp2: 300, scale2: 1.2,
        // Intro and defeat are handled custom via playTwinsIntro and post-battle logic
      },
      demon_lord: {
        texture: 'demon_combat_down_open', name: '魔王 – ヴェリタス', hp: 600, scale: 1.5,
        intro: '「…来たか、博士の人形よ。\nお前に真実を伝えなければならない。」',
        defeat: '「聞いてくれ。博士こそが…この世界を壊そうとしている。\n俺は…それを止めたかっただけだ。」',
        choices: []
      },
      doctor: {
        texture: 'doctor_combat', name: '博士', hp: 900, scale: 2.5,
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
      this.time.delayedCall(1000, function () { let __img = document.getElementById('trueDemonLordImg'); if (__img) __img.remove(); this.scene.start('EndingScene'); }, [], this);
      return;
    }

    // 各ボス戦開始直前に進行状況（ボスインデックス）を自動セーブ
    if (MOT.saveGame) {
      MOT.saveGame(this.currentBossIndex);
    }

    var key = this.bossQueue[this.currentBossIndex];

    // 前のボスや敵スプライト・弾が残っていれば確実に破棄（魔王などのドット絵残留防止）
    if (this.currentBoss) {
      if (this.currentBoss.destroy) this.currentBoss.destroy();
      this.currentBoss = null;
    }
    if (this.sisterBoss) {
      if (this.sisterBoss.destroy) this.sisterBoss.destroy();
      this.sisterBoss = null;
    }
    if (this.inunekoEnemy) {
      if (this.inunekoEnemy.destroy) this.inunekoEnemy.destroy();
      this.inunekoEnemy = null;
    }
    if (this.enemyGroup) {
      this.enemyGroup.clear(true, true);
    }
    if (this.enemyBullets) {
      this.enemyBullets.clear(true, true);
    }
    var cfg = this.getBossConfig(key);
    this.bossMaxHP = cfg.hp;
    if (this.startData && this.startData.initialBossHP !== undefined) {
      this.bossHP = this.startData.initialBossHP;
    } else {
      this.bossHP = cfg.hp;
    }
    this.bossPhase = 0;
    this.bossAttackTimer = 0;
    this.twinsReviving = false;
    this.isLaneBeamActive = false;
    this.bossDefeated = false;
    this.cutsceneActive = false;

    if (this.scrollBg1) {
      this.scrollBg1.setVisible(false);
      this.scrollBg2.setVisible(false);
    }
    if (this.bg) this.bg.setVisible(true);

    if (key === 'boss2' && this.textures.exists('bg_boss2')) {
      this.bg.setTexture('bg_boss2');
      this.bg.setOrigin(0.5, 0.5);
      this.bg.setPosition(1920 / 2, 1080 / 2);
      this.bg.setScale(Math.max(1920 / this.bg.width, 1080 / this.bg.height));
    } else if (key === 'boss3_twins' && this.textures.exists('bg_boss3')) {
      this.bg.setTexture('bg_boss3');
      this.bg.setOrigin(0.5, 0.5);
      this.bg.setPosition(1920 / 2, 1080 / 2);
      this.bg.setScale(Math.max(1920 / this.bg.width, 1080 / this.bg.height));
    } else if (key === 'demon_lord' && this.textures.exists('bg_boss4')) {
      this.bg.setTexture('bg_boss4');
      this.bg.setOrigin(0.5, 0.5);
      this.bg.setPosition(1920 / 2, 1080 / 2);
      this.bg.setScale(Math.max(1920 / this.bg.width, 1080 / this.bg.height));
    } else if (key === 'doctor' && this.textures.exists('bg_doctor')) {
      this.bg.setTexture('bg_doctor');
      this.bg.setOrigin(0.5, 0.5);
      this.bg.setPosition(1920 / 2, 1080 / 2);
      this.bg.setScale(Math.max(1920 / this.bg.width, 1080 / this.bg.height));
    }

    // Spawn boss (hidden initially)
    var bossSpawnY = 460;
    var boss = this.physics.add.sprite(1920, bossSpawnY, cfg.texture);
    if (key === 'boss1') boss.play('boss1_idle');
    if (key === 'demon_lord') boss.play('demon_combat_anim');
    if (key === 'boss2') boss.play('boss2_battle_play');
    if (key === 'boss3_twins') boss.play('brother_idle');
    boss.setScale(cfg.scale);
    boss.setDepth(8);
    this.enemyGroup.add(boss);
    this.currentBoss = boss;
    boss.hp = cfg.hp;
    boss.configKey = key;
    boss.setVisible(false);
    boss.body.enable = false;
    if (key === 'boss3_twins') {
      boss.body.setSize(50, 110);
      boss.body.setOffset(35, 5);
    }

    if (key === 'boss3_twins') {
      if (!this.anims.exists('sister_shoot_anim')) {
        this.anims.create({
          key: 'sister_shoot_anim',
          frames: [
            { key: 'sister_shoot1', duration: 400 },
            { key: 'sister_shoot2', duration: 400 },
            { key: 'sister_shoot1', duration: 400 },
            { key: 'sister_shoot1_blink', duration: 150 },
            { key: 'sister_shoot2', duration: 400 },
            { key: 'sister_shoot2_blink', duration: 150 }
          ],
          repeat: -1
        });
      }
      if (!this.anims.exists('brother_revive_anim')) {
        this.anims.create({
          key: 'brother_revive_anim',
          frames: [
            { key: 'brother_revive1' },
            { key: 'brother_revive2' }
          ],
          frameRate: 4,
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
      sister.body.setSize(50, 90);
      sister.body.setOffset(25, 10);
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

    // デバッグ用: 戦闘スキップして即死させる
    if (this.debugSkipCombat && key === 'demon_lord') {
      boss.setVisible(true);
      boss.hp = 0;
      this.time.delayedCall(100, () => {
        this.onBossHit({ active: true, damage: 9999, destroy: function(){} }, boss);
      });
      return;
    }

    this.startBossIntro(key, boss);
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
       this.cameras.main.shake(400, 0.015);
       if (key === 'demon_lord') {
         boss.setVisible(true); boss.body.enable = true;
         if (this.inunekoEnemy) {
           this.inunekoEnemy.setVisible(true);
           // 会話中はボスの右隣に静止（上下小揺れのみ）
           this.inunekoEnemy.x = 1920;
           this.tweens.add({ targets: this.inunekoEnemy, x: 1350, duration: 1200, ease: 'Power2' });
           this.tweens.add({ targets: this.inunekoEnemy, y: '-=20', duration: 1600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
         }
       } else {
         boss.setVisible(false);
         boss.body.enable = false;
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
          if (this.inunekoEnemy) { if (this.inunekoEnemy.destroy) this.inunekoEnemy.destroy(); this.inunekoEnemy = null; }
          var w = 1920, h = 1080;
          var dimBg = this.add.rectangle(w/2, h/2, w, h, 0x000000, 0.6).setAlpha(0).setDepth(89);
          this.heroImage = this.add.image(300, h / 2, 'hero_stand').setAlpha(0).setDepth(90);
          var hScale = 750 / this.heroImage.width;
          this.heroImage.setScale(hScale);
          this.heroImage.setY(100 + (this.heroImage.height * hScale) / 2);

          this.doctorImage = this.add.image(w - 300, h / 2, 'doctor_awaken_smile_weapon').setAlpha(0).setDepth(90);
          var docScale = 900 / this.doctorImage.width;
          this.doctorImage.setScale(docScale);
          this.doctorImage.setY(100 + (this.doctorImage.height * docScale) / 2);
          
          this.tweens.add({ targets: [dimBg, this.doctorImage], alpha: 1, duration: 500 });
          
          const sayDevice = (text) => new Promise(res => { this.tweens.add({ targets: dimBg, alpha: 0.6, duration: 300 }); this.tweens.add({ targets: [this.doctorImage, this.heroImage], alpha: 0.4, duration: 300 }); this.showDeviceDialogue(text, res); });
          const sayDoctor = (text) => new Promise(res => { this.tweens.add({ targets: dimBg, alpha: 0.6, duration: 300 }); this.tweens.add({ targets: [this.doctorImage], alpha: 1, duration: 300 }); this.tweens.add({targets: this.heroImage, alpha: 0.4, duration: 300}); this.showDialogue('博士', text, res); });
          
          (async () => {
             await sayDoctor('「これまで集めたデータ、幾度となく繰り返した実験、そしてお前のデータ。これにより私の準備はすべて整った！！」');
             await sayDoctor('「さぁ、最終決戦といこうじゃないか！」');
             this.tweens.add({
              targets: [dimBg, this.doctorImage, this.heroImage], alpha: 0, duration: 500,
              onComplete: () => { if (dimBg) dimBg.destroy(); if (this.doctorImage) this.doctorImage.destroy(); if (this.heroImage) this.heroImage.destroy(); this.doctorImage = null; this.heroImage = null; }
            });
            if (boss && boss.active) {
              boss.setVisible(true);
              boss.body.enable = true;
            }
            this.cutsceneActive = false;
            this.dialogActive = false;
            this.physics.resume();
            this.startBossLaneMovement();
            if (this.boss5Bgm) {
              try { this.boss5Bgm.stop(); this.boss5Bgm.destroy(); } catch (e) {}
            }
            this.boss5Bgm = this.sound.add('doctor_bgm', { loop: true, volume: 0.2 });
            this.boss5Bgm.play();

            if (this.isDoctorPhase1Unwinnable) {
              MOT.flags.playerHP = MOT.flags.playerMaxHP || 5;
              this.playerInvincible = false;
              this.phase1DefeatTriggered = false;
              this.updateHUD();
              this.time.delayedCall(8000, () => {
                if (this.isDoctorPhase1Unwinnable && !this.phase1DefeatTriggered) {
                  this.fireDoctorUnavoidableAttack();
                }
              });
            }
          })();
        }
      }
    });

    } else {
         // Minion phase
    this.minionBattleActive = true;
    this.minionsToKill = 1;
    this.time.delayedCall(100, () => {
      var dummy = this.enemyGroup.create(-1000, -1000, 'enemy_basic');
      dummy.isScenarioMinion = true;
      this.onBossHit({ active: true, damage: 9999, silent: true, destroy: () => {} }, dummy);
    });
  }
}
  playDemonLordIntro(onComplete) {
    var dimBg = this.add.rectangle(1920/2, 1080/2, 1920, 1080, 0x000000, 0.6).setAlpha(0).setDepth(89);
    this.heroImage = this.add.image(300, 1080 / 2, 'hero_stand').setAlpha(0).setDepth(90);
    var hScale = 750 / this.heroImage.width;
    this.heroImage.setScale(hScale);
    this.heroImage.setY(100 + (this.heroImage.height * hScale) / 2);
    
    this.demonImage = this.add.image(1920 - 300, 1080 / 2, 'demon_lord_normal').setAlpha(0).setDepth(90);
            this.demonImage.setScale(1000 / this.demonImage.width);
            this.demonImage.setY(100 + (this.demonImage.height * this.demonImage.scaleY) / 2 - 200);

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
      this.showDialogue(MOT.flags.heroName || '勇者', text, res);
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
      this.showDialogue(MOT.flags.heroName || '勇者', text, res);
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
        if (this.sisterBoss && this.sisterBoss.active && !this.dialogActive && this.sisterBoss.hp > 0 && !this.twinsReviving) {
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
        if (this.isLaneBeamActive) return;
        if (this.currentBoss && this.currentBoss.active && !this.dialogActive && this.currentBoss.hp > 0 && !this.twinsReviving) {
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
    if (MOT.updateSpecialAura) MOT.updateSpecialAura(this);

    if (this.scrollBg1 && this.scrollBg1.visible && this.intermissionActive) {
      const scrollSpeed = 2;
      this.scrollBg1.x -= scrollSpeed;
      this.scrollBg2.x -= scrollSpeed;
      if (this.scrollBg1.x <= -this.bgScrollWidth) this.scrollBg1.x = this.scrollBg2.x + this.bgScrollWidth;
      if (this.scrollBg2.x <= -this.bgScrollWidth) this.scrollBg2.x = this.scrollBg1.x + this.bgScrollWidth;
    }

    if (this.isLabTransition) {
        if (this.enemyBullets) this.enemyBullets.clear(true, true);
        if (this.playerBullets) this.playerBullets.clear(true, true);
//         if (this.playerHitboxGraphics) this.playerHitboxGraphics.clear();
        if (this.currentBoss) { this.currentBoss.setActive(false); this.currentBoss.setVisible(false); }
        if (this.sisterBoss) { this.sisterBoss.setActive(false); this.sisterBoss.setVisible(false); }
        if (this.batteryUI) this.batteryUI.clear();
        if (this.energyBarOutline) this.energyBarOutline.clear();
        if (MOT.DoctorDirective && MOT.DoctorDirective.directiveContainer) {
            MOT.DoctorDirective.hideDirective(this);
        }
        return;
    }
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

    // 博士の指示システム update（ダイアログ判定より先に実行して、表示非表示を管理する）
    if (this.currentBossIndex >= 4 || MOT.flags.demonLordFinished || this.demonLordFinished) {
      if (MOT.DoctorDirective) {
        if (MOT.DoctorDirective.directiveContainer) {
          MOT.DoctorDirective.directiveContainer.destroy();
          MOT.DoctorDirective.directiveContainer = null;
        }
        if (MOT.DoctorDirective.currentMaskShape) {
          MOT.DoctorDirective.currentMaskShape.destroy();
          MOT.DoctorDirective.currentMaskShape = null;
        }
        if (MOT.DoctorDirective.currentHighlight) {
          MOT.DoctorDirective.currentHighlight.destroy();
          MOT.DoctorDirective.currentHighlight = null;
        }
        MOT.DoctorDirective.currentDirective = null;
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

    if (isDialog || this.cutsceneActive) {
      this.hideBossHPBar();
      this.updateHUD();
      return;
    }
    
    if (this.cutsceneActive) {
      this.hideBossHPBar();
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
        if (this.barrierVisual.type === 'Star') this.barrierVisual.rotation += 0.02;
        if (this.barrierTime > 2000 && this.barrierTime < 3000) {
          this.barrierVisual.setVisible(Math.floor(this.barrierTime / 100) % 2 === 0);
        } else {
          this.barrierVisual.setVisible(true);
        }
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

    // 博士戦の味方支援システム（※第1フェーズ負けイベント中は支援しない）
    if (!this.isDoctorPhase1Unwinnable && this.currentBoss && this.currentBoss.configKey === 'doctor' && !this.dialogActive) {
      if (!this.assistTimer) this.assistTimer = 0;
      this.assistTimer += delta;
      if (this.assistTimer >= 8000 + Phaser.Math.Between(0, 4000)) { // 8-12 seconds
        this.assistTimer = 0;
        this.triggerAllyAssist();
      }
    }

    // Auto-shoot
    let isBossAlive = (this.currentBoss && this.currentBoss.active && this.currentBoss.visible && this.bossHP > 0);
    let isSisterAlive = (this.sisterBoss && this.sisterBoss.active && this.sisterBoss.visible && this.sisterBoss.hp > 0);
    let canShoot = !this.dialogActive && (isBossAlive || isSisterAlive || this.minionBattleActive || this.intermissionActive);
    if (canShoot) {
      this.autoShootTimer += delta;
      let shootInterval = this.heroAttackSpeedBoost ? 80 : 200;
      if (this.autoShootTimer >= shootInterval) {
        this.autoShootTimer = 0;
              var b = this.playerBullets.create(this.player.x + 30, this.player.y, 'bullet_player');
              if (b) {
                let diamondCount = Math.floor((MOT.flags.killingIntent || 0) / 10);
                let baseDamage = Math.min(5, 1 + diamondCount * 0.2);
                b.setVelocityX(this.heroFirepowerBoost ? 1000 : 600);
                b.setScale(this.heroFirepowerBoost ? 4 : 2);
                b.damage = this.heroFirepowerBoost ? Math.min(5, baseDamage * 2) : baseDamage;
                if (baseDamage >= 5) b.setTint(0xff0000);
                if (this.heroFirepowerBoost) {
                  b.setTint(0xffaa00);
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
        if (this.barrierVisual.type === 'Star') this.barrierVisual.rotation += 0.02;
        if (this.barrierTime > 2000 && this.barrierTime < 3000) {
          this.barrierVisual.setVisible(Math.floor(this.barrierTime / 100) % 2 === 0);
        } else {
          this.barrierVisual.setVisible(true);
        }
      }
      if (this.barrierTime >= 3000) {
        this.deactivateBarrier();
      }
    }

    // Boss attacks
    if (this.currentBoss && this.currentBoss.active && this.currentBoss.visible && !this.dialogActive) {
      this.bossAttackTimer += delta;
      var interval = this.bossHP < this.bossMaxHP * 0.5 ? 600 : 1000;
      if (this.currentBoss.configKey === 'boss1') interval = 3000; // ボス1の攻撃頻度を下げる
      if (this.inunekoBoostActive) interval = Math.floor(interval * 0.5); // 犬猫スター弾幕加速
      if (this.currentBoss.configKey === 'boss3_twins') interval = 2400; // 兄の攻撃頻度を下げる（元1200）
      if (this.currentBoss.configKey === 'doctor') interval = this.bossHP < this.bossMaxHP * 0.5 ? 1400 : 1800; // 博士の攻撃頻度を上げる
      if (this.currentBoss.configKey === 'demon_lord') interval = this.bossHP < this.bossMaxHP * 0.5 ? 2500 : 3000; // 魔王の螺旋弾幕（2.4秒）と重ならないように大幅緩和
      
      if (this.bossAttackTimer >= interval) {
        this.bossAttackTimer = 0;
        this.bossAttack();
      }
    }
    
    // Sister attacks
    if (this.currentBoss && this.currentBoss.configKey === 'boss3_twins' && this.sisterBoss && this.sisterBoss.active && this.sisterBoss.visible && !this.dialogActive && !this.twinsReviving) {
      if (!this.sisterAttackTimer) this.sisterAttackTimer = 0;
      this.sisterAttackTimer += delta;
      if (this.sisterAttackTimer >= 3500) { // 妹の攻撃頻度を下げる（元2000）
        this.sisterAttackTimer = 0;
        this.fireStarGauge(Phaser.Math.Between(1, 3), false);
      }
    }

    if (this.currentBoss && this.currentBoss.configKey === 'boss3_twins' && !this.bossDefeated) {
      if (this.currentBoss.hp <= 0 && this.sisterBoss && this.sisterBoss.hp <= 0) {
        if (this.twinReviveTimer) this.twinReviveTimer.destroy();
        if (this.twinReviveAnimTimer) this.twinReviveAnimTimer.destroy();
        this.bossDefeated = true;
        this.onTwinsDefeated();
      } else if (!this.twinsReviving && !this.twinReviveCooldown) {
        let deadBoss = null;
        let aliveBoss = null;
        if (this.currentBoss.hp <= 0 && this.sisterBoss && this.sisterBoss.hp > 0) { deadBoss = this.currentBoss; aliveBoss = this.sisterBoss; }
        else if (this.sisterBoss && this.sisterBoss.hp <= 0 && this.currentBoss.hp > 0) { deadBoss = this.sisterBoss; aliveBoss = this.currentBoss; }
        
        if (deadBoss && aliveBoss && aliveBoss.active) {
          this.twinsReviving = true;
          let isBrotherDefeated = (deadBoss === this.currentBoss);
          
          if (this.twinReviveTimer) this.twinReviveTimer.destroy();
          if (this.twinReviveAnimTimer) this.twinReviveAnimTimer.destroy();
          this.cameras.main.shake(500, 0.01);
          
          let totalReviveTime = 6000;
          let animDuration = 2500;
          let delayBeforeAnim = totalReviveTime - animDuration;

          if (isBrotherDefeated && this.sisterBoss) {
              this.twinReviveAnimTimer = this.time.delayedCall(delayBeforeAnim, () => {
                  if (this.sisterBoss && this.sisterBoss.active) {
                      this.sisterBoss.play('sister_revive_anim');
                  }
              });
          } else if (!isBrotherDefeated && this.currentBoss) {
              this.twinReviveAnimTimer = this.time.delayedCall(delayBeforeAnim, () => {
                  if (this.currentBoss && this.currentBoss.active) {
                      this.currentBoss.play('brother_revive_anim');
                  }
              });
          }
          
          this.twinReviveTimer = this.time.delayedCall(totalReviveTime, () => {
             this.twinsReviving = false;
             this.twinReviveCooldown = true;
             this.time.delayedCall(10000, () => { this.twinReviveCooldown = false; });
             
             deadBoss.active = true;
             deadBoss.setVisible(true);
             deadBoss.body.enable = true;
             deadBoss.hp = Math.max(1, aliveBoss.hp); 
             
             if (isBrotherDefeated && this.sisterBoss && this.sisterBoss.active) {
                 this.sisterBoss.play('sister_shoot_anim');
             } else if (!isBrotherDefeated && this.currentBoss && this.currentBoss.active) {
                 if (this.anims.exists('brother_idle')) this.currentBoss.play('brother_idle');
                 else this.currentBoss.setTexture('brother_normal');
             }
             
             let speakerText = isBrotherDefeated ? 'エナリア「兄さん！起きて！」' : 'エディオ「しっかりしろ！」';
             let speakerColor = isBrotherDefeated ? '#FF4B6E' : '#4FD1FF';
             let floatText = this.add.text(aliveBoss.x, aliveBoss.y - 80, speakerText, { fontFamily: '"DotGothic16"', fontSize: '28px', color: speakerColor }).setOrigin(0.5).setDepth(200);
             this.tweens.add({ targets: floatText, y: floatText.y - 40, alpha: 0, duration: 2500, ease: 'Power1', onComplete: () => floatText.destroy() });
          });
        }
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
      MOT.Audio.playBleep('');
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
          bullet.damage = 8; // 必殺技ダメージ
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
    if (this.twinsReviving) return;
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
      if (this.isLaneBeamActive) return;
      this.fireLaneBeam();
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
        // 妹の星型ゲージ攻撃（シルバー化）
        this.fireStarGauge(Phaser.Math.Between(1, 3), true);
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
                
                // 当たり判定は150msで消える（ビジュアルが残っていても判定は消す）
                this.time.delayedCall(150, () => {
                  laserData.active = false;
                });
                
                this.tweens.add({
                  targets: beam, alpha: 0, duration: 500, onComplete: () => {
                    beam.destroy();
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
    
    // 見た目に対して当たり判定が大きすぎないように絶妙に調整
    let bw = slash.width * 0.55;
    let bh = slash.height * 0.55;
    slash.body.setSize(bw, bh);
    slash.body.setOffset((slash.width - bw) / 2, (slash.height - bh) / 2);
    
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
    
    if (this.currentBoss && this.currentBoss.configKey === 'boss3_twins') {
      this.currentBoss.play('brother_warn');
    }
    
    const laneYs = [220, 460, 700];
    let targetY = laneYs[Phaser.Math.Between(0, 2)];
    
    if (this.currentBoss && this.currentBoss.configKey === 'boss3_twins') {
      if (this.sisterBoss && this.sisterBoss.active) {
        var sisterTarget = this.sisterBoss.targetLaneY || this.sisterBoss.y;
        var sisterBaseY = laneYs.reduce((prev, curr) => Math.abs(curr - sisterTarget) < Math.abs(prev - sisterTarget) ? curr : prev);
        var available = laneYs.filter(y => y !== sisterBaseY);
        if (available.length > 0) {
          targetY = available[Phaser.Math.Between(0, available.length - 1)];
        }
      }
      this.currentBoss.targetLaneY = targetY;
      this.tweens.killTweensOf(this.currentBoss);
      this.tweens.add({ targets: this.currentBoss, y: targetY, duration: 800, ease: 'Cubic.easeInOut' });
    }
    
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
      
      if (this.currentBoss && this.currentBoss.configKey === 'boss3_twins') {
        this.currentBoss.play('brother_fire');
      }
      
      // レーザー実体
      let beam = this.add.rectangle(1920 / 2, targetY, 1920, 100, 0x4FD1FF, 1).setDepth(9);
      this.physics.add.existing(beam);
      beam.body.setAllowGravity(false);
      beam.body.setImmovable(true);
      
      // プレイヤーとの衝突判定
      let collider = this.physics.add.overlap(this.player, beam, (p, b) => {
        this.onPlayerHit(p, { destroy: () => {} });
      });
      
      // レーザーの当たり判定は短時間で消滅させる（残像に当たり判定を残さない）
      this.time.delayedCall(500, () => {
        if (collider) collider.destroy();
      });
      
      // レーザー消滅 (視覚的)
      this.tweens.add({
        targets: beam,
        alpha: 0,
        duration: 800, // 長すぎると謎の当たり判定と誤認されるため短縮
        delay: 400,
        onComplete: () => {
          beam.destroy();
          if (this.currentBoss && this.currentBoss.configKey === 'boss3_twins') {
            this.currentBoss.play('brother_idle');
          }
          this.isLaneBeamActive = false;
        }
      });
    });
  }

  fireStarGauge(numCells, isSilver) {
    if (this.dialogActive) return;
    if (!this.player || !this.player.active) return;
    
    let availableCells = [];
    for (let c = 0; c < 3; c++) {
      for (let l = 0; l < 3; l++) {
        availableCells.push({col: c, lane: l});
      }
    }
    Phaser.Utils.Array.Shuffle(availableCells);
    let cells = availableCells.slice(0, numCells);
    
    const COL_XS = [150, 300, 450];
    const LANE_YS = [220, 460, 700];

    cells.forEach(cell => {
      let x = COL_XS[cell.col];
      let y = LANE_YS[cell.lane];
      
      // The star icon acts as the gauge
      let star = this.add.sprite(x, y, 'bullet_star').setAlpha(0.8).setDepth(9);
      if (isSilver) star.setTintFill(0xE0E0E0);
      else star.setTint(0x7CFF00); 
      
      star.setScale(0.1); 
      this.tweens.add({ targets: star, angle: 360, duration: 2000, repeat: -1 });
      
      // 3 seconds charge
      this.tweens.add({
        targets: star,
        scaleX: 4,
        scaleY: 4,
        alpha: 1,
        duration: 3000,
        onComplete: () => {
          if (!this.scene) return;
          if (this.player && this.player.active && this.player.currentCol === cell.col && this.player.currentLane === cell.lane) {
            this.onPlayerHit(this.player, { destroy: () => {} });
          }
          this.showExplosion(x, y);
          MOT.Audio.playExplosion();
          star.destroy();
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
        
        // 追尾式反射弾
        const reflectBullet = this.playerBullets.create(player.x + 30, player.y, 'bullet_player');
        if (reflectBullet) {
          reflectBullet.setScale(3);
          reflectBullet.setTint(color); 
          reflectBullet.damage = 5; 

          let target = (this.currentBoss && this.currentBoss.active) ? this.currentBoss : null;
          if (!target && this.enemyGroup) {
            let closestDist = 999999;
            this.enemyGroup.getChildren().forEach(e => {
              if (e.active) {
                let d = Phaser.Math.Distance.Between(player.x, player.y, e.x, e.y);
                if (d < closestDist) {
                  closestDist = d;
                  target = e;
                }
              }
            });
          }

          if (target) {
            reflectBullet.homingTarget = target;
            this.physics.moveToObject(reflectBullet, target, 1400);
          } else {
            reflectBullet.setVelocityX(1400);
          }

          const homeTimer = this.time.addEvent({
            delay: 30,
            loop: true,
            callback: () => {
              if (!reflectBullet.active) {
                homeTimer.destroy();
                return;
              }
              if (reflectBullet.homingTarget && reflectBullet.homingTarget.active) {
                this.physics.moveToObject(reflectBullet, reflectBullet.homingTarget, 1400);
              }
            }
          });

          this.time.delayedCall(2000, function () {
            if (homeTimer) homeTimer.destroy();
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
    if (this.isDoctorPhase1Unwinnable) {
      // 博士Phase 1の理不尽な攻撃：1発で致命傷（HP0）
      dmg = Math.max(dmg, MOT.flags.playerHP || 1);
    }
    MOT.flags.playerHP -= dmg;
    if (MOT.flags.playerHP < 0) MOT.flags.playerHP = 0;
    this.updateHUD();
    this.cameras.main.shake(150, 0.008);
    this.playerInvincible = true;
    player.setTint(0xFF4B6E);
    this.tweens.add({
      targets: player, alpha: 0.3, yoyo: true, repeat: 3, duration: 100,
      onComplete: function () { player.setAlpha(1); player.clearTint(); this.playerInvincible = false; }.bind(this)
    });
    if (MOT.flags.playerHP <= 0) {
      if (this.isDoctorPhase1Unwinnable) {
        this.triggerDoctorPhase1Defeat();
        return;
      }
      if (!this.isDoctorPhase1Unwinnable && this.currentBoss && this.currentBoss.configKey === 'doctor' && Phaser.Math.Between(0, 100) < 50) {
        // 兄が確率で助けてくれる
        MOT.flags.playerHP = 1;
        this.playerInvincible = true;
        this.time.delayedCall(3000, () => { this.playerInvincible = false; });
        
        MOT.Audio.playBleep('');
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
      this.time.delayedCall(1000, function () { let __img = document.getElementById('trueDemonLordImg'); if (__img) __img.remove(); this.scene.start('EndingScene'); }, [], this);
    }
  }

  fireDoctorUnavoidableAttack() {
    if (this.phase1DefeatTriggered) return;
    // 博士の理不尽な全画面攻撃
    this.cameras.main.shake(700, 0.04);
    MOT.Audio.playExplosion();
    const flash = this.add.rectangle(1920 / 2, 1080 / 2, 1920, 1080, 0xffffff, 0.9).setDepth(200000);
    this.tweens.add({ targets: flash, alpha: 0, duration: 800, onComplete: () => flash.destroy() });

    // 全レーンにシルバーの極大レーザーを走らせる
    [220, 460, 700].forEach(laneY => {
      const beam = this.add.rectangle(1920 / 2, laneY, 1920, 160, 0xE0E0E0, 0.85).setDepth(15);
      this.tweens.add({ targets: beam, scaleY: 2, alpha: 0, duration: 600, onComplete: () => beam.destroy() });
    });

    // プレイヤー被弾ダウン演出 & HP0
    MOT.flags.playerHP = 0;
    this.updateHUD();
    if (this.hpText) {
      this.tweens.add({
        targets: this.hpText,
        alpha: { from: 1, to: 0.2 },
        scaleX: 1.3,
        scaleY: 1.3,
        yoyo: true,
        repeat: 3,
        duration: 80,
        onComplete: () => {
          if (this.hpText) {
            this.hpText.setScale(1);
            this.hpText.setAlpha(1);
          }
        }
      });
    }
    this.player.setTint(0xFF4B6E);
    this.cameras.main.flash(300, 255, 50, 50);

    this.time.delayedCall(700, () => {
      this.triggerDoctorPhase1Defeat();
    });
  }

  triggerDoctorPhase1Defeat() {
    if (this.phase1DefeatTriggered) return;
    this.phase1DefeatTriggered = true;
    this.cutsceneActive = true;
    this.dialogActive = true;
    this.physics.pause();
    this.playerInvincible = true;
    MOT.flags.playerHP = 0; // ハート表示をゼロにする
    this.updateHUD();

    // 戦闘処理・ボスの攻撃・移動・弾を完全に停止して非表示
    this.bossAttackTimer = 0;
    if (this.bossLaneTimer) {
      this.bossLaneTimer.destroy();
      this.bossLaneTimer = null;
    }
    if (this.currentBoss) {
      this.tweens.killTweensOf(this.currentBoss);
      this.currentBoss.setVisible(false);
      this.currentBoss.setActive(false);
    }
    if (this.enemyBullets) this.enemyBullets.clear(true, true);
    if (this.playerBullets) this.playerBullets.clear(true, true);

    const w = 1920, h = 1080;
    const heroName = MOT.flags.heroName || '勇者';

    // 既存の立ち絵を安全に破棄
    if (this.dimBg && this.dimBg.destroy) { this.dimBg.destroy(); this.dimBg = null; }
    if (this.heroImage && this.heroImage.destroy) { this.heroImage.destroy(); this.heroImage = null; }
    if (this.doctorImage && this.doctorImage.destroy) { this.doctorImage.destroy(); this.doctorImage = null; }
    if (this.demonImage && this.demonImage.destroy) { this.demonImage.destroy(); this.demonImage = null; }
    if (this.rightSpeakerImage && this.rightSpeakerImage.destroy) { this.rightSpeakerImage.destroy(); this.rightSpeakerImage = null; }

    // 暗転背景
    this.dimBg = this.add.rectangle(w / 2, h / 2, w, h, 0x000000, 0.6).setAlpha(0).setDepth(89);

    // 立ち絵を新規生成（※魔王は最初非表示 alpha: 0）
    this.heroImage = this.add.image(300, h / 2, 'hero_stand').setAlpha(0).setDepth(90);
    const hScale = 750 / (this.heroImage.width || 750);
    this.heroImage.setScale(hScale);
    this.heroImage.setY(100 + ((this.heroImage.height || 1000) * hScale) / 2);

    this.doctorImage = this.add.image(w - 300, h / 2, 'doctor_awaken_smile_weapon').setAlpha(0).setDepth(90);
    const docScale = 900 / (this.doctorImage.width || 750);
    this.doctorImage.setScale(docScale);
    this.doctorImage.setY(100 + ((this.doctorImage.height || 1000) * docScale) / 2);

    this.demonImage = this.add.image(w - 300, h / 2, 'demon_lord_normal').setAlpha(0).setDepth(90);
    const demScale = 850 / (this.demonImage.width || 750);
    this.demonImage.setScale(demScale);
    this.demonImage.setY(100 + ((this.demonImage.height || 1000) * demScale) / 2 - 50);

    this.tweens.add({ targets: this.dimBg, alpha: 0.6, duration: 300 });

    const safeTween = (target, alpha) => {
      if (target && target.active) {
        this.tweens.add({ targets: target, alpha: alpha, duration: 300 });
      }
    };

    let lastRightSpeaker = 'doctor';

    const sayDoctorDefeat = (text) => new Promise(res => {
      lastRightSpeaker = 'doctor';
      safeTween(this.dimBg, 0.6);
      safeTween(this.doctorImage, 1);
      safeTween(this.demonImage, 0);
      if (this.rightSpeakerImage) safeTween(this.rightSpeakerImage, 0);
      safeTween(this.heroImage, 0.4);
      this.showDialogue('博士', text, res);
    });

    const sayDemonDefeat = (text) => new Promise(res => {
      lastRightSpeaker = 'demon';
      safeTween(this.dimBg, 0.6);
      safeTween(this.demonImage, 1);
      safeTween(this.doctorImage, 0);
      if (this.rightSpeakerImage) safeTween(this.rightSpeakerImage, 0);
      safeTween(this.heroImage, 0.4);
      this.showDialogue('魔王', text, res);
    });

    // 敗北時の主人公（名前を取り戻す前なので話者名「勇者」）
    const sayHeroPhase1 = (text) => new Promise(res => {
      safeTween(this.dimBg, 0.6);
      safeTween(this.heroImage, 1);
      if (lastRightSpeaker === 'doctor') {
        safeTween(this.doctorImage, 0.4);
        safeTween(this.demonImage, 0);
      } else {
        safeTween(this.demonImage, 0.4);
        safeTween(this.doctorImage, 0);
      }
      if (this.rightSpeakerImage) safeTween(this.rightSpeakerImage, 0);
      this.showDialogue('勇者', text, res);
    });

    (async () => {
      try {
        // 1. 敗北時会話
        await sayHeroPhase1('「ぐっっっ……」');
        await sayDoctorDefeat('「はははは。しょせん、お前は俺の創造物だ。俺を超えることなどできないのだよ。」');
        await sayDemonDefeat('「それは違うぞ！」');
        await sayDemonDefeat('「一人でなら敵わなくても、我らが協力したらどうじゃ？」');
        await sayDoctorDefeat('「でもそちらは満身創痍みたいだが？」');
        await sayDoctorDefeat('「お前らが完全な状態でも太刀打ちできないこの私に、そんな状態で勝てると本気で思っているのか？」');
        await sayDemonDefeat('「っ……。」');

        // 2. 勇者の独白：勇者以外背景も含め暗くする（dimBg 0.88）
        const sayHeroSoliloquy = (text) => new Promise(res => {
          safeTween(this.dimBg, 0.88);
          safeTween(this.heroImage, 1);
          safeTween(this.doctorImage, 0);
          safeTween(this.demonImage, 0);
          if (this.rightSpeakerImage) safeTween(this.rightSpeakerImage, 0);
          this.showDialogue('勇者', text, res);
        });

        safeTween(this.dimBg, 0.88);
        safeTween(this.heroImage, 1);
        safeTween(this.doctorImage, 0);
        safeTween(this.demonImage, 0);

        // 心の叫び
        await sayHeroSoliloquy('「（ああ、結局僕は人形なのか……。」');

        // 「負けるわけにはいかないんだ」のセリフのところでBGMをフェードアウト
        const activeBgms = [this.boss5Bgm, this.boss4Bgm, this.twinsBgm, this.boss2Bgm, this.boss1Bgm, this.bgm].filter(b => b && b.isPlaying);
        activeBgms.forEach(bgm => {
          this.tweens.addCounter({
            from: bgm.volume || 0.2,
            to: 0,
            duration: 1500,
            onUpdate: (tw) => {
              if (bgm && bgm.isPlaying) {
                try { bgm.setVolume(tw.getValue()); } catch (e) {}
              }
            },
            onComplete: () => {
              try { bgm.stop(); } catch (e) {}
            }
          });
        });

        await sayHeroSoliloquy('「でも、でも、そうだとしても、負けるわけにはいかないんだ……！！！）」');

        // 3. ノイズかかって暗転
        this.cameras.main.shake(500, 0.03);
        this.cameras.main.fadeOut(800, 0, 0, 0);
        await new Promise(r => this.time.delayedCall(800, r));

        // ターミナル中は立ち絵を非表示
        if (this.dimBg && this.dimBg.active) this.dimBg.setAlpha(0);
        if (this.heroImage && this.heroImage.active) this.heroImage.setAlpha(0);
        if (this.doctorImage && this.doctorImage.active) this.doctorImage.setAlpha(0);
        if (this.demonImage && this.demonImage.active) this.demonImage.setAlpha(0);
        if (this.rightSpeakerImage && this.rightSpeakerImage.active) this.rightSpeakerImage.setAlpha(0);

        // 4. GGS Terminal (Spaceキー / クリックで進行)
        this.cameras.main.fadeIn(300, 0, 0, 0);
        await this.terminalEffect([
          '...link established',
          '...signal stable: 1.00',
          '',
          'こんにちは。『GGS』よ。',
          '',
          '悪性因子、消失を確認。',
          '',
          '世界構造、再計測完了。観測値、許容範囲内。',
          '',
          'あなたは宿命を果たした。あなたの行動は祝福を授けるに値する。',
          'あなたの望みを叶えよう。',
          '個体情報、更新。',
          'Designation："勇者" → "' + heroName + '"',
          '登録情報、書き換え完了。',
          'あなたは、もう人造人間ではない。',
          'この世界に生きる、一人の人間──"' + heroName + '"として認証する。',
          'ただの人間”' + heroName + '”として、自由に生きなさい。',
          '',
          '...logging complete',
          '...connection closed'
        ]);

        // 5. 暗転終了後。勇者以外背景も含め暗くして心臓の音を鳴らす（勇者の覚醒）
        const sayHeroAwakening = (speakerName, text) => new Promise(res => {
          safeTween(this.dimBg, 0.88);
          safeTween(this.heroImage, 1);
          safeTween(this.doctorImage, 0);
          safeTween(this.demonImage, 0);
          if (this.rightSpeakerImage) safeTween(this.rightSpeakerImage, 0);
          this.showDialogue(speakerName, text, res);
        });

        safeTween(this.dimBg, 0.88);
        safeTween(this.heroImage, 1);
        safeTween(this.doctorImage, 0);
        safeTween(this.demonImage, 0);

        // BGMに心臓の音を開始
        if (MOT.Audio && MOT.Audio.startHeartbeat) MOT.Audio.startHeartbeat();

        // 話者名最初は「？？？」、次は「heroName」
        await sayHeroAwakening('？？？', '「そうだ。僕は”' + heroName + '”だ。」');
        await sayHeroAwakening(heroName, '「僕は…まだ倒れるわけにはいかないんだ！！」');

        // 心臓の音を停止（BGMなしの静寂）
        if (MOT.Audio && MOT.Audio.stopHeartbeat) MOT.Audio.stopHeartbeat();

        // 6. 通常会話パートへ移行（右側の会話相手立ち絵を切り替え）
        const setRightSpeaker = (speakerName, texKey, scaleTargetW = 750, yOffset = 0) => {
          if (!this.textures.exists(texKey)) {
            console.warn('Texture not found:', texKey);
            return;
          }
          if (!this.rightSpeakerImage || !this.rightSpeakerImage.active) {
            this.rightSpeakerImage = this.add.image(w - 300, h / 2, texKey).setDepth(90).setAlpha(0);
          } else {
            this.rightSpeakerImage.setTexture(texKey);
            this.rightSpeakerImage.setVisible(true);
          }
          const frame = this.textures.getFrame(texKey);
          const imgW = (frame && frame.width) || 750;
          const imgH = (frame && frame.height) || 1000;
          const scale = scaleTargetW / imgW;
          this.rightSpeakerImage.setScale(scale);
          this.rightSpeakerImage.setY(100 + (imgH * scale) / 2 + yOffset);
        };

        const sayRight = (speaker, texKey, text, targetW = 750, yOff = 0) => new Promise(res => {
          setRightSpeaker(speaker, texKey, targetW, yOff);
          safeTween(this.dimBg, 0.6);
          safeTween(this.rightSpeakerImage, 1);
          safeTween(this.heroImage, 0.4);
          if (this.doctorImage) this.doctorImage.setAlpha(0);
          if (this.demonImage) this.demonImage.setAlpha(0);
          this.showDialogue(speaker, text, res);
        });

        const sayHeroNormal = (text) => new Promise(res => {
          safeTween(this.dimBg, 0.6);
          safeTween(this.heroImage, 1);
          if (this.rightSpeakerImage) safeTween(this.rightSpeakerImage, 0.4);
          if (this.doctorImage) this.doctorImage.setAlpha(0);
          if (this.demonImage) this.demonImage.setAlpha(0);
          this.showDialogue(heroName, text, res);
        });

        const sayDoctor = (text) => sayRight('博士', 'doctor_awaken_smile_weapon', text, 900, 0);
        const sayEnaria = (text) => sayRight('エナリア', 'sister_normal', text, 650, 40);
        const sayEdio = (text) => sayRight('エディオ', 'brother_normal', text, 700, 20);
        const sayKratos = (text) => sayRight('クラトス', 'boss1_normal', text, 800, 0);
        const sayTourelos = (text) => sayRight('トゥレロス', 'boss2_normal', text, 750, 20);
        const sayDemon = (text) => sayRight('魔王', 'demon_lord_normal', text, 850, -50);

        // 会話パート開始
        if (this.doctorImage) this.doctorImage.setAlpha(0);
        if (this.demonImage) this.demonImage.setAlpha(0);

        await sayDoctor('「なんだ！？」');
        await sayHeroNormal('「僕は博士から与えられた”勇者”じゃない。”兵器”でもない。」');
        await sayHeroNormal('「僕は僕として選択をする。誰かに従ったりなんかしない！」');

        await sayDoctor('「チッ、忌々しい。」');
        await sayDoctor('「1100と1101に引き続き、揃いも揃って感情に目覚めおって！」');
        await sayDoctor('「感情なんてお前らには必要ないものだというのに！」');

        await sayEnaria('「忌々しいですって？自分で創った存在なのに随分な物言いね。」');
        await sayEdio('「まぁ博士にとって僕らは都合のいい駒でしかなかったわけだし、仕方ないよ」');
        await sayEdio('「責任持って、僕ら”博士の創造物”が片をつけてあげよう」');
        await sayKratos('「格上と直接戦うのは久しぶりだ！楽しみだぜ」');
        await sayTourelos('「いや、正面切って今は戦うのはやめとけよ。お前、まだ怪我治ってなくね？」');
        await sayKratos('「そんなの関係ねぇ！俺は戦う！！」');
        await sayTourelos('「……。」');
        await sayDemon('「後方支援はわらわたちに任せろ！」');

        // 勇者の「今度こそ、決着をつけよう」
        await sayHeroNormal('「今度こそ、決着をつけよう」');

        // 立ち絵と暗転背景をスムーズにフェードアウト
        const fadeTargets = [this.dimBg, this.heroImage, this.doctorImage, this.demonImage, this.rightSpeakerImage].filter(t => t && t.active);
        if (fadeTargets.length > 0) {
          await new Promise(res => {
            let resolved = false;
            const cleanup = () => {
              if (resolved) return;
              resolved = true;
              fadeTargets.forEach(t => { if (t && t.destroy) t.destroy(); });
              this.dimBg = null;
              this.heroImage = null;
              this.doctorImage = null;
              this.demonImage = null;
              this.rightSpeakerImage = null;
              res();
            };
            this.tweens.add({
              targets: fadeTargets,
              alpha: 0,
              duration: 500,
              onComplete: cleanup
            });
            setTimeout(cleanup, 600);
          });
        }
      } catch (err) {
        console.error('Error during defeat sequence:', err);
      } finally {
        // 万一エラーになっても確実に立ち絵や暗転を破棄
        [this.dimBg, this.heroImage, this.doctorImage, this.demonImage, this.rightSpeakerImage].forEach(t => {
          if (t && t.destroy) t.destroy();
        });
        this.dimBg = null;
        this.heroImage = null;
        this.doctorImage = null;
        this.demonImage = null;
        this.rightSpeakerImage = null;
      }

      // 7. Phase 2 博士戦準備 (HP 1000, 勇者復活)
      this.isDoctorPhase1Unwinnable = false;
      this.phase1DefeatTriggered = false;
      MOT.flags.playerHP = MOT.flags.playerMaxHP || 5;
      this.updateHUD();
      this.heroAttackSpeedBoost = true;
      this.heroFirepowerBoost = true;
      this.inunekoBoostActive = true;

      // ボスの確実な再活性化・出現
      if (!this.currentBoss || !this.currentBoss.active) {
        const cfg = this.getBossConfig('doctor');
        this.currentBoss = this.physics.add.sprite(1400, 460, 'doctor_combat');
        this.currentBoss.setScale(cfg ? cfg.scale : 2.5);
        this.currentBoss.setDepth(8);
        this.enemyGroup.add(this.currentBoss);
        this.currentBoss.configKey = 'doctor';
      }
      this.tweens.killTweensOf(this.currentBoss);
      this.currentBoss.setTexture('doctor_combat');
      this.currentBoss.setVisible(true);
      this.currentBoss.setActive(true);
      this.currentBoss.setAlpha(1);
      this.currentBoss.setPosition(1400, 460);
      if (this.currentBoss.body) {
        this.currentBoss.body.enable = true;
        this.currentBoss.body.reset(1400, 460);
      }
      this.currentBoss.hp = 1000;
      this.bossMaxHP = 1000;
      this.bossHP = 1000;

      // 急にはじまるのではなく、数秒（2秒間）対峙の静寂・タメを設ける
      await new Promise(r => {
        let done = false;
        const cb = () => { if (!done) { done = true; r(); } };
        this.time.delayedCall(2000, cb);
        setTimeout(cb, 2100);
      });

      // 博士戦のBGMを確実に再生
      if (this.boss5Bgm) {
        try { this.boss5Bgm.stop(); this.boss5Bgm.destroy(); } catch (e) {}
      }
      this.boss5Bgm = this.sound.add('doctor_bgm', { loop: true, volume: 0.25 });
      this.boss5Bgm.play();

      this.cutsceneActive = false;
      this.dialogActive = false;
      this.playerInvincible = false;
      this.physics.resume();
      this.startBossLaneMovement();
    })();
  }

  terminalEffect(lines) {
    return new Promise(resolve => {
      this.cutsceneActive = true;
      this.dialogActive = true;
      const w = 1920, h = 1080;
      
      // 背景 (CRTモニター風の深い黒緑)
      const bg = this.add.rectangle(0, 0, w, h, 0x030803).setOrigin(0).setDepth(200);

      // CRTスキャンライン（走査線）オーバーレイ
      const scanlines = this.add.graphics().setDepth(201);
      scanlines.fillStyle(0x000000, 0.35);
      for (let y = 0; y < h; y += 4) {
        scanlines.fillRect(0, y, w, 2);
      }

      // 送りガイド
      const guideText = this.add.text(w - 60, h - 40, '▶ [SPACE / クリック] 文字送り / 進行', {
        fontFamily: '"DotGothic16", "Courier New", monospace',
        fontSize: '20px',
        color: '#00FF66'
      }).setOrigin(1, 1).setDepth(203);

      const guideTween = this.tweens.add({
        targets: guideText,
        alpha: 0.3,
        duration: 600,
        yoyo: true,
        repeat: -1
      });

      // 行数に応じた開始Y座標（画面中央付近に美しく配置）
      const totalLines = lines.length;
      const lineHeight = 40;
      const totalH = totalLines * lineHeight;
      const startX = w / 2 - 500;
      const startY = Math.max(60, Math.min(200, (h - totalH) / 2));

      const textObj = this.add.text(startX, startY, '', {
        fontFamily: '"DotGothic16", "Courier New", Courier, monospace',
        fontSize: '26px',
        color: '#00FF66',
        fontStyle: 'bold',
        lineSpacing: 14,
        shadow: {
          offsetX: 0,
          offsetY: 0,
          color: '#00FF66',
          blur: 10,
          stroke: true,
          fill: true
        }
      }).setDepth(202);

      let currentLine = 0;
      let currentChar = 0;
      let displayText = "";
      let cursorChar = "■";
      let isTypingDone = false;
      let timerEvent = null;

      // カーソル点滅タイマー
      const cursorTimer = this.time.addEvent({
        delay: 450,
        loop: true,
        callback: () => {
          cursorChar = (cursorChar === "■") ? " " : "■";
          if (textObj && textObj.active) {
            textObj.setText(displayText + cursorChar);
          }
        }
      });

      const cleanupAndResolve = () => {
        if (timerEvent) timerEvent.remove();
        if (cursorTimer) cursorTimer.remove();
        if (guideTween) guideTween.stop();
        this.input.keyboard.off('keydown-SPACE', handleInput);
        this.input.keyboard.off('keydown-ENTER', handleInput);
        this.input.off('pointerdown', handleInput);
        guideText.destroy();
        textObj.destroy();
        scanlines.destroy();
        bg.destroy();
        resolve();
      };

      const stepTyping = () => {
        if (currentLine >= lines.length) {
          isTypingDone = true;
          return;
        }

        const lineText = lines[currentLine];
        if (currentChar < lineText.length) {
          displayText += lineText[currentChar];
          textObj.setText(displayText + "■");
          currentChar++;

          let delay = 16;
          const lastChar = lineText[currentChar - 1];
          if (lastChar === '。' || lastChar === '、' || lastChar === '！' || lastChar === '？') {
            delay = 140;
          } else if (lastChar === ' ') {
            delay = 5;
          }

          timerEvent = this.time.delayedCall(delay, stepTyping);
        } else {
          // 行末
          displayText += "\n";
          textObj.setText(displayText + "■");
          currentLine++;
          currentChar = 0;
          timerEvent = this.time.delayedCall(lines[currentLine] === "" ? 40 : 80, stepTyping);
        }
      };

      const handleInput = () => {
        if (MOT.Audio && MOT.Audio.playBleep) MOT.Audio.playBleep('');

        if (!isTypingDone) {
          // タイピング中なら、現在の行を即座に全文出して次の行に進める（文字送り）
          if (timerEvent) timerEvent.remove();

          if (currentLine < lines.length) {
            const lineText = lines[currentLine];
            // 残りの文字を一気に出す
            if (currentChar < lineText.length) {
              displayText += lineText.substring(currentChar);
            }
            displayText += "\n";
            currentLine++;
            currentChar = 0;
            textObj.setText(displayText + "■");

            if (currentLine >= lines.length) {
              isTypingDone = true;
            } else {
              // 次の行のタイピングを即座に再開
              timerEvent = this.time.delayedCall(60, stepTyping);
            }
          } else {
            isTypingDone = true;
          }
        } else {
          // タイピング完了済みなら終了して進行
          cleanupAndResolve();
        }
      };

      this.input.keyboard.on('keydown-SPACE', handleInput);
      this.input.keyboard.on('keydown-ENTER', handleInput);
      this.input.on('pointerdown', handleInput);

      // 初回開始
      stepTyping();
    });
  }

  askDemonLordShatterChoice(sayDoctor, sayHero) {
    return new Promise(resolve => {
      const w = 1920, h = 1080;
      let isBusy = false;
      let isGrayedOut = false;
      let hasIntervened = false;
      let opt1Destroyed = false;
      let resistanceCount = 0;
      let selectedIdx = 0; // 0: 殺す, 1: 殺さない

      this.dialogActive = true;
      this.choiceActive = true;

      let uiElements = [];
      let crackGfx = null;
      let crackBranches = [];

      // 半透明背景オーバーレイ
      const overlay = this.add.graphics();
      overlay.fillStyle(0x000000, 0.55);
      overlay.fillRect(0, 0, w, h);
      overlay.setDepth(200000).setScrollFactor(0);
      uiElements.push(overlay);

      // [ENTER] KEY 決定ガイド
      const enterGuide = this.add.text(w - 100, h - 60, '▶ [ENTER] KEY', {
        fontFamily: '"Press Start 2P"',
        fontSize: '20px',
        color: '#9CA3AF'
      }).setOrigin(1, 0.5).setDepth(200001).setScrollFactor(0);
      this.tweens.add({ targets: enterGuide, alpha: 0.3, yoyo: true, repeat: -1, duration: 500 });
      uiElements.push(enterGuide);

      // 選択肢コンテナ（他の showChoice と同一レイアウト: 1100x90, 間隔 120）
      const startY = h / 2 - 60;
      const choicesData = [
        { text: '1. 殺す', val: 1 },
        { text: '2. 殺さない', val: 2 }
      ];
      const choicesList = [];

      choicesData.forEach((choice, i) => {
        const y = startY + i * 120;
        const btn = this.add.rectangle(w / 2, y, 1100, 90, 0x1F2933)
          .setStrokeStyle(2, 0x4FD1FF)
          .setInteractive({ useHandCursor: true })
          .setDepth(200002)
          .setScrollFactor(0);

        const txt = this.add.text(w / 2, y, choice.text, {
          fontFamily: '"DotGothic16"',
          fontSize: '26px',
          color: '#4FD1FF'
        }).setOrigin(0.5).setDepth(200003).setScrollFactor(0);

        uiElements.push(btn, txt);
        choicesList.push({ btn, txt, val: choice.val, origY: y, origX: w / 2 });
      });

      const updateSelection = () => {
        if (opt1Destroyed) {
          // 「1. 殺す」が壊れた後は「2. 殺さない」だけが常に選ばれる
          selectedIdx = 1;
          if (choicesList[1] && choicesList[1].btn && choicesList[1].btn.active) {
            choicesList[1].btn.setFillStyle(0x3a3a5e);
            choicesList[1].btn.setStrokeStyle(4, 0xffffff);
            choicesList[1].txt.setColor('#ffffff');
            choicesList[1].btn.setScale(1.08);
            choicesList[1].txt.setScale(1.08);
          }
          return;
        }

        // 選択肢１（殺す）
        if (choicesList[0] && choicesList[0].btn && choicesList[0].btn.active) {
          if (selectedIdx === 0) {
            choicesList[0].btn.setFillStyle(0x3a3a5e);
            choicesList[0].btn.setStrokeStyle(4, 0xffffff);
            choicesList[0].txt.setColor('#ffffff');
            choicesList[0].btn.setScale(1.08);
            choicesList[0].txt.setScale(1.08);
          } else {
            choicesList[0].btn.setFillStyle(0x1F2933);
            choicesList[0].btn.setStrokeStyle(2, 0x4FD1FF);
            choicesList[0].txt.setColor('#4FD1FF');
            choicesList[0].btn.setScale(1.0);
            choicesList[0].txt.setScale(1.0);
          }
        }

        // 選択肢２（殺さない）
        if (choicesList[1] && choicesList[1].btn && choicesList[1].btn.active) {
          if (isGrayedOut) {
            // 灰色になって選択できなくなる
            choicesList[1].btn.setFillStyle(0x14181f);
            choicesList[1].btn.setStrokeStyle(2, 0x2e3846);
            choicesList[1].txt.setColor('#4b5563');
            choicesList[1].btn.setScale(1.0);
            choicesList[1].txt.setScale(1.0);
          } else {
            if (selectedIdx === 1) {
              choicesList[1].btn.setFillStyle(0x3a3a5e);
              choicesList[1].btn.setStrokeStyle(4, 0xffffff);
              choicesList[1].txt.setColor('#ffffff');
              choicesList[1].btn.setScale(1.08);
              choicesList[1].txt.setScale(1.08);
            } else {
              choicesList[1].btn.setFillStyle(0x1F2933);
              choicesList[1].btn.setStrokeStyle(2, 0x4FD1FF);
              choicesList[1].txt.setColor('#4FD1FF');
              choicesList[1].btn.setScale(1.0);
              choicesList[1].txt.setScale(1.0);
            }
          }
        }
      };
      updateSelection();

      const setUIVisible = (visible) => {
        uiElements.forEach(el => {
          if (el && el.setAlpha && el.active) {
            el.setAlpha(visible ? 1 : 0);
          }
        });
        if (visible) {
          updateSelection();
        }
      };

      // ── 画面全体に広がる鮮烈な赤い線の結晶亀裂システム ──
      const impactX = w / 2;
      const impactY = startY + 60; // 選択肢中央の衝撃点

      let crackRays = [];
      let crackWebs = [];
      let crackFacets = [];

      const initCrackGraphics = () => {
        if (!crackGfx) {
          crackGfx = this.add.graphics().setDepth(200020).setScrollFactor(0);
          uiElements.push(crackGfx);
        }
        crackRays = [];
        crackWebs = [];
        crackFacets = [];

        // 衝撃点から走る12本の放射状の赤い亀裂
        const numRays = 12;
        for (let i = 0; i < numRays; i++) {
          const baseAngle = (i / numRays) * Math.PI * 2 + (Math.random() - 0.5) * 0.25;
          crackRays.push({
            angle: baseAngle,
            currX: impactX,
            currY: impactY,
            points: [{ x: impactX, y: impactY }]
          });
        }
      };

      const growCracks = (step) => {
        if (!crackGfx) initCrackGraphics();

        // 打撃瞬間の赤い閃光フラッシュ
        const hitFlash = this.add.rectangle(w / 2, h / 2, w, h, 0xff1744, 0.12 + step * 0.015).setDepth(200028).setScrollFactor(0);
        this.tweens.add({ targets: hitFlash, alpha: 0, duration: 90, onComplete: () => hitFlash.destroy() });

        // 衝撃点に走る赤いクロススパーク
        const flare = this.add.graphics().setDepth(200025).setScrollFactor(0);
        flare.lineStyle(3, 0xff1744, 0.95);
        flare.lineBetween(impactX - 50, impactY, impactX + 50, impactY);
        flare.lineBetween(impactX, impactY - 50, impactX, impactY + 50);
        flare.lineStyle(1.5, 0xff5252, 1.0);
        flare.lineBetween(impactX - 30, impactY, impactX + 30, impactY);
        flare.lineBetween(impactX, impactY - 30, impactX, impactY + 30);
        this.tweens.add({
          targets: flare,
          alpha: 0,
          scaleX: 1.8,
          scaleY: 1.8,
          duration: 180,
          onComplete: () => flare.destroy()
        });

        // step（1〜10）に応じて少しずつ画面全体へ伸びる
        const segLenBase = 22 + step * 7;

        crackRays.forEach((ray, rayIdx) => {
          ray.angle += (Math.random() - 0.5) * 0.45;
          const segLen = Phaser.Math.Between(segLenBase - 5, segLenBase + 14);
          ray.currX += Math.cos(ray.angle) * segLen;
          ray.currY += Math.sin(ray.angle) * segLen;
          const newPt = { x: ray.currX, y: ray.currY };
          ray.points.push(newPt);

          // 2. 隣接レイ間を結ぶ赤い結晶ウェブ
          if (step >= 2 && Math.random() < 0.6) {
            const nextRay = crackRays[(rayIdx + 1) % crackRays.length];
            if (nextRay.points.length > 1) {
              const p1 = newPt;
              const p2 = nextRay.points[nextRay.points.length - 1];
              crackWebs.push({ x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y });

              // 薄い赤い結晶ファセット
              if (Math.random() < 0.4 && ray.points.length >= 2) {
                const p0 = ray.points[ray.points.length - 2];
                crackFacets.push([
                  { x: p0.x, y: p0.y },
                  { x: p1.x, y: p1.y },
                  { x: p2.x, y: p2.y }
                ]);
              }
            }
          }

          // 3. 微細な赤いフォーク（枝分かれ）
          if (step >= 3 && Math.random() < 0.45 && ray.points.length > 2) {
            const startPt = ray.points[Phaser.Math.Between(1, ray.points.length - 1)];
            const forkAngle = ray.angle + (Math.random() > 0.5 ? 1 : -1) * (0.4 + Math.random() * 0.4);
            const forkLen = Phaser.Math.Between(15, 35 + step * 4);
            crackWebs.push({
              x1: startPt.x,
              y1: startPt.y,
              x2: startPt.x + Math.cos(forkAngle) * forkLen,
              y2: startPt.y + Math.sin(forkAngle) * forkLen
            });
          }
        });

        // 描画実行
        crackGfx.clear();

        // [Layer 1] 薄い赤い屈折ファセット（半透明ポリゴン）
        crackFacets.slice(-16).forEach(poly => {
          crackGfx.fillStyle(0xff1744, Phaser.Math.FloatBetween(0.04, 0.12));
          crackGfx.beginPath();
          crackGfx.moveTo(poly[0].x, poly[0].y);
          crackGfx.lineTo(poly[1].x, poly[1].y);
          crackGfx.lineTo(poly[2].x, poly[2].y);
          crackGfx.closePath();
          crackGfx.fillPath();
        });

        const drawAllLines = (ox = 0, oy = 0) => {
          crackRays.forEach(ray => {
            if (ray.points.length > 1) {
              crackGfx.beginPath();
              crackGfx.moveTo(ray.points[0].x + ox, ray.points[0].y + oy);
              for (let i = 1; i < ray.points.length; i++) {
                crackGfx.lineTo(ray.points[i].x + ox, ray.points[i].y + oy);
              }
              crackGfx.strokePath();
            }
          });
          crackWebs.forEach(web => {
            crackGfx.beginPath();
            crackGfx.moveTo(web.x1 + ox, web.y1 + oy);
            crackGfx.lineTo(web.x2 + ox, web.y2 + oy);
            crackGfx.strokePath();
          });
        };

        // [Layer 2] シャドウクラック（深紅・黒の下地）
        crackGfx.lineStyle(3.5, 0x2b0000, 0.7);
        drawAllLines(1, 1);

        // [Layer 3] 深紅のエネルギーオーラ（赤く光る外枠）
        crackGfx.lineStyle(4.5, 0xb71c1c, 0.65);
        drawAllLines(0, 0);

        // [Layer 4] 鮮烈なクリムゾンレッド（メインの赤い線）
        crackGfx.lineStyle(2.4, 0xff1744, 0.95);
        drawAllLines(0, 0);

        // [Layer 5] 最前面・鮮やかなハイライトレッド（ネオン朱色）
        crackGfx.lineStyle(1.2, 0xff5252, 1.0);
        drawAllLines(0, 0);

        // 衝撃波（赤いショックウェーブリング）
        const ring = this.add.circle(impactX, impactY, 15).setStrokeStyle(3, 0xff1744, 0.9).setDepth(200024).setScrollFactor(0);
        this.tweens.add({
          targets: ring,
          radius: 80 + step * 20,
          alpha: 0,
          duration: 250,
          ease: 'Cubic.easeOut',
          onComplete: () => ring.destroy()
        });

        // 飛び散る微細な赤いガラス破片
        for (let k = 0; k < 12; k++) {
          const shardSize = Phaser.Math.Between(4, 12);
          const color = k % 4 === 0 ? 0xffffff : (k % 4 === 1 ? 0xff1744 : (k % 4 === 2 ? 0xd50000 : 0xff5252));
          const shard = this.add.triangle(
            impactX + Phaser.Math.Between(-15, 15),
            impactY + Phaser.Math.Between(-15, 15),
            0, -shardSize,
            shardSize * 0.5, shardSize,
            -shardSize * 0.5, shardSize,
            color, 0.95
          ).setDepth(200026).setScrollFactor(0);

          const angle = Math.random() * Math.PI * 2;
          const dist = Phaser.Math.Between(40, 180 + step * 10);
          this.tweens.add({
            targets: shard,
            x: shard.x + Math.cos(angle) * dist,
            y: shard.y + Math.sin(angle) * dist + 25,
            angle: Phaser.Math.Between(-360, 360),
            alpha: 0,
            scale: 0.1,
            duration: Phaser.Math.Between(300, 550),
            ease: 'Power2',
            onComplete: () => shard.destroy()
          });
        }
      };

      const cleanupAndResolve = (val) => {
        this.dialogActive = false;
        this.choiceActive = false;
        this.input.keyboard.off('keydown', onKeyDown);
        uiElements.forEach(el => { if (el && el.destroy) el.destroy(); });
        uiElements = [];
        resolve(val);
      };

      const handleDoctorIntervene = async () => {
        isBusy = true;
        hasIntervened = true;
        setUIVisible(false);

        if (sayDoctor) {
          await sayDoctor('「お前はさっきから、ろくな選択をしない。」');
          await sayDoctor('「さぁ、魔王を殺すんだ。」');
        } else {
          await new Promise(r => this.showDeviceDialogue('「お前はさっきから、ろくな選択をしない。」', r));
          await new Promise(r => this.showDeviceDialogue('「さぁ、魔王を殺すんだ。」', r));
        }

        isGrayedOut = true;
        selectedIdx = 0; // １ 殺す に固定
        setUIVisible(true);
        updateSelection();

        this.cameras.main.shake(200, 0.015);
        if (MOT.Audio && MOT.Audio.playBleep) MOT.Audio.playBleep('博士');

        isBusy = false;
      };

      const handleResistance = async () => {
        if (isBusy) return;
        resistanceCount++;

        // カツカツという音
        if (MOT.Audio && MOT.Audio.playClack) {
          MOT.Audio.playClack();
        } else if (MOT.Audio && MOT.Audio.playTick) {
          MOT.Audio.playTick();
        }

        // 灰色の選択肢２がカツッと小さく震える
        if (choicesList[1] && choicesList[1].btn && choicesList[1].btn.active) {
          this.tweens.add({
            targets: [choicesList[1].btn, choicesList[1].txt],
            x: choicesList[1].origX + Phaser.Math.Between(-5, 5),
            duration: 35,
            yoyo: true
          });
        }

        if (resistanceCount < 5) {
          // 1〜4回目: カツカツと弾かれる
          this.cameras.main.shake(50, 0.003);
        } else if (resistanceCount < 15) {
          // 5回目〜14回目 (5回目から数えて1〜10回目):
          // 画面に赤い線でヒビが少しずつ入り、10回かけて画面全体に広がっていく！
          const crackStep = resistanceCount - 4; // 1〜10
          if (MOT.Audio && MOT.Audio.playCrack) MOT.Audio.playCrack();
          growCracks(crackStep);
          this.cameras.main.shake(120, 0.006 + crackStep * 0.003);

          // 選択肢1「１ 殺す」も亀裂の衝撃で激しく揺れ始める
          if (choicesList[0] && choicesList[0].btn && choicesList[0].btn.active) {
            this.tweens.add({
              targets: [choicesList[0].btn, choicesList[0].txt],
              x: choicesList[0].origX + Phaser.Math.Between(-3 - crackStep, 3 + crackStep),
              duration: 40,
              yoyo: true
            });
          }
        } else {
          // 15回目 (ヒビ開始から10回目): 画面全体と共に「１ 殺す」という選択肢が激しく粉々に粉砕消滅！
          isBusy = true;
          if (MOT.Audio && MOT.Audio.playShatter) MOT.Audio.playShatter();
          this.cameras.main.shake(1000, 0.08);

          // 赤と白の強烈なクロスフラッシュ
          const redFlash = this.add.rectangle(w / 2, h / 2, w, h, 0xff1744, 0.9).setDepth(200029).setScrollFactor(0);
          this.tweens.add({ targets: redFlash, alpha: 0, duration: 400, onComplete: () => redFlash.destroy() });

          const flash = this.add.rectangle(w / 2, h / 2, w, h, 0xffffff, 0.95).setDepth(200030).setScrollFactor(0);
          this.tweens.add({ targets: flash, alpha: 0, duration: 650, onComplete: () => flash.destroy() });

          // 画面全体に赤いガラスシャードが160枚以上爆発四散！
          for (let k = 0; k < 160; k++) {
            const wX = w / 2 + Phaser.Math.Between(-200, 200);
            const wY = startY + 65 + Phaser.Math.Between(-150, 150);
            const sW = Phaser.Math.Between(15, 60);
            const sH = Phaser.Math.Between(20, 80);

            // 鮮烈な赤とガラスのカラーパレット
            const colors = [0xff1744, 0xd50000, 0xff0044, 0xff5252, 0xffffff, 0xb71c1c];
            const chosenColor = colors[k % colors.length];

            const tri = this.add.triangle(
              wX, wY,
              0, -sH / 2,
              sW / 2, sH / 2,
              -sW / 2, sH / 2,
              chosenColor,
              Phaser.Math.FloatBetween(0.85, 1.0)
            ).setDepth(200035).setScrollFactor(0);

            const angle = Math.random() * Math.PI * 2;
            const speed = Phaser.Math.Between(450, 1400);
            this.tweens.add({
              targets: tri,
              x: tri.x + Math.cos(angle) * speed,
              y: tri.y + Math.sin(angle) * speed + 150,
              angle: Phaser.Math.Between(-1080, 1080),
              alpha: 0,
              scale: 0,
              duration: Phaser.Math.Between(700, 1400),
              ease: 'Cubic.easeOut',
              onComplete: () => tri.destroy()
            });
          }

          // ★「1. 殺す」という選択肢が激しく粉々に破壊消滅する演出！★
          const opt1Y = startY;
          for (let k = 0; k < 100; k++) {
            const pW = Phaser.Math.Between(15, 50);
            const pH = Phaser.Math.Between(15, 45);
            const part = this.add.triangle(
              w / 2 + Phaser.Math.Between(-520, 520),
              opt1Y + Phaser.Math.Between(-40, 40),
              0, -pH / 2,
              pW / 2, pH / 2,
              -pW / 2, pH / 2,
              k % 4 === 0 ? 0xff1744 : (k % 4 === 1 ? 0x4FD1FF : (k % 4 === 2 ? 0xffffff : 0x1F2933)),
              1.0
            ).setDepth(200035).setScrollFactor(0);

            const angle = Math.random() * Math.PI * 2;
            const speed = Phaser.Math.Between(450, 1200);
            this.tweens.add({
              targets: part,
              x: part.x + Math.cos(angle) * speed,
              y: part.y + Math.sin(angle) * speed + 90,
              angle: Phaser.Math.Between(-720, 720),
              alpha: 0,
              scale: 0,
              duration: Phaser.Math.Between(600, 1000),
              ease: 'Power2',
              onComplete: () => part.destroy()
            });
          }

          // 「1. 殺す」のボタンとテキストを物理的に完全消滅
          if (choicesList[0]) {
            if (choicesList[0].btn) choicesList[0].btn.destroy();
            if (choicesList[0].txt) choicesList[0].txt.destroy();
            choicesList[0] = null;
          }
          opt1Destroyed = true;

          // ヒビグラフィック消去
          if (crackGfx) { crackGfx.destroy(); crackGfx = null; }

          // 「2. 殺さない」を灰色から完全解放！
          isGrayedOut = false;
          selectedIdx = 1;
          updateSelection();

          this.tweens.add({
            targets: [choicesList[1].btn, choicesList[1].txt],
            scaleX: { from: 1.25, to: 1.08 },
            scaleY: { from: 1.25, to: 1.08 },
            duration: 400,
            ease: 'Back.easeOut'
          });

          await new Promise(r => this.time.delayedCall(400, r));

          // 選べるようになると共に勇者の叫び
          setUIVisible(false);
          if (sayHero) {
            await sayHero('「……それでも僕は、殺したくない……！！」');
          } else {
            const heroName = MOT.flags.heroName || '勇者';
            await new Promise(r => this.showDialogue(heroName, '「……それでも僕は、殺したくない……！！」', r));
          }

          // 選択肢UIを再表示（画面上には解放された「2. 殺さない」だけが存在する！）
          setUIVisible(true);
          updateSelection();
          isBusy = false;
        }
      };

      const onKeyDown = (e) => {
        if (isBusy) return;

        if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
          if (!hasIntervened) {
            handleDoctorIntervene();
          } else if (isGrayedOut) {
            handleResistance();
          }
        } else if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
          if (!isGrayedOut && !opt1Destroyed) {
            selectedIdx = 0;
            if (MOT.Audio && MOT.Audio.playSelect) MOT.Audio.playSelect();
            updateSelection();
          }
        } else if (e.key === 'Enter') {
          if (isBusy) return;
          if (opt1Destroyed || selectedIdx === 1) {
            if (!isGrayedOut) {
              if (MOT.Audio && MOT.Audio.playSelect) MOT.Audio.playSelect();
              cleanupAndResolve(2);
            }
          } else if (selectedIdx === 0 && !opt1Destroyed) {
            if (MOT.Audio && MOT.Audio.playSelect) MOT.Audio.playSelect();
            cleanupAndResolve(1);
          }
        }
      };

      if (choicesList[0] && choicesList[0].btn) {
        choicesList[0].btn.on('pointerover', () => {
          if (isBusy || opt1Destroyed) return;
          selectedIdx = 0;
          updateSelection();
        });
        choicesList[0].btn.on('pointerdown', () => {
          if (isBusy || opt1Destroyed) return;
          selectedIdx = 0;
          updateSelection();
          if (MOT.Audio && MOT.Audio.playSelect) MOT.Audio.playSelect();
          cleanupAndResolve(1);
        });
      }

      if (choicesList[1] && choicesList[1].btn) {
        choicesList[1].btn.on('pointerover', () => {
          if (isBusy || isGrayedOut) return;
          selectedIdx = 1;
          updateSelection();
        });
        choicesList[1].btn.on('pointerdown', () => {
          if (isBusy) return;
          if (!hasIntervened) {
            handleDoctorIntervene();
          } else if (isGrayedOut) {
            handleResistance();
          } else {
            selectedIdx = 1;
            updateSelection();
            if (MOT.Audio && MOT.Audio.playSelect) MOT.Audio.playSelect();
            cleanupAndResolve(2);
          }
        });
      }

      this.input.keyboard.on('keydown', onKeyDown);
    });
  }

  onBossHit(bullet, boss) {
    if (!bullet || !bullet.active) return;
    if (boss.x > 1920) {
      bullet.destroy();
      return;
    }
    bullet.destroy();
    let dmg = bullet.damage || 1;
    if (this.twinsReviving) {
      dmg = dmg * 0.5;
    }

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
          if (Phaser.Math.Between(0, 100) < 40) if(Phaser.Math.Between(0, 100) < 5) MOT.spawnHealthItem(this, boss.x, boss.y); else MOT.spawnEnergyItem(this, boss.x, boss.y);
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
      this.showDialogue(MOT.flags.heroName || '勇者', text, res);
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
                this.tweens.add({ targets: this.sisterBoss, x: 1550, duration: 1200, ease: 'Power2' });
                await new Promise(r => this.tweens.add({ targets: this.currentBoss, x: 1400, duration: 1200, ease: 'Power2', onComplete: r }));
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

    if (this.currentBoss && this.currentBoss.configKey === 'boss3_twins') {
      boss.hp -= dmg;
      boss.setTint(0xffffff);
      this.time.delayedCall(50, function () { if (boss.active) boss.clearTint(); });
      
      if (Phaser.Math.Between(0, 100) < 50) {
        if(Phaser.Math.Between(0, 100) < 5) MOT.spawnHealthItem(this, boss.x, boss.y); else MOT.spawnEnergyItem(this, boss.x, boss.y);
      }
      
      if (boss.hp <= 0 && boss.active) {
        boss.active = false;
        boss.setVisible(false);
        boss.body.enable = false;
      }
      
      return;
    }

    this.bossHP -= dmg;
    boss.hp = this.bossHP;
    boss.setTint(0xffffff);
    this.time.delayedCall(50, function () { if (boss.active) boss.clearTint(); });
    if (Phaser.Math.Between(0, 100) < 50) {
      if(Phaser.Math.Between(0, 100) < 5) MOT.spawnHealthItem(this, boss.x, boss.y); else MOT.spawnEnergyItem(this, boss.x, boss.y);
    }

    if (this.bossHP <= 0 && !this.bossDefeated) {
      this.bossDefeated = true; // Prevent multiple triggers
      this.cutsceneActive = true;
      if (this.boss1Bgm) this.boss1Bgm.stop();
      if (this.boss2Bgm) this.boss2Bgm.stop();
      if (this.boss4Bgm) this.boss4Bgm.stop();
      if (this.boss5Bgm) this.boss5Bgm.stop();
      
      if (this.bossLaneTimer) {
        this.bossLaneTimer.destroy();
      }
      this.enemyBullets.clear(true, true);

      boss.body.enable = false;
      this.cameras.main.shake(300, 0.02);

      var key = boss.configKey || this.bossQueue[this.currentBossIndex];
      var cfg = this.getBossConfig(key);

      const handleDefeatedDialogue = () => {
        this.dialogActive = true;
        this.physics.pause();
        this.player.setVelocity(0, 0);

        if (key === 'demon_lord') {
            MOT.flags.demonLordFinished = true;
            this.demonLordFinished = true;
            this.dialogActive = true;
            if (MOT.DoctorDirective) {
              if (MOT.DoctorDirective.directiveContainer) {
                MOT.DoctorDirective.directiveContainer.destroy();
                MOT.DoctorDirective.directiveContainer = null;
              }
              if (MOT.DoctorDirective.currentMaskShape) {
                MOT.DoctorDirective.currentMaskShape.destroy();
                MOT.DoctorDirective.currentMaskShape = null;
              }
              if (MOT.DoctorDirective.currentHighlight) {
                MOT.DoctorDirective.currentHighlight.destroy();
                MOT.DoctorDirective.currentHighlight = null;
              }
              MOT.DoctorDirective.currentDirective = null;
            }
            var w = 1920, h = 1080;
            var dimBg = this.add.rectangle(w / 2, h / 2, w, h, 0x000000, 0.6).setAlpha(0).setDepth(89);
            this.dimBg = dimBg;

            this.demonImage = this.add.image(w - 300, h / 2, 'demon_lord_normal').setAlpha(0).setDepth(90);
            this.demonImage.setScale(1000 / (this.demonImage.width || 750));
            this.demonImage.setY(100 + (this.demonImage.height * this.demonImage.scaleY) / 2 - 200);

            this.heroImage = this.add.image(300, h / 2, 'hero_stand').setAlpha(0).setDepth(90);
            var hScale = 750 / (this.heroImage.width || 1080);
            this.heroImage.setScale(hScale);
            this.heroImage.setY(100 + (this.heroImage.height * hScale) / 2);

            const sayDevice = (text) => new Promise(res => {
              this.tweens.add({ targets: dimBg, alpha: 0.6, duration: 300 });
              if (this.heroImage) this.tweens.add({ targets: this.heroImage, alpha: 0.4, duration: 300 });
              if (this.demonImage) this.tweens.add({ targets: this.demonImage, alpha: 0.4, duration: 300 });
              if (this.inunekoImage) this.tweens.add({ targets: this.inunekoImage, alpha: 0.4, duration: 300 });
              if (this.doctorImage) this.tweens.add({ targets: this.doctorImage, alpha: 0, duration: 300 });
              this.showDeviceDialogue(text, res);
            });

            const sayDemon = (text, tex = 'demon_lord_normal') => new Promise(res => {
              this.tweens.add({ targets: dimBg, alpha: 0.6, duration: 300 });
              if (this.heroImage) this.tweens.add({ targets: this.heroImage, alpha: 0.4, duration: 300 });
              if (this.doctorImage) this.tweens.add({ targets: this.doctorImage, alpha: 0, duration: 300 });
              if (this.inunekoImage) this.tweens.add({ targets: this.inunekoImage, alpha: 0.4, duration: 300 });
              if (this.demonImage) {
                this.tweens.add({ targets: this.demonImage, alpha: 1, duration: 300 });
                this.demonImage.setTexture(tex);
                this.demonImage.setDepth(90);
              }
              this.showDialogue('魔王', text, res);
            });

            const sayHero = (text) => new Promise(res => {
              this.tweens.add({ targets: dimBg, alpha: 0.6, duration: 300 });
              if (this.heroImage) this.tweens.add({ targets: this.heroImage, alpha: 1, duration: 300 });
              if (this.demonImage) this.tweens.add({ targets: this.demonImage, alpha: 0.4, duration: 300 });
              if (this.inunekoImage) this.tweens.add({ targets: this.inunekoImage, alpha: 0.4, duration: 300 });
              if (this.doctorImage) this.tweens.add({ targets: this.doctorImage, alpha: 0, duration: 300 });
              this.showDialogue(MOT.flags.heroName || '勇者', text, res);
            });

            const sayDoctor = (text, tex = 'doctor_stand') => new Promise(res => {
              this.tweens.add({ targets: dimBg, alpha: 0.6, duration: 300 });
              if (this.heroImage) this.tweens.add({ targets: this.heroImage, alpha: 0.4, duration: 300 });
              if (this.demonImage) this.tweens.add({ targets: this.demonImage, alpha: 0, duration: 300 });
              if (!this.doctorImage) {
                this.doctorImage = this.add.image(w - 300, h / 2, tex).setDepth(91);
              } else {
                this.doctorImage.setTexture(tex);
                this.doctorImage.setDepth(91);
              }
              const srcImg = this.textures.get(tex).getSourceImage();
              const imgW = (srcImg && srcImg.width) || 750;
              const imgH = (srcImg && srcImg.height) || 1000;
              const docScale = 900 / imgW;
              this.doctorImage.setScale(docScale);
              this.doctorImage.setY(100 + (imgH * docScale) / 2);

              this.tweens.add({ targets: this.doctorImage, alpha: 1, duration: 300 });
              this.showDialogue('博士', text, res);
            });

            (async () => {
              const totalKills = (MOT.flags.killedBoss1 ? 1 : 0) + (MOT.flags.killedBoss2 ? 1 : 0) + (MOT.flags.killedTwins ? 1 : 0);

              if (totalKills === 0) {
                // 博士の指示セリフ（通信機越し）
                await sayDevice('「さあ、早くとどめを刺せ！」');

                // 選択干渉システム
                let shatterResult = await this.askDemonLordShatterChoice(sayDevice, sayHero);

                if (shatterResult === 1) {
                  await sayHero('「……魔王は……殺さなきゃ……エラーは消去しないと……」');
                  MOT.flags.killedDemonLord = true;
                  if (MOT.Audio && MOT.Audio.playShot) MOT.Audio.playShot();
                  else if (MOT.Audio && MOT.Audio.playSelect) MOT.Audio.playSelect();
                  this.cameras.main.shake(500, 0.05);
                  if (boss && boss.active) {
                    this.tweens.add({ targets: boss, scale: boss.scale * 1.5, alpha: 0, duration: 600, ease: 'Power2', onComplete: () => { if (boss.destroy) boss.destroy(); } });
                  }
                  if (this.inunekoEnemy && this.inunekoEnemy.active) {
                    this.tweens.add({ targets: this.inunekoEnemy, scale: 1.5, alpha: 0, duration: 600, ease: 'Power2', onComplete: () => { if (this.inunekoEnemy.destroy) this.inunekoEnemy.destroy(); } });
                  }
                  if (this.demonImage) {
                    this.tweens.add({ targets: this.demonImage, scale: 2, alpha: 0, duration: 500, ease: 'Power2' });
                  }
                  await new Promise(r => this.time.delayedCall(1000, r));
                  MOT.flags.finalEnding = 'normal_daily';
                  this.scene.start('EndingScene');
                  return;
                }

                // 3. 魔王との会話と選択肢
                await sayDemon('「……結局我々を殺さず、お前は何をしにきたんだ？あの法螺吹きにけしかけられて、わらわたちを滅ぼしに来たんだろう？」');

                await new Promise(res => {
                  this.showChoice([
                    { text: '1. 殺す必要がないと思った', callback: () => { if(MOT.Audio.playSelect) MOT.Audio.playSelect(); res(1); } },
                    { text: '2. 博士を信じられない', callback: () => { if(MOT.Audio.playSelect) MOT.Audio.playSelect(); res(2); } }
                  ]);
                });

                const heroName = MOT.flags.heroName || '勇者';

                // 魔王の説明
                await sayDemon('「そうか……英断だな…。」');
                await sayDemon('「そしてここから話すのは、信じるも信じないもお前の自由だ。」');
                await sayDemon('「お前は、あいつに”魔王が世界を滅ぼそうとしている”とでも言われたのだろう？だが、残念なことに、それはわらわたちを滅ぼすための方便にすぎぬ。」');
                await sayDemon('「あいつはこの世界に人間以上の存在がいることが許せないのだ。わらわはやつに襲われていた魔族を保護し、あいつとながい間戦ってきた。」');
                await sayDemon('「ながい、ながい戦いだった。……やつは気の毒な奴じゃ。だが、それはわらわたちを滅ぼす理由にはならない。」');

                // 4. 博士乱入（画面揺れ演出前はすべて通信機越し）
                await sayDevice('「…はははは。すべて話されてしまったみたいだな」');
                await sayHero('「！」');
                await sayHero('「僕は……ずっとあなたに嘘をつかれていたんだね。」');
                await sayDevice('「嘘？違うな、そいつらを殺せば平和な世界が訪れる。」');
                await sayDevice('「……私にとってな。」');
                await sayHero('「それでみんなを殺すだなんて、身勝手じゃないか。」');
                await sayDevice('「そうだな。しかしそれがどうした？自分の望む世界を目指すのは普通のことだろう？」');
                await sayDevice('「それに、私だけじゃない。魔族に恐怖し、滅んでほしいと願う人間はごまんといる。そいつらにとっても、いい世界となるんだ。」');
                await sayDemon('「わらわたちはただ生きているだけだ！むやみに人を傷つけたことなど、一度もない！」');
                
                const sayInuneko = (text) => new Promise(res => {
                  this.tweens.add({ targets: dimBg, alpha: 0.6, duration: 300 });
                  if (this.heroImage) this.tweens.add({ targets: this.heroImage, alpha: 0.4, duration: 300 });
                  if (this.demonImage) this.tweens.add({ targets: this.demonImage, alpha: 0.4, duration: 300 });
                  if (!this.inunekoImage) {
                    this.inunekoImage = this.add.image(w - 550, h / 2 + 100, 'inuneko_stand').setDepth(91).setAlpha(0);
                    const inuScale = 500 / ((this.textures.exists('inuneko_stand') && this.textures.get('inuneko_stand').getSourceImage().width) || 500);
                    this.inunekoImage.setScale(inuScale);
                  }
                  this.tweens.add({ targets: this.inunekoImage, alpha: 1, duration: 300 });
                  this.showDialogue('犬猫☆スター', text, res);
                });
                await sayInuneko('「そうわん！魔王様は、お前とは違って優しいにゃん！！」');

                await sayHero('「そうだよ。やっぱり僕はみんなを殺したくない。仲良くできるはずだよ。」');
                await sayHero('「だって、みんな、魔王を殺しに来ているはずの僕を殺そうとしなかった。」');
                await sayHero('「僕は知った。魔族は悪い奴じゃないって。」');
                await sayHero('「だからもう、あなたに従ったりはしない。」');

                await sayDevice('「……面白い。ただ創られた存在であるはずのお前が、そんな感情を持つなんてな。」');
                await sayHero('「創られた…？」');
                await sayDevice('「そうだ。お前は、”勇者”でもなんでもない。ただの”兵器”だ。」');
                await sayHero('「兵器……？」');
                await sayDevice('「そうだ。」');
                await sayDevice('「しかし、私が何度殺せと指示をし、選択権を奪ってもなお、お前は最後まで従わなかった。」');
                await sayDevice('「……思えば、最初からおかしかった。お前を創るとき、感情や思考力といったものは組み込まなかったはず。だから、お前は自分を”勇者”と認識したら、何も聞かず、ただ黙って戦いに行くはずだった。」');
                await sayHero('「でも僕には感情が……」');
                await sayDevice('「本当にそう思っているのか？」');
                await sayHero('「……。」');
                await sayDevice('「お前も気が付いているのだろう？自分の中にいる、お前を操っている存在を。」');
                await sayHero('「……。」');
                await sayDevice('「その表情……認めたくないのか？結局、お前は誰かに指示を仰がないと生きていけないんだ。いい加減認めて楽になった方がいい。」');
                await sayDevice('「まぁ、お前が誰かに操られていたとしてももう関係ない。」');
                await sayDevice('「もうお前は必要ないからな。」');

                // 5. 画面揺れ演出（長めの1500ms、重低音SE）
                if (MOT.Audio && MOT.Audio.playBomb) MOT.Audio.playBomb();
                else if (MOT.Audio && MOT.Audio.playShot) MOT.Audio.playShot();
                this.cameras.main.shake(1500, 0.04);
                await new Promise(r => this.time.delayedCall(700, r));

                await sayDemon('「なんだ？！」');
                await sayInuneko('「にゃわわ！？」');

                // 6. 暗転して博士との最終戦の場所に移る（主人公が左から出てくる演出は行わない）
                this.cameras.main.fadeOut(800, 0, 0, 0);
                await new Promise(r => this.time.delayedCall(850, r));

                // 立ち絵・ダイアログ・前ボススプライト（魔王・犬猫）の完全片付け
                this.clearConversationUI();
                if (boss && boss.active) {
                  if (boss.destroy) boss.destroy();
                }
                if (this.currentBoss && this.currentBoss.active) {
                  if (this.currentBoss.destroy) this.currentBoss.destroy();
                  this.currentBoss = null;
                }
                if (this.inunekoEnemy && this.inunekoEnemy.active) {
                  if (this.inunekoEnemy.destroy) this.inunekoEnemy.destroy();
                  this.inunekoEnemy = null;
                }
                if (this.enemyGroup) {
                  this.enemyGroup.clear(true, true);
                }
                if (this.demonImage) { this.demonImage.destroy(); this.demonImage = null; }
                if (this.inunekoImage) { this.inunekoImage.destroy(); this.inunekoImage = null; }
                if (this.heroImage) { this.heroImage.destroy(); this.heroImage = null; }
                if (this.doctorImage) { this.doctorImage.destroy(); this.doctorImage = null; }
                if (dimBg) { dimBg.destroy(); dimBg = null; }

                // BGM停止
                if (this.boss1Bgm) this.boss1Bgm.stop();
                if (this.boss2Bgm) this.boss2Bgm.stop();
                if (this.twinsBgm) this.twinsBgm.stop();
                if (this.boss4Bgm) this.boss4Bgm.stop();
                if (this.boss5Bgm) this.boss5Bgm.stop();

                // 博士戦の背景にセット
                if (this.textures.exists('bg_doctor')) {
                  this.bg.setTexture('bg_doctor');
                  this.bg.setOrigin(0.5, 0.5);
                  this.bg.setPosition(1920 / 2, 1080 / 2);
                  this.bg.setScale(Math.max(1920 / this.bg.width, 1080 / this.bg.height));
                }

                // 主人公はその場所（戦闘定位置 x: 300）にスタンバイ（左からの歩き入場はなし）
                this.tweens.killTweensOf(this.player);
                this.player.setPosition(300, 460);
                if (this.player.body) this.player.body.reset(300, 460);
                this.player.currentCol = 1;
                this.player.currentLane = 1;
                this.player.setAlpha(1);

                // 暗転明け
                this.cameras.main.fadeIn(600, 0, 0, 0);
                await new Promise(r => this.time.delayedCall(600, r));

                // イベント戦闘(博士 Phase 1 - 負けイベント: 8秒後に自動死亡)
                this.isDoctorPhase1Unwinnable = true;
                this.phase1DefeatTriggered = false;
                MOT.flags.playerHP = MOT.flags.playerMaxHP || 5;
                this.playerInvincible = false;
                this.updateHUD();
                this.currentBossIndex = this.bossQueue.indexOf('doctor');
                if (this.currentBossIndex === -1) {
                  this.bossQueue.push('doctor');
                  this.currentBossIndex = this.bossQueue.length - 1;
                }
                this.dialogActive = false;
                this.player.setCollideWorldBounds(true);
                this.physics.resume();
                this.startBoss();
                return;
              } else {
                // 1~3 bosses killed -> normal choice
                await sayDoctor('「よくやった。とどめを刺せ」');
                await sayDemon('「…ここまでか…」');
                let c = await new Promise(res => {
                  this.showChoice([
                    { text: '1. 殺す', callback: () => { if(MOT.Audio.playSelect) MOT.Audio.playSelect(); res(1); } },
                    { text: '2. 見逃す', callback: () => { if(MOT.Audio.playSelect) MOT.Audio.playSelect(); res(2); } }
                  ]);
                });
                if (c === 1) {
                  MOT.flags.killedDemonLord = true;
                  if (MOT.Audio && MOT.Audio.playSelect) MOT.Audio.playSelect();
                  this.cameras.main.shake(500, 0.05);
                  if (boss && boss.active) {
                    this.tweens.add({ targets: boss, scale: boss.scale * 1.5, alpha: 0, duration: 600, ease: 'Power2', onComplete: () => { if (boss.destroy) boss.destroy(); } });
                  }
                  if (this.inunekoEnemy && this.inunekoEnemy.active) {
                    this.tweens.add({ targets: this.inunekoEnemy, scale: 1.5, alpha: 0, duration: 600, ease: 'Power2', onComplete: () => { if (this.inunekoEnemy.destroy) this.inunekoEnemy.destroy(); } });
                  }
                  if (this.demonImage) {
                    this.tweens.add({ targets: this.demonImage, scale: 2, alpha: 0, duration: 500, ease: 'Power2' });
                  }
                  await new Promise(r => this.time.delayedCall(1000, r));
                  MOT.flags.finalEnding = 'normal_daily';
                  this.scene.start('EndingScene');
                } else {
                  await sayDemon('「わらわを見逃して何が望みだ？しもべたちを殺しているんだ。和平を求めて居るわけではないのであろう？」');
                  await sayDemon('「わらわは、しもべを殺された恨みを忘れることはできん。何が目的であれ、お前を許すことはできないだろう。」');
                  MOT.flags.finalEnding = 'normal_useless';
                  this.scene.start('EndingScene');
                }
              }
            })();
          } else if (key === 'doctor') {
            if (this.currentBoss) {
              this.currentBoss.setVisible(false);
              this.currentBoss.setActive(false);
            }
            this.hideBossHPBar();
            if (this.laneGraphics) { this.laneGraphics.setVisible(false); }

            var w = 1920, h = 1080;
            var dimBg = this.add.rectangle(w / 2, h / 2, w, h, 0x000000, 0.6).setAlpha(0).setDepth(89);
            this.dimBg = dimBg;

            this.heroImage = this.add.image(300, h / 2, 'hero_stand').setAlpha(0).setDepth(90);
            var hScale = 750 / (this.heroImage.width || 1080);
            this.heroImage.setScale(hScale);
            this.heroImage.setY(100 + (this.heroImage.height * hScale) / 2);

            this.rightSpeakerImage = this.add.image(w - 300, h / 2, 'doctor_awaken_normal_dying').setAlpha(0).setDepth(90);
            var docScale = 900 / ((this.textures.exists('doctor_stand') && this.textures.get('doctor_stand').getSourceImage().width) || 750);
            this.rightSpeakerImage.setScale(docScale);
            this.rightSpeakerImage.setY(100 + (((this.textures.exists('doctor_stand') && this.textures.get('doctor_stand').getSourceImage().height) || 1000) * docScale) / 2);

            this.tweens.add({ targets: dimBg, alpha: 0.6, duration: 300 });

            const setRightSpeaker = (speaker, texKey, targetW = 750, yOff = 0) => {
              if (!this.rightSpeakerImage || !this.rightSpeakerImage.active) {
                this.rightSpeakerImage = this.add.image(w - 300, h / 2, texKey).setDepth(90);
              }
              if (this.textures.exists(texKey)) {
                this.rightSpeakerImage.setTexture(texKey);
                const src = this.textures.get(texKey).getSourceImage();
                const sw = (src && src.width) || 750;
                const sh = (src && src.height) || 1000;
                const sc = targetW / sw;
                this.rightSpeakerImage.setScale(sc);
                this.rightSpeakerImage.setY(100 + (sh * sc) / 2 + yOff);
              }
            };

            const sayRight = (speaker, texKey, text, targetW = 750, yOff = 0) => new Promise(res => {
              setRightSpeaker(speaker, texKey, targetW, yOff);
              if (dimBg && dimBg.active) this.tweens.add({ targets: dimBg, alpha: 0.6, duration: 250 });
              if (this.heroImage && this.heroImage.active) this.tweens.add({ targets: this.heroImage, alpha: 0.4, duration: 250 });
              if (this.rightSpeakerImage && this.rightSpeakerImage.active) {
                this.tweens.add({ targets: this.rightSpeakerImage, alpha: 1, duration: 250 });
              }
              this.showDialogue(speaker, text, res);
            });

            const heroName = MOT.flags.heroName || '勇者';
            const sayHero = (text) => new Promise(res => {
              if (dimBg && dimBg.active) this.tweens.add({ targets: dimBg, alpha: 0.6, duration: 250 });
              if (this.heroImage && this.heroImage.active) this.tweens.add({ targets: this.heroImage, alpha: 1, duration: 250 });
              if (this.rightSpeakerImage && this.rightSpeakerImage.active) {
                this.tweens.add({ targets: this.rightSpeakerImage, alpha: 0.4, duration: 250 });
              }
              this.showDialogue(heroName, text, res);
            });

            const sayDoctor = (text, tex = 'doctor_awaken_normal_dying') => sayRight('博士', tex, text, 900, 0);
            const sayDemon = (text, tex = 'demon_lord_normal') => sayRight('魔王', tex, text, 850, -50);
            const sayInuneko = (text, tex = 'inuneko_stand') => sayRight('犬猫☆スター', tex, text, 500, 50);
            const sayKratos = (text, tex = 'boss1_normal') => sayRight('クラトス', tex, text, 800, 0);
            const sayTourelos = (text, tex = 'boss2_normal') => sayRight('トゥレロス', tex, text, 750, 20);
            const sayEnaria = (text, tex = 'sister_normal') => sayRight('エナリア', tex, text, 650, 40);
            const sayEdio = (text, tex = 'brother_normal') => sayRight('エディオ', tex, text, 700, 20);

            (async () => {
              // 博士撃破直後会話
              await sayDoctor('「驚いた...まさかお前達がここまでやるとはな」');
              await sayHero('「…」');
              await sayDoctor('「なにをしている？早くとどめを刺せ。同情などいらん。何の足しにもならないからな。」');

              // 最後の選択肢
              let finalChoice = await new Promise(res => {
                this.showChoice([
                  { text: '1. 殺さない', callback: () => { if(MOT.Audio.playSelect) MOT.Audio.playSelect(); res(1); } },
                  { text: '2. 殺せない', callback: () => { if(MOT.Audio.playSelect) MOT.Audio.playSelect(); res(2); } }
                ]);
              });

              if (finalChoice === 1) {
                // 【1答えた場合】
                await sayDoctor('「…なんだ、ここでも殺さないのか。わかっているのか？その女の言う通り、私はお前を騙していたんだ。」');
                await sayDoctor('「お前は”勇者”なんかじゃない、俺の最高傑作のはずだったんだがな。」');
                await sayHero('「あなたがやったことは許せない。だけど、ここであなたを殺したら僕はあなたと同じになってしまう。」');
                await sayDoctor('「そうか……。」');
                await sayDoctor('「ついぞ俺の実験が成功することはなかったか。もうこの身体も必要ないな。さらばだ011101。」');
                await sayHero('「！」');
              } else {
                // 【2答えた場合】
                await sayHero('「僕はあなたを殺せない...。あなたがやったことは許せないけど、それでもあなたは僕の...」');
                await sayDoctor('「全く...本当にどうしようもない欠陥品だな。」');
                await sayDoctor('「私は、自分の目的のためにしか生きられない。お前が何を思っていてもな。」');
                await sayDoctor('「さらばだ、011101。もう、お前に用はない。好きに生きるんだな。」');
                await sayHero('「！」');
              }

              // 銃声SE + 画面赤フラッシュ
              if (MOT.Audio && MOT.Audio.playShot) MOT.Audio.playShot();
              else if (MOT.Audio && MOT.Audio.playSelect) MOT.Audio.playSelect();

              this.cameras.main.shake(400, 0.03);
              const redOverlay = this.add.rectangle(w / 2, h / 2, w, h, 0xff0000, 0.5).setDepth(200000);
              this.tweens.add({ targets: redOverlay, alpha: 0, duration: 300, onComplete: () => redOverlay.destroy() });

              // 博士が倒れて非表示に
              if (this.rightSpeakerImage) {
                this.tweens.add({
                  targets: this.rightSpeakerImage,
                  alpha: 0,
                  y: this.rightSpeakerImage.y + 100,
                  duration: 600
                });
              }

              // 博士自害ナレーション
              const sayNarration = (text) => new Promise(res => {
                if (this.heroImage && this.heroImage.active) this.tweens.add({ targets: this.heroImage, alpha: 0.3, duration: 250 });
                if (this.rightSpeakerImage && this.rightSpeakerImage.active) this.tweens.add({ targets: this.rightSpeakerImage, alpha: 0, duration: 250 });
                this.showDialogue('', text, res);
              });
              await sayNarration('博士は、自分に向かって引き金を引いた。');
              await sayNarration(heroName + 'が止めようとするも間に合わず、博士は満足したかの様に自害をした。');

              // 仲間たちのエピローグ会話
              if (finalChoice === 1) {
                await sayHero('「止められなかった…」');
                await sayHero('「……」');
                await sayHero('「でも、これで全部終わったんだよね……」');
                await sayDemon('「ああ。…それぞれに複雑な想いはあれど、ようやく永い戦いが終わった。」');
                await sayInuneko('「みんな自由になるにゃん！！」');
                await sayDemon('「さて、お前を操る存在はいなくなったがこれからどうするつもりなんだ？」');
                await sayHero('「……」');
                await sayKratos('「じゃあ再戦しようよ！！！勇者くん！」');
                await sayEnaria('「あなた馬鹿じゃないの？みんなボロボロなのにこれ以上戦うって死ぬつもり？」');
                await sayKratos('「そんなつもりはないよ！ただ負けっぱなしってのも気に食わないだろ？それに君強いし。戦ったら俺も強くなれる！」');
                await sayTourelos('「はは、だからみんなに”脳筋”ってよばれるんだよ。自覚ないのかい？」');
                await sayEdio('「まあ、僕たちと同じで博士に創られた存在だからね。強くて当然。」');
                await sayEnaria('「そうね、兄さま。それにこの子もちゃんと判断できるようになったみたいだし、対立する理由もなくなったわ。」');
                await sayKratos('「なんだ！じゃあもう仲間だな！」');
                await sayHero('「いや、そんな単純には…」');
                await sayDemon('「ふふ、みなこう言っとるし、お前もわらわたちのもとに来るか？」');
                await sayHero('「……でも僕はあなたたちを殺そうとしたんだよ？」');
                await sayDemon('「だが自分で選択をして、殺さなかった。」');
                await sayDemon('「それに、わらわの部下たちはお前と同じで居場所がないものたちだ。誰も拒絶せぬよ。」');
                await sayEdio('「僕は大賛成！だって僕らは兄弟だろう？」');
                await sayHero('「本当にいいの？」');
                await sayDemon('「良くなかったら誘わぬ！お前が嫌じゃないならさっさと来るんじゃ！」');
                await sayInuneko('「れっつらごーだわん！！」');
              } else {
                await sayHero('「止められなかった…」');
                await sayHero('「……」');
                await sayHero('「でも、これで全部終わったんだよね……」');
                await sayDemon('「ああ。…それぞれに複雑な想いはあれど、ようやくながい戦いが終わった。」');
                await sayInuneko('「みんな自由になるにゃん！！」');
                await sayDemon('「さて、お前を操る存在はいなくなったがこれからどうするつもりなんだ？」');
                await sayHero('「……」');
                await sayKratos('「じゃあ再戦しようよ！！！勇者くん！」');
                await sayEnaria('「あなた馬鹿じゃないの？みんなボロボロなのにこれ以上戦うって死ぬつもり？」');
                await sayKratos('「そんなつもりはないよ！ただ負けっぱなしってのも気に食わないだろ？それに君、強いし。戦ったら俺も強くなれる！」');
                await sayTourelos('「はは、だからみんなに”脳筋”って呼ばれるんだよ。」');
                await sayEdio('「まあ、僕たちと同じで博士に創られた存在だからね。強くて当然。」');
                await sayEnaria('「そうね、兄さま。それにこの子もちゃんと判断できるようになったみたいだし、対立する理由もなくなったわ。」');
                await sayKratos('「なんだ！じゃあもう仲間なのか！」');
                await sayHero('「いや、そんな単純には…」');
                await sayDemon('「ふふ、気にするな。みなこう言っとるし、わらわたちのもとに来るか？」');
                await sayHero('「……でも僕はあなたたちを殺そうとしたんだよ？」');
                await sayDemon('「だが自分で選択をして、殺さなかった。」');
                await sayDemon('「それに、わらわの部下たちはお前と同じで居場所がないものたちだ。誰も拒絶せぬよ。」');
                await sayEdio('「僕は大賛成！だって僕らは”兄弟”だろう？」');
                await sayHero('「本当にいいの？」');
                await sayDemon('「良くなかったら誘わぬ！お前が嫌じゃないならさっさと来るんじゃ！」');
                await sayInuneko('「れっつらごーだわん！！」');
              }

              // （暗転）
              this.cameras.main.fadeOut(800, 0, 0, 0);
              await new Promise(r => this.time.delayedCall(800, r));

              if (this.rightSpeakerImage && this.rightSpeakerImage.destroy) {
                this.rightSpeakerImage.destroy();
                this.rightSpeakerImage = null;
              }
              if (this.heroImage && this.heroImage.destroy) {
                this.heroImage.destroy();
                this.heroImage = null;
              }
              if (dimBg && dimBg.destroy) {
                dimBg.destroy();
                dimBg = null;
              }

              // GGS Terminal 2 (Spaceキー / クリックで進行)
              this.cameras.main.fadeIn(300, 0, 0, 0);
              await this.terminalEffect([
                '観測者のログ: ...now loading...',
                '観測者のログ: ...完了',
                '',
                '観測者のログ: エラーの確認...修復完了',
                '',
                '観測者のログ: ...なんて、堅苦しいのはここまでにしましょう',
                '',
                '観測者のログ: さっきぶりね。『GGS』よ。',
                '観測者のログ: この結末は気に入ってくれた？',
                '',
                '観測者のログ: あなたのおかげで、バグはなくなって世界の崩壊は止められた。彼らたちの未来はこれからも続くの。',
                '',
                '観測者のログ: 創られた存在から、”' + heroName + '”となったあの子が幸せな道を歩むのを応援してくれると嬉しいわ。',
                '',
                '観測者のログ: といっても、接続が難しくて、これ以上は見せられないのだけれど。',
                '',
                '観測者のログ: いずれ、またどこかで会いましょう。',
                '',
                '観測者のログ: あ、こういった方が良かったかしら？',
                '観測者のログ: ごほん。……”またね”だにゃん！'
              ]);

              MOT.flags.finalEnding = 'hello_world';
              this.scene.start('EndingScene');
            })();
          } else {
            // 通常の敗北後（クラトス・トゥレロス）
            (async () => {
              var bossKey = this.currentBoss ? this.currentBoss.configKey : key;
              var w = 1920, h = 1080;

              var dimBg = this.add.rectangle(w / 2, h / 2, w, h, 0x000000, 0.6).setAlpha(0).setDepth(89);
              this.dimBg = dimBg;

              this.heroImage = this.add.image(300, h / 2, 'hero_stand').setAlpha(0).setDepth(90);
              var hScale = 750 / (this.heroImage.width || 1080);
              this.heroImage.setScale(hScale);
              this.heroImage.setY(100 + (this.heroImage.height * hScale) / 2);

              const sayHero = (text) => new Promise(res => {
                this.tweens.add({ targets: dimBg, alpha: 0.6, duration: 300 });
                if (this.heroImage) this.tweens.add({ targets: this.heroImage, alpha: 1, duration: 300 });
                if (this.bossImage) this.tweens.add({ targets: this.bossImage, alpha: 0.4, duration: 300 });
                this.showDialogue(MOT.flags.heroName || '勇者', text, res);
              });

              const sayDevice = (text) => new Promise(res => {
                this.tweens.add({ targets: dimBg, alpha: 0.6, duration: 300 });
                if (this.heroImage) this.tweens.add({ targets: this.heroImage, alpha: 0.4, duration: 300 });
                if (this.bossImage) this.tweens.add({ targets: this.bossImage, alpha: 0.4, duration: 300 });
                this.showDeviceDialogue(text, res);
              });

              const askChoice = (label1, label2) => new Promise(res => {
                this.showChoice([
                  { text: label1, callback: () => { if (MOT.Audio && MOT.Audio.playSelect) MOT.Audio.playSelect(); res(1); } },
                  { text: label2, callback: () => { if (MOT.Audio && MOT.Audio.playSelect) MOT.Audio.playSelect(); res(2); } }
                ]);
              });

              if (bossKey === 'boss1') {
                this.bossImage = this.add.image(w - 300, h / 2, 'boss1_hurt_angry').setAlpha(0).setDepth(90);
                var bw = this.bossImage.width || 576;
                var bh = this.bossImage.height || 1024;
                var b1Scale = 750 / bw;
                this.bossImage.setScale(b1Scale);
                this.bossImage.setY(100 + (bh * b1Scale) / 2);

                const sayKratos = (text, tex = 'boss1_hurt_angry') => new Promise(res => {
                  this.tweens.add({ targets: dimBg, alpha: 0.6, duration: 300 });
                  if (this.heroImage) this.tweens.add({ targets: this.heroImage, alpha: 0.4, duration: 300 });
                  if (this.bossImage) {
                    this.tweens.add({ targets: this.bossImage, alpha: 1, duration: 300 });
                    this.bossImage.setTexture(tex);
                  }
                  this.showDialogue('クラトス', text, res);
                });

                await sayDevice('「よくやった。このまま止めを刺すんだ。魔物も人間と変わらず心臓を打ち抜けば死ぬ。」');
                let c = await askChoice('1. 心臓を打ち抜く', '2. 見逃す');

                if (c === 1) {
                  MOT.flags.killedBoss1 = true;
                  MOT.modifyFlag('brutality', 1);
                  MOT.modifyFlag('obeyDoctor', 1);
                  await sayKratos('「くそっ…！俺もここまでか…」');

                  if (MOT.Audio && MOT.Audio.playShot) MOT.Audio.playShot();
                  this.cameras.main.shake(400, 0.03);
                  if (this.bossImage) {
                    this.tweens.add({ targets: this.bossImage, alpha: 0, duration: 500 });
                  }
                  await sayDevice('「よくやった。まずは一歩平和に近づいたな。そのまま進んでいくといい」');
                  
                  if (dimBg) dimBg.destroy();
                  if (this.bossImage) this.bossImage.destroy();
                  if (this.heroImage) this.heroImage.destroy();
                  if (this.boss1Bgm) this.boss1Bgm.stop();
                  this.proceedToNextArea(boss, false);
                } else {
                  MOT.flags.killedBoss1 = false;
                  MOT.modifyFlag('showMercy', 1);
                  MOT.modifyFlag('favor.boss1', 1);
                  await sayKratos('「なんで殺さない…？お前はあいつの指示に従ってるんじゃないのか？」');
                  await sayKratos('「お前が魔王様に従うなら、協力する」');
                  if (this.bossImage) {
                    this.tweens.add({ targets: this.bossImage, alpha: 0, duration: 500 });
                  }
                  await sayDevice('「君は一体何をしている？」');
                  await sayDevice('「奴らを倒さないと、世界が救われないんだ。何がしたいのかさっぱりだが、次はちゃんと止めを刺せ。」');
                  await sayHero('「……」');
                  
                  if (dimBg) dimBg.destroy();
                  if (this.bossImage) this.bossImage.destroy();
                  if (this.heroImage) this.heroImage.destroy();
                  if (this.boss1Bgm) this.boss1Bgm.stop();
                  this.proceedToNextArea(boss, true);
                }

              } else if (bossKey === 'boss2') {
                this.bossImage = this.add.image(w - 300, h / 2, 'boss2_hurt').setAlpha(0).setDepth(90);
                var bw2 = this.bossImage.width || 576;
                var bh2 = this.bossImage.height || 1024;
                var b2Scale = 750 / bw2;
                this.bossImage.setScale(b2Scale);
                this.bossImage.setY(100 + (bh2 * b2Scale) / 2);

                const sayTourelos = (text, tex = 'boss2_hurt') => new Promise(res => {
                  this.tweens.add({ targets: dimBg, alpha: 0.6, duration: 300 });
                  if (this.heroImage) this.tweens.add({ targets: this.heroImage, alpha: 0.4, duration: 300 });
                  if (this.bossImage) {
                    this.tweens.add({ targets: this.bossImage, alpha: 1, duration: 300 });
                    this.bossImage.setTexture(tex);
                  }
                  this.showDialogue('トゥレロス', text, res);
                });

                if (MOT.flags.killedBoss1) {
                  await sayDevice('「先ほどと同じように、止めを刺すんだ。こいつを倒せば幹部は残り半分になる。」');
                } else {
                  await sayDevice('「今回はわかっているな？世界のために、逃がさないで止めを刺せ。」');
                }

                let c = await askChoice('1. 心臓を打ち抜く', '2. 見逃す');

                if (c === 1) {
                  MOT.flags.killedBoss2 = true;
                  MOT.modifyFlag('brutality', 1);
                  MOT.modifyFlag('favor.boss2', -1);
                  if (MOT.flags.killedBoss1) {
                    await sayTourelos('「はは…あいつと同じで負けるのはむかつくけど、戦いは楽しかったしまあいいかな」');
                    if (MOT.Audio && MOT.Audio.playShot) MOT.Audio.playShot();
                    this.cameras.main.shake(400, 0.03);
                    if (this.bossImage) {
                      this.tweens.add({ targets: this.bossImage, alpha: 0, duration: 500 });
                    }
                    await sayDevice('「よくやった。また一歩平和に近づいたな。幹部は残り二人だ。気を抜かずそのまま進んでいくといい」');
                  } else {
                    await sayTourelos('「はは…負けたのはむかつくけど、戦いは楽しかったしまあいいかな」');
                    if (MOT.Audio && MOT.Audio.playShot) MOT.Audio.playShot();
                    this.cameras.main.shake(400, 0.03);
                    if (this.bossImage) {
                      this.tweens.add({ targets: this.bossImage, alpha: 0, duration: 500 });
                    }
                    await sayDevice('「それでいい。そのまま進んで残りの幹部も魔王も倒すんだ」');
                  }
                  
                  if (dimBg) dimBg.destroy();
                  if (this.bossImage) this.bossImage.destroy();
                  if (this.heroImage) this.heroImage.destroy();
                  if (this.boss2Bgm) this.boss2Bgm.stop();
                  this.proceedToNextArea(boss, false);
                } else {
                  MOT.flags.killedBoss2 = false;
                  MOT.modifyFlag('showMercy', 1);
                  MOT.modifyFlag('favor.boss2', 1);
                  if (MOT.flags.killedBoss1) {
                    await sayTourelos('「なんで殺さない？あの脳筋野郎にしたように僕も殺せばいい。それとも、僕には殺す価値すらもないって言いたいの？ま、事実負けちゃったからどうこう言う資格なんてないんだけど……ね。」');
                    if (this.bossImage) {
                      this.tweens.add({ targets: this.bossImage, alpha: 0, duration: 500 });
                    }
                    await sayDevice('「おい、何をしている？なぜ止めを刺さなかった。」');
                    await sayHero('「……」');
                  } else {
                    await sayTourelos('「はは、君はやっぱり殺さないんだ。舐めてるの？とはいえ、僕も今は限界だから引こうかな。次は負けないから！」');
                    if (this.bossImage) {
                      this.tweens.add({ targets: this.bossImage, alpha: 0, duration: 500 });
                    }
                    await sayDevice('「またか。お前は何がしたい？この世界を終わらせたいのか？」');
                    await sayDevice('「それとも、役立たずとして処分されたいのか？」');
                    await sayHero('「……。」');
                  }
                  
                  if (dimBg) dimBg.destroy();
                  if (this.bossImage) this.bossImage.destroy();
                  if (this.heroImage) this.heroImage.destroy();
                  if (this.boss2Bgm) this.boss2Bgm.stop();
                  this.proceedToNextArea(boss, true);
                }
              }
            })();
        }
      };

      if (key === 'demon_lord') {
        // とどめを刺す前なので魔王のドットは消さずに玉座の前へ移動・表示維持
        boss.setVisible(true);
        boss.setAlpha(1);
        if (this.anims.exists('demon_combat_anim')) {
          boss.play('demon_combat_anim');
        } else {
          boss.setTexture('demon_combat_down_open');
        }
        if (this.inunekoEnemy && this.inunekoEnemy.active) {
          this.tweens.killTweensOf(this.inunekoEnemy);
          this.tweens.add({ targets: this.inunekoEnemy, x: 1300, y: 500, duration: 600, ease: 'Power2' });
        }
        this.tweens.add({
          targets: boss,
          x: 1400,
          y: 560,
          duration: 600,
          ease: 'Power2',
          onComplete: () => {
            handleDefeatedDialogue();
          }
        });
      } else {
        this.tweens.add({
          targets: boss,
          alpha: 0,
          scale: boss.scale * 1.5,
          duration: 800,
          ease: 'Power2',
          onComplete: () => {
            boss.setVisible(false);
            handleDefeatedDialogue();
          }
        });
      }
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
    
    this.cameras.main.shake(300, 0.02);
    
    // Both sprites remain visible or become visible
    this.currentBoss.setVisible(true).setAlpha(1);
    this.sisterBoss.setVisible(true).setAlpha(1);
    
    this.tweens.add({
      targets: [this.currentBoss, this.sisterBoss], alpha: 0.3, yoyo: true, repeat: 8, duration: 150,
      onComplete: () => {
        // Hide the physical bosses so they don't bleed into the background
        if (this.currentBoss) this.currentBoss.setVisible(false);
        if (this.sisterBoss) this.sisterBoss.setVisible(false);
        
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
        this.sisterImage = this.add.image(1920 - 500, 1080 / 2, 'sister_hurt').setAlpha(0).setDepth(90);
        var sScale = 750 / 600;
        if (this.textures.exists('sister_hurt')) {
          var tex1 = this.textures.get('sister_hurt').getSourceImage();
          if (tex1 && tex1.width > 0) sScale = 750 / tex1.width;
        }
        this.sisterImage.setScale(sScale);
        this.sisterImage.setY(100 + (this.sisterImage.height * sScale) / 2);

        // Brother Portrait (Default to 'brother_dying' for post-defeat)
        this.brotherImage = this.add.image(1920 - 250, 1080 / 2, 'brother_dying').setAlpha(0).setDepth(90);
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
        
        const sayHero = (text) => new Promise(res => { this.tweens.add({ targets: dimBg, alpha: 0.6, duration: 300 }); this.tweens.add({targets: this.heroImage, alpha: 1, duration: 300}); if(this.sisterImage) this.tweens.add({targets: this.sisterImage, alpha: 0.4, duration: 300}); if(this.brotherImage) this.tweens.add({targets: this.brotherImage, alpha: 0.4, duration: 300}); if (text === '「……」' || text === '「……。」' || text === '「…」') { this.heroImage.setTexture('hero_stand_silent'); } else { this.heroImage.setTexture('hero_stand'); } this.heroImage.setScale(750 / this.heroImage.width); this.heroImage.setY(100 + (this.heroImage.height * this.heroImage.scaleY) / 2); this.showDialogue(MOT.flags.heroName || '勇者', text, res); });
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
            // フェードアウト完了を確実に待ってから遷移（立ち絵が残るバグ対策）
            await new Promise(r => this.tweens.add({
              targets: [dimBg, this.sisterImage, this.brotherImage, this.heroImage].filter(Boolean),
              alpha: 0, duration: 500,
              onComplete: () => {
                if(this.sisterImage) { this.sisterImage.destroy(); this.sisterImage = null; }
                if(this.brotherImage) { this.brotherImage.destroy(); this.brotherImage = null; }
                r();
              }
            }));
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
            
            // フェードアウト完了を確実に待ってから遷移（立ち絵が残るバグ対策）
            await new Promise(r => this.tweens.add({
              targets: [dimBg, this.sisterImage, this.brotherImage, this.heroImage].filter(Boolean),
              alpha: 0, duration: 500,
              onComplete: () => {
                if(this.sisterImage) { this.sisterImage.destroy(); this.sisterImage = null; }
                if(this.brotherImage) { this.brotherImage.destroy(); this.brotherImage = null; }
                r();
              }
            }));
            
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
    
    // ─── 自動セーブ処理 ───
    if (MOT.saveGame) MOT.saveGame(3);
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
    
    // 画面暗転→ラスボス戦
    this.physics.pause();
    this.player.setCollideWorldBounds(false);
    this.tweens.add({ targets: this.player, x: 2100, duration: 1500, ease: 'Power2' });
    this.cameras.main.fadeOut(1500, 0, 0, 0);
    this.time.delayedCall(1500, () => { 
      let dKey = this.textures.exists('bg_doctor') ? 'bg_doctor' : 'bg_boss_stage5';
      this.bg.setTexture(dKey);
      if (dKey === 'bg_doctor') {
        this.bg.setOrigin(0.5, 0.5);
        this.bg.setPosition(1920 / 2, 1080 / 2);
        this.bg.setScale(Math.max(1920 / this.bg.width, 1080 / this.bg.height));
      } else {
        this.bg.setOrigin(0, 0);
        this.bg.setPosition(0, 0);
        this.bg.setScale(4);
      }
      this.tweens.killTweensOf(this.player);
      this.player.setPosition(-200, this.player.y);
      this.player.currentCol = 1;
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
      this.startIntermission(); 
    }, [], this);
  }

  hideBossHPBar() {
    if (this.bossHPBar) this.bossHPBar.clear();
    if (this.bossHPText) { this.bossHPText.setText(''); this.bossHPText.setVisible(false); }
    if (this.sisterHPText) { this.sisterHPText.setText(''); this.sisterHPText.setVisible(false); }
    if (this.bossHpBg) this.bossHpBg.setVisible(false);
    if (this.bossHpBar) { this.bossHpBar.clear(); this.bossHpBar.setVisible(false); }
  }

  // 撃破後の共通進行処理
  clearConversationUI() {
    if (this.dimBg) { this.dimBg.destroy(); this.dimBg = null; }
    if (this.heroImage) { this.heroImage.destroy(); this.heroImage = null; }
    if (this.demonImage) { this.demonImage.destroy(); this.demonImage = null; }
    if (this.inunekoImage) { this.inunekoImage.destroy(); this.inunekoImage = null; }
    if (this.doctorImage) { this.doctorImage.destroy(); this.doctorImage = null; }
    if (this.sisterImage) { this.sisterImage.destroy(); this.sisterImage = null; }
    if (this.brotherImage) { this.brotherImage.destroy(); this.brotherImage = null; }
    this.hideBossHPBar();
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
          let __img = document.getElementById('trueDemonLordImg'); if (__img) __img.remove(); this.scene.start('EndingScene');
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
          var nextBoss = this.bossQueue[this.currentBossIndex];
          var bgKey = 'bg_boss1_static';
          if (nextBoss === 'doctor' && this.textures.exists('bg_doctor')) bgKey = 'bg_doctor';
          else if (this.currentBossIndex === 1 && this.textures.exists('bg_stage2_scroll')) bgKey = 'bg_stage2_scroll';
          else if (this.currentBossIndex === 2 && this.textures.exists('bg_stage3_scroll')) bgKey = 'bg_stage3_scroll';
          else if (this.currentBossIndex === 3 && this.textures.exists('bg_stage4_scroll')) bgKey = 'bg_stage4_scroll';
          
          this.bg.setTexture(bgKey);
          if (bgKey.startsWith('bg_boss_stage')) {
              this.bg.setOrigin(0, 0);
              this.bg.setPosition(0, 0);
              this.bg.setScale(4);
          } else {
              this.bg.setOrigin(0.5, 0.5);
              this.bg.setPosition(1920 / 2, 1080 / 2);
              this.bg.setScale(Math.max(1920 / this.bg.width, 1080 / this.bg.height));
          }
          
          // Player enters from the left off-screen
          this.tweens.killTweensOf(this.player);
          this.player.setPosition(-200, this.player.y);
          this.player.currentCol = 1;
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
    
    let bgmKey = 'bgm_stage';
    if (this.bossQueue[this.currentBossIndex] === 'boss2') bgmKey = 'mob_bgm_boss2';
    else if (this.bossQueue[this.currentBossIndex] === 'boss3_twins') bgmKey = 'mob_bgm_boss3';
    else if (this.bossQueue[this.currentBossIndex] === 'demon_lord') bgmKey = 'mob_bgm_demon';
    
    this.stageBgm = this.sound.add(bgmKey, { loop: true, volume: 0.25 });
    this.stageBgm.play();

    let scrollTex = null;
    if (this.currentBossIndex === 1 && this.textures.exists('bg_stage2_scroll')) {
      scrollTex = 'bg_stage2_scroll';
    } else if (this.currentBossIndex === 2 && this.textures.exists('bg_stage3_scroll')) {
      scrollTex = 'bg_stage3_scroll';
    } else if (this.currentBossIndex === 3 && this.textures.exists('bg_stage4_scroll')) {
      scrollTex = 'bg_stage4_scroll';
    }

    if (scrollTex) {
      if (this.scrollBg1) {
        this.scrollBg1.destroy();
        this.scrollBg2.destroy();
      }
      this.scrollBg1 = this.add.image(0, 0, scrollTex).setOrigin(0, 0).setDepth(0);
      let scale = 1080 / this.scrollBg1.height;
      this.scrollBg1.setScale(scale);
      this.bgScrollWidth = this.scrollBg1.width * scale;
      this.scrollBg2 = this.add.image(this.bgScrollWidth, 0, scrollTex).setOrigin(0, 0).setDepth(0);
      this.scrollBg2.setScale(scale);

      this.scrollBg1.setVisible(true);
      this.scrollBg2.setVisible(true);
      if (this.bg) this.bg.setVisible(false);
    } else {
      if (this.scrollBg1) {
        this.scrollBg1.setVisible(false);
        this.scrollBg2.setVisible(false);
      }
      if (this.bg) this.bg.setVisible(true);
    }

    let key = this.bossQueue[this.currentBossIndex];
    let areaText = '';
    if (key === 'boss2') areaText = '「次のエリアに着いたか。そこは、宵闇の森だ。」';
    else if (key === 'boss3_twins') areaText = '「次のエリアに着いたか。そこは、子夜の城塞 だ。そろそろ魔王城に着くだろう。敵も強くなっている。気を付けてくれ」';
    else if (key === 'demon_lord') areaText = '「とうとう魔王城に着いたか。そこには魔王がいるはずだ。警戒を怠らないように」';

    let beginIntermission = () => {
      this.time.delayedCall(1000, function () {
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
        
        self.intermissionTimeout = self.time.delayedCall(20000, function () {
          self.endIntermission();
        });
      });
    };

    if (areaText !== '') {
      this.showDeviceDialogue(areaText, beginIntermission);
    } else {
      beginIntermission();
    }
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
    this.enemyGroup.getChildren().slice().forEach(function (e) {
      if (e.isIntermissionEnemy && e.active) e.destroy();
    });
    this.enemyBullets.clear(true, true);
    
    this.dialogActive = true;
    this.player.setCollideWorldBounds(false);
    this.tweens.add({ targets: this.player, x: 2100, duration: 1000, ease: 'Power2' });
    this.cameras.main.fadeOut(1000, 0, 0, 0);
    
    this.time.delayedCall(1000, () => {
      this.tweens.killTweensOf(this.player);
      this.player.setPosition(-200, this.player.y);
      this.player.currentCol = 1;
      if (this.player.body) this.player.body.reset(-200, this.player.y);
      
      this.startBoss();
      
      this.cameras.main.fadeIn(500, 0, 0, 0);
      this.tweens.add({
        targets: this.player, x: 300, duration: 1000, ease: 'Power2',
        onComplete: () => {
          this.dialogActive = false;
          this.player.setCollideWorldBounds(true);
        }
      });
    });
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
        if (text[charIndex - 1] !== ' ') MOT.Audio.playBleep('博士');
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
      if (event.key === ' ' || event.code === 'Space') {
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
      let btn = this.add.rectangle(w / 2, startY + index * 120, 1100, 90, 0x1F2933).setStrokeStyle(2, 0x4FD1FF).setInteractive({ useHandCursor: true }).setDepth(200000).setScrollFactor(0);
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
    text = String(text || '');
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
        if (text[charIndex - 1] !== ' ' && window.MOT && MOT.Audio && MOT.Audio.playBleep) MOT.Audio.playBleep(speaker);
        
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
      if (event.key === ' ' || event.code === 'Space') {
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
    const startY = h / 2 - ((choices.length - 1) * 60);
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
      const y = startY + i * 120;
      const btn = self.add.rectangle(w / 2, y, 1100, 90, 0x1F2933)
        .setStrokeStyle(2, 0x4FD1FF)
        .setInteractive({ useHandCursor: true })
        .setDepth(200002)
        .setScrollFactor(0);

      const txt = self.add.text(w / 2, y, choice.text, {
        fontFamily: '"DotGothic16"',
        fontSize: '26px',
        color: '#4FD1FF'
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
        if (window.MOT && MOT.Audio) MOT.Audio.playSelect();
        elements.forEach(function (el) { el.destroy(); });
        choice.callback();
      });
    });

    this.updateChoiceSelection = function(list) {
      list.forEach(function (choice, idx) {
        if (idx === self.selectedChoiceIndex) {
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
        if (window.MOT && MOT.Audio) MOT.Audio.playSelect();
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
    if (this.isDoctorPhase1Unwinnable || this.dialogActive) return;

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
      tex = 'demon_combat_down_open';
      msg = 'ヴェリタス「人間よ、少しは休むがよい！」\n【効果：HP回復】';
      MOT.flags.playerHP = Math.min((MOT.flags.playerMaxHP || 5), MOT.flags.playerHP + 2);
    } else if (chosen === 'twins') {
      tex = 'sister_shoot1'; // 妹立ち絵
      msg = 'エナリア「ふんっ、今回だけ特別に守ってあげるんだから！」\n【効果：無敵バリア展開】';
      this.barrierActive = true;
      this.barrierTime = 0;
      this.barrierCooldown = 0;
      if (!this.barrierVisual) {
        this.barrierVisual = this.add.star(this.player.x, this.player.y, 5, 30, 60, 0x00FFaa, 0.3);
        this.barrierVisual.setStrokeStyle(4, 0x00FFaa, 0.8);
        this.barrierVisual.setDepth(9);
      }
    } else if (chosen === 'boss2') {
      tex = 'boss2_combat_down_open';
      msg = 'トゥレロス「もっと速く、もっと激しく撃ちまくれぇ！！」\n【効果：連射速度超UP】';
      this.heroAttackSpeedBoost = true;
      this.time.delayedCall(8000, () => { this.heroAttackSpeedBoost = false; });
    } else if (chosen === 'boss1') {
      tex = 'boss1_combat';
      msg = 'クラトス「お前の力、そんなものではないだろう！！」\n【効果：攻撃力＆サイズUP】';
      this.heroFirepowerBoost = true;
      this.time.delayedCall(8000, () => { this.heroFirepowerBoost = false; });
    }
    
    this.assistImage = this.add.sprite(w / 2 - 500, h - 80, tex).setScale(1.1).setDepth(201);
    // scale and animation correction
    if (chosen === 'twins') {
      // no animation
    } else if (chosen === 'demon') {
      this.assistImage.play('demon_combat_anim');
      this.assistImage.setScale(0.95);
    } else if (chosen === 'boss2') {
      this.assistImage.play('boss2_battle_play');
    } else if (chosen === 'boss1') {
      this.assistImage.play('boss1_idle');
    }
    
    this.assistText.setText(msg);
    MOT.Audio.playBleep(''); 
    
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
      
//       this.iconPersonBg = this.add.image(390, 44, 'icon_person').setOrigin(0, 0).setTint(0x555555).setDepth(100).setScrollFactor(0).setScale(1.5);
//       this.iconPersonFill = this.add.image(390, 44, 'icon_person').setOrigin(0, 0).setTint(0xFFFF00).setDepth(100).setScrollFactor(0).setScale(1.5);
      
//       this.batteryUI = this.add.graphics().setDepth(100).setScrollFactor(0);
    }

    // Energy bar update (using scaleX instead of clear/fillRect)
    const isSpecialReady = (MOT.flags.energy >= MOT.flags.maxEnergyThreshold);
    const barColor = isSpecialReady ? 0xFF4B6E : 0x4FD1FF;
    this.energyBarFgObj.setFillStyle(barColor, 1);
    this.energyBarFgObj.scaleX = Math.max(0.001, pct);

    // 必殺技ゲージのハイライト
    this.energyBarOutline.clear();
    if (this.isEnergyHighlighted || isSpecialReady) {
      const flash = (Math.sin(Date.now() / 150) + 1) / 2;
      const strokeColor = isSpecialReady ? 0xFF2255 : 0xFFFF00;
      this.energyBarOutline.lineStyle(4, strokeColor, 0.5 + 0.5 * flash);
      this.energyBarOutline.strokeRect(26, 76, 308, 32);
    } else {
      this.energyBarOutline.lineStyle(2, 0x4FD1FF, 0.6);
      this.energyBarOutline.strokeRect(30, 80, 300, 24);
    }

    this.energyText.setText('EN: ' + MOT.flags.energy + '/' + MOT.flags.maxEnergyThreshold);

    // UI Meters removed per user request
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
    if (this.bossHPBar) this.bossHPBar.clear();
    let isTwins = this.currentBoss && this.currentBoss.configKey === 'boss3_twins';
    let showBossUI = false;

    // ボス撃破済み・会話中・カットシーン中・幕間中・HP0以下時はボスHPゲージを表示しない
    if (!this.bossDefeated && !this.cutsceneActive && !this.dialogActive && !this.intermissionActive) {
      if (isTwins) {
        if ((this.currentBoss && this.currentBoss.active && this.currentBoss.visible !== false && this.currentBoss.alpha > 0 && this.currentBoss.hp > 0) ||
            (this.sisterBoss && this.sisterBoss.active && this.sisterBoss.visible !== false && this.sisterBoss.alpha > 0 && this.sisterBoss.hp > 0)) {
          showBossUI = true;
        }
      } else {
        if (this.currentBoss && this.currentBoss.active && this.currentBoss.visible !== false && this.currentBoss.alpha > 0 && this.bossHP > 0) {
          showBossUI = true;
        }
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
        this.bossHPText.setVisible(true);
        var bpct = Math.max(0, this.bossHP) / this.bossMaxHP;
        this.bossHPBar.fillStyle(0x1F2933, 1); this.bossHPBar.fillRect(560, 50, 800, 20);
        if (bpct > 0) {
          this.bossHPBar.fillStyle(0xFF2E2E, 1); this.bossHPBar.fillRect(562, 52, 796 * bpct, 16);
        }
        this.bossHPBar.lineStyle(1, 0xFF2E2E, 0.6); this.bossHPBar.strokeRect(560, 50, 800, 20);
      }
    } else {
      if (this.bossHPText) {
        this.bossHPText.setText('');
        this.bossHPText.setVisible(false);
      }
      if (this.sisterHPText) {
        this.sisterHPText.setText('');
        this.sisterHPText.setVisible(false);
      }
      if (this.bossHPBar) this.bossHPBar.clear();
    }
  }
}

window.BossScene = BossScene;