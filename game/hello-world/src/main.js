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
  });
})();
