// ============ DOM REFS ============
const baristaEl = document.getElementById('barista');
const machineEl = document.getElementById('machine');
const cupPaul = document.getElementById('cup-paul');
const cupPhil = document.getElementById('cup-phil');
const paulEl = document.getElementById('paul');
const philEl = document.getElementById('phil');
const paulThought = document.getElementById('paul-thought');
const philThought = document.getElementById('phil-thought');
const machineSteam = document.getElementById('machine-steam');
const wandSteam = document.getElementById('wand-steam');
const grinder = document.getElementById('grinder');
const portafilter = document.getElementById('portafilter');
const pitcher = document.getElementById('pitcher');
const zzzPaul = document.getElementById('zzz-paul');
const zzzPhil = document.getElementById('zzz-phil');
const paulBubble = document.querySelector('.bubble-paul');
const philBubble = document.querySelector('.bubble-phil');
const cappuccinoBtn = document.getElementById('cappuccino-btn');
const flatwhiteBtn = document.getElementById('flatwhite-btn');
const soundToggleBtn = document.getElementById('sound-toggle');
const soundIcon = document.getElementById('sound-icon');

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// ============ AUDIO (procedural via Web Audio API) ============
// Cozy café atmosphere: layered ambient (room tone + distant murmur + light
// rain + sparse cup clinks + sparse lo-fi piano notes), soft brewing sounds.
let audioCtx = null;
let masterGain = null;
let ambientGain = null;       // umbrella gain for fade in/out
let ambientSources = [];      // BufferSources / Oscillators to stop on cleanup
let clinkTimerId = null;
let musicTimerId = null;
let musicNoteIndex = 0;
let soundEnabled = false;

function initAudio() {
    if (audioCtx) return audioCtx;
    try {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        masterGain = audioCtx.createGain();
        masterGain.gain.value = 1;
        masterGain.connect(audioCtx.destination);
    } catch (e) {
        console.warn('Audio not available:', e);
    }
    return audioCtx;
}

function makeWhiteNoiseBuffer(duration) {
    const ctx = audioCtx;
    const bufferSize = Math.floor(duration * ctx.sampleRate);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
    }
    return buffer;
}

// Pink noise (Paul Kellet's filter) — warmer than white, less rumbly than brown
function makePinkNoiseBuffer(duration) {
    const ctx = audioCtx;
    const bufferSize = Math.floor(duration * ctx.sampleRate);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
        const w = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + w * 0.0555179;
        b1 = 0.99332 * b1 + w * 0.0750759;
        b2 = 0.96900 * b2 + w * 0.1538520;
        b3 = 0.86650 * b3 + w * 0.3104856;
        b4 = 0.55000 * b4 + w * 0.5329522;
        b5 = -0.7616 * b5 - w * 0.0168980;
        data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
        b6 = w * 0.115926;
    }
    return buffer;
}

