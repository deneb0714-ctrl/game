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
        playBleep: function (speaker) {
      if (!speaker) speaker = "";
      let freqBase = 250;
      let freqSpread = 50;

      if (speaker.includes('犬猫')) {
        freqBase = 800; freqSpread = 100;
      } else if (speaker.includes('エナリア')) {
        freqBase = 650; freqSpread = 50;
      } else if (speaker.includes('魔王')) {
        freqBase = 500; freqSpread = 50;
      } else if (speaker.includes('勇者') || speaker.includes('主人公') || (window.MOT && MOT.flags && speaker === MOT.flags.heroName)) {
        freqBase = 400; freqSpread = 50;
      } else if (speaker.includes('エディオ')) {
        freqBase = 300; freqSpread = 50;
      } else if (speaker.includes('トゥレロス')) {
        freqBase = 220; freqSpread = 40;
      } else if (speaker.includes('博士')) {
        freqBase = 160; freqSpread = 30;
      } else if (speaker.includes('クラトス')) {
        freqBase = 100; freqSpread = 20;
      }

      playTone(Phaser.Math.Between(Math.floor(freqBase - freqSpread/2), Math.floor(freqBase + freqSpread/2)), 'square', 0.05, 0.05);
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
    // 必殺技カットイン：エネルギー集中・チャージ音
    playCutinCharge: function () {
      resume();
      const osc = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc2.type = 'sawtooth';

      const now = ctx.currentTime;
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.2);

      osc2.frequency.setValueAtTime(70, now);
      osc2.frequency.exponentialRampToValueAtTime(440, now + 0.2);

      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.22, now + 0.17);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.23);

      osc.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc2.start(now);
      osc.stop(now + 0.25);
      osc2.stop(now + 0.25);
    },
    // 必殺技カットイン：開眼・解放インパクト音
    playCutinRelease: function () {
      resume();
      const now = ctx.currentTime;
      
      const snapOsc = ctx.createOscillator();
      const snapGain = ctx.createGain();
      snapOsc.type = 'sawtooth';
      snapOsc.frequency.setValueAtTime(1800, now);
      snapOsc.frequency.exponentialRampToValueAtTime(220, now + 0.15);
      snapGain.gain.setValueAtTime(0.3, now);
      snapGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      snapOsc.connect(snapGain);
      snapGain.connect(ctx.destination);
      snapOsc.start(now);
      snapOsc.stop(now + 0.2);

      const subOsc = ctx.createOscillator();
      const subGain = ctx.createGain();
      subOsc.type = 'sine';
      subOsc.frequency.setValueAtTime(160, now);
      subOsc.frequency.exponentialRampToValueAtTime(40, now + 0.45);
      subGain.gain.setValueAtTime(0.4, now);
      subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
      subOsc.connect(subGain);
      subGain.connect(ctx.destination);
      subOsc.start(now);
      subOsc.stop(now + 0.5);

      const bufferSize = Math.floor(ctx.sampleRate * 0.35);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.25));
      }
      const noise = ctx.createBufferSource();
      const noiseGain = ctx.createGain();
      noise.buffer = buffer;
      noiseGain.gain.setValueAtTime(0.25, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      noise.connect(noiseGain);
      noiseGain.connect(ctx.destination);
      noise.start(now);
    },
    // Clock tick
    playTick: function () {
      playTone(1500, 'square', 0.02, 0.03);
    },
    // カツカツ音（選択肢や硬い境界を叩くノック音）
    playClack: function () {
      resume();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1200, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(250, ctx.currentTime + 0.035);
      gain.gain.setValueAtTime(0.35, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.035);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.035);

      const noiseGain = ctx.createGain();
      const noise = ctx.createBufferSource();
      const bufferSize = Math.floor(ctx.sampleRate * 0.015);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
      }
      noise.buffer = buffer;
      noiseGain.gain.setValueAtTime(0.25, ctx.currentTime);
      noiseGain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.015);
      noise.connect(noiseGain);
      noiseGain.connect(ctx.destination);
      noise.start();
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
    // ジャストガード時の音階再生（シドレミファソラシ）    // 心臓の音（重低音ドックン…ドックン…）
    startHeartbeat: function () {
      this.stopHeartbeat();
      resume();
      let isPlaying = true;
      const beat = () => {
        if (!isPlaying) return;
        resume();
        const now = ctx.currentTime;
        // 第1音 (lub): 重低音ドッ (60Hz -> 30Hz)
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(65, now);
        osc1.frequency.exponentialRampToValueAtTime(30, now + 0.13);
        gain1.gain.setValueAtTime(0.45, now);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.13);
        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        osc1.start(now);
        osc1.stop(now + 0.14);

        // 第2音 (dub): クン (75Hz -> 35Hz)
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(80, now + 0.16);
        osc2.frequency.exponentialRampToValueAtTime(35, now + 0.28);
        gain2.gain.setValueAtTime(0.38, now + 0.16);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start(now + 0.16);
        osc2.stop(now + 0.29);
      };

      beat();
      const intervalId = setInterval(beat, 1100);
      this._heartbeatData = {
        stop: () => {
          isPlaying = false;
          clearInterval(intervalId);
        }
      };
    },
    stopHeartbeat: function () {
      if (this._heartbeatData) {
        this._heartbeatData.stop();
        this._heartbeatData = null;
      }
    },

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
