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
  }

  create() {
    const w = 1920, h = 1080;

    // Background (scrolling)
    const bgKey = this.currentStage === 1 ? 'bg_stage1' : 'bg_stage2';
    this.bg1 = this.add.image(0, 0, bgKey).setOrigin(0, 0);
    this.bg2 = this.add.image(w, 0, bgKey).setOrigin(0, 0);

    // Groups
    this.playerBullets = this.physics.add.group({ maxSize: 500, runChildUpdate: true });
    this.enemyBullets = this.physics.add.group({ maxSize: 1000, runChildUpdate: true });
    this.enemyGroup = this.physics.add.group();
    this.itemGroup = this.physics.add.group();

    // Player
    this.player = this.physics.add.sprite(200, h / 2, 'player');
    this.player.setCollideWorldBounds(true);
    this.player.setDrag(800, 800);
    this.player.setMaxVelocity(400, 400);
    this.player.setDepth(10);
    this.player.setScale(2);

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
    const laneYs = [300, 540, 780];
    const laneGraphics = this.add.graphics().setDepth(1);
    laneGraphics.lineStyle(2, 0x4FD1FF, 0.25); // faint blue glow
    laneYs.forEach(y => {
      laneGraphics.lineBetween(0, y, w, y);
    });

    // Controls
    MOT.setupControls(this);
    MOT.setupTouchControls(this, this.player);

    // Collisions
    this.physics.add.overlap(this.player, this.enemyBullets, this.onPlayerHit, null, this);
    this.physics.add.overlap(this.player, this.enemyGroup, this.onPlayerHit, null, this);
    this.physics.add.overlap(this.playerBullets, this.enemyGroup, this.onEnemyHit, null, this);
    this.physics.add.overlap(this.player, this.itemGroup, MOT.collectItem.bind(null, this), null, this);

    // HUD
    this.createHUD();

    // Stage info text
    const stageLabel = 'STAGE 1 – ○○';
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

    // Tutorial State
    if (this.currentStage === 1) {
      this.tutorialPhase = 1;
      this.tutorialTimer = 0;
      this.tutorialWaitSpecial = false;
    }

    // Fade in
    this.cameras.main.fadeIn(500, 5, 8, 20);
  }

  getWaveSchedule() {
    if (this.currentStage === 1) {
      // Tutorial stage handles spawning manually in updateTutorial
      return [];
    } else {
      return [
        { time: 2000, action: 'wave', count: 5, speed: 200 },
        { time: 6000, action: 'wave', count: 6, speed: 220 },
        { time: 10000, action: 'items' },
        { time: 12000, action: 'wave', count: 7, speed: 250 },
        { time: 17000, action: 'wave', count: 8, speed: 260 },
        { time: 22000, action: 'items' },
        { time: 25000, action: 'stage_end' }
      ];
    }
  }

  update(time, delta) {
    if (this.currentStage === 1 && this.tutorialPhase) {
      this.updateTutorial(delta);
    }
    
    if (this.dialogActive) return;

    this.stageTimer += delta;

    // Scroll background
    const scrollSpeed = 2;
    this.bg1.x -= scrollSpeed;
    this.bg2.x -= scrollSpeed;
    if (this.bg1.x <= -1920) this.bg1.x = this.bg2.x + 1920;
    if (this.bg2.x <= -1920) this.bg2.x = this.bg1.x + 1920;

    // Player movement (keyboard)
    MOT.handleMovement(this, this.player);

    // 博士の指示システム update (チュートリアル中は出さない)
    if (this.currentStage !== 1) {
      MOT.DoctorDirective.update(this, delta, this.player, this.dialogActive);
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

    // Minion 1 Battle Logic
    if (this.minionBattleActive && this.minion1 && this.minion1.active) {
      this.minion1.fireTimer = (this.minion1.fireTimer || 0) + delta;
      if (this.minion1.fireTimer >= 1000) {
        this.minion1.fireTimer = 0;
        MOT.fireFan(this, this.minion1.x, this.minion1.y, 3, 300, 180, 40);
      }
      
      // Periodically move to a random lane Y
      this.minion1.laneChangeTimer = (this.minion1.laneChangeTimer || 0) + delta;
      if (this.minion1.laneChangeTimer >= 3000) {
        this.minion1.laneChangeTimer = 0;
        const laneYs = [300, 540, 780];
        const targetY = laneYs[Phaser.Math.Between(0, 2)];
        this.tweens.killTweensOf(this.minion1);
        this.tweens.add({
          targets: this.minion1,
          y: targetY,
          duration: 600,
          ease: 'Cubic.easeInOut',
          onComplete: function () {
            if (this.minion1 && this.minion1.active) {
              this.tweens.add({
                targets: this.minion1,
                y: targetY - 10,
                yoyo: true,
                repeat: -1,
                duration: 1000,
                ease: 'Sine.easeInOut'
              });
            }
          }.bind(this)
        });
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
      this.time.delayedCall(4000, function () {
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
            const laneYs = [300, 540, 780];
            for (let i = 0; i < 3; i++) {
              const laneY = laneYs[Phaser.Math.Between(0, 2)];
              MOT.spawnEnergyItem(this, 1900 + i * 100, laneY);
            }
            const healthLaneY = laneYs[Phaser.Math.Between(0, 2)];
            MOT.spawnHealthItem(this, 1950, healthLaneY);
          }
          break;
        case 'minion1_encounter':
          this.triggerMinion1Encounter();
          break;
        case 'stage_end':
          this.endStage();
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
    const minion = this.physics.add.sprite(1400, 540, 'minion1').setScale(3);
    minion.setAlpha(0);
    minion.hp = 15;
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
    const w = 1920, h = 1080;
    const boxH = 180;
    const boxY = h - boxH - 20;

    const box = this.add.graphics();
    box.fillStyle(0x0a0a1a, 0.92);
    box.fillRoundedRect(60, boxY, w - 120, boxH, 12);
    box.lineStyle(2, 0x4FD1FF, 0.8);
    box.strokeRoundedRect(60, boxY, w - 120, boxH, 12);
    box.setDepth(50);

    const nameText = this.add.text(100, boxY + 15, speaker, {
      fontFamily: '"DotGothic16"',
      fontSize: '22px',
      color: '#4FD1FF'
    }).setDepth(51);

    const bodyText = this.add.text(100, boxY + 50, '', {
      fontFamily: '"DotGothic16"',
      fontSize: '20px',
      color: '#E5E7EB',
      wordWrap: { width: w - 220 },
      lineSpacing: 8
    }).setDepth(51);

    // Typewriter effect
    let charIndex = 0;
    const typeTimer = this.time.addEvent({
      delay: 40,
      callback: function () {
        charIndex++;
        bodyText.setText(text.substring(0, charIndex));
        
        // Sound for every character (excluding spaces)
        if (text[charIndex-1] !== ' ') {
          MOT.Audio.playBleep();
        }

        if (charIndex >= text.length) {
          typeTimer.destroy();
          // Click to continue
          const contText = this.add.text(w - 160, boxY + boxH - 30, '▼ CLICK', {
            fontFamily: '"Press Start 2P"', fontSize: '12px', color: '#9CA3AF'
          }).setDepth(51);
          this.tweens.add({ targets: contText, alpha: 0.3, yoyo: true, repeat: -1, duration: 500 });

          this.input.once('pointerdown', function () {
            box.destroy();
            nameText.destroy();
            bodyText.destroy();
            contText.destroy();
            if (onComplete) onComplete();
          });
        }
      },
      callbackScope: this,
      loop: true
    });
  }

  showChoice(choices) {
    const w = 1920, h = 1080;
    const startY = h / 2 - (choices.length * 35);
    const elements = [];

    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.5);
    overlay.fillRect(0, 0, w, h);
    overlay.setDepth(49);
    elements.push(overlay);

    choices.forEach(function (choice, i) {
      const y = startY + i * 70;
      const btn = this.add.image(w / 2, y, 'ui_button_wide').setInteractive({ useHandCursor: true }).setDepth(50);
      const txt = this.add.text(w / 2, y, choice.text, {
        fontFamily: '"DotGothic16"',
        fontSize: '22px',
        color: '#E5E7EB'
      }).setOrigin(0.5).setDepth(51);

      elements.push(btn, txt);

      btn.setAlpha(0);
      txt.setAlpha(0);
      this.tweens.add({ targets: [btn, txt], alpha: 1, duration: 300, delay: i * 100 });

      btn.on('pointerover', function () {
        this.tweens.add({ targets: [btn, txt], scale: 1.06, duration: 100 });
        txt.setColor('#4FD1FF');
      }, this);
      btn.on('pointerout', function () {
        this.tweens.add({ targets: [btn, txt], scale: 1.0, duration: 100 });
        txt.setColor('#E5E7EB');
      }, this);
      btn.on('pointerdown', function () {
        elements.forEach(function (el) { el.destroy(); });
        choice.callback();
      }, this);
    }, this);
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
    this.cameras.main.fadeOut(800, 5, 8, 20);
    this.time.delayedCall(800, function () {
      this.scene.start('BossScene', { bossIndex: 0 });
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
    this.itemGroup.getChildren().forEach(function (i) {
      if (i.x < -50) i.destroy();
    });
  }

  createHUD() {
    this.hpText = this.add.text(30, 20, '', {
      fontFamily: '"Press Start 2P"', fontSize: '16px', color: '#FF4B6E'
    }).setDepth(100).setScrollFactor(0);

    this.energyText = this.add.text(30, 50, '', {
      fontFamily: '"Press Start 2P"', fontSize: '14px', color: '#4FD1FF'
    }).setDepth(100).setScrollFactor(0);

    this.energyBar = this.add.graphics().setDepth(100).setScrollFactor(0);
    this.barrierIconBg = this.add.graphics().setDepth(100).setScrollFactor(0);
    this.barrierIconFg = this.add.graphics().setDepth(100).setScrollFactor(0);
  }

  updateHUD() {
    // HP as hearts
    let hearts = '';
    for (let i = 0; i < MOT.flags.playerMaxHP; i++) {
      hearts += i < MOT.flags.playerHP ? '♥ ' : '♡ ';
    }
    this.hpText.setText(hearts);

    // Energy bar
    const pct = MOT.flags.energy / MOT.flags.maxEnergyThreshold;
    this.energyBar.clear();
    this.energyBar.fillStyle(0x1F2933, 1);
    this.energyBar.fillRect(30, 80, 200, 16);
    const barColor = MOT.flags.maxEnergy ? 0xFF4B6E : 0x4FD1FF;
    this.energyBar.fillStyle(barColor, 1);
    this.energyBar.fillRect(32, 82, 196 * pct, 12);
    this.energyBar.lineStyle(1, 0x4FD1FF, 0.6);
    this.energyBar.strokeRect(30, 80, 200, 16);

    this.energyText.setText('EN: ' + MOT.flags.energy + '/' + MOT.flags.maxEnergyThreshold);

    const iconX = 260;
    const iconY = 88;
    const iconRadius = 12;

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
  showDeviceDialogue(text, onComplete) {
    if (this.dialogContainer) {
      this.dialogContainer.destroy();
    }
    this.dialogContainer = this.add.container(0, 0).setDepth(100);

    var w = 1920, h = 1080, boxH = 180, boxY = h - boxH - 20;
    var box = this.add.graphics();
    box.fillStyle(0x0a0a1a, 0.92);
    box.fillRoundedRect(60, boxY, w - 120, boxH, 12);
    box.lineStyle(2, 0x39FF14, 0.8);
    box.strokeRoundedRect(60, boxY, w - 120, boxH, 12);
    this.dialogContainer.add(box);

    var iconBox = this.add.graphics();
    iconBox.lineStyle(2, 0x39FF14, 0.8);
    iconBox.strokeRect(80, boxY + 40, 100, 100);
    this.dialogContainer.add(iconBox);
    
    var face = this.add.image(130, boxY + 90, 'doctor_face').setDisplaySize(96, 96);
    this.dialogContainer.add(face);

    var nameText = this.add.text(210, boxY + 15, '博士 📡', {
      fontFamily: '"DotGothic16"', fontSize: '22px', color: '#39FF14'
    });
    this.dialogContainer.add(nameText);

    var bodyText = this.add.text(210, boxY + 50, '', {
      fontFamily: '"DotGothic16"', fontSize: '20px', color: '#E5E7EB',
      wordWrap: { width: w - 330 }, lineSpacing: 8
    });
    this.dialogContainer.add(bodyText);

    var contText = this.add.text(w - 160, boxY + boxH - 30, '▼ CLICK', {
      fontFamily: '"Press Start 2P"', fontSize: '12px', color: '#9CA3AF'
    }).setAlpha(0);
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
          this.tweens.add({ targets: contText, alpha: 0.3, yoyo: true, repeat: -1, duration: 500 });
          this.input.once('pointerdown', function () {
            if (this.dialogContainer) this.dialogContainer.destroy();
            this.dialogContainer = null;
            if (onComplete) onComplete();
          }, this);
        }
      }, callbackScope: this, loop: true
    });
  }

  spawnTutorialEnemy(laneIndex, speed) {
    const laneYs = [300, 540, 780];
    const enemy = this.enemyGroup.create(1920, laneYs[laneIndex], 'enemy_basic');
    enemy.setVelocityX(-speed);
    enemy.hp = 1;
    enemy.fireTimer = this.time.addEvent({
      delay: Phaser.Math.Between(1500, 2500),
      callback: () => {
        if (enemy.active) {
          MOT.fireLinear(this, enemy.x, enemy.y, -300, 0);
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
          
          let e = this.spawnTutorialEnemy(1, 150);
          e.x = 1700;
          
          this.time.delayedCall(500, () => {
            this.physics.pause();
            this.dialogActive = true;
            this.showDeviceDialogue('「敵がやってきたな。お前は敵の前に移動して撃ち殺すんだ。」', () => {
              this.showDeviceDialogue('「移動方法は、パソコンなら矢印キーで移動できる。スマホなら画面をスライドしろ。」', () => {
                this.dialogActive = false;
                this.tutorialPhase = 2;
                this.physics.resume();
              });
            });
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
            this.showDeviceDialogue('「よけきれないときはシールドを貼るんだ。パソコンはスペース、スマホは長押しだ。タイミング良く敵の攻撃にシールドを貼れた場合、反撃することもできるだろう。」', () => {
              this.showDeviceDialogue('「気を付けないといけないのは、シールドはすぐに何度も貼り直しはできない。左上の緑の円がクールタイムだ。それが溜まりきれば貼れる状態になっている。」', () => {
                this.dialogActive = false;
                this.tutorialPhase = 3;
              });
            });
          });
        });
      }
    } else if (this.tutorialPhase === 3) {
      this.tutorialPhase = 3.1;
      
      for(let i=0; i<3; i++) {
        let e = this.spawnTutorialEnemy(i, 180);
        e.x = 1700 + Phaser.Math.Between(0, 100);
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
          });
        });
      }
    } else if (this.tutorialPhase === 5) {
      if (!this.tutorialPhase5Timer) this.tutorialPhase5Timer = 0;
      this.tutorialPhase5Timer += delta;

      if (MOT.flags.energy >= 100 || this.tutorialPhase5Timer >= 3000) {
        if (MOT.flags.energy < 100) {
          MOT.flags.energy = 100;
          MOT.flags.maxEnergy = true;
        }
        
        this.tutorialPhase = 5.1;
        this.physics.pause();
        this.dialogActive = true;
        
        this.showDeviceDialogue('「最初は私が代わりに必殺技ゲージを貯めてやろう。」', () => {
          this.showDeviceDialogue('「ゲージが溜まったな。それが溜まると必殺技を打つことができる。パソコンならエンター、スマホならダブルタップで打てる。試してみろ。」', () => {
            this.dialogActive = false;
            this.tutorialPhase = 6;
            this.physics.resume();
            this.tutorialWaitSpecial = true;
          });
        });
      }
    } else if (this.tutorialPhase === 6) {
      if (MOT.flags.energy < 100 && this.tutorialWaitSpecial) {
        // Special was used
        this.tutorialWaitSpecial = false;
        this.tutorialPhase = 6.1;
        this.time.delayedCall(500, () => {
          this.physics.pause();
          this.dialogActive = true;
          this.showDeviceDialogue('「使えたな。戦闘中、上手く使ってこのまま敵を倒していくといい。」', () => {
            this.dialogActive = false;
            this.cameras.main.fadeOut(1000, 0,0,0);
            this.time.delayedCall(1000, () => {
              this.scene.start('GameScene', { stage: 2 });
            });
          });
        });
      }
    }
  }
}

window.GameScene = GameScene;
