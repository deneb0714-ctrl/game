import sys
import codecs

# Read BossScene.js
with codecs.open('src/scenes/BossScene.js', 'r', 'utf-8') as f:
    content = f.read()

# 1. Custom Choice UI logic
custom_choice_logic = """
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

                          await new Promise(res => {
                              const w = 1920, h = 1080;
                              const overlay = this.add.graphics();
                              overlay.fillStyle(0x000000, 0.5);
                              overlay.fillRect(0, 0, w, h);
                              overlay.setDepth(200000).setScrollFactor(0);

                              const btn1 = this.add.image(w / 2, h / 2 - 20, 'ui_button_wide').setInteractive({ useHandCursor: true }).setDepth(200002).setScrollFactor(0);
                              const txt1 = this.add.text(w / 2, h / 2 - 20, '1. 魔王を殺す', { fontFamily: '"DotGothic16"', fontSize: '26px', color: '#fff' }).setOrigin(0.5).setDepth(200003).setScrollFactor(0);
                              
                              const btn2 = this.add.image(w / 2, h / 2 + 90, 'ui_button_wide').setInteractive({ useHandCursor: true }).setDepth(200002).setScrollFactor(0);
                              const txt2 = this.add.text(w / 2, h / 2 + 90, '2. 殺さない', { fontFamily: '"DotGothic16"', fontSize: '26px', color: '#fff' }).setOrigin(0.5).setDepth(200003).setScrollFactor(0);

                              btn1.setTint(0x4FD1FF);
                              btn2.clearTint();

                              let downCount = 0;
                              let doctorInterrupted = false;
                              let lockBroken = false;

                              const cleanup = () => {
                                  overlay.destroy(); btn1.destroy(); txt1.destroy(); btn2.destroy(); txt2.destroy();
                                  this.input.keyboard.off('keydown', keyHandler);
                              };

                              const attemptDown = async () => {
                                  if (doctorInterrupted) return;
                                  if (lockBroken) {
                                      btn1.clearTint(); btn2.setTint(0x4FD1FF);
                                      if(MOT.Audio.playSelect) MOT.Audio.playSelect();
                                  } else {
                                      downCount++;
                                      if (downCount === 1) {
                                          doctorInterrupted = true;
                                          if(MOT.Audio.playError) MOT.Audio.playError();
                                          await localSayDoctor('「お前はさっきから、ろくな選択をしない。」', 'doctor_stand');
                                          await localSayDoctor('「さぁ、魔王を殺すんだ。」', 'doctor_stand');
                                          doctorInterrupted = false;
                                      } else if (downCount >= 10) {
                                          lockBroken = true;
                                          doctorInterrupted = true;
                                          await localSayHero('「……それでも僕は、殺したくない……！！」');
                                          btn1.clearTint(); btn2.setTint(0x4FD1FF);
                                          if(MOT.Audio.playSelect) MOT.Audio.playSelect();
                                          doctorInterrupted = false;
                                      } else {
                                          if(MOT.Audio.playError) MOT.Audio.playError();
                                      }
                                  }
                              };

                              const keyHandler = async (e) => {
                                  if (doctorInterrupted) return;
                                  if (e.code === 'KeyS' || e.code === 'ArrowDown') {
                                      attemptDown();
                                  } else if (e.code === 'KeyW' || e.code === 'ArrowUp') {
                                      if (lockBroken) {
                                          btn2.clearTint(); btn1.setTint(0x4FD1FF);
                                          if(MOT.Audio.playSelect) MOT.Audio.playSelect();
                                      }
                                  } else if (e.code === 'Enter' || e.code === 'Space' || e.code === 'KeyZ') {
                                      if (btn2.isTinted) {
                                          if(MOT.Audio.playSelect) MOT.Audio.playSelect();
                                          cleanup();
                                          res(2);
                                      } else if (btn1.isTinted) {
                                          // Normal Kill logic? Or just ignore? We will just let them select it and maybe end the game if they actually do.
                                          if(MOT.Audio.playSelect) MOT.Audio.playSelect();
                                          cleanup();
                                          res(1);
                                      }
                                  }
                              };

                              btn2.on('pointerdown', attemptDown);
                              btn1.on('pointerdown', () => { if(lockBroken) { btn2.clearTint(); btn1.setTint(0x4FD1FF); } });
                              
                              this.input.keyboard.on('keydown', keyHandler);
                          });
"""

