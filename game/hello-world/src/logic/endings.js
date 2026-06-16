// =============================================
// endings.js – エンディング判定ロジック
// =============================================
window.MOT = window.MOT || {};

MOT.ENDINGS = {
  BAD_GAMEOVER: {
    key: 'BAD_GAMEOVER',
    title: 'BAD END',
    subtitle: '— 糸の切れた人形 —',
    description: '主人公は力尽き、冷たい大地に倒れた。\n博士の命令は果たされることなく、\n人造人間は静かに機能を停止した。',
    color: 0x666666,
    bgColor: '#1a0000'
  },
  HIDDEN_BRAINWASH: {
    key: 'HIDDEN_BRAINWASH',
    title: '隠しEND – 洗脳覚醒',
    subtitle: '— 新たなる魔王 —',
    description: '溢れ出すエネルギーが主人公の意識を塗り替えた。\n容赦なく全てを薙ぎ払った記憶が、\n新たな"魔王"を生み出す糧となった。\n\n「…次は、博士の番だ。」',
    color: 0xFF2E2E,
    bgColor: '#140005'
  },
  DOCTOR_MARIONETTE: {
    key: 'DOCTOR_MARIONETTE',
    title: 'マリオネットEND',
    subtitle: '— 忠実なる人形 —',
    description: '博士の命令に忠実に従い、魔王を討伐した。\n疑問を持つことなく、慈悲を見せることもなく。\n\n「よくやった。次の任務だ。」\n博士の声に、人形は再び歩き出す。',
    color: 0x4FD1FF,
    bgColor: '#050814'
  },
  HAPPY_FRIEND: {
    key: 'HAPPY_FRIEND',
    title: '肩組みハッピーEND',
    subtitle: '— 真理の先に —',
    description: '下っ端を見逃し、両翼と心を通わせ、\n魔王の真実を聞いた主人公は、\n本当の敵が誰なのかを知った。\n\nかつての敵と肩を組み、新たな道を歩み始める。\n「お前、意外といい奴だな。」',
    color: 0x4FFF7F,
    bgColor: '#001408'
  },
  NORMAL: {
    key: 'NORMAL',
    title: 'ノーマルEND',
    subtitle: '— 任務完了 —',
    description: '魔王を倒し、任務は完了した。\nしかし主人公の胸には、\n拭いきれない違和感が残っていた。\n\n「…これで、本当に良かったのか。」',
    color: 0xE5E7EB,
    bgColor: '#0a0a14'
  }
};

MOT.decideEnding = function () {
  const f = MOT.flags;

  // バッド: 死亡した
  if (f.diedCount > 0) return MOT.ENDINGS.BAD_GAMEOVER;

  // 隠し洗脳: 残虐行動＋エネルギーMAX
  if (f.brutality >= 3 && f.maxEnergy) return MOT.ENDINGS.HIDDEN_BRAINWASH;

  // マリオネット: 博士に従い続ける＋容赦なし＋魔王の話を聞かない
  if (f.obeyDoctor >= 3 && f.showMercy === 0 && !f.heardDemonLord)
    return MOT.ENDINGS.DOCTOR_MARIONETTE;

  // 肩組みハッピー: 下っ端1見逃し＋両翼好感度＋魔王の話を聞く
  if (f.favor.minion1 >= 1 &&
      (f.favor.wingL + f.favor.wingR) >= 2 &&
      f.heardDemonLord)
    return MOT.ENDINGS.HAPPY_FRIEND;

  // ノーマル
  return MOT.ENDINGS.NORMAL;
};
