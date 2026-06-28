import re

def patch():
    filepath = 'src/scenes/BossScene.js'
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # --- 1. playDemonLordIntro ---
    intro_hero_img = r"this\.heroImage\.setY\(100 \+ \(this\.heroImage\.height \* hScale\) / 2\);"
    intro_demon_img = """this.heroImage.setY(100 + (this.heroImage.height * hScale) / 2);
    this.demonImage = this.add.image(1920 - 300, 1080 / 2, 'demon_lord_normal').setAlpha(0).setDepth(90);
    var dScale = 750 / this.demonImage.width;
    this.demonImage.setScale(dScale);
    this.demonImage.setY(100 + (this.demonImage.height * dScale) / 2);"""
    
    # We want to replace it only once in playDemonLordIntro
    content = re.sub(intro_hero_img, intro_demon_img, content, count=1)

    intro_sayDevice_old = r"const sayDevice = \(text\) => new Promise\(res => \{\s*this\.tweens\.add\(\{ targets: dimBg, alpha: 0, duration: 300 \}\);\s*this\.tweens\.add\(\{ targets: this\.heroImage, alpha: 0, duration: 300 \}\);\s*this\.showDeviceDialogue\(text, res\);\s*\}\);"
    intro_sayDevice_new = """const sayDevice = (text) => new Promise(res => {
      this.tweens.add({ targets: dimBg, alpha: 0, duration: 300 });
      this.tweens.add({ targets: this.heroImage, alpha: 0, duration: 300 });
      if(this.demonImage) this.tweens.add({ targets: this.demonImage, alpha: 0, duration: 300 });
      this.showDeviceDialogue(text, res);
    });"""
    content = re.sub(intro_sayDevice_old, intro_sayDevice_new, content, count=1)

    intro_sayHero_old = r"const sayHero = \(text\) => new Promise\(res => \{\s*this\.tweens\.add\(\{ targets: dimBg, alpha: 0\.6, duration: 300 \}\);\s*this\.tweens\.add\(\{ targets: this\.heroImage, alpha: 1, duration: 300 \}\);\s*this\.showDialogue\('勇者', text, res\);\s*\}\);"
    intro_sayHero_new = """const sayHero = (text) => new Promise(res => {
      this.tweens.add({ targets: dimBg, alpha: 0.6, duration: 300 });
      this.tweens.add({ targets: this.heroImage, alpha: 1, duration: 300 });
      if(this.demonImage) this.tweens.add({ targets: this.demonImage, alpha: 0.4, duration: 300 });
      if (text === '「……」' || text === '「……。」' || text === '「…」') {
        this.heroImage.setTexture('hero_stand_silent');
      } else {
        this.heroImage.setTexture('hero_stand');
      }
      this.heroImage.setScale(750 / this.heroImage.width);
      this.heroImage.setY(100 + (this.heroImage.height * this.heroImage.scaleY) / 2);
      this.showDialogue('勇者', text, res);
    });"""
    content = re.sub(intro_sayHero_old, intro_sayHero_new, content, count=1)

    intro_sayDemon_old = r"const sayDemon = \(text\) => new Promise\(res => \{\s*this\.tweens\.add\(\{ targets: dimBg, alpha: 0\.6, duration: 300 \}\);\s*this\.tweens\.add\(\{ targets: this\.heroImage, alpha: 0\.4, duration: 300 \}\);\s*this\.showDialogue\('魔王 – ヴェリタス', text, res\);\s*\}\);"
    intro_sayDemon_new = """const sayDemon = (text) => new Promise(res => {
      this.tweens.add({ targets: dimBg, alpha: 0.6, duration: 300 });
      this.tweens.add({ targets: this.heroImage, alpha: 0.4, duration: 300 });
      if(this.demonImage) {
        this.tweens.add({ targets: this.demonImage, alpha: 1, duration: 300 });
        if (text === '「……」' || text === '「……。」' || text === '「…」' || text.includes('……まあよい')) {
          this.demonImage.setTexture('demon_lord_silent');
        } else {
          this.demonImage.setTexture('demon_lord_normal');
        }
        this.demonImage.setScale(750 / this.demonImage.width);
        this.demonImage.setY(100 + (this.demonImage.height * this.demonImage.scaleY) / 2);
      }
      this.showDialogue('魔王 – ヴェリタス', text, res);
    });"""
    content = re.sub(intro_sayDemon_old, intro_sayDemon_new, content, count=1)
    
    intro_cleanup_old = r"this\.tweens\.add\(\{ targets: \[dimBg, this\.heroImage\], alpha: 0, duration: 300 \}\);"
    intro_cleanup_new = r"this.tweens.add({ targets: [dimBg, this.heroImage, this.demonImage], alpha: 0, duration: 300 });"
    content = re.sub(intro_cleanup_old, intro_cleanup_new, content, count=1)

    # --- 2. Defeat sequence ---
    defeat_hero_img = r"this\.showDeviceDialogue\(text, res\); \}\);\s*const sayHero = \(text\) => new Promise\(res => \{ this\.tweens\.add\(\{ targets: dimBg, alpha: 0\.6, duration: 300 \}\); this\.tweens\.add\(\{targets: this\.heroImage, alpha: 1, duration: 300\}\);"
    # Let's replace the whole block of sayDevice, sayHero, sayDemon in the defeat section
    defeat_block_old = r"const sayDevice = \(text\) => new Promise\(res => \{ this\.tweens\.add\(\{ targets: dimBg, alpha: 0\.6, duration: 300 \}\); this\.tweens\.add\(\{targets: this\.heroImage, alpha: 0\.4, duration: 300\}\); this\.showDeviceDialogue\(text, res\); \}\);\s*const sayHero = \(text\) => new Promise\(res => \{ this\.tweens\.add\(\{ targets: dimBg, alpha: 0\.6, duration: 300 \}\); this\.tweens\.add\(\{targets: this\.heroImage, alpha: 1, duration: 300\}\);  if \(text === '「……」' \|\| text === '「……。」' \|\| text === '「…」'\) \{        this\.heroImage\.setTexture\('hero_stand_silent'\);      \} else \{        this\.heroImage\.setTexture\('hero_stand'\);      \}     this\.heroImage\.setScale\(750 / this\.heroImage\.width\);     this\.heroImage\.setY\(100 \+ \(this\.heroImage\.height \* this\.heroImage\.scaleY\) / 2\);      this\.showDialogue\('勇者', text, res\); \}\);\s*const sayDemon = \(text\) => new Promise\(res => \{ this\.tweens\.add\(\{ targets: dimBg, alpha: 0\.6, duration: 300 \}\); this\.tweens\.add\(\{targets: this\.heroImage, alpha: 0\.4, duration: 300\}\); this\.showDialogue\('魔王', text, res\); \}\);"
    
    defeat_block_new = """
            this.demonImage = this.add.image(1920 - 300, 1080 / 2, 'demon_lord_dying').setAlpha(0).setDepth(90);
            var dScale = 750 / this.demonImage.width;
            this.demonImage.setScale(dScale);
            this.demonImage.setY(100 + (this.demonImage.height * dScale) / 2);

            const sayDevice = (text) => new Promise(res => { this.tweens.add({ targets: dimBg, alpha: 0.6, duration: 300 }); this.tweens.add({targets: this.heroImage, alpha: 0.4, duration: 300}); this.tweens.add({ targets: this.demonImage, alpha: 0.4, duration: 300 }); this.showDeviceDialogue(text, res); });
            const sayHero = (text) => new Promise(res => { this.tweens.add({ targets: dimBg, alpha: 0.6, duration: 300 }); this.tweens.add({targets: this.heroImage, alpha: 1, duration: 300}); this.tweens.add({ targets: this.demonImage, alpha: 0.4, duration: 300 }); if (text === '「……」' || text === '「……。」' || text === '「…」') { this.heroImage.setTexture('hero_stand_silent'); } else { this.heroImage.setTexture('hero_stand'); } this.heroImage.setScale(750 / this.heroImage.width); this.heroImage.setY(100 + (this.heroImage.height * this.heroImage.scaleY) / 2); this.showDialogue('勇者', text, res); });
            const sayDemon = (text) => new Promise(res => { this.tweens.add({ targets: dimBg, alpha: 0.6, duration: 300 }); this.tweens.add({targets: this.heroImage, alpha: 0.4, duration: 300}); this.tweens.add({ targets: this.demonImage, alpha: 1, duration: 300 }); this.demonImage.setTexture('demon_lord_dying'); this.demonImage.setScale(750 / this.demonImage.width); this.demonImage.setY(100 + (this.demonImage.height * this.demonImage.scaleY) / 2); this.showDialogue('魔王', text, res); });
    """
    content = re.sub(defeat_block_old, defeat_block_new, content)

    # Defeat cleanup
    # targets: [dimBg, this.heroImage], alpha: 0, duration: 500,
    defeat_cleanup_old1 = r"targets: \[dimBg, this\.heroImage\], alpha: 0, duration: 500"
    defeat_cleanup_new1 = r"targets: [dimBg, this.heroImage, this.demonImage], alpha: 0, duration: 500"
    content = re.sub(defeat_cleanup_old1, defeat_cleanup_new1, content)
    
    # onComplete: () => { dimBg.destroy(); this.heroImage.destroy(); ...
    defeat_cleanup_old2 = r"onComplete: \(\) => \{ dimBg\.destroy\(\); this\.heroImage\.destroy\(\);"
    defeat_cleanup_new2 = r"onComplete: () => { dimBg.destroy(); this.heroImage.destroy(); if(this.demonImage) this.demonImage.destroy();"
    content = re.sub(defeat_cleanup_old2, defeat_cleanup_new2, content)

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

    print("Success! Patch applied.")

if __name__ == '__main__':
    patch()
