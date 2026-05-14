const baristaEl = document.getElementById('barista');
const cupPaul = document.getElementById('cup-paul');
const cupPhil = document.getElementById('cup-phil');
const philEl = document.getElementById('phil');
const philThought = document.getElementById('phil-thought');
const paulThought = document.getElementById('paul-thought');
const steamEl = document.getElementById('steam');
const cappuccinoBtn = document.getElementById('cappuccino-btn');
const flatwhiteBtn = document.getElementById('flatwhite-btn');

const paulBubble = document.querySelector('.bubble-paul');
const philBubble = document.querySelector('.bubble-phil');

let busy = false;

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function setPaulThought(text) {
    paulThought.textContent = text;
    popBubble(paulBubble);
}
function setPhilThought(text) {
    philThought.textContent = text;
    popBubble(philBubble);
}
function popBubble(el) {
    el.classList.remove('pop');
    void el.offsetWidth;
    el.classList.add('pop');
}

function resetScene() {
    cupPaul.classList.remove('visible', 'travel', 'drinking');
    cupPhil.classList.remove('visible', 'travel', 'drinking');
    philEl.classList.remove('happy');
    philThought.textContent = '...';
    paulThought.textContent = 'need coffee...';
    steamEl.classList.remove('active');
    baristaEl.classList.remove('shaking');
}

function setButtons(disabled) {
    cappuccinoBtn.disabled = disabled;
    flatwhiteBtn.disabled = disabled;
}

async function orderCoffee(drink) {
    if (busy) return;
    busy = true;
    setButtons(true);
    resetScene();

    // 1. Barista works the machine
    setPaulThought('yes please!');
    setPhilThought('*tap tap*');
    baristaEl.classList.add('shaking');
    steamEl.classList.add('active');
    await wait(1800);

    // 2. Cups appear and slide out
    baristaEl.classList.remove('shaking');
    cupPaul.classList.add('visible');
    cupPhil.classList.add('visible');
    // force reflow so the left transition kicks in
    void cupPaul.offsetWidth;
    cupPaul.classList.add('travel');
    cupPhil.classList.add('travel');
    setPaulThought(`one ${drink}!`);
    setPhilThought('...hm');
    await wait(1500);

    // 3. Drinking
    cupPaul.classList.add('drinking');
    cupPhil.classList.add('drinking');
    setPaulThought('mmmm ☕');
    setPhilThought('*sip*');
    await wait(2800);

    // a few more sips...
    setPhilThought('*sip* *sip*');
    await wait(1400);

    // 4. Phil becomes happy
    philEl.classList.add('happy');
    setPhilThought('...not bad');
    setPaulThought('told you!');
    steamEl.classList.remove('active');

    await wait(2200);

    busy = false;
    setButtons(false);
}

cappuccinoBtn.addEventListener('click', () => orderCoffee('cappuccino'));
flatwhiteBtn.addEventListener('click', () => orderCoffee('flat white'));
