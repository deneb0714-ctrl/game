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
    },
    // Crack sound (high-pitch short click)
    playCrack: function () {
      resume();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(8000, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1000, ctx.currentTime + 0.05);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.05);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.05);
    },
    // Shatter sound (white noise + multiple high pitch metallic frequencies)
    playShatter: function () {
      resume();
      // Noise burst
      const noiseGain = ctx.createGain();
      const noise = ctx.createBufferSource();
      const bufferSize = ctx.sampleRate * 0.3;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      noise.buffer = buffer;
      noiseGain.gain.setValueAtTime(0.4, ctx.currentTime);
      noiseGain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.3);
      noise.connect(noiseGain);
      noiseGain.connect(ctx.destination);
      noise.start();

      // High pitch metallic tones
      [4000, 6000, 8000].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq + Math.random()*500, ctx.currentTime);
        gain.gain.setValueAtTime(0.1, ctx.currentTime + idx * 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + idx * 0.02);
        osc.stop(ctx.currentTime + 0.3);
      });
    },
    // 犬猫スター補助魔法音（不思議な鈴のような音）
    playMagic: function () {
      resume();
      const freqs = [880, 1100, 1320, 1760];
      freqs.forEach((f, i) => {
        setTimeout(() => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(f, ctx.currentTime);
          gain.gain.setValueAtTime(0.12, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.4);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start();
          osc.stop(ctx.currentTime + 0.4);
        }, i * 80);
      });
    }
  };
})();
