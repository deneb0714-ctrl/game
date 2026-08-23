import codecs
content = codecs.open('src/scenes/BossScene.js', 'r', 'utf-8').read().splitlines()

insert_anim = -1
insert_sister = -1
insert_bossattack = -1
insert_bosshit = -1
insert_revive = -1

for i, line in enumerate(content):
    if "this.anims.exists('sister_revive_anim')" in line:
        insert_anim = i
    if "if (this.currentBoss && this.currentBoss.configKey === 'boss3_twins' && this.sisterBoss && this.sisterBoss.active && this.sisterBoss.visible && !this.dialogActive) {" in line:
        insert_sister = i
    if "bossAttack() {" in line:
        insert_bossattack = i
    if "onBossHit(bullet, boss) {" in line:
        insert_bosshit = i
    if "let otherBoss = (boss === this.currentBoss) ? this.sisterBoss : this.currentBoss;" in line:
        insert_revive = i

# Modify bottom up to not mess up line numbers
# 5. Revive block
if insert_revive != -1:
    revive_start = insert_revive
    revive_end = revive_start + 40
    for i in range(revive_start, len(content)):
        if 'let speakerColor = isBrotherDefeated ?' in content[i]:
            revive_end = i
            break

    new_revive = '''        let otherBoss = (boss === this.currentBoss) ? this.sisterBoss : this.currentBoss;
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
             let speakerColor = isBrotherDefeated ? '#FF4B6E' : '#4FD1FF';'''.split('\n')

    content[revive_start:revive_end+1] = new_revive

# 4. BossHit
if insert_bosshit != -1:
    content[insert_bosshit+1:insert_bosshit+1] = [
        '    if (this.twinsReviving) {',
        '      bullet.destroy();',
        '      return;',
        '    }'
    ]

# 3. BossAttack
if insert_bossattack != -1:
    content[insert_bossattack+2:insert_bossattack+2] = [
        '    if (this.twinsReviving) return;'
    ]

# 2. SisterAttack
if insert_sister != -1:
    content[insert_sister] = "    if (this.currentBoss && this.currentBoss.configKey === 'boss3_twins' && this.sisterBoss && this.sisterBoss.active && this.sisterBoss.visible && !this.dialogActive && !this.twinsReviving) {"

# 1. Anim
if insert_anim != -1:
    anim_code = '''      if (!this.anims.exists('brother_revive_anim')) {
        this.anims.create({
          key: 'brother_revive_anim',
          frames: [
            { key: 'brother_revive1' },
            { key: 'brother_revive2' }
          ],
          frameRate: 4,
          repeat: -1
        });
      }'''.split('\n')
    content[insert_anim:insert_anim] = anim_code

with codecs.open('src/scenes/BossScene.js', 'w', 'utf-8') as f:
    f.write('\n'.join(content))
print('Done!')
