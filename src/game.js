/**
 * RE:UNIT — Global Game State Manager
 * Singleton that persists across scenes.
 */

class GameState {
  constructor() {
    this.reset();
  }

  reset() {
    // Player stats
    this.playerHP = 100;
    this.playerMaxHP = 100;
    this.ultimateCharge = 0;

    // Morality tracking
    this.killCount = 0;
    this.spareCount = 0;
    this.hesitationCount = 0;
    this.totalEncounters = 0;

    // Progression
    this.currentStage = 'highway';
    this.stageIndex = 0;
    this.score = 0;

    // Route state
    this.currentRoute = 'neutral'; // 'neutral', 'kill', 'spare'

    // Flags
    this.isFirstPlay = true;
    this.hasSeenEnding = false;
    this.dialogueFlags = {};
  }

  /**
   * Record a kill and update route tendency
   */
  recordKill() {
    this.killCount++;
    this.totalEncounters++;
    this._updateRoute();
  }

  /**
   * Record a spare and update route tendency
   */
  recordSpare() {
    this.spareCount++;
    this.totalEncounters++;
    this._updateRoute();
  }

  /**
   * Record hesitation (hovering over spare/kill choice)
   */
  recordHesitation() {
    this.hesitationCount++;
  }

  /**
   * Get kill ratio (0..1)
   */
  getKillRatio() {
    if (this.totalEncounters === 0) return 0;
    return this.killCount / this.totalEncounters;
  }

  /**
   * Charge ultimate by a given amount
   */
  addUltimateCharge(amount) {
    this.ultimateCharge = Math.min(100, this.ultimateCharge + amount);
  }

  /**
   * Consume ultimate charge
   */
  useUltimate() {
    if (this.ultimateCharge >= 100) {
      this.ultimateCharge = 0;
      return true;
    }
    return false;
  }

  /**
   * Determine route state based on morality
   */
  _updateRoute() {
    const ratio = this.getKillRatio();
    if (ratio >= 0.8) {
      this.currentRoute = 'kill';
    } else if (this.spareCount >= 5) {
      this.currentRoute = 'spare';
    } else {
      this.currentRoute = 'neutral';
    }
  }

  /**
   * Save to localStorage
   */
  save() {
    const data = {
      playerHP: this.playerHP,
      playerMaxHP: this.playerMaxHP,
      ultimateCharge: this.ultimateCharge,
      killCount: this.killCount,
      spareCount: this.spareCount,
      hesitationCount: this.hesitationCount,
      totalEncounters: this.totalEncounters,
      currentStage: this.currentStage,
      stageIndex: this.stageIndex,
      score: this.score,
      currentRoute: this.currentRoute,
      dialogueFlags: this.dialogueFlags,
    };
    localStorage.setItem('reunit_save', JSON.stringify(data));
  }

  /**
   * Load from localStorage
   */
  load() {
    const raw = localStorage.getItem('reunit_save');
    if (raw) {
      const data = JSON.parse(raw);
      Object.assign(this, data);
      return true;
    }
    return false;
  }

  /**
   * Check if save exists
   */
  hasSave() {
    return localStorage.getItem('reunit_save') !== null;
  }

  /**
   * Delete save
   */
  deleteSave() {
    localStorage.removeItem('reunit_save');
  }
}

// Singleton
const gameState = new GameState();
export default gameState;
