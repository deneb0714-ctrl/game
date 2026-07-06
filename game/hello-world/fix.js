const fs = require('fs');
const path = 'src/scenes/BossScene.js';
let content = fs.readFileSync(path, 'utf8');

const regex = /\(async \(\) \=\> \{\s+let DP = MOT\.flags\.dollPoints[\s\S]*?\}\)\(\);\s+\} else if \(key === 'doctor'\)/;

const newBlock = `(async () => {
              let DP = MOT.flags.dollPoints || 0;
              let Satsui = MOT.flags.killingIntent || 0;
              let Kills = MOT.flags.kills !== undefined ? MOT.flags.kills : 0;
              if (MOT.flags.kills === undefined) {
                if (MOT.flags.killedBoss1) Kills++;
                if (MOT.flags.killedBoss2) Kills++;
                if (MOT.flags.killedTwins) Kills++;
              }

              const ending = (key) => {
                  MOT.flags.finalEnding = key;
                  this.proceedToNextArea(boss, false);
              };

              if (Kills === 3) {
                  await sayDevice('「よくやった。さぁ早くとどめを！」');
                  await sayDemon('「ぐっ…ここまでか…」');
                  if (this.choiceContainer) this.choiceContainer.destroy();
                  this.choiceContainer = this.add.container(0, 0).setDepth(200);
                  var w = 1920, h = 1080;
                  var bg = this.add.rectangle(w / 2, h / 2, w, h, 0x000000, 0.4).setInteractive();
                  this.choiceContainer.add(bg);
                  var title = this.add.text(w / 2, h / 2 - 180, '選択してください', { fontFamily: '"DotGothic16"', fontSize: '40px', color: '#ffffff' }).setOrigin(0.5);
                  this.choiceContainer.add(title);
                  let yStart = h / 2 - 100;
                  for(let i=0; i<5; i++){
                      let box = this.add.rectangle(w / 2, yStart + i * 60, 500, 50, 0x1F2933, 0.8).setStrokeStyle(2, 0x4FD1FF);
                      let txt = this.add.text(w / 2, yStart + i * 60, (i+1)+'. 心臓を打ち抜く', { fontFamily: '"DotGothic16"', fontSize: '24px', color: '#ffffff' }).setOrigin(0.5);
                      this.choiceContainer.add([box, txt]);
                  }
                  await new Promise(res => {
                      let cursor = this.add.text(w / 2 - 280, yStart, '▶', { fontFamily: '"DotGothic16"', fontSize: '24px', color: '#39FF14' }).setOrigin(0.5);
                      this.choiceContainer.add(cursor);
                      let idx = 0;
                      const kh = (e) => {
                          if(e.key==='ArrowUp' || e.key==='w') { idx = Math.max(0, idx-1); cursor.setY(yStart + idx*60); }
                          if(e.key==='ArrowDown' || e.key==='s') { idx = Math.min(4, idx+1); cursor.setY(yStart + idx*60); }
                          if(e.key==='Enter' || e.key===' ') {
                              this.input.keyboard.off('keydown', kh);
                              this.choiceContainer.destroy();
                              res();
                          }
                      };
                      this.input.keyboard.on('keydown', kh);
                  });
                  MOT.flags.killedDemonLord = true;
                  await sayDemon('「博士の…傀儡め…！」');
                  MOT.Audio.playSelect();
                  ending('bad_puppet');
                  return;
              }

              // Kills < 3
              await sayDevice('「よくやった。さぁ早くとどめを！」');
              let c = await askShatterChoice('1. 心臓を打ち抜く', '2. 見逃す', true);

              if (c === 2) {
                  MOT.flags.killedDemonLord = false;
                  if (Kills === 0 && Satsui >= 100 && DP === 0) {
                      // 真の魔王エンド
                      await sayDemon('「そうか、良く正しい選択をした。ここから話すのは、信じるも信じないもお前の自由だ。」');
                      await sayDemon('「きっとお前は、あいつに私が世界を滅ぼそうとでもしていると言われたのだろう？だが、私はそんなことを考えていない。むしろ世界にとっての悪はあいつだ。あいつはこの世界に人間以上の存在がいることが許せないのだ。わらわはやつに襲われていた魔族を保護し、あいつと長い間戦ってきた」');
                      await sayDevice('「…なんだ、すべて話されてしまったみたいだな」');
                      await sayHero('「！」');
                      await sayDevice('「だが、気づくのが遅い。お前たちがのんきに弾幕で遊んでいる間にこちらの準備は整った」');
                      await sayDemon('「なんだ？！」', 'demon_lord_shock');
                      await sayDevice('「さぁ、最終決戦といこうじゃないか！」');
                      this.bossQueue.push('doctor');
                      this.proceedToNextArea(boss, true);
                      return;
                  } else if (Kills === 0) {
                      // 通常の生かすエンド（見逃し・和平エンド）
                      await sayDemon('「わらわを見逃して何が望みだ？しもべたちを殺しているんだ。和平を求めて居るわけではないのであろう？」');
                      await sayDemon('「わらわは、しもべを殺された恨みを忘れることはできん。何が目的であれ、お前を許すことはできないだろう。」');
                      ending('hidden_truedemon'); // 既存のコードを維持
                      return;
                  } else {
                      // Kills > 0 && Kills < 3
                      await sayHero('「…魔王は悪いやつじゃなかった。僕は殺さない。」');
                      ending('normal_useless');
                      return;
                  }
              }

              // 魔王を殺す (c === 1)
              MOT.flags.killedDemonLord = true;
              await sayDemon('「ぐっ…すまないわがしもべたち…ここまでのようだ」');
              await sayHero('「…」');
              MOT.Audio.playSelect();
              this.cameras.main.shake(500, 0.05);
              if(this.demonImage) {
                  this.tweens.add({ targets: this.demonImage, scale: 2, alpha: 0, duration: 500, ease: 'Power2' });
              }

              if (DP >= 3) {
                  // 日常エンド
                  this.cameras.main.fadeOut(1000);
                  await new Promise(r => this.time.delayedCall(1000, r));
                  let blackText = this.add.text(1920/2, 1080/2, '無言で残党も出会い次第殺しながら博士の研究室に戻る。', {fontFamily: '"DotGothic16"', fontSize: '32px', color: '#fff'}).setOrigin(0.5).setDepth(300).setAlpha(0);
                  this.tweens.add({targets: blackText, alpha: 1, duration: 1000});
                  await new Promise(r => this.time.delayedCall(3000, r));
                  this.tweens.add({targets: blackText, alpha: 0, duration: 1000});
                  await new Promise(r => this.time.delayedCall(1000, r));
                  
                  if (this.player) { this.player.setVisible(false); this.player.setActive(false); }
                  if (this.playerHitboxGraphics) this.playerHitboxGraphics.setVisible(false);
                  if (this.uiBg) this.uiBg.setVisible(false);
                  
                  var labBgDaily = this.add.image(1920/2, 1080/2, 'bg_lab').setDepth(90);
                  labBgDaily.setScale(Math.max(1920 / labBgDaily.width, 1080 / labBgDaily.height));
                  
                  var docImgDaily = this.add.image(1920 - 300, 1080/2, 'doctor_stand').setDepth(95);
                  this.textures.get('doctor_stand').setFilter(Phaser.Textures.FilterMode.LINEAR);
                  var docScaleDaily = 750 / this.textures.get('doctor_stand').getSourceImage().width;
                  docImgDaily.setScale(docScaleDaily);
                  docImgDaily.setY(100 + (this.textures.get('doctor_stand').getSourceImage().height * docScaleDaily) / 2);
                  
                  var heroImgDaily = this.add.image(300, 1080/2, 'hero_stand').setDepth(95);
                  var hScaleDaily = 750 / heroImgDaily.width;
                  heroImgDaily.setScale(hScaleDaily);
                  heroImgDaily.setY(100 + (heroImgDaily.height * hScaleDaily) / 2);

                  const sayDoctorLabDaily = (text) => new Promise(res => { 
                      this.tweens.add({targets: docImgDaily, alpha: 1, duration: 300});
                      this.tweens.add({targets: heroImgDaily, alpha: 0.4, duration: 300});
                      this.showDialogue('博士', text, res);
                  });

                  this.cameras.main.fadeIn(1000);
                  await sayDoctorLabDaily('「よく魔王を倒してくれた。これで私の望みに一歩近づいたな。ふふ、世界の平和が望みだよ。」');
                  await sayDoctorLabDaily('「ああ、役割を果たしたお人形は処分してあげないとな。」');
                  ending('normal_daily');
              } else {
                  // シャットダウンエンド
                  this.cameras.main.fadeOut(1000);
                  await new Promise(r => this.time.delayedCall(1000, r));
                  let blackText = this.add.text(1920/2, 1080/2, '無言で残党も出会い次第殺しながら博士の研究室に戻る。', {fontFamily: '"DotGothic16"', fontSize: '32px', color: '#fff'}).setOrigin(0.5).setDepth(300).setAlpha(0);
                  this.tweens.add({targets: blackText, alpha: 1, duration: 1000});
                  await new Promise(r => this.time.delayedCall(3000, r));
                  this.tweens.add({targets: blackText, alpha: 0, duration: 1000});
                  await new Promise(r => this.time.delayedCall(1000, r));
                  
                  if (this.player) { this.player.setVisible(false); this.player.setActive(false); }
                  if (this.playerHitboxGraphics) this.playerHitboxGraphics.setVisible(false);
                  if (this.uiBg) this.uiBg.setVisible(false);

                  var labBg = this.add.image(1920/2, 1080/2, 'bg_lab').setDepth(90);
                  labBg.setScale(Math.max(1920 / labBg.width, 1080 / labBg.height));
                  
                  var docImg = this.add.image(1920 - 300, 1080/2, 'doctor_stand').setDepth(95);
                  this.textures.get('doctor_stand').setFilter(Phaser.Textures.FilterMode.LINEAR);
                  var docScale = 750 / this.textures.get('doctor_stand').getSourceImage().width;
                  docImg.setScale(docScale);
                  docImg.setY(100 + (this.textures.get('doctor_stand').getSourceImage().height * docScale) / 2);
                  
                  var heroImgNew = this.add.image(300, 1080/2, 'hero_stand').setDepth(95);
                  var hScaleNew = 750 / heroImgNew.width;
                  heroImgNew.setScale(hScaleNew);
                  heroImgNew.setY(100 + (heroImgNew.height * hScaleNew) / 2);

                  const sayDoctorLab = (text) => new Promise(res => { 
                      this.tweens.add({targets: docImg, alpha: 1, duration: 300});
                      this.tweens.add({targets: heroImgNew, alpha: 0.4, duration: 300});
                      this.showDialogue('博士', text, res);
                  });
                  const sayHeroLab = (text) => new Promise(res => { 
                      this.tweens.add({targets: docImg, alpha: 0.4, duration: 300});
                      this.tweens.add({targets: heroImgNew, alpha: 1, duration: 300});
                      this.showDialogue('勇者', text, res);
                  });

                  this.cameras.main.fadeIn(1000);
                  await sayDoctorLab('「よくやったな、勇者よ」');
                  await sayHeroLab('「…」');
                  await sayDoctorLab('「ふむ。すでに物言わぬお人形にでも堕ちたか。」');
                  
                  if (this.choiceContainer) this.choiceContainer.destroy();
                  this.choiceContainer = this.add.container(0, 0).setDepth(110);
                  var w = 1920, h = 1080;
                  var bg = this.add.rectangle(w / 2, h / 2, w, h, 0x000000, 0.4).setInteractive();
                  this.choiceContainer.add(bg);
                  var title = this.add.text(w / 2, h / 2 - 180, '選択してください', { fontFamily: '"DotGothic16"', fontSize: '40px', color: '#ffffff' }).setOrigin(0.5);
                  this.choiceContainer.add(title);
                  let yStart = h / 2 - 100;
                  for(let i=0; i<4; i++){
                      let box = this.add.rectangle(w / 2, yStart + i * 60, 500, 50, 0x1F2933, 0.8).setStrokeStyle(2, 0x4FD1FF);
                      let txt = this.add.text(w / 2, yStart + i * 60, (i+1)+'. 博士を倒す', { fontFamily: '"DotGothic16"', fontSize: '24px', color: '#ffffff' }).setOrigin(0.5);
                      this.choiceContainer.add([box, txt]);
                  }
                  await new Promise(res => {
                      let cursor = this.add.text(w / 2 - 280, yStart, '▶', { fontFamily: '"DotGothic16"', fontSize: '24px', color: '#39FF14' }).setOrigin(0.5);
                      this.choiceContainer.add(cursor);
                      let idx = 0;
                      const kh = (e) => {
                          if(e.key==='ArrowUp' || e.key==='w') { idx = Math.max(0, idx-1); cursor.setY(yStart + idx*60); }
                          if(e.key==='ArrowDown' || e.key==='s') { idx = Math.min(3, idx+1); cursor.setY(yStart + idx*60); }
                          if(e.key==='Enter' || e.key===' ') {
                              this.input.keyboard.off('keydown', kh);
                              this.choiceContainer.destroy();
                              res();
                          }
                      };
                      this.input.keyboard.on('keydown', kh);
                  });
                  await sayHeroLab('「…」');
                  await sayDoctorLab('「こちらに銃を構えてどうした？私を倒したいでも言うのか。」');
                  await sayDoctorLab('「残念だが、お前にその権限はない。」');
                  await sayDoctorLab('「お前にできることは、このまま邪魔者を倒し私の役に立つことだけだ。」');
                  await sayDoctorLab('「だが、歯向かってきたお前をこのまま使う必要もないな。処分するとでもしようか。」');
                  ending('bad_shutdown');
              }
            })();
          } else if (key === 'doctor') {`;

if (content.match(regex)) {
  fs.writeFileSync(path, content.replace(regex, newBlock));
  console.log("Replaced successfully!");
} else {
  console.log("Regex didn't match.");
}