// ---------- AMBIENT (multi-layer café atmosphere) ----------
function startAmbient() {
    initAudio();
    if (!audioCtx || ambientGain) return;

    ambientGain = audioCtx.createGain();
    ambientGain.gain.value = 0;
    ambientGain.connect(masterGain);

    // Layer 1: warm room tone — pink noise, high-passed to remove sub rumble,
    // low-passed for warmth. Cuts out the "train" feeling.
    const room = audioCtx.createBufferSource();
    room.buffer = makePinkNoiseBuffer(6);
    room.loop = true;
    const roomHP = audioCtx.createBiquadFilter();
    roomHP.type = 'highpass';
    roomHP.frequency.value = 140;
    const roomLP = audioCtx.createBiquadFilter();
    roomLP.type = 'lowpass';
    roomLP.frequency.value = 900;
    roomLP.Q.value = 0.5;
    const roomG = audioCtx.createGain();
    roomG.gain.value = 0.06;
    room.connect(roomHP); roomHP.connect(roomLP); roomLP.connect(roomG);
    roomG.connect(ambientGain);
    room.start();

    // Layer 2: distant conversation murmur — band-passed pink noise with very
    // slow amplitude modulation suggesting the swell of voices.
    const murmur = audioCtx.createBufferSource();
    murmur.buffer = makePinkNoiseBuffer(8);
    murmur.loop = true;
    const murmurBP = audioCtx.createBiquadFilter();
    murmurBP.type = 'bandpass';
    murmurBP.frequency.value = 380;
    murmurBP.Q.value = 0.9;
    const murmurG = audioCtx.createGain();
    murmurG.gain.value = 0.025;
    const murmurLfo = audioCtx.createOscillator();
    const murmurLfoG = audioCtx.createGain();
    murmurLfo.frequency.value = 0.23;
    murmurLfoG.gain.value = 0.012;
    murmurLfo.connect(murmurLfoG);
    murmurLfoG.connect(murmurG.gain);
    murmur.connect(murmurBP); murmurBP.connect(murmurG);
    murmurG.connect(ambientGain);
    murmur.start();
    murmurLfo.start();

    // Layer 3: light rain on a windowpane — pink noise high-shelf + light
    // band of "patter" frequencies, very low gain.
    const rain = audioCtx.createBufferSource();
    rain.buffer = makePinkNoiseBuffer(5);
    rain.loop = true;
    const rainHP = audioCtx.createBiquadFilter();
    rainHP.type = 'highpass';
    rainHP.frequency.value = 2200;
    const rainLP = audioCtx.createBiquadFilter();
    rainLP.type = 'lowpass';
    rainLP.frequency.value = 6000;
    const rainG = audioCtx.createGain();
    rainG.gain.value = 0.04;
    rain.connect(rainHP); rainHP.connect(rainLP); rainLP.connect(rainG);
    rainG.connect(ambientGain);
    rain.start();

    ambientSources.push(room, murmur, murmurLfo, rain);

    // Slow fade in (gentle, no abrupt start)
    const t = audioCtx.currentTime;
    ambientGain.gain.setValueAtTime(0, t);
    ambientGain.gain.linearRampToValueAtTime(0.65, t + 3);

    // Sparse cup clinks + sparse lo-fi piano notes
    scheduleNextClink();
    scheduleNextPianoNote(true);
}

function stopAmbient() {
    if (!ambientGain || !audioCtx) return;
    if (clinkTimerId !== null) { clearTimeout(clinkTimerId); clinkTimerId = null; }
    if (musicTimerId !== null) { clearTimeout(musicTimerId); musicTimerId = null; }
    const t = audioCtx.currentTime;
    ambientGain.gain.cancelScheduledValues(t);
    ambientGain.gain.setValueAtTime(ambientGain.gain.value, t);
    ambientGain.gain.linearRampToValueAtTime(0, t + 1.2);
    const sourcesToStop = ambientSources;
    const gainToDisconnect = ambientGain;
    ambientSources = [];
    ambientGain = null;
    setTimeout(() => {
        sourcesToStop.forEach((s) => { try { s.stop(); } catch (e) {} });
        try { gainToDisconnect.disconnect(); } catch (e) {}
    }, 1400);
}

// Sparse, distant ceramic clinks (random soft cup-on-saucer taps)
function scheduleNextClink() {
    if (clinkTimerId !== null) clearTimeout(clinkTimerId);
    const delay = 7000 + Math.random() * 12000;
    clinkTimerId = setTimeout(() => {
        if (!audioCtx || !ambientGain) return;
        playAmbientClink();
        scheduleNextClink();
    }, delay);
}

