import test from 'node:test';
import assert from 'node:assert/strict';
import {groupAt,blastAt,collapse,collapseWithMotion,hasMoves,neighbors} from './engine.js';
const empty = () => Array.from({length:64},(_,i) => ({type:'color',color:(i + Math.floor(i / 8)) % 5}));
test('groups connect orthogonally without wrapping edges',() => { const b = empty(); [0,1,8,9].forEach(i => b[i].color=9); b[18].color=9; assert.equal(groupAt(b,0).length,4); assert.ok(!neighbors(7).includes(8)); });
test('single rockets clear their chosen axis',() => { for (const axis of ['row','col']) { const b = empty(); b[27]={type:'rocket',axis}; const hit=blastAt(b,27).cells; assert.equal(hit.length,8); assert.ok(hit.every(i => axis === 'row' ? Math.floor(i/8)===3 : i%8===3)); } });
test('adjacent rockets clear three rows and columns',() => { const b=empty(); b[27]={type:'rocket',axis:'row'}; b[28]={type:'rocket',axis:'col'}; const hit=blastAt(b,27); assert.equal(hit.combo,true); assert.equal(hit.cells.length,39); });
test('TNT is bounded and chains into rockets',() => { const b=empty(); b[0]={type:'tnt'}; assert.equal(blastAt(b,0).cells.length,9); b[18]={type:'rocket',axis:'row'}; assert.equal(blastAt(b,0).cells.length,14); b[0]={type:'color',color:0}; b[18]={type:'color',color:0}; b[27]={type:'tnt'}; assert.equal(blastAt(b,27).cells.length,25); });
test('gravity preserves order and fills the top',() => { const b=empty(); const original=b[0]; b[8]=null; b[56]=null; const next=collapse(b,() => ({type:'color',color:99})); assert.equal(next[16],original); assert.equal(next[0].color,99); assert.equal(next[8].color,99); assert.equal(next.length,64); assert.ok(next.every(Boolean)); });
test('dead boards and power-ups are detected',() => { const b=empty(); assert.equal(hasMoves(b),false); b[0]={type:'tnt'}; assert.equal(hasMoves(b),true); });
test('a partial blast preserves every survivor and untouched column',() => {
  const b=empty(), before=[...b];
  const removed=[16,24,25,33]; removed.forEach(i => b[i]=null);
  let spawned=0;
  const result=collapseWithMotion(b,() => ({type:'color',color:99,spawned:++spawned}));
  assert.equal(spawned,removed.length);
  for (let i=0;i<64;i++) {
    if (removed.includes(i)) { assert.ok(!result.board.includes(before[i])); continue; }
    const next=result.board.indexOf(before[i]);
    assert.ok(next>=i,'survivors only fall downward');
    assert.equal(next%8,i%8,'survivors remain in the same column');
    if (i%8>1 || i>=40) assert.equal(next,i,'unaffected tiles remain exactly in place');
  }
});
test('new tiles enter from above in order, survivors animate from original rows',() => {
  const b=empty(); b[24]=null; b[40]=null;
  const {board,motion}=collapseWithMotion(b,() => ({type:'color',color:9}));
  assert.deepEqual(motion.get(board[0]),{fromRow:-2,toRow:0,col:0,fresh:true});
  assert.deepEqual(motion.get(board[8]),{fromRow:-1,toRow:1,col:0,fresh:true});
  assert.deepEqual(motion.get(b[0]),{fromRow:0,toRow:2,col:0,fresh:false});
  assert.deepEqual(motion.get(b[48]),{fromRow:6,toRow:6,col:0,fresh:false});
});
test('created power-ups survive gravity without being replaced',() => {
  const b=empty(), rocket={type:'rocket',axis:'row'}; b[27]=rocket; b[35]=null; b[43]=null;
  const {board,motion}=collapseWithMotion(b,() => ({type:'color',color:1}));
  assert.equal(board[43],rocket);
  assert.equal(motion.get(rocket).fromRow,3);
  assert.equal(motion.get(rocket).toRow,5);
});