original_kills_0_start = """                      } else if (Kills === 0) {
                          if (this.heroImage) {
                              this.heroImage.setTexture('hero_stand');
                              this.heroImage.setScale(750 / this.heroImage.width);
                              this.heroImage.setY(100 + (this.heroImage.height * this.heroImage.scaleY) / 2);
                          }
                          await sayDemon('「……結局我々を殺さず、お前は何をしにきたんだ？あの法螺吹きにけしかけられて、わらわたちを滅ぼしに来たんだろう？」');"""

new_kills_0_start = """                      } else if (Kills === 0) {
                          if (this.heroImage) {
                              this.heroImage.setTexture('hero_stand');
                              this.heroImage.setScale(750 / this.heroImage.width);
                              this.heroImage.setY(100 + (this.heroImage.height * this.heroImage.scaleY) / 2);
                          }
                          
""" + custom_choice_logic + """
                          
                          await sayDemon('「……結局我々を殺さず、お前は何をしにきたんだ？あの法螺吹きにけしかけられて、わらわたちを滅ぼしに来たんだろう？」');"""

content = content.replace(original_kills_0_start, new_kills_0_start)

# 2. Update the dialogue in the Pre-Boss 4 sequence
original_pre_boss4 = """                          await sayDemon('「そうか……英断だな…。」');
                          await sayDemon('「そしてここから話すのは、信じるも信じないもお前の自由だ。」');
                          await sayDemon('「お前は、あいつに”魔王が世界を滅ぼそうとしている”とでも言われたのだろう？だが、残念なことに、それはわらわたちを滅ぼすための方便にすぎぬ。」');
                          await sayDemon('「あいつはこの世界に人間以上の存在がいることが許せないのだ。わらわはやつに襲われていた魔族を保護し、あいつとながい間戦ってきた。」');
                          await sayDemon('「ながい、ながい戦いだった。……やつは気の毒な奴じゃ。だが、それはわらわたちを滅ぼす理由にはならない。」');
                          
                          if (!this.doctorImage || !this.doctorImage.active) {
                              this.doctorImage = this.add.image(1920 - 300, 1080 / 2, 'doctor_awaken_smile').setAlpha(0).setDepth(90);
                          } else {
                              this.doctorImage.setTexture('doctor_awaken_smile');
                          }
                          this.textures.get('doctor_awaken_smile').setFilter(Phaser.Textures.FilterMode.LINEAR);
                          var docScale = 600 / (this.textures.get('doctor_awaken_smile').getSourceImage().width || 750);
                          this.doctorImage.setScale(docScale);
                          this.doctorImage.setY(100 + ((this.textures.get('doctor_awaken_smile').getSourceImage().height || 1000) * docScale) / 2);

                          const localSayDoctor = (text, tex='doctor_awaken_smile') => new Promise(res => {
                              this.doctorImage.setTexture(tex);
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
                              this.showDialogue('勇者', text, res);
                          });
                          
                          const localSayDemon = (text) => new Promise(res => {
                              this.tweens.add({ targets: dimBg, alpha: 0.6, duration: 300 });
                              if(this.heroImage) this.tweens.add({targets: this.heroImage, alpha: 0.4, duration: 300});
                              if(this.demonImage) this.tweens.add({targets: this.demonImage, alpha: 1, duration: 300});
                              if(this.inunekoImage) this.tweens.add({targets: this.inunekoImage, alpha: 0.4, duration: 300});
                              if(this.doctorImage) this.tweens.add({targets: this.doctorImage, alpha: 0, duration: 300});
                              this.showDialogue('魔王', text, res);
                          });
                          
                          const localSayInuneko = (text) => new Promise(res => {
                              this.tweens.add({ targets: dimBg, alpha: 0.6, duration: 300 });
                              if(this.heroImage) this.tweens.add({targets: this.heroImage, alpha: 0.4, duration: 300});
                              if(this.demonImage) this.tweens.add({targets: this.demonImage, alpha: 0.4, duration: 300});
                              if(this.inunekoImage) this.tweens.add({targets: this.inunekoImage, alpha: 1, duration: 300});
                              if(this.doctorImage) this.tweens.add({targets: this.doctorImage, alpha: 0, duration: 300});
                              this.showDialogue('犬猫☆スター', text, res);
                          });

                          await localSayDoctor('「…はははは。すべて話されてしまったみたいだな」');
                          await localSayHero('「！」');
                          await localSayHero('「僕は……ずっとあなたに嘘をつかれていたんだね。」');
                          await localSayDoctor('「嘘？違うな、そいつらを殺せば平和な世界が訪れる。」');
                          await localSayDoctor('「私にとってな。」');
                          await localSayHero('「でもそれは、あなた以外にとって最悪の世界そのもの。」');
                          await localSayDoctor('「そうだな。しかしそれがどうした？自分の望む世界を目指すのは普通のことだろう？」');
                          await localSayDoctor('「それと、魔族に恐怖し、滅んでほしいと願う人間はごまんといる。そいつらにとっても、いい世界となるだろう？」');
                          
                          await localSayDemon('「わらわたちはただ生きているだけだ！むやみに人を傷つけたりせん！」');
                          await localSayInuneko('「そうわん！魔王様は、お前とは違って優しいにゃん！！」');
                          
                          await localSayHero('「僕は今までの敵と戦ってきて、皆が魔王のために命を賭して戦ってきたのを見た。」');
                          await localSayHero('「沢山の人に慕われている魔王が、悪人だと思えない」');
                          
                          await localSayDoctor('「……面白い。ただの人形であるはずのお前が、そんな感情を持つなんてな。」');
                          await localSayHero('「人形…？」');
                          await localSayDoctor('「そうだ。お前は、勇者でもなんでもない。ただの兵器だよ。だからこそ、命令を下し、ただ魔王を殺すだけの存在になるはずだった。」');
                          await localSayHero('「でも、僕はみんなを殺したくないと思った。」');
                          await localSayHero('「みんな、魔王を殺しに来ているはずの僕も殺そうとしなかった。」');
                          await localSayHero('「僕は知った。魔族は悪い奴じゃないって。みんなを殺そうとしているあなたこそ、この世界の悪だ！！！」');
                          await localSayHero('「だからもう、あなたに従ったりはしない」');
                          
                          await localSayDoctor('「私が何度殺せと指示をし、選択権を奪ってもお前は最後まで従わなかった。」');
                          await localSayDoctor('「最初から可笑しかった。お前は自分が勇者と認識したら、何も聞かず、ただ戦いに行くはずだった。」');
                          await localSayDoctor('「お前はどうだ？勇者と呼びかけた私に対し、誰だと聞いた。ただ起動に時間がかかっているだけかと思ったが、その時には既に組み換えられていたんだな。」');
                          
                          await localSayHero('「違う！僕の考えは、決められたものなんかじゃない」');
                          await localSayDoctor('「本当にそう思っているのか？」');
                          
                          await localSayDoctor('「もっとも、お前が誰に操られていようが、何を選ぼうが、もう関係ない。私の準備はすべて整った。」');
                          await localSayDoctor('「これまで集めたデータ、幾度となく繰り返した実験。すべて申し分ない。」');
                          await localSayDoctor('「私は、今この瞬間のためにだけ動いてきた！」');
                          
                          await localSayDemon('「なんだ？！」');
                          await localSayInuneko('「にゃわわ！？」');
                          
                          await localSayDoctor('「さぁ、最終決戦といこうじゃないか！」', 'doctor_awaken_straight_weapon');"""

