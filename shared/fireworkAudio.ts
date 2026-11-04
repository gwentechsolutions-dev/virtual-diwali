import {fireworks,type FireworkEvent} from './catalog';
export interface SoundCue {time:number;duration:number;kind:string}
export function fireworkSoundCues(event:FireworkEvent):SoundCue[]{
 const kind=fireworks.find(f=>f.id===event.item)!.kind,duration=event.duration/1000,cues:SoundCue[]=[];
 const add=(time:number,length:number,sound:string)=>{if(time<duration)cues.push({time,duration:Math.min(length,duration-time),kind:sound});};
 if(event.outcome==='no-burst'){add(0,.6,'sparkler');return cues;}
 if(kind==='single')add(.6,.4,'serial');
 else if(kind==='serial')for(let i=0;i<12;i++)add(i*.4,.2,'serial');
 else if(['rocket','aerial','willow','palm','ring','colour-peony','multishot','display-pack'].includes(kind)){
  const count=kind==='display-pack'?6:kind==='multishot'?3:1;
  for(let i=0;i<count;i++){add(i*2.2,1.9,'whistle');add(2+i*2.2,2.2,'boom');if(kind==='willow'||kind==='display-pack')add(2.6+i*2.2,2,'crackle');}
 }else for(let t=0;t<duration-.5;t+=.9)add(t,Math.min(1.1,duration-t),kind);
 return cues;
}
