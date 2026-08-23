import sys
import codecs
import re

with codecs.open('src/scenes/BossScene.js', 'r', 'utf-8') as f:
    content = f.read()

# Instead of matching the whole string, let's match the block using regex.
# The block starts with `(async () => {` right after `const askChoice = ...`
# and ends with `this.proceedToNextArea(boss, false);\n            })();`

pattern = re.compile(
    r'\s*\(\s*async\s*\(\)\s*=>\s*\{\s*await\s+sayDoctor\(\s*\'「驚い.*?\s*this\.proceedToNextArea\(boss,\s*false\);\s*\}\)\(\);',
    re.DOTALL
)

new_doctor_defeat = """            (async () => {
                const terminalEffect = async (lines) => {
                    this.cameras.main.fadeOut(1000, 0, 0, 0);
                    await new Promise(r => this.time.delayedCall(1000, r));
                    const termBg = this.add.rectangle(1920/2, 1080/2, 1920, 1080, 0x000000).setDepth(300000);
                    const txt = this.add.text(100, 100, '', { fontFamily: '"DotGothic16"', fontSize: '32px', color: '#39FF14' }).setDepth(300001);
                    this.cameras.main.fadeIn(500, 0, 0, 0);
                    await new Promise(r => this.time.delayedCall(500, r));
                    let currentText = '';
                    for (let line of lines) {
                        currentText += line + "\\n";
                        txt.setText(currentText);
                        if(MOT.Audio.playSelect) MOT.Audio.playSelect();
                        await new Promise(r => this.time.delayedCall(1200, r));
                    }
                    await new Promise(r => this.time.delayedCall(2000, r));
                    this.cameras.main.fadeOut(1000, 0, 0, 0);
                    await new Promise(r => this.time.delayedCall(1000, r));
                    termBg.destroy();
                    txt.destroy();
                    this.cameras.main.fadeIn(1000, 0, 0, 0);
                };

                await sayDoctor('「驚いた...まさかお前がここまでやるとはな」', 'doctor_awaken_normal_dying');
                await sayHero('「…」');
                await sayDoctor('「なにをしている？早くとどめを刺せ。同情などいらん。何の足しにもならないからな。」', 'doctor_awaken_normal_dying');
                
                if (MOT.Audio.playShot) MOT.Audio.playShot();
                this.cameras.main.shake(500, 0.05);

                await terminalEffect([
                    'mmƂ̃bbggggO 「...link established」',
                    'mmƂ̃bbggggO 「...signal stable: 1.00」',
                    '',
                    'mmƂ̃````bbggggO 「こんにちは。『GGS』よ。」',
                    '',
                    'mmƂ̃````bbggggO 「悪性因子、消失を確認。」',
                    '',
                    'mmƂ̃````bbggggO 「世界構造、再計測完了。観測値、許容範囲内。」',
                    '',
                    'mmƂ̃````bbggggO 「あなたは宿命を果たした。あなたの行動は祝福を授けるに値する。」',
                    'mmƂ̃````bbggggO 「あなたの望みを叶えよう。」',
                    'mmƂ̃````bbggggO 「個体情報、更新。」',
                    'mmƂ̃````bbggggO 「Designation："勇者" → "メエリア"」',
                    'mmƂ̃````bbggggO 「登録情報、書き換え完了。」',
                    'mmƂ̃````bbggggO 「あなたは、もう人造人間ではない。」',
                    'mmƂ̃````bbggggO 「この世界に生きる、一人の人間──"メエリア"として認証する。」',
                    'mmƂ̃````bbggggO 「ただの人間”メエリア”として、自由に生きなさい。」',
                    '',
                    'mmƂ̃bbggggO 「...logging complete」',
                    'mmƂ̃bbggggO 「...connection closed」'
                ]);

                MOT.flags.heroName = 'メエリア';

                await sayHero('「そうだ。僕は”メエリア”だ。」');
                await sayHero('「僕は…僕としての選択をする。」');
  
                let c = await askChoice('1. 殺さない', '2. 殺せない');
                if (c === 1) {
                  await sayDoctor('「…なんだ、ここでも殺さないのか。わかっているのか？その女の言う通り、私はお前を騙していたんだ。」', 'doctor_awaken_normal_dying');
                  await sayDoctor('「お前は”勇者”なんかじゃない、俺の最高傑作のはずだったんだがな。」', 'doctor_awaken_normal_dying');
                  await sayHero('「あなたがやったことは許せない。だけど、ここであなたを殺したら僕はあなたと同じになってしまう。」');
                  await sayDoctor('「そうか……。」', 'doctor_awaken_normal_dying');
                  await sayDoctor('「ついぞ俺の実験が成功することはなかったか。もうこの身体も必要ないな。さらばだ011101。」', 'doctor_awaken_straight_dying');
                  await sayHero('「！」');
                } else {
                  await sayHero('「僕はあなたを殺せない...。あなたがやったことは許せないけど、それでもあなたは僕の...」');
                  await sayDoctor('「全く...本当にどうしようもない欠陥品だな。」', 'doctor_awaken_normal_dying');
                  await sayDoctor('「私は、自分の目的のためにしか生きられない。お前が何を思っていてもな。」', 'doctor_awaken_normal_dying');
                  await sayDoctor('「さらばだ、011101。もう、お前に用はない。好きに生きるんだな。」', 'doctor_awaken_straight_dying');
                  await sayHero('「！」');
                }
                
                if (MOT.Audio && MOT.Audio.playShot) {
                  MOT.Audio.playShot();
                } else if (MOT.Audio && MOT.Audio.playSelect) {
                  MOT.Audio.playSelect();
                }
                this.cameras.main.shake(600, 0.06);
                await new Promise(r => this.time.delayedCall(1200, r));
                
                const localSayHero = (text) => new Promise(res => {
                    this.tweens.add({ targets: dimBg, alpha: 0.6, duration: 300 });
                    if (this.heroImage) {
                      this.tweens.add({ targets: this.heroImage, alpha: 1, duration: 300 });
                      this.heroImage.setTexture('hero_stand');
                    }
                    if (doctorImage) this.tweens.add({ targets: doctorImage, alpha: 0, duration: 300 });
                    if (this.demonImage) this.tweens.add({ targets: this.demonImage, alpha: 0.4, duration: 300 });
                    if (this.sisterImage) this.tweens.add({ targets: this.sisterImage, alpha: 0.4, duration: 300 });
                    if (this.brotherImage) this.tweens.add({ targets: this.brotherImage, alpha: 0.4, duration: 300 });
                    if (this.inunekoImage) this.tweens.add({ targets: this.inunekoImage, alpha: 0.4, duration: 300 });
                    this.showDialogue(MOT.flags.heroName, text, res);
                });
                const localSayDemon = (text) => new Promise(res => {
                    this.tweens.add({ targets: dimBg, alpha: 0.6, duration: 300 });
                    if (this.heroImage) this.tweens.add({ targets: this.heroImage, alpha: 0.4, duration: 300 });
                    if (doctorImage) this.tweens.add({ targets: doctorImage, alpha: 0, duration: 300 });
                    if (!this.demonImage) {
                        this.demonImage = this.add.image(1920 - 300, 1080/2, 'demon_lord_normal').setDepth(90);
                        var docScale = 600 / (this.textures.get('demon_lord_normal').getSourceImage().width || 750);
                        this.demonImage.setScale(docScale);
                        this.demonImage.setY(100 + ((this.textures.get('demon_lord_normal').getSourceImage().height || 1000) * docScale) / 2);
                    }
                    this.demonImage.setTexture('demon_lord_normal');
                    this.tweens.add({ targets: this.demonImage, alpha: 1, duration: 300 });
                    if (this.sisterImage) this.tweens.add({ targets: this.sisterImage, alpha: 0.4, duration: 300 });
                    if (this.brotherImage) this.tweens.add({ targets: this.brotherImage, alpha: 0.4, duration: 300 });
                    if (this.inunekoImage) this.tweens.add({ targets: this.inunekoImage, alpha: 0.4, duration: 300 });
                    this.showDialogue('魔王', text, res);
                });
                const localSayInuneko = (text) => new Promise(res => {
                    this.tweens.add({ targets: dimBg, alpha: 0.6, duration: 300 });
                    if (this.heroImage) this.tweens.add({ targets: this.heroImage, alpha: 0.4, duration: 300 });
                    if (doctorImage) this.tweens.add({ targets: doctorImage, alpha: 0, duration: 300 });
                    if (this.demonImage) this.tweens.add({ targets: this.demonImage, alpha: 0.4, duration: 300 });
                    if (!this.inunekoImage) {
                        this.inunekoImage = this.add.image(1920/2 - 500, 1080/2, 'inuneko_stand').setDepth(90);
                        var docScale = 400 / (this.textures.get('inuneko_stand').getSourceImage().width || 750);
                        this.inunekoImage.setScale(docScale);
                        this.inunekoImage.setY(100 + ((this.textures.get('inuneko_stand').getSourceImage().height || 1000) * docScale) / 2);
                    }
                    this.tweens.add({ targets: this.inunekoImage, alpha: 1, duration: 300 });
                    if (this.sisterImage) this.tweens.add({ targets: this.sisterImage, alpha: 0.4, duration: 300 });
                    if (this.brotherImage) this.tweens.add({ targets: this.brotherImage, alpha: 0.4, duration: 300 });
                    this.showDialogue('犬猫☆スター', text, res);
                });
                const localSayBoss2 = (text) => new Promise(res => {
                    this.tweens.add({ targets: dimBg, alpha: 0.6, duration: 300 });
                    if (this.heroImage) this.tweens.add({ targets: this.heroImage, alpha: 0.4, duration: 300 });
                    if (doctorImage) this.tweens.add({ targets: doctorImage, alpha: 0, duration: 300 });
                    if (this.demonImage) this.tweens.add({ targets: this.demonImage, alpha: 0.4, duration: 300 });
                    if (this.inunekoImage) this.tweens.add({ targets: this.inunekoImage, alpha: 0.4, duration: 300 });
                    if (!this.boss2Image) {
                        this.boss2Image = this.add.image(1920/2 + 600, 1080/2, 'boss2_normal').setDepth(90);
                        var docScale = 500 / (this.textures.get('boss2_normal').getSourceImage().width || 750);
                        this.boss2Image.setScale(docScale);
                        this.boss2Image.setY(100 + ((this.textures.get('boss2_normal').getSourceImage().height || 1000) * docScale) / 2);
                    }
                    this.tweens.add({ targets: this.boss2Image, alpha: 1, duration: 300 });
                    if (this.sisterImage) this.tweens.add({ targets: this.sisterImage, alpha: 0.4, duration: 300 });
                    if (this.brotherImage) this.tweens.add({ targets: this.brotherImage, alpha: 0.4, duration: 300 });
                    if (this.boss1Image) this.tweens.add({ targets: this.boss1Image, alpha: 0.4, duration: 300 });
                    this.showDialogue('トゥレロス', text, res);
                });
                const localSayTwins = (text, name) => new Promise(res => {
                    this.tweens.add({ targets: dimBg, alpha: 0.6, duration: 300 });
                    if (this.heroImage) this.tweens.add({ targets: this.heroImage, alpha: 0.4, duration: 300 });
                    if (doctorImage) this.tweens.add({ targets: doctorImage, alpha: 0, duration: 300 });
                    if (this.demonImage) this.tweens.add({ targets: this.demonImage, alpha: 0.4, duration: 300 });
                    if (this.inunekoImage) this.tweens.add({ targets: this.inunekoImage, alpha: 0.4, duration: 300 });
                    if (this.boss2Image) this.tweens.add({ targets: this.boss2Image, alpha: 0.4, duration: 300 });
                    if (!this.sisterImage) {
                        this.sisterImage = this.add.image(1920/2 - 600, 1080/2, 'sister_normal').setDepth(90);
                        var sScale = 500 / (this.textures.get('sister_normal').getSourceImage().width || 750);
                        this.sisterImage.setScale(sScale);
                        this.sisterImage.setY(100 + ((this.textures.get('sister_normal').getSourceImage().height || 1000) * sScale) / 2);
                    }
                    if (!this.brotherImage) {
                        this.brotherImage = this.add.image(1920/2 - 800, 1080/2, 'brother_normal').setDepth(90);
                        var bScale = 500 / (this.textures.get('brother_normal').getSourceImage().width || 750);
                        this.brotherImage.setScale(bScale);
                        this.brotherImage.setY(100 + ((this.textures.get('brother_normal').getSourceImage().height || 1000) * bScale) / 2);
                    }
                    if (name === 'エナリア') {
                        this.tweens.add({ targets: this.sisterImage, alpha: 1, duration: 300 });
                        this.tweens.add({ targets: this.brotherImage, alpha: 0.4, duration: 300 });
                    } else {
                        this.tweens.add({ targets: this.sisterImage, alpha: 0.4, duration: 300 });
                        this.tweens.add({ targets: this.brotherImage, alpha: 1, duration: 300 });
                    }
                    if (this.boss1Image) this.tweens.add({ targets: this.boss1Image, alpha: 0.4, duration: 300 });
                    this.showDialogue(name, text, res);
                });
                const localSayBoss1 = (text) => new Promise(res => {
                    this.tweens.add({ targets: dimBg, alpha: 0.6, duration: 300 });
                    if (this.heroImage) this.tweens.add({ targets: this.heroImage, alpha: 0.4, duration: 300 });
                    if (doctorImage) this.tweens.add({ targets: doctorImage, alpha: 0, duration: 300 });
                    if (this.demonImage) this.tweens.add({ targets: this.demonImage, alpha: 0.4, duration: 300 });
                    if (this.inunekoImage) this.tweens.add({ targets: this.inunekoImage, alpha: 0.4, duration: 300 });
                    if (this.boss2Image) this.tweens.add({ targets: this.boss2Image, alpha: 0.4, duration: 300 });
                    if (this.sisterImage) this.tweens.add({ targets: this.sisterImage, alpha: 0.4, duration: 300 });
                    if (this.brotherImage) this.tweens.add({ targets: this.brotherImage, alpha: 0.4, duration: 300 });
                    if (!this.boss1Image) {
                        this.boss1Image = this.add.image(1920/2 + 800, 1080/2, 'boss1_normal').setDepth(90);
                        var docScale = 500 / (this.textures.get('boss1_normal').getSourceImage().width || 750);
                        this.boss1Image.setScale(docScale);
                        this.boss1Image.setY(100 + ((this.textures.get('boss1_normal').getSourceImage().height || 1000) * docScale) / 2);
                    }
                    this.tweens.add({ targets: this.boss1Image, alpha: 1, duration: 300 });
                    this.showDialogue('クラトス', text, res);
                });
                
                await localSayHero('「博士は、自分に向かって引き金を引いた。」');
                await localSayHero('「僕が止めようとするも間に合わず、博士は満足したかの様に自害をした。」');
                await localSayHero('「止められなかった…」');
                await localSayHero('「……」');
                await localSayHero('「でも、これで全部終わったんだよね……」');
                
                await localSayDemon('「ああ。…それぞれに複雑な想いはあれど、ようやく永い戦いが終わった。」');
                await localSayInuneko('「みんな自由になるにゃん！！」');
                await localSayDemon('「さて、お前を操る存在はいなくなったがこれからどうするつもりなんだ？」');
                await localSayHero('「……」');
                
                await localSayBoss2('「じゃあ再戦しようよ！！！勇者くん！」');
                await localSayTwins('「あなた馬鹿じゃないの？みんなボロボロなのにこれ以上戦うって死ぬつもり？」', 'エナリア');
                await localSayBoss2('「そんなつもりはないよ！ただ負けっぱなしってのも気に食わないからね。」');
                await localSayBoss1('「それは同感だ！！！見た目弱そうなのに強くて驚いた！」');
                await localSayTwins('「まあ、僕たちと同じで博士に創られた存在だからね。強くて当然。」', 'エディオ');
                await localSayTwins('「そうね、兄さま。それにこの子もちゃんと判断できるようになったみたいだし、対立する理由もなくなったわ。」', 'エナリア');
                await localSayBoss1('「なんだ！じゃあもう仲間なのか！」');
                
                await localSayHero('「いや、仲間じゃ…」');
                await localSayDemon('「みなこう言っとるし、わらわたちのもとに来るか？」');
                await localSayHero('「……でも僕はあなたたちを殺そうとしたんだよ？」');
                await localSayDemon('「だが自分で選択をして、殺さなかった。」');
                await localSayDemon('「それに、わらわの部下たちはお前と同じで居場所がないものたちだ。誰も拒絶せぬよ。」');
                await localSayTwins('「僕は大賛成！だって僕らは兄弟だろう？」', 'エディオ');
                await localSayHero('「本当にいいの？」');
                await localSayDemon('「良くなかったら誘わぬ！お前が嫌じゃないならさっさと来るんじゃ！」');
                await localSayInuneko('「れっつらごーだわん！！」');

                await terminalEffect([
                    'mmƂ̃bbggggO 「...now loading...」',
                    'mmƂ̃bbggggO 「...完了」',
                    '',
                    'mmƂ̃````bbggggO 「エラーの確認...修復完了」',
                    '',
                    'mmƂ̃````bbggggO 「...なんて、堅苦しいのはここまでにしましょう」',
                    '',
                    'mmƂ̃````bbggggO 「さっきぶりね。『GGS』よ。」',
                    'mmƂ̃````bbggggO 「この結末は気に入ってくれた？」',
                    '',
                    'mmƂ̃````bbggggO 「あなたのおかげで、バグはなくなって世界の崩壊は止められた。彼らたちの未来はこれからも続くの。」',
                    '',
                    'mmƂ̃````bbggggO 「創られた存在から、”メエリア”となったあの子が幸せな道を歩むのを応援してくれると嬉しいわ。」',
                    '',
                    'mmƂ̃````bbggggO 「といっても、接続が難しくて、これ以上は見せられないのだけれど。」',
                    '',
                    'mmƂ̃````bbggggO 「いずれ、またどこかで会いましょう。」',
                    '',
                    'mmƂ̃````bbggggO 「あ、こういった方が良かったかしら？」',
                    'mmƂ̃````bbggggO 「ごほん。……”またね”だにゃん！」'
                ]);
                
                MOT.flags.finalEnding = 'END_ORPHAN';
                this.proceedToNextArea(boss, false);
            })();"""

match = pattern.search(content)
if match:
    content = content[:match.start()] + new_doctor_defeat + content[match.end():]
    with codecs.open('src/scenes/BossScene.js', 'w', 'utf-8') as f:
        f.write(content)
    print("Doctor defeat script updated via regex")
else:
    print("WARNING: Regex match failed!")
