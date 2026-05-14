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
let audioCtx = null;
let masterGain = null;
let ambientGain = null;
let ambientNoise = null;
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

function makeBrownNoiseBuffer(duration) {
    const ctx = audioCtx;
    const bufferSize = Math.floor(duration * ctx.sampleRate);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let lastOut = 0;
    for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        lastOut = (lastOut + 0.02 * white) / 1.02;
        data[i] = lastOut * 3.5;
    }
    return buffer;
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

function startAmbient() {
    initAudio();
    if (!audioCtx || ambientGain) return;

    // Brown noise → low-pass for warm café murmur
    ambientNoise = audioCtx.createBufferSource();
    ambientNoise.buffer = makeBrownNoiseBuffer(4);
    ambientNoise.loop = true;

    const lp = audioCtx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 380;

    ambientGain = audioCtx.createGain();
    ambientGain.gain.value = 0;

    ambientNoise.connect(lp);
    lp.connect(ambientGain);
    ambientGain.connect(masterGain);
    ambientNoise.start();

    // gentle fade in
    const t = audioCtx.currentTime;
    ambientGain.gain.setValueAtTime(0, t);
    ambientGain.gain.linearRampToValueAtTime(0.09, t + 2.5);
}

function stopAmbient() {
    if (!ambientGain || !audioCtx) return;
    const t = audioCtx.currentTime;
    ambientGain.gain.cancelScheduledValues(t);
    ambientGain.gain.setValueAtTime(ambientGain.gain.value, t);
    ambientGain.gain.linearRampToValueAtTime(0, t + 0.8);
    setTimeout(() => {
        try { ambientNoise && ambientNoise.stop(); } catch (e) {}
        ambientNoise = null;
        ambientGain = null;
    }, 1000);
}

function playGrinder(duration = 2.8) {
    if (!soundEnabled || !audioCtx) return;
    const src = audioCtx.createBufferSource();
    src.buffer = makeWhiteNoiseBuffer(duration);

    const bp = audioCtx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 550;
    bp.Q.value = 1.2;

    // Slight LFO on freq for grinder rumble
    const lfo = audioCtx.createOscillator();
    const lfoGain = audioCtx.createGain();
    lfo.frequency.value = 8;
    lfoGain.gain.value = 80;
    lfo.connect(lfoGain);
    lfoGain.connect(bp.frequency);

    const gain = audioCtx.createGain();
    const t = audioCtx.currentTime;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.08, t + 0.3);
    gain.gain.setValueAtTime(0.08, t + duration - 0.4);
    gain.gain.linearRampToValueAtTime(0, t + duration);

    src.connect(bp);
    bp.connect(gain);
    gain.connect(masterGain);
    src.start();
    lfo.start();
    src.stop(t + duration);
    lfo.stop(t + duration);
}

function playTamp() {
    if (!soundEnabled || !audioCtx) return;
    // Two soft thuds
    for (let i = 0; i < 2; i++) {
        const offset = i * 0.5;
        const src = audioCtx.createBufferSource();
        src.buffer = makeWhiteNoiseBuffer(0.12);
        const lp = audioCtx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = 220;
        const g = audioCtx.createGain();
        const t = audioCtx.currentTime + offset;
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.18, t + 0.01);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
        src.connect(lp); lp.connect(g); g.connect(masterGain);
        src.start(t);
        src.stop(t + 0.13);
    }
}

function playPull(duration = 4) {
    if (!soundEnabled || !audioCtx) return;
    const src = audioCtx.createBufferSource();
    src.buffer = makeWhiteNoiseBuffer(duration);
    const hp = audioCtx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 1200;
    const bp = audioCtx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 2500;
    bp.Q.value = 0.7;

    const gain = audioCtx.createGain();
    const t = audioCtx.currentTime;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.045, t + 0.6);
    gain.gain.setValueAtTime(0.045, t + duration - 0.7);
    gain.gain.linearRampToValueAtTime(0, t + duration);

    src.connect(hp); hp.connect(bp); bp.connect(gain); gain.connect(masterGain);
    src.start();
    src.stop(t + duration);
}

function playSteam(duration = 2.5) {
    if (!soundEnabled || !audioCtx) return;
    const src = audioCtx.createBufferSource();
    src.buffer = makeWhiteNoiseBuffer(duration);
    const hp = audioCtx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 3500;

    const gain = audioCtx.createGain();
    const t = audioCtx.currentTime;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.07, t + 0.4);
    // small gurgling tremolo
    gain.gain.setValueAtTime(0.07, t + duration - 0.4);
    gain.gain.linearRampToValueAtTime(0, t + duration);

    const lfo = audioCtx.createOscillator();
    const lfoG = audioCtx.createGain();
    lfo.frequency.value = 5;
    lfoG.gain.value = 0.015;
    lfo.connect(lfoG);
    lfoG.connect(gain.gain);

    src.connect(hp); hp.connect(gain); gain.connect(masterGain);
    src.start();
    lfo.start();
    src.stop(t + duration);
    lfo.stop(t + duration);
}

function playSip() {
    if (!soundEnabled || !audioCtx) return;
    const duration = 0.7;
    const src = audioCtx.createBufferSource();
    src.buffer = makeWhiteNoiseBuffer(duration);
    const bp = audioCtx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = 6;
    const t = audioCtx.currentTime;
    bp.frequency.setValueAtTime(450, t);
    bp.frequency.linearRampToValueAtTime(1100, t + 0.3);
    bp.frequency.linearRampToValueAtTime(700, t + duration);

    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.13, t + 0.06);
    gain.gain.linearRampToValueAtTime(0.04, t + 0.35);
    gain.gain.linearRampToValueAtTime(0, t + duration);

    src.connect(bp); bp.connect(gain); gain.connect(masterGain);
    src.start();
    src.stop(t + duration);
}

function playSoftChime() {
    // tiny "ding" when Phil turns happy
    if (!soundEnabled || !audioCtx) return;
    const t = audioCtx.currentTime;
    const notes = [660, 880];
    notes.forEach((freq, i) => {
        const osc = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        osc.frequency.value = freq;
        osc.type = 'sine';
        const startT = t + i * 0.12;
        g.gain.setValueAtTime(0, startT);
        g.gain.linearRampToValueAtTime(0.08, startT + 0.03);
        g.gain.exponentialRampToValueAtTime(0.001, startT + 1.2);
        osc.connect(g);
        g.connect(masterGain);
        osc.start(startT);
        osc.stop(startT + 1.3);
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
    popBubble(paulBubble);
}
function setPhilThought(text) {
    philThought.textContent = text;
    popBubble(philBubble);
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
    // Thoughts
    paulThought.textContent = 'need coffee...';
    philThought.textContent = '...';
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

    busy = false;
    setButtons(false);
}

cappuccinoBtn.addEventListener('click', () => orderCoffee('cappuccino'));
flatwhiteBtn.addEventListener('click', () => orderCoffee('flat white'));

// Start with sound off; user enables via toggle
setSoundEnabled(false);
