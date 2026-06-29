module.exports = `
            (async () => {
              let DP = MOT.flags.dollPoints || 0;
              let Satsui = MOT.flags.killingIntent || 0;
              let Kills = 0;
              if (MOT.flags.killedBoss1) Kills++;
              if (MOT.flags.killedBoss2) Kills++;
              if (MOT.flags.killedTwins) Kills++;

              const ending = (key) => {
                  MOT.flags.finalEnding = key;
                  this.proceedToNextArea(boss, false);
              };

              if (Kills === 0) {
                  await sayDevice('「早くとどめをさせ！」');
                  let c = await askShatterChoice('1. 殺す', '2. 殺さない', true);
                  
                  if (c === 2) {
                      if (Satsui >= 100 && DP < 100) {
                          await sayDevice('「貴様……システムに逆らうというのか！」');
                          await sayDevice('「……！？」');
                          await sayHero('「いつまでも自分が優位に立てるとは思わない方がいい」');
                          this.cameras.main.shake(1000, 0.05);
                          MOT.Audio.playSelect();
                          var w = 1920, h = 1080;
                          let glass = this.add.rectangle(w/2, h/2, w, h, 0xffffff).setAlpha(0).setDepth(400).setBlendMode(Phaser.BlendModes.ADD);
                          this.tweens.add({targets: glass, alpha: 1, duration: 100, yoyo: true, repeat: 3});
                          await new Promise(r => this.time.delayedCall(1000, r));
                          ending('hidden_truedemon');
                      } else {
                          await sayDemon('「そうか、良く正しい選択をした。ここから話すのは、信じるも信じないもお前の自由だ。」');
                          await sayDemon('「きっとお前は、あいつに私が世界を滅ぼそうとでもしていると言われたのだろう？だが、私はそんなことを考えていない。むしろ世界にとっての悪はあいつだ。あいつはこの世界に人間以上の存在がいることが許せないのだ。わらわはやつに襲われていた魔族を保護し、あいつと長い間戦ってきた」');
                          await sayDevice('「…なんだ、すべて話されてしまったみたいだな」');
                          await sayHero('「！」');
                          await sayDevice('「だが、気づくのが遅い。お前たちがのんきに弾幕で遊んでいる間にこちらの準備は整った」');
                          await sayDemon('「なんだ？！」');
                          await sayDevice('「さぁ、最終決戦といこうじゃないか！」');
                          this.bossQueue.push('doctor');
                          this.proceedToNextArea(boss, true);
                          return;
                      }
                  } else {
                      await sayDemon('「わがしもべたちは、わらわに従っていただけだ。おぬしもむやみに殺したいわけではないのだろう？」');
                      await sayDemon('「だから今ここで契約を結べ。われはこのまま何もしない。だからしもべを殺すな」');
                      await sayHero('「…わかった。」');
                      await sayDevice('「勝手に決めるな。お前の使命を忘れたのか。魔王を倒した後、残りのやつらも倒しに行くんだ。」');
                      await sayDemon('「ふざけるな！！！わらわたちが何をした！世界の悪だと言うのなら、それは！」');
                      MOT.Audio.playSelect();
                      await sayHero('「！」');
                      await sayHero('「なんで、今勝手に手が…！」');
                      await sayDevice('「ろくでもない生物を生かしておく必要はないだろう。無駄な命乞いを聞く前にさっさと始末させたに過ぎない。」');
                      await sayDevice('「いいか。お前はこれから逃がした幹部を殺しに行くんだ。逃がすなんてことをしたらわかっているな？」');
                      this.cameras.main.fadeOut(1000);
                      await new Promise(r => this.time.delayedCall(1000, r));
                      ending('normal_resist_fail');
                  }
              } else if (Kills > 0 && Kills < 3) {
                  if (DP >= 100) {
                      await sayDevice('「よくやった。さぁ早くとどめを！」');
                      await sayDemon('「ぐっ…すまないわがしもべたち…ここまでのようだ」');
                      await sayHero('「…」');
                      MOT.Audio.playSelect();
                      this.cameras.main.fadeOut(1000);
                      await new Promise(r => this.time.delayedCall(1000, r));
                      let blackText = this.add.text(1920/2, 1080/2, '無言で残党も出会い次第殺しながら博士の研究室に戻る。', {fontFamily: '"DotGothic16"', fontSize: '32px', color: '#fff'}).setOrigin(0.5).setDepth(300).setAlpha(0);
                      this.tweens.add({targets: blackText, alpha: 1, duration: 1000});
                      await new Promise(r => this.time.delayedCall(3000, r));
                      this.tweens.add({targets: blackText, alpha: 0, duration: 1000});
                      await new Promise(r => this.time.delayedCall(1000, r));
                      this.cameras.main.fadeIn(1000);
                      await sayDevice('「よくやったな、勇者よ」');
                      await sayHero('「…」');
                      await sayDevice('「ふむ。すでに物言わぬお人形にでも堕ちたか。」');
                      if (this.choiceContainer) this.choiceContainer.destroy();
                      this.choiceContainer = this.add.container(0, 0).setDepth(200);
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
                      await sayHero('「…」');
                      await sayDevice('「こちらに銃を構えてどうした？私を倒したいでも言うのか。」');
                      await sayDevice('「残念だが、お前にその権限はない。」');
                      await sayDevice('「お前にできることは、このまま邪魔者を倒し私の役に立つことだけだ。」');
                      await sayDevice('「だが、歯向かってきたお前をこのまま使う必要もないな。処分するとでもしようか。」');
                      ending('bad_shutdown');
                  } else {
                      await sayDevice('「よくやった。さぁ早くとどめを！」');
                      await sayDemon('「ぐっ…ここまでか…」');
                      const askChoice = (label1, label2) => new Promise(res => {
                          if (this.choiceContainer) this.choiceContainer.destroy();
                          this.choiceContainer = this.add.container(0, 0).setDepth(200);
                          var w = 1920, h = 1080;
                          var bg = this.add.rectangle(w / 2, h / 2, w, h, 0x000000, 0.4).setInteractive();
                          this.choiceContainer.add(bg);
                          var box1 = this.add.rectangle(w / 2, h/2 - 40, 500, 50, 0x1F2933, 0.8).setStrokeStyle(2, 0x4FD1FF);
                          var txt1 = this.add.text(w / 2, h/2 - 40, label1, { fontFamily: '"DotGothic16"', fontSize: '24px', color: '#ffffff' }).setOrigin(0.5);
                          var box2 = this.add.rectangle(w / 2, h/2 + 40, 500, 50, 0x1F2933, 0.8).setStrokeStyle(2, 0x4FD1FF);
                          var txt2 = this.add.text(w / 2, h/2 + 40, label2, { fontFamily: '"DotGothic16"', fontSize: '24px', color: '#ffffff' }).setOrigin(0.5);
                          this.choiceContainer.add([box1, txt1, box2, txt2]);
                          let cursor = this.add.text(w / 2 - 280, h/2 - 40, '▶', { fontFamily: '"DotGothic16"', fontSize: '24px', color: '#39FF14' }).setOrigin(0.5);
                          this.choiceContainer.add(cursor);
                          let idx = 0;
                          const kh = (e) => {
                              if(e.key==='ArrowUp' || e.key==='w') { idx = 0; cursor.setY(h/2 - 40); }
                              if(e.key==='ArrowDown' || e.key==='s') { idx = 1; cursor.setY(h/2 + 40); }
                              if(e.key==='Enter' || e.key===' ') {
                                  this.input.keyboard.off('keydown', kh);
                                  this.choiceContainer.destroy();
                                  res(idx + 1);
                              }
                          };
                          this.input.keyboard.on('keydown', kh);
                      });
                      let c = await askChoice('1. 心臓を打ち抜く', '2. 見逃す');
                      if (c === 2) {
                          await sayDemon('「わらわを見逃して何が望みだ？しもべたちを殺しているんだ。和平を求めて居るわけではないのであろう？」');
                          await sayDemon('「わらわは、しもべを殺された恨みを忘れることはできん。何が目的であれ、お前を許すことはできないだろう。」');
                          this.cameras.main.fadeOut(1000);
                          await new Promise(r => this.time.delayedCall(1000, r));
                          let blackText = this.add.text(1920/2, 1080/2, '主人公は魔王を倒せなかった。それとも、倒さなかったのだろうか。', {fontFamily: '"DotGothic16"', fontSize: '32px', color: '#fff'}).setOrigin(0.5).setDepth(300).setAlpha(0);
                          this.tweens.add({targets: blackText, alpha: 1, duration: 1000});
                          await new Promise(r => this.time.delayedCall(3000, r));
                          this.tweens.add({targets: blackText, alpha: 0, duration: 1000});
                          await new Promise(r => this.time.delayedCall(1000, r));
                          this.cameras.main.fadeIn(1000);
                          await sayDevice('「報告などなくてもわかっている。お前はあいつらを殺しきることはできなかった役立たずだとな。」');
                          await sayDevice('「魔王は悪くないだと？世界平和のために奴はいらんだろう。そんな簡単な役目すらこなせないお人形は処分しないとな。」');
                          ending('normal_useless');
                      } else {
                          await sayDemon('「このわらわが...！すまない、我がしもべたち...」');
                          MOT.Audio.playSelect();
                          this.cameras.main.fadeOut(1000);
                          await new Promise(r => this.time.delayedCall(1000, r));
                          let blackText = this.add.text(1920/2, 1080/2, 'こうして魔王は打倒された。主人公は博士の研究所に戻った。', {fontFamily: '"DotGothic16"', fontSize: '32px', color: '#fff'}).setOrigin(0.5).setDepth(300).setAlpha(0);
                          this.tweens.add({targets: blackText, alpha: 1, duration: 1000});
                          await new Promise(r => this.time.delayedCall(3000, r));
                          this.tweens.add({targets: blackText, alpha: 0, duration: 1000});
                          await new Promise(r => this.time.delayedCall(1000, r));
                          this.cameras.main.fadeIn(1000);
                          await sayDevice('「よく魔王を倒してくれた。これで私の望みに一歩近づいたな。ふふ、世界の平和が望みだよ。」');
                          await sayDevice('「ああ、役割を果たしたお人形は処分してあげないとな。」');
                          ending('normal_daily');
                      }
                  }
              } else if (Kills === 3) {
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
                  await sayDemon('「博士の…傀儡め…！」');
                  MOT.Audio.playSelect();
                  ending('bad_puppet');
              }
            })();
`;
