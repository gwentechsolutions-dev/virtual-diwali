import {test} from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../server/world';
test('group photos arrange only consenting guests, share pose timing, and allow leaving',()=>{
 const w=new World(),host=w.join('a'.repeat(64),'Host','male'),guest=w.join('b'.repeat(64),'Guest','female');
 const original={x:guest.x,z:guest.z};
 assert.throws(()=>w.photo(host,'Wave'),/join/);
 w.photo(host,'ready');w.photo(host,'Wave');
 assert.deepEqual(w.data.photoScene!.participants,[host.id]);
 assert.deepEqual({x:guest.x,z:guest.z},original);
 assert.throws(()=>w.photo(guest,'Idle'),/host/);
 const scene=w.data.photoScene!,position={x:host.x,z:host.z};
 w.move(host,1,0,true,.1);assert.deepEqual({x:host.x,z:host.z},position);
 assert.equal(w.snapshot(scene.start-1).players.find(p=>p.id===host.id)!.emote,'');
 assert.equal(w.snapshot(scene.start+1).players.find(p=>p.id===host.id)!.emote,'Wave');
 const saved=new World(JSON.parse(JSON.stringify(w.data)));assert.deepEqual(saved.snapshot(scene.start+1).photoScene,scene);
 w.photo(host,'leave');assert.deepEqual(w.data.photoScene!.participants,[]);w.move(host,1,0,false,.1);assert.ok(host.x>position.x);
 w.snapshot(scene.end+1);assert.equal(w.data.photoScene,undefined);assert.equal(host.photoReady,false);
});
test('photo staging supports twelve guests without overlapping positions',()=>{
 const w=new World(undefined,12),guests=Array.from({length:12},(_,i)=>w.join((i+1).toString(16).padStart(64,'0'),'Guest '+i,'female'));
 for(const p of guests)w.photo(p,'ready');w.photo(guests[0],'Idle');
 assert.equal(new Set(guests.map(p=>p.x+':'+p.z)).size,12);assert.ok(guests.every(p=>p.yaw===Math.PI&&Math.abs(p.x)<3));
 const end=w.data.photoScene!.end;w.snapshot(end+1);assert.ok(guests.every(p=>!p.photoReady));
});
