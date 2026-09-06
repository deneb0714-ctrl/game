import codecs
content = codecs.open('src/logic/endings.js', 'r', 'utf-8').read()

# bad_puppet
content = content.replace("description: 'こうして魔王は打倒された。魔王とはいったい何だったのか。\\n博士の目的は何だったのか。しかし、それはこれからのあなたには関係のないことだろう。\\nなぜならあなたは博士の忠実な傀儡（ドール）なのだから＿＿＿。',", "description: 'こうして魔王は打倒された。魔王とはいったい何だったのか。\\n博士の目的は何だったのか。しかし、それはこれからのあなたには関係のないことだろう。\\nなぜならあなたは博士の忠実な傀儡（ドール）なのだから＿＿＿。',\\n    bgImage: 'cg_puppet',")

# normal_useless
old_useless = '''  normal_useless: {
    key: 'normal_useless',
    title: 'NORMAL END',
    subtitle: '? 役立たず ?',
    description: '主人公は魔王を倒せなかった。それとも、倒さなかったのだろうか。\\n主人公にはわからなかった。少なくとも、会話をした中で、魔王が完全に悪だとは思えなかったのだろう。\\n魔王は悪い奴ではないのかもしれないと博士に伝えるため、研究室に戻った。',
    postDescription: '博士「報告などなくてもわかっている。お前はあいつらを殺しきることはできなかった役立たずだとな。」\\n\\n博士「魔王は悪くないだと？世界平和のために奴はいらんだろう。そんな簡単な役目すらこなせないお人形は処分しないとな。」',
    color: 0x9CA3AF,
    bgColor: '#05050a'
  },'''
new_useless = '''  normal_useless: {
    key: 'normal_useless',
    title: 'NORMAL END',
    subtitle: '? 役立たず ?',
    description: '主人公は魔王を倒せなかった。それとも、倒さなかったのだろうか。\\n主人公にはわからなかった。少なくとも、会話をした中で、魔王が完全に悪だとは思えなかったのだろう。\\n魔王は悪い奴ではないのかもしれないと博士に伝えるため、研究室に戻った。',
    postDescription: '博士「報告などなくてもわかっている。お前はあいつらを殺しきることはできなかった役立たずだとな。」\\n\\n博士「魔王は悪くないだと？世界平和のために奴はいらんだろう。そんな簡単な役目すらこなせないとはな。」\\n\\n博士「仕方ない。新たな勇者を作るとでもするか。だから、お前にもう用はない。」',
    bgImagePost: 'cg_useless',
    color: 0x9CA3AF,
    bgColor: '#05050a'
  },'''
content = content.replace(old_useless, new_useless)

# normal_unresistable
old_unresistable = '''  normal_unresistable: {
    key: 'normal_unresistable',
    title: 'NORMAL END',
    subtitle: '? 抗えない ?',
    description: '勇者の意思とは裏腹に、見逃したはずの幹部たちを見つけ殺していく。\\nどれだけ引き金を引かないよう抗ったとて、その手は言うことを聞かなかった。',
    color: 0x9CA3AF,
    bgColor: '#05050a'
  }'''
new_unresistable = '''  normal_unresistable: {
    key: 'normal_unresistable',
    title: 'NORMAL END',
    subtitle: '? 抗えない ?',
    description: '勇者の意思とは裏腹に、研究室に戻ることもできず見逃したはずの幹部たちを見つけ殺していく。\\nどれだけ引き金を引かないよう抗ったとて、その手は言うことを聞かなかった。',
    bgImage: 'cg_irresistible',
    color: 0x9CA3AF,
    bgColor: '#05050a'
  }'''
content = content.replace(old_unresistable, new_unresistable)

with codecs.open('src/logic/endings.js', 'w', 'utf-8') as f:
    f.write(content)
print('Updated endings.js')