function playAmbientClink() {
    const t = audioCtx.currentTime;
    const base = 2400 + Math.random() * 900;
    // Two close partials — small, bright, but short
    [base, base * 1.48].forEach((f, i) => {
        const osc = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.value = f;
        const startT = t + i * 0.012;
        const peak = (0.008 + Math.random() * 0.008) * (i === 0 ? 1 : 0.5);
        g.gain.setValueAtTime(0, startT);
        g.gain.linearRampToValueAtTime(peak, startT + 0.004);
        g.gain.exponentialRampToValueAtTime(0.0001, startT + 0.32);
        osc.connect(g);
        g.connect(ambientGain);
        osc.start(startT);
        osc.stop(startT + 0.36);
    });
}

// ---------- OPTIONAL BACKGROUND MUSIC (sparse lo-fi piano) ----------
// Slow ~70 BPM, no drums, gentle major7/min7 voicings. Volume sits below
// ambient so it never distracts.
const musicChords = [
    [261.63, 329.63, 392.00, 493.88], // Cmaj7
    [220.00, 277.18, 329.63, 415.30], // Amin7
    [174.61, 220.00, 261.63, 349.23], // Fmaj7
    [196.00, 246.94, 293.66, 392.00]  // Gmaj7
];

function scheduleNextPianoNote(first) {
    if (musicTimerId !== null) clearTimeout(musicTimerId);
    // ~70 BPM → ~857ms per beat. Notes every 2 beats with some humanization.
    const delay = first ? 4000 : 1500 + Math.random() * 500;
    musicTimerId = setTimeout(() => {
        if (!audioCtx || !ambientGain) return;
        playPianoNote();
        scheduleNextPianoNote(false);
    }, delay);
}

function playPianoNote() {
    const chordIdx = Math.floor(musicNoteIndex / 4) % musicChords.length;
    const chord = musicChords[chordIdx];
    const noteIdx = musicNoteIndex % chord.length;
    musicNoteIndex++;
    const freq = chord[noteIdx];

    const t = audioCtx.currentTime;
    // Pseudo-piano: a few sine partials with quick attack & long exp decay
    const partials = [
        { mult: 1,   gain: 0.022, decay: 3.0 },
        { mult: 2,   gain: 0.008, decay: 2.0 },
        { mult: 3,   gain: 0.003, decay: 1.4 }
    ];
    partials.forEach((p) => {
        const osc = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq * p.mult;
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(p.gain, t + 0.015);
        g.gain.exponentialRampToValueAtTime(0.0001, t + p.decay);
        osc.connect(g);
        g.connect(ambientGain);
        osc.start(t);
        osc.stop(t + p.decay + 0.1);
    });
}

// ---------- BREWING / MACHINE SOUNDS ----------

// Soft, warm grinder — low rumble, no buzzy mid
function playGrinder(duration = 2.8) {
    if (!soundEnabled || !audioCtx) return;
    const t = audioCtx.currentTime;
    const src = audioCtx.createBufferSource();
    src.buffer = makePinkNoiseBuffer(duration);
    const hp = audioCtx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 90;
    const lp = audioCtx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 480;
    lp.Q.value = 0.6;
    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.045, t + 0.5);
    gain.gain.setValueAtTime(0.045, t + duration - 0.6);
    gain.gain.linearRampToValueAtTime(0, t + duration);
    src.connect(hp); hp.connect(lp); lp.connect(gain); gain.connect(masterGain);
    src.start(t);
    src.stop(t + duration);
}

// Two soft tamping thuds — gentle, low-passed
function playTamp() {
    if (!soundEnabled || !audioCtx) return;
    for (let i = 0; i < 2; i++) {
        const offset = i * 0.5;
        const src = audioCtx.createBufferSource();
        src.buffer = makeWhiteNoiseBuffer(0.14);
        const lp = audioCtx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = 180;
        const g = audioCtx.createGain();
        const t = audioCtx.currentTime + offset;
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.11, t + 0.012);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
        src.connect(lp); lp.connect(g); g.connect(masterGain);
        src.start(t);
        src.stop(t + 0.15);
    }
}

