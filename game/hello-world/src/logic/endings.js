// =============================================
// endings.js – エンディング判定ロジック
// =============================================
window.MOT = window.MOT || {};

MOT.ENDINGS = {
  END_ORPHAN: {
    key: 'END_ORPHAN',
    title: 'END',
    subtitle: '— 身寄りのない勇者 —',
    description: 'こうして主人公は自由の身となった。\n身寄りをなくした主人公は魔王に拾われることとなった。',
    color: 0x4FD1FF,
    bgColor: '#050814'
  },
  NORMAL_INESCAPABLE: {
    key: 'NORMAL_INESCAPABLE',
    title: 'NORMAL END',
    subtitle: '— 抗えない —',
    description: '勇者の意思とは裏腹に、研究室に戻ることもできず見逃したはずの幹部たちを見つけ殺していく。\nどれだけ引き金を引かないよう抗ったとて、その手は言うことを聞かなかった。',
    color: 0xFF4B6E,
    bgColor: '#1a0000'
  },
  NORMAL_EVERYDAY: {
    key: 'NORMAL_EVERYDAY',
    title: 'NORMAL END',
    subtitle: '— 日常 —',
    description: 'こうして魔王は打倒された。主人公は博士の研究所に戻った。\n結局魔王とはいったい何だったのか。\n彼女は本当に倒さなければならなかったのか。\nその答えを知る機会はもう一生訪れない。\n\n博士「よく魔王を倒してくれた。これで私の望みに一歩近づいたな。ふふ、世界の平和が望みだよ。」\n博士「ああ、役割を果たしたお人形は処分してあげないとな。」',
    color: 0xE5E7EB,
    bgColor: '#0a0a14'
  },
  NORMAL_USELESS: {
    key: 'NORMAL_USELESS',
    title: 'NORMAL END',
    subtitle: '— 役立たず —',
    description: '主人公は魔王を倒せなかった。それとも、倒さなかったのだろうか。主人公にはわからなかった。\n少なくとも、会話をした中で、魔王が完全に悪だとは思えなかったのだろう。\n魔王は悪い奴ではないのかもしれないと博士に伝えるため、研究室に戻った。\n\n博士「報告などなくてもわかっている。お前はあいつらを殺しきることはできなかった役立たずだとな。」\n博士「魔王は悪くないだと？世界平和のために奴はいらんだろう。そんな簡単な役目すらこなせないお人形は処分しないとな。」',
    color: 0x9CA3AF,
    bgColor: '#05050a'
  },
  BAD_GAMEOVER: {
    key: 'BAD_GAMEOVER',
    title: 'GAME OVER',
    subtitle: '— 破壊された人形 —',
    description: '勇者は力尽き、冷たい大地に倒れた。\n博士の命令は果たされることなく、\n人造人間は静かに機能を停止した。',
    color: 0xFF4B6E,
    bgColor: '#140005'
  }
};

MOT.decideEnding = function () {
  const f = MOT.flags;
  if (f.diedCount > 0) return MOT.ENDINGS.BAD_GAMEOVER;
  
  // Endings are now handled mostly by direct references in BossScene.
  return MOT.ENDINGS.NORMAL_EVERYDAY;
};
