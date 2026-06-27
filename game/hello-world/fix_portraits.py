import re

def fix_boss_scene():
    with open('src/scenes/BossScene.js', 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 1. Combat player scale
    content = content.replace(".sprite(-100, 460, 'hero_stand_combat').setScale(1)", ".sprite(-100, 460, 'hero_stand_combat').setScale(1.5)")
    
    # 2. Revert heroImage block
    pattern_block = r"this\.heroImage = this\.add\.sprite\(300, (.*?), 'hero_stand_combat'\)\.play\('hero_combat_anim'\)\.setAlpha\(0\)\.setDepth\(90\);\s*if\(this\.textures\.exists\('hero_stand_combat'\)\) \{\s*this\.textures\.get\('hero_stand_combat'\)\.setFilter\(Phaser\.Textures\.FilterMode\.NEAREST\);\s*var hImgW = window\.HERO_COMBAT_FRAME_WIDTH;\s*var hImgH = window\.HERO_COMBAT_FRAME_HEIGHT;\s*var hScale = 750 / hImgW;\s*this\.heroImage\.setScale\(hScale\);\s*this\.heroImage\.setY\(100 \+ \(hImgH \* hScale\) / 2\);\s*(console\.log.*?;\\s*\} else \{\s*console\.log.*?;\\s*\})?\}"
    
    replacement_block = r"this.heroImage = this.add.image(300, \1, 'hero_stand').setAlpha(0).setDepth(90);\n            var hScale = 750 / this.heroImage.height;\n            this.heroImage.setScale(hScale);\n            this.heroImage.setY(100 + (this.heroImage.height * hScale) / 2);"
    
    content = re.sub(pattern_block, replacement_block, content, flags=re.DOTALL)
    
    # Restore blink logic in BossScene
    pattern_blink = r"// GIFアニメーション側にまばたき等が含まれているため、古い静止画用のまばたき演出は不要として削除"
    replacement_blink = r"// まばたき演出\n        const isHero = speaker && speaker.includes('勇者');\n        if (isHero && this.heroImage && this.heroImage.active) {\n          if (charIndex % 15 === 0 && text[charIndex - 1] !== ' ') {\n            this.heroImage.setTexture('hero_stand_blink');\n          } else if (charIndex % 15 === 5) {\n            this.heroImage.setTexture('hero_stand');\n          }\n        }"
    
    content = content.replace(pattern_blink, replacement_blink)
    
    with open('src/scenes/BossScene.js', 'w', encoding='utf-8') as f:
        f.write(content)

def fix_story_scene():
    with open('src/scenes/StoryScene.js', 'r', encoding='utf-8') as f:
        content = f.read()
    
    pattern_block = r"this\.heroImage = this\.add\.sprite\(300, h / 2, 'hero_stand_combat'\)\.play\('hero_combat_anim'\)\.setAlpha\(0\);\s*this\.textures\.get\('hero_stand_combat'\)\.setFilter\(Phaser\.Textures\.FilterMode\.NEAREST\);\s*var hImgW = window\.HERO_COMBAT_FRAME_WIDTH;\s*var hImgH = window\.HERO_COMBAT_FRAME_HEIGHT;\s*// ターゲット幅を広げてアップにする\s*var hScale = 750 / hImgW;\s*this\.heroImage\.setScale\(hScale\);\s*this\.heroImage\.setY\(100 \+ \(hImgH \* hScale\) / 2\);"
    replacement_block = r"this.heroImage = this.add.image(300, h / 2, 'hero_stand').setAlpha(0);\n    var hScale = 750 / this.heroImage.height;\n    this.heroImage.setScale(hScale);\n    this.heroImage.setY(100 + (this.heroImage.height * hScale) / 2);"
    content = re.sub(pattern_block, replacement_block, content, flags=re.DOTALL)
    
    # uncomment blink
    content = content.replace("// まばたき演出 (GIFアニメーション側に含まれているため削除)\n    /*\n", "// まばたき演出\n")
    content = content.replace("          this.heroImage.setTexture('hero_stand_combat');\n        }\n      });\n    }\n    */", "          this.heroImage.setTexture('hero_stand');\n        }\n      });\n    }")
    
    with open('src/scenes/StoryScene.js', 'w', encoding='utf-8') as f:
        f.write(content)

def fix_game_scene():
    with open('src/scenes/GameScene.js', 'r', encoding='utf-8') as f:
        content = f.read()
    content = content.replace(".setScale(1);", ".setScale(1.5);")
    with open('src/scenes/GameScene.js', 'w', encoding='utf-8') as f:
        f.write(content)

def fix_ending_scene():
    with open('src/scenes/EndingScene.js', 'r', encoding='utf-8') as f:
        content = f.read()
    
    pattern = r"var spriteKey = 'hero_stand_combat';\s*if \(ending\.key === 'END_ORPHAN'\) spriteKey = 'demon_lord'; // 魔王に拾われる\s*if \(ending\.key === 'NORMAL_EVERYDAY'\) spriteKey = 'hero_stand_combat';\s*if \(ending\.key === 'NORMAL_USELESS'\) spriteKey = 'hero_stand_combat';\s*if \(ending\.key === 'NORMAL_INESCAPABLE'\) spriteKey = 'hero_stand_combat';\s*var endSprite;\s*if \(spriteKey === 'hero_stand_combat'\) \{\s*endSprite = this\.add\.sprite\(w / 2, h \* 0\.78, spriteKey\)\.play\('hero_combat_anim'\)\.setScale\(4\)\.setAlpha\(0\);\s*\} else \{\s*endSprite = this\.add\.image\(w / 2, h \* 0\.78, spriteKey\)\.setScale\(4\)\.setAlpha\(0\);\s*\}"
    replacement = r"var spriteKey = 'player';\n    if (ending.key === 'END_ORPHAN') spriteKey = 'demon_lord'; // 魔王に拾われる\n    if (ending.key === 'NORMAL_EVERYDAY') spriteKey = 'player';\n    if (ending.key === 'NORMAL_USELESS') spriteKey = 'player';\n    if (ending.key === 'NORMAL_INESCAPABLE') spriteKey = 'player';\n\n    var endSprite = this.add.image(w / 2, h * 0.78, spriteKey).setScale(4).setAlpha(0);"
    
    content = re.sub(pattern, replacement, content, flags=re.DOTALL)
    with open('src/scenes/EndingScene.js', 'w', encoding='utf-8') as f:
        f.write(content)

fix_boss_scene()
fix_story_scene()
fix_game_scene()
fix_ending_scene()
