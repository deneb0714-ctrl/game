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
  normal_resist_fail: {
    key: 'normal_resist_fail',
    title: 'NORMAL END',
    subtitle: '— 抗えない —',
    description: '勇者の意思とは裏腹に、研究室に戻ることもできず見逃したはずの幹部たちを見つけ殺していく。\nどれだけ引き金を引かないよう抗ったとて、その手は言うことを聞かなかった。',
    color: 0xFF4B6E,
    bgColor: '#1a0000'
  },
  normal_daily: {
    key: 'normal_daily',
    title: 'NORMAL END',
    subtitle: '— 日常 —',
    description: '結局魔王とはいったい何だったのか。\n彼女は本当に倒さなければならなかったのか。\nその答えを知る機会はもう一生訪れない。\nこうして役割を果たしたお人形は処分された。',
    color: 0xE5E7EB,
    bgColor: '#0a0a14'
  },
  normal_useless: {
    key: 'normal_useless',
    title: 'NORMAL END',
    subtitle: '— 役立たず —',
    description: '主人公は魔王を倒せなかった。\n簡単な役目すらこなせないお人形は処分された。',
    color: 0x9CA3AF,
    bgColor: '#05050a'
  },
  bad_puppet: {
    key: 'bad_puppet',
    title: 'BAD END',
    subtitle: '— 傀儡 —',
    description: 'こうして魔王は打倒された。\n魔王とはいったい何だったのか。\n博士の目的は何だったのか。\nしかし、それはこれからのあなたには関係のないことだろう。\nなぜならあなたは博士の忠実な傀儡（ドール）なのだから＿＿＿。',
    color: 0xFF0000,
    bgColor: '#110000'
  },
  bad_shutdown: {
    key: 'bad_shutdown',
    title: 'BAD END',
    subtitle: '— 強制シャットダウン —',
    description: '歯向かおうとした勇者だったが、権限はなかった。\n博士によって機能は強制的に停止され、二度と目覚めることはなかった。',
    color: 0xFF0000,
    bgColor: '#110000'
  },
  hidden_truedemon: {
    key: 'hidden_truedemon',
    title: 'TRUE END',
    subtitle: '— 真なる魔王 —',
    description: 'いつまでも自分が優位に立てるとは思わない方がいい。\n勇者は自らの力で制御を打ち破り、真なる自由、あるいは真の魔王として覚醒した。',
    color: 0xFFD700,
    bgColor: '#1a1a00'
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
