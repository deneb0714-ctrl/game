// =============================================
// endings.js – エンディング判定ロジック
// =============================================
window.MOT = window.MOT || {};

MOT.ENDINGS = {
  END_ORPHAN: {
    key: 'END_ORPHAN',
    title: 'END',
    subtitle: '— 身寄りのない勇者 —',
    description: '博士は、自分に向かって引き金を引いた。\n勇者が止めようとするも間に合わず、博士は満足したかの様に自害をした。\n\nこうして主人公は自由の身となった。\n身寄りをなくした主人公は魔王に拾われることとなった。',
    color: 0x4FD1FF,
    bgColor: '#050814'
  },
  bad_puppet: {
    key: 'bad_puppet',
    title: 'BAD END',
    subtitle: '— 傀儡 —',
    description: 'こうして魔王は打倒された。魔王とはいったい何だったのか。\n博士の目的は何だったのか。しかし、それはこれからのあなたには関係のないことだろう。\nなぜならあなたは博士の忠実な傀儡（ドール）なのだから＿＿＿。',
    color: 0xFF0000,
    bgColor: '#110000'
  },
  normal_daily: {
    key: 'normal_daily',
    title: 'NORMAL END',
    subtitle: '— 日常 —',
    description: 'こうして魔王は打倒された。主人公は博士の研究所に戻った。\n結局魔王とはいったい何だったのか。\n彼女は本当に倒さなければならなかったのか。\nその答えを知る機会はもう一生訪れない。',
    color: 0xE5E7EB,
    bgColor: '#0a0a14'
  },
  normal_useless: {
    key: 'normal_useless',
    title: 'NORMAL END',
    subtitle: '— 役立たず —',
    description: '主人公は魔王を倒せなかった。それとも、倒さなかったのだろうか。\n少なくとも、会話をした中で魔王が完全に悪だとは思えなかったのだろう。\n\nだが、博士にはそんな言い分は通じなかった。\n簡単な役目すらこなせないお人形は、処分される運命にあった。',
    color: 0x9CA3AF,
    bgColor: '#05050a'
  },
  bad_shutdown: {
    key: 'bad_shutdown',
    title: 'BAD END',
    subtitle: '— 強制シャットダウン —',
    description: '博士に銃を構えた主人公だったが、残念ながらその権限はなかった。\n博士によって機能は強制的に停止され、二度と目覚めることはなかった。',
    color: 0xFF0000,
    bgColor: '#110000'
  },
  hidden_truedemon: {
    key: 'hidden_truedemon',
    title: 'TRUE END',
    subtitle: '— 真なる魔王 —',
    description: '魔王は約束通り誰も殺さなかった。\nしかし、それは慈悲ではなかった。\n\n博士を含め、全ては洗脳され、魔王の忠実なしもべとなった。\n新たな支配者のもと、歪な平和が訪れたのである。',
    color: 0xFFD700,
    bgColor: '#1a1a00'
  },
  BAD_GAMEOVER: {
    key: 'BAD_GAMEOVER',
    title: 'GAME OVER',
    subtitle: '— 破壊された人形 —',
    description: '「こんなところでやられるとはなさけない」\n\n勇者は力尽き、冷たい大地に倒れた。\n人造人間は静かに機能を停止した。',
    color: 0xFF4B6E,
    bgColor: '#140005'
  },
  normal_unresistable: {
    key: 'normal_unresistable',
    title: 'NORMAL END',
    subtitle: '— 抗えない —',
    description: '勇者の意思とは裏腹に、見逃したはずの幹部たちを見つけ殺していく。\nどれだけ引き金を引かないよう抗ったとて、その手は言うことを聞かなかった。',
    color: 0x9CA3AF,
    bgColor: '#05050a'
  }
};

MOT.decideEnding = function () {
  const f = MOT.flags;
  if (f.diedCount > 0) return MOT.ENDINGS.BAD_GAMEOVER;
  
  const allAlive = (!f.killedBoss1 && !f.killedBoss2 && !f.killedTwins);
  const allKilled = (f.killedBoss1 && f.killedBoss2 && f.killedTwins);
  const someKilled = (!allAlive && !allKilled);

  // 幹部を全員殺す -> 傀儡
  if (allKilled) {
    return MOT.ENDINGS.bad_puppet;
  }

  // 幹部を一部殺してる
  if (someKilled) {
    if (!f.killedDemonLord) {
      // 魔王を生かす -> YES -> 役立たず
      return MOT.ENDINGS.normal_useless;
    } else {
      // 魔王を生かす -> NO -> ドルポがたまってるか？
      if (f.dollPoints >= 3) { // TODO: ドルポがたまっているの閾値(仮に3とする)
        return MOT.ENDINGS.normal_daily;
      } else {
        return MOT.ENDINGS.bad_shutdown;
      }
    }
  }

  // 幹部が全員生きてる
  if (allAlive) {
    if (!f.killedDemonLord) {
      // 魔王を生かす -> YES -> ドールポイントが100以下か？
      if (f.dollPoints <= 100) { // 100以下＝YES
        if (f.killingIntent >= 100) {
          // 殺意がたまっている＝YES -> 真の魔王
          return MOT.ENDINGS.hidden_truedemon;
        } else {
          // 殺意がたまっている＝NO -> 身寄りのない勇者
          return MOT.ENDINGS.END_ORPHAN;
        }
      } else {
        // ドールポイントが100以下＝NO -> 身寄りのない勇者
        return MOT.ENDINGS.END_ORPHAN;
      }
    } else {
      // 魔王を生かす -> NO -> 抗えない
      // TODO: "抗えない"エンディングは今normal_dailyなどの代わりに追加するか、別途新設する。
      // 「抗えない」＝傀儡ではないがノーマルエンドの一つ。
      return {
        key: 'normal_unresistable',
        title: 'NORMAL END',
        subtitle: '— 抗えない —',
        description: '勇者の意思とは裏腹に、見逃したはずの幹部たちを見つけ殺していく。\nどれだけ引き金を引かないよう抗ったとて、その手は言うことを聞かなかった。',
        color: 0x9CA3AF,
        bgColor: '#05050a'
      };
    }
  }
  
  return MOT.ENDINGS.normal_daily; // Fallback
};
