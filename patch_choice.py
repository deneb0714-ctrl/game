import sys
import codecs
import re

with codecs.open('src/scenes/BossScene.js', 'r', 'utf-8') as f:
    content = f.read()

# We need to replace the custom choice block.
# Let's find the start of Kills === 0 block where we inserted `await localSayHero('「……魔王は……殺さなきゃ……エラーを消去……」');`
# and replace everything up to the next `await sayDemon('「……結局我々を殺さず...`

start_marker = "await localSayHero('「……魔王は……殺さなきゃ……エラーを消去……」');"
end_marker = "await sayDemon('「……結局我々を殺さず、お前は何をしにきたんだ？あの法螺吹きにけしかけられて、わらわたちを滅ぼしに来たんだろう？」');"

start_idx = content.find(start_marker)
end_idx = content.find(end_marker, start_idx)

if start_idx != -1 and end_idx != -1:
    new_choice_logic = """await localSayHero('「……魔王は……殺さなきゃ……エラーを消去……」');

                          let downCount = 0;
                          while (downCount < 10) {
                              let c = await new Promise(res => {
                                  this.showChoice([
                                      { text: '1. 魔王を殺す', callback: () => { if(MOT.Audio.playSelect) MOT.Audio.playSelect(); res(1); } },
                                      { text: '2. 殺さない', callback: () => { if(MOT.Audio.playSelect) MOT.Audio.playSelect(); res(2); } }
                                  ]);
                              });
                              
                              if (c === 1) {
                                  // 1を選んだ場合は何もしない（強制的に2を選ばせる演出のため、エラー音を鳴らして戻すか、通常の攻撃に移るか）
                                  // 今回は2を連打させるため、1を選んでもエラーにして進行させない
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
                          
                          """
    
    content = content[:start_idx] + new_choice_logic + content[end_idx:]
    with codecs.open('src/scenes/BossScene.js', 'w', 'utf-8') as f:
        f.write(content)
    print("Successfully replaced custom choice UI with showChoice loop.")
else:
    print("Could not find markers for replacement.")
