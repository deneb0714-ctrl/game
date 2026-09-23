// =============================================
// main.js – ゲーム起動エントリーポイント
// =============================================
(function () {
  'use strict';

  // Wait for DOM and Phaser to be ready
  window.addEventListener('DOMContentLoaded', function () {
    console.log('🎮 真理のマリオネット – Marionette of Truth');
    console.log('   Starting game...');

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