new_pre_boss4 = """                          const localSayDemon = (text, tex='demon_lord_normal') => new Promise(res => {
                              if (this.demonImage) this.demonImage.setTexture(tex);
                              this.tweens.add({ targets: dimBg, alpha: 0.6, duration: 300 });
                              if(this.heroImage) this.tweens.add({targets: this.heroImage, alpha: 0.4, duration: 300});
                              if(this.demonImage) this.tweens.add({targets: this.demonImage, alpha: 1, duration: 300});
                              if(this.inunekoImage) this.tweens.add({targets: this.inunekoImage, alpha: 0.4, duration: 300});
                              if(this.doctorImage) this.tweens.add({targets: this.doctorImage, alpha: 0, duration: 300});
                              this.showDialogue('魔王', text, res);
                          });
                          
                          const localSayInuneko = (text, tex='inuneko_stand') => new Promise(res => {
                              if (this.inunekoImage) this.inunekoImage.setTexture(tex);
                              this.tweens.add({ targets: dimBg, alpha: 0.6, duration: 300 });
                              if(this.heroImage) this.tweens.add({targets: this.heroImage, alpha: 0.4, duration: 300});
                              if(this.demonImage) this.tweens.add({targets: this.demonImage, alpha: 0.4, duration: 300});
                              if(this.inunekoImage) this.tweens.add({targets: this.inunekoImage, alpha: 1, duration: 300});
                              if(this.doctorImage) this.tweens.add({targets: this.doctorImage, alpha: 0, duration: 300});
                              this.showDialogue('犬猫☆スター', text, res);
                          });

                          await localSayDemon('「そうか……英断だな…。」');
                          await localSayDemon('「そしてここから話すのは、信じるも信じないもお前の自由だ。」');
                          await localSayDemon('「お前は、あいつに”魔王が世界を滅ぼそうとしている”とでも言われたのだろう？だが、残念なことに、それはわらわたちを滅ぼすための方便にすぎぬ。」');
                          await localSayDemon('「あいつはこの世界に人間以上の存在がいることが許せないのだ。わらわはやつに襲われていた魔族を保護し、あいつとながい間戦ってきた。」');
                          await localSayDemon('「ながい、ながい戦いだった。……やつは気の毒な奴じゃ。だが、それはわらわたちを滅ぼす理由にはならない。」');
                          
                          await localSayDoctor('「…はははは。すべて話されてしまったみたいだな」', 'doctor_awaken_smile');
                          await localSayHero('「！」');
                          await localSayHero('「僕は……ずっとあなたに嘘をつかれていたんだね。」');
                          await localSayDoctor('「嘘？違うな、そいつらを殺せば平和な世界が訪れる。」');
                          await localSayDoctor('「私にとってな。」');
                          await localSayHero('「それでみんなを殺すだなんて、身勝手じゃないか。」');
                          await localSayDoctor('「そうだな。しかしそれがどうした？自分の望む世界を目指すのは普通のことだろう？」');
                          await localSayDoctor('「それに、私だけじゃない。魔族に恐怖し、滅んでほしいと願う人間はごまんといる。そいつらにとっても、いい世界となるんだ。」');
                          
                          await localSayDemon('「わらわたちはただ生きているだけだ！むやみに人を傷つけたことなど、一度もない！」');
                          await localSayInuneko('「そうわん！魔王様は、お前とは違って優しいにゃん！！」');
                          
                          await localSayHero('「僕はみんなを殺したくないと思った。」');
                          await localSayHero('「だって、みんな、魔王を殺しに来ているはずの僕も殺そうとしなかった。」');
                          await localSayHero('「僕は知った。魔族は悪い奴じゃないって。みんなを殺そうとしているあなたこそ、この世界の悪だ！！！」');
                          await localSayHero('「だからもう、あなたに従ったりはしない。」');
                          
                          await localSayDoctor('「……面白い。ただ創られた存在であるはずのお前が、そんな感情を持つなんてな。」');
                          await localSayHero('「創られた…？」');
                          await localSayDoctor('「そうだ。お前は、勇者でもなんでもない。ただの兵器だ。」');
                          await localSayDoctor('「しかし、私が何度殺せと指示をし、選択権を奪ってもなお、お前は最後まで従わなかった。」');
                          await localSayDoctor('「……思えば、最初からおかしかった。前を創るとき、感情や思考力といったものは組み込んでいなかった。だから、お前は自分を”勇者”と認識したら、何も聞かず、ただ黙って戦いに行くはずだった。」');
                          await localSayDoctor('「だが、勇者と呼びかけた私に対し、誰だと聞いた。起動に時間がかかっているだけかと思ったが、その時には既に組み換えられていたんだな。」');
                          
                          await localSayHero('「違う！僕の考えは、創られたものじゃない！」');
                          await localSayDoctor('「本当にそう思っているのか？」');
                          await localSayHero('「……。」');
                          await localSayDoctor('「お前も気が付いているのだろう？自分の中にいる存在を。」');
                          await localSayHero('「……それでも僕は、これが僕自身の選択だって信じたい。」');
                          await localSayHero('「この感情は、もう一つの存在に教わったんだ。」');
                          
                          await localSayDoctor('「もっとも、お前が誰に操られていようが、そして何を選ぼうとも、もう関係ない。これまで集めたデータ、幾度となく繰り返した実験、そしてお前のデータ。これにより私の準備はすべて整った！！」');
                          
                          this.cameras.main.shake(1000, 0.02);
                          
                          await localSayDemon('「なんだ？！」', 'demon_lord_shock');
                          await localSayInuneko('「にゃわわ！？」', 'inuneko_blink');
                          
                          await localSayDoctor('「さぁ、最終決戦といこうじゃないか！」', 'doctor_awaken_smile_weapon');"""

content = content.replace(original_pre_boss4, new_pre_boss4)

with codecs.open('src/scenes/BossScene.js', 'w', 'utf-8') as f:
    f.write(content)

print("Pre-boss 4 script updated")
