import re

def fix_hero_scale():
    filepath = 'src/scenes/BossScene.js'
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # We need to replace the logic inside the sayHero callbacks to also scale and reposition the image.
    old_logic = r"if \(text === '「……」' \|\| text === '「……。」' \|\| text === '「…」'\) \{ this\.heroImage\.setTexture\('hero_stand_silent'\); \} else \{ this\.heroImage\.setTexture\('hero_stand'\); \}"
    
    new_logic = """if (text === '「……」' || text === '「……。」' || text === '「…」') { 
      this.heroImage.setTexture('hero_stand_silent'); 
    } else { 
      this.heroImage.setTexture('hero_stand'); 
    }
    this.heroImage.setScale(750 / this.heroImage.width);
    this.heroImage.setY(100 + (this.heroImage.height * this.heroImage.scaleY) / 2);
    """
    
    new_content = re.sub(old_logic, new_logic.replace('\n', ' '), content)

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(new_content)
    
    print("Success. Modified sayHero functions to scale properly.")

if __name__ == '__main__':
    fix_hero_scale()
