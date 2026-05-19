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
// Brewing sounds only. No background ambient — silence between drinks.
let audioCtx = null;
let masterGain = null;
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

// ---------- BREWING / MACHINE SOUNDS ----------

// Grinder — warm low rumble (pink noise, low-passed)
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
    lp.frequency.value = 520;
    lp.Q.value = 0.6;
    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.13, t + 0.4);
    gain.gain.setValueAtTime(0.13, t + duration - 0.5);
    gain.gain.linearRampToValueAtTime(0, t + duration);
    src.connect(hp); hp.connect(lp); lp.connect(gain); gain.connect(masterGain);
    src.start(t);
    src.stop(t + duration);
}

// Two soft tamping thuds — low-passed
function playTamp() {
    if (!soundEnabled || !audioCtx) return;
    for (let i = 0; i < 2; i++) {
        const offset = i * 0.5;
        const src = audioCtx.createBufferSource();
        src.buffer = makeWhiteNoiseBuffer(0.14);
        const lp = audioCtx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = 200;
        const g = audioCtx.createGain();
        const t = audioCtx.currentTime + offset;
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.18, t + 0.012);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
        src.connect(lp); lp.connect(g); g.connect(masterGain);
        src.start(t);
        src.stop(t + 0.15);
    }
}

// Espresso pull: deep warm pressurised hiss + low pump rumble + slow drips
function playPull(duration = 4) {
    if (!soundEnabled || !audioCtx) return;
    const t = audioCtx.currentTime;

    // Layer A — warm mid-band hiss (the pressurised water through grounds)
    const body = audioCtx.createBufferSource();
    body.buffer = makePinkNoiseBuffer(duration);
    const bodyHP = audioCtx.createBiquadFilter();
    bodyHP.type = 'highpass';
    bodyHP.frequency.value = 200;
    const bodyLP = audioCtx.createBiquadFilter();
    bodyLP.type = 'lowpass';
    bodyLP.frequency.value = 1500;
    bodyLP.Q.value = 0.6;
    const bodyG = audioCtx.createGain();
    bodyG.gain.setValueAtTime(0, t);
    bodyG.gain.linearRampToValueAtTime(0.20, t + 0.7);
    bodyG.gain.setValueAtTime(0.20, t + duration - 0.8);
    bodyG.gain.linearRampToValueAtTime(0, t + duration);
    body.connect(bodyHP); bodyHP.connect(bodyLP); bodyLP.connect(bodyG);
    bodyG.connect(masterGain);
    body.start(t);
    body.stop(t + duration);

    // Layer B — low pump/pressure rumble (gives it weight & "real machine" feel)
    const rumble = audioCtx.createBufferSource();
    rumble.buffer = makePinkNoiseBuffer(duration);
    const rumbleHP = audioCtx.createBiquadFilter();
    rumbleHP.type = 'highpass';
    rumbleHP.frequency.value = 55;
    const rumbleLP = audioCtx.createBiquadFilter();
    rumbleLP.type = 'lowpass';
    rumbleLP.frequency.value = 200;
    const rumbleG = audioCtx.createGain();
    rumbleG.gain.setValueAtTime(0, t);
    rumbleG.gain.linearRampToValueAtTime(0.16, t + 0.6);
    rumbleG.gain.setValueAtTime(0.16, t + duration - 0.7);
    rumbleG.gain.linearRampToValueAtTime(0, t + duration);
    rumble.connect(rumbleHP); rumbleHP.connect(rumbleLP); rumbleLP.connect(rumbleG);
    rumbleG.connect(masterGain);
    rumble.start(t);
    rumble.stop(t + duration);

    // Slow pressure modulation on the body — gives the hiss a subtle "pulsing"
    // feel like a real pump cycle.
    const lfo = audioCtx.createOscillator();
    const lfoG = audioCtx.createGain();
    lfo.frequency.value = 3;
    lfoG.gain.value = 0.04;
    lfo.connect(lfoG);
    lfoG.connect(bodyG.gain);
    lfo.start(t);
    lfo.stop(t + duration);

    // Drips/trickle into the cup — you can hear it filling
    const drips = Math.max(7, Math.floor(duration * 3));
    for (let i = 0; i < drips; i++) {
        const dT = t + 0.8 + (i / drips) * (duration - 1.6) + (Math.random() - 0.5) * 0.22;
        scheduleDrip(dT, 0.10 + Math.random() * 0.05);
    }
}

