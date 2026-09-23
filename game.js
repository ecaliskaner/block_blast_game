import { SIZE, groupAt, blastAt, hasMoves, collapse } from './engine.js';
const $ = id => document.getElementById(id);
const colors = ['pink','orange','blue','purple','green'];
const symbols = ['✦','◆','●','✿','⬟'];
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
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
  $('goal-label').textContent = score >= 6000 ? 'ABSOLUTE BLAST LEGEND' : score >= 3000 ? 'YOU’RE ON FIRE' : score >= 1000 ? 'NOW WE’RE TALKING' : 'LET’S WARM THINGS UP';
}
function render(animate = false) {
  $('board').replaceChildren(...board.map((cell, i) => {
    const button = document.createElement('button'); button.className = `block ${cell.type === 'color' ? colors[cell.color] : 'special ' + cell.type}${animate ? ' enter' : ''}`;
    button.dataset.index = i; button.setAttribute('role','gridcell');
    button.setAttribute('aria-label', `${cell.type === 'color' ? colors[cell.color] + ' block' : cell.type === 'rocket' ? cell.axis + ' rocket' : 'TNT'}, row ${Math.floor(i / SIZE) + 1}, column ${i % SIZE + 1}`);
    button.innerHTML = cell.type === 'color' ? `<span class="gem">${symbols[cell.color]}</span>` : cell.type === 'rocket' ? `<span class="rocket ${cell.axis === 'col' ? 'vertical' : ''}">➜</span>` : '<span class="tnt-label">TNT</span>';
    if (animate) button.style.animationDelay = `${Math.floor(i / SIZE) * 12}ms`;
    return button;
  })); stats();
}
function ensureMoves() {
  if (hasMoves(board)) return false;
  // Guarantee a legal group without discarding earned power-ups.
  const color = Math.floor(Math.random() * 5);
  for (const i of [48,49,56,57]) board[i] = {type:'color',color};
  return true;
}
function start() {
  generation++; busy = false; score = 0; moves = 30; board = Array.from({length:64}, randomCell);
  // A friendly first move teaches the rocket mechanic naturally.
  for (const i of [26,27,28,35,36]) board[i] = {type:'color',color:0};
  $('end-screen').hidden = true; $('toast').classList.remove('show'); $('hint').textContent = 'Tap 4+ connected blocks of the same color'; render(true);
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
const canvas = $('particles'), ctx = canvas.getContext('2d'); let pieces = [], frame = 0;
function particles(indices) {
  if (reduced) return;
  const rect = $('board').getBoundingClientRect(), outer = canvas.getBoundingClientRect();
  canvas.width = outer.width * devicePixelRatio; canvas.height = outer.height * devicePixelRatio; ctx.setTransform(devicePixelRatio,0,0,devicePixelRatio,0,0);
  const palette = ['#f26a9c','#ffb54e','#57baf0','#9b80ed','#a9d974'];
  for (const i of indices) for (let n = 0; n < 8; n++) pieces.push({x:rect.left - outer.left + (i % 8 + .5) * rect.width / 8,y:rect.top - outer.top + (Math.floor(i / 8) + .5) * rect.height / 8,vx:(Math.random() - .5) * 10,vy:-Math.random() * 8 - 1,life:1,size:3 + Math.random() * 5,color:palette[board[i]?.color] || '#efffab'});
  if (!frame) draw();
}
function draw() {
  ctx.clearRect(0,0,canvas.width,canvas.height);
  pieces = pieces.filter(p => p.life > 0);
  for (const p of pieces) { p.x += p.vx; p.y += p.vy; p.vy += .24; p.life -= .025; ctx.globalAlpha = Math.max(0,p.life); ctx.fillStyle = p.color; ctx.fillRect(p.x,p.y,p.size,p.size); }
  ctx.globalAlpha = 1; frame = pieces.length ? requestAnimationFrame(draw) : 0;
}
async function activate(index) {
  if (busy || moves <= 0) return;
  const restoreFocus = document.activeElement === $('board').children[index];
  const cell = board[index]; let indices, special, combo = false;
  if (cell.type === 'color') {
    indices = groupAt(board,index);
    if (indices.length < 4) { const el = $('board').children[index]; el.classList.remove('invalid'); void el.offsetWidth; el.classList.add('invalid'); $('hint').textContent = 'Find a group of at least 4 matching blocks'; return; }
    if (indices.length >= 10) special = {type:'tnt'};
    else if (indices.length >= 5) special = {type:'rocket',axis:Math.random() < .5 ? 'row' : 'col'};
  } else { const blast = blastAt(board,index); indices = blast.cells; combo = blast.combo; }
  busy = true; const current = generation; moves--; score += indices.length * 40 + (special ? indices.length * 20 : 0) + (combo ? 500 : 0); saveBest(); stats();
  indices.forEach(i => $('board').children[i].classList.add('pop')); particles(indices); playTone(cell.type !== 'color' ? 2 : 1);
    if (!reduced && (cell.type !== 'color' || special)) { const shell = document.querySelector('.board-shell'); shell.classList.remove('shaking'); void shell.offsetWidth; shell.classList.add('shaking'); }
  if (combo) announce('TRIPLE CHAOS!'); else if (cell.type === 'tnt') announce('BOOM!'); else if (special?.type === 'tnt') announce('TNT! OH, YES.'); else if (special) announce('ROCKET READY!'); else if (indices.length === 4) announce('+160');
  await delay(reduced ? 0 : 210); if (current !== generation) return;
  indices.forEach(i => board[i] = null); if (special) board[index] = special;
  board = collapse(board,randomCell); const rescued = ensureMoves(); render(true);
  if (restoreFocus) $('board').children[index].focus({preventScroll:true});
  $('hint').textContent = rescued ? 'Fresh match added — keep the blasts going!' : special ? 'Tap your power-up to set it off!' : 'Tap 4+ connected blocks of the same color';
  await delay(reduced ? 0 : 320); if (current !== generation) return; busy = false;
  if (moves === 0) { $('final-score').textContent = score.toLocaleString(); $('end-screen').hidden = false; $('play-again').focus(); }
}
$('board').addEventListener('click',event => { const block = event.target.closest('.block'); if (block) activate(Number(block.dataset.index)); });
$('board').addEventListener('keydown', event => { const block = event.target.closest('.block'); if (!block) return; const index = Number(block.dataset.index); const offsets = {ArrowLeft:-1,ArrowRight:1,ArrowUp:-8,ArrowDown:8}; if (event.key in offsets) { event.preventDefault(); $('board').children[Math.max(0,Math.min(63,index + offsets[event.key]))].focus(); } });
$('restart').addEventListener('click',start); $('play-again').addEventListener('click',start);
$('sound').addEventListener('click',() => { sound = !sound; $('sound').setAttribute('aria-label',sound ? 'Disable sound' : 'Enable sound'); $('sound').setAttribute('aria-pressed',String(sound)); document.querySelector('.sound-state').textContent = sound ? 'ON' : 'OFF'; if (sound) playTone(); });
$('shake').addEventListener('click',() => { if (busy || moves <= 0) return; for (let i = board.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [board[i],board[j]] = [board[j],board[i]]; } moves--; ensureMoves(); render(true); announce('REMIX!'); if (!moves) { $('final-score').textContent = score.toLocaleString(); $('end-screen').hidden = false; $('play-again').focus(); } });
start();
