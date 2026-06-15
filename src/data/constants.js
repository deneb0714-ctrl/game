/**
 * RE:UNIT — Game Constants
 * All magic numbers and configuration values live here.
 */

// ── Display ─────────────────────────────────
export const GAME_WIDTH = 1920;
export const GAME_HEIGHT = 1080;

// ── Colors ──────────────────────────────────
export const COLORS = {
  BG_DARK:     0x0B0F1A,
  UI_DARK:     0x111827,
  CYAN:        0x00D1FF,
  RED_WARN:    0xFF3B3B,
  WHITE:       0xE5E7EB,
  GRAY:        0x6B7280,
  CYAN_HEX:    '#00D1FF',
  RED_HEX:     '#FF3B3B',
  WHITE_HEX:   '#E5E7EB',
  BG_HEX:      '#0B0F1A',
  UI_DARK_HEX: '#111827',
  GRAY_HEX:    '#6B7280',
};

// ── Player ──────────────────────────────────
export const PLAYER = {
  SPEED: 420,
  MAX_HP: 100,
  FIRE_RATE: 120,        // ms between shots
  BULLET_SPEED: 1200,
  BULLET_DAMAGE: 10,
  INVINCIBLE_TIME: 800,  // ms after getting hit
  ULTIMATE_CHARGE_MAX: 100,
  START_X: 200,
  START_Y: 700,
  WIDTH: 48,
  HEIGHT: 64,
};

// ── Enemy ───────────────────────────────────
export const ENEMY = {
  GRUNT: {
    HP: 30,
    SPEED: 120,
    FIRE_RATE: 1200,
    BULLET_SPEED: 400,
    SCORE: 100,
  },
  GRUNT_FAST: {
    HP: 20,
    SPEED: 220,
    FIRE_RATE: 800,
    BULLET_SPEED: 500,
    SCORE: 150,
  },
  GRUNT_HEAVY: {
    HP: 60,
    SPEED: 80,
    FIRE_RATE: 2000,
    BULLET_SPEED: 300,
    SCORE: 200,
  },
  MIDBOSS: {
    HP: 300,
    SPEED: 60,
    FIRE_RATE: 600,
    BULLET_SPEED: 350,
    SCORE: 1000,
  },
  BOSS: {
    HP: 800,
    SPEED: 40,
    FIRE_RATE: 400,
    BULLET_SPEED: 300,
    SCORE: 5000,
  },
};

// ── Bullet Patterns ─────────────────────────
export const PATTERNS = {
  LINEAR:    'linear',
  RADIAL:    'radial',
  AIMED:     'aimed',
  WAVE:      'wave',
  SPIRAL:    'spiral',
  SCATTER:   'scatter',
};

// ── Combat ──────────────────────────────────
export const COMBAT = {
  SCREEN_SHAKE_NORMAL: { duration: 120, intensity: 4 },
  SCREEN_SHAKE_HEAVY:  { duration: 400, intensity: 20 },
  DAMAGE_FLASH_DURATION: 100,
};

// ── UI ──────────────────────────────────────
export const UI = {
  DIALOGUE_SPEED: 35,    // ms per character
  HP_BAR_WIDTH: 320,
  HP_BAR_HEIGHT: 20,
  ULTIMATE_BAR_WIDTH: 240,
  ULTIMATE_BAR_HEIGHT: 16,
  FONT_UI: 'Orbitron',
  FONT_DIALOGUE: 'Noto Sans JP',
};

// ── Stages ──────────────────────────────────
export const STAGES = {
  HIGHWAY:   'highway',
  SUBWAY:    'subway',
  LAB:       'lab',
  TOWER:     'tower',
};

// ── Morality ────────────────────────────────
export const MORALITY = {
  KILL_ROUTE_THRESHOLD: 0.8,    // 80% kill rate
  SPARE_ROUTE_MIN_SPARES: 5,
};

// ── Z-Depths ────────────────────────────────
export const DEPTH = {
  BG_FAR:       0,
  BG_MID:       10,
  BG_NEAR:      20,
  GROUND:       30,
  ENTITIES:     50,
  BULLETS:      60,
  PLAYER:       70,
  EFFECTS:      80,
  UI:           100,
  DIALOGUE:     120,
  OVERLAY:      200,
};
