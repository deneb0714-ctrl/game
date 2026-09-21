import os

def replace_exact(filepath, old_str, new_str):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    if old_str in content:
        content = content.replace(old_str, new_str)
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
    else:
        print(f"WARNING: old_str not found in {filepath}")

def fix_game_scene():
    old = "this.player.setScale(1);"
    new = "this.player.setScale(1.5);"
    replace_exact('src/scenes/GameScene.js', old, new)

def fix_boss_scene():
    replace_exact('src/scenes/BossScene.js', "this.player = this.physics.add.sprite(-100, 460, 'hero_stand_combat').setScale(1).setDepth(10);", "this.player = this.physics.add.sprite(-100, 460, 'hero_stand_combat').setScale(1.5).setDepth(10);")
    
    # BossScene heroImage blocks - there are 5 identical or similar blocks
    # Block 1 (Intro)
    b1_old = """             this.heroImage = this.add.sprite(300, h / 2, 'hero_stand_combat').play('hero_combat_anim').setAlpha(0).setDepth(90);
             if(this.textures.exists('hero_stand_combat')) {
                 this.textures.get('hero_stand_combat').setFilter(Phaser.Textures.FilterMode.NEAREST);
                 var hImgW = window.HERO_COMBAT_FRAME_WIDTH;
                 var hImgH = window.HERO_COMBAT_FRAME_HEIGHT;
                 var hScale = 750 / hImgW;
                 this.heroImage.setScale(hScale);
                 this.heroImage.setY(100 + (hImgH * hScale) / 2);
                 console.log("DEBUG: hImgW=" + hImgW + ", hScale=" + hScale + ", spriteW=" + this.heroImage.width + ", textureW=" + this.textures.get('hero_stand_combat').getSourceImage().width);
             }"""
    b1_new = """             this.heroImage = this.add.image(300, h / 2, 'hero_stand').setAlpha(0).setDepth(90);
             var hScale = 750 / this.heroImage.height;
             this.heroImage.setScale(hScale);
             this.heroImage.setY(100 + (this.heroImage.height * hScale) / 2);"""
    replace_exact('src/scenes/BossScene.js', b1_old, b1_new)

    # Block 2 (Demon Lord Intro)
    b2_old = """    this.heroImage = this.add.sprite(300, 1080 / 2, 'hero_stand_combat').play('hero_combat_anim').setAlpha(0).setDepth(90);
    if(this.textures.exists('hero_stand_combat')) {
        this.textures.get('hero_stand_combat').setFilter(Phaser.Textures.FilterMode.NEAREST);
        var hImgW = window.HERO_COMBAT_FRAME_WIDTH;
        var hImgH = window.HERO_COMBAT_FRAME_HEIGHT;
        var hScale = 750 / hImgW;
        this.heroImage.setScale(hScale);
        this.heroImage.setY(100 + (hImgH * hScale) / 2);
    }"""
    b2_new = """    this.heroImage = this.add.image(300, 1080 / 2, 'hero_stand').setAlpha(0).setDepth(90);
    var hScale = 750 / this.heroImage.height;
    this.heroImage.setScale(hScale);
    this.heroImage.setY(100 + (this.heroImage.height * hScale) / 2);"""
    replace_exact('src/scenes/BossScene.js', b2_old, b2_new)

    # Block 3 (Hero Intro)
    b3_old = """    this.heroImage = this.add.sprite(300, h / 2, 'hero_stand_combat').play('hero_combat_anim').setAlpha(0).setDepth(90);
    if(this.textures.exists('hero_stand_combat')) {
        this.textures.get('hero_stand_combat').setFilter(Phaser.Textures.FilterMode.NEAREST);
        var hImgW = window.HERO_COMBAT_FRAME_WIDTH;
        var hImgH = window.HERO_COMBAT_FRAME_HEIGHT;
        var hScale = 750 / hImgW;
        this.heroImage.setScale(hScale);
        this.heroImage.setY(100 + (hImgH * hScale) / 2);
        // クロップ処理は不要なため削除
    }"""
    b3_new = """    this.heroImage = this.add.image(300, h / 2, 'hero_stand').setAlpha(0).setDepth(90);
    var hScale = 750 / this.heroImage.height;
    this.heroImage.setScale(hScale);
    this.heroImage.setY(100 + (this.heroImage.height * hScale) / 2);"""
    replace_exact('src/scenes/BossScene.js', b3_old, b3_new)

    # Block 4 (Twins Intro)
    b4_old = """            this.heroImage = this.add.sprite(300, h / 2, 'hero_stand_combat').play('hero_combat_anim').setAlpha(0).setDepth(90);
            if(this.textures.exists('hero_stand_combat')) {
                this.textures.get('hero_stand_combat').setFilter(Phaser.Textures.FilterMode.NEAREST);
                var hImgW = window.HERO_COMBAT_FRAME_WIDTH;
                var hImgH = window.HERO_COMBAT_FRAME_HEIGHT;
                var hScale = 750 / hImgW;
                this.heroImage.setScale(hScale);
                this.heroImage.setY(100 + (hImgH * hScale) / 2);
            }"""
    b4_new = """            this.heroImage = this.add.image(300, h / 2, 'hero_stand').setAlpha(0).setDepth(90);
            var hScale = 750 / this.heroImage.height;
            this.heroImage.setScale(hScale);
            this.heroImage.setY(100 + (this.heroImage.height * hScale) / 2);"""
    replace_exact('src/scenes/BossScene.js', b4_old, b4_new)

    # Block 5 (Doctor Defeat 1)
    b5_old = """          this.heroImage = this.add.sprite(300, h / 2, 'hero_stand_combat').play('hero_combat_anim').setAlpha(0).setDepth(90);
          if(this.textures.exists('hero_stand_combat')) {
              this.textures.get('hero_stand_combat').setFilter(Phaser.Textures.FilterMode.NEAREST);
              var hImgW = window.HERO_COMBAT_FRAME_WIDTH;
              var hImgH = window.HERO_COMBAT_FRAME_HEIGHT;
              var hScale = 750 / hImgW;
              this.heroImage.setScale(hScale);
              this.heroImage.setY(100 + (hImgH * hScale) / 2);
          }"""
    b5_new = """          this.heroImage = this.add.image(300, h / 2, 'hero_stand').setAlpha(0).setDepth(90);
          var hScale = 750 / this.heroImage.height;
          this.heroImage.setScale(hScale);
          this.heroImage.setY(100 + (this.heroImage.height * hScale) / 2);"""
    replace_exact('src/scenes/BossScene.js', b5_old, b5_new)

    # Block 6 (Doctor Defeat 2)
    b6_old = """        this.heroImage = this.add.sprite(300, h / 2, 'hero_stand_combat').play('hero_combat_anim').setAlpha(0).setDepth(90);
        if(this.textures.exists('hero_stand_combat')) {
            this.textures.get('hero_stand_combat').setFilter(Phaser.Textures.FilterMode.NEAREST);
            var hImgW = window.HERO_COMBAT_FRAME_WIDTH;
            var hImgH = window.HERO_COMBAT_FRAME_HEIGHT;
            var hScale = 750 / hImgW;
            this.heroImage.setScale(hScale);
            this.heroImage.setY(100 + (hImgH * hScale) / 2);
        }"""
    b6_new = """        this.heroImage = this.add.image(300, h / 2, 'hero_stand').setAlpha(0).setDepth(90);
        var hScale = 750 / this.heroImage.height;
        this.heroImage.setScale(hScale);
        this.heroImage.setY(100 + (this.heroImage.height * hScale) / 2);"""
    replace_exact('src/scenes/BossScene.js', b6_old, b6_new)

    # BossScene Blink
    blink_old = """        // GIFアニメーション側にまばたき等が含まれているため、古い静止画用のまばたき演出は不要として削除"""
    blink_new = """        // まばたき演出
        const isHero = speaker && speaker.includes('勇者');
        if (isHero && this.heroImage && this.heroImage.active) {
          if (charIndex % 15 === 0 && text[charIndex - 1] !== ' ') {
            this.heroImage.setTexture('hero_stand_blink');
          } else if (charIndex % 15 === 5) {
            this.heroImage.setTexture('hero_stand');
          }
        }"""
    replace_exact('src/scenes/BossScene.js', blink_old, blink_new)


