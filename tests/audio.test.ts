import {test} from 'node:test';
import assert from 'node:assert/strict';
import {fireworkSoundCues} from '../shared/fireworkAudio';
import {fireworks,type FireworkEvent} from '../shared/catalog';
const event:FireworkEvent={id:'sound',item:'display-pack',player:'',x:0,z:15,start:1000,duration:18000,seed:123,outcome:'normal'};
test('sound sequence matches all staggered aerial bursts and serial flashes',()=>{
 const cues=fireworkSoundCues(event);
 assert.deepEqual(cues.filter(c=>c.kind==='boom').map(c=>c.time),[2,4.2,6.4,8.600000000000001,10.8,13]);
 assert.equal(fireworkSoundCues({...event,item:'serial',duration:6000}).filter(c=>c.kind==='serial').length,12);
 assert.deepEqual(fireworkSoundCues(event),fireworkSoundCues({...event}));
});
test('all catalogue cues end within their event; no-burst produces no explosion',()=>{
 for(const f of fireworks){const cues=fireworkSoundCues({...event,item:f.id,duration:f.duration});assert.ok(cues.length);for(const c of cues){assert.ok(c.time>=0&&c.duration>0);assert.ok(c.time+c.duration<=f.duration/1000+.00001);}}
 assert.deepEqual(fireworkSoundCues({...event,outcome:'no-burst'}).map(c=>c.kind),['sparkler']);
});
