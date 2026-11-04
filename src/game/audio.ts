import {seeded,type FireworkEvent} from '../../shared/catalog';
import {fireworkSoundCues,type SoundCue} from '../../shared/fireworkAudio';
export class FestivalAudio {
  context?: AudioContext;
  get volume(){return this.level;}
  set volume(value:number){this.level=value;if(this.master&&this.context)this.master.gain.setTargetAtTime(value,this.context.currentTime,.03);}
  played = new Set<string>();
  timelines=new Map<string,SoundCue[]>();
  master?:GainNode;
  private level=.75;
  limiter?:DynamicsCompressorNode;
  enable() {
    this.context ??= new AudioContext();
    if(!this.master){
      this.master=this.context.createGain();this.master.gain.value=this.level;
      this.limiter=this.context.createDynamicsCompressor();this.limiter.threshold.value=-6;this.limiter.knee.value=12;this.limiter.ratio.value=8;this.limiter.attack.value=.003;this.limiter.release.value=.2;
      this.master.connect(this.limiter).connect(this.context.destination);
    }
    void this.context.resume();
  }
  play(
    id: string,
    x: number,
    z: number,
    kind: string,
    listener: { x: number; z: number },
    duration=1.1,offset=0,seed=12345,strength=1,
  ) {
    if (this.played.has(id)) return;
    this.played.add(id);
    if (this.played.size > 1000)
      this.played.delete(this.played.values().next().value!);
    const c = this.context;
    if (!c || c.state !== "running" || !this.volume) return;
    if(offset>=duration)return;
    const b = c.createBuffer(1, c.sampleRate * duration, c.sampleRate),
      d = b.getChannelData(0);
    const random=seeded(seed);let low=0,phase=0;
    const continuous=!['serial','boom'].includes(kind);
    for (let i = 0; i < d.length; i++) {
      const t=i/c.sampleRate,u=i/d.length,noise=random()*2-1;
      low=.94*low+.06*noise;phase+=Math.PI*2*(900+2100*u)/c.sampleRate;
      const value=kind==='whistle'||kind==='comet'?Math.sin(phase)*.25+noise*.04:
        kind==='boom'?low*3+Math.sin(t*Math.PI*2*(48-12*u))*.3:
        kind==='chakra'?(noise-low)*(.35+.25*Math.sin(t*Math.PI*36)):
        kind==='crackle'?noise*(Math.sin(t*195+Math.sin(t*7)*4)>.85?.8:.02):
        kind==='sparkler'?(noise-low)*.25:kind==='serial'?noise*.7:low*2+noise*.25;
      d[i]=value*Math.min(1,t/.008)*Math.min(1,(duration-t)/.08)*(continuous?1:Math.exp(-u*7));
    }
    const s = c.createBufferSource();
    s.buffer = b;
    const filter = c.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = kind==='boom'?1100:kind==='serial'?6000:7000;
    const gain = c.createGain();
    gain.gain.value = strength*(continuous?.26:.85);
    const pan = c.createPanner();
    pan.panningModel = "HRTF";
    pan.distanceModel = "inverse";
    pan.refDistance = 10;
    pan.rolloffFactor=.7;
    pan.maxDistance = 80;
    pan.positionX.value = x;
    pan.positionZ.value = z;
    c.listener.positionX.value = listener.x;
    c.listener.positionZ.value = listener.z;
    pan.positionY.value=kind==='boom'?16:.5;
    s.connect(filter).connect(gain).connect(pan).connect(this.master!);
    s.start(0,offset);
    s.onended = () => {
      s.disconnect();
      filter.disconnect();
      gain.disconnect();
      pan.disconnect();
    };
  }
  update(event:FireworkEvent,now:number,listener:{x:number;z:number},angle:number){
    const c=this.context;if(!c||c.state!=='running')return;
    c.listener.forwardX.value=-Math.cos(angle);c.listener.forwardZ.value=-Math.sin(angle);c.listener.positionY.value=1.6;
    if(!this.timelines.has(event.id))this.timelines.set(event.id,fireworkSoundCues(event));
    const age=(now-event.start)/1000;
    this.timelines.get(event.id)!.forEach((cue,i)=>{
      const offset=age-cue.time;
      if(offset>=0)this.play(event.id+':'+i,event.x,event.z,cue.kind,listener,cue.duration,offset,event.seed+i*7919,event.outcome==='weak'?.35:1);
    });
  }
  release(id:string){this.timelines.delete(id);for(const key of this.played)if(key.startsWith(id+':'))this.played.delete(key);}
  dispose() {
    void this.context?.close();
  }
}