def fix_story_scene():
    sb_old = """    this.heroImage = this.add.sprite(300, h / 2, 'hero_stand_combat').play('hero_combat_anim').setAlpha(0);
    this.textures.get('hero_stand_combat').setFilter(Phaser.Textures.FilterMode.NEAREST);
    var hImgW = window.HERO_COMBAT_FRAME_WIDTH;
    var hImgH = window.HERO_COMBAT_FRAME_HEIGHT;
    
    // ターゲット幅を広げてアップにする
    var hScale = 750 / hImgW;
    this.heroImage.setScale(hScale);
    this.heroImage.setY(100 + (hImgH * hScale) / 2);"""
    sb_new = """    this.heroImage = this.add.image(300, h / 2, 'hero_stand').setAlpha(0);
    var hScale = 750 / this.heroImage.height;
    this.heroImage.setScale(hScale);
    this.heroImage.setY(100 + (this.heroImage.height * hScale) / 2);"""
    replace_exact('src/scenes/StoryScene.js', sb_old, sb_new)

    sb_blink_old = """    // まばたき演出 (GIFアニメーション側に含まれているため削除)
    /*
    const isHero = data.speaker && data.speaker.includes('勇者');
    if (isHero && this.heroImage && this.heroImage.active) {
      this.heroImage.setTexture('hero_stand_blink');
      this.time.delayedCall(150, () => {
        if (this.heroImage && this.heroImage.active) {
          this.heroImage.setTexture('hero_stand_combat');
        }
      });
    }
    */"""
    sb_blink_new = """    // まばたき演出 (勇者のセリフが切り替わるときのみ)
    const isHero = data.speaker && data.speaker.includes('勇者');
    if (isHero && this.heroImage && this.heroImage.active) {
      this.heroImage.setTexture('hero_stand_blink');
      this.time.delayedCall(150, () => {
        if (this.heroImage && this.heroImage.active) {
          this.heroImage.setTexture('hero_stand');
        }
      });
    }"""
    replace_exact('src/scenes/StoryScene.js', sb_blink_old, sb_blink_new)