// Espresso pull: gentle muffled hiss + slow gurgles + soft drip trickle
function playPull(duration = 4) {
    if (!soundEnabled || !audioCtx) return;
    const t = audioCtx.currentTime;

    // Muffled hiss body — pink noise, heavy low-pass (no harsh top end)
    const hiss = audioCtx.createBufferSource();
    hiss.buffer = makePinkNoiseBuffer(duration);
    const hissHP = audioCtx.createBiquadFilter();
    hissHP.type = 'highpass';
    hissHP.frequency.value = 220;
    const hissLP = audioCtx.createBiquadFilter();
    hissLP.type = 'lowpass';
    hissLP.frequency.value = 1100;
    hissLP.Q.value = 0.5;
    const hissG = audioCtx.createGain();
    hissG.gain.setValueAtTime(0, t);
    hissG.gain.linearRampToValueAtTime(0.03, t + 0.8);
    hissG.gain.setValueAtTime(0.03, t + duration - 0.9);
    hissG.gain.linearRampToValueAtTime(0, t + duration);
    hiss.connect(hissHP); hissHP.connect(hissLP); hissLP.connect(hissG);
    hissG.connect(masterGain);
    hiss.start(t);
    hiss.stop(t + duration);

    // Slow, satisfying drip/trickle gurgles into the cup
    const drips = Math.max(4, Math.floor(duration * 2.2));
    for (let i = 0; i < drips; i++) {
        const dT = t + 0.6 + (i / drips) * (duration - 1.2) + (Math.random() - 0.5) * 0.18;
        scheduleGurgle(dT, 130 + Math.random() * 90, 0.022 + Math.random() * 0.012);
    }
}

// Pitched "bloop" — a tiny rising sine, used for gurgles and bubbles
function scheduleGurgle(time, baseFreq, amp) {
    const osc = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(baseFreq, time);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.6, time + 0.09);
    g.gain.setValueAtTime(0, time);
    g.gain.linearRampToValueAtTime(amp, time + 0.018);
    g.gain.exponentialRampToValueAtTime(0.0001, time + 0.14);
    osc.connect(g);
    g.connect(masterGain);
    osc.start(time);
    osc.stop(time + 0.16);
}

// Milk steaming: quiet, soft bubbling — gentle simmer, not kettle boil
function playSteam(duration = 2.5) {
    if (!soundEnabled || !audioCtx) return;
    const t = audioCtx.currentTime;

    // Warm, muffled airy bed (no shrill high-pass)
    const src = audioCtx.createBufferSource();
    src.buffer = makePinkNoiseBuffer(duration);
    const hp = audioCtx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 350;
    const lp = audioCtx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 1800;
    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.022, t + 0.6);
    gain.gain.setValueAtTime(0.022, t + duration - 0.7);
    gain.gain.linearRampToValueAtTime(0, t + duration);
    src.connect(hp); hp.connect(lp); lp.connect(gain); gain.connect(masterGain);
    src.start(t);
    src.stop(t + duration);

    // Soft bubbles — sparse, gentle simmer
    const bubbles = Math.max(5, Math.floor(duration * 4));
    for (let i = 0; i < bubbles; i++) {
        const bT = t + 0.4 + (i / bubbles) * (duration - 0.9) + (Math.random() - 0.5) * 0.12;
        scheduleGurgle(bT, 260 + Math.random() * 220, 0.012 + Math.random() * 0.008);
    }
}

// Soft sip — warm, breathy, brief
function playSip() {
    if (!soundEnabled || !audioCtx) return;
    const duration = 0.65;
    const t = audioCtx.currentTime;
    const src = audioCtx.createBufferSource();
    src.buffer = makePinkNoiseBuffer(duration);
    const bp = audioCtx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = 5;
    bp.frequency.setValueAtTime(380, t);
    bp.frequency.linearRampToValueAtTime(820, t + 0.28);
    bp.frequency.linearRampToValueAtTime(560, t + duration);
    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.07, t + 0.06);
    gain.gain.linearRampToValueAtTime(0.025, t + 0.32);
    gain.gain.linearRampToValueAtTime(0, t + duration);
    src.connect(bp); bp.connect(gain); gain.connect(masterGain);
    src.start(t);
    src.stop(t + duration);
}

