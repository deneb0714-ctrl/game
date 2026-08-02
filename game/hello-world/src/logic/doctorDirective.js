// =============================================
// doctorDirective.js – 博士の戦闘中指示システム
// =============================================
window.MOT = window.MOT || {};

MOT.DoctorDirective = {
  // 現在表示中の指示
  currentDirective: null,   // { dx, dy, text }
  directiveContainer: null,
  directiveTextObj: null,   // テキストを後から変更するための参照
  directiveTimer: 0,
  waitTimer: 0,
  isWaiting: true,
  isObeyChecked: false,     // 一度従ったかチェック
  waitDuration: 0,          // 次の指示まで待つ時間（ms）
  directiveDuration: 4000,  // 指示表示時間（ms）

  // 9方向の指示テーブル
  // dx: -1=後退, 0=横移動なし, 1=前進  dy: -1=上, 0=縦移動なし, 1=下
  directives: [
    { dx:  1, dy:  0, text: '「前進しろ！」' },
    { dx: -1, dy:  0, text: '「後退しろ！」' },
    { dx:  0, dy: -1, text: '「上に移動しろ！」' },
    { dx:  0, dy:  1, text: '「下に移動しろ！」' },
    { dx:  1, dy: -1, text: '「右上に移動しろ！」' },
    { dx:  1, dy:  1, text: '「右下に移動しろ！」' },
    { dx: -1, dy: -1, text: '「左上に移動しろ！」' },
    { dx: -1, dy:  1, text: '「左下に移動しろ！」' },
    { dx:  0, dy:  0, text: '「その場を維持しろ！」' },
  ],

  // プレイヤー位置から出せる指示をフィルタリング
  getValidDirectives: function(player) {
    return this.directives.filter(function(d) {
      // プレイヤーのグリッド座標（currentCol:0〜2, currentLane:0〜2）で判定
      if (d.dx === -1 && player.currentCol <= 0) return false;     // 左には行けない
      if (d.dx ===  1 && player.currentCol >= 2) return false;     // 右には行けない
      if (d.dy === -1 && player.currentLane <= 0) return false;    // 上には行けない
      if (d.dy ===  1 && player.currentLane >= 2) return false;    // 下には行けない
      return true;
    });
  },

  // 初期化（シーン作成時に呼び出す）
  init: function() {
    this.currentDirective = null;
    this.directiveContainer = null;
    this.directiveTimer = 0;
    this.waitTimer = 0;
    this.isWaiting = true;
    this.isObeyChecked = false;
    this.waitDuration = Phaser.Math.Between(3000, 6000);
  },

  // 指示吹き出しを表示する
  showDirective: function(scene, directive, player) {
    if (this.directiveContainer) {
      this.directiveContainer.destroy();
      this.directiveContainer = null;
    }

    this.currentDirective = directive;
    this.isObeyChecked = false;
    this.startX = player.x;
    this.startY = player.y;

    // キャラクターのセリフと同じダイアログボックス
    var w = 1920, h = 1080;
    var boxH = 280;
    var boxY = h - boxH - 20;

    var container = scene.add.container(0, 0).setDepth(110);
    this.directiveContainer = container;

    // 背景
    var box = scene.add.graphics();
    box.fillStyle(0x0a0a1a, 0.92);
    box.fillRoundedRect(60, boxY, w - 120, boxH, 12);
    box.lineStyle(2, 0x39FF14, 0.8); // デバイス越しの通信枠（緑色）
    box.strokeRoundedRect(60, boxY, w - 120, boxH, 12);
    container.add(box);

    // 博士の顔アイコン (左端の枠内)
    // 枠に合わせて少し大きくする (半径75 = 直径150)
    var face = scene.add.image(140, boxY + 100, 'doctor_normal');
    // もっと近づける（ズームアップ）
    var scaleRatio = 750 / face.height; 
    face.setScale(scaleRatio);
    var maskShape = scene.make.graphics();
    this.currentMaskShape = maskShape;
    maskShape.fillStyle(0xffffff);
    maskShape.fillCircle(140, boxY + 100, 75);
    var mask = maskShape.createGeometryMask();
    face.setMask(mask);
    // Y座標を少し上げて顔が中心に来るように調整
    face.setY(boxY + 100 + (face.height * scaleRatio) * 0.35);
    
    // 背景の黒丸（装飾）
    var faceBg = scene.add.circle(140, boxY + 100, 79, 0x000000);
    var faceBorder = scene.add.circle(140, boxY + 100, 79).setStrokeStyle(2, 0xFFFFAA);
    container.add([faceBg, face, faceBorder]);

    // 「博士」ラベル
    var nameText = scene.add.text(210, boxY + 15, '博士 📡', {
      fontFamily: '"DotGothic16"',
      fontSize: '44px',
      color: '#39FF14'
    });
    container.add(nameText);

    // 指示テキスト
    var txt = scene.add.text(210, boxY + 60, directive.text, {
      fontFamily: '"DotGothic16"',
      fontSize: '40px',
      color: '#FFFFFF',
      wordWrap: { width: w - 330, useAdvancedWrap: true },
      lineSpacing: 8
    });
    this.directiveTextObj = txt;
    container.add(txt);

    // プレイヤーの移動先ハイライト表示
    this.targetCol = player.currentCol + directive.dx;
    this.targetLane = player.currentLane + directive.dy;
    var targetX = [150, 300, 450][this.targetCol];
    var targetY = [220, 460, 700][this.targetLane];

    if (targetX !== undefined && targetY !== undefined) {
      var highlight = scene.add.graphics();
      var size = 100;
      highlight.lineStyle(4, 0xFFFFAA, 1);
      highlight.fillStyle(0xFFFF00, 0.2);
      highlight.fillRect(targetX - size/2, targetY - size/2, size, size);
      highlight.strokeRect(targetX - size/2, targetY - size/2, size, size);
      scene.tweens.add({ targets: highlight, alpha: 0.3, yoyo: true, repeat: -1, duration: 500 });
      this.currentHighlight = highlight;
      container.add(highlight);
    }

    // フェードイン
    container.setAlpha(0);
    scene.tweens.add({ targets: container, alpha: 1, duration: 300 });
  },

  // 指示を消す（フェードアウト）
  hideDirective: function(scene) {
    if (this.directiveContainer) {
      var c = this.directiveContainer;
      scene.tweens.add({
        targets: c, alpha: 0, duration: 400,
        onComplete: () => { 
          if (c) c.destroy(); 
          if (this.currentMaskShape) {
            this.currentMaskShape.destroy();
            this.currentMaskShape = null;
          }
        }
      });
      this.directiveContainer = null;
    }
    this.currentDirective = null;
  },

  // プレイヤーが指示に従っているか判定
  checkObedience: function(player) {
    if (!this.currentDirective || this.isObeyChecked) return;

    var d = this.currentDirective;
    var movedX = player.x - this.startX;
    var movedY = player.y - this.startY;
    var threshold = 25; // 判定の最低移動量（px）

    if (d.dx === 0 && d.dy === 0) {
      // 「その場を維持しろ！」の場合：1.5秒経過しても一定以上動いていなければ成功
      if (this.directiveTimer > 1500 && Math.abs(movedX) < 15 && Math.abs(movedY) < 15) {
        this.isObeyChecked = true;
        MOT.incrementDoctorObeyCount();
        if (this.directiveTextObj) {
          this.directiveTextObj.setText('「よくやった」');
        }
        if (this.currentHighlight) {
          this.currentHighlight.destroy();
          this.currentHighlight = null;
        }
      }
      return;
    }

    // 黄色くハイライトしてるところを踏んでるときだけポイント加算させる
    if (player.currentCol === this.targetCol && player.currentLane === this.targetLane) {
      this.isObeyChecked = true;
      MOT.incrementDoctorObeyCount();
      
      // 従った場合は「よくやった」に表示を変更
      if (this.directiveTextObj) {
        this.directiveTextObj.setText('「よくやった」');
      }
      if (this.currentHighlight) {
        this.currentHighlight.destroy();
        this.currentHighlight = null;
      }
    }
  },

  // update（毎フレーム呼び出す）
  update: function(scene, delta, player, dialogActive) {
    if (dialogActive) {
      // キャラクターのセリフ表示中は指示を即座に隠す（isWaitingの状態に関わらず）
      if (this.directiveContainer) {
        // フェードアウトではなく即時破棄（セリフと重複させない）
        this.directiveContainer.destroy();
        this.directiveContainer = null;
      }
      if (this.currentMaskShape) {
        this.currentMaskShape.destroy();
        this.currentMaskShape = null;
      }
      this.currentDirective = null;
      this.isWaiting = true;
      this.waitTimer = 0;
      this.waitDuration = Phaser.Math.Between(3000, 6000);
      return;
    }
    if (this.isWaiting) {
      this.waitTimer += delta;
      if (this.waitTimer >= this.waitDuration) {
        this.waitTimer = 0;
        this.isWaiting = false;
        this.directiveTimer = 0;

        // 有効な指示を選択
        var valid = this.getValidDirectives(player);
        if (valid.length > 0) {
          var chosen = valid[Phaser.Math.Between(0, valid.length - 1)];
          this.showDirective(scene, chosen, player);
        } else {
          // 有効な指示がなければ待機に戻る
          this.isWaiting = true;
          this.waitDuration = Phaser.Math.Between(3000, 6000);
        }
      }
    } else {
      // 指示表示中
      this.directiveTimer += delta;

      // 服従チェック
      this.checkObedience(player);

      if (this.directiveTimer >= this.directiveDuration) {
        this.hideDirective(scene);
        this.isWaiting = true;
        this.waitDuration = Phaser.Math.Between(5000, 10000);
      }
    }
  },

  // シーン破棄時のクリーンアップ
  destroy: function() {
    if (this.directiveContainer) {
      this.directiveContainer.destroy();
      this.directiveContainer = null;
    }
    if (this.currentMaskShape) {
      this.currentMaskShape.destroy();
      this.currentMaskShape = null;
    }
    this.currentDirective = null;
  }
};

