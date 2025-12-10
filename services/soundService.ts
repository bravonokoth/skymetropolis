/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

let audioCtx: AudioContext | null = null;
let masterGain: GainNode | null = null;

const initAudio = () => {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    masterGain = audioCtx.createGain();
    masterGain.gain.value = 0.2; // Keep volume reasonable
    masterGain.connect(audioCtx.destination);
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
};

const createOscillator = (type: OscillatorType, freq: number, duration: number, startTime: number, vol: number = 1) => {
    if (!audioCtx || !masterGain) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);
    gain.gain.setValueAtTime(vol, startTime);
    gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(startTime);
    osc.stop(startTime + duration);
};

export const SoundService = {
  init: () => initAudio(),
  
  playBuild: () => {
    initAudio();
    if (!audioCtx) return;
    const t = audioCtx.currentTime;
    // Mechanical click/thud
    createOscillator('square', 150, 0.1, t, 0.5);
    createOscillator('sine', 600, 0.05, t, 0.3);
  },

  playBulldoze: () => {
    initAudio();
    if (!audioCtx || !masterGain) return;
    const t = audioCtx.currentTime;
    // Low rumble
    createOscillator('sawtooth', 60, 0.2, t, 0.8);
    createOscillator('sawtooth', 40, 0.2, t + 0.1, 0.6);
  },

  playMoney: () => { // Goal/Reward
     initAudio();
     if (!audioCtx) return;
     const t = audioCtx.currentTime;
     // Coin / Success chime
     createOscillator('sine', 880, 0.1, t, 0.5);
     createOscillator('sine', 1100, 0.2, t + 0.1, 0.5);
  },
  
  playSave: () => {
      initAudio();
      if (!audioCtx) return;
      const t = audioCtx.currentTime;
      // Digital save confirmation
      createOscillator('sine', 440, 0.1, t, 0.5);
      createOscillator('sine', 554, 0.1, t + 0.1, 0.5); // Major 3rd
  },

  playError: () => {
      initAudio();
      if (!audioCtx) return;
      const t = audioCtx.currentTime;
      // Negative buzz
      createOscillator('sawtooth', 150, 0.15, t, 0.5);
      createOscillator('sawtooth', 100, 0.15, t + 0.1, 0.5);
  },

  playDisaster: () => {
     initAudio();
     if (!audioCtx || !masterGain) return;
     // Noise burst simulation for fire/explosion/storm
     const bufferSize = audioCtx.sampleRate * 2.0; // 2 seconds
     const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
     const data = buffer.getChannelData(0);
     for (let i = 0; i < bufferSize; i++) {
         data[i] = Math.random() * 2 - 1;
     }

     const noise = audioCtx.createBufferSource();
     noise.buffer = buffer;
     const gain = audioCtx.createGain();
     gain.gain.setValueAtTime(0.4, audioCtx.currentTime);
     gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 2.0);
     
     // Lowpass filter for "rumble"
     const filter = audioCtx.createBiquadFilter();
     filter.type = 'lowpass';
     filter.frequency.value = 500;

     noise.connect(filter);
     filter.connect(gain);
     gain.connect(masterGain);
     noise.start();
  }
};
