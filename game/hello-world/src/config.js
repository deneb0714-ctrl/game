// =============================================
// config.js – Phaser 設定 & カラーパレット定数
// =============================================
window.MOT = window.MOT || {};

MOT.COLORS = {
  BG_DARK: '#050814',
  ACCENT: '#4FD1FF',
  DANGER: '#FF4B6E',
  ENEMY_RED: '#FF2E2E',
  TEXT: '#E5E7EB',
  TEXT_SUB: '#9CA3AF',
  LAB: '#1F2933'
};

MOT.GAME_CONFIG = {
  type: Phaser.AUTO,
  parent: 'game-root',
  width: 1920,
  height: 1080,
  pixelArt: true,
  backgroundColor: '#050814',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  dom: {
    createContainer: true
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 },
      debug: false
    }
  },
  scene: [
    BootScene,
    TitleScene,
    StoryScene,
    GameScene,
    BossScene,
    EndingScene
  ]
};
