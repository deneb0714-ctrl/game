import re

def fix_all_boss():
    with open('src/scenes/BossScene.js', 'r', encoding='utf-8') as f:
        code = f.read()

    # Find ALL instances of this.heroImage = ...
    # And replace them with:
    # this.heroImage = this.add.image(300, 1080 / 2, 'hero_stand').setAlpha(0).setDepth(90);
    # var hScale = 750 / this.heroImage.height;
    # this.heroImage.setScale(hScale);
    # this.heroImage.setY(100 + (this.heroImage.height * hScale) / 2);

    # The block looks like:
    # this.heroImage = this.add.sprite(300, h / 2, 'hero_stand_combat').play('hero_combat_anim').setAlpha(0).setDepth(90);
    # if(this.textures.exists('hero_stand_combat')) { ... }
    
    pattern = r"this\.heroImage\s*=\s*this\.add\.(?:sprite|image)\(300,\s*[^,]+,\s*'(?:hero_stand_combat|hero_stand)'\)(?:\.play\([^)]+\))?\.setAlpha\(0\)\.setDepth\(90\);.*?(?:this\.heroImage\.setY\([^)]+\);|\})"
    
    replacement = r"""this.heroImage = this.add.image(300, 1080 / 2, 'hero_stand').setAlpha(0).setDepth(90);
            var hScale = 750 / this.heroImage.height;
            this.heroImage.setScale(hScale);
            this.heroImage.setY(100 + (this.heroImage.height * hScale) / 2);"""
            
    code = re.sub(pattern, replacement, code, flags=re.DOTALL)
    
    with open('src/scenes/BossScene.js', 'w', encoding='utf-8') as f:
        f.write(code)

fix_all_boss()
