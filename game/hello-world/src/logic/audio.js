// =============================================
// audio.js – 8-bit Sound Synthesis (Undertale Style)
// =============================================
window.MOT = window.MOT || {};

MOT.Audio = (function () {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();

  function resume() {
    if (ctx && ctx.state === 'suspended') {
      ctx.resume();
    }
  }

  // Global resume on interaction
  window.addEventListener('click', resume, { once: false });
  window.addEventListener('keydown', resume, { once: false });

  function playTone(freq, type, duration, volume) {
    resume();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type || 'square';
    osc.frequency.setValueAtTime(freq, ctx.currentTime);

    gain.gain.setValueAtTime(volume || 0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + duration);
  }

  return {
    // Typewriter bleep
    playBleep: function () {
      playTone(Phaser.Math.Between(200, 300), 'square', 0.05, 0.05);
    },
    // Shot sound
    playShot: function () {
      playTone(800, 'square', 0.1, 0.03);
    },
    // Hit/Explosion crunch
    playExplosion: function () {
      resume();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const noise = ctx.createBufferSource();
      
      const bufferSize = ctx.sampleRate * 0.2;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      
      noise.buffer = buffer;
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.2);
      
      noise.connect(gain);
      gain.connect(ctx.destination);
      noise.start();
    },
    // Choice selection
    playSelect: function () {
      playTone(400, 'square', 0.1, 0.1);
      setTimeout(() => playTone(600, 'square', 0.1, 0.1), 50);
    },
    // Energy Full / Special
    playSpecial: function () {
      playTone(200, 'sawtooth', 0.5, 0.2);
      playTone(400, 'sawtooth', 0.5, 0.2);
      playTone(800, 'sawtooth', 0.5, 0.2);
    },
    // Clock tick
    playTick: function () {
      playTone(1500, 'square', 0.02, 0.03);
    },
    // Shutdown sound (pitch drop)
    playShutdown: function () {
      resume();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(300, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(10, ctx.currentTime + 1.2);

      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.2);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 1.2);
    }
  };
})();
