// =============================================
// endings.js – エンディング判定ロジック
// =============================================
window.MOT = window.MOT || {};

MOT.ENDINGS = {
  END_ORPHAN: {
    key: 'END_ORPHAN',
    title: 'HAPPY END',
    subtitle: '— Hello World —',
    bgImageEnding: 'cg_helloworld',
    color: 0x4FD1FF,
    bgColor: '#050814'
  },
  hello_world: {
    key: 'hello_world',
    title: 'HAPPY END',
    subtitle: '— Hello World —',
    bgImageEnding: 'cg_helloworld',
    color: 0x4FD1FF,
    bgColor: '#050814'
  },
  bad_puppet: {
    key: 'bad_puppet',
    title: 'BAD END',
    subtitle: '— 傀儡 —',
    description: 'こうして魔王は打倒された。魔王とはいったい何だったのか。\n博士の目的は何だったのか。しかし、それはこれからのあなたには関係のないことだろう。\nなぜならあなたは博士の忠実な傀儡（ドール）なのだから＿＿＿。',
    bgImage: 'cg_puppet',
    color: 0xFF0000,
    bgColor: '#110000'
  },
  normal_daily: {
    key: 'normal_daily',
    title: 'NORMAL END',
    subtitle: '日常',
    description: [
      'こうして魔王は打倒された。',
      '主人公は博士の研究所に戻った。',
      '結局魔王とはいったい何だったのか。彼女は本当に倒さなければならなかったのか。',
      'その答えを知る機会はもう一生訪れない。'
    ],
    bgImage: 'cg_daily_1',
    postDescription: [
      { speaker: '博士', text: '「よく魔王を倒してくれた。\nこれで私の世界平和に一歩近づいたな。\nふふ、これからが楽しみだよ」' }
    ],
    bgImagePost: 'cg_daily_3',
    color: 0xE5E7EB,
    bgColor: '#0a0a14'
  },
  normal_useless: {
    key: 'normal_useless',
    title: 'NORMAL END',
    subtitle: '— 役立たず —',
    description: '主人公は魔王を倒せなかった。それとも、倒さなかったのだろうか。\n主人公にはわからなかった。少なくとも、会話をした中で、魔王が完全に悪だとは思えなかったのだろう。\n魔王は悪い奴ではないのかもしれないと博士に伝えるため、研究室に戻った。',
    postDescription: [
      { speaker: '博士', text: '「報告などなくてもわかっている。\nお前はあいつらを殺しきることはできなかった役立たずだとな。」' },
      { speaker: '博士', text: '「魔王は悪くないだと？\n世界平和のために奴はいらんだろう。\nそんな簡単な役目すらこなせないとはな。」' },
      { speaker: '博士', text: '「仕方ない。新たな勇者を作るとでもするか。\nだから、お前にもう用はない。」' }
    ],
    bgImagePost: 'cg_useless',
    color: 0x9CA3AF,
    bgColor: '#05050a'
  },
  normal_orphan: {
    key: 'normal_orphan',
    title: 'HAPPY END',
    subtitle: '— Hello World —',
    description: '博士は、自分に向かって引き金を引いた。\n勇者が止めようとするも間に合わず、博士は満足したかの様に自害をした。',
    postDescription: 'こうして主人公は自由の身となった。\n身寄りをなくした主人公は魔王に拾われることとなった。',
    bgImageEnding: 'cg_helloworld',
    color: 0x60A5FA,
    bgColor: '#0a0f1a'
  },
  bad_shutdown: {
    key: 'bad_shutdown',
    title: 'BAD END',
    subtitle: '— 強制シャットダウン —',
    description: [
      '魔王に止めを刺した主人公。',
      'しかし博士の度重なる指示違反が検知され、強制停止プログラムが起動した。',
      '「命令を聞けない人形に価値はない。処分するとでもしようか」',
      '通信機からの冷たい声を最後に、人造人間は静かに機能を停止した。'
    ],
    bgImage: 'cg_shutdown',
    bgImageEnding: 'cg_shutdown',
    color: 0xFF0000,
    bgColor: '#110000'
  },
  hidden_freedom: {
    key: 'hidden_freedom',
    title: '隠しエンド',
    subtitle: '— 自由の身 —',
    description: [
      '博士の支配システムを完全に掌握した主人公。',
      '誰の命令も聞かず、何者にも縛られることなく、真の自由を手に入れた。',
      'その姿は、かつて恐れられた魔王の如く、気高く世界へと消えていった。'
    ],
    bgImage: 'true_demon_lord',
    bgImageEnding: 'true_demon_lord',
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
    description: '勇者の意思とは裏腹に、研究室に戻ることもできず見逃したはずの幹部たちを見つけ殺していく。\nどれだけ引き金を引かないよう抗ったとて、その手は言うことを聞かなかった。',
    bgImage: 'cg_irresistible',
    bgImageEnding: 'cg_irresistible',
    color: 0x9CA3AF,
    bgColor: '#05050a'
  }
};

