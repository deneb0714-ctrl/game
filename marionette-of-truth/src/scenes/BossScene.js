// =============================================
// BossScene.js – ボス戦（幹部→両翼→魔王）
// =============================================
class BossScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BossScene' });
  }

  init() {
    this.bossQueue = ['boss1', 'boss2', 'boss3', 'wing_left', 'wing_right', 'demon_lord'];
    this.currentBossIndex = 0;
    this.dialogActive = false;
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
  }

  create() {
    const w = 1920, h = 1080;
    this.bg = this.add.image(0, 0, 'bg_boss').setOrigin(0, 0);

    // Groups
    this.playerBullets = this.physics.add.group({ maxSize: 500 });
    this.enemyBullets = this.physics.add.group({ maxSize: 1000 });
    this.enemyGroup = this.physics.add.group();
    this.itemGroup = this.physics.add.group();

    // Player
    this.player = this.physics.add.sprite(300, h / 2, 'player').setScale(2).setDepth(10);
    this.player.setCollideWorldBounds(true);
    this.player.setDrag(800, 800);
    this.player.setMaxVelocity(400, 400);

    // Trail
    this.add.particles(0, 0, 'particle', {
      follow: this.player, scale: { start: 0.6, end: 0 },
      alpha: { start: 0.3, end: 0 }, tint: 0x4FD1FF,
      lifespan: 250, frequency: 60, blendMode: 'ADD'
    });

    // Draw 3 lanes visually
    const laneYs = [300, 540, 780];
    const laneGraphics = this.add.graphics().setDepth(1);
    laneGraphics.lineStyle(2, 0x4FD1FF, 0.25);   // Adjust orb spawn probabilities: red-black (murderous) rarer (8%)
  MOT.spawnEnergyItem = function (scene, x, y) {
    const rand = Phaser.Math.Between(0, 100);
    const isMurderous = rand < 8; // 8% chance
    const item = scene.itemGroup.create(x, y, 'item_energy');
    item.setVelocityX(Phaser.Math.Between(-400, -200));
    if (isMurderous) {
      item.itemType = 'energy_murderous';
      item.value = 30;
      item.setTint(0xFF0000);
    } else {
      item.itemType = 'energy';
      item.value = 10;
    }
    // Floating animation
    scene.tweens.add({
      targets: item,
      y: '-=10',
      yoyo: true,
      repeat: -1,
      duration: 800,
      ease: 'Sine.easeInOut'
    });
  };

    laneYs.forEach(function (y) {
      laneGraphics.lineBetween(0, y, w, y);
    });

    MOT.setupControls(this);
    MOT.setupTouchControls(this, this.player);

    this.physics.add.overlap(this.player, this.enemyBullets, this.onPlayerHit, null, this);
    this.physics.add.overlap(this.playerBullets, this.enemyGroup, this.onBossHit, null, this);
    this.physics.add.overlap(this.player, this.itemGroup, MOT.collectItem.bind(null, this), null, this);

    this.createHUD();
    this.cameras.main.fadeIn(800, 5, 8, 20);

    // Start first boss
    this.time.delayedCall(1000, function () { this.startBoss(); }, [], this);
  }

  getBossConfig(key) {
    var configs = {
      boss1: { texture: 'boss1', name: '幹部1 – 長男', hp: 30, scale: 3,
        intro: '「貴様が博士の人形か。\n我が鎧、砕けるものなら砕いてみよ！」',
        defeat: '「バカな…この俺が…！」',
        choices: [
          { text: '止めを刺す', flag: function(){ MOT.modifyFlag('brutality',1); MOT.modifyFlag('obeyDoctor',1); }},
          { text: '見逃す', flag: function(){ MOT.modifyFlag('showMercy',1); MOT.modifyFlag('favor.boss1',1); }}
        ]},
      boss2: { texture: 'boss2', name: '幹部2 – 次男', hp: 35, scale: 3,
        intro: '「弟の仇…！\nこの炎で焼き尽くしてやる！」',
        defeat: '「くそっ…弟たちは…無事か…」',
        choices: [
          { text: '止めを刺す', flag: function(){ MOT.modifyFlag('brutality',1); MOT.modifyFlag('obeyDoctor',1); }},
          { text: '兄弟の無事を伝える', flag: function(){ MOT.modifyFlag('showMercy',1); MOT.modifyFlag('favor.boss2',1); }}
        ]},
      boss3: { texture: 'boss3', name: '幹部3 – 三男', hp: 40, scale: 3,
        intro: '「お前…本当に自分の意思で戦っているのか？\n博士の操り人形じゃないのか？」',
        defeat: '「やはり…お前は普通の兵器じゃない。」',
        choices: [
          { text: '黙れ（止めを刺す）', flag: function(){ MOT.modifyFlag('brutality',1); MOT.modifyFlag('obeyDoctor',1); }},
          { text: '…話を聞く', flag: function(){ MOT.modifyFlag('showMercy',1); MOT.modifyFlag('favor.boss3',1); }}
        ]},
      wing_left: { texture: 'wing_left', name: '魔王左翼 – 蒼氷のレイス', hp: 50, scale: 3.5,
        intro: '「冷静に分析しよう。\nお前が本当に倒すべき相手は、ここにはいない。」',
        defeat: '「…これを受け取れ。真実に辿り着くために。」',
        choices: [
          { text: '受け取らない（止めを刺す）', flag: function(){ MOT.modifyFlag('brutality',1); }},
          { text: 'アイテムを受け取る', flag: function(){ MOT.modifyFlag('favor.wingL',1); MOT.addEnergy(20); }}
        ]},
      wing_right: { texture: 'wing_right', name: '魔王右翼 – 紅蓮のヴァルク', hp: 50, scale: 3.5,
        intro: '「理屈なんかどうでもいい！\nお前が仲間を傷つけたなら、俺が叩き潰す！」',
        defeat: '「ぐっ…だが、お前の目…憎しみじゃない。」',
        choices: [
          { text: '容赦なく倒す', flag: function(){ MOT.modifyFlag('brutality',1); }},
          { text: '手を差し伸べる', flag: function(){ MOT.modifyFlag('favor.wingR',1); MOT.addEnergy(20); }}
        ]},
      demon_lord: { texture: 'demon_lord', name: '魔王 – ヴェリタス', hp: 80, scale: 2,
        intro: '「…来たか、博士の人形よ。\nお前に真実を伝えなければならない。」',
        defeat: '「聞いてくれ。博士こそが…この世界を壊そうとしている。\n俺は…それを止めたかっただけだ。」',
        choices: [
          { text: '最後まで話を聞く', flag: function(){ MOT.flags.heardDemonLord = true; }},
          { text: '任務を遂行する（倒す）', flag: function(){ MOT.modifyFlag('obeyDoctor',1); }},
          { text: '力を吸収する', flag: function(){ MOT.modifyFlag('brutality',1); MOT.addEnergy(50); }}
        ]}
    };
    return configs[key];
  }

  startBoss() {
    if (this.currentBossIndex >= this.bossQueue.length) {
      this.cameras.main.fadeOut(1000, 0, 0, 0);
      this.time.delayedCall(1000, function(){ this.scene.start('EndingScene'); }, [], this);
      return;
    }

    var key = this.bossQueue[this.currentBossIndex];
    var cfg = this.getBossConfig(key);
    this.bossMaxHP = cfg.hp;
    this.bossHP = cfg.hp;
    this.bossPhase = 0;
    this.bossAttackTimer = 0;
    this.bossDefeated = false;

    // Spawn boss
    var boss = this.physics.add.sprite(1920, 540, cfg.texture);
    boss.setScale(cfg.scale);
    boss.setDepth(8);
    this.enemyGroup.add(boss);
    this.currentBoss = boss;
    boss.hp = cfg.hp;
    boss.configKey = key;

    // Entrance
    this.dialogActive = true;
    this.physics.pause();
    this.cameras.main.shake(400, 0.015);

    this.tweens.add({
      targets: boss,
      x: 1400,
      duration: 1200,
      ease: 'Power2',
      onComplete: function () {
        // Boss floating
        this.tweens.add({ targets: boss, y: boss.y - 30, yoyo: true, repeat: -1, duration: 1000, ease: 'Sine.easeInOut' });
        // Intro dialogue
        this.showDialogue(cfg.name, cfg.intro, function () {
          this.dialogActive = false;
          this.physics.resume();
          this.startBossLaneMovement();
        }.bind(this));
      }.bind(this)
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
          var laneYs = [300, 540, 780];
          var targetY = laneYs[Phaser.Math.Between(0, 2)];
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
  }

  update(time, delta) {
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
        this.time.delayedCall(2000, function(){ if(b.active) b.destroy(); }); 
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
    if (this.currentBoss && this.currentBoss.active) {
      this.bossAttackTimer += delta;
      var interval = this.bossHP < this.bossMaxHP * 0.5 ? 600 : 1000;
      if (this.bossAttackTimer >= interval) {
        this.bossAttackTimer = 0;
        this.bossAttack();
      }
    }

    // Cleanup
    this.enemyBullets.getChildren().forEach(function(b){
      if(b.x<-50||b.x>2000||b.y<-50||b.y>1130) b.destroy();
    });

    this.updateHUD();
  }

  onBarrierUse() {
    if (this.barrierCooldown <= 0 && !this.barrierActive && !this.dialogActive) {
      MOT.Audio.playBleep();
      this.barrierActive = true;
      this.barrierTime = 0;
      this.barrierCooldown = 5000;
      
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
            this.onBossHit({ damage: 9999, destroy: () => {} }, enemy);
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
        this.time.delayedCall(i * 150, function(){
          MOT.fireFan(this, x - 30, y, 3, 300, 180, 30);
        }, [], this);
      }
    }
  }

  onPlayerHit(player, obj) {
    if (this.playerInvincible || this.dialogActive) return;

    if (this.barrierActive) {
      obj.destroy();
      this.deactivateBarrier();
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
      return;
    }

    obj.destroy();
    MOT.flags.playerHP--;
    this.cameras.main.shake(150, 0.008);
    this.playerInvincible = true;
    player.setTint(0xFF4B6E);
    this.tweens.add({
      targets: player, alpha: 0.3, yoyo: true, repeat: 3, duration: 100,
      onComplete: function(){ player.setAlpha(1); player.clearTint(); this.playerInvincible = false; }.bind(this)
    });
    if (MOT.flags.playerHP <= 0) {
      MOT.flags.diedCount++;
      this.cameras.main.fadeOut(1000, 0, 0, 0);
      this.time.delayedCall(1000, function(){ this.scene.start('EndingScene'); }, [], this);
    }
  }

  onBossHit(bullet, boss) {
      bullet.destroy(); // 弾を消す
      const dmg = bullet.damage || 1;

      // ── 幕間中の雑魚敵の場合 ──────────────────────────────────────
      if (boss.isIntermissionEnemy) {
        boss.hp = (boss.hp || 3) - dmg;
        boss.setTint(0xffffff);
        this.time.delayedCall(50, function(){ if (boss.active) boss.clearTint(); });
        if (boss.hp <= 0) {
          this.showExplosion(boss.x, boss.y);
          if (Phaser.Math.Between(0, 100) < 40) MOT.spawnEnergyItem(this, boss.x, boss.y);
          boss.destroy();
          // 全体が倒されたら幕間終了
          this.intermissionKills = (this.intermissionKills || 0) + 1;
          if (this.intermissionKills >= this.intermissionTotal) {
            this.endIntermission();
          }
        }
        return;
      }

      // ── ボス敵への処理 ────────────────────────────────────────────
      this.bossHP -= dmg;
      boss.hp = this.bossHP;
      boss.setTint(0xffffff);
      this.time.delayedCall(50, function(){ if (boss.active) boss.clearTint(); });
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
        onComplete: function(){
          this.showDialogue(cfg.name, cfg.defeat, function(){
            this.showChoice(cfg.choices.map(function(c){
              return {
                text: c.text,
                callback: function(){
                  MOT.Audio.playSelect();
                  c.flag();
                  // Explosion and move to next
                  this.showExplosion(boss.x, boss.y);
                  boss.destroy();
                  this.currentBoss = null;
                  this.currentBossIndex++;
                  this.dialogActive = false;
                  this.physics.resume();
                  // Item drop
                  MOT.spawnHealthItem(this, 960, 540);
                  // 次のボスが残っている場合は幕間（雑魚ウェーブ）を挟む
                  if (this.currentBossIndex < this.bossQueue.length) {
                    this.startIntermission();
                  } else {
                    this.time.delayedCall(1500, function(){ this.startBoss(); }, [], this);
                  }
                }.bind(this)
              };
            }.bind(this)));
          }.bind(this));
        }.bind(this)
      });
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
    this.tweens.add({ targets: warnText, alpha: 1, duration: 400,
      onComplete: function() {
        self.tweens.add({ targets: warnText, alpha: 0, duration: 400, delay: 1500,
          onComplete: function() { warnText.destroy(); }
        });
      }
    });

    // 幕間カウンター（雑魚の残数を管理）
    this.intermissionKills = 0;
    this.intermissionTotal = 5; // 雑魚5体

    // 1.5秒後に雑魚スポーン開始
    this.time.delayedCall(1500, function() {
      var laneYs = [300, 540, 780];
      for (var i = 0; i < self.intermissionTotal; i++) {
        self.time.delayedCall(i * 600, function() {
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
            callback: function() { if (e.active) MOT.fireLinear(self, e.x, e.y, -320, 0); },
            loop: true
          });
          e.on('destroy', function() { if (e.fireTimer) e.fireTimer.destroy(); });
        });
      }

      // タイムアウト保険：12秒後に残っていても次へ進む
      self.intermissionTimeout = self.time.delayedCall(12000, function() {
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
    this.enemyGroup.getChildren().slice().forEach(function(e) {
      if (e.isIntermissionEnemy && e.active) e.destroy();
    });
    this.enemyBullets.clear(true, true);
    // 次のボスを開始
    this.time.delayedCall(800, function() { this.startBoss(); }, [], this);
  }

  showDialogue(speaker, text, onComplete) {
    if (this.dialogContainer) {
      this.dialogContainer.destroy();
    }
    this.dialogContainer = this.add.container(0, 0).setDepth(100);

    var w = 1920, h = 1080, boxH = 180, boxY = h - boxH - 20;
    var box = this.add.graphics();
    box.fillStyle(0x0a0a1a, 0.92);
    box.fillRoundedRect(60, boxY, w - 120, boxH, 12);
    box.lineStyle(2, 0x4FD1FF, 0.8);
    box.strokeRoundedRect(60, boxY, w - 120, boxH, 12);
    this.dialogContainer.add(box);

    var nameText = this.add.text(100, boxY + 15, speaker, {
      fontFamily: '"DotGothic16"', fontSize: '22px', color: '#4FD1FF'
    });
    this.dialogContainer.add(nameText);

    var bodyText = this.add.text(100, boxY + 50, '', {
      fontFamily: '"DotGothic16"', fontSize: '20px', color: '#E5E7EB',
      wordWrap: { width: w - 220 }, lineSpacing: 8
    });
    this.dialogContainer.add(bodyText);

    var contText = this.add.text(w - 160, boxY + boxH - 30, '▼ CLICK', {
      fontFamily: '"Press Start 2P"', fontSize: '12px', color: '#9CA3AF'
    }).setAlpha(0);
    this.dialogContainer.add(contText);

    var charIndex = 0;
    var typeTimer = this.time.addEvent({
      delay: 40, callback: function(){
        charIndex++;
        bodyText.setText(text.substring(0, charIndex));
        if (text[charIndex-1] !== ' ') MOT.Audio.playBleep();
        if (charIndex >= text.length) {
          typeTimer.destroy();
          contText.setAlpha(1);
          this.tweens.add({ targets: contText, alpha: 0.3, yoyo: true, repeat: -1, duration: 500 });
          this.input.once('pointerdown', function(){
            if (this.dialogContainer) this.dialogContainer.destroy();
            this.dialogContainer = null;
            if(onComplete) onComplete();
          }, this);
        }
      }, callbackScope: this, loop: true
    });
  }

  showChoice(choices) {
    var w = 1920, h = 1080;
    var startY = h / 2 - (choices.length * 35);
    var elements = [];
    var overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.5); overlay.fillRect(0,0,w,h); overlay.setDepth(49);
    elements.push(overlay);

    choices.forEach(function(choice, i){
      var y = startY + i * 70;
      var btn = this.add.image(w/2, y, 'ui_button_wide').setInteractive({useHandCursor:true}).setDepth(50);
      var txt = this.add.text(w/2, y, choice.text, {
        fontFamily:'"DotGothic16"', fontSize:'22px', color:'#E5E7EB'
      }).setOrigin(0.5).setDepth(51);
      elements.push(btn, txt);
      btn.setAlpha(0); txt.setAlpha(0);
      this.tweens.add({ targets:[btn,txt], alpha:1, duration:300, delay:i*100 });
      btn.on('pointerover', function(){ this.tweens.add({targets:[btn,txt],scale:1.06,duration:100}); txt.setColor('#4FD1FF'); }, this);
      btn.on('pointerout', function(){ this.tweens.add({targets:[btn,txt],scale:1.0,duration:100}); txt.setColor('#E5E7EB'); }, this);
      btn.on('pointerdown', function(){ elements.forEach(function(el){el.destroy();}); choice.callback(); }, this);
    }, this);
  }

  showExplosion(x, y) {
    MOT.Audio.playExplosion();
    var exp = this.add.sprite(x, y, 'explosion').setScale(4).setDepth(20);
    this.tweens.add({ targets: exp, scale: 8, alpha: 0, duration: 700, onComplete: function(){ exp.destroy(); }});
    for (var i = 0; i < 20; i++) {
      var p = this.add.circle(x, y, Phaser.Math.Between(3,8), Phaser.Math.Between(0,1) ? 0xFF8C00 : 0xFF2E2E).setDepth(20);
      this.tweens.add({
        targets: p, x: x+Phaser.Math.Between(-200,200), y: y+Phaser.Math.Between(-200,200),
        alpha: 0, scale: 0, duration: Phaser.Math.Between(300,800), onComplete: function(){ p.destroy(); }
      });
    }
  }

  createHUD() {
    this.hpText = this.add.text(30, 20, '', { fontFamily:'"Press Start 2P"', fontSize:'16px', color:'#FF4B6E' }).setDepth(100);
    this.energyText = this.add.text(30, 50, '', { fontFamily:'"Press Start 2P"', fontSize:'14px', color:'#4FD1FF' }).setDepth(100);
    this.energyBar = this.add.graphics().setDepth(100);
    this.barrierIconBg = this.add.graphics().setDepth(100);
    this.barrierIconFg = this.add.graphics().setDepth(100);
    this.bossHPText = this.add.text(960, 20, '', { fontFamily:'"Press Start 2P"', fontSize:'14px', color:'#FF2E2E' }).setOrigin(0.5,0).setDepth(100);
    this.bossHPBar = this.add.graphics().setDepth(100);
  }

  updateHUD() {
    var hearts = '';
    for (var i = 0; i < MOT.flags.playerMaxHP; i++) hearts += i < MOT.flags.playerHP ? '♥ ' : '♡ ';
    this.hpText.setText(hearts);

    var pct = MOT.flags.energy / MOT.flags.maxEnergyThreshold;
    this.energyBar.clear();
    this.energyBar.fillStyle(0x1F2933,1); this.energyBar.fillRect(30,80,200,16);
    this.energyBar.fillStyle(MOT.flags.maxEnergy ? 0xFF4B6E : 0x4FD1FF, 1);
    this.energyBar.fillRect(32,82,196*pct,12);
    this.energyBar.lineStyle(1,0x4FD1FF,0.6); this.energyBar.strokeRect(30,80,200,16);
    this.energyText.setText('EN: '+MOT.flags.energy+'/'+MOT.flags.maxEnergyThreshold);

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
      const cdPct = 1 - (this.barrierCooldown / 5000);
      this.barrierIconFg.fillStyle(0x00FFaa, 0.4);
      this.barrierIconFg.beginPath();
      this.barrierIconFg.moveTo(iconX, iconY);
      this.barrierIconFg.arc(iconX, iconY, iconRadius - 2, Phaser.Math.DegToRad(-90), Phaser.Math.DegToRad(-90 + 360 * cdPct), false);
      this.barrierIconFg.closePath();
      this.barrierIconFg.fillPath();
    }

    // Boss HP
    this.bossHPBar.clear();
    if (this.currentBoss && this.currentBoss.active) {
      var bpct = this.bossHP / this.bossMaxHP;
      var key = this.currentBoss.configKey;
      var cfg = this.getBossConfig(key);
      this.bossHPText.setText(cfg.name);
      this.bossHPBar.fillStyle(0x1F2933,1); this.bossHPBar.fillRect(560,50,800,20);
      this.bossHPBar.fillStyle(0xFF2E2E,1); this.bossHPBar.fillRect(562,52,796*bpct,16);
      this.bossHPBar.lineStyle(1,0xFF2E2E,0.6); this.bossHPBar.strokeRect(560,50,800,20);
    } else {
      this.bossHPText.setText('');
    }
  }
}

window.BossScene = BossScene;
