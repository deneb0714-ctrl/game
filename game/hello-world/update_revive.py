import codecs

content = codecs.open('src/scenes/BossScene.js', 'r', 'utf-8').read()

old_onBossHit = '''    if (this.currentBoss.configKey === 'boss3_twins') {
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
        
        // --- 復活処理（6秒） ---
        let otherBoss = (boss === this.currentBoss) ? this.sisterBoss : this.currentBoss;
        if (otherBoss && otherBoss.active) {
          this.twinsReviving = true;
          let isBrotherDefeated = (boss === this.currentBoss);
          
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
             boss.active = true;
             boss.setVisible(true);
             boss.body.enable = true;
             boss.hp = Math.max(1, otherBoss.hp); 
             
             if (isBrotherDefeated && this.sisterBoss && this.sisterBoss.active) {
                 this.sisterBoss.play('sister_shoot_anim');
             } else if (!isBrotherDefeated && this.currentBoss && this.currentBoss.active) {
                 if (this.anims.exists('brother_idle')) this.currentBoss.play('brother_idle');
                 else this.currentBoss.setTexture('brother_normal');
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
    }'''

new_onBossHit = '''    if (this.currentBoss.configKey === 'boss3_twins') {
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
    }'''

content = content.replace(old_onBossHit, new_onBossHit)

old_update = '''    // Cleanup
    this.enemyGroup.getChildren().forEach(function (e) {'''

new_update = '''    // Twins Revive Logic
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
    this.enemyGroup.getChildren().forEach(function (e) {'''

content = content.replace(old_update, new_update)

with codecs.open('src/scenes/BossScene.js', 'w', 'utf-8') as f:
    f.write(content)
print('Updated revive logic')