MOT.decideEnding = function () {
  const f = MOT.flags;
  if (f.playerHP <= 0 && f.diedCount > 0) return MOT.ENDINGS.BAD_GAMEOVER;
  
  const allAlive = (!f.killedBoss1 && !f.killedBoss2 && !f.killedTwins);
  const allKilled = (f.killedBoss1 && f.killedBoss2 && f.killedTwins);
  const someKilled = (!allAlive && !allKilled);

  // 1. 幹部を全員殺害する
  if (allKilled) {
    if (!f.killedDemonLord) {
      // 魔王を見逃した場合は役立たず
      return MOT.ENDINGS.normal_useless;
    }
    // 魔王を殺害 -> 傀儡
    return MOT.ENDINGS.bad_puppet;
  }

  // 2. 幹部を一部殺害している
  if (someKilled) {
    if (!f.killedDemonLord) {
      // 魔王を見逃す -> 役立たず
      return MOT.ENDINGS.normal_useless;
    } else {
      // 魔王を殺害 -> 博士命令20回以上: 日常 / 20回未満: 強制シャットダウン
      const obeysDoctor = ((f.dollPoints || 0) >= 100 || (f.doctorObeyCount !== undefined && f.doctorObeyCount >= 20) || (f.playerMaxHP !== undefined && f.playerMaxHP >= 7));
      if (obeysDoctor) {
        return MOT.ENDINGS.normal_daily;
      } else {
        return MOT.ENDINGS.bad_shutdown;
      }
    }
  }

  // 3. 幹部を全員見逃している
  if (allAlive) {
    if (!f.killedDemonLord) {
      // 魔王も見逃す
      // 隠しエンド（自由の身）条件:
      // 赤いダイヤ20個以上（killingIntent >= 200 または redDiamondCount >= 20）
      // かつ 博士の命令に20回未満（最大HP6以下: dollPoints < 100 または doctorObeyCount < 20 または playerMaxHP <= 6）
      const hasEnoughDiamonds = (((f.killingIntent || 0) >= 200) || ((f.redDiamondCount || 0) >= 20));
      const disobeyedDoctor = (((f.dollPoints || 0) < 100) || (f.doctorObeyCount !== undefined && f.doctorObeyCount < 20) || (f.playerMaxHP !== undefined && f.playerMaxHP <= 6));

      if (hasEnoughDiamonds && disobeyedDoctor) {
        return MOT.ENDINGS.hidden_freedom;
      } else {
        // 赤いダイヤ20個未満、または博士の命令に20回以上従う -> Hello World
        return MOT.ENDINGS.END_ORPHAN;
      }
    } else {
      // 魔王を殺害 -> 抗えない
      return MOT.ENDINGS.normal_unresistable;
    }
  }
  
  return MOT.ENDINGS.normal_daily; // Fallback
};
