import sys
import codecs
import re

with codecs.open('src/scenes/BossScene.js', 'r', 'utf-8') as f:
    content = f.read()

start_marker = "await sayDemon('「そうか……英断だな…。」');"
end_marker = "this.cameras.main.fadeOut(1500, 0, 0, 0);"

start_idx = content.find(start_marker)

# Wait, the end of this block is before the transition to boss fight!
end_marker_for_preboss4 = "this.proceedToNextArea(boss, true);"

end_idx = content.find(end_marker_for_preboss4, start_idx)

if start_idx != -1 and end_idx != -1:
    new_pre_boss4 = """await localSayDemon('「そうか……英断だな…。」', 'demon_lord_normal');
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
                          
                          await localSayDoctor('「さぁ、最終決戦といこうじゃないか！」', 'doctor_awaken_straight_weapon');

                          if (this.boss1Bgm) this.boss1Bgm.stop();
                          if (this.boss2Bgm) this.boss2Bgm.stop();
                          if (this.twinsBgm) this.twinsBgm.stop();
                          
                          this.bossQueue.push('doctor');
                          this.proceedToNextArea(boss, true);"""
    
    content = content[:start_idx] + new_pre_boss4 + content[end_idx + len(end_marker_for_preboss4):]
    with codecs.open('src/scenes/BossScene.js', 'w', 'utf-8') as f:
        f.write(content)
    print("Successfully replaced pre-boss4 dialogue.")
else:
    print("Could not find markers for pre-boss4 replacement.")
