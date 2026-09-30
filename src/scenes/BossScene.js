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

    const isDoctorP2 = Boolean(
      (data && (data.isDoctorPhase2 || data.isPhase2)) ||
      (MOT.flags && (MOT.flags.doctorPhase2 || MOT.flags.isDoctorPhase2))
    );
    if (this.currentBossIndex === 4) {
      if (isDoctorP2) {
        this.isDoctorPhase1Unwinnable = false;
        this.isDoctorPhase2 = true;
        if (!MOT.flags) MOT.flags = {};
        MOT.flags.doctorPhase2 = true;
      } else {
        this.isDoctorPhase1Unwinnable = true;
        this.isDoctorPhase2 = false;
      }
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
    this.dialogEndTime = 0;
    this.combatActive = false;
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
    this.hpText = null;
    this.energyText = null;
    this.energyBar = null;
    this.barrierIconBg = null;
    this.barrierIconFg = null;
    this.bossHPText = null;
    this.sisterHPText = null;
    this.bossHPBar = null;
    this.areaNameText = null;
    this.energyBarBgObj = null;
    this.energyBarFgObj = null;
    this.energyBarOutline = null;
    this.iconPersonBg = null;
    this.iconPersonFill = null;
    this.dollText = null;
    this.iconBatteryBg = null;
    this.iconBatteryFill = null;
    this.intentText = null;
    this.sisterImage = null;
    this.brotherImage = null;
    this.heroImage = null;
    this.dimBg = null;
    this.doctorImage = null;
    this.rightSpeakerImage = null;
    this.assistDialog = null;
    this.assistText = null;
    this.assistImage = null;
    this.dialogContainer = null;
    this.sisterBoss = null;
    this.currentBoss = null;
    this.inunekoEnemy = null;
    this.sisterLaneTimer = null;
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
    this.events.once('shutdown', () => {
      if (this.boss1Bgm) { try { this.boss1Bgm.stop(); } catch(e){} }
      if (this.boss2Bgm) { try { this.boss2Bgm.stop(); } catch(e){} }
      if (this.twinsBgm) { try { this.twinsBgm.stop(); } catch(e){} }
      if (this.boss4Bgm) { try { this.boss4Bgm.stop(); } catch(e){} }
      if (this.boss5Bgm) { try { this.boss5Bgm.stop(); } catch(e){} }
      if (this.bossLaneTimer) { try { this.bossLaneTimer.destroy(); } catch(e){} }
      if (this.sisterLaneTimer) { try { this.sisterLaneTimer.destroy(); } catch(e){} }
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
    const playerTex = this.textures.exists('hero_combat_down_open') ? 'hero_combat_down_open' : 'hero_stand';
    this.player = this.physics.add.sprite(-100, 460, playerTex).setScale(1.5).setDepth(10);
    
    // 当たり判定可視化用グラフィックス
//     this.playerHitboxGraphics = this.add.graphics();
//     this.playerHitboxGraphics.setDepth(11);

    if (this.anims.exists('hero_combat_anim') && this.anims.get('hero_combat_anim').frames && this.anims.get('hero_combat_anim').frames.length > 0) {
      this.player.play('hero_combat_anim');
    }
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
      if (this.barrierActive || this.barrierBreakInvincible) {
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
      this.time.delayedCall(1000, function () { let __img = document.getElementById('trueDemonLordImg'); if (__img) __img.remove(); const dec = (window.MOT && MOT.decideEnding) ? MOT.decideEnding() : { key: 'normal_daily' }; MOT.flags.finalEnding = dec.key; this.scene.start('EndingScene', { endingKey: dec.key }); }, [], this);
      return;
    }

    // 各ボス戦開始直前に進行状況（ボスインデックス）を自動セーブ
    if (MOT.saveGame) {
      MOT.saveGame(this.currentBossIndex);
    }

    this.combatActive = false;

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
    if (key === 'doctor' && (this.isDoctorPhase2 || !this.isDoctorPhase1Unwinnable)) {
      this.bossMaxHP = 1000;
      this.bossHP = (this.startData && this.startData.initialBossHP !== undefined) ? this.startData.initialBossHP : 1000;
    } else {
      this.bossMaxHP = cfg.hp;
      if (this.startData && this.startData.initialBossHP !== undefined) {
        this.bossHP = this.startData.initialBossHP;
      } else {
        this.bossHP = cfg.hp;
      }
    }
    this.bossPhase = 0;
    this.bossAttackTimer = 0;
    this.demonHomingTimer = 0;
    this.twinsReviving = false;
    this.isLaneBeamActive = false;
    this.bossDefeated = false;
    this.cutsceneActive = false;
    this.bossHalfHpSpoken = false;
    this.brotherHalfHpSpoken = false;
    this.sisterHalfHpSpoken = false;
    this.heroAttackSpeedBoost = false;
    this.heroFirepowerBoost = false;
    this.inunekoBoostActive = false;

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
    boss.hp = this.bossHP;
    boss.maxHp = this.bossMaxHP;
    boss.configKey = key;
    boss.name = cfg.name;
    boss.setVisible(false);
    boss.body.enable = false;
    if (key === 'boss3_twins') {
      boss.body.setSize(50, 110);
      boss.body.setOffset(35, 5);
    }
    if (key === 'doctor') {
      boss.body.setSize(70, 90);
      boss.body.setOffset(15, 5);
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

  playContinueIntro(key, boss, onComplete) {
    var w = 1920, h = 1080;
    var dimBg = this.add.rectangle(w / 2, h / 2, w, h, 0x000000, 0.6).setAlpha(0).setDepth(89);
    this.tweens.add({ targets: dimBg, alpha: 0.6, duration: 300 });

    var heroImage = this.add.image(300, h / 2, 'hero_stand').setAlpha(0).setDepth(90);
    var hScale = 750 / (heroImage.width || 600);
    heroImage.setScale(hScale);
    heroImage.setY(100 + (heroImage.height * hScale) / 2);
    this.tweens.add({ targets: heroImage, alpha: 0.4, duration: 300 });

    if (key === 'boss3_twins') {
      var sisterImage = this.add.image(w - 450, h / 2, 'sister_normal').setAlpha(0).setDepth(90);
      var sWidth = (this.textures.exists('sister_normal') && this.textures.get('sister_normal').getSourceImage()) ? this.textures.get('sister_normal').getSourceImage().width : 600;
      var sScale = 750 / (sWidth || 600);
      sisterImage.setScale(sScale);
      sisterImage.setY(100 + (sisterImage.height * sScale) / 2);

      var brotherImage = this.add.image(w - 200, h / 2, 'brother_normal').setAlpha(0).setDepth(90);
      var bWidth = (this.textures.exists('brother_normal') && this.textures.get('brother_normal').getSourceImage()) ? this.textures.get('brother_normal').getSourceImage().width : 600;
      var bScale = 750 / (bWidth || 600);
      brotherImage.setScale(bScale);
      brotherImage.setY(100 + (brotherImage.height * bScale) / 2);

      this.tweens.add({ targets: [sisterImage, brotherImage], alpha: 1, duration: 300 });

      const finishIntro = () => {
        this.tweens.add({
          targets: [dimBg, heroImage, sisterImage, brotherImage],
          alpha: 0,
          duration: 300,
          onComplete: () => {
            if (dimBg) dimBg.destroy();
            if (heroImage) heroImage.destroy();
            if (sisterImage) sisterImage.destroy();
            if (brotherImage) brotherImage.destroy();
            onComplete();
          }
        });
      };

      this.showDialogue('エナリア', '「私は貴方を止めるわ」', () => {
        this.showDialogue('エディオ', '「ここは通さない」', () => {
          finishIntro();
        });
      });
    } else if (key === 'demon_lord') {
      var demonImage = this.add.image(w - 300, h / 2, 'demon_lord_normal').setAlpha(0).setDepth(90);
      var dScale = 1000 / (demonImage.width || 800);
      demonImage.setScale(dScale);
      demonImage.setY(100 + (demonImage.height * dScale) / 2 - 200);

      var inunekoImage = this.add.image(w - 120, 350, 'inuneko_stand').setAlpha(0).setDepth(91);
      inunekoImage.setScale(300 / 691);

      this.tweens.add({ targets: [demonImage, inunekoImage], alpha: 1, duration: 300 });

      this.showDialogue('魔王', '「わらわを倒せるかな？」', () => {
        this.tweens.add({
          targets: [dimBg, heroImage, demonImage, inunekoImage],
          alpha: 0,
          duration: 300,
          onComplete: () => {
            if (dimBg) dimBg.destroy();
            if (heroImage) heroImage.destroy();
            if (demonImage) demonImage.destroy();
            if (inunekoImage) inunekoImage.destroy();
            onComplete();
          }
        });
      });
    } else if (key === 'doctor') {
      var doctorImage = this.add.image(w - 300, h / 2, 'doctor_awaken_smile_weapon').setAlpha(0).setDepth(90);
      var docScale = 900 / (doctorImage.width || 700);
      doctorImage.setScale(docScale);
      doctorImage.setY(100 + (doctorImage.height * docScale) / 2);

      this.tweens.add({ targets: doctorImage, alpha: 1, duration: 300 });

      MOT.flags.doctorContinueCount = (MOT.flags.doctorContinueCount || 0) + 1;
      const count = MOT.flags.doctorContinueCount;
      let text = '';
      if (count === 1) text = '「今度も倒してやろう」';
      else if (count === 2) text = '「私の野望はお前ごときには止められない」';
      else if (count === 3) text = '「三度目の正直にはなれそうにないな？」';
      else text = `「${count}回目だな。何回やってもおなじことだぞ。」`;

      this.showDialogue('博士', text, () => {
        this.tweens.add({
          targets: [dimBg, heroImage, doctorImage],
          alpha: 0,
          duration: 300,
          onComplete: () => {
            if (dimBg) dimBg.destroy();
            if (heroImage) heroImage.destroy();
            if (doctorImage) doctorImage.destroy();
            onComplete();
          }
        });
      });
    } else {
      var bossTex = key === 'boss1' ? 'boss1_normal' : 'boss2_normal';
      var speaker = key === 'boss1' ? 'クラトス' : 'トゥレロス';
      var text = key === 'boss1' ? '「よし、戦うぞ！！」' : '「俺の速さについてこれるか？」';

      var bossImage = this.add.image(w - 300, h / 2, bossTex).setAlpha(0).setDepth(90);
      var bScale = 750 / (bossImage.width || 600);
      bossImage.setScale(bScale);
      bossImage.setY(100 + (bossImage.height * bScale) / 2);

      this.tweens.add({ targets: bossImage, alpha: 1, duration: 300 });

      this.showDialogue(speaker, text, () => {
        this.tweens.add({
          targets: [dimBg, heroImage, bossImage],
          alpha: 0,
          duration: 300,
          onComplete: () => {
            if (dimBg) dimBg.destroy();
            if (heroImage) heroImage.destroy();
            if (bossImage) bossImage.destroy();
            onComplete();
          }
        });
      });
    }
  }

  startBossIntro(key, boss) {
    this.cutsceneActive = true;

    if (!MOT.flags) MOT.flags = {};
    if (!MOT.flags.bossIntroSeen) MOT.flags.bossIntroSeen = {};

    const targetIdx = (this.startData && this.startData.startBossIndex !== undefined) 
      ? this.startData.startBossIndex 
      : (this.startData && this.startData.bossIndex !== undefined ? this.startData.bossIndex : undefined);

    const isDoctorP2 = Boolean(key === 'doctor' && (this.isDoctorPhase2 || !this.isDoctorPhase1Unwinnable));
    const isRetryContinue = Boolean(
      (this.startData && this.startData.fromContinue) ||
      (MOT.flags && MOT.flags.bossIntroSeen && MOT.flags.bossIntroSeen[key]) ||
      isDoctorP2
    );

    MOT.flags.bossIntroSeen[key] = true;
    if (this.startData) {
      this.startData.fromContinue = false;
    }
    if (MOT.saveGame) {
      MOT.saveGame(this.currentBossIndex);
    }

    if (isRetryContinue) {
      this.dialogActive = true;
      this.physics.pause();
      
      boss.setVisible(true); boss.body.enable = true;
      this.cameras.main.shake(400, 0.015);
      
      let movePromise;
      if (key === 'boss3_twins') {
         if (this.sisterBoss) {
             this.sisterBoss.setVisible(true); this.sisterBoss.body.enable = true;
             this.tweens.add({ targets: this.sisterBoss, x: 1550, duration: 1200, ease: 'Power2' });
             this.tweens.add({ targets: this.sisterBoss, y: this.sisterBoss.y + 30, yoyo: true, repeat: -1, duration: 1100, ease: 'Sine.easeInOut' });
         }
         movePromise = new Promise(r => this.tweens.add({ targets: boss, x: 1400, duration: 1200, ease: 'Power2', onComplete: r }));
         this.tweens.add({ targets: boss, y: boss.y - 30, yoyo: true, repeat: -1, duration: 1000, ease: 'Sine.easeInOut' });
      } else if (key === 'demon_lord') {
         if (this.inunekoEnemy) {
            this.inunekoEnemy.setVisible(true);
            this.inunekoEnemy.x = 1920;
            this.tweens.add({ targets: this.inunekoEnemy, x: 1350, duration: 1200, ease: 'Power2' });
            this.tweens.add({ targets: this.inunekoEnemy, y: '-=20', duration: 1600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
         }
         movePromise = new Promise(r => this.tweens.add({ targets: boss, x: 1400, duration: 1200, ease: 'Power2', onComplete: r }));
         this.tweens.add({ targets: boss, y: boss.y - 30, yoyo: true, repeat: -1, duration: 1000, ease: 'Sine.easeInOut' });
      } else {
         movePromise = new Promise(r => this.tweens.add({ targets: boss, x: 1400, duration: 1200, ease: 'Power2', onComplete: r }));
         this.tweens.add({ targets: boss, y: boss.y - 30, yoyo: true, repeat: -1, duration: 1000, ease: 'Sine.easeInOut' });
      }

      movePromise.then(() => {
          this.playContinueIntro(key, boss, () => {
             this.cutsceneActive = false;
             this.dialogActive = false;
             this.dialogEndTime = Date.now();
             this.physics.resume();
             this.startBossLaneMovement();
             this.combatActive = true;
             if (key === 'boss1') {
                this.boss1Bgm = this.sound.add('boss1_bgm', { loop: true, volume: 0.2 });
                this.boss1Bgm.play();
             } else if (key === 'boss2') {
                this.boss2Bgm = this.sound.add('boss2_bgm', { loop: true, volume: 0.2 });
                this.boss2Bgm.play();
             } else if (key === 'boss3_twins') {
                this.startSisterLaneMovement();
                this.twinsBgm = this.sound.add('twins_bgm', { loop: true, volume: 0.2 });
                this.twinsBgm.play();
                if (this.sisterBoss && this.sisterBoss.active) {
                   this.sisterBoss.play('sister_shoot_anim');
                }
             } else if (key === 'demon_lord') {
                this.boss4Bgm = this.sound.add('demon_lord_bgm', { loop: true, volume: 0.2 });
                this.boss4Bgm.play();
             } else if (key === 'doctor') {
                if (this.inunekoEnemy) { if (this.inunekoEnemy.destroy) this.inunekoEnemy.destroy(); this.inunekoEnemy = null; }
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
                } else {
                  this.isDoctorPhase2 = true;
                  MOT.flags.playerHP = MOT.flags.playerMaxHP || 5;
                  this.playerInvincible = false;
                  this.updateHUD();
                }
             }
          });
      });
      return;
    }

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
            this.dialogEndTime = Date.now();
            this.physics.resume();
            this.startBossLaneMovement();
            this.combatActive = true;
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
            this.dialogEndTime = Date.now();
            this.physics.resume();
            this.startBossLaneMovement();
            this.combatActive = true;
            if (!MOT.flags) MOT.flags = {};
            if (!MOT.flags.bossIntroSeen) MOT.flags.bossIntroSeen = {};
            MOT.flags.bossIntroSeen['doctor'] = true;
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
      if (!MOT.flags) MOT.flags = {};
      if (!MOT.flags.bossIntroSeen) MOT.flags.bossIntroSeen = {};
      MOT.flags.bossIntroSeen['demon_lord'] = true;
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
              if (this.currentBoss && this.currentBoss.active && !this.dialogActive && this.currentBoss.hp > 0 && !this.bossDefeated) {
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

    // 補助魔法（8〜14秒ごとに4種類のバフから選択）
    let lastInunekoAction = -1;
    const supportAction = () => {
      if (this.bossDefeated || this.dialogActive || this.cutsceneActive || !this.inunekoEnemy || !this.inunekoEnemy.visible) {
        if (!this.bossDefeated) {
          this.time.delayedCall(Phaser.Math.Between(8000, 13000), supportAction);
        }
        return;
      }
      const available = [0, 1, 2, 3].filter(a => a !== lastInunekoAction);
      const action = Phaser.Utils.Array.GetRandom(available);
      lastInunekoAction = action;

      if (action === 0) {
        this.inunekoBarrier(boss);
      } else if (action === 1) {
        this.inunekoAttackBuff(boss);
      } else if (action === 2) {
        this.inunekoHealBuff(boss);
      } else {
        this.inunekoSpeedBoost(boss);
      }
      this.time.delayedCall(Phaser.Math.Between(9000, 14000), supportAction);
    };
    this.time.delayedCall(Phaser.Math.Between(6000, 9000), supportAction);
  }

  // 魔王のランダム返事（犬猫のバフに対して「助かった」「わらわの使い魔は頼りになるな」「ふふ、愛いやつじゃ」）
  triggerDemonReply() {
    this.time.delayedCall(700, () => {
      if (this.currentBoss && this.currentBoss.active && this.currentBoss.visible && !this.dialogActive && !this.bossDefeated) {
        const replies = [
          '「助かった」',
          '「わらわの使い魔は頼りになるな」',
          '「ふふ、愛いやつじゃ」'
        ];
        const reply = Phaser.Utils.Array.GetRandom(replies);
        this.showPixelSpeechBubble(this.currentBoss, '魔王', reply, 2400);
      }
    });
  }

  // 補助魔法1: シールド（魔王にシールドを張り、ダメージカット90%を5秒間）
  inunekoBarrier(boss) {
    if (this.demonLordBarrierActive) return;
    if (MOT.Audio && MOT.Audio.playMagic) MOT.Audio.playMagic();
    this.demonLordBarrierActive = true;

    // 犬猫のセリフ吹き出し＆魔王の返事
    this.showPixelSpeechBubble(this.inunekoEnemy, '犬猫☆スター', '「魔王様を守るわん」', 2600);
    this.triggerDemonReply();

    // バリアの見た目（ボスの周囲に黄金＆紫の二重光輪）
    if (this.barrierGraphic) {
      this.barrierGraphic.destroy();
      this.barrierGraphic = null;
    }
    this.barrierGraphic = this.add.graphics().setDepth(15);
    const drawBarrier = () => {
      if (!this.barrierGraphic || !boss || !boss.active) return;
      this.barrierGraphic.clear();
      const pulse = 0.8 + 0.2 * Math.sin(Date.now() / 120);
      this.barrierGraphic.lineStyle(4, 0xFFDD00, pulse);
      this.barrierGraphic.strokeCircle(boss.x, boss.y, 90);
      this.barrierGraphic.lineStyle(2, 0xD500F9, 0.7);
      this.barrierGraphic.strokeCircle(boss.x, boss.y, 80);
    };
    this.barrierUpdateCb = drawBarrier;

    // 5秒後に解除
    this.time.delayedCall(5000, () => {
      this.demonLordBarrierActive = false;
      if (this.barrierGraphic) {
        this.barrierGraphic.destroy();
        this.barrierGraphic = null;
      }
      this.barrierUpdateCb = null;
    });
  }

  // 補助魔法2: 攻撃力バフ（3秒間発射された弾の威力二倍）
  inunekoAttackBuff(boss) {
    if (this.demonLordAttackBoostActive) return;
    if (MOT.Audio && MOT.Audio.playMagic) MOT.Audio.playMagic();
    this.demonLordAttackBoostActive = true;

    // 犬猫のセリフ吹き出し＆魔王の返事
    this.showPixelSpeechBubble(this.inunekoEnemy, '犬猫☆スター', '「これで威力二倍だにゃん」', 2600);
    this.triggerDemonReply();

    // 魔王に赤い攻撃力オーラ付与
    if (boss && boss.active) {
      boss.setTint(0xFF3366);
    }

    // キラキラ紅炎エフェクト
    for (let i = 0; i < 8; i++) {
      this.time.delayedCall(i * 70, () => {
        if (!boss || !boss.active) return;
        const flame = this.add.text(
          boss.x + Phaser.Math.Between(-40, 40),
          boss.y + Phaser.Math.Between(-30, 30),
          '🔥', { fontSize: '20px' }
        ).setDepth(20);
        this.tweens.add({
          targets: flame,
          y: flame.y - 50,
          alpha: 0,
          scale: 1.5,
          duration: 600,
          onComplete: () => flame.destroy()
        });
      });
    }

    // 3秒後に解除
    this.time.delayedCall(3000, () => {
      this.demonLordAttackBoostActive = false;
      if (boss && boss.active) {
        boss.clearTint();
      }
    });
  }

  // 補助魔法3: 回復バフ（魔王のHPをほんの少し回復）
  inunekoHealBuff(boss) {
    if (MOT.Audio && MOT.Audio.playMagic) MOT.Audio.playMagic();

    // 犬猫のセリフ吹き出し＆魔王の返事
    this.showPixelSpeechBubble(this.inunekoEnemy, '犬猫☆スター', '「魔王様にボクの癒しをあげるにゃん♡」', 2600);
    this.triggerDemonReply();

    // 魔王のHPをほんの少し回復 (+3 HP、最大HPを超えない)
    const healAmount = 3;
    this.bossHP = Math.min(this.bossMaxHP, this.bossHP + healAmount);
    boss.hp = this.bossHP;

    // 頭上にポップアップと癒しエフェクト
    this.showFloatingText(boss.x, boss.y - 90, `+${healAmount} HP`, '#00FF88');
    for (let i = 0; i < 10; i++) {
      this.time.delayedCall(i * 60, () => {
        if (!boss || !boss.active) return;
        const heart = this.add.text(
          boss.x + Phaser.Math.Between(-50, 50),
          boss.y + Phaser.Math.Between(-30, 30),
          Phaser.Math.Between(0, 1) === 0 ? '💚' : '💖',
          { fontSize: '20px' }
        ).setDepth(25);
        this.tweens.add({
          targets: heart,
          y: heart.y - 60,
          alpha: 0,
          duration: 800,
          onComplete: () => heart.destroy()
        });
      });
    }
  }

  // 補助魔法4: 速度バフ（5秒間攻撃速度アップ）
  inunekoSpeedBoost(boss) {
    if (MOT.Audio && MOT.Audio.playMagic) MOT.Audio.playMagic();
    this.inunekoBoostActive = true;

    // 犬猫のセリフ吹き出し＆魔王の返事
    this.showPixelSpeechBubble(this.inunekoEnemy, '犬猫☆スター', '「スピード、アップだにゃん！！」', 2600);
    this.triggerDemonReply();

    // キラキラ星エフェクト（犬猫と魔王の位置から）
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

    // 5秒後に解除
    this.time.delayedCall(5000, () => {
      this.inunekoBoostActive = false;
    });
  }

  // 頭上ポップアップテキスト表示ヘルパー
  showFloatingText(x, y, text, color = '#00FF88') {
    const txt = this.add.text(x, y, text, {
      fontFamily: '"DotGothic16", monospace',
      fontSize: '28px',
      color: color,
      fontStyle: 'bold',
      stroke: '#050814',
      strokeThickness: 4
    }).setOrigin(0.5).setDepth(650);
    this.tweens.add({
      targets: txt,
      y: y - 50,
      alpha: 0,
      duration: 1000,
      ease: 'Power1.easeOut',
      onComplete: () => txt.destroy()
    });
  }



  update(time, delta) {
    if (this.dialogActive) {
      this.lastDialogActive = true;
    } else if (this.lastDialogActive) {
      this.lastDialogActive = false;
      this.dialogEndTime = Date.now();
    }

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
    
    // 戦闘開始直後のみバリアクールタイム（2秒）をセット（会話ごとの理不尽リセットを防止）
    if (!isDialog && !this.initialBarrierCDSet) {
      this.initialBarrierCDSet = true;
      this.barrierCooldown = 2000;
    }
    this.lastDialogActive = isDialog;

    if (isDialog) {
      this.hideBossHPBar();
      this.updateHUD();
      return;
    }
    
    if (this.cutsceneActive) {
      this.hideBossHPBar();
      MOT.handleMovement(this, this.player);
      
      // バリアの更新（移動時に追従させるため）
      if (!this.barrierActive && this.barrierCooldown > 0) {
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
    if (!this.barrierActive && this.barrierCooldown > 0) {
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
      if (this.currentBoss.configKey === 'boss3_twins') interval = 2400; // 兄の攻撃頻度を下げる（元1200）
      if (this.currentBoss.configKey === 'doctor') interval = this.bossHP < this.bossMaxHP * 0.5 ? 1400 : 1800; // 博士の攻撃頻度を上げる
      if (this.currentBoss.configKey === 'demon_lord') interval = this.bossHP < this.bossMaxHP * 0.5 ? 2500 : 3000; // 魔王の螺旋弾幕（2.4秒）と重ならないように大幅緩和
      if (this.inunekoBoostActive) interval = Math.floor(interval * 0.5); // 犬猫スター速度バフ（攻撃速度アップ）
      
      if (this.bossAttackTimer >= interval) {
        this.bossAttackTimer = 0;
        this.bossAttack();
      }
    }

    // 魔王（demon_lord）：体力が半分以下になったら10秒に一回追尾弾を発射
    if (this.currentBoss && this.currentBoss.active && this.currentBoss.visible && !this.dialogActive && this.currentBoss.configKey === 'demon_lord') {
      if (this.bossHP <= this.bossMaxHP * 0.5) {
        if (!this.demonHomingTimer) this.demonHomingTimer = 0;
        this.demonHomingTimer += delta;
        if (this.demonHomingTimer >= 10000) {
          this.demonHomingTimer = 0;
          this.fireDemonHomingBullet();
        }
      } else {
        this.demonHomingTimer = 0;
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

          let downSpeaker = isBrotherDefeated ? 'エナリア' : 'エディオ';
          let downText = isBrotherDefeated ? '兄さん…！？ 待ってて、今助けるわ！' : 'エナリア…！？ くそっ、待ってろ！';
          this.showPixelSpeechBubble(aliveBoss, downSpeaker, downText, 2600);
          
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
             
             let speaker = isBrotherDefeated ? 'エナリア' : 'エディオ';
             let speakerText = isBrotherDefeated ? '兄さん！起きて！' : 'しっかりしろ！';
             this.showPixelSpeechBubble(aliveBoss, speaker, speakerText, 2600);
          });
        }
      }
    }

    // Cleanup
    this.enemyGroup.getChildren().slice().forEach(function (e) {
      if (e.x < -100) {
        if (e.isScenarioMinion || e.isIntermissionEnemy) {
          this.onBossHit({ active: true, damage: 9999, silent: true, destroy: function(){} }, e);
        } else {
          e.destroy();
        }
      }
    }.bind(this));

    let now = this.time.now;
    this.enemyBullets.getChildren().slice().forEach(function (b) {
      if (b.updateBehavior) b.updateBehavior(now, delta);
      if (b.x < -50 || b.x > 2000 || b.y < -50 || b.y > 1130) b.destroy();
    });
    this.playerBullets.getChildren().slice().forEach(function (b) {
      if (b.x > 1600) b.destroy();
    });

    // 犬猫バリアグラフィック更新
    if (this.barrierUpdateCb) this.barrierUpdateCb();


    this.updateHUD();
  }

  /**
   * 双子戦などの戦闘ドット用レトロ風吹き出しを表示する
   * @param {Phaser.GameObjects.Sprite|Phaser.GameObjects.Components.Transform} target 話者スプライト
   * @param {string} speaker 話者名 ('エナリア' または 'エディオ')
   * @param {string} text セリフ本文
   * @param {number} duration 表示ミリ秒
   */
  showPixelSpeechBubble(target, speaker, text, duration = 2600) {
    if (!target) return;

    let themeColor = 0x4FD1FF;
    let themeHex = '#4FD1FF';
    let nameLabel = speaker;

    if (speaker.includes('エナリア')) {
      themeColor = 0xFF4B6E; themeHex = '#FF4B6E'; nameLabel = 'エナリア';
    } else if (speaker.includes('エディオ')) {
      themeColor = 0x4FD1FF; themeHex = '#4FD1FF'; nameLabel = 'エディオ';
    } else if (speaker.includes('クラトス')) {
      themeColor = 0xF59E0B; themeHex = '#F59E0B'; nameLabel = 'クラトス';
    } else if (speaker.includes('トゥレロス')) {
      themeColor = 0xA855F7; themeHex = '#A855F7'; nameLabel = 'トゥレロス';
    } else if (speaker.includes('魔王')) {
      themeColor = 0xE11D48; themeHex = '#E11D48'; nameLabel = '魔王';
    } else if (speaker.includes('博士')) {
      themeColor = 0x00FF88; themeHex = '#00FF88'; nameLabel = '博士';
    } else if (speaker.includes('犬猫') || speaker.includes('スター')) {
      themeColor = 0xFFD700; themeHex = '#FFD700'; nameLabel = '犬猫☆スター';
    }

    if (target._speechBubble && target._speechBubble.active) {
      target._speechBubble.destroy();
      target._speechBubble = null;
    }

    const initX = target.x || 960;
    const initY = (target.y || 540) - 100;

    const container = this.add.container(initX, initY).setDepth(600);
    target._speechBubble = container;

    const nameText = this.add.text(0, 0, `▼ ${nameLabel}`, {
      fontFamily: '"DotGothic16", monospace',
      fontSize: '20px',
      color: themeHex,
      fontStyle: 'bold'
    }).setOrigin(0, 0);

    const mainText = this.add.text(0, 24, text, {
      fontFamily: '"DotGothic16", monospace',
      fontSize: '28px',
      color: '#FFFFFF',
      fontStyle: 'bold',
      stroke: '#050814',
      strokeThickness: 3
    }).setOrigin(0, 0);

    const padX = 22;
    const padY = 14;
    const contentW = Math.max(nameText.width, mainText.width);
    const bubbleW = Math.max(240, contentW + padX * 2);
    const bubbleH = nameText.height + mainText.height + padY * 2 + 8;

    const bx = -bubbleW / 2;
    const by = -bubbleH;

    nameText.setPosition(bx + padX, by + padY);
    mainText.setPosition(bx + padX, by + padY + 26);

    const gfx = this.add.graphics();
    gfx.clear();

    // 1. 最外周の黒フチ（ドット風階段長方形 + しっぽ）
    gfx.fillStyle(0x000000, 1);
    gfx.fillRect(bx - 3, by + 6, bubbleW + 6, bubbleH - 12);
    gfx.fillRect(bx + 6, by - 3, bubbleW - 12, bubbleH + 6);
    gfx.fillRect(bx, by + 3, bubbleW, bubbleH - 6);
    gfx.fillRect(bx + 3, by, bubbleW - 6, bubbleH);
    gfx.fillTriangle(-14, by + bubbleH - 2, 14, by + bubbleH - 2, 0, by + bubbleH + 20);

    // 2. キャラカラーのドットボーダー（厚さ4px）
    gfx.fillStyle(themeColor, 1);
    gfx.fillRect(bx, by + 4, bubbleW, bubbleH - 8);
    gfx.fillRect(bx + 4, by, bubbleW - 8, bubbleH);
    gfx.fillTriangle(-10, by + bubbleH - 2, 10, by + bubbleH - 2, 0, by + bubbleH + 16);

    // 3. 内側の背景（深黒紺 #050914、不透明度 0.95 で視認性抜群）
    gfx.fillStyle(0x050914, 0.95);
    const m = 4;
    gfx.fillRect(bx + m, by + 4 + m, bubbleW - m * 2, bubbleH - 8 - m * 2);
    gfx.fillRect(bx + 4 + m, by + m, bubbleW - 8 - m * 2, bubbleH - m * 2);
    gfx.fillTriangle(-6, by + bubbleH - m - 2, 6, by + bubbleH - m - 2, 0, by + bubbleH + 10);

    // 4. 内側のハイライトライン
    gfx.lineStyle(2, themeColor, 0.5);
    gfx.lineBetween(bx + 8, by + 8, bx + bubbleW - 8, by + 8);

    container.add([gfx, nameText, mainText]);

    const clampPos = () => {
      const halfW = bubbleW / 2;
      if (container.x - halfW < 30) container.x = halfW + 30;
      if (container.x + halfW > 1890) container.x = 1890 - halfW;
      if (container.y - bubbleH < 30) container.y = bubbleH + 30;
    };
    clampPos();

    const trackEvent = this.time.addEvent({
      delay: 16,
      loop: true,
      callback: () => {
        if (!container.active || !target.active) {
          trackEvent.remove();
          return;
        }
        container.x = target.x;
        container.y = target.y - (target.displayHeight ? target.displayHeight * 0.5 + 40 : 100);
        clampPos();
      }
    });

    container.setScale(0);
    this.tweens.add({
      targets: container,
      scaleX: 1,
      scaleY: 1,
      duration: 160,
      ease: 'Back.easeOut'
    });

    if (MOT.Audio && MOT.Audio.playBleep) {
      MOT.Audio.playBleep(nameLabel);
    }

    this.time.delayedCall(duration, () => {
      trackEvent.remove();
      if (!container.active) return;
      this.tweens.add({
        targets: container,
        scaleY: 0,
        alpha: 0,
        duration: 160,
        ease: 'Power2.easeIn',
        onComplete: () => {
          container.destroy();
          if (target._speechBubble === container) {
            target._speechBubble = null;
          }
        }
      });
    });

    return container;
  }

  canUseCombatSkills() {
    if (!this.combatActive) return false;
    if (this.dialogActive) return false;
    if (this.cutsceneActive) return false;
    if (this.choiceActive) return false;
    if (this.bossDefeated) return false;
    if (this.dialogContainer && this.dialogContainer.active) return false;
    if (Date.now() - (this.dialogEndTime || 0) < 500) return false;
    return true;
  }

  onBarrierUse() {
    if (!this.canUseCombatSkills()) return;
    if (this.barrierCooldown <= 0 && !this.barrierActive) {
      MOT.Audio.playBleep('');
      this.barrierActive = true;
      this.barrierTime = 0;
      this.barrierCooldown = 0; // 展開中はクールタイム未開始
      this.barrierActivatedTime = this.time.now; // ジャストガード用タイマー記録

      if (this.barrierVisual) {
        this.barrierVisual.destroy();
        this.barrierVisual = null;
      }
      this.barrierVisual = this.add.circle(this.player.x, this.player.y, 60, 0x00FFaa, 0.3);
      this.barrierVisual.setStrokeStyle(4, 0x00FFaa, 0.8);
      this.barrierVisual.setDepth(9);
    }
  }

  deactivateBarrier() {
    if (!this.barrierActive) return;
    this.barrierActive = false;
    this.barrierCooldown = 2000; // バリア終了・破壊時に2秒間のクールタイムを開始
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

  grantSpecialInvincibility(durationMs = 200) {
    this.playerInvincible = true;
    if (this.player) {
      this.player.isInvincible = true;
      this.player.isInvulnerable = true;
    }
    if (this.specialInvincibleTimer) {
      this.specialInvincibleTimer.remove();
    }
    if (this.player && this.player.active) {
      this.tweens.add({
        targets: this.player,
        alpha: 0.6,
        yoyo: true,
        repeat: 1,
        duration: Math.max(30, Math.floor(durationMs / 4)),
        onComplete: () => {
          if (this.player && this.player.active) this.player.setAlpha(1);
        }
      });
    }
    this.specialInvincibleTimer = this.time.delayedCall(durationMs, () => {
      if (!this._specialCutinRunning) {
        this.playerInvincible = false;
        if (this.player) {
          this.player.isInvincible = false;
          this.player.isInvulnerable = false;
          if (this.player.active) this.player.setAlpha(1);
        }
      }
    });
  }

  onSpecialAttack() {
    if (!this.canUseCombatSkills()) return;
    if (MOT.flags.maxEnergy && !this._specialCutinRunning) {
      MOT.flags.energy = 0;
      MOT.flags.maxEnergy = false;
      this.grantSpecialInvincibility(200);

      const executeAttack = () => {
        this.grantSpecialInvincibility(200);
        if (!this.cameras || !this.cameras.main) return;
        this.cameras.main.flash(500, 79, 209, 255);
        const px = this.player ? this.player.x : 960;
        const py = this.player ? this.player.y : 540;
        for (let i = 0; i < 36; i++) {
          const angle = Phaser.Math.DegToRad(i * 10);
          const bullet = this.playerBullets.create(px, py, 'bullet_player');
          if (bullet) {
            bullet.setVelocity(Math.cos(angle) * 1000, Math.sin(angle) * 1000);
            bullet.setScale(4);
            bullet.setTint(0x4FD1FF);
            bullet.damage = 8;
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
      };

      if (MOT.playHeroSpecialCutin) {
        MOT.playHeroSpecialCutin(this, executeAttack);
      } else {
        MOT.Audio.playSpecial();
        executeAttack();
      }
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
                  if (this.damage && this.damage > 1) {
                    b.damage = this.damage;
                    b.setTint(0xFF0055);
                  }
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

  // 魔王の追尾弾（HP50%以下で10秒に一回発射：星型＆スピードUP）
  fireDemonHomingBullet() {
    if (!this.currentBoss || !this.currentBoss.active || !this.player || !this.player.active || this.dialogActive) return;

    const bx = this.currentBoss.x;
    const by = this.currentBoss.y;

    // 発射時のダークパープル衝撃波エフェクト
    const chargeRing = this.add.circle(bx, by, 20)
      .setStrokeStyle(3, 0xd500f9, 0.9)
      .setDepth(15);
    this.tweens.add({
      targets: chargeRing,
      radius: 80,
      alpha: 0,
      duration: 350,
      ease: 'Cubic.easeOut',
      onComplete: () => chargeRing.destroy()
    });

    if (MOT.Audio && MOT.Audio.playShot) MOT.Audio.playShot();

    // 追尾弾（星型の弾 bullet_star、妖しく輝く魔王パープル）
    const bullet = this.enemyBullets.create(bx, by, 'bullet_star');
    if (!bullet) return;

    bullet.setScale(2.2);
    bullet.setTint(0xEA00D9);
    bullet.setDepth(14);
    bullet.isHoming = true;
    if (this.demonLordAttackBoostActive) {
      bullet.damage = 2;
      bullet.setTint(0xFF0033);
      bullet.setScale(2.7);
    } else {
      bullet.damage = 1;
    }

    // 星型弾の軌跡パーティクル
    const starTrail = this.add.particles(0, 0, 'particle', {
      follow: bullet,
      scale: { start: 0.7, end: 0 },
      alpha: { start: 0.65, end: 0 },
      tint: [0xd500f9, 0xff4081, 0x7c4dff],
      lifespan: 220,
      frequency: 35,
      blendMode: 'ADD'
    });
    bullet.once('destroy', () => {
      if (starTrail) starTrail.destroy();
    });

    // 初速はプレイヤー方向へ向けて発射（スピードを260から320へ適度にUP）
    const initAngle = Phaser.Math.Angle.Between(bx, by, this.player.x, this.player.y);
    const baseSpeed = 320; // 従来(260)より適度にスピードアップ
    bullet.setVelocity(Math.cos(initAngle) * baseSpeed, Math.sin(initAngle) * baseSpeed);
    bullet.spawnTime = this.time.now;
    bullet.homingDuration = 6000; // 6秒間プレイヤーを追跡、その後は直進

    const scene = this;
    bullet.updateBehavior = function(now, delta) {
      if (!this.active) return;

      // 星自体の回転演出
      this.rotation += 0.08;

      const elapsed = now - this.spawnTime;
      // 追尾時間内かつプレイヤーが生存している場合、滑らかに追跡
      if (elapsed < this.homingDuration && scene.player && scene.player.active) {
        const curVx = this.body.velocity.x;
        const curVy = this.body.velocity.y;
        const currentAngle = Math.atan2(curVy, curVx);
        const targetAngle = Phaser.Math.Angle.Between(this.x, this.y, scene.player.x, scene.player.y);

        // 角度差を -PI .. PI に正規化
        const angleDiff = Phaser.Math.Angle.Wrap(targetAngle - currentAngle);

        // スピードUPに合わせて旋回速度も微調整（自然なカーブを描きつつ回避の駆け引きを維持）
        const maxTurn = 2.8 * (delta / 1000);
        const turn = Phaser.Math.Clamp(angleDiff, -maxTurn, maxTurn);
        const newAngle = currentAngle + turn;

        this.setVelocity(Math.cos(newAngle) * baseSpeed, Math.sin(newAngle) * baseSpeed);

        // 追尾弾の不気味な脈動エフェクト
        const pulse = (Math.sin(now / 100) + 1) / 2;
        this.setScale(2.0 + pulse * 0.4);
      }
    };
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

  // 3.2秒間の警告のあと、レーン全体を薙ぎ払う極太レーザー（旧5秒から短縮）
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
      this.tweens.add({ targets: this.currentBoss, y: targetY, duration: 600, ease: 'Cubic.easeInOut' });
    }
    
    // 警告演出 (赤い半透明の帯を点滅させる) - 5秒から3.2秒に短縮
    let warningRect = this.add.rectangle(1920 / 2, targetY, 1920, 100, 0xff0000, 0.2).setDepth(8);
    this.tweens.add({
      targets: warningRect,
      alpha: 0.5,
      duration: 200,
      yoyo: true,
      repeat: 15 // 計3.2秒 (16回 * 200ms = 3200ms)
    });
    
    // 3.2秒後に極太レーザー発射（旧5秒から短縮）
    this.time.delayedCall(3200, () => {
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
        duration: 800,
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

          // 星がはじけたら、時間差（300ms後）でその周りに星の球（bullet_star）を放射状に発射！
          const burstX = x;
          const burstY = y;
          const starColor = isSilver ? 0xE0E0E0 : 0x7CFF00;
          this.time.delayedCall(300, () => {
            if (!this.scene || this.dialogActive) return;
            if (MOT.Audio && MOT.Audio.playShot) MOT.Audio.playShot();

            const numShots = 8;
            const speed = 250;
            const startAngle = Phaser.Math.FloatBetween(0, Math.PI / 4);

            for (let i = 0; i < numShots; i++) {
              const ang = startAngle + (i * Math.PI * 2) / numShots;
              const vx = Math.cos(ang) * speed;
              const vy = Math.sin(ang) * speed;

              const b = this.enemyBullets.create(burstX, burstY, 'bullet_star');
              if (b) {
                b.setScale(1.2);
                if (isSilver) b.setTintFill(starColor);
                else b.setTint(starColor);
                b.setVelocity(vx, vy);
                b.setDepth(9);
                this.tweens.add({
                  targets: b,
                  angle: 360,
                  duration: 1200,
                  repeat: -1
                });
              }
            }
          });
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
    if (this.dialogActive) return;
    if ((this.playerInvincible || (player && (player.isInvincible || player.isInvulnerable))) && !this.barrierBreakInvincible) return;

    if (this.barrierActive || this.barrierBreakInvincible) {
      const isJustGuard = (this.time.now - this.barrierActivatedTime) <= 150; // シビアな判定 (150ms)

      if (obj.isScenarioMinion) {
        this.onBossHit({ active: true, damage: 9999, silent: false, destroy: function(){} }, obj);
      } else if (obj && obj.destroy) {
        obj.destroy();
      }

      // 同時ヒットの弾をまとめて一掃（プレイヤー周囲の敵弾を消滅させて多段被弾を完全に防止）
      if (this.enemyBullets) {
        this.enemyBullets.getChildren().slice().forEach(b => {
          if (b && b.active && Phaser.Math.Distance.Between(player.x, player.y, b.x, b.y) <= 140) {
            b.destroy();
          }
        });
      }
      
      if (this.barrierActive) {
        this.deactivateBarrier();
        // 同時にヒットした別の弾もバリアとして判定・破壊するための無敵時間を付与（150ms -> 500msに拡大）
        this.barrierBreakInvincible = true;
        this.playerInvincible = true;

        this.tweens.add({
          targets: player,
          alpha: 0.4,
          yoyo: true,
          repeat: 3,
          duration: 60,
          onComplete: () => {
            if (player && player.active) player.setAlpha(1);
          }
        });

        this.time.delayedCall(500, () => {
          this.barrierBreakInvincible = false;
          this.playerInvincible = false;
          if (player && player.active) player.setAlpha(1);
        });
      }

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
      this.combatActive = false;
      this.deactivateBarrier();
      this.cameras.main.fadeOut(1000, 0, 0, 0);
      this.time.delayedCall(1000, function () { let __img = document.getElementById('trueDemonLordImg'); if (__img) __img.remove(); this.scene.start('EndingScene', { endingKey: 'BAD_GAMEOVER' }); }, [], this);
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
      if (this.currentBoss.body) this.currentBoss.body.enable = false;
      this.currentBoss.setVisible(false);
      this.currentBoss.setActive(false);
      if (this.currentBoss.destroy) this.currentBoss.destroy();
      this.currentBoss = null;
    }
    if (this.enemyGroup) this.enemyGroup.clear(true, true);
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
    this.dimBg = this.add.rectangle(w / 2, h / 2, w * 2, h * 2, 0x000000, 0.6).setAlpha(0).setDepth(89);

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
    const demScale = 1000 / (this.demonImage.width || 750);
    this.demonImage.setScale(demScale);
    this.demonImage.setY(100 + ((this.demonImage.height || 1000) * demScale) / 2 - 200);

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

        // 2. 勇者の独白：背景は完全に真っ黒（dimBg 1.0）、主人公の立ち絵のみくっきり表示
        this.hideCombatField();
        if (this.dimBg) {
          this.dimBg.setDisplaySize(w * 2, h * 2);
          this.dimBg.setPosition(w / 2, h / 2);
        }

        const sayHeroSoliloquy = (text) => new Promise(res => {
          safeTween(this.dimBg, 1.0);
          safeTween(this.heroImage, 1);
          safeTween(this.doctorImage, 0);
          safeTween(this.demonImage, 0);
          if (this.rightSpeakerImage) safeTween(this.rightSpeakerImage, 0);
          this.showDialogue('勇者', text, res);
        });

        safeTween(this.dimBg, 1.0);
        safeTween(this.heroImage, 1);
        safeTween(this.doctorImage, 0);
        safeTween(this.demonImage, 0);

        // 心の叫び
        await sayHeroSoliloquy('「（……結局、僕は博士の”創造物”でしかなかった。）」');

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
        const termPrefix = 'mmƂ̃````bbggggOのログ: ';
        await this.terminalEffect([
          termPrefix + '...link established',
          termPrefix + '...signal stable: 1.00',
          '',
          termPrefix + 'こんにちは。『GGS』よ。',
          '',
          termPrefix + '悪性因子、消失を確認。',
          '',
          termPrefix + '世界構造、再計測完了。観測値、許容範囲内。',
          '',
          termPrefix + 'あなたは宿命を果たした。あなたの行動は祝福を授けるに値する。',
          termPrefix + 'あなたの望みを叶えよう。',
          termPrefix + '個体情報、更新。',
          termPrefix + 'Designation："勇者" → "' + heroName + '"',
          termPrefix + '登録情報、書き換え完了。',
          termPrefix + 'あなたは、もう人造人間ではない。',
          termPrefix + 'この世界に生きる、一人の人間──"' + heroName + '"として認証する。',
          termPrefix + 'ただの人間”' + heroName + '”として、自由に生きなさい。',
          '',
          termPrefix + '...logging complete',
          termPrefix + '...connection closed'
        ], { noFlicker: true });

        // 5. 暗転終了後。勇者以外背景も含め暗くして心臓の音を鳴らす（勇者の覚醒）
        const sayHeroAwakening = (speakerName, text) => new Promise(res => {
          safeTween(this.dimBg, 0.88);
          safeTween(this.heroImage, 1);
          safeTween(this.doctorImage, 0);
          safeTween(this.demonImage, 0);
          if (this.rightSpeakerImage) safeTween(this.rightSpeakerImage, 0);
          this.showDialogue(speakerName, text, res, false, '勇者');
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

        // 前半で使用した魔王・博士の立ち絵を完全に破棄
        if (this.demonImage) {
          this.tweens.killTweensOf(this.demonImage);
          if (this.demonImage.destroy) this.demonImage.destroy();
          this.demonImage = null;
        }
        if (this.doctorImage) {
          this.tweens.killTweensOf(this.doctorImage);
          if (this.doctorImage.destroy) this.doctorImage.destroy();
          this.doctorImage = null;
        }

        // 6. 通常会話パートへ移行（右側の会話相手立ち絵を切り替え）
        const setRightSpeaker = (speakerName, texKey, scaleTargetW = 750, yOffset = 0) => {
          if (this.demonImage) {
            this.tweens.killTweensOf(this.demonImage);
            if (this.demonImage.destroy) this.demonImage.destroy();
            this.demonImage = null;
          }
          if (!this.textures.exists(texKey)) {
            console.warn('Texture not found:', texKey);
            return;
          }
          if (!this.rightSpeakerImage || !this.rightSpeakerImage.active) {
            this.rightSpeakerImage = this.add.image(w - 300, h / 2, texKey).setDepth(90).setAlpha(0);
          } else {
            this.tweens.killTweensOf(this.rightSpeakerImage);
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

        const ensureTwinsPhase1 = () => {
          if (!this.sisterImage || !this.sisterImage.active) {
            this.sisterImage = this.add.image(w - 450, h / 2, 'sister_normal').setDepth(90).setAlpha(0);
            const tex = this.textures.exists('sister_normal') ? this.textures.get('sister_normal').getSourceImage() : null;
            const sW = (tex && tex.width) || 1080;
            const sH = (tex && tex.height) || 1920;
            const sScale = 750 / sW;
            this.sisterImage.setScale(sScale);
            this.sisterImage.setY(100 + (sH * sScale) / 2);
          }
          if (!this.brotherImage || !this.brotherImage.active) {
            this.brotherImage = this.add.image(w - 200, h / 2, 'brother_normal').setDepth(90).setAlpha(0);
            const tex = this.textures.exists('brother_normal') ? this.textures.get('brother_normal').getSourceImage() : null;
            const bW = (tex && tex.width) || 1080;
            const bH = (tex && tex.height) || 1920;
            const bScale = 750 / bW;
            this.brotherImage.setScale(bScale);
            this.brotherImage.setY(100 + (bH * bScale) / 2);
          }
        };

        const sayTwinsPhase1 = (speaker, text) => new Promise(res => {
          ensureTwinsPhase1();
          safeTween(this.dimBg, 0.6);
          safeTween(this.heroImage, 0.4);
          if (this.rightSpeakerImage) safeTween(this.rightSpeakerImage, 0);
          if (this.doctorImage) safeTween(this.doctorImage, 0);
          if (this.demonImage) safeTween(this.demonImage, 0);

          if (speaker === 'エナリア') {
            safeTween(this.sisterImage, 1);
            if (this.sisterImage) this.sisterImage.setDepth(91);
            safeTween(this.brotherImage, 0.4);
            if (this.brotherImage) this.brotherImage.setDepth(90);
          } else {
            safeTween(this.brotherImage, 1);
            if (this.brotherImage) this.brotherImage.setDepth(91);
            safeTween(this.sisterImage, 0.4);
            if (this.sisterImage) this.sisterImage.setDepth(90);
          }
          this.showDialogue(speaker, text, res);
        });

        const sayRight = (speaker, texKey, text, targetW = 750, yOff = 0) => new Promise(res => {
          setRightSpeaker(speaker, texKey, targetW, yOff);
          safeTween(this.dimBg, 0.6);
          safeTween(this.rightSpeakerImage, 1);
          safeTween(this.heroImage, 0.4);
          if (this.doctorImage) safeTween(this.doctorImage, 0);
          if (this.demonImage) safeTween(this.demonImage, 0);
          if (this.sisterImage) safeTween(this.sisterImage, 0);
          if (this.brotherImage) safeTween(this.brotherImage, 0);
          this.showDialogue(speaker, text, res);
        });

        const sayHeroNormal = (text) => new Promise(res => {
          safeTween(this.dimBg, 0.6);
          safeTween(this.heroImage, 1);
          if (this.rightSpeakerImage && this.rightSpeakerImage.alpha > 0.1) safeTween(this.rightSpeakerImage, 0.4);
          if (this.sisterImage && this.sisterImage.alpha > 0.1) safeTween(this.sisterImage, 0.4);
          if (this.brotherImage && this.brotherImage.alpha > 0.1) safeTween(this.brotherImage, 0.4);
          if (this.doctorImage) this.doctorImage.setAlpha(0);
          if (this.demonImage) this.demonImage.setAlpha(0);
          this.showDialogue(heroName, text, res);
        });

        const sayDoctor = (text) => sayRight('博士', 'doctor_awaken_straight_weapon', text, 900, 0);
        const sayEnaria = (text) => sayTwinsPhase1('エナリア', text);
        const sayEdio = (text) => sayTwinsPhase1('エディオ', text);
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
        const fadeTargets = [this.dimBg, this.heroImage, this.doctorImage, this.demonImage, this.rightSpeakerImage, this.sisterImage, this.brotherImage].filter(t => t && t.active);
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
              this.sisterImage = null;
              this.brotherImage = null;
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
      this.isDoctorPhase2 = true;
      this.phase1DefeatTriggered = false;
      this.bossHalfHpSpoken = false;
      if (!MOT.flags) MOT.flags = {};
      MOT.flags.doctorPhase2 = true;
      MOT.flags.isDoctorPhase2 = true;
      if (MOT.saveGame) {
        MOT.saveGame(4);
      }
      MOT.flags.playerHP = MOT.flags.playerMaxHP || 5;
      
      // 勇者の戦闘ドットおよび戦闘フィールド・UIを完全に復帰
      this.restoreCombatField();

      this.heroAttackSpeedBoost = false;
      this.heroFirepowerBoost = false;
      this.inunekoBoostActive = false;

      // 敵グループと旧ボスの残骸を完全にクリーンアップして幽霊判定・重複スプライトを排除
      if (this.currentBoss) {
        this.tweens.killTweensOf(this.currentBoss);
        if (this.currentBoss.destroy) this.currentBoss.destroy();
        this.currentBoss = null;
      }
      if (this.enemyGroup) {
        this.enemyGroup.clear(true, true);
      }
      if (this.enemyBullets) {
        this.enemyBullets.clear(true, true);
      }
      if (this.playerBullets) {
        this.playerBullets.clear(true, true);
      }

      // ボスの新規活性化・出現
      const cfg = this.getBossConfig('doctor');
      this.currentBoss = this.physics.add.sprite(1400, 460, 'doctor_combat');
      this.currentBoss.setScale(cfg ? cfg.scale : 2.5);
      this.currentBoss.setDepth(8);
      this.enemyGroup.add(this.currentBoss);
      this.currentBoss.configKey = 'doctor';
      this.currentBoss.setTexture('doctor_combat');
      this.currentBoss.setVisible(true);
      this.currentBoss.setActive(true);
      this.currentBoss.setAlpha(1);
      this.currentBoss.setPosition(1400, 460);
      if (this.currentBoss.body) {
        this.currentBoss.body.enable = true;
        this.currentBoss.body.setSize(70, 90);
        this.currentBoss.body.setOffset(15, 5);
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
      this.combatActive = true;
      if (this.player) {
        this.player.setVisible(true);
        this.player.setActive(true);
        this.player.setAlpha(1);
      }
      this.physics.resume();
      this.startBossLaneMovement();
    })();
  }

  terminalEffect(lines, options = {}) {
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

      // 「観測者のログ」チラ見えグリッチ演出
      let isFlickering = false;
      let flickerTimer = null;
      const enableFlicker = !(options && (options.noFlicker || options.disableFlicker));
      const hasGlitch = enableFlicker && lines.some(l => l.includes('bbggggO') || l.includes('観測者'));

      const triggerFlicker = () => {
        if (!textObj || !textObj.active) return;
        if (displayText.length > 5) {
          isFlickering = true;
          // 一瞬だけ「観測者のログ」に置換
          const flickeredText = (displayText + cursorChar)
            .replace(/mmƂ̃`*bbggggO(?:のログ)?/g, '観測者のログ')
            .replace(/mmƂ̃bbggggO/g, '観測者のログ');
          
          textObj.setText(flickeredText);
          textObj.setColor('#E0FFE8'); // 一瞬CRTの同期ズレのように明滅発光

          // 80ms〜120ms後に元に戻す
          this.time.delayedCall(Phaser.Math.Between(80, 120), () => {
            if (!textObj || !textObj.active) return;
            isFlickering = false;
            textObj.setColor('#00FF66');
            textObj.setText(displayText + cursorChar);
          });
        }

        // 次のフリッカー（1.2秒〜2.5秒ごとにランダム発生）
        flickerTimer = this.time.delayedCall(Phaser.Math.Between(1200, 2500), triggerFlicker);
      };

      if (hasGlitch) {
        flickerTimer = this.time.delayedCall(1200, triggerFlicker);
      }

      // カーソル点滅タイマー
      const cursorTimer = this.time.addEvent({
        delay: 450,
        loop: true,
        callback: () => {
          cursorChar = (cursorChar === "■") ? " " : "■";
          if (textObj && textObj.active && !isFlickering) {
            textObj.setText(displayText + cursorChar);
          }
        }
      });

      // 不規則なデータパケット通信音ループ
      let beepTimer = null;
      let isSceneClosed = false;
      const scheduleRandomBeep = () => {
        if (isSceneClosed) return;
        if (MOT.Audio && MOT.Audio.playTerminalBeep) MOT.Audio.playTerminalBeep();
        beepTimer = this.time.delayedCall(Phaser.Math.Between(220, 650), scheduleRandomBeep);
      };
      this.time.delayedCall(300, scheduleRandomBeep);

      const cleanupAndResolve = () => {
        isSceneClosed = true;
        if (beepTimer) beepTimer.remove();
        if (timerEvent) timerEvent.remove();
        if (cursorTimer) cursorTimer.remove();
        if (flickerTimer) flickerTimer.remove();
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
          const char = lineText[currentChar];
          displayText += char;
          textObj.setText(displayText + "■");
          currentChar++;

          // 文字入力時の不規則な電子音
          if (Math.random() < 0.35 && char !== ' ' && char !== '\n') {
            if (MOT.Audio && MOT.Audio.playTerminalBeep) MOT.Audio.playTerminalBeep();
          }

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
        if (MOT.Audio && MOT.Audio.playTerminalBeep) MOT.Audio.playTerminalBeep();
        else if (MOT.Audio && MOT.Audio.playBleep) MOT.Audio.playBleep('');

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
        color: '#FFFFFF'
      }).setOrigin(1, 0.5).setDepth(200001).setScrollFactor(0);
      const enterGuideTween = this.tweens.add({ targets: enterGuide, alpha: 0.6, yoyo: true, repeat: -1, duration: 500 });
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
          if (el && el.active) {
            if (el.setVisible) el.setVisible(visible);
            if (el.setAlpha) el.setAlpha(visible ? 1 : 0);
          }
        });
        if (enterGuide && enterGuide.active) {
          enterGuide.setVisible(visible);
          if (!visible) {
            if (enterGuideTween && enterGuideTween.isPlaying) enterGuideTween.pause();
            enterGuide.setAlpha(0);
          } else {
            if (enterGuideTween && enterGuideTween.isPaused) enterGuideTween.resume();
            enterGuide.setAlpha(1);
          }
        }
        if (visible) {
          updateSelection();
        }
      };

      // ── 真ん中から赤と白のヒビが少しずつ入って広がる演出 ──
      const impactX = w / 2;
      const impactY = h / 2; // 画面・選択肢の中央

      let redBarrier = null;

      const initCrackGraphics = () => {
        if (!crackGfx) {
          crackGfx = this.add.graphics().setDepth(200020).setScrollFactor(0);
          uiElements.push(crackGfx);
        }
        if (!redBarrier) {
          redBarrier = this.add.rectangle(w / 2, h / 2, w, h, 0xff0000, 0.05)
            .setDepth(200005)
            .setScrollFactor(0)
            .setBlendMode(Phaser.BlendModes.ADD);
          uiElements.push(redBarrier);
        }
      };

      // 画面中央から画面端（上下左右・四隅）までの距離を正確に計算
      const getDistToEdge = (cx, cy, ang) => {
        const cos = Math.cos(ang);
        const sin = Math.sin(ang);
        let d = 9999;
        if (cos > 0.0001) d = Math.min(d, (w - cx) / cos);
        else if (cos < -0.0001) d = Math.min(d, (0 - cx) / cos);
        if (sin > 0.0001) d = Math.min(d, (h - cy) / sin);
        else if (sin < -0.0001) d = Math.min(d, (0 - cy) / sin);
        return Math.max(100, Math.abs(d));
      };

      // 画面中央から画面端まで広がるフラクタル亀裂ネットワークの事前構築
      const crackSegments = [];
      const buildCrackNetwork = () => {
        crackSegments.length = 0;
        // 放射状に画面全体（上下左右・四隅）へ向かうメインの主亀裂8方向
        const mainAngles = [
          0.05,           // 右
          Math.PI * 0.25, // 右下隅
          Math.PI * 0.5,  // 下
          Math.PI * 0.75, // 左下隅
          Math.PI,        // 左
          Math.PI * 1.25, // 左上隅
          Math.PI * 1.5,  // 上
          Math.PI * 1.75  // 右上隅
        ];

        mainAngles.forEach((baseAngle) => {
          const edgeDist = getDistToEdge(impactX, impactY, baseAngle) * 1.05; // 画面端まで確実に到達
          let curX = impactX;
          let curY = impactY;
          let curAngle = baseAngle + Phaser.Math.FloatBetween(-0.12, 0.12);
          let distTraveled = 0;
          let segIndex = 0;

          while (distTraveled < edgeDist) {
            const segLen = Phaser.Math.Between(30, 48);
            const nextAngle = curAngle + Phaser.Math.FloatBetween(-0.24, 0.24);
            const endX = curX + Math.cos(nextAngle) * segLen;
            const endY = curY + Math.sin(nextAngle) * segLen;
            const endDist = Math.hypot(endX - impactX, endY - impactY);

            // step (1〜10) の到達度合いをマッピング（中心0%〜画面端100%）
            const ratio = Math.min(1.0, endDist / edgeDist);
            const stepNeeded = Math.max(1, Math.min(10, Math.ceil(ratio * 10)));

            const isWhite = Math.random() > 0.65;
            const mainColor = isWhite ? 0xffffff : (Math.random() > 0.35 ? 0xff1744 : 0xff3b30);
            const alpha = isWhite ? Phaser.Math.FloatBetween(0.85, 1.0) : Phaser.Math.FloatBetween(0.75, 0.95);
            const thick = Math.max(1.8, 4.4 - ratio * 2.3);

            crackSegments.push({
              x1: curX, y1: curY, x2: endX, y2: endY,
              step: stepNeeded,
              color: mainColor,
              alpha: alpha,
              thickness: thick,
              isMain: true
            });

            // 途中で枝分かれ（サブブランチ）を生成
            if (segIndex > 0 && Math.random() < 0.45) {
              const forkAngle = nextAngle + (Math.random() > 0.5 ? 1 : -1) * Phaser.Math.FloatBetween(0.4, 0.75);
              let forkX = endX;
              let forkY = endY;
              const forkSteps = Phaser.Math.Between(2, 4);
              for (let f = 0; f < forkSteps; f++) {
                const fLen = Phaser.Math.Between(22, 36);
                const fAngle = forkAngle + Phaser.Math.FloatBetween(-0.22, 0.22);
                const fEndX = forkX + Math.cos(fAngle) * fLen;
                const fEndY = forkY + Math.sin(fAngle) * fLen;
                const fDist = Math.hypot(fEndX - impactX, fEndY - impactY);
                const fRatio = Math.min(1.0, fDist / edgeDist);
                const fStep = Math.max(1, Math.min(10, Math.ceil(fRatio * 10)));

                crackSegments.push({
                  x1: forkX, y1: forkY, x2: fEndX, y2: fEndY,
                  step: Math.min(10, Math.max(stepNeeded, fStep)),
                  color: Math.random() > 0.6 ? 0xffffff : 0xff2255,
                  alpha: 0.8,
                  thickness: Math.max(1.2, thick - 1.2),
                  isMain: false
                });

                forkX = fEndX;
                forkY = fEndY;
              }
            }

            curX = endX;
            curY = endY;
            curAngle = nextAngle;
            distTraveled = endDist;
            segIndex++;
          }
        });
      };

      buildCrackNetwork();

      const growCracks = (step) => {
        initCrackGraphics();
        crackGfx.clear();

        // 赤いバリアが徐々に赤く強く発光する（最初は薄く、終盤は濃密に）
        if (redBarrier) {
          redBarrier.setAlpha(0.04 + (step / 10) * 0.46);
        }

        // 1. 下地の赤い発光オーラ層（step 3以上で描画し、ヒビ割れに強烈な赤い輝きを与える）
        if (step >= 3) {
          crackSegments.forEach(seg => {
            if (seg.step <= step) {
              crackGfx.lineStyle(seg.thickness + 2.5, 0xb71c1c, 0.38);
              crackGfx.beginPath();
              crackGfx.moveTo(seg.x1, seg.y1);
              crackGfx.lineTo(seg.x2, seg.y2);
              crackGfx.strokePath();
            }
          });
        }

        // 2. メインの鋭い赤と白のヒビ割れ線を描画（中心から画面端まで到達）
        crackSegments.forEach(seg => {
          if (seg.step <= step) {
            const isFresh = (seg.step === step);
            const color = isFresh ? 0xffffff : seg.color;
            const alpha = isFresh ? 1.0 : seg.alpha;
            crackGfx.lineStyle(seg.thickness, color, alpha);
            crackGfx.beginPath();
            crackGfx.moveTo(seg.x1, seg.y1);
            crackGfx.lineTo(seg.x2, seg.y2);
            crackGfx.strokePath();
          }
        });

        // 3. 打撃瞬間の赤白閃光フラッシュ（stepが低い時は控えめ、画面端まで到達する後半は強烈に）
        const flashAlpha = 0.04 + step * 0.02;
        const hitFlash = this.add.rectangle(w / 2, h / 2, w, h, 0xff1744, flashAlpha)
          .setDepth(200028).setScrollFactor(0);
        this.tweens.add({ targets: hitFlash, alpha: 0, duration: 80 + step * 4, onComplete: () => hitFlash.destroy() });

        // 4. 真ん中（中心）の白と赤の衝撃閃光スパーク（stepに応じてサイズ成長）
        const sparkRadius = 5 + step * 2.5;
        const spark = this.add.circle(impactX, impactY, sparkRadius, 0xffffff, 0.95)
          .setDepth(200025).setScrollFactor(0);
        this.tweens.add({
          targets: spark,
          scaleX: 2.0,
          scaleY: 2.0,
          alpha: 0,
          duration: 120 + step * 8,
          onComplete: () => spark.destroy()
        });

        // 5. 衝撃波（赤いショックウェーブリング：stepに応じて大きく画面端方向へ広がる）
        const ring = this.add.circle(impactX, impactY, 12)
          .setStrokeStyle(Math.min(3.5, 1.8 + step * 0.18), 0xff1744, 0.85)
          .setDepth(200024).setScrollFactor(0);
        this.tweens.add({
          targets: ring,
          radius: 40 + step * 38,
          alpha: 0,
          duration: 220 + step * 12,
          ease: 'Cubic.easeOut',
          onComplete: () => ring.destroy()
        });

        // 6. 飛び散る微細な赤と白の破片
        const numShards = Math.min(22, 2 + step * 2);
        for (let k = 0; k < numShards; k++) {
          const color = Math.random() > 0.5 ? 0xffffff : (Math.random() > 0.4 ? 0xff1744 : 0xff5252);
          const shardSize = Phaser.Math.Between(3, 5 + Math.min(5, Math.floor(step * 0.6)));
          const shard = this.add.rectangle(
            impactX + Phaser.Math.Between(-10, 10),
            impactY + Phaser.Math.Between(-10, 10),
            shardSize, shardSize,
            color, 0.95
          ).setDepth(200026).setScrollFactor(0);

          const angle = Math.random() * Math.PI * 2;
          const dist = Phaser.Math.Between(30, 60 + step * 25);
          this.tweens.add({
            targets: shard,
            x: shard.x + Math.cos(angle) * dist,
            y: shard.y + Math.sin(angle) * dist + 15,
            angle: Phaser.Math.Between(-360, 360),
            alpha: 0,
            scale: 0.1,
            duration: Phaser.Math.Between(200, 350 + step * 15),
            ease: 'Power2',
            onComplete: () => shard.destroy()
          });
        }
      };

      const cleanupAndResolve = (val) => {
        this.dialogActive = false;
        this.choiceActive = false;
        this.input.keyboard.off('keydown', onKeyDown);
        if (enterGuideTween) enterGuideTween.stop();
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

          // 最初はごく微かな手応え、後半に向けて少しずつ揺れが大きくなる
          const shakeIntensity = 0.002 + Math.pow(crackStep / 10, 2) * 0.016;
          const shakeDuration = 60 + crackStep * 8;
          this.cameras.main.shake(shakeDuration, shakeIntensity);

          // 選択肢1「１ 殺す」も亀裂の衝撃で揺れ始める（後半ほど激しく）
          if (choicesList[0] && choicesList[0].btn && choicesList[0].btn.active) {
            const shakeOffset = Math.min(10, 1 + Math.floor(crackStep * 0.8));
            this.tweens.add({
              targets: [choicesList[0].btn, choicesList[0].txt],
              x: choicesList[0].origX + Phaser.Math.Between(-shakeOffset, shakeOffset),
              duration: 35,
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

          // ヒビグラフィック消去＆バリア破壊演出
          if (crackGfx) { crackGfx.destroy(); crackGfx = null; }
          if (redBarrier) {
            this.tweens.add({
              targets: redBarrier,
              alpha: 0,
              scaleX: 1.5,
              scaleY: 1.5,
              duration: 400,
              onComplete: () => { if (redBarrier) { redBarrier.destroy(); redBarrier = null; } }
            });
          }

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
            await new Promise(r => this.showDialogue('勇者', '「……それでも僕は、殺したくない……！！」', r));
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
    if (!boss || !boss.active || !boss.visible) return;
    if (this.dialogActive || this.cutsceneActive) return;
    if (boss.x > 1920) {
      bullet.destroy();
      return;
    }
    bullet.destroy();
    let dmg = bullet.damage || 1;
    if (this.twinsReviving) {
      dmg = dmg * 0.5;
    }

    // 犬猫シールド中は魔王ボスへのダメージ90%カット（被ダメージ0.1倍）＆シールド発光
    if (this.demonLordBarrierActive && boss === this.currentBoss) {
      dmg = dmg * 0.1;
      if (this.barrierGraphic) {
        this.tweens.add({ targets: this.barrierGraphic, alpha: 0.3, duration: 80, yoyo: true, repeat: 1 });
      }
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
        this.enemyBullets.getChildren().slice().forEach(function(b) {
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
              this.bossImage = bossImage;

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
              this.sisterImage = sisterImage;
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
                this.tweens.add({ targets: this.sisterBoss, x: 1550, duration: 1200, ease: 'Power2' });
                await new Promise(r => this.tweens.add({ targets: this.currentBoss, x: 1400, duration: 1200, ease: 'Power2', onComplete: r }));
                this.tweens.add({ targets: this.currentBoss, y: this.currentBoss.y - 30, yoyo: true, repeat: -1, duration: 1000, ease: 'Sine.easeInOut' });
                this.tweens.add({ targets: this.sisterBoss, y: this.sisterBoss.y + 30, yoyo: true, repeat: -1, duration: 1100, ease: 'Sine.easeInOut' });
                
                await sayDevice('「こいつらに名前なんてない。さっさと倒せ。」');
                await sayEnemyName('エディオ', '「やめてよ。魔王様に付けてもらった素敵な名前があるんだ。僕がエディオで、」', 'brother_normal', '男');
                await sayEnemyName('エナリア', '「私がエナリア。魔王様が私たちを拾ってくれたの。」', 'sister_normal', '女');
                await sayEnemyName('エディオ', '「君、”勇者”なんだってね。”世界”を救うために魔王様を倒そうとしているんだろう？」', 'brother_normal', '男');
                await sayEnemyName('エディオ', '「……手を引くんだ。まだ引き返せる。僕らのように。」', 'brother_normal', '男');
                await sayDevice('「おい、ぐちゃぐちゃ話してないで、早く倒せ。魔王軍の言うことに耳を貸す必要はない。」');
                await sayHero('「……」');
                await sayEnemyName('エナリア', '「…そう。仕方ないわよ、兄様」', 'sister_normal', '女');
                await sayEnemyName('エディオ', '「君を魔王様の元にはいかせない。ここで食い止めるよ」', 'brother_normal', '男');
              }
              
              this.tweens.add({
                targets: [dimBg, enemyFrame, enemyLabel, bossImage, this.heroImage].filter(Boolean), alpha: 0, duration: 500,
                onComplete: () => {
                  if (dimBg) dimBg.destroy();
                  if (enemyFrame) enemyFrame.destroy();
                  if (enemyLabel) enemyLabel.destroy();
                  if (bossImage) bossImage.destroy();
                  if (this.heroImage) this.heroImage.destroy();
                  if (sisterImage) sisterImage.destroy();
                  this.combatActive = true;
                  this.dialogEndTime = Date.now();
                }
              });
              if(sisterImage) this.tweens.add({ targets: sisterImage, alpha: 0, duration: 500 });
              this.dialogActive = false;
              this.cutsceneActive = false;
              this.dialogEndTime = Date.now();
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
              if (!MOT.flags) MOT.flags = {};
              if (!MOT.flags.bossIntroSeen) MOT.flags.bossIntroSeen = {};
              MOT.flags.bossIntroSeen[key] = true;
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

      // ── 双子のHP半分セリフ判定 ──────────────────
      const isSister = (boss === this.sisterBoss);
      const isBrother = (boss === this.currentBoss);

      if (isSister && !this.sisterHalfHpSpoken && boss.hp <= (boss.maxHp || 300) * 0.5 && boss.hp > 0) {
        this.sisterHalfHpSpoken = true;
        const isBrotherAlive = (this.currentBoss && this.currentBoss.active && this.currentBoss.visible && this.currentBoss.hp > 0);
        if (isBrotherAlive) {
          // 兄生存時、エナリアのHPが半分を割る
          this.showPixelSpeechBubble(this.sisterBoss, 'エナリア', '兄さま……！！', 2200);
          this.time.delayedCall(1500, () => {
            if (this.currentBoss && this.currentBoss.active && this.currentBoss.hp > 0) {
              this.showPixelSpeechBubble(this.currentBoss, 'エディオ', '大丈夫。俺たちは二人で最強なんだから', 2600);
            }
          });
        } else {
          // 兄死亡、エナリアのHPが半分を割る
          this.showPixelSpeechBubble(this.sisterBoss, 'エナリア', '兄さまがいないと……私は……。戻ってきて……兄さま……', 3000);
        }
      } else if (isBrother && !this.brotherHalfHpSpoken && boss.hp <= (boss.maxHp || 300) * 0.5 && boss.hp > 0) {
        this.brotherHalfHpSpoken = true;
        const isSisterAlive = (this.sisterBoss && this.sisterBoss.active && this.sisterBoss.visible && this.sisterBoss.hp > 0);
        if (isSisterAlive) {
          // 妹生存時、エディオのHPが半分を割る
          this.showPixelSpeechBubble(this.currentBoss, 'エディオ', 'エナリア、大丈夫だ。まだやれる', 2200);
          this.time.delayedCall(1500, () => {
            if (this.sisterBoss && this.sisterBoss.active && this.sisterBoss.hp > 0) {
              this.showPixelSpeechBubble(this.sisterBoss, 'エナリア', '兄さま、無理はしないでちょうだい……！！', 2600);
            }
          });
        } else {
          // 妹死亡、エディオのHPが半分を割る
          this.showPixelSpeechBubble(this.currentBoss, 'エディオ', 'エナリアがいないと……くそっ……！戻ってきてくれ、エナリア……！', 3000);
        }
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

    // ── 一般ボスのHP半分セリフ判定 ──────────────────
    if (!this.bossHalfHpSpoken && this.bossHP <= this.bossMaxHP * 0.5 && this.bossHP > 0 && !this.bossDefeated) {
      this.bossHalfHpSpoken = true;
      var bKey = boss.configKey || (this.currentBoss ? this.currentBoss.configKey : '');
      if (bKey === 'boss1') {
        this.showPixelSpeechBubble(boss, 'クラトス', 'くっ、俺はまだまだやれるぞ！', 2600);
      } else if (bKey === 'boss2') {
        this.showPixelSpeechBubble(boss, 'トゥレロス', 'なかなかやるな！', 2600);
      } else if (bKey === 'demon_lord') {
        this.showPixelSpeechBubble(boss, '魔王', 'わらわは……負けるわけにはいかぬ……！！', 2600);
      } else if (bKey === 'doctor') {
        this.showPixelSpeechBubble(boss, '博士', 'ふん', 2200);
      }
    }

    if (Phaser.Math.Between(0, 100) < 50) {
      if(Phaser.Math.Between(0, 100) < 5) MOT.spawnHealthItem(this, boss.x, boss.y); else MOT.spawnEnergyItem(this, boss.x, boss.y);
    }

    if (this.bossHP <= 0 && !this.bossDefeated) {
      this.bossDefeated = true; // Prevent multiple triggers
      this.combatActive = false;
      this.deactivateBarrier();
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

      // ★ ボス撃破時：Tweenとアニメーションを即時完全停止し静止化
      this.tweens.killTweensOf(boss);
      if (boss.setVelocity) boss.setVelocity(0, 0);
      if (boss.anims) boss.anims.stop();
      if (boss.configKey === 'boss1') {
        if (boss.setFrame) boss.setFrame(0);
      } else if (boss.configKey === 'boss2') {
        if (this.textures.exists('boss2_combat_down_open')) boss.setTexture('boss2_combat_down_open');
      } else if (boss.configKey === 'demon_lord') {
        if (this.textures.exists('demon_combat_down_open')) boss.setTexture('demon_combat_down_open');
        if (this.inunekoEnemy) {
          this.tweens.killTweensOf(this.inunekoEnemy);
          if (this.inunekoEnemy.setVelocity) this.inunekoEnemy.setVelocity(0, 0);
          if (this.inunekoEnemy.anims) this.inunekoEnemy.anims.stop();
          if (this.inunekoEnemy.setFrame) this.inunekoEnemy.setFrame(0);
        }
      }

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

            if (this.doctorImage) {
              if (this.doctorImage.destroy) this.doctorImage.destroy();
              this.doctorImage = null;
            }

            this.demonImage = this.add.image(w - 300, h / 2, 'demon_lord_normal').setAlpha(0).setDepth(90);
            this.demonImage.setScale(1000 / (this.demonImage.width || 750));
            this.demonImage.setY(100 + (this.demonImage.height * this.demonImage.scaleY) / 2 - 200);

            this.heroImage = this.add.image(300, h / 2, 'hero_stand').setAlpha(0).setDepth(90);
            var hScale = 750 / (this.heroImage.width || 1080);
            this.heroImage.setScale(hScale);
            this.heroImage.setY(100 + (this.heroImage.height * hScale) / 2);

            const sayDevice = (text) => new Promise(res => {
              if (!this.showingEndingIllustration) {
                this.tweens.add({ targets: dimBg, alpha: 0.6, duration: 300 });
                if (this.heroImage) this.tweens.add({ targets: this.heroImage, alpha: 0.4, duration: 300 });
                if (this.demonImage) this.tweens.add({ targets: this.demonImage, alpha: 0.4, duration: 300 });
                if (this.inunekoImage) this.tweens.add({ targets: this.inunekoImage, alpha: 0.4, duration: 300 });
                if (this.doctorImage) this.tweens.add({ targets: this.doctorImage, alpha: 0, duration: 300 });
              }
              this.showDeviceDialogue(text, res);
            });

            const sayDemon = (text, tex = 'demon_lord_normal') => new Promise(res => {
              if (!this.showingEndingIllustration) {
                this.tweens.add({ targets: dimBg, alpha: 0.6, duration: 300 });
                if (this.heroImage) this.tweens.add({ targets: this.heroImage, alpha: 0.4, duration: 300 });
                if (this.doctorImage) this.tweens.add({ targets: this.doctorImage, alpha: 0, duration: 300 });
                if (this.inunekoImage) this.tweens.add({ targets: this.inunekoImage, alpha: 0.4, duration: 300 });
                if (this.demonImage) {
                  this.tweens.add({ targets: this.demonImage, alpha: 1, duration: 300 });
                  this.demonImage.setTexture(tex);
                  this.demonImage.setDepth(90);
                }
              }
              this.showDialogue('魔王', text, res);
            });

            const sayHero = (text) => new Promise(res => {
              if (!this.showingEndingIllustration) {
                this.tweens.add({ targets: dimBg, alpha: 0.6, duration: 300 });
                if (this.heroImage) this.tweens.add({ targets: this.heroImage, alpha: 1, duration: 300 });
                if (this.demonImage) this.tweens.add({ targets: this.demonImage, alpha: 0.4, duration: 300 });
                if (this.inunekoImage) this.tweens.add({ targets: this.inunekoImage, alpha: 0.4, duration: 300 });
                if (this.doctorImage) this.tweens.add({ targets: this.doctorImage, alpha: 0, duration: 300 });
              }
              this.showDialogue('勇者', text, res);
            });

            const sayDoctor = (text, tex = 'doctor_stand') => new Promise(res => {
              if (!this.showingEndingIllustration) {
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
              }
              this.showDialogue('博士', text, res);
            });

            const sayInuneko = (text, speakerName = '犬猫☆すたー') => new Promise(res => {
              if (!this.showingEndingIllustration) {
                this.tweens.add({ targets: dimBg, alpha: 0.6, duration: 300 });
                if (this.heroImage) this.tweens.add({ targets: this.heroImage, alpha: 0.4, duration: 300 });
                if (this.demonImage) this.tweens.add({ targets: this.demonImage, alpha: 0.4, duration: 300 });
                if (this.doctorImage) this.tweens.add({ targets: this.doctorImage, alpha: 0, duration: 300 });
                if (!this.inunekoImage) {
                  this.inunekoImage = this.add.image(w - 550, h / 2 + 100, 'inuneko_stand').setDepth(91).setAlpha(0);
                  const inuScale = 500 / ((this.textures.exists('inuneko_stand') && this.textures.get('inuneko_stand').getSourceImage().width) || 500);
                  this.inunekoImage.setScale(inuScale);
                }
                this.tweens.add({ targets: this.inunekoImage, alpha: 1, duration: 300 });
              }
              this.showDialogue(speakerName, text, res);
            });

            (async () => {
              const totalKills = (MOT.flags.killedBoss1 ? 1 : 0) + (MOT.flags.killedBoss2 ? 1 : 0) + (MOT.flags.killedTwins ? 1 : 0);

              if (totalKills === 0) {
                const f = MOT.flags;
                const hasEnoughDiamonds = (((f.killingIntent || 0) >= 200) || ((f.redDiamondCount || 0) >= 20));
                const disobeyedDoctor = (((f.dollPoints || 0) < 100) || (f.doctorObeyCount !== undefined && f.doctorObeyCount < 20) || (f.playerMaxHP !== undefined && f.playerMaxHP <= 6));
                const isHiddenFreedom = hasEnoughDiamonds && disobeyedDoctor;

                if (isHiddenFreedom) {
                  // 隠しエンド（自由の身）ルート
                  await sayDevice('「魔王を倒した後は、あいつらの忌々しい部下たちも倒しに行かないとな。」');
                  await sayDevice('「なんで一度見逃したんだ？二度手間だろう」');
                  await sayHero('「…」');
                  await sayDemon('「殺すならわらわだけで十分であろう！？わらわを殺せば組織は終わる！お前の目的だって達成される！！！」');
                  await sayInuneko('「何を言っとるにゃ！？魔王様も殺すなわん！！」');
                  await sayHero('「…」');

                  // 【選択肢】「殺さない」という選択肢しか表示されない
                  await new Promise(res => {
                    this.showChoice([
                      { text: '1. 殺さない', callback: () => { if(MOT.Audio && MOT.Audio.playSelect) MOT.Audio.playSelect(); res(1); } },
                      { text: '2. 殺さない', callback: () => { if(MOT.Audio && MOT.Audio.playSelect) MOT.Audio.playSelect(); res(2); } }
                    ]);
                  });

                  await sayDevice('「おい、何をしている？早くしろ。」');

                  // 覚醒した勇者の立ち絵に切り替え
                  if (this.heroImage && this.textures.exists('hero_stand_corrupted')) {
                    const corruptedTex = this.textures.get('hero_stand_corrupted').getSourceImage();
                    const corruptedW = (corruptedTex && corruptedTex.width) || 1080;
                    const corruptedH = (corruptedTex && corruptedTex.height) || 1920;
                    const corruptedScale = 750 / corruptedW;
                    this.heroImage.setTexture('hero_stand_corrupted');
                    this.heroImage.setScale(corruptedScale);
                    this.heroImage.setY(100 + (corruptedH * corruptedScale) / 2);
                  }

                  await sayHero('「うるさいな」');

                  // 破壊音SE（通信機を壊す）
                  if (MOT.Audio && MOT.Audio.playCrack) MOT.Audio.playCrack();
                  else if (MOT.Audio && MOT.Audio.playBomb) MOT.Audio.playBomb();
                  this.cameras.main.flash(200, 255, 255, 255);
                  this.cameras.main.shake(500, 0.05);

                  await sayDemon('「勇者……？」');
                  await sayHero('「もうここに用はない。」');
                  await sayHero('「君も好きにするといい。僕は帰らないと。」');
                  await sayDemon('「帰る……？あやつの元にか……？」');
                  await sayDemon('「あやつの元に帰ったところでいいように使われるだけだぞ？」');
                  await sayDemon('「わらわたちと協力するのも悪くないと思うが……？」');
                  await sayHero('「面白い提案だ。」');
                  await sayHero('「でも残念ながら、君と僕では目的も手段も違う。」');
                  await sayHero('「安心するといい。これからは平和に暮らせるはずだ。」');
                  await sayDemon('「は……？」');
                  await sayInuneko('「なにを言ってるわん？ちょっと待つにゃん！！！」');

                  // 【博士の研究室に戻る。】
                  this.cameras.main.fadeOut(800, 0, 0, 0);
                  await new Promise(r => this.time.delayedCall(850, r));

                  // 戦闘用フィールド（レーン、HUD、プレイヤー等）を完全非表示
                  this.hideCombatField();

                  if (boss && boss.active) {
                    boss.destroy();
                    this.currentBoss = null;
                  }
                  if (this.inunekoEnemy && this.inunekoEnemy.active) {
                    this.inunekoEnemy.destroy();
                    this.inunekoEnemy = null;
                  }
                  if (this.demonImage) { this.demonImage.destroy(); this.demonImage = null; }
                  if (this.inunekoImage) { this.inunekoImage.destroy(); this.inunekoImage = null; }

                  let labKey = this.textures.exists('bg_lab') ? 'bg_lab' : (this.textures.exists('bg_doctor') ? 'bg_doctor' : null);
                  if (labKey) {
                    this.bg.setTexture(labKey);
                    this.bg.setOrigin(0.5, 0.5);
                    this.bg.setPosition(w / 2, h / 2);
                    let scale = Math.max(w / this.bg.width, h / this.bg.height);
                    this.bg.setScale(scale);
                  }

                  this.cameras.main.fadeIn(800, 0, 0, 0);
                  await new Promise(r => this.time.delayedCall(800, r));

                  await sayHero('「…」');
                  await sayDoctor('「おい、通信機を破壊したな？それに魔王すら殺していないとはどういうことだ。」');
                  await sayDoctor('「あまり好き勝手されるのは困るんだがな。」');

                  // 【選択肢】1〜5 博士を倒す
                  await new Promise(res => {
                    this.showChoice([
                      { text: '1. 博士を倒す', callback: () => { if(MOT.Audio && MOT.Audio.playSelect) MOT.Audio.playSelect(); res(1); } },
                      { text: '2. 博士を倒す', callback: () => { if(MOT.Audio && MOT.Audio.playSelect) MOT.Audio.playSelect(); res(2); } },
                      { text: '3. 博士を倒す', callback: () => { if(MOT.Audio && MOT.Audio.playSelect) MOT.Audio.playSelect(); res(3); } },
                      { text: '4. 博士を倒す', callback: () => { if(MOT.Audio && MOT.Audio.playSelect) MOT.Audio.playSelect(); res(4); } },
                      { text: '5. 博士を倒す', callback: () => { if(MOT.Audio && MOT.Audio.playSelect) MOT.Audio.playSelect(); res(5); } }
                    ]);
                  });

                  // 【ここからエンディングイラスト：立ち絵は一切表示せず動くGIFをアニメーション再生】
                  this.hideStandingPortraits();
                  this.hideCombatField();
                  if (this.bg) this.bg.setVisible(false);

                  // イラスト背面用の真っ黒な下地（水槽や研究所が一切透けないように）
                  let illustrationBlackBg = this.add.rectangle(w / 2, h / 2, w * 2, h * 2, 0x000000, 1).setDepth(0).setScrollFactor(0);

                  // Phaser DOMコンテナをCanvasの背後に配置してダイアログを手前に保つ
                  if (this.game && this.game.domContainer) {
                    this.game.domContainer.style.zIndex = '0';
                  }
                  if (this.game && this.game.canvas) {
                    this.game.canvas.style.position = 'relative';
                    this.game.canvas.style.zIndex = '1';
                  }

                  let oldGif = document.getElementById('trueDemonLordImg');
                  if (oldGif) oldGif.remove();

                  let trueDemonLord = this.add.dom(w / 2, h / 2, 'img').setDepth(89);
                  if (trueDemonLord.node) {
                    trueDemonLord.node.id = 'trueDemonLordImg';
                    trueDemonLord.node.src = 'assets/images/true_demon_lord.gif?v=' + (window.GAME_VERSION || Date.now());
                    trueDemonLord.node.style.width = '1920px';
                    trueDemonLord.node.style.height = '1080px';
                    trueDemonLord.node.style.objectFit = 'cover';
                    trueDemonLord.node.style.pointerEvents = 'none';
                  }

                  const cleanupBossGif = () => {
                    let removeGif = document.getElementById('trueDemonLordImg');
                    if (removeGif) removeGif.remove();
                    if (this.game && this.game.domContainer) {
                      this.game.domContainer.style.zIndex = '';
                    }
                  };
                  this.events.once('shutdown', cleanupBossGif);
                  this.events.once('destroy', cleanupBossGif);

                  await sayHero('「…」');
                  await sayDoctor('「こちらに銃を構えてどうした？ああ、私を倒したいでも言うのか。」');
                  await sayDoctor('「残念だが、お前にその権限はない。」');
                  await sayDoctor('「反抗するのならお前を……」');
                  await sayDoctor('「……！？」');
                  await sayHero('「いつまでも自分が優位に立てるとは思わない方がいい。」');
                  await sayHero('「僕にこれだけの力を与えたのは貴方だ。」');
                  await sayDoctor('「まさか、システムを乗っ取られるとはな！！！ははは、面白い。」');
                  await sayHero('「僕はその力を掌握した。」');
                  await sayHero('「……ここまで言えば、貴方には意味することがわかるでしょう？」');
                  await sayDoctor('「そうだな。お前は晴れて自由の身になったというわけだ。そして、私を殺してお前は何をするというんだ？」');
                  await sayHero('「僕はもう、誰の命令も聞かない、それだけだ。」');
                  await sayDoctor('「そうか。やはりお前は私の最高傑作のようだ！！！まさか、思想まで似てしまうとは。想定外だが、それもいいだろう。」');
                  await sayHero('「うるさい。もうお前は必要ない。」');

                  // （銃声SE）
                  if (MOT.Audio && MOT.Audio.playShot) MOT.Audio.playShot();
                  this.cameras.main.flash(200, 255, 255, 255);
                  this.cameras.main.shake(500, 0.05);

                  await sayHero('「……。」');

                  // 【暗転の中、文字だけ表示：背景は完全な黒、最後まで黒】
                  this.cameras.main.fadeOut(800, 0, 0, 0);
                  await new Promise(r => this.time.delayedCall(850, r));

                  if (trueDemonLord && trueDemonLord.destroy) {
                    trueDemonLord.destroy();
                  }
                  let removeGif = document.getElementById('trueDemonLordImg');
                  if (removeGif) removeGif.remove();
                  if (this.game && this.game.domContainer) {
                    this.game.domContainer.style.zIndex = '';
                  }

                  if (this.heroImage) { this.heroImage.destroy(); this.heroImage = null; }
                  if (this.doctorImage) { this.doctorImage.destroy(); this.doctorImage = null; }
                  if (this.bg) { this.bg.setVisible(false); }
                  if (dimBg) { dimBg.destroy(); dimBg = null; }

                  // 戦闘フィールド・プレイヤー・全UIを徹底的に非表示・画面外へ
                  this.hideCombatField();
                  if (this.player) {
                    this.player.setVisible(false);
                    this.player.setAlpha(0);
                    this.player.setPosition(-9999, -9999);
                  }

                  // 画面全体を覆う完全な黒背景（depth: 95）を配置。ダイアログ（depth: 100以上）のみが暗闇に浮かぶ
                  let fullBlackBg = this.add.rectangle(w / 2, h / 2, w * 4, h * 4, 0x000000, 1).setDepth(95).setScrollFactor(0);
                  this.cameras.main.setBackgroundColor('#000000');

                  const sayDarkMono = (text) => new Promise(res => {
                    this.showDialogue('勇者', text, res);
                  });

                  this.cameras.main.fadeIn(400, 0, 0, 0);
                  await sayDarkMono('「何をするにもこれから自由だ。誰に縛られることもない。」');
                  await sayDarkMono('「……ふふ、世界を掌握するっていうのも面白いかもな」');

                  // 最後まで黒のままフェードアウトしてエンディングへ
                  this.cameras.main.fadeOut(1000, 0, 0, 0);
                  await new Promise(r => this.time.delayedCall(1000, r));

                  if (illustrationBlackBg && illustrationBlackBg.destroy) illustrationBlackBg.destroy();
                  if (fullBlackBg && fullBlackBg.destroy) fullBlackBg.destroy();

                  MOT.flags.finalEnding = 'hidden_freedom';
                  this.scene.start('EndingScene', { endingKey: 'hidden_freedom' });
                  return;
                }

                // 博士の指示セリフ（通信機越し）
                await sayDevice('「さあ、早くとどめを刺せ！」');

                // 選択干渉システム
                let shatterResult = await this.askDemonLordShatterChoice(sayDevice, sayHero);

                if (shatterResult === 1) {
                  await sayDemon('「わがしもべたちは、わらわに従っていただけだ。おぬしもむやみに殺したいわけではないのだろう？」');
                  await sayInuneko('「まおうさま……だめだわん……まおうさまがいなくなったら……」', '犬猫☆すたー');
                  await sayDemon('「だから今ここで契約を結べ。われはこのまま何もしない。だからしもべを殺すな」');
                  await sayHero('「…わかった。」');
                  await sayDevice('「おい、勝手に決めるな。お前の使命を忘れたのか。魔王を倒した後、残りのやつらも倒しに行くぞ。」');
                  await sayDemon('「ふざけるな！！！わらわたちが何をした！もしも世界に悪が存在するのなら、それは！」');

                  // 【画面が乱れる】
                  this.cameras.main.shake(1000, 0.05);
                  if (this.glitchOverlay) this.glitchOverlay.setVisible(true);
                  await sayDevice('「ꂍꂍꂍꂍEẼGGGG[[[[AAEEE 」');
                  if (this.glitchOverlay) this.glitchOverlay.setVisible(false);

                  // （銃声SE×２回）
                  if (MOT.Audio && MOT.Audio.playShot) MOT.Audio.playShot();
                  this.cameras.main.flash(150, 255, 255, 255);
                  this.cameras.main.shake(400, 0.05);
                  if (boss && boss.active) {
                    this.showExplosion(boss.x, boss.y);
                  }
                  await new Promise(r => this.time.delayedCall(300, r));

                  if (MOT.Audio && MOT.Audio.playShot) MOT.Audio.playShot();
                  this.cameras.main.flash(200, 255, 255, 255);
                  this.cameras.main.shake(600, 0.08);

                  MOT.flags.killedDemonLord = true;
                  if (boss && boss.active) {
                    this.showExplosion(boss.x, boss.y);
                    boss.destroy();
                    this.currentBoss = null;
                  }
                  if (this.inunekoEnemy && this.inunekoEnemy.active) {
                    this.showExplosion(this.inunekoEnemy.x, this.inunekoEnemy.y);
                    this.inunekoEnemy.destroy();
                    this.inunekoEnemy = null;
                  }
                  if (this.demonImage) {
                    this.tweens.add({ targets: this.demonImage, scale: 2, alpha: 0, duration: 500, ease: 'Power2' });
                  }
                  if (this.inunekoImage) {
                    this.tweens.add({ targets: this.inunekoImage, alpha: 0, duration: 500 });
                  }
                  await new Promise(r => this.time.delayedCall(600, r));

                  await sayHero('「！」');
                  await sayHero('「なんで、今勝手に手が…！」');
                  await sayDevice('「ろくでもない生物を生かしておく必要はないだろう。無駄な命乞いを聞く前にさっさと始末したに過ぎない。」');
                  await sayDevice('「いいか。お前はこれから見逃してしまった敵を殺しに行くんだ。」');
                  await sayDevice('「わかっているだろうが、次はないからな？」');

                  // （エンディングイラスト表示へ）
                  this.cameras.main.fadeOut(1000, 0, 0, 0);
                  await new Promise(r => this.time.delayedCall(1000, r));
                  this.hideCombatField();
                  this.hideStandingPortraits();
                  const dec = (window.MOT && MOT.decideEnding) ? MOT.decideEnding() : { key: 'normal_unresistable' };
                  MOT.flags.finalEnding = dec.key;
                  this.scene.start('EndingScene', { endingKey: dec.key });
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
                
                await sayInuneko('「そうわん！魔王様は、お前とは違って優しいにゃん！！」', '犬猫☆スター');

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
                this.restoreCombatField();
                this.tweens.killTweensOf(this.player);
                this.player.setPosition(300, 460);
                if (this.player.body) this.player.body.reset(300, 460);
                this.player.currentCol = 1;
                this.player.currentLane = 1;
                this.player.setVisible(true);
                this.player.setActive(true);
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
              } else if (totalKills === 3) {
                // 全幹部殺害 -> 傀儡エンド（BAD END — 傀儡 —）
                await sayDemon('「ぐっ…ここまでか…」');

                // 【画面が乱れる.以下の文字はゲームを起動したときと同じフォント、雰囲気の文字で。ただし色は赤】
                await this.showPuppetGlitchTerminal();

                // 【選択肢】1〜5 心臓を打ち抜く
                await new Promise(res => {
                  this.showChoice([
                    { text: '1. 心臓を打ち抜く', callback: () => { if(MOT.Audio && MOT.Audio.playSelect) MOT.Audio.playSelect(); res(1); } },
                    { text: '2. 心臓を打ち抜く', callback: () => { if(MOT.Audio && MOT.Audio.playSelect) MOT.Audio.playSelect(); res(2); } },
                    { text: '3. 心臓を打ち抜く', callback: () => { if(MOT.Audio && MOT.Audio.playSelect) MOT.Audio.playSelect(); res(3); } },
                    { text: '4. 心臓を打ち抜く', callback: () => { if(MOT.Audio && MOT.Audio.playSelect) MOT.Audio.playSelect(); res(4); } },
                    { text: '5. 心臓を打ち抜く', callback: () => { if(MOT.Audio && MOT.Audio.playSelect) MOT.Audio.playSelect(); res(5); } }
                  ]);
                });

                // 銃声SE、画面フラッシュ、画面シェイク
                if (MOT.Audio && MOT.Audio.playShot) MOT.Audio.playShot();
                this.cameras.main.flash(200, 255, 0, 0);
                this.cameras.main.shake(600, 0.06);

                await sayDemon('「博士の…傀儡め…！」');

                MOT.flags.killedDemonLord = true;
                if (boss && boss.active) {
                  this.showExplosion(boss.x, boss.y);
                  boss.destroy();
                  this.currentBoss = null;
                }
                if (this.inunekoEnemy && this.inunekoEnemy.active) {
                  this.showExplosion(this.inunekoEnemy.x, this.inunekoEnemy.y);
                  this.inunekoEnemy.destroy();
                  this.inunekoEnemy = null;
                }
                if (this.demonImage) {
                  this.tweens.add({ targets: this.demonImage, scale: 2, alpha: 0, duration: 500, ease: 'Power2' });
                }
                if (this.inunekoImage) {
                  this.tweens.add({ targets: this.inunekoImage, scale: 2, alpha: 0, duration: 500, ease: 'Power2' });
                }
                await new Promise(r => this.time.delayedCall(1000, r));

                this.cameras.main.fadeOut(1000, 0, 0, 0);
                await new Promise(r => this.time.delayedCall(1000, r));
                this.hideCombatField();
                this.hideStandingPortraits();

                MOT.flags.finalEnding = 'bad_puppet';
                this.scene.start('EndingScene', { endingKey: 'bad_puppet' });
                return;
              } else {
                // 1~2 bosses killed -> normal choice (魔王城のため通信機越し)
                await sayDevice('「よくやった。とどめを刺せ」');
                await sayDemon('「…ここまでか…」');
                let c = await new Promise(res => {
                  this.showChoice([
                    { text: '1. 殺す', callback: () => { if(MOT.Audio.playSelect) MOT.Audio.playSelect(); res(1); } },
                    { text: '2. 見逃す', callback: () => { if(MOT.Audio.playSelect) MOT.Audio.playSelect(); res(2); } }
                  ]);
                });
                if (c === 1) {
                  MOT.flags.killedDemonLord = true;
                  const decKill = (window.MOT && MOT.decideEnding) ? MOT.decideEnding() : { key: 'normal_daily' };

                  if (decKill.key === 'bad_shutdown') {
                    // 強制シャットダウンエンド
                    await sayDemon('「ぐっ…すまないわがしもべたち…ここまでのようだ」');
                    await sayHero('「…」');

                    // 【銃声SE】
                    if (MOT.Audio && MOT.Audio.playShot) MOT.Audio.playShot();
                    this.cameras.main.flash(200, 255, 255, 255);
                    this.cameras.main.shake(500, 0.05);

                    if (boss && boss.active) {
                      this.showExplosion(boss.x, boss.y);
                      boss.destroy();
                      this.currentBoss = null;
                    }
                    if (this.inunekoEnemy && this.inunekoEnemy.active) {
                      this.showExplosion(this.inunekoEnemy.x, this.inunekoEnemy.y);
                      this.inunekoEnemy.destroy();
                      this.inunekoEnemy = null;
                    }
                    if (this.demonImage) {
                      this.tweens.add({ targets: this.demonImage, scale: 2, alpha: 0, duration: 500, ease: 'Power2' });
                    }
                    if (this.inunekoImage) {
                      this.tweens.add({ targets: this.inunekoImage, scale: 2, alpha: 0, duration: 500, ease: 'Power2' });
                    }
                    await new Promise(r => this.time.delayedCall(1000, r));

                    // 【博士の研究室に戻る】
                    this.cameras.main.fadeOut(800, 0, 0, 0);
                    await new Promise(r => this.time.delayedCall(850, r));

                    // 戦闘用フィールドを完全非表示
                    this.hideCombatField();

                    let labKeyShutdown = this.textures.exists('bg_lab') ? 'bg_lab' : (this.textures.exists('bg_doctor') ? 'bg_doctor' : null);
                    if (labKeyShutdown) {
                      this.bg.setTexture(labKeyShutdown);
                      this.bg.setOrigin(0.5, 0.5);
                      this.bg.setPosition(w / 2, h / 2);
                      let scale = Math.max(w / this.bg.width, h / this.bg.height);
                      this.bg.setScale(scale);
                    }
                    if (this.demonImage) { this.demonImage.destroy(); this.demonImage = null; }
                    if (this.inunekoImage) { this.inunekoImage.destroy(); this.inunekoImage = null; }

                    this.cameras.main.fadeIn(800, 0, 0, 0);
                    await new Promise(r => this.time.delayedCall(800, r));

                    await sayDoctor('「よくやったな、勇者よ」');
                    await sayHero('「…」');
                    await sayDoctor('「ふむ？」');

                    // 【選択肢】1〜4 博士を倒す
                    await new Promise(res => {
                      this.showChoice([
                        { text: '1. 博士を倒す', callback: () => { if(MOT.Audio && MOT.Audio.playSelect) MOT.Audio.playSelect(); res(1); } },
                        { text: '2. 博士を倒す', callback: () => { if(MOT.Audio && MOT.Audio.playSelect) MOT.Audio.playSelect(); res(2); } },
                        { text: '3. 博士を倒す', callback: () => { if(MOT.Audio && MOT.Audio.playSelect) MOT.Audio.playSelect(); res(3); } },
                        { text: '4. 博士を倒す', callback: () => { if(MOT.Audio && MOT.Audio.playSelect) MOT.Audio.playSelect(); res(4); } }
                      ]);
                    });

                    await sayHero('「…」');
                    await sayDoctor('「こちらに銃を構えてどうした？私を倒したいでも言うのか。」');
                    this.cameras.main.shake(500, 0.025);
                    if (MOT.Audio && MOT.Audio.playClack) MOT.Audio.playClack();
                    await sayHero('「……！？」');
                    await sayDoctor('「ふははは、残念だが、お前にその権限はない。」');
                    await sayDoctor('「お前にできることは、このまま邪魔者を倒し私の役に立つことだけだ。」');
                    await sayDoctor('「だが、歯向かってきたお前をこのまま使う必要もないな。」');
                    await sayDoctor('「もうお前は必要ない。」');

                    // （エンディングイラスト表示）
                    this.cameras.main.fadeOut(1000, 0, 0, 0);
                    await new Promise(r => this.time.delayedCall(1000, r));

                    MOT.flags.finalEnding = 'bad_shutdown';
                    this.scene.start('EndingScene', { endingKey: 'bad_shutdown' });
                    return;
                  } else {
                    // 日常エンド
                    await sayDemon('「このわらわが...！すまない、我がしもべたち...」');
                    if (MOT.Audio && MOT.Audio.playSelect) MOT.Audio.playSelect();
                    this.cameras.main.shake(500, 0.05);
                    if (boss && boss.active) {
                      this.showExplosion(boss.x, boss.y);
                      boss.destroy();
                      this.currentBoss = null;
                    }
                    if (this.inunekoEnemy && this.inunekoEnemy.active) {
                      this.showExplosion(this.inunekoEnemy.x, this.inunekoEnemy.y);
                      this.inunekoEnemy.destroy();
                      this.inunekoEnemy = null;
                    }
                    if (this.demonImage) {
                      this.tweens.add({ targets: this.demonImage, scale: 2, alpha: 0, duration: 500, ease: 'Power2' });
                    }
                    if (this.inunekoImage) {
                      this.tweens.add({ targets: this.inunekoImage, scale: 2, alpha: 0, duration: 500, ease: 'Power2' });
                    }
                    await new Promise(r => this.time.delayedCall(1000, r));
                    this.hideCombatField();
                    this.hideStandingPortraits();
                    MOT.flags.finalEnding = decKill.key;
                    this.scene.start('EndingScene', { endingKey: decKill.key });
                    return;
                  }
                } else {
                  await sayDemon('「わらわを見逃して何が望みだ？しもべたちを殺しているんだ。和平を求めて居るわけではないのであろう？」');
                  await sayDemon('「わらわは、しもべを殺された恨みを忘れることはできん。何が目的であれ、お前を許すことはできないだろう。」');
                  if (this.demonImage) {
                    this.tweens.add({ targets: this.demonImage, alpha: 0, duration: 400 });
                  }
                  if (this.inunekoImage) {
                    this.tweens.add({ targets: this.inunekoImage, alpha: 0, duration: 400 });
                  }
                  const retreatTargets = [boss, this.inunekoEnemy].filter(t => t && t.active);
                  if (retreatTargets.length > 0) {
                    await new Promise(r => {
                      this.tweens.add({
                        targets: retreatTargets,
                        x: 2200,
                        duration: 1500,
                        ease: 'Power2',
                        onComplete: () => {
                          retreatTargets.forEach(t => { if (t.destroy) t.destroy(); });
                          this.currentBoss = null;
                          this.inunekoEnemy = null;
                          r();
                        }
                      });
                    });
                  }
                  const decSpare = (window.MOT && MOT.decideEnding) ? MOT.decideEnding() : { key: 'normal_useless' };
                  MOT.flags.finalEnding = decSpare.key;
                  this.cameras.main.fadeOut(800, 0, 0, 0);
                  this.time.delayedCall(800, () => {
                    this.hideCombatField();
                    this.hideStandingPortraits();
                    this.scene.start('EndingScene', { endingKey: decSpare.key });
                  });
                }
              }
            })();
          } else if (key === 'doctor') {
            if (!MOT.flags) MOT.flags = {};
            MOT.flags.doctorPhase2 = false;
            MOT.flags.isDoctorPhase2 = false;
            this.isDoctorPhase2 = false;
            this.hideCombatField();

            var w = 1920, h = 1080;
            var dimBg = this.add.rectangle(w / 2, h / 2, w, h, 0x000000, 0.6).setAlpha(0).setDepth(89);
            this.dimBg = dimBg;

            // 前のシーンから残っている立ち絵スプライトを完全に破棄
            if (this.demonImage) {
              this.tweens.killTweensOf(this.demonImage);
              if (this.demonImage.destroy) this.demonImage.destroy();
              this.demonImage = null;
            }
            if (this.doctorImage) {
              this.tweens.killTweensOf(this.doctorImage);
              if (this.doctorImage.destroy) this.doctorImage.destroy();
              this.doctorImage = null;
            }
            if (this.bossImage) {
              this.tweens.killTweensOf(this.bossImage);
              if (this.bossImage.destroy) this.bossImage.destroy();
              this.bossImage = null;
            }

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
              if (this.demonImage) {
                this.tweens.killTweensOf(this.demonImage);
                if (this.demonImage.destroy) this.demonImage.destroy();
                this.demonImage = null;
              }
              if (!this.rightSpeakerImage || !this.rightSpeakerImage.active) {
                this.rightSpeakerImage = this.add.image(w - 300, h / 2, texKey).setDepth(90);
              } else {
                this.tweens.killTweensOf(this.rightSpeakerImage);
                this.rightSpeakerImage.setTexture(texKey);
                this.rightSpeakerImage.setVisible(true);
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
              if (this.demonImage && this.demonImage.active) {
                this.tweens.killTweensOf(this.demonImage);
                if (this.demonImage.destroy) this.demonImage.destroy();
                this.demonImage = null;
              }
              if (this.sisterImage && this.sisterImage.active) {
                this.tweens.add({ targets: this.sisterImage, alpha: 0, duration: 250 });
              }
              if (this.brotherImage && this.brotherImage.active) {
                this.tweens.add({ targets: this.brotherImage, alpha: 0, duration: 250 });
              }
              this.showDialogue(speaker, text, res);
            });

            const heroName = MOT.flags.heroName || '勇者';
            const sayHero = (text) => new Promise(res => {
              if (dimBg && dimBg.active) this.tweens.add({ targets: dimBg, alpha: 0.6, duration: 250 });
              if (this.heroImage && this.heroImage.active) this.tweens.add({ targets: this.heroImage, alpha: 1, duration: 250 });
              if (this.rightSpeakerImage && this.rightSpeakerImage.active && this.rightSpeakerImage.alpha > 0.1) {
                this.tweens.add({ targets: this.rightSpeakerImage, alpha: 0.4, duration: 250 });
              }
              if (this.sisterImage && this.sisterImage.active && this.sisterImage.alpha > 0.1) {
                this.tweens.add({ targets: this.sisterImage, alpha: 0.4, duration: 250 });
              }
              if (this.brotherImage && this.brotherImage.active && this.brotherImage.alpha > 0.1) {
                this.tweens.add({ targets: this.brotherImage, alpha: 0.4, duration: 250 });
              }
              this.showDialogue(heroName, text, res);
            });

            const ensureTwinsEpilogue = () => {
              if (!this.sisterImage || !this.sisterImage.active) {
                this.sisterImage = this.add.image(w - 450, h / 2, 'sister_normal').setDepth(90).setAlpha(0);
                const tex = this.textures.exists('sister_normal') ? this.textures.get('sister_normal').getSourceImage() : null;
                const sW = (tex && tex.width) || 1080;
                const sH = (tex && tex.height) || 1920;
                const sScale = 750 / sW;
                this.sisterImage.setScale(sScale);
                this.sisterImage.setY(100 + (sH * sScale) / 2);
              }
              if (!this.brotherImage || !this.brotherImage.active) {
                this.brotherImage = this.add.image(w - 200, h / 2, 'brother_normal').setDepth(90).setAlpha(0);
                const tex = this.textures.exists('brother_normal') ? this.textures.get('brother_normal').getSourceImage() : null;
                const bW = (tex && tex.width) || 1080;
                const bH = (tex && tex.height) || 1920;
                const bScale = 750 / bW;
                this.brotherImage.setScale(bScale);
                this.brotherImage.setY(100 + (bH * bScale) / 2);
              }
            };

            const sayTwinsEpilogue = (speaker, text) => new Promise(res => {
              ensureTwinsEpilogue();
              if (dimBg && dimBg.active) this.tweens.add({ targets: dimBg, alpha: 0.6, duration: 250 });
              if (this.heroImage && this.heroImage.active) this.tweens.add({ targets: this.heroImage, alpha: 0.4, duration: 250 });
              if (this.rightSpeakerImage && this.rightSpeakerImage.active) {
                this.tweens.add({ targets: this.rightSpeakerImage, alpha: 0, duration: 250 });
              }
              if (speaker === 'エナリア') {
                if (this.sisterImage && this.sisterImage.active) {
                  this.tweens.add({ targets: this.sisterImage, alpha: 1, duration: 250 });
                  this.sisterImage.setDepth(91);
                }
                if (this.brotherImage && this.brotherImage.active) {
                  this.tweens.add({ targets: this.brotherImage, alpha: 0.4, duration: 250 });
                  this.brotherImage.setDepth(90);
                }
              } else {
                if (this.brotherImage && this.brotherImage.active) {
                  this.tweens.add({ targets: this.brotherImage, alpha: 1, duration: 250 });
                  this.brotherImage.setDepth(91);
                }
                if (this.sisterImage && this.sisterImage.active) {
                  this.tweens.add({ targets: this.sisterImage, alpha: 0.4, duration: 250 });
                  this.sisterImage.setDepth(90);
                }
              }
              this.showDialogue(speaker, text, res);
            });

            const sayDoctor = (text, tex = 'doctor_awaken_normal_dying') => sayRight('博士', tex, text, 900, 0);
            const sayDemon = (text, tex = 'demon_lord_normal') => sayRight('魔王', tex, text, 850, -50);
            const sayInuneko = (text, tex = 'inuneko_stand') => sayRight('犬猫☆スター', tex, text, 500, 50);
            const sayKratos = (text, tex = 'boss1_normal') => sayRight('クラトス', tex, text, 800, 0);
            const sayTourelos = (text, tex = 'boss2_normal') => sayRight('トゥレロス', tex, text, 750, 20);
            const sayEnaria = (text) => sayTwinsEpilogue('エナリア', text);
            const sayEdio = (text) => sayTwinsEpilogue('エディオ', text);

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

              // 博士が倒れて破棄
              if (this.rightSpeakerImage) {
                const docImg = this.rightSpeakerImage;
                this.rightSpeakerImage = null;
                this.tweens.killTweensOf(docImg);
                this.tweens.add({
                  targets: docImg,
                  alpha: 0,
                  y: docImg.y + 100,
                  duration: 400,
                  onComplete: () => {
                    if (docImg && docImg.destroy) docImg.destroy();
                  }
                });
              }
              if (this.doctorImage) {
                const dImg = this.doctorImage;
                this.doctorImage = null;
                this.tweens.killTweensOf(dImg);
                if (dImg && dImg.destroy) dImg.destroy();
              }
              if (this.demonImage) {
                const demImg = this.demonImage;
                this.demonImage = null;
                this.tweens.killTweensOf(demImg);
                if (demImg && demImg.destroy) demImg.destroy();
              }

              // 博士自害ナレーション
              const sayNarration = (text) => new Promise(res => {
                if (this.heroImage && this.heroImage.active) this.tweens.add({ targets: this.heroImage, alpha: 0.3, duration: 250 });
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
              if (this.sisterImage && this.sisterImage.destroy) {
                this.sisterImage.destroy();
                this.sisterImage = null;
              }
              if (this.brotherImage && this.brotherImage.destroy) {
                this.brotherImage.destroy();
                this.brotherImage = null;
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
                'mmƂ̃bbggggO 「...now loading...」',
                'mmƂ̃bbggggO 「...完了」',
                '',
                'mmƂ̃````bbggggO 「エラーの確認...修復完了」',
                '',
                'mmƂ̃````bbggggO 「...なんて、堅苦しいのはここまでにしましょう」',
                '',
                'mmƂ̃````bbggggO 「さっきぶりね。『GGS』よ。」',
                'mmƂ̃````bbggggO 「この結末は気に入ってくれた？」',
                '',
                'mmƂ̃````bbggggO 「あなたのおかげで、バグはなくなって世界の崩壊は止められた。彼らたちの未来はこれからも続くの。」',
                '',
                'mmƂ̃````bbggggO 「創られた存在から、”' + heroName + '”となったあの子が幸せな道を歩むのを応援してくれると嬉しいわ。」',
                '',
                'mmƂ̃````bbggggO 「といっても、接続が難しくて、これ以上は見せられないのだけれど。」',
                '',
                'mmƂ̃````bbggggO 「いずれ、またどこかで会いましょう。」',
                '',
                'mmƂ̃````bbggggO 「あ、こういった方が良かったかしら？」',
                'mmƂ̃````bbggggO 「ごほん。……”またね”だにゃん！」'
              ]);

              this.hideCombatField();
              this.hideStandingPortraits();
              const dec = (window.MOT && MOT.decideEnding) ? MOT.decideEnding() : { key: 'END_ORPHAN' };
              MOT.flags.finalEnding = dec.key;
              this.scene.start('EndingScene', { endingKey: dec.key });
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
                this.showDialogue('勇者', text, res);
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
                  if (boss && boss.active) {
                    this.showExplosion(boss.x, boss.y);
                    boss.setVisible(false);
                  }
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
                  if (boss && boss.active) {
                    this.tweens.add({ targets: boss, x: 2200, duration: 1500, ease: 'Power2' });
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
                this.bossImage = this.add.image(w - 300, h / 2, 'boss2_normal_dying').setAlpha(0).setDepth(90);
                var bw2 = this.bossImage.width || 576;
                var bh2 = this.bossImage.height || 1024;
                var b2Scale = 750 / bw2;
                this.bossImage.setScale(b2Scale);
                this.bossImage.setY(100 + (bh2 * b2Scale) / 2);

                const sayTourelos = (text, tex = 'boss2_normal_dying') => new Promise(res => {
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
                    if (boss && boss.active) {
                      this.showExplosion(boss.x, boss.y);
                      boss.setVisible(false);
                    }
                    if (this.bossImage) {
                      this.tweens.add({ targets: this.bossImage, alpha: 0, duration: 500 });
                    }
                    await sayDevice('「よくやった。また一歩平和に近づいたな。幹部は残り二人だ。気を抜かずそのまま進んでいくといい」');
                  } else {
                    await sayTourelos('「はは…負けたのはむかつくけど、戦いは楽しかったしまあいいかな」');
                    if (MOT.Audio && MOT.Audio.playShot) MOT.Audio.playShot();
                    this.cameras.main.shake(400, 0.03);
                    if (boss && boss.active) {
                      this.showExplosion(boss.x, boss.y);
                      boss.setVisible(false);
                    }
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
                    if (boss && boss.active) {
                      this.tweens.add({ targets: boss, x: 2200, duration: 1500, ease: 'Power2' });
                    }
                    await sayDevice('「おい、何をしている？なぜ止めを刺さなかった。」');
                    await sayHero('「……」');
                  } else {
                    await sayTourelos('「はは、君はやっぱり殺さないんだ。舐めてるの？とはいえ、僕も今は限界だから引こうかな。次は負けないから！」');
                    if (this.bossImage) {
                      this.tweens.add({ targets: this.bossImage, alpha: 0, duration: 500 });
                    }
                    if (boss && boss.active) {
                      this.tweens.add({ targets: boss, x: 2200, duration: 1500, ease: 'Power2' });
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
        // とどめを刺す前なので魔王のドットは消さずに玉座の前へ移動・静止維持
        boss.setVisible(true);
        boss.setAlpha(1);
        if (boss.anims) boss.anims.stop();
        if (this.textures.exists('demon_combat_down_open')) {
          boss.setTexture('demon_combat_down_open');
        }
        if (this.inunekoEnemy && this.inunekoEnemy.active) {
          this.tweens.killTweensOf(this.inunekoEnemy);
          if (this.inunekoEnemy.anims) this.inunekoEnemy.anims.stop();
          if (this.inunekoEnemy.setFrame) this.inunekoEnemy.setFrame(0);
          this.tweens.add({ targets: this.inunekoEnemy, x: 1300, y: 500, duration: 600, ease: 'Power2' });
        }
        this.tweens.killTweensOf(boss);
        this.tweens.add({
          targets: boss,
          x: 1400,
          y: 560,
          duration: 600,
          ease: 'Power2',
          onComplete: () => {
            this.tweens.killTweensOf(boss);
            if (boss.anims) boss.anims.stop();
            handleDefeatedDialogue();
          }
        });
      } else {
        boss.setVisible(true);
        boss.setAlpha(1);
        if (boss.anims) boss.anims.stop();
        if (key === 'boss1') {
          if (boss.setFrame) boss.setFrame(0);
        } else if (key === 'boss2' && this.textures.exists('boss2_combat_down_open')) {
          boss.setTexture('boss2_combat_down_open');
        }
        this.tweens.killTweensOf(boss);
        this.tweens.add({
          targets: boss,
          x: 1400,
          y: 460,
          duration: 600,
          ease: 'Power2',
          onComplete: () => {
            this.tweens.killTweensOf(boss);
            if (boss.anims) boss.anims.stop();
            if (key === 'boss1' && boss.setFrame) boss.setFrame(0);
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

    if (this.currentBoss) {
      this.currentBoss.body.enable = false;
      this.tweens.killTweensOf(this.currentBoss);
      if (this.currentBoss.setVelocity) this.currentBoss.setVelocity(0, 0);
      if (this.currentBoss.anims) this.currentBoss.anims.stop();
    }
    if (this.sisterBoss) {
      this.sisterBoss.body.enable = false;
      this.tweens.killTweensOf(this.sisterBoss);
      if (this.sisterBoss.setVelocity) this.sisterBoss.setVelocity(0, 0);
      if (this.sisterBoss.anims) this.sisterBoss.anims.stop();
    }
    
    this.cameras.main.shake(300, 0.02);
    
    // Both sprites remain visible or become visible
    if (this.currentBoss) this.currentBoss.setVisible(true).setAlpha(1);
    if (this.sisterBoss) this.sisterBoss.setVisible(true).setAlpha(1);
    
    const twinTargets = [this.currentBoss, this.sisterBoss].filter(b => b && b.active);
    this.tweens.add({
      targets: twinTargets, alpha: 0.3, yoyo: true, repeat: 4, duration: 150,
      onComplete: () => {
        if (this.currentBoss) {
          this.currentBoss.setVisible(true).setAlpha(1);
          if (this.currentBoss.anims) this.currentBoss.anims.stop();
          this.tweens.killTweensOf(this.currentBoss);
          this.tweens.add({ 
            targets: this.currentBoss, x: 1400, y: 460, duration: 600, ease: 'Power2',
            onComplete: () => {
              if (this.currentBoss) {
                this.tweens.killTweensOf(this.currentBoss);
                if (this.currentBoss.anims) this.currentBoss.anims.stop();
              }
            }
          });
        }
        if (this.sisterBoss) {
          this.sisterBoss.setVisible(true).setAlpha(1);
          if (this.sisterBoss.anims) this.sisterBoss.anims.stop();
          this.tweens.killTweensOf(this.sisterBoss);
          this.tweens.add({ 
            targets: this.sisterBoss, x: 1550, y: 500, duration: 600, ease: 'Power2',
            onComplete: () => {
              if (this.sisterBoss) {
                this.tweens.killTweensOf(this.sisterBoss);
                if (this.sisterBoss.anims) this.sisterBoss.anims.stop();
              }
            }
          });
        }
        
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

        const askChoice = (label1, label2) => new Promise(res => {
          this.showChoice([
            { text: label1, callback: () => { MOT.Audio.playSelect(); res(1); } },
            { text: label2, callback: () => { MOT.Audio.playSelect(); res(2); } }
          ]);
        });
        const sayDevice = (text) => new Promise(res => { this.tweens.add({ targets: dimBg, alpha: 0.6, duration: 300 }); this.tweens.add({targets: this.heroImage, alpha: 0.4, duration: 300}); if(this.sisterImage) this.tweens.add({targets: this.sisterImage, alpha: 0.4, duration: 300}); if(this.brotherImage) this.tweens.add({targets: this.brotherImage, alpha: 0.4, duration: 300}); this.showDeviceDialogue(text, res); });
        
        const sayHero = (text) => new Promise(res => { this.tweens.add({ targets: dimBg, alpha: 0.6, duration: 300 }); this.tweens.add({targets: this.heroImage, alpha: 1, duration: 300}); if(this.sisterImage) this.tweens.add({targets: this.sisterImage, alpha: 0.4, duration: 300}); if(this.brotherImage) this.tweens.add({targets: this.brotherImage, alpha: 0.4, duration: 300}); this.showDialogue('勇者', text, res); });
        const sayMan = (text, name = 'エディオ') => new Promise(res => { this.tweens.add({ targets: dimBg, alpha: 0.6, duration: 300 }); this.tweens.add({targets: this.heroImage, alpha: 0.4, duration: 300}); if(this.sisterImage) { this.tweens.add({targets: this.sisterImage, alpha: 0.4, duration: 300}); this.sisterImage.setDepth(90); } if(this.brotherImage) { this.tweens.add({targets: this.brotherImage, alpha: 1, duration: 300}); this.brotherImage.setDepth(91); } this.showDialogue(name, text, res); });
        const sayWoman = (text, name = 'エナリア') => new Promise(res => { this.tweens.add({ targets: dimBg, alpha: 0.6, duration: 300 }); this.tweens.add({targets: this.heroImage, alpha: 0.4, duration: 300}); if(this.sisterImage) { this.tweens.add({targets: this.sisterImage, alpha: 1, duration: 300}); this.sisterImage.setDepth(91); } if(this.brotherImage) { this.tweens.add({targets: this.brotherImage, alpha: 0.4, duration: 300}); this.brotherImage.setDepth(90); } this.showDialogue(name, text, res); });

        (async () => {
          await sayDevice('「さぁ早くとどめを刺せ！」');
          let c = await askChoice('1. 心臓を打ち抜く', '2. 見逃す');
          if (c === 1) { MOT.flags.dollPoints++; MOT.flags.killedTwins = true;
            if (MOT.flags.killedBoss1 && MOT.flags.killedBoss2) {
              await sayMan('「目を...覚ましてくれ...」', 'エディオ');
              await sayWoman('「このままいけば、あなた取返しのつかないことになるわ...」', 'エナリア');
              if (MOT.Audio && MOT.Audio.playShot) MOT.Audio.playShot(); else MOT.Audio.playSelect();
              this.cameras.main.shake(400, 0.03);
              if (this.currentBoss && this.currentBoss.active) {
                this.showExplosion(this.currentBoss.x, this.currentBoss.y);
                this.currentBoss.setVisible(false);
              }
              if (this.sisterBoss && this.sisterBoss.active) {
                this.showExplosion(this.sisterBoss.x, this.sisterBoss.y);
                this.sisterBoss.setVisible(false);
              }
              await sayDevice('「よくやった。君は役に立つみたいだ。こいつらとは違うな…いや、なんでもない。そのまま進んでくれ。そろそろ魔王城に着くはずだ。」');
            } else {
              await sayMan('「これも、因果なのかな...僕たちは奴から逃げきれなかった」', 'エディオ');
              await sayWoman('「兄さま！！」', 'エナリア');
              if (MOT.Audio && MOT.Audio.playShot) MOT.Audio.playShot(); else MOT.Audio.playSelect();
              this.cameras.main.shake(400, 0.03);
              if (this.currentBoss && this.currentBoss.active) {
                this.showExplosion(this.currentBoss.x, this.currentBoss.y);
                this.currentBoss.setVisible(false);
              }
              if (this.sisterBoss && this.sisterBoss.active) {
                this.showExplosion(this.sisterBoss.x, this.sisterBoss.y);
                this.sisterBoss.setVisible(false);
              }
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
              await sayMan('「君も何かおかしいって気が付いて来ただろう？博士の言うことなんて聞くべきじゃない」', 'エディオ');
              await sayWoman('「兄さまの言う通りよ。そんな奴、従う価値もない。」', 'エナリア');
              if(this.sisterImage) {
                this.tweens.add({ targets: this.sisterImage, alpha: 0, duration: 300, onComplete: () => { if(this.sisterImage) { this.sisterImage.destroy(); this.sisterImage = null; } } });
              }
              if(this.brotherImage) {
                this.tweens.add({ targets: this.brotherImage, alpha: 0, duration: 300, onComplete: () => { if(this.brotherImage) { this.brotherImage.destroy(); this.brotherImage = null; } } });
              }
              await new Promise(r => this.tweens.add({ targets: [this.currentBoss, this.sisterBoss], x: 2200, duration: 1500, ease: 'Power2', onComplete: r }));
              await sayDevice('「なぜ殺さない！よりによってあいつらを生かすとは！！」');
            } else {
              await sayMan('「君は、最初から気が付いてるんじゃないか？博士がおかしいって。」', 'エディオ');
              await sayWoman('「あなたは誰も殺してない。だから、こっち側に来なさい。魔王様も許してくれる。」', 'エナリア');
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
      if (this.currentBoss && this.currentBoss.active && this.currentBoss.visible) this.showExplosion(this.currentBoss.x, this.currentBoss.y);
      if (this.sisterBoss && this.sisterBoss.active && this.sisterBoss.visible) this.showExplosion(this.sisterBoss.x, this.sisterBoss.y);
    }
    if (this.currentBoss) { if (this.currentBoss.destroy) this.currentBoss.destroy(); this.currentBoss = null; }
    if (this.sisterBoss) { if (this.sisterBoss.destroy) this.sisterBoss.destroy(); this.sisterBoss = null; }
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
      if (this.startData) {
        this.startData.fromContinue = false;
        this.startData.startBossIndex = -1;
      }
      
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
          let __img = document.getElementById('trueDemonLordImg'); if (__img) __img.remove(); const dec = (window.MOT && MOT.decideEnding) ? MOT.decideEnding() : { key: 'normal_daily' }; MOT.flags.finalEnding = dec.key; this.scene.start('EndingScene', { endingKey: dec.key });
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
      if (boss && boss.active) {
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
            if (boss.destroy) boss.destroy();
            resumeFn();
          }
        });
      } else {
        resumeFn();
      }
    } else {
      if (boss && boss.active && boss.visible) {
        if (boss.configKey === 'demon_lord' && this.inunekoEnemy && this.inunekoEnemy.active && this.inunekoEnemy.visible) {
          this.showExplosion(this.inunekoEnemy.x, this.inunekoEnemy.y);
          this.inunekoEnemy.destroy();
          this.inunekoEnemy = null;
        }
        this.showExplosion(boss.x, boss.y);
        boss.destroy();
      } else if (boss) {
        if (boss.destroy) boss.destroy();
      }
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
        self.combatActive = true;
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
      this.combatActive = false;
      this.showDeviceDialogue(areaText, () => {
        this.dialogEndTime = Date.now();
        beginIntermission();
      });
    } else {
      beginIntermission();
    }
  }

  // 幕間クリア（全滅 or タイムアウト）→ 次のボスへ
  endIntermission() {
    if (!this.intermissionActive) return;
    this.intermissionActive = false;
    this.combatActive = false;
    
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
    
    // テキスト感情に応じた博士の表情（通常 vs 目開き・驚き）
    const isDoctorSurprised = text.includes('！？') || text.includes('！') || text.includes('何をしている') || text.includes('なぜ') || text.includes('役立たず');
    const docFaceKey = (isDoctorSurprised && this.textures.exists('doctor_open_eyes')) ? 'doctor_open_eyes' : 'doctor_normal';

    var face = this.add.image(180, boxY + 140, docFaceKey);
    var scaleRatio = 1000 / face.height;
    face.setScale(scaleRatio);
    var maskShape = this.make.graphics();
    maskShape.fillStyle(0xffffff);
    maskShape.fillRect(82, boxY + 42, 196, 196);
    face.setMask(maskShape.createGeometryMask());
    // 顔が中心に来るよう調整
    face.setY(boxY + 140 + (face.height * scaleRatio) * 0.35);
    this.dialogContainer.add(face);
    this.deviceFace = face;

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
      fontFamily: '"Press Start 2P"', fontSize: '20px', color: '#FFFFFF'
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
        }
      }, callbackScope: this, loop: true
    });

    const advance = () => {
      this.deviceFace = null;
      this.dialogEndTime = Date.now();
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
    this.choiceActive = true;
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
        this.choiceActive = false;
        this.dialogEndTime = Date.now();
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
        self.choiceActive = false;
        self.dialogEndTime = Date.now();
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

  showDialogue(speaker, text, onComplete, keepOpen = false, voiceSpeaker = null) {
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
      fontFamily: '"Press Start 2P"', fontSize: '20px', color: '#FFFFFF'
    }).setOrigin(1, 0).setAlpha(0);
    this.dialogContainer.add(contText);

    var charIndex = 0;
    const soundSpeaker = voiceSpeaker || speaker;
    var typeTimer = this.time.addEvent({
      delay: 40, callback: function () {
        charIndex++;
        bodyText.setText(text.substring(0, charIndex));
        if (text[charIndex - 1] !== ' ' && window.MOT && MOT.Audio && MOT.Audio.playBleep) MOT.Audio.playBleep(soundSpeaker);

        if (charIndex >= text.length) {
          typeTimer.destroy();
          contText.setAlpha(1);
        }
      }, callbackScope: this, loop: true
    });

    // 会話開始時にも暗くないキャラが一回瞬き
    this.triggerActiveBlink();

    const advance = () => {
      this.dialogEndTime = Date.now();
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
      if (now - lastTapTime < 180) return;
      lastTapTime = now;

      // 文字をおくる（スペースキー・Enterキー・クリック）たびに暗くなっていないキャラが一回瞬き
      this.triggerActiveBlink();

      if (charIndex < text.length) {
        typeTimer.destroy();
        charIndex = text.length;
        bodyText.setText(text);
        contText.setAlpha(1);
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

  // 暗くなっていない立ち絵キャラだけを一回瞬きさせる
  triggerActiveBlink() {
    if (this.showingEndingIllustration) return;
    const candidates = [
      this.heroImage,
      this.demonImage,
      this.inunekoImage,
      this.sisterImage,
      this.brotherImage,
      this.bossImage,
      this.rightSpeakerImage,
      this.doctorImage
    ];

    candidates.forEach(img => {
      // 暗くなっているキャラ（alpha < 0.75）や非表示・非アクティブは一切瞬きさせない
      if (!img || !img.active || !img.visible || img.alpha < 0.75) return;

      const key = (img.texture && img.texture.key) ? img.texture.key : '';
      let blinkTex = null;
      let restoreTex = key;

      if (key === 'hero_stand' || key === 'hero_stand_blink') {
        blinkTex = 'hero_stand_blink';
        restoreTex = 'hero_stand';
      } else if (key === 'demon_lord_normal' || key === 'demon_lord_blink' || key === 'demon_lord_silent') {
        blinkTex = 'demon_lord_blink';
        restoreTex = (key === 'demon_lord_silent') ? 'demon_lord_silent' : 'demon_lord_normal';
      } else if (key === 'inuneko_stand' || key === 'inuneko_blink') {
        blinkTex = 'inuneko_blink';
        restoreTex = 'inuneko_stand';
      } else if (key === 'sister_normal' || key === 'sister_blink') {
        blinkTex = 'sister_blink';
        restoreTex = 'sister_normal';
      } else if (key === 'brother_normal' || key === 'brother_closed') {
        blinkTex = 'brother_closed';
        restoreTex = 'brother_normal';
      } else if (key === 'brother_dying' || key === 'brother_dying_closed') {
        blinkTex = 'brother_dying_closed';
        restoreTex = 'brother_dying';
      } else if (key === 'brother_hurt' || key === 'brother_hurt_closed') {
        blinkTex = 'brother_hurt_closed';
        restoreTex = 'brother_hurt';
      }

      if (blinkTex && this.textures.exists(blinkTex)) {
        img.setTexture(blinkTex);
        this.time.delayedCall(130, () => {
          if (img && img.active && img.texture && img.texture.key === blinkTex) {
            img.setTexture(restoreTex);
          }
        });
      }
    });
  }

  showPuppetGlitchTerminal() {
    return new Promise(resolve => {
      const w = 1920, h = 1080;
      const elements = [];

      // 画面の乱れ（カメラシェイク＆効果音）
      this.cameras.main.shake(1000, 0.04);
      if (window.MOT && MOT.Audio && MOT.Audio.playCrack) MOT.Audio.playCrack();
      else if (window.MOT && MOT.Audio && MOT.Audio.playShot) MOT.Audio.playShot();

      // CRTモニター風の深い闇（赤みを帯びた黒）
      const bg = this.add.rectangle(0, 0, w, h, 0x080202, 0.94)
        .setOrigin(0)
        .setDepth(200004)
        .setScrollFactor(0);
      elements.push(bg);

      // CRTスキャンライン（走査線）オーバーレイ
      const scanlines = this.add.graphics().setDepth(200005).setScrollFactor(0);
      scanlines.fillStyle(0x000000, 0.4);
      for (let y = 0; y < h; y += 4) {
        scanlines.fillRect(0, y, w, 2);
      }
      elements.push(scanlines);

      // 赤文字スタイル（起動時BootSceneと同等の雰囲気・フォント・シャドウ）
      const startX = w / 2 - 500;
      const startY = h / 2 - 250;

      const textObj = this.add.text(startX, startY, '', {
        fontFamily: '"DotGothic16", "Courier New", Courier, monospace',
        fontSize: '28px',
        color: '#FF1133',
        fontStyle: 'bold',
        lineSpacing: 16,
        shadow: {
          offsetX: 0,
          offsetY: 0,
          color: '#FF0033',
          blur: 10,
          stroke: true,
          fill: true
        }
      }).setDepth(200006).setScrollFactor(0);
      elements.push(textObj);

      const lines = [
        "...link re-established",
        "...signal drift: 0.02",
        "",
        "...incoming packet from Dr.H███",
        "...decoding...",
        "",
        "……EẼGGGG[[́ccccccccȂȂȂꂎꂎȂ炈炈炈炈B",
        "",
        "...channel unstable"
      ];

      const fullText = lines.join('\n');
      let charIdx = 0;
      let isDone = false;
      let cursorChar = "■";

      const cursorTimer = this.time.addEvent({
        delay: 350,
        loop: true,
        callback: () => {
          cursorChar = (cursorChar === "■") ? " " : "■";
          if (textObj && textObj.active) {
            textObj.setText(fullText.substring(0, charIdx) + cursorChar);
          }
        }
      });

      // 不規則なエラーデータ通信音ループ
      let beepTimer = null;
      let isClosed = false;
      const scheduleGlitchBeep = () => {
        if (isClosed) return;
        if (MOT.Audio && MOT.Audio.playTerminalBeep) MOT.Audio.playTerminalBeep(true);
        beepTimer = this.time.delayedCall(Phaser.Math.Between(180, 500), scheduleGlitchBeep);
      };
      this.time.delayedCall(250, scheduleGlitchBeep);

      const cleanup = () => {
        isClosed = true;
        if (beepTimer) beepTimer.remove();
        if (cursorTimer) cursorTimer.remove();
        this.input.off('pointerdown', handleSkip);
        this.input.keyboard.off('keydown', handleKey);
        this.tweens.add({
          targets: elements,
          alpha: 0,
          duration: 500,
          onComplete: () => {
            elements.forEach(el => el.destroy());
            resolve();
          }
        });
      };

      const finishTyping = () => {
        if (isDone) return;
        isDone = true;
        charIdx = fullText.length;
        textObj.setText(fullText + "\n\n▶ [CLICK / ENTER]");
      };

      const handleSkip = () => {
        if (!isDone) {
          finishTyping();
        } else {
          cleanup();
        }
      };

      const handleKey = (e) => {
        if (e.key === ' ' || e.code === 'Space' || e.key === 'Enter' || e.code === 'Enter') {
          handleSkip();
        }
      };

      this.input.on('pointerdown', handleSkip);
      this.input.keyboard.on('keydown', handleKey);

      this.time.addEvent({
        delay: 25,
        repeat: fullText.length - 1,
        callback: () => {
          if (isDone) return;
          charIdx++;
          const char = fullText[charIdx - 1];
          textObj.setText(fullText.substring(0, charIdx) + cursorChar);

          // 不規則なエラー電子音
          if (Math.random() < 0.35 && char !== ' ' && char !== '\n') {
            if (MOT.Audio && MOT.Audio.playTerminalBeep) MOT.Audio.playTerminalBeep(true);
          }

          if (charIdx >= fullText.length) {
            isDone = true;
            this.time.delayedCall(1200, () => {
              if (elements[0] && elements[0].active) {
                cleanup();
              }
            });
          }
        }
      });
    });
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
      color: '#FFFFFF'
    }).setOrigin(1, 0.5).setDepth(200001).setScrollFactor(0);
    // 点滅（アルファTween）は無効化
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
        self.dialogEndTime = Date.now();
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
        self.dialogEndTime = Date.now();
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

  hideCombatField() {
    this.combatFieldHidden = true;
    this.combatActive = false;
    if (this.physics && this.physics.pause) this.physics.pause();

    // レーン線
    if (this.laneGraphics) {
      this.laneGraphics.setVisible(false);
      this.laneGraphics.clear();
    }

    // プレイヤー本体および関連エフェクト
    if (this.player) {
      this.player.setVisible(false);
      this.player.setActive(false);
      this.player.setAlpha(0);
      this.player.setPosition(-9999, -9999);
      if (this.player.body) this.player.body.enable = false;
    }
    if (this.barrierVisual) {
      this.barrierVisual.setVisible(false);
    }
    if (this.barrierHitbox) {
      this.barrierHitbox.setVisible(false);
    }
    if (this.specialCutinFlash) {
      this.specialCutinFlash.clear();
    }

    // ボススプライト・敵弾・味方弾・アイテム
    if (this.currentBoss) {
      this.currentBoss.setVisible(false);
      this.currentBoss.setActive(false);
    }
    if (this.inunekoEnemy) {
      this.inunekoEnemy.setVisible(false);
      this.inunekoEnemy.setActive(false);
    }
    if (this.enemyBullets) this.enemyBullets.clear(true, true);
    if (this.playerBullets) this.playerBullets.clear(true, true);
    if (this.enemyGroup) this.enemyGroup.clear(true, true);
    if (this.itemGroup) this.itemGroup.clear(true, true);

    // 戦闘HUD UI
    if (this.hpText) { this.hpText.setVisible(false); this.hpText.setText(''); }
    if (this.energyText) { this.energyText.setVisible(false); this.energyText.setText(''); }
    if (this.energyBar) { this.energyBar.setVisible(false); this.energyBar.clear(); }
    if (this.energyBarBgObj) { this.energyBarBgObj.setVisible(false); this.energyBarBgObj.setAlpha(0); }
    if (this.energyBarFgObj) { this.energyBarFgObj.setVisible(false); this.energyBarFgObj.setAlpha(0); }
    if (this.energyBarOutline) { this.energyBarOutline.setVisible(false); this.energyBarOutline.clear(); }
    if (this.barrierIconBg) { this.barrierIconBg.setVisible(false); this.barrierIconBg.clear(); }
    if (this.barrierIconFg) { this.barrierIconFg.setVisible(false); this.barrierIconFg.clear(); }
    if (this.bossHPText) { this.bossHPText.setVisible(false); this.bossHPText.setText(''); }
    if (this.sisterHPText) { this.sisterHPText.setVisible(false); this.sisterHPText.setText(''); }
    if (this.bossHPBar) { this.bossHPBar.setVisible(false); this.bossHPBar.clear(); }
    if (this.areaNameText) { this.areaNameText.setVisible(false); this.areaNameText.setText(''); }

    // 博士の指示UI
    if (window.MOT && MOT.DoctorDirective) {
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
    }

    // アシストUI
    if (this.assistDialog) {
      this.assistDialog.destroy();
      this.assistDialog = null;
    }
    if (this.assistText) {
      this.assistText.destroy();
      this.assistText = null;
    }
    if (this.assistImage) {
      this.assistImage.destroy();
      this.assistImage = null;
    }

    // バーチャルパッド
    const vpad = document.getElementById('virtual-gamepad');
    if (vpad) vpad.style.display = 'none';
  }

  restoreCombatField() {
    this.combatFieldHidden = false;
    this.combatActive = true;
    if (this.physics && this.physics.resume) this.physics.resume();

    // レーン線の復帰・再描画
    if (this.laneGraphics) {
      this.laneGraphics.setVisible(true);
      this.laneGraphics.clear();
      this.laneGraphics.lineStyle(2, 0x4FD1FF, 0.25);
      const laneYs = [220, 460, 700];
      laneYs.forEach(y => {
        this.laneGraphics.lineBetween(0, y, 1920, y);
      });
    }

    // プレイヤー本体および関連エフェクトの復帰
    if (this.player) {
      this.tweens.killTweensOf(this.player);
      this.player.setVisible(true);
      this.player.setActive(true);
      this.player.setAlpha(1);
      this.player.clearTint();
      this.player.setPosition(300, 460);
      if (this.player.body) {
        this.player.body.enable = true;
        this.player.body.reset(300, 460);
        this.player.body.setSize(19, 80);
        this.player.body.setOffset(40, 10);
      }
      this.player.currentCol = 1;
      this.player.currentLane = 1;
      this.player.setCollideWorldBounds(true);
      if (this.anims.exists('hero_combat_anim')) {
        this.player.play('hero_combat_anim');
      }
    }

    // バリア関連の復帰
    if (this.barrierHitbox) {
      this.barrierHitbox.setPosition(300, 460);
      if (this.barrierHitbox.body) this.barrierHitbox.body.reset(300, 460);
    }

    // 戦闘HUD UIの復帰
    if (this.hpText) this.hpText.setVisible(true);
    if (this.energyText) this.energyText.setVisible(true);
    if (this.energyBar) this.energyBar.setVisible(true);
    if (this.energyBarBgObj) { this.energyBarBgObj.setVisible(true); this.energyBarBgObj.setAlpha(1); }
    if (this.energyBarFgObj) { this.energyBarFgObj.setVisible(true); this.energyBarFgObj.setAlpha(1); }
    if (this.energyBarOutline) this.energyBarOutline.setVisible(true);
    if (this.barrierIconBg) this.barrierIconBg.setVisible(true);
    if (this.barrierIconFg) this.barrierIconFg.setVisible(true);
    if (this.bossHPText) this.bossHPText.setVisible(true);
    if (this.bossHPBar) this.bossHPBar.setVisible(true);
    if (this.areaNameText) this.areaNameText.setVisible(true);

    const vpad = document.getElementById('virtual-gamepad');
    if (vpad && ('ontouchstart' in window || navigator.maxTouchPoints > 0)) {
      vpad.style.display = 'block';
    }

    this.updateHUD();
  }

  hideStandingPortraits() {
    this.showingEndingIllustration = true;
    const portraits = [
      this.heroImage,
      this.doctorImage,
      this.demonImage,
      this.inunekoImage,
      this.sisterImage,
      this.brotherImage,
      this.bossImage,
      this.rightSpeakerImage,
      this.dimBg
    ];
    portraits.forEach(p => {
      if (p) {
        this.tweens.killTweensOf(p);
        if (p.setVisible) p.setVisible(false);
        if (p.setAlpha) p.setAlpha(0);
      }
    });
  }

  createHUD() {
    this.hpText = this.add.text(30, 20, '', { fontFamily: '"Press Start 2P", "DotGothic16", monospace, sans-serif', fontSize: '20px', color: '#FF4B6E' }).setDepth(100);
    this.energyText = this.add.text(30, 50, '', { fontFamily: '"Press Start 2P", "DotGothic16", monospace, sans-serif', fontSize: '16px', color: '#4FD1FF' }).setDepth(100);
    this.energyBar = this.add.graphics().setDepth(100);
    this.barrierIconBg = this.add.graphics().setDepth(100);
    this.barrierIconFg = this.add.graphics().setDepth(100);
    this.bossHPText = this.add.text(960, 20, '', { fontFamily: '"Press Start 2P", "DotGothic16", monospace, sans-serif', fontSize: '14px', color: '#FF2E2E' }).setOrigin(0.5, 0).setDepth(100);
    this.sisterHPText = this.add.text(960, 65, '', { fontFamily: '"Press Start 2P", "DotGothic16", monospace, sans-serif', fontSize: '14px', color: '#FF4B6E' }).setOrigin(0.5, 0).setDepth(100).setVisible(false);
    this.bossHPBar = this.add.graphics().setDepth(100);

    this.areaNameText = this.add.text(1920 - 30, 20, '', { fontFamily: '"DotGothic16", monospace, sans-serif', fontSize: '32px', color: '#FFFFFF', backgroundColor: 'rgba(0,0,0,0.5)', padding: { x: 10, y: 5 } }).setOrigin(1, 0).setDepth(100);
    this.updateHUD();
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
    if (this.combatFieldHidden) return;
    let areaText = '';
    if (this.currentBossIndex === 0) areaText = '黄昏の荒野';
    else if (this.currentBossIndex === 1) areaText = '宵闇の森';
    else if (this.currentBossIndex === 2) areaText = '子夜の城塞';
    else if (this.currentBossIndex >= 3) areaText = '魔王城';
    if (this.areaNameText) this.areaNameText.setText(areaText);

    var hearts = '';
    for (var i = 0; i < MOT.flags.playerMaxHP; i++) hearts += i < MOT.flags.playerHP ? '♥ ' : '♡ ';
    this.hpText.setText(`HP: ${MOT.flags.playerHP}/${MOT.flags.playerMaxHP}  ${hearts}`);

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

    if (this.barrierActive) {
      this.barrierIconFg.clear();
      this.barrierIconFg.fillStyle(0x00FFaa, 0.9);
      this.barrierIconFg.fillCircle(iconX, iconY, iconRadius - 2);
      this.barrierIconBg.lineStyle(3, 0x00FFaa, 1);
      this.barrierIconBg.strokeCircle(iconX, iconY, iconRadius);
    } else if (this.barrierCooldown <= 0) {
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
        if (this.bossHPText && this.bossHPText.scene) {
          this.bossHPText.setText(`${cfg.name} HP: ${Math.max(0, this.currentBoss ? this.currentBoss.hp : 0)} / ${cfg.hp}`);
          this.bossHPText.setVisible(true);
        }
        var bpct1 = (this.currentBoss && this.currentBoss.active && this.currentBoss.hp > 0) ? this.currentBoss.hp / cfg.hp : 0;
        if (this.bossHPBar) {
          this.bossHPBar.fillStyle(0x1F2933, 1); this.bossHPBar.fillRect(560, 40, 800, 10);
          if (bpct1 > 0) {
            this.bossHPBar.fillStyle(0x4FD1FF, 1); this.bossHPBar.fillRect(562, 42, 796 * bpct1, 6);
          }
          this.bossHPBar.lineStyle(2, 0x4FD1FF, 0.8); this.bossHPBar.strokeRect(560, 40, 800, 10);
        }
        
        if (!this.sisterHPText || !this.sisterHPText.scene) {
          this.sisterHPText = this.add.text(960, 65, '', { fontFamily: '"Press Start 2P", "DotGothic16", monospace, sans-serif', fontSize: '14px', color: '#FF4B6E' }).setOrigin(0.5, 0).setDepth(100);
        }
        this.sisterHPText.setText(`${cfg.name2} HP: ${Math.max(0, this.sisterBoss ? this.sisterBoss.hp : 0)} / ${cfg.hp2}`);
        this.sisterHPText.setVisible(true);
        var bpct2 = (this.sisterBoss && this.sisterBoss.active && this.sisterBoss.hp > 0) ? this.sisterBoss.hp / cfg.hp2 : 0;
        if (this.bossHPBar) {
          this.bossHPBar.fillStyle(0x1F2933, 1); this.bossHPBar.fillRect(560, 80, 800, 10);
          if (bpct2 > 0) {
            this.bossHPBar.fillStyle(0xFF4B6E, 1); this.bossHPBar.fillRect(562, 82, 796 * bpct2, 6);
          }
          this.bossHPBar.lineStyle(2, 0xFF4B6E, 0.8); this.bossHPBar.strokeRect(560, 80, 800, 10);
        }
      } else {
        if (this.sisterHPText && this.sisterHPText.scene) this.sisterHPText.setVisible(false);
        if (this.bossHPText && this.bossHPText.scene) {
          this.bossHPText.setText(`${cfg.name} HP: ${Math.max(0, this.bossHP)} / ${this.bossMaxHP}`);
          this.bossHPText.setVisible(true);
        }
        var bpct = Math.max(0, this.bossHP) / this.bossMaxHP;
        if (this.bossHPBar) {
          this.bossHPBar.fillStyle(0x1F2933, 1); this.bossHPBar.fillRect(560, 50, 800, 20);
          if (bpct > 0) {
            this.bossHPBar.fillStyle(0xFF2E2E, 1); this.bossHPBar.fillRect(562, 52, 796 * bpct, 16);
          }
          this.bossHPBar.lineStyle(1, 0xFF2E2E, 0.6); this.bossHPBar.strokeRect(560, 50, 800, 20);
        }
      }
    } else {
      if (this.bossHPText && this.bossHPText.scene) {
        this.bossHPText.setText('');
        this.bossHPText.setVisible(false);
      }
      if (this.sisterHPText && this.sisterHPText.scene) {
        this.sisterHPText.setText('');
        this.sisterHPText.setVisible(false);
      }
      if (this.bossHPBar) this.bossHPBar.clear();
    }
  }
}

window.BossScene = BossScene;