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
    const stageLabel = this.currentStage === 1 ? 'STAGE 1 – 研究所' : 'STAGE 2 – 魔王城への道';
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

    // Fade in
    this.cameras.main.fadeIn(500, 5, 8, 20);
  }

  getWaveSchedule() {
    if (this.currentStage === 1) {
      return [
        { time: 3000, action: 'wave', count: 3, speed: 150 },
        { time: 7000, action: 'wave', count: 5, speed: 180 },
        { time: 12000, action: 'wave', count: 4, speed: 200 },
        { time: 16000, action: 'items' },
        { time: 18000, action: 'wave', count: 6, speed: 200 },
        { time: 23000, action: 'minion1_encounter' },
        { time: 28000, action: 'stage_end' }
      ];
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

    // Auto-shoot
    this.autoShootTimer += delta;
    if (this.autoShootTimer >= 180) {
      this.autoShootTimer = 0;
      this.firePlayerBullet();
      MOT.Audio.playShot();
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
      this.time.delayedCall(2000, function () {
        if (bullet.active) bullet.destroy();
      });
    }
  }

  onSpecialAttack() {
    if (MOT.flags.maxEnergy) {
      MOT.Audio.playSpecial();
      this.cameras.main.flash(500, 79, 209, 255);
      
      // Fire 36 bullets in a circle
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
      
      // Reset energy
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
        this.minionBattleActive = true;
      }.bind(this));
    }, [], this);
  }

  onMinion1Defeated() {
    this.minionBattleActive = false;
    this.dialogActive = true;
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
        }.bind(this)},
        { text: '博士の指示に従う', callback: function () {
          MOT.Audio.playSelect();
          MOT.modifyFlag('obeyDoctor', 1);
          MOT.modifyFlag('brutality', 1);
          this.cameras.main.shake(200, 0.01);
          this.showExplosion(this.minion1.x, this.minion1.y);
          this.minion1.destroy();
          this.dialogActive = false;
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
    if (this.currentStage === 1) {
      this.cameras.main.fadeOut(800, 5, 8, 20);
      this.time.delayedCall(800, function () {
        this.scene.restart({ stage: 2 });
      }, [], this);
    } else {
      // Go to BossScene
      this.cameras.main.fadeOut(800, 5, 8, 20);
      this.time.delayedCall(800, function () {
        this.scene.start('BossScene');
      }, [], this);
    }
  }

  onPlayerHit(player, obj) {
    if (this.playerInvincible || this.dialogActive) return;

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
    bullet.destroy();
    enemy.hp = (enemy.hp || 1) - 1;
    enemy.setTint(0xffffff);
    this.time.delayedCall(50, function () {
      if (enemy.active) enemy.clearTint();
    });

    if (enemy.hp <= 0) {
      if (enemy === this.minion1) {
        this.onMinion1Defeated();
        return;
      }
      this.showExplosion(enemy.x, enemy.y);
      // Drop items sometimes
      if (Phaser.Math.Between(0, 100) < 30) {
        MOT.spawnEnergyItem(this, enemy.x, enemy.y);
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
  }
}

window.GameScene = GameScene;
