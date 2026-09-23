import test from 'node:test';
import assert from 'node:assert/strict';
import {blastAt} from './engine.js';
import {planBlast} from './effects-plan.js';
const board = () => Array.from({length:64},() => ({type:'color',color:0}));
test('rocket hits travel out from the launch cell along its axis',() => {
  for (const axis of ['row','col']) {
    const b=board(); b[27]={type:'rocket',axis};
    const plan=planBlast(blastAt(b,27).bursts);
    assert.equal(plan.hits.size,8); assert.equal(plan.hits.get(27),120);
    assert.equal(plan.hits.get(axis==='row'?28:35),165);
    assert.equal(plan.hits.get(axis==='row'?31:59),300);
    assert.ok(plan.duration>Math.max(...plan.hits.values())+170);
  }
});
test('combo visuals follow exactly the actual three-row and three-column blast',() => {
  const b=board(); b[27]={type:'rocket',axis:'row'};b[28]={type:'rocket',axis:'col'};
  const blast=blastAt(b,27),plan=planBlast(blast.bursts);
  assert.equal(plan.events.length,1);assert.equal(plan.events[0].combo,true);
  assert.deepEqual([...plan.hits.keys()].sort((a,b)=>a-b),blast.cells.sort((a,b)=>a-b));
  assert.ok([...plan.hits.values()].every(Number.isFinite));
});
test('chain reaction effects start when the first blast reaches the power-up',() => {
  const b=board(); b[27]={type:'rocket',axis:'row'};b[30]={type:'tnt'};b[46]={type:'rocket',axis:'col'};
  const blast=blastAt(b,27),plan=planBlast(blast.bursts);
  assert.equal(plan.events[1].start,255);
  assert.equal(plan.events[2].start,465);
  assert.equal(plan.hits.size,blast.cells.length);
});
