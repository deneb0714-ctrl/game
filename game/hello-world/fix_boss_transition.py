import os

def replace_exact(filepath, old_str, new_str):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    if old_str in content:
        content = content.replace(old_str, new_str)
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print("Success")
    else:
        print(f"WARNING: old_str not found in {filepath}")

def fix():
    # 1. Update background initialization
    old_bg = """  create() {
    const w = 1920, h = 1080;
    this.bg = this.add.image(0, 0, 'bg_boss').setOrigin(0, 0);"""
    
    new_bg = """  create() {
    const w = 1920, h = 1080;
    var bgKey = 'bg_stage2';
    if (this.currentBossIndex === 1) bgKey = 'bg_stage3';
    else if (this.currentBossIndex === 2) bgKey = 'bg_stage4';
    else if (this.currentBossIndex === 3) bgKey = 'bg_stage5';
    this.bg = this.add.image(0, 0, bgKey).setOrigin(0, 0);"""
    replace_exact('src/scenes/BossScene.js', old_bg, new_bg)

    # 2. Update proceedToNextArea
    old_transition = """  proceedToNextArea(boss, isSpared = false) {
    this.clearConversationUI();
    var resumeFn = function() {
      this.currentBoss = null;
      this.currentBossIndex++;
      this.dialogActive = false;
      this.physics.resume();
      // Item drop
      MOT.spawnHealthItem(this, 960, 460);
      // 次のボスが残っている場合は幕間（雑魚ウェーブ）を挟む
      if (this.currentBossIndex < this.bossQueue.length) {
        this.startIntermission();
      } else {
        this.time.delayedCall(1500, function () { this.startBoss(); }, [], this);
      }
    }.bind(this);"""

    new_transition = """  proceedToNextArea(boss, isSpared = false) {
    this.clearConversationUI();
    var resumeFn = function() {
      this.currentBoss = null;
      this.currentBossIndex++;
      this.dialogActive = false;
      
      // Item drop
      MOT.spawnHealthItem(this, 960, 460);
      
      this.player.setCollideWorldBounds(false);
      this.tweens.add({ targets: this.player, x: 2100, duration: 1000, ease: 'Power2' });
      this.cameras.main.fadeOut(1000, 0, 0, 0);
      
      this.time.delayedCall(1000, () => {
        var bgKey = 'bg_stage2';
        if (this.currentBossIndex === 1) bgKey = 'bg_stage3';
        else if (this.currentBossIndex === 2) bgKey = 'bg_stage4';
        else if (this.currentBossIndex === 3) bgKey = 'bg_stage5';
        this.bg.setTexture(bgKey);
        
        this.player.x = -100;
        
        this.cameras.main.fadeIn(500, 0, 0, 0);
        this.tweens.add({
          targets: this.player, x: 300, duration: 1000, ease: 'Power2',
          onComplete: () => {
            this.player.setCollideWorldBounds(true);
            this.physics.resume();
            if (this.currentBossIndex < this.bossQueue.length) {
              this.startIntermission();
            } else {
              this.time.delayedCall(1500, () => { this.startBoss(); });
            }
          }
        });
      });
    }.bind(this);"""
    replace_exact('src/scenes/BossScene.js', old_transition, new_transition)

if __name__ == '__main__':
    fix()
