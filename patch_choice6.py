import codecs
import re

content = codecs.open('src/scenes/BossScene.js', 'r', 'utf-8').read()

pattern = re.compile(
    r'let c = await askShatterChoice\(\'1\. 殺す\', \'2\. 殺さない\', true\);\s*if \(c === 1\) \{\s*ending\(\'normal_unresistable\'\);\s*return;\s*\}',
    re.DOTALL
)

new_choice_logic = """let downCount = 0;
                          while (downCount < 10) {
                              let c = await askShatterChoice('1. 殺す', '2. 殺さない', true);
                              
                              if (c === 1) {
                                  ending('normal_unresistable');
                                  return;
                              } else {
                                  downCount++;
                                  if (downCount === 1) {
                                      if(MOT.Audio.playError) MOT.Audio.playError();
                                      await localSayDoctor('「……お前は、無駄な選択を……」', 'doctor_stand');
                                      await localSayDoctor('「……殺すんだ。」', 'doctor_stand');
                                  } else if (downCount >= 10) {
                                      await localSayHero('「……それでも私は、殺さない……！！」');
                                      break;
                                  } else {
                                      if(MOT.Audio.playError) MOT.Audio.playError();
                                  }
                              }
                          }"""

content = pattern.sub(new_choice_logic, content)

with codecs.open('src/scenes/BossScene.js', 'w', 'utf-8') as f:
    f.write(content)
print("Doctor interference restored.")
