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
    // Musical note for barrier counter
    playMusicalNote: function(freq) {
      playTone(freq, 'square', 0.1, 0.1);
    },
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
    // Crack sound (high-pitch glass snap)
    playCrack: function () {
      resume();
      // Short noise burst for the snap
      const noiseGain = ctx.createGain();
      const noise = ctx.createBufferSource();
      const bufferSize = ctx.sampleRate * 0.05;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      noise.buffer = buffer;
      noiseGain.gain.setValueAtTime(0.5, ctx.currentTime);
      noiseGain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.05);
      noise.connect(noiseGain);
      noiseGain.connect(ctx.destination);
      noise.start();

      // Sharp high-frequency metallic snaps
      [6000, 8500, 11000].forEach((freq) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(freq + Math.random()*1000, ctx.currentTime);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.03 + Math.random()*0.02);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.06);
      });
    },
    // Shatter sound (Heavy glass break with impact)
    playShatter: function () {
      resume();
      
      // Impact thump
      const thumpOsc = ctx.createOscillator();
      const thumpGain = ctx.createGain();
      thumpOsc.type = 'sine';
      thumpOsc.frequency.setValueAtTime(150, ctx.currentTime);
      thumpOsc.frequency.exponentialRampToValueAtTime(20, ctx.currentTime + 0.2);
      thumpGain.gain.setValueAtTime(0.8, ctx.currentTime);
      thumpGain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.2);
      thumpOsc.connect(thumpGain);
      thumpGain.connect(ctx.destination);
      thumpOsc.start();
      thumpOsc.stop(ctx.currentTime + 0.2);

      // Noise burst for glass scattering
      const noiseGain = ctx.createGain();
      const noise = ctx.createBufferSource();
      const bufferSize = ctx.sampleRate * 0.5;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      noise.buffer = buffer;
      noiseGain.gain.setValueAtTime(0.6, ctx.currentTime);
      noiseGain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.4);
      noise.connect(noiseGain);
      noiseGain.connect(ctx.destination);
      noise.start();

      // Multiple glass shards tinkling
      for (let i = 0; i < 8; i++) {
        let delay = Math.random() * 0.15;
        let freq = 4000 + Math.random() * 6000;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);
        gain.gain.setValueAtTime(0.2, ctx.currentTime + delay);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + delay + 0.2 + Math.random()*0.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + delay);
        osc.stop(ctx.currentTime + delay + 0.5);
      }
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
    },
    // ジャストガード時の音階再生（シドレミファソラシ）
    playJustGuardNote: function (index) {
      resume();
      // B4, C5, D5, E5, F5, G5, A5, B5
      const scale = [493.88, 523.25, 587.33, 659.25, 698.46, 783.99, 880.00, 987.77];
      const freq = scale[index % 8];
      
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.1);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    }
  };
})();
