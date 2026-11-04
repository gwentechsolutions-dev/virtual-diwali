import {test,expect} from '@playwright/test';
test('late sound joins seek into active cues, avoid replay, and mute existing audio',async({page})=>{
 await page.goto('/');
 await page.getByRole('button',{name:'Enable sound',exact:true}).click();
 const result=await page.evaluate(async()=>{
  const load=new Function('path','return import(path)');
  const {FestivalAudio}=await load('/src/game/audio.ts');
  const audio=new FestivalAudio();audio.enable();await audio.context.resume();
  const starts:number[]=[];const create=audio.context.createBufferSource.bind(audio.context);
  audio.context.createBufferSource=()=>{const source=create(),start=source.start.bind(source);source.start=(when=0,offset=0)=>{starts.push(offset);start(when,offset);};return source;};
  const event={id:'late',item:'rocket',seed:123,start:1000,duration:6500,player:'',x:0,z:15,outcome:'normal'};
  audio.update(event,3500,{x:0,z:10},-Math.PI/2);
  const first=starts.length;
  audio.update(event,3510,{x:0,z:10},-Math.PI/2);
  const second=starts.length;
  audio.volume=0;
  await new Promise(resolve=>setTimeout(resolve,150));
  const muted=audio.master.gain.value;
  audio.release('late');const released=audio.timelines.size;
  audio.dispose();
  return {starts,first,second,muted,released};
 });
 expect(result.starts).toEqual([.5]);expect(result.first).toBe(result.second);
 expect(result.muted).toBeLessThan(.01);expect(result.released).toBe(0);
});
