import {test} from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../server/world';
import {shopkeepers} from '../shared/shopkeepers';

test('purchase presentation is authoritative, replay-safe, queued and restored for late guests',()=>{
  const w=new World(),p=w.join('c'.repeat(64),'Buyer','male');
  p.x=10;p.z=2;
  w.buy(p,'flowerpot','first');
  const first={...w.data.shopActions![0]},balance=p.coins;
  w.buy(p,'flowerpot','first');
  assert.equal(p.coins,balance);assert.equal(w.data.shopActions!.length,1);
  w.buy(p,'rocket','second');
  assert.ok(w.data.shopActions![1].start>=first.start+first.duration);
  const restored=new World(JSON.parse(JSON.stringify(w.data)));
  assert.deepEqual(restored.snapshot(first.start+1000).shopActions![0],first);
  assert.equal(shopkeepers([p],first.start+1000,[first]).find(n=>n.id==='npc-crackers')!.emote,'Shop');
  assert.equal(restored.snapshot(first.start+first.duration+1).shopActions!.some(a=>a.id===first.id),false);
  w.buy(p,'single','third');const before=p.coins;
  assert.throws(()=>w.buy(p,'single','fourth'),/serving/);assert.equal(p.coins,before);
});
