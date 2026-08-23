import sys
import codecs
import re

with codecs.open('src/scenes/BossScene.js', 'r', 'utf-8') as f:
    content = f.read()

# We want to replace the first `await sayDemon('「……結局` and the choice right after it.
# Let's find the Kills === 0 block.
idx = content.find('} else if (Kills === 0) {')
if idx == -1:
    print("Could not find Kills === 0")
    sys.exit(1)

# Find the next await sayDemon
demon_idx = content.find("await sayDemon('「……結局", idx)

# Find the end of the old choice (up to the next await sayDemon)
next_demon_idx = content.find("await sayDemon('「そ", demon_idx)

if demon_idx != -1 and next_demon_idx != -1:
    new_choice_logic = """
                          const localSayDoctor = (text, tex='doctor_awaken_normal') => new Promise(res => {
                              if (!this.doctorImage || !this.doctorImage.active) {
                                  this.doctorImage = this.add.image(1920 - 300, 1080 / 2, tex).setAlpha(0).setDepth(90);
                              }
                              this.doctorImage.setTexture(tex);
                              this.textures.get(tex).setFilter(Phaser.Textures.FilterMode.LINEAR);
                              var docScale = 600 / (this.textures.get(tex).getSourceImage().width || 750);
                              this.doctorImage.setScale(docScale);
                              this.doctorImage.setY(100 + ((this.textures.get(tex).getSourceImage().height || 1000) * docScale) / 2);
                              
                              this.tweens.add({ targets: dimBg, alpha: 0.6, duration: 300 });
                              if(this.heroImage) this.tweens.add({targets: this.heroImage, alpha: 0.4, duration: 300});
                              if(this.demonImage) this.tweens.add({targets: this.demonImage, alpha: 0, duration: 300});
                              if(this.inunekoImage) this.tweens.add({targets: this.inunekoImage, alpha: 0, duration: 300});
                              if(this.doctorImage) this.tweens.add({targets: this.doctorImage, alpha: 1, duration: 300});
                              this.showDialogue('博士', text, res);
                          });
                          
                          const localSayHero = (text) => new Promise(res => {
                              this.tweens.add({ targets: dimBg, alpha: 0.6, duration: 300 });
                              if(this.heroImage) this.tweens.add({targets: this.heroImage, alpha: 1, duration: 300});
                              if(this.demonImage) this.tweens.add({targets: this.demonImage, alpha: 0, duration: 300});
                              if(this.inunekoImage) this.tweens.add({targets: this.inunekoImage, alpha: 0, duration: 300});
                              if(this.doctorImage) this.tweens.add({targets: this.doctorImage, alpha: 0.4, duration: 300});
                              this.showDialogue(MOT.flags.heroName || '勇者', text, res);
                          });

                          await localSayHero('「……魔王は……殺さなきゃ……エラーを消去……」');

                          let downCount = 0;
                          while (downCount < 10) {
                              let c = await new Promise(res => {
                                  this.showChoice([
                                      { text: '1. 魔王を殺す', callback: () => { if(MOT.Audio.playSelect) MOT.Audio.playSelect(); res(1); } },
                                      { text: '2. 殺さない', callback: () => { if(MOT.Audio.playSelect) MOT.Audio.playSelect(); res(2); } }
                                  ]);
                              });
                              
                              if (c === 1) {
                                  if(MOT.Audio.playError) MOT.Audio.playError();
                              } else {
                                  downCount++;
                                  if (downCount === 1) {
                                      if(MOT.Audio.playError) MOT.Audio.playError();
                                      await localSayDoctor('「お前はさっきから、ろくな選択をしない。」', 'doctor_stand');
                                      await localSayDoctor('「さぁ、魔王を殺すんだ。」', 'doctor_stand');
                                  } else if (downCount >= 10) {
                                      await localSayHero('「……それでも僕は、殺したくない……！！」');
                                      break;
                                  } else {
                                      if(MOT.Audio.playError) MOT.Audio.playError();
                                  }
                              }
                          }

                          await sayDemon('「……結局我々を殺さず、お前は何をしにきたんだ？あの法螺吹きにけしかけられて、わらわたちを滅ぼしに来たんだろう？」');
                          
                          """
    content = content[:demon_idx] + new_choice_logic + content[next_demon_idx:]
    with codecs.open('src/scenes/BossScene.js', 'w', 'utf-8') as f:
        f.write(content)
    print("Successfully replaced choice UI.")
else:
    print("Could not find markers.", demon_idx, next_demon_idx)
