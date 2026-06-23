// =============================================
// endings.js – エンディング判定ロジック
// =============================================
window.MOT = window.MOT || {};

MOT.ENDINGS = {
  TRUE_PACIFIST: {
    key: 'TRUE_PACIFIST',
    title: 'TRUE END',
    subtitle: '— 自由 —',
    description: 'こうして勇者は自由の身となった。\n身寄りをなくした勇者は魔王に拾われることとなった。',
    color: 0x4FD1FF,
    bgColor: '#050814'
  },
  PUPPET_BAD: {
    key: 'PUPPET_BAD',
    title: 'BAD END',
    subtitle: '— 傀儡 —',
    description: 'こうして魔王は打倒された。\n魔王とはいったい何だったのか。博士の目的は何だったのか。\nしかし、それはこれからのあなたには関係のないことだろう。\nなぜならあなたは博士の忠実な傀儡（ドール）なのだから＿＿＿。',
    color: 0x666666,
    bgColor: '#1a0000'
  },
  NORMAL_EVERYDAY: {
    key: 'NORMAL_EVERYDAY',
    title: 'NORMAL END',
    subtitle: '— 日常 —',
    description: 'こうして魔王は打倒された。\n勇者は博士の研究所に戻り、ほどほどに命令を聞きながら日々を過ごしている。\nなんの変哲もない日常。\n結局魔王とはいったい何だったのか。\n彼女は本当に倒さなければならなかったのか。\nその答えを知る機会はもう一生訪れない。',
    color: 0xE5E7EB,
    bgColor: '#0a0a14'
  },
  NORMAL_USELESS: {
    key: 'NORMAL_USELESS',
    title: 'NORMAL END',
    subtitle: '— 役立たず —',
    description: '勇者は魔王を倒せなかった。\nそれとも、倒さなかったのだろうか。勇者にはわからなかった。\n少なくとも、会話をした中で、魔王が完全に悪だとは思えなかったのだろう。\n魔王は悪い奴ではないのかもしれないと博士に伝えるため、研究室に戻った。',
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
  
  // エンディングの呼び出しは、BossScene内の遷移ロジックで行うため、
  // デフォルトのフォールバックとして現在の状態を返すようにしておく
  if (f.brutality === 0) return MOT.ENDINGS.TRUE_PACIFIST;
  if (f.showMercy === 0) return MOT.ENDINGS.PUPPET_BAD;
  return MOT.ENDINGS.NORMAL_EVERYDAY;
};
