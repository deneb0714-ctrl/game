import re

def fix():
    filepath = 'src/scenes/BossScene.js'
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Remove the texture switching from sayDemon in playDemonLordIntro and onBossDefeated
    old_sayDemon_intro = """if (text === '「……」' || text === '「……。」' || text === '「…」' || text.includes('……まあよい')) {
          this.demonImage.setTexture('demon_lord_silent');
        } else {
          this.demonImage.setTexture('demon_lord_normal');
        }"""
    content = content.replace(old_sayDemon_intro, "this.demonImage.setTexture('demon_lord_normal');")
    
    # Actually wait, in onBossDefeated, it sets demon_lord_dying. I shouldn't mess with that, it's correct.
    # So I just need to remove the silent logic from the first sayDemon.
    
    # 2. Add blink logic for Demon Lord in showDialogue
    old_blink = """        // まばたき演出
        const isHero = speaker && speaker.includes('勇者');
        if (isHero && this.heroImage && this.heroImage.active) {
          if (charIndex % 15 === 0 && text[charIndex - 1] !== ' ') {
            this.heroImage.setTexture('hero_stand_blink');
          } else if (charIndex % 15 === 5) {
            this.heroImage.setTexture('hero_stand');
          }
        }"""
        
    new_blink = """        // まばたき演出
        const isHero = speaker && speaker.includes('勇者');
        if (isHero && this.heroImage && this.heroImage.active) {
          if (charIndex % 15 === 0 && text[charIndex - 1] !== ' ') {
            // Silence state check
            if (this.heroImage.texture.key !== 'hero_stand_silent') {
              this.heroImage.setTexture('hero_stand_blink');
            }
          } else if (charIndex % 15 === 5) {
            if (this.heroImage.texture.key === 'hero_stand_blink') {
              this.heroImage.setTexture('hero_stand');
            }
          }
        }

        const isDemon = speaker && speaker.includes('魔王');
        if (isDemon && this.demonImage && this.demonImage.active) {
          if (charIndex % 15 === 0 && text[charIndex - 1] !== ' ') {
            if (this.demonImage.texture.key !== 'demon_lord_dying') {
              this.demonImage.setTexture('demon_lord_silent');
            }
          } else if (charIndex % 15 === 5) {
            if (this.demonImage.texture.key === 'demon_lord_silent') {
              this.demonImage.setTexture('demon_lord_normal');
            }
          }
        }"""
    
    content = content.replace(old_blink, new_blink)
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print("Success! Demon Lord blink fixed.")

if __name__ == '__main__':
    fix()
