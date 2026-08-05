import sys
with open('src/scenes/BossScene.js', 'r', encoding='utf-8') as f:
    content = f.read()

old_block = """    if (this.isLabTransition) {
        if (this.enemyBullets) this.enemyBullets.clear(true, true);
        if (this.playerBullets) this.playerBullets.clear(true, true);
        if (this.playerHitboxGraphics) this.playerHitboxGraphics.clear();
        if (this.currentBoss) { this.currentBoss.setActive(false); this.currentBoss.setVisible(false); }
        if (this.sisterBoss) { this.sisterBoss.setActive(false); this.sisterBoss.setVisible(false); }
    }"""
content = content.replace(old_block, "")

new_block = """  update(time, delta) {
    if (this.isLabTransition) {
        if (this.enemyBullets) this.enemyBullets.clear(true, true);
        if (this.playerBullets) this.playerBullets.clear(true, true);
        if (this.playerHitboxGraphics) this.playerHitboxGraphics.clear();
        if (this.currentBoss) { this.currentBoss.setActive(false); this.currentBoss.setVisible(false); }
        if (this.sisterBoss) { this.sisterBoss.setActive(false); this.sisterBoss.setVisible(false); }
        if (this.batteryUI) this.batteryUI.clear();
        if (this.energyBarOutline) this.energyBarOutline.clear();
        if (MOT.DoctorDirective && MOT.DoctorDirective.directiveContainer) {
            MOT.DoctorDirective.hideDirective(this);
        }
        return;
    }"""
content = content.replace("  update(time, delta) {", new_block)

with open('src/scenes/BossScene.js', 'w', encoding='utf-8') as f:
    f.write(content)
