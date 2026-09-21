# -*- coding: utf-8 -*-
import codecs
content = codecs.open('src/scenes/BossScene.js', 'r', 'utf-8').read().splitlines()

new_content = []
skip_mode = False
for line in content:
    if 'await localSayHero(\'「……魔王は……殺さなきゃ……エラーを消去……」\');' in line:
        skip_mode = True
        new_content.append(line)
        new_content.append('                          const localSayDemon = (text, tex=\'demon_lord_dying\') => new Promise(res => { this.tweens.add({ targets: dimBg, alpha: 0.6, duration: 300 }); if(this.heroImage) this.tweens.add({targets: this.heroImage, alpha: 0.4, duration: 300}); if(this.inunekoImage) this.tweens.add({targets: this.inunekoImage, alpha: 0.4, duration: 300}); if(this.demonImage) { this.tweens.add({targets: this.demonImage, alpha: 1, duration: 300}); this.demonImage.setTexture(tex); } this.showDialogue(\'魔王\', text, res); });')
        new_content.append('                          const localSayInuneko = (text, tex=\'inuneko_stand\') => new Promise(res => { this.tweens.add({ targets: dimBg, alpha: 0.6, duration: 300 }); if(this.heroImage) this.tweens.add({targets: this.heroImage, alpha: 0.4, duration: 300}); if(this.demonImage) this.tweens.add({targets: this.demonImage, alpha: 0.4, duration: 300}); if(this.inunekoImage) { this.tweens.add({targets: this.inunekoImage, alpha: 1, duration: 300}); this.inunekoImage.setTexture(tex); } this.showDialogue(\'犬猫☆すたー\', text, res); });')
        new_content.append('                          await localSayDemon(\'「……結局我々を殺さず、お前は何をしにきたんだ？あの法螺吹きにけしかけられて、わらわたちを滅ぼしに来たんだろう？」\');')
        continue
    
    if skip_mode:
        if 'await localSayDemon(\'「そうか……英断だな…。」\', \'demon_lord_normal\');' in line:
            skip_mode = False
            new_content.append(line)
        continue
    
    new_content.append(line)

content = new_content

new_content2 = []
skip_mode2 = False
for i, line in enumerate(content):
    if 'if (Kills === 0) {' in line and 'MOT.flags.killedDemonLord = true;' in content[i-2]:
        skip_mode2 = True
        new_content2.append(line)
        new_content2.append('                      ending(\'normal_unresistable\');')
        new_content2.append('                      return;')
        continue
    
    if skip_mode2:
        if 'ending(\'bad_puppet\');' in line:
            pass
        elif '}' in line and 'ending(\'bad_puppet\');' in content[i-1]:
            skip_mode2 = False
            new_content2.append(line)
        continue
    
    new_content2.append(line)

with codecs.open('src/scenes/BossScene.js', 'w', 'utf-8') as f:
    for line in new_content2:
        f.write(line + '\n')