// Single drip/plop — falling sine + tiny noise click. Used for cup filling.
function scheduleDrip(time, amp = 0.1) {
    // Falling-pitch sine = classic "drip into water" sound
    const osc = audioCtx.createOscillator();
    const oscG = audioCtx.createGain();
    osc.type = 'sine';
    const startFreq = 900 + Math.random() * 400;
    osc.frequency.setValueAtTime(startFreq, time);
    osc.frequency.exponentialRampToValueAtTime(startFreq * 0.35, time + 0.09);
    oscG.gain.setValueAtTime(0, time);
    oscG.gain.linearRampToValueAtTime(amp, time + 0.006);
    oscG.gain.exponentialRampToValueAtTime(0.0001, time + 0.18);
    osc.connect(oscG);
    oscG.connect(masterGain);
    osc.start(time);
    osc.stop(time + 0.2);

    // Tiny watery splash transient on impact
    const splash = audioCtx.createBufferSource();
    splash.buffer = makeWhiteNoiseBuffer(0.06);
    const splashBP = audioCtx.createBiquadFilter();
    splashBP.type = 'bandpass';
    splashBP.frequency.value = 1400;
    splashBP.Q.value = 1.4;
    const splashG = audioCtx.createGain();
    splashG.gain.setValueAtTime(0, time);
    splashG.gain.linearRampToValueAtTime(amp * 0.5, time + 0.003);
    splashG.gain.exponentialRampToValueAtTime(0.0001, time + 0.07);
    splash.connect(splashBP); splashBP.connect(splashG); splashG.connect(masterGain);
    splash.start(time);
    splash.stop(time + 0.08);
}

// Milk steaming: rough, airy steamer wand — bright hiss + turbulent mid-body
function playSteam(duration = 2.5) {
    if (!soundEnabled || !audioCtx) return;
    const t = audioCtx.currentTime;

    // Layer A — bright airy hiss (white noise, high-passed). This is the
    // dominant character of a real steam wand.
    const hiss = audioCtx.createBufferSource();
    hiss.buffer = makeWhiteNoiseBuffer(duration);
    const hissHP = audioCtx.createBiquadFilter();
    hissHP.type = 'highpass';
    hissHP.frequency.value = 1800;
    const hissLP = audioCtx.createBiquadFilter();
    hissLP.type = 'lowpass';
    hissLP.frequency.value = 7500;
    const hissG = audioCtx.createGain();
    hissG.gain.setValueAtTime(0, t);
    hissG.gain.linearRampToValueAtTime(0.15, t + 0.35);
    hissG.gain.setValueAtTime(0.15, t + duration - 0.45);
    hissG.gain.linearRampToValueAtTime(0, t + duration);
    hiss.connect(hissHP); hissHP.connect(hissLP); hissLP.connect(hissG);
    hissG.connect(masterGain);
    hiss.start(t);
    hiss.stop(t + duration);

    // Layer B — turbulent mid-body (pink noise band, modulated cutoff for the
    // "rough" sputtering quality of milk churning under the wand)
    const body = audioCtx.createBufferSource();
    body.buffer = makePinkNoiseBuffer(duration);
    const bodyHP = audioCtx.createBiquadFilter();
    bodyHP.type = 'highpass';
    bodyHP.frequency.value = 400;
    const bodyLP = audioCtx.createBiquadFilter();
    bodyLP.type = 'lowpass';
    bodyLP.frequency.value = 2200;
    const bodyG = audioCtx.createGain();
    bodyG.gain.setValueAtTime(0, t);
    bodyG.gain.linearRampToValueAtTime(0.11, t + 0.35);
    bodyG.gain.setValueAtTime(0.11, t + duration - 0.45);
    bodyG.gain.linearRampToValueAtTime(0, t + duration);
    body.connect(bodyHP); bodyHP.connect(bodyLP); bodyLP.connect(bodyG);
    bodyG.connect(masterGain);
    body.start(t);
    body.stop(t + duration);

    // Turbulence: LFO on body filter cutoff = irregular churning quality
    const lfo = audioCtx.createOscillator();
    const lfoG = audioCtx.createGain();
    lfo.type = 'sawtooth';
    lfo.frequency.value = 7;
    lfoG.gain.value = 600;
    lfo.connect(lfoG);
    lfoG.connect(bodyLP.frequency);
    lfo.start(t);
    lfo.stop(t + duration);
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
    gain.gain.linearRampToValueAtTime(0.09, t + 0.06);
    gain.gain.linearRampToValueAtTime(0.03, t + 0.32);
    gain.gain.linearRampToValueAtTime(0, t + duration);
    src.connect(bp); bp.connect(gain); gain.connect(masterGain);
    src.start(t);
    src.stop(t + duration);
}

// Warm completion chime — single C5 bell with soft harmonics
function playSoftChime() {
    if (!soundEnabled || !audioCtx) return;
    const t = audioCtx.currentTime;
    const fundamental = 523.25; // C5
    const partials = [
        { mult: 0.5, gain: 0.04,  decay: 2.6 },
        { mult: 1,   gain: 0.13,  decay: 2.2 },
        { mult: 2,   gain: 0.05,  decay: 1.6 },
        { mult: 3,   gain: 0.022, decay: 1.1 }
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
