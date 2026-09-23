import { SIZE, groupAt, blastAt, hasMoves, collapseWithMotion } from './engine.js';
import { planBlast } from './effects-plan.js';
import { createEffects, rocketMarkup } from './effects.js';
const $ = id => document.getElementById(id);
const colors = ['pink','orange','blue','purple','green'];
const symbols = ['✦','◆','●','✿','⬟'];
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const effects = createEffects($('board'),document.querySelector('.board-shell'),reduced);
let board = [], score = 0, moves = 30, best = 0, busy = false, generation = 0, audio, sound = false;
try { best = Number(localStorage.getItem('pop-best')) || 0; } catch {}
const randomCell = () => ({type:'color', color:Math.floor(Math.random() * 5)});
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
function saveBest() { if (score > best) { best = score; try { localStorage.setItem('pop-best', String(best)); } catch {} } }
function stats() {
  $('score').textContent = score.toLocaleString(); $('best').textContent = best.toLocaleString(); $('moves').textContent = moves;
  const goal = Math.max(3000, Math.ceil((score + 1) / 3000) * 3000);
  $('progress').style.width = `${Math.min(100, score / goal * 100)}%`;
  $('goal-value').textContent = `${score.toLocaleString()} / ${goal.toLocaleString()}`;
}
const tiles = new Map();
let tileId = 0;
const tileAt = index => tiles.get(board[index]);
function render(motion = new Map()) {
  const live = new Set(board);
  for (const [cell, node] of tiles) {
    if (!live.has(cell)) { node.remove(); tiles.delete(cell); }
  }
  const pitch = $('board').clientHeight / SIZE;
  board.forEach((cell, i) => {
    let button = tiles.get(cell);
    if (!button) {
      button = document.createElement('button');
      button.className = `block ${cell.type === 'color' ? colors[cell.color] : 'special ' + cell.type}`;
      button.dataset.tileId = String(++tileId);
      button.setAttribute('role','gridcell');
      button.innerHTML = cell.type === 'color' ? `<span class="gem" aria-hidden="true">${symbols[cell.color]}</span>` : cell.type === 'rocket' ? `<span class="rocket ${cell.axis === 'col' ? 'vertical' : ''}" aria-hidden="true">${rocketMarkup}</span>` : '<span class="tnt-label" aria-hidden="true">TNT</span>';
      tiles.set(cell,button);
      $('board').append(button);
    }
    button.dataset.index = i;
    button.style.left = `${i % SIZE * 12.5}%`;
    button.style.top = `${Math.floor(i / SIZE) * 12.5}%`;
    button.style.zIndex = Math.floor(i / SIZE) + 1;
    button.tabIndex = i === 0 ? 0 : -1;
    button.setAttribute('aria-label', `${cell.type === 'color' ? colors[cell.color] + ' block' : cell.type === 'rocket' ? cell.axis + ' rocket' : 'TNT'}, row ${Math.floor(i / SIZE) + 1}, column ${i % SIZE + 1}`);
    const path = motion.get(cell);
    if (!reduced && path && path.fromRow !== path.toRow) {
      button.animate([
        {transform:`translateY(${(path.fromRow - path.toRow) * pitch}px)`},
        {transform:'translateY(0)'}
      ], {duration:420,easing:'cubic-bezier(.32,.05,.42,1)'});
    }
  });
  stats();
}
function updateHint(special = false) {
  const stuck = !hasMoves(board);
  $('hint').textContent = stuck ? 'No matches. Shuffle for free.' : special ? 'Tap your power-up when you’re ready' : 'Tap 4 or more matching blocks';
  $('shuffle-cost').textContent = stuck ? 'Free' : '−1 move';
  $('shake').setAttribute('aria-label',stuck ? 'Shuffle the board for free' : 'Shuffle the board for one move');
}
function start() {
  effects.reset();
  generation++; busy = false; score = 0; moves = 30; board = Array.from({length:64}, randomCell);
  // A friendly first move teaches the rocket mechanic naturally.
  for (const i of [26,27,28,35,36]) board[i] = {type:'color',color:0};
  pieces = []; if (frame) cancelAnimationFrame(frame); frame = 0; ctx.clearRect(0,0,canvas.width,canvas.height);
  $('end-screen').hidden = true; $('toast').classList.remove('show'); render(); updateHint();
}
function announce(message) { $('toast').textContent = message; $('toast').classList.remove('show'); void $('toast').offsetWidth; $('toast').classList.add('show'); }
function playTone(power = 1) {
  if (!sound) return;
  try {
    audio ||= new (window.AudioContext || window.webkitAudioContext)(); audio.resume();
    const time = audio.currentTime;
    for (let n = 0; n < 3; n++) {
      const osc = audio.createOscillator(), gain = audio.createGain(); osc.connect(gain); gain.connect(audio.destination);
      osc.type = n === 0 ? 'sine' : 'triangle'; osc.frequency.setValueAtTime((n === 0 ? 130 : 460 + n * 170) * (power > 1 ? .75 : 1),time);
      osc.frequency.exponentialRampToValueAtTime(n === 0 ? 35 : 160,time + .22); gain.gain.setValueAtTime(n === 0 ? .18 : .035,time); gain.gain.exponentialRampToValueAtTime(.001,time + .3); osc.start(time + n * .02); osc.stop(time + .32);
    }
  } catch {}
}
function playBlastSound(event) {
  if (!sound) return;
  try {
    audio ||= new (window.AudioContext || window.webkitAudioContext)(); audio.resume();
    const now = audio.currentTime, tnt = event.type === 'tnt';
    const length = tnt ? .65 : .45;
    const buffer = audio.createBuffer(1,Math.ceil(audio.sampleRate*length),audio.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i=0;i<data.length;i++) data[i] = Math.random()*2-1;
    const source = audio.createBufferSource(), filter = audio.createBiquadFilter(), gain = audio.createGain();
    source.buffer = buffer; source.connect(filter); filter.connect(gain); gain.connect(audio.destination);
    filter.type = tnt ? 'lowpass' : 'bandpass'; filter.Q.value = .7;
    filter.frequency.setValueAtTime(tnt ? 1800 : 500,now);
    filter.frequency.exponentialRampToValueAtTime(tnt ? 80 : 3800,now+length);
    gain.gain.setValueAtTime(.001,now); gain.gain.exponentialRampToValueAtTime(tnt ? .25 : .12,now+.1); gain.gain.exponentialRampToValueAtTime(.001,now+length);
    source.start(now); source.stop(now+length);
    const bass = audio.createOscillator(), bassGain = audio.createGain();
    bass.connect(bassGain); bassGain.connect(audio.destination);
    bass.frequency.setValueAtTime(tnt ? 100 : 170,now+.12); bass.frequency.exponentialRampToValueAtTime(35,now+.4);
    bassGain.gain.setValueAtTime(.001,now); bassGain.gain.setValueAtTime(.18,now+.12); bassGain.gain.exponentialRampToValueAtTime(.001,now+.45);
    bass.start(now); bass.stop(now+.46);
  } catch {}
}
const canvas = $('particles'), ctx = canvas.getContext('2d'); let pieces = [], frame = 0, previousFrame = 0;
function particles(indices) {
  if (reduced) return;
  const rect = $('board').getBoundingClientRect(), outer = canvas.getBoundingClientRect();
  const scale = Math.min(devicePixelRatio,2);
  if (canvas.width !== Math.round(outer.width*scale) || canvas.height !== Math.round(outer.height*scale)) {
    canvas.width = Math.round(outer.width*scale); canvas.height = Math.round(outer.height*scale);
  }
  ctx.setTransform(scale,0,0,scale,0,0);
  const palette = ['#f26a9c','#ffb54e','#57baf0','#9b80ed','#a9d974'];
  for (const i of indices) for (let n = 0; n < 8; n++) pieces.push({x:rect.left - outer.left + (i % 8 + .5) * rect.width / 8,y:rect.top - outer.top + (Math.floor(i / 8) + .5) * rect.height / 8,vx:(Math.random() - .5) * 10,vy:-Math.random() * 8 - 1,life:1,size:3 + Math.random() * 5,color:palette[board[i]?.color] || '#efffab'});
  if (!frame) {previousFrame = performance.now(); frame = requestAnimationFrame(draw);}
}
function draw(now) {
  const dt = Math.min(2,(now - previousFrame)/16.667); previousFrame = now;
  ctx.clearRect(0,0,canvas.width,canvas.height);
  pieces = pieces.filter(p => p.life > 0);
  for (const p of pieces) { p.x += p.vx*dt; p.y += p.vy*dt; p.vy += .24*dt; p.life -= .025*dt; ctx.globalAlpha = Math.max(0,p.life); ctx.fillStyle = p.color; ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.life*5);ctx.fillRect(-p.size/2,-p.size/2,p.size,p.size*.6);ctx.restore(); }
  ctx.globalAlpha = 1; frame = pieces.length ? requestAnimationFrame(draw) : 0;
}
async function activate(index) {
  if (busy || moves <= 0) return;
  const restoreFocus = document.activeElement === tileAt(index);
  const cell = board[index]; let indices, special, combo = false, blast;
  if (cell.type === 'color') {
    indices = groupAt(board,index);
    if (indices.length < 4) { const el = tileAt(index); el.classList.remove('invalid'); void el.offsetWidth; el.classList.add('invalid'); $('hint').textContent = 'Connect at least 4 of the same color'; return; }
    if (indices.length >= 10) special = {type:'tnt'};
    else if (indices.length >= 5) special = {type:'rocket',axis:Math.random() < .5 ? 'row' : 'col'};
  } else { blast = blastAt(board,index); indices = blast.cells; combo = blast.combo; }
  busy = true; const current = generation; moves--; score += indices.length * 40 + (special ? indices.length * 20 : 0) + (combo ? 500 : 0); saveBest(); stats();
  let clearAfter = 210;
  if (blast) {
    const plan = planBlast(blast.bursts);
    for (const event of plan.events) effects.later(() => {effects.burst(event); playBlastSound(event);},reduced ? 0 : event.start);
    for (const [i,at] of plan.hits) effects.later(() => {tileAt(i)?.classList.add('pop'); particles([i]);},reduced ? 0 : at);
    clearAfter = reduced ? 170 : plan.duration;
  } else {
    indices.forEach(i => tileAt(i).classList.add('pop')); particles(indices); playTone();
  }
  if (combo) announce('Double rocket'); else if (cell.type === 'tnt') announce('Boom!'); else if (special?.type === 'tnt') announce('TNT ready'); else if (special) announce('Rocket ready'); else announce(`+${indices.length * 40}`);
  await delay(reduced && !blast ? 0 : clearAfter); if (current !== generation) return;
  indices.forEach(i => board[i] = null); if (special) board[index] = special;
  const fall = collapseWithMotion(board,randomCell); board = fall.board; render(fall.motion);
  if (restoreFocus) tileAt(index).focus({preventScroll:true});
  updateHint(Boolean(special));
  await delay(reduced ? 0 : 430); if (current !== generation) return; busy = false;
  if (special) effects.celebrate(tiles.get(special));
  if (moves === 0) { $('final-score').textContent = score.toLocaleString(); $('end-screen').hidden = false; $('play-again').focus(); }
}
$('board').addEventListener('click',event => { const block = event.target.closest('.block'); if (block) activate(Number(block.dataset.index)); });
$('board').addEventListener('keydown', event => { const block = event.target.closest('.block'); if (!block) return; const index = Number(block.dataset.index); const offsets = {ArrowLeft:-1,ArrowRight:1,ArrowUp:-8,ArrowDown:8}; if (event.key in offsets) { event.preventDefault(); tileAt(Math.max(0,Math.min(63,index + offsets[event.key]))).focus(); } });
$('restart').addEventListener('click',start); $('play-again').addEventListener('click',start);
$('sound').addEventListener('click',() => { sound = !sound; $('sound').setAttribute('aria-label',sound ? 'Disable sound' : 'Enable sound'); $('sound').setAttribute('aria-pressed',String(sound)); document.querySelector('.sound-state').textContent = sound ? 'ON' : 'OFF'; if (sound) playTone(); });
$('shake').addEventListener('click',() => {
  if (busy || moves <= 0) return;
  if (hasMoves(board)) moves--;
  for (let attempt = 0; attempt < 100; attempt++) {
    for (let i = board.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [board[i],board[j]] = [board[j],board[i]]; }
    if (hasMoves(board)) break;
  }
  render(); updateHint(); announce('Shuffled');
  if (!moves) { $('final-score').textContent = score.toLocaleString(); $('end-screen').hidden = false; $('play-again').focus(); }
});
$('help').addEventListener('click',() => $('help-dialog').showModal());
$('close-help').addEventListener('click',() => $('help-dialog').close());
start();
