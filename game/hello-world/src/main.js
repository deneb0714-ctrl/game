// =============================================
// main.js – ゲーム起動エントリーポイント
// =============================================
(function () {
  'use strict';

  // Wait for DOM and Phaser to be ready
  window.addEventListener('DOMContentLoaded', function () {
    console.log('🎮 真理のマリオネット – Marionette of Truth');
    console.log('   Starting game...');

    // PhaserのSprite.playでアニメーションのframesが未ロード等の原因で空配列のとき、
    // Phaser内部でTypeError: Cannot read properties of undefined (reading 'duration') が発生して
    // ゲーム全体がクラッシュするのを完全に防御するプロテクション
    if (window.Phaser && Phaser.GameObjects && Phaser.GameObjects.Sprite) {
      var origPlay = Phaser.GameObjects.Sprite.prototype.play;
      Phaser.GameObjects.Sprite.prototype.play = function (key, ignoreIfPlaying) {
        try {
          var animKey = typeof key === 'string' ? key : (key && key.key);
          if (animKey && this.scene && this.scene.anims) {
            var anim = this.scene.anims.get(animKey);
            if (!anim || !anim.frames || anim.frames.length === 0) {
              console.warn('[SafePlay] Animation "' + animKey + '" has no valid frames. Skipping play to prevent crash.');
              return this;
            }
          }
          return origPlay.call(this, key, ignoreIfPlaying);
        } catch (err) {
          console.warn('[SafePlay Error] Caught animation play error for "' + key + '":', err);
          return this;
        }
      };
    }

    // Create Phaser game instance
    var game = new Phaser.Game(MOT.GAME_CONFIG);

    // Expose for debugging
    window.__GAME = game;

    // スマホ・モバイルブラウザの「上部タブ/アドレスバー見切れ（100vh問題）」対策：
    // 常にブラウザの実際の可視領域(innerHeight)を測定し、ゲームコンテナとPhaserのスケールを動的補正する
    function adjustViewport() {
      var root = document.getElementById('game-root');
      if (root) {
        root.style.width = window.innerWidth + 'px';
        root.style.height = window.innerHeight + 'px';
      }
      if (game && game.scale) {
        game.scale.refresh();
      }
    }
    
    window.addEventListener('resize', adjustViewport);
    window.addEventListener('orientationchange', function() {
      setTimeout(adjustViewport, 150);
      setTimeout(adjustViewport, 400);
    });
    adjustViewport();
  });
})();
