// =============================================
// GameScene.js – メインゲームプレイ
// =============================================
class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
  }

  init(data) {
    this.currentStage = (data && data.stage) || 1;
    this.stageTimer = 0;
    this.stageLength = 30000; // 30 seconds per stage
    this.waveIndex = 0;
    this.eventTriggered = {};
    this.dialogActive = false;
    this.lastDialogActive = false; // 会話終了時のクールタイム検出用
    this.minionBattleActive = false;
    this.minion1 = null;
    this.playerInvincible = false;
    this.autoShootTimer = 0;
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
    this.sound.stopAll();
    this.events.on('shutdown', () => {
      if (this.stageBgm) this.stageBgm.stop();
    });

    this.stageBgm = this.sound.add('bgm_stage', { loop: true, volume: 0.15 });
    if (this.currentStage > 1) {
      this.stageBgm.play();
    }

    const w = 1920, h = 1080;

    // Background (scrolling)
    let bgKey = 'bg_stage1';
    if (this.currentStage === 2) bgKey = 'bg_stage2';
    if (this.currentStage === 3) bgKey = 'bg_stage3';
    if (this.currentStage === 4) bgKey = 'bg_stage4';
    this.bgWidth = 1920;
    if (this.currentStage === 2 && this.textures.exists('bg_stage1_scroll') && this.textures.get('bg_stage1_scroll').key !== '__MISSING') {
      this.bg1 = this.add.image(0, 0, 'bg_stage1_scroll').setOrigin(0, 0).setDepth(0);
      let scale = 1080 / this.bg1.height;
      this.bg1.setScale(scale);
      this.bgWidth = this.bg1.width * scale;
      this.bg2 = this.add.image(this.bgWidth, 0, 'bg_stage1_scroll').setOrigin(0, 0).setDepth(0);
      this.bg2.setScale(scale);
    } else {
      this.bg1 = this.add.image(0, 0, bgKey).setOrigin(0, 0).setDepth(0);
      this.bg1.setScale(1920 / 480);
      this.bg2 = this.add.image(1920, 0, bgKey).setOrigin(0, 0).setDepth(0);
      this.bg2.setScale(1920 / 480);
    }  this.playerBullets = this.physics.add.group({ maxSize: 500, runChildUpdate: true });
    this.enemyBullets = this.physics.add.group({ maxSize: 1000, runChildUpdate: true });
    this.enemyGroup = this.physics.add.group();
    this.itemGroup = this.physics.add.group();

    // Player
    this.player = this.physics.add.sprite(-100, 460, 'hero_stand_combat');
    this.player.play('hero_combat_anim');
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
    this.player.setDepth(10);
    this.player.setScale(2);
    // STG風の小さな当たり判定（未スケール時8x8、画面上16x16）
    this.player.body.setSize(14, 60);
    this.player.body.setOffset(25, 25);

    this.playerHitboxGraphics = this.add.graphics();
    this.playerHitboxGraphics.setDepth(11);

    // Player trail effect
    this.playerTrail = this.add.particles(0, 0, 'particle', {
      follow: this.player,
      scale: { start: 0.8, end: 0 },
      alpha: { start: 0.4, end: 0 },
      tint: 0x4FD1FF,
      lifespan: 300,
      frequency: 50,
      blendMode: 'ADD'
    });

    // Draw 3 lanes visually
    const laneYs = [220, 460, 700];
    const laneGraphics = this.add.graphics().setDepth(1);
    laneGraphics.lineStyle(2, 0x4FD1FF, 0.25); // faint blue glow
    laneYs.forEach(y => {
      laneGraphics.lineBetween(0, y, w, y);
    });

    // Controls
    MOT.setupControls(this);
    MOT.setupTouchControls(this, this.player);
    MOT.createVirtualGamepad(this, this.player);

    // Collisions
    this.physics.add.overlap(this.player, this.enemyBullets, this.onPlayerHit, null, this);
    this.physics.add.overlap(this.player, this.enemyGroup, this.onPlayerHit, null, this);
    this.physics.add.overlap(this.playerBullets, this.enemyGroup, this.onEnemyHit, null, this);
    this.physics.add.overlap(this.player, this.itemGroup, MOT.collectItem.bind(null, this), null, this);

    // HUD
    this.createHUD();

    // Stage info text
    let stageLabel = 'TUTORIAL – 始まりの村';
    if (this.currentStage === 2) stageLabel = 'STAGE 1 – 黄昏の荒野';
    if (this.currentStage === 3) stageLabel = 'STAGE 2 – 宵闇の森';
    if (this.currentStage === 4) stageLabel = 'STAGE 3 – 子夜の城塞';
    const stageText = this.add.text(w / 2, h / 2, stageLabel, {
      fontFamily: '"Press Start 2P"',
      fontSize: '28px',
      color: '#4FD1FF'
    }).setOrigin(0.5).setDepth(100);

    this.tweens.add({
      targets: stageText,
      alpha: 0,
      duration: 600,
      delay: 2000,
      onComplete: function () { stageText.destroy(); }
    });

    // Wave schedule
    this.waveSchedule = this.getWaveSchedule();

    // Tutorial / Intro State
    if (this.currentStage === 1) {
      this.tutorialPhase = 1;
      this.tutorialTimer = 0;
      this.tutorialWaitSpecial = false;
    } else {
      this.stageIntroDone = false;
    }

    // Fade in
    this.cameras.main.fadeIn(500, 5, 8, 20);
  }

  getWaveSchedule() {
    if (this.currentStage === 1) {
      // Tutorial stage handles spawning manually in updateTutorial
      return [];
    } else if (this.currentStage === 2) {
      // ボス1の前の雑魚戦（少し減らす）
      return [
        { time: 2000, action: 'wave', count: 5, speed: 200 },
        { time: 6000, action: 'wave', count: 7, speed: 220 },
        { time: 10000, action: 'items' },
        { time: 12000, action: 'wave', count: 8, speed: 250 },
        { time: 16000, action: 'items' },
        { time: 18000, action: 'stage_end' }
      ];
    } else {
      return [
        { time: 2000, action: 'wave', count: 5, speed: 200 },
        { time: 6000, action: 'wave', count: 7, speed: 220 },
        { time: 10000, action: 'items' },
        { time: 12000, action: 'wave', count: 8, speed: 250 },
        { time: 16000, action: 'items' },
        { time: 18000, action: 'stage_end' }
      ];
    }
  }

  update(time, delta) {
    // 会話が終わった瞬間（dialogActive が true から false に変わった時）に、バリアのクールタイムを最大（0%からチャージ）にする
    if (!this.dialogActive && this.lastDialogActive) {
      // 2秒（2000ms）のフルクールタイムをセットし、戦闘開始直後のバリアを完全に防ぐ
      this.barrierCooldown = 2000;
    }
    this.lastDialogActive = this.dialogActive;

    if (this.currentStage === 1 && this.tutorialPhase) {
      this.updateTutorial(delta);
    } else if (this.currentStage > 1 && !this.stageIntroDone && this.stageTimer > 1000 && !this.dialogActive) {
      this.stageIntroDone = true;
      this.physics.pause();
      this.dialogActive = true;
      
      let text = '';
      if (this.currentStage === 2) text = '「次のエリアに着いたか。そこは、黄昏の荒野だ。魔王城までまだ距離があるからそこまで敵は強くないが気は抜くなよ。」';
      if (this.currentStage === 3) text = '「次のエリアに着いたか。そこは、宵闇の森だ。」';
      if (this.currentStage === 4) text = '「次のエリアに着いたか。そこは、子夜の城塞だ。そろそろ魔王城に着くだろう。敵も強くなっている。気を付けてくれ」';
      
      this.showDeviceDialogue(text, () => {
        this.dialogActive = false;
        this.physics.resume();
      });
    }
    
    if (this.dialogActive) return;

    this.stageTimer += delta;

    // Scroll background
    const scrollSpeed = 2;
    this.bg1.x -= scrollSpeed;
    this.bg2.x -= scrollSpeed;
    if (this.bg1.x <= -this.bgWidth) this.bg1.x = this.bg2.x + this.bgWidth;
    if (this.bg2.x <= -this.bgWidth) this.bg2.x = this.bg1.x + this.bgWidth;

    // Player movement (keyboard)
    MOT.handleMovement(this, this.player);

    if (this.playerHitboxGraphics) {
      this.playerHitboxGraphics.clear();
      if (this.player && this.player.active && this.player.alpha > 0) {
        this.playerHitboxGraphics.lineStyle(3, 0x00ffff, 0.8);
        this.playerHitboxGraphics.strokeRect(this.player.body.x, this.player.body.y, this.player.body.width, this.player.body.height);
      }
    }

    // 博士の指示システム update (チュートリアル中は出さない)
    if (this.currentStage !== 1) {
      // ボス戦直前（残り5秒 = 20000ms以降）は指示を出さない
      const suppressDirective = (this.stageTimer >= 20000);
      MOT.DoctorDirective.update(this, delta, this.player, this.dialogActive || suppressDirective);
    }

    // Auto-shoot
    this.autoShootTimer += delta;
    if (this.autoShootTimer >= 180) {
      this.autoShootTimer = 0;
      this.firePlayerBullet();
      MOT.Audio.playShot();
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

    // Process wave schedule
    this.processWaves();

    // Cleanup off-screen
    this.cleanupOffscreen();

    // Update HUD
    this.updateHUD();
  }

  firePlayerBullet() {
    const bullet = this.playerBullets.create(this.player.x + 30, this.player.y, 'bullet_player');
    if (bullet) {
      bullet.setVelocityX(800);
      bullet.setScale(2);
      // 寿命は2.2秒（射程1760px）にする。
      // チュートリアル中の絶対範囲制限は cleanupOffscreen で行う。
      const lifespan = 2200;
      this.time.delayedCall(lifespan, function () {
        if (bullet.active) bullet.destroy();
      });
    }
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
    if (this.dialogActive) return;
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
          bullet.damage = 10; // 10× damage for special attack
          this.time.delayedCall(1500, function () {
            if (bullet.active) bullet.destroy();
          });
        }
      }

      if (this.enemyGroup) {
        this.enemyGroup.getChildren().slice().forEach(enemy => {
          if (enemy !== this.minion1 && enemy.active) {
            this.onEnemyHit({ damage: 9999, destroy: () => {} }, enemy);
          }
        });
      }

      MOT.flags.energy = 0;
      MOT.flags.maxEnergy = false;
    }
  }

  processWaves() {
    while (this.waveIndex < this.waveSchedule.length &&
           this.stageTimer >= this.waveSchedule[this.waveIndex].time) {
      const wave = this.waveSchedule[this.waveIndex];
      this.waveIndex++;

      switch (wave.action) {
        case 'wave':
          MOT.spawnWave(this, wave.count, 200, wave.speed);
          break;
        case 'items':
          {
            const laneYs = [220, 460, 700];
            for (let i = 0; i < 3; i++) {
              const laneY = laneYs[Phaser.Math.Between(0, 2)];
              MOT.spawnEnergyItem(this, 1900 + i * 100, laneY);
            }
            const healthLaneY = laneYs[Phaser.Math.Between(0, 2)];
            MOT.spawnHealthItem(this, 1950, healthLaneY);
          }
          break;

        case 'stage_end':
          this.checkStageEndTimer = this.time.addEvent({
            delay: 500,
            loop: true,
            callback: () => {
              let hasEnemies = false;
              this.enemyGroup.getChildren().forEach(e => {
                // まだ画面内にいるアクティブな敵がいれば待機
                if (e.active && e.x > -100) hasEnemies = true;
              });
              if (!hasEnemies) {
                this.checkStageEndTimer.destroy();
                this.endStage();
              }
            }
          });
          break;
      }
    }
  }

  triggerMinion1Encounter() {
    this.dialogActive = true;
    this.physics.pause();
    this.player.setVelocity(0, 0);

    // Clear all enemies and bullets
    this.enemyGroup.clear(true, true);
    this.enemyBullets.clear(true, true);

    // Spawn minion1
    const minion = this.physics.add.sprite(1400, 460, 'minion1').setScale(3);
    minion.setAlpha(0);
    minion.hp = 50;
    this.minion1 = minion;
    this.enemyGroup.add(minion);

    this.tweens.add({
      targets: minion,
      alpha: 1,
      x: 1500,
      duration: 800,
      ease: 'Power2'
    });

    // Dialogue Intro
    this.time.delayedCall(1000, function () {
      this.showDialogue('下っ端1', '「ひ、ひえぇ！博士の人形が来たぞ！\nや、やられる前にやってやる！」', function () {
        this.dialogActive = false;
        this.physics.resume();
        this.minionBattleActive = true;
      }.bind(this));
    }, [], this);
  }

  onMinion1Defeated() {
    this.minionBattleActive = false;
    this.dialogActive = true;
    this.physics.pause();
    this.player.setVelocity(0, 0);
    this.enemyBullets.clear(true, true);
    if (this.minion1) this.minion1.body.enable = false;

    this.showDialogue('下っ端1', '「ま、待ってくれ！降参だ！\n俺は四天王の中でも最弱…本当は戦いたくないんだ！」', function () {
      this.showChoice([
        { text: '見逃す', callback: function () {
          MOT.Audio.playSelect();
          MOT.modifyFlag('favor.minion1', 1);
          MOT.modifyFlag('showMercy', 1);
          this.showDialogue('下っ端1', '「あ、ありがとう…！\n兄貴たちには弱点があるんだ。覚えておいてくれ。」', function () {
            this.tweens.add({ targets: this.minion1, alpha: 0, x: 1800, duration: 600, onComplete: function() { this.minion1.destroy(); }.bind(this)});
            this.dialogActive = false;
            this.physics.resume();
          }.bind(this));
        }.bind(this)},
        { text: '倒す', callback: function () {
          MOT.Audio.playSelect();
          MOT.modifyFlag('brutality', 1);
          MOT.modifyFlag('obeyDoctor', 1);
          this.cameras.main.shake(200, 0.01);
          this.showExplosion(this.minion1.x, this.minion1.y);
          this.minion1.destroy();
          this.dialogActive = false;
          this.physics.resume();
        }.bind(this)},
        { text: '博士の指示に従う', callback: function () {
          MOT.Audio.playSelect();
          MOT.modifyFlag('obeyDoctor', 1);
          MOT.modifyFlag('brutality', 1);
          this.cameras.main.shake(200, 0.01);
          this.showExplosion(this.minion1.x, this.minion1.y);
          this.minion1.destroy();
          this.dialogActive = false;
          this.physics.resume();
        }.bind(this)}
      ]);
    }.bind(this));
  }

  showDialogue(speaker, text, onComplete) {
    this.dialogActive = true;
    this.input.setTopOnly(true);
    const w = 1920, h = 1080;
    const boxH = 280;
    const boxY = h - boxH - 20;

    const box = this.add.graphics();
    box.fillStyle(0x0a0a1a, 0.92);
    box.fillRoundedRect(60, boxY, w - 120, boxH, 12);
    box.lineStyle(2, 0x4FD1FF, 0.8);
    box.strokeRoundedRect(60, boxY, w - 120, boxH, 12);
    const touchZone = this.add.rectangle(960, 540, 1920, 1080, 0x000000, 0).setScrollFactor(0).setDepth(200000).setInteractive({ useHandCursor: true });
    box.setScrollFactor(0).setDepth(200001);

    const nameText = this.add.text(100, boxY + 10, speaker, {
      fontFamily: '"DotGothic16"',
      fontSize: '44px',
      color: '#4FD1FF'
    }).setScrollFactor(0).setDepth(200002);

    const bodyText = this.add.text(100, boxY + 60, '', {
      fontFamily: '"DotGothic16"',
      fontSize: '40px',
      color: '#E5E7EB',
      wordWrap: { width: w - 220, useAdvancedWrap: true },
      lineSpacing: 8
    }).setScrollFactor(0).setDepth(200002);

    // Typewriter effect
    let charIndex = 0;
    const contText = this.add.text(w - 100, boxY + boxH - 40, '▶ NEXT [TAP/SPACE]', {
      fontFamily: '"Press Start 2P"', fontSize: '20px', color: '#9CA3AF'
    }).setOrigin(1, 0).setAlpha(0).setScrollFactor(0).setDepth(200003);

    const typeTimer = this.time.addEvent({
      delay: 40,
      callback: function () {
        charIndex++;
        bodyText.setText(text.substring(0, charIndex));
        
        // Sound for every character (excluding spaces)
        if (text[charIndex-1] !== ' ' && window.MOT && MOT.Audio) {
          MOT.Audio.playBleep();
        }

        if (charIndex >= text.length) {
          typeTimer.destroy();
          contText.setAlpha(1);
          if (this.tweens) this.tweens.add({ targets: contText, alpha: 0.3, yoyo: true, repeat: -1, duration: 500 });
        }
      },
      callbackScope: this,
      loop: true
    });

    const advance = () => {
      this.dialogActive = false;
      this.input.off('pointerdown', handleInput);
      if (touchZone && touchZone.active) {
        touchZone.off('pointerdown', handleInput);
        touchZone.destroy();
      }
      this.input.keyboard.off('keydown', handleKey);
      if (box && box.active) box.destroy();
      if (nameText && nameText.active) nameText.destroy();
      if (bodyText && bodyText.active) bodyText.destroy();
      if (contText && contText.active) contText.destroy();
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
    const w = 1920, h = 1080;
    const startY = h / 2 - (choices.length * 45);
    const elements = [];

    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.5);
    overlay.fillRect(0, 0, w, h);
    overlay.setDepth(200000);
    elements.push(overlay);

    // [ENTER] KEY ガイドテキストを右下に追加
    const contText = this.add.text(w - 100, h - 60, '▶ [ENTER] KEY', {
      fontFamily: '"Press Start 2P"',
      fontSize: '20px',
      color: '#9CA3AF'
    }).setOrigin(1, 0.5).setDepth(200001);
    this.tweens.add({ targets: contText, alpha: 0.3, yoyo: true, repeat: -1, duration: 500 });
    elements.push(contText);

    const choicesList = [];
    this.selectedChoiceIndex = 0;
    const self = this;

    choices.forEach(function (choice, i) {
      const y = startY + i * 110;
      const btn = self.add.image(w / 2, y, 'ui_button_wide').setInteractive({ useHandCursor: true }).setDepth(200002);
      
      const txt = self.add.text(w / 2, y, choice.text, {
        fontFamily: '"DotGothic16"',
        fontSize: '26px',
        color: '#E5E7EB'
      }).setOrigin(0.5).setDepth(200003);

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
    const exp = this.add.sprite(x, y, 'explosion').setScale(3).setDepth(20);
    this.tweens.add({
      targets: exp,
      scale: 5,
      alpha: 0,
      duration: 500,
      onComplete: function () { exp.destroy(); }
    });
    // Particles
    for (let i = 0; i < 12; i++) {
      const p = this.add.circle(x, y, 4, 0xFF8C00).setDepth(20);
      this.tweens.add({
        targets: p,
        x: x + Phaser.Math.Between(-150, 150),
        y: y + Phaser.Math.Between(-150, 150),
        alpha: 0,
        scale: 0,
        duration: Phaser.Math.Between(300, 600),
        onComplete: function () { p.destroy(); }
      });
    }
  }

  endStage() {
    // Go to boss fight after this stage
    this.physics.pause();
    this.player.setCollideWorldBounds(false);
    this.tweens.add({ targets: this.player, x: 2100, duration: 800, ease: 'Power2' });
    this.cameras.main.fadeOut(800, 5, 8, 20);
    this.time.delayedCall(800, function () {
      this.scene.start('BossScene', { bossIndex: 0, normalTransition: true });
    }, [], this);
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
        
        // 反射弾幕を発射（シドレミファソラシの音階付き）
        let noteIndex = 0;
        this.time.addEvent({
          delay: 80, // 80ms間隔で発射
          repeat: 15, // 計16発（2周）
          callback: () => {
            if (!this.player || !this.player.active) return;
            
            // シ(0), ド(1), レ(2), ミ(3) -> 黄色
            // ファ(4), ソ(5), ラ(6), シ(7) -> 赤色
            let isRed = (noteIndex % 8) >= 4; 
            let color = isRed ? 0xff0000 : 0xffff00;
            
            if (MOT.Audio.playJustGuardNote) MOT.Audio.playJustGuardNote(noteIndex);
            
            // 扇状に3発同時発射で弾幕感を出す
            for (let angleOffset of [-0.08, 0, 0.08]) {
              const reflectBullet = this.playerBullets.create(player.x + 30, player.y, 'bullet_player');
              if (reflectBullet) {
                let speed = 1200;
                reflectBullet.setVelocity(Math.cos(angleOffset) * speed, Math.sin(angleOffset) * speed);
                reflectBullet.setScale(2); // 少し小さくして数を増やす
                reflectBullet.setTint(color); 
                reflectBullet.damage = 1; // 1発あたりのダメージは1（合計ヒットで大ダメージ）
                this.time.delayedCall(2000, function () {
                  if (reflectBullet.active) reflectBullet.destroy();
                });
              }
            }
            noteIndex++;
          }
        });
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

    // Flash player red
    this.playerInvincible = true;
    player.setTint(0xFF4B6E);
    this.tweens.add({
      targets: player,
      alpha: 0.3,
      yoyo: true,
      repeat: 3,
      duration: 100,
      onComplete: function () {
        player.setAlpha(1);
        player.clearTint();
        this.playerInvincible = false;
      }.bind(this)
    });

    if (MOT.flags.playerHP <= 0) {
      MOT.flags.diedCount++;
      this.cameras.main.fadeOut(1000, 0, 0, 0);
      this.time.delayedCall(1000, function () {
        this.scene.start('EndingScene');
      }, [], this);
    }
  }

  onEnemyHit(bullet, enemy) {
    // 画面外 (x > 1920) にいる敵はダメージを受けない (弾は消去されるが敵はノーダメージ)
    if (enemy.x > 1920) {
      bullet.destroy();
      return;
    }
    const dmg = bullet.damage || 1;
    bullet.destroy();
    enemy.hp = (enemy.hp || 1) - dmg;
    enemy.setTint(0xffffff);
    this.time.delayedCall(50, function(){ if(enemy.active) enemy.clearTint(); });

    if (enemy.hp <= 0) {
      if (enemy === this.minion1) {
        this.onMinion1Defeated();
        return;
      }
      this.showExplosion(enemy.x, enemy.y);
      // Tutorial specific drop logic
      if (enemy.tutorialDrop) {
        MOT.spawnEnergyItem(this, enemy.x, enemy.y, enemy.tutorialRed);
      } else {
        let dropRand = Phaser.Math.Between(0, 100);
        if (dropRand < 15) {
          MOT.spawnHealthItem(this, enemy.x, enemy.y); // 15%で回復アイテム
        } else if (dropRand < 55) {
          MOT.spawnEnergyItem(this, enemy.x, enemy.y); // 40%でエネルギー
        }
      }
      // 倒された敵が発射した弾を消去する
      this.enemyBullets.getChildren().forEach(function(b) {
        if (b.shooter === enemy) {
          b.destroy();
        }
      });
      enemy.destroy();
    }
  }

  cleanupOffscreen() {
    this.enemyGroup.getChildren().forEach(function (e) {
      if (e.x < -100) e.destroy();
    });
    this.enemyBullets.getChildren().forEach(function (b) {
      if (b.x < -50 || b.x > 2000 || b.y < -50 || b.y > 1130) b.destroy();
    });
    this.playerBullets.getChildren().forEach(function (b) {
      if (b.x > 1600) b.destroy();
    });
    this.itemGroup.getChildren().forEach(function (i) {
      if (i.x < -50) i.destroy();
    });
  }

  createHUD() {
    this.hpText = this.add.text(30, 20, '', {
      fontFamily: '"Press Start 2P"', fontSize: '24px', color: '#FF4B6E'
    }).setDepth(100).setScrollFactor(0);

    this.energyText = this.add.text(30, 50, '', {
      fontFamily: '"Press Start 2P"', fontSize: '18px', color: '#4FD1FF'
    }).setDepth(100).setScrollFactor(0);

    this.energyBar = this.add.graphics().setDepth(100).setScrollFactor(0);
    this.barrierIconBg = this.add.graphics().setDepth(100).setScrollFactor(0);
    this.barrierIconFg = this.add.graphics().setDepth(100).setScrollFactor(0);
    this.isEnergyHighlighted = false;

    let areaText = '';
    if (this.currentStage === 2) areaText = '黄昏の荒野';
    else if (this.currentStage === 3) areaText = '宵闇の森';
    else if (this.currentStage === 4) areaText = '子夜の城塞';
    
    if (areaText !== '') {
      this.areaNameText = this.add.text(1920 - 30, 20, areaText, {
        fontFamily: '"DotGothic16"', fontSize: '32px', color: '#FFFFFF',
        backgroundColor: 'rgba(0,0,0,0.5)', padding: { x: 10, y: 5 }
      }).setOrigin(1, 0).setDepth(100).setScrollFactor(0);
    }
  }

  updateHUD() {
    // HP as hearts
    let hearts = '';
    for (let i = 0; i < MOT.flags.playerMaxHP; i++) {
      hearts += i < MOT.flags.playerHP ? '♥ ' : '♡ ';
    }
    this.hpText.setText(hearts);

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
    const pct = MOT.flags.energy / MOT.flags.maxEnergyThreshold;
    const barColor = MOT.flags.maxEnergy ? 0xFF4B6E : 0x4FD1FF;
    this.energyBarFgObj.setFillStyle(barColor, 1);
    this.energyBarFgObj.scaleX = Math.max(0.001, pct);

    // 必殺技ゲージのハイライト
    this.energyBar.clear();
    if (this.isEnergyHighlighted) {
      const flash = (Math.sin(Date.now() / 150) + 1) / 2;
      this.energyBar.lineStyle(4, 0xFFFF00, 0.4 + 0.6 * flash);
      this.energyBar.strokeRect(26, 76, 308, 32);
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
      this.barrierIconFg.fillStyle(0x00FFaa, 1);
      this.barrierIconFg.fillCircle(iconX, iconY, iconRadius - 2);
    } else {
      const cdPct = 1 - (this.barrierCooldown / 2000);
      this.barrierIconFg.fillStyle(0x00FFaa, 0.4);
      this.barrierIconFg.beginPath();
      this.barrierIconFg.moveTo(iconX, iconY);
      this.barrierIconFg.arc(iconX, iconY, iconRadius - 2, Phaser.Math.DegToRad(-90), Phaser.Math.DegToRad(-90 + 360 * cdPct), false);
      this.barrierIconFg.closePath();
      this.barrierIconFg.fillPath();
    }
  }
  showDeviceDialogue(text, onComplete, highlightConfig) {
    this.dialogActive = true;
    this.input.setTopOnly(true);
    if (this.dialogContainer) {
      this.dialogContainer.destroy();
    }
    this.dialogContainer = this.add.container(0, 0).setScrollFactor(0).setDepth(200000);
    const touchZone = this.add.rectangle(960, 540, 1920, 1080, 0x000000, 0).setScrollFactor(0).setInteractive({ useHandCursor: true });
    this.dialogContainer.add(touchZone);

    if (highlightConfig) {
      var highlight = this.add.graphics();
      var hColor = highlightConfig.color || 0x39FF14;
      highlight.fillStyle(hColor, 0.25);
      highlight.lineStyle(4, hColor, 0.8);
      
      if (highlightConfig.width && highlightConfig.height) {
        highlight.fillRoundedRect(highlightConfig.x - highlightConfig.width/2, highlightConfig.y - highlightConfig.height/2, highlightConfig.width, highlightConfig.height, 8);
        highlight.strokeRoundedRect(highlightConfig.x - highlightConfig.width/2, highlightConfig.y - highlightConfig.height/2, highlightConfig.width, highlightConfig.height, 8);
      } else {
        highlight.fillCircle(highlightConfig.x, highlightConfig.y, highlightConfig.radius);
        highlight.strokeCircle(highlightConfig.x, highlightConfig.y, highlightConfig.radius);
      }
      this.tweens.add({ targets: highlight, alpha: 0.1, yoyo: true, repeat: -1, duration: 500 });
      this.dialogContainer.add(highlight);
    }

    var w = 1920, h = 1080, boxH = 280, boxY = h - boxH - 20;

    var box = this.add.graphics();
    box.fillStyle(0x0a0a1a, 0.92);
    box.fillRoundedRect(60, boxY, w - 120, boxH, 12);
    box.lineStyle(2, 0x4FD1FF, 0.8);
    box.strokeRoundedRect(60, boxY, w - 120, boxH, 12);
    this.dialogContainer.add(box);

    var iconBox = this.add.graphics();
    iconBox.lineStyle(2, 0x4FD1FF, 0.8);
    iconBox.strokeRect(80, boxY + 40, 200, 200);
    this.dialogContainer.add(iconBox);
    
    var face = this.add.image(180, boxY + 140, 'doctor_normal');
    var scaleRatio = 1000 / face.height;
    face.setScale(scaleRatio);
    var maskShape = this.make.graphics();
    maskShape.fillStyle(0xffffff);
    maskShape.fillRect(82, boxY + 42, 196, 196);
    face.setMask(maskShape.createGeometryMask());
    face.setY(boxY + 140 + (face.height * scaleRatio) * 0.35);
    this.dialogContainer.add(face);

    var nameText = this.add.text(310, boxY + 10, '『博士』', {
      fontFamily: '"DotGothic16"', fontSize: '44px', color: '#4FD1FF'
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
        if (text[charIndex - 1] !== ' ' && window.MOT && MOT.Audio) MOT.Audio.playBleep();
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

  spawnTutorialEnemy(laneIndex, speed) {
    const laneYs = [220, 460, 700];
    const enemy = this.enemyGroup.create(1920, laneYs[laneIndex], 'enemy_basic');
    enemy.setVelocityX(-speed);
    enemy.hp = this.currentStage >= 3 ? 2 : 1;
    enemy.fireTimer = this.time.addEvent({
      delay: Phaser.Math.Between(1500, 2500),
      callback: () => {
        if (enemy.active) {
          let b = MOT.fireLinear(this, enemy.x, enemy.y, -300, 0);
          if (b) b.shooter = enemy;
        }
      },
      loop: true
    });
    return enemy;
  }

  updateTutorial(delta) {
    if (this.dialogActive) return;
    this.tutorialTimer += delta;

    if (this.tutorialPhase === 1 && this.tutorialTimer > 1000) {
      this.tutorialPhase = 1.1;
      this.physics.pause();
      this.dialogActive = true;
      this.showDeviceDialogue('「そこは始まりの村だ。お前はまだまだ目覚めたばかりで戦いには慣れていないだろう。」', () => {
        this.showDeviceDialogue('「ここで戦闘慣れしていくといい。」', () => {
          this.dialogActive = false;
          this.physics.resume();
          
          let e = this.spawnTutorialEnemy(0, 0);
          e.x = 1300;
          
          this.time.delayedCall(500, () => {
            this.physics.pause();
            this.dialogActive = true;
            this.showDeviceDialogue('「敵がやってきたな。お前は敵の前に移動して撃ち殺すんだ。」', () => {
              this.showDeviceDialogue('「移動方法は、パソコンなら矢印キーで移動できる。スマホなら画面をスライドしろ。」', () => {
                this.dialogActive = false;
                this.tutorialPhase = 2;
                this.physics.resume();
              });
            }, { x: 300, y: 260, radius: 60, color: 0x4FD1FF });
          });
        });
      });
    } else if (this.tutorialPhase === 2) {
      if (this.enemyGroup.countActive() === 0) {
        this.tutorialPhase = 2.1;
        this.physics.pause();
        this.dialogActive = true;
        this.showDeviceDialogue('「よくやった。」', () => {
          this.showDeviceDialogue('「それと、今くらいの敵なら問題ないと思うが、魔王城に近づくにつれて敵の攻撃も強くなる。」', () => {
            this.showDeviceDialogue('「よけきれないときはシールドを張るんだ。パソコンはスペース、スマホは長押しだ。タイミング良く敵の攻撃にシールドを張れた場合、反撃することもできるだろう。」', () => {
              this.showDeviceDialogue('「気を付けないといけないのは、シールドはすぐに何度も張り直しはできない。左上の緑の円がクールタイムだ。それが溜まりきれば張れる状態になっている。」', () => {
                this.dialogActive = false;
                this.tutorialPhase = 3;
              }, { x: 360, y: 92, radius: 26 });
            });
          });
        });
      }
    } else if (this.tutorialPhase === 3) {
      this.tutorialPhase = 3.1;
      
      for(let i=0; i<3; i++) {
        let e = this.spawnTutorialEnemy(i, 0);
        e.x = 1300 + Phaser.Math.Between(0, 100);
        e.tutorialDrop = true;
        e.tutorialRed = (i === 1);
      }
      
      this.time.delayedCall(500, () => {
        this.physics.pause();
        this.dialogActive = true;
        this.showDeviceDialogue('「敵が来たな。すべて倒してみろ」', () => {
          this.dialogActive = false;
          this.tutorialPhase = 4;
          this.physics.resume();
        });
      });
    } else if (this.tutorialPhase === 4) {
      if (this.enemyGroup.countActive() === 0) {
        this.tutorialPhase = 4.1;
        this.physics.pause();
        this.dialogActive = true;
        this.showDeviceDialogue('「よくやった。今、倒したときに青と赤のダイヤがドロップしただろう？」', () => {
          this.showDeviceDialogue('「それを拾うことで左上にある必殺技ゲージを貯めることができる。赤の方がドロップ確率は低いが、ゲージを多く溜まる。うまく拾っていくんだな。」', () => {
            this.dialogActive = false;
            this.tutorialPhase = 5;
            this.physics.resume();
          }, { x: 180, y: 75, width: 340, height: 75 });
        });
      }
    } else if (this.tutorialPhase === 5) {
      if (!this.tutorialPhase5Timer) this.tutorialPhase5Timer = 0;
      this.tutorialPhase5Timer += delta;

      if (MOT.flags.energy >= 100 || this.tutorialPhase5Timer >= 3000) {
        this.tutorialPhase = 5.1;
        this.physics.pause();
        this.dialogActive = true;

        // ハイライトを有効にする（まだエネルギーは満タンにしない）
        this.isEnergyHighlighted = true;
        
        this.showDeviceDialogue('「最初は私が代わりに必殺技ゲージを貯めてやろう。」', () => {
          // 「ゲージが溜まったな」のセリフの直前に、エネルギーを満タンにする
          MOT.flags.energy = 100;
          MOT.flags.maxEnergy = true;

          this.showDeviceDialogue('「ゲージが溜まったな。それが溜まると必殺技を打つことができる。パソコンならエンター、スマホならダブルタップで打てる。試してみろ。」', () => {
            this.dialogActive = false;
            this.tutorialPhase = 6;
            this.physics.resume();
            this.tutorialWaitSpecial = true;
            // 博士のセリフが終わったのでハイライトを無効にする
            this.isEnergyHighlighted = false;
          });
        });
      }
    } else if (this.tutorialPhase === 6) {
      if (!this.tutorialPhase6Timer) this.tutorialPhase6Timer = 0;
      this.tutorialPhase6Timer += delta;

      if (this.tutorialPhase6Timer > 5000 && !this.dialogActive) {
        this.tutorialPhase6Timer = 0;
        if (!this.promptCount) { this.promptCount = 0; }
        this.promptCount++;
        this.physics.pause();
        this.dialogActive = true;
        if (this.promptCount < 3) {
          this.showDeviceDialogue('「何をしている？早くenterを押すんだ」', () => {
            this.dialogActive = false;
            this.physics.resume();
          });
        } else {
          this.showDeviceDialogue('「もういい、俺が押してやる」', () => {
            this.dialogActive = false;
            this.physics.resume();
            this.onSpecialAttack();
          });
        }
      }

      if (MOT.flags.energy < 100 && this.tutorialWaitSpecial) {
        // Special was used
        this.tutorialWaitSpecial = false;
        this.tutorialPhase = 6.1;
        this.time.delayedCall(500, () => {
          this.physics.pause();
          this.dialogActive = true;
          this.showDeviceDialogue('「使えたな。戦闘中、上手く使ってこのまま敵を倒していくといい。」', () => {
            this.showDeviceDialogue('「ああそうだ。戦闘中に進むべき道の指示を出す。ちゃんと従うんだ。」', () => {
              this.dialogActive = false;
              this.physics.pause(); // 物理演算を止める
              this.player.setCollideWorldBounds(false);
              this.tweens.add({ targets: this.player, x: 2100, duration: 1000, ease: 'Power2' });
              this.cameras.main.fadeOut(1000, 0,0,0);
              this.time.delayedCall(1000, () => {
                this.scene.start('GameScene', { stage: 2 });
              });
            });
          });
        });
      }
    }
  }
}

window.GameScene = GameScene;