// Warm bell-like completion chime — fundamental + soft harmonics, long decay
function playSoftChime() {
    if (!soundEnabled || !audioCtx) return;
    const t = audioCtx.currentTime;
    const fundamental = 523.25; // C5
    const partials = [
        { mult: 0.5, gain: 0.018, decay: 2.4 },
        { mult: 1,   gain: 0.055, decay: 2.0 },
        { mult: 2,   gain: 0.022, decay: 1.5 },
        { mult: 3,   gain: 0.010, decay: 1.0 }
    ];
    partials.forEach((p) => {
        const osc = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.value = fundamental * p.mult;
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(p.gain, t + 0.025);
        g.gain.exponentialRampToValueAtTime(0.0001, t + p.decay);
        osc.connect(g);
        g.connect(masterGain);
        osc.start(t);
        osc.stop(t + p.decay + 0.1);
    });
}

// ============ SOUND TOGGLE ============
function setSoundEnabled(on) {
    soundEnabled = on;
    soundIcon.textContent = on ? '🔊' : '🔇';
    soundToggleBtn.setAttribute('aria-label', on ? 'Mute sound' : 'Enable sound');
    if (on) {
        initAudio();
        // browsers require user gesture to resume
        if (audioCtx && audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
        startAmbient();
    } else {
        stopAmbient();
    }
}

soundToggleBtn.addEventListener('click', () => setSoundEnabled(!soundEnabled));

// ============ THOUGHT BUBBLES ============
function popBubble(el) {
    el.classList.remove('pop');
    void el.offsetWidth;
    el.classList.add('pop');
}
function setPaulThought(text) {
    paulThought.textContent = text;
    paulBubble.classList.add('visible');
    popBubble(paulBubble);
}
function setPhilThought(text) {
    philThought.textContent = text;
    philBubble.classList.add('visible');
    popBubble(philBubble);
}

// ============ IDLE THINK BUBBLES ============
// While the simulator is idle, Paul and Phil cycle through their own random
// thoughts. Bubbles are staggered so only one is visible at a time.
const paulIdleThoughts = [
    '...ahh herrlich, der frühe Vogel fängt den Wurm',
    'Je früher, desto besser...',
    'Caputscho am Morgen vertreibt Kummer und Sorgen',
    'NOICE!!!',
    "Luvin' it!",
    'Die Barista würde ich machen'
];
const philIdleThoughts = [
    '...alter, ist das früh...',
    '...kaum geschlafen, bin fertig...',
    '...Warum bin ich der Haushälter der WG..?',
    '...ja, würde die Barista auch machen',
    '...vor genau einem Jahr hab ich mir die Hose voll gemacht :(...)'
];

let idleTimerId = null;
let idleLastPaulIdx = -1;
let idleLastPhilIdx = -1;
let idleNextIsPaul = Math.random() < 0.5;

function pickIdleThought(list, lastIdx) {
    if (list.length <= 1) return 0;
    let i;
    do { i = Math.floor(Math.random() * list.length); } while (i === lastIdx);
    return i;
}

function startIdleThoughts(initialDelay = 1200) {
    stopIdleThoughts();
    idleTimerId = setTimeout(runIdleTick, initialDelay);
}

function stopIdleThoughts() {
    if (idleTimerId !== null) {
        clearTimeout(idleTimerId);
        idleTimerId = null;
    }
    paulBubble.classList.remove('visible');
    philBubble.classList.remove('visible');
}

function runIdleTick() {
    if (busy) {
        // brewing is running — recheck in a moment
        idleTimerId = setTimeout(runIdleTick, 1500);
        return;
    }
    const isPaul = idleNextIsPaul;
    idleNextIsPaul = !idleNextIsPaul;

    let bubble, textEl, list, idx;
    if (isPaul) {
        idx = pickIdleThought(paulIdleThoughts, idleLastPaulIdx);
        idleLastPaulIdx = idx;
        bubble = paulBubble; textEl = paulThought; list = paulIdleThoughts;
    } else {
        idx = pickIdleThought(philIdleThoughts, idleLastPhilIdx);
        idleLastPhilIdx = idx;
        bubble = philBubble; textEl = philThought; list = philIdleThoughts;
    }
    textEl.textContent = list[idx];
    bubble.classList.add('visible');

    // hold visible 3–4s, then fade out and schedule the other character
    const hold = 3000 + Math.random() * 1000;
    idleTimerId = setTimeout(() => {
        bubble.classList.remove('visible');
        // gap between thoughts: ~1–2s so total cadence is ~4–6s
        const gap = 1000 + Math.random() * 1000;
        idleTimerId = setTimeout(runIdleTick, gap);
    }, hold);
}

// ============ SCENE RESET ============
function resetScene() {
    // Cups
    [cupPaul, cupPhil].forEach((c) => {
        c.classList.remove('visible', 'travel', 'sipping', 'filling', 'filled', 'steaming');
    });
    // Characters
    paulEl.classList.remove('awake', 'happy');
    philEl.classList.remove('mood-1', 'mood-2', 'mood-3', 'mood-4');
    // Barista
    baristaEl.classList.remove('grinding', 'tamping', 'pulling', 'steaming');
    // Machine
    machineEl.classList.remove('pulling');
    // Tools
    [grinder, portafilter, pitcher].forEach((t) => t.classList.remove('active'));
    // Steam
    wandSteam.classList.remove('active');
    machineSteam.classList.remove('active');
    // Z's
    zzzPaul.classList.remove('gone');
    zzzPhil.classList.remove('gone');
    // Thoughts — hidden until the brewing dialogue sets them
    paulBubble.classList.remove('visible');
    philBubble.classList.remove('visible');
    paulThought.textContent = '';
    philThought.textContent = '';
}

// ============ ONE SLOW SIP ============
function singleSip(cup) {
    return new Promise((resolve) => {
        cup.classList.remove('sipping');
        void cup.offsetWidth;
        cup.classList.add('sipping');
        const handler = () => {
            cup.classList.remove('sipping');
            cup.removeEventListener('animationend', handler);
            resolve();
        };
        cup.addEventListener('animationend', handler);
    });
}

function setButtons(disabled) {
    cappuccinoBtn.disabled = disabled;
    flatwhiteBtn.disabled = disabled;
}

// ============ MAIN COFFEE SEQUENCE ============
let busy = false;

async function orderCoffee(drink) {
    if (busy) return;
    busy = true;
    setButtons(true);
    stopIdleThoughts();
    resetScene();

    // If user clicked without enabling sound, gently start audio context
    // (autoplay rules permit it because click is a user gesture)
    if (!soundEnabled) {
        initAudio();
        if (audioCtx && audioCtx.state === 'suspended') {
            await audioCtx.resume();
        }
    }

    // ---------- PHASE 1: GRIND (slow, ~4s) ----------
    setPaulThought('mmm... yes please');
    setPhilThought('finally...');
    await wait(800);
    grinder.classList.add('active');
    baristaEl.classList.add('grinding');
    playGrinder(3.5);
    await wait(3500);
    grinder.classList.remove('active');
    baristaEl.classList.remove('grinding');

    // ---------- PHASE 2: TAMP (~2.5s) ----------
    await wait(400);
    portafilter.classList.add('active');
    baristaEl.classList.add('tamping');
    playTamp();
    await wait(2500);
    portafilter.classList.remove('active');
    baristaEl.classList.remove('tamping');

    // ---------- PHASE 3: PULL THE SHOT (~4.5s) ----------
    await wait(500);
    machineEl.classList.add('pulling');
    machineSteam.classList.add('active');
    baristaEl.classList.add('pulling');
    // Cups appear under group heads, fill up
    cupPaul.classList.add('visible', 'filling');
    cupPhil.classList.add('visible', 'filling');
    playPull(4.5);
    await wait(2500);
    cupPaul.classList.add('filled');
    cupPhil.classList.add('filled');
    await wait(2000);
    machineEl.classList.remove('pulling');
    machineSteam.classList.remove('active');
    baristaEl.classList.remove('pulling');

    // ---------- PHASE 4: STEAM MILK (~3s) ----------
    await wait(400);
    pitcher.classList.add('active');
    wandSteam.classList.add('active');
    baristaEl.classList.add('steaming');
    playSteam(3);
    await wait(3000);
    pitcher.classList.remove('active');
    wandSteam.classList.remove('active');
    baristaEl.classList.remove('steaming');

    // ---------- PHASE 5: SLOW DELIVERY (one cup at a time) ----------
    await wait(600);
    setPaulThought(`one ${drink}, coming up`);
    // start cup steam now
    cupPaul.classList.add('steaming');
    cupPaul.classList.add('travel');
    await wait(4200); // gentle 4s slide + tiny pause

    setPhilThought('...about time');
    cupPhil.classList.add('steaming');
    cupPhil.classList.add('travel');
    await wait(4200);

    // ---------- PHASE 6: WAKE UP & FIRST SIP ----------
    await wait(800);
    // Paul wakes up first sip
    zzzPaul.classList.add('gone');
    paulEl.classList.add('awake');
    setPaulThought('ohhh...');
    setPhilThought('let me try this');
    playSip();

    await Promise.all([singleSip(cupPaul), singleSip(cupPhil)]);
    await wait(900);

    // ---------- SIP 2: PHIL THAWS A LITTLE ----------
    zzzPhil.classList.add('gone');
    philEl.classList.add('mood-1'); // mouth softens
    setPaulThought('mmm warm');
    setPhilThought('...hm');
    playSip();
    await Promise.all([singleSip(cupPaul), singleSip(cupPhil)]);
    await wait(900);

    // ---------- SIP 3: PHIL NEUTRAL ----------
    philEl.classList.remove('mood-1');
    philEl.classList.add('mood-2');
    setPaulThought('this is nice');
    setPhilThought('actually...');
    playSip();
    await Promise.all([singleSip(cupPaul), singleSip(cupPhil)]);
    await wait(900);

    // ---------- SIP 4: PHIL SMILES ----------
    philEl.classList.remove('mood-2');
    philEl.classList.add('mood-3');
    setPaulThought('☕ aaah');
    setPhilThought('...wait');
    playSip();
    await Promise.all([singleSip(cupPaul), singleSip(cupPhil)]);
    await wait(900);

    // ---------- SIP 5: PHIL FULLY HAPPY ----------
    philEl.classList.remove('mood-3');
    philEl.classList.add('mood-4');
    paulEl.classList.add('happy');
    setPaulThought('told you ♥');
    setPhilThought('...not bad');
    playSip();
    playSoftChime();
    await Promise.all([singleSip(cupPaul), singleSip(cupPhil)]);
    await wait(2200);

    // fade out the final brewing thoughts, then resume idle daydreaming
    await wait(800);
    paulBubble.classList.remove('visible');
    philBubble.classList.remove('visible');

    busy = false;
    setButtons(false);
    startIdleThoughts(1800);
}

cappuccinoBtn.addEventListener('click', () => orderCoffee('cappuccino'));
flatwhiteBtn.addEventListener('click', () => orderCoffee('flat white'));

// Start with sound off; user enables via toggle
setSoundEnabled(false);

// Begin the idle daydreaming loop (Paul & Phil cycle their own thoughts)
startIdleThoughts(1500);