def fix_ending_scene():
    end_old = """    var spriteKey = 'hero_stand_combat';
    if (ending.key === 'END_ORPHAN') spriteKey = 'demon_lord'; // 魔王に拾われる
    if (ending.key === 'NORMAL_EVERYDAY') spriteKey = 'hero_stand_combat';
    if (ending.key === 'NORMAL_USELESS') spriteKey = 'hero_stand_combat';
    if (ending.key === 'NORMAL_INESCAPABLE') spriteKey = 'hero_stand_combat';

    var endSprite;
    if (spriteKey === 'hero_stand_combat') {
      endSprite = this.add.sprite(w / 2, h * 0.78, spriteKey).play('hero_combat_anim').setScale(4).setAlpha(0);
    } else {
      endSprite = this.add.image(w / 2, h * 0.78, spriteKey).setScale(4).setAlpha(0);
    }"""
    end_new = """    var spriteKey = 'player';
    if (ending.key === 'END_ORPHAN') spriteKey = 'demon_lord'; // 魔王に拾われる
    if (ending.key === 'NORMAL_EVERYDAY') spriteKey = 'player';
    if (ending.key === 'NORMAL_USELESS') spriteKey = 'player';
    if (ending.key === 'NORMAL_INESCAPABLE') spriteKey = 'player';

    var endSprite = this.add.image(w / 2, h * 0.78, spriteKey).setScale(4).setAlpha(0);"""
    replace_exact('src/scenes/EndingScene.js', end_old, end_new)


if __name__ == '__main__':
    fix_game_scene()
    fix_boss_scene()
    fix_story_scene()
    fix_ending_scene()
