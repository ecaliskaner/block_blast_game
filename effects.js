export const rocketMarkup = `<svg class="rocket-art" viewBox="0 0 48 28" aria-hidden="true"><path fill="#e17e50" d="M14 7 7 1v10m7 10-7 6V17"/><path fill="#e8a450" d="M10 10H3l3 4-3 4h7z"/><path fill="#fff5d7" stroke="#34545b" stroke-width="1.5" d="M10 8c14-6 23-3 34 6-11 9-20 12-34 6z"/><path fill="#df7053" d="M32 6c5 2 9 5 12 8-3 3-7 6-12 8z"/><circle cx="23" cy="14" r="4" fill="#76bac8" stroke="#34545b" stroke-width="1.5"/></svg>`;

export function createEffects(board, shell, reduced) {
  const layer = document.createElement('div');
  layer.className = 'blast-effects'; layer.setAttribute('aria-hidden','true'); shell.append(layer);
  const timers = new Set();
  function later(callback,ms) {
    const timer = setTimeout(() => {timers.delete(timer); callback();},ms);
    timers.add(timer);
  }
  function animate(node,frames,options) {
    const animation = node.animate(frames,{...options,fill:'both'});
    animation.finished.then(() => node.remove()).catch(() => {});
  }
  function element(className,x,y) {
    const node = document.createElement('div'); node.className = className;
    node.style.left = `${x}px`; node.style.top = `${y}px`; layer.append(node); return node;
  }
  function shake(strength) {
    if (reduced) return;
    shell.getAnimations().forEach(a => a.cancel());
    shell.animate([{transform:'translate(0,0)'},{transform:`translate(${-strength}px,2px)`},{transform:`translate(${strength}px,-2px)`},{transform:`translate(${-strength/2}px,1px)`},{transform:'translate(0,0)'}],{duration:260});
  }
  function burst(event) {
    const pitch = board.clientWidth / 8;
    const row = Math.floor(event.index / 8), col = event.index % 8;
    const x = (col + .5) * pitch, y = (row + .5) * pitch;
    if (reduced) {
      const mark = element('impact-mark',x,y);
      mark.textContent = event.type === 'tnt' ? '✦' : event.combo ? '✚' : event.axis === 'row' ? '↔' : '↕';
      later(() => mark.remove(),160); return;
    }
    const ring = element(`blast-ring ${event.type === 'tnt' ? 'tnt-ring' : ''}`,x,y);
    const radius = event.type === 'tnt' ? pitch * 5 : pitch * 1.7;
    ring.style.width = ring.style.height = `${radius}px`;
    animate(ring,[{transform:'translate(-50%,-50%) scale(.08)',opacity:1},{opacity:.8,offset:.3},{transform:'translate(-50%,-50%) scale(1)',opacity:0}],{duration:500,easing:'ease-out'});
    later(() => shake(event.combo || event.type === 'tnt' ? 5 : 2.5),120);
    if (event.type === 'tnt') {
      const cloud = element('blast-cloud',x,y);
      cloud.style.width = cloud.style.height = `${pitch * 5}px`;
      animate(cloud,[{transform:'translate(-50%,-50%) scale(.05)',opacity:.95},{transform:'translate(-50%,-50%) scale(.85)',opacity:.65,offset:.4},{transform:'translate(-50%,-50%) scale(1.1)',opacity:0}],{duration:470});
      return;
    }
    function launch(cx,cy,angle,distance) {
      const duration = distance / pitch * 45;
      const lane = element('rocket-lane',cx,cy); lane.style.transform = `rotate(${angle}deg)`;
      const trail = document.createElement('div'); trail.className = 'rocket-trail'; lane.append(trail);
      trail.animate([{width:'0px',opacity:1},{width:`${distance}px`,opacity:1,offset:.72},{width:`${distance}px`,opacity:0}],{duration:duration+160,delay:120,fill:'both',easing:'linear'});
      const ship = document.createElement('div'); ship.className = 'flying-rocket'; ship.innerHTML = rocketMarkup; lane.append(ship);
      ship.animate([{transform:'translate(-50%,-50%) scale(.6)',opacity:0},{transform:'translate(-50%,-50%) scale(1.2)',opacity:1}],{duration:120,fill:'both'});
      ship.animate([{transform:'translate(-50%,-50%)',opacity:1},{transform:`translate(calc(-50% + ${distance}px),-50%)`,opacity:1,offset:.94},{transform:`translate(calc(-50% + ${distance}px),-50%)`,opacity:0}],{duration,delay:120,fill:'forwards',easing:'linear'});
      later(() => lane.remove(),duration+310);
    }
    const end = board.clientWidth;
    const rowBlast = r => {const cy=(r+.5)*pitch; launch(x,cy,0,end-x+pitch*.5); launch(x,cy,180,x+pitch*.5);};
    const colBlast = c => {const cx=(c+.5)*pitch; launch(cx,y,90,end-y+pitch*.5); launch(cx,y,-90,y+pitch*.5);};
    if (event.combo) {
      for (let r=Math.max(0,row-1);r<=Math.min(7,row+1);r++) rowBlast(r);
      for (let c=Math.max(0,col-1);c<=Math.min(7,col+1);c++) colBlast(c);
    } else if (event.axis === 'row') rowBlast(row); else colBlast(col);
  }
  return {
    later, burst,
    reset() {for (const timer of timers) clearTimeout(timer); timers.clear(); layer.replaceChildren(); shell.getAnimations().forEach(a => a.cancel());},
    celebrate(node) { if (!reduced) node.animate([{filter:'brightness(1.8)',transform:'scale(.6)'},{filter:'brightness(1.2)',transform:'scale(1.2)',offset:.55},{filter:'brightness(1)',transform:'scale(1)'}],{duration:320}); }
  };
}
