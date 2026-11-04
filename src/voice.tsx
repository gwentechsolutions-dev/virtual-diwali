import React,{useEffect,useRef,useState} from 'react';
import type {Connection} from './network';
import type {Snapshot} from '../shared/catalog';
type Peer={pc:RTCPeerConnection;audio:HTMLAudioElement;candidates:RTCIceCandidateInit[]};
export function VoiceControls({connection,selfId,snapshot,masterVolume=1,onSpeakersChange}:{connection:Connection;selfId:string;snapshot:Snapshot;masterVolume?:number;onSpeakersChange:(ids:string[])=>void}){
 const [enabled,setEnabled]=useState(false),[status,setStatus]=useState('Microphone off'),[members,setMembers]=useState<string[]>([]),[muted,setMuted]=useState<string[]>([]),[volume,setVolume]=useState(.8),[proximity,setProximity]=useState(true);
 const stream=useRef<MediaStream|undefined>(undefined),peers=useRef(new Map<string,Peer>()),config=useRef<RTCConfiguration>({iceServers:[]}),generation=useRef(0);
 const [states,setStates]=useState<Record<string,string>>({});
 const [speaking,setSpeaking]=useState<string[]>([]);
 const settings=useRef({snapshot,muted,volume,proximity,masterVolume,onSpeakersChange});settings.current={snapshot,muted,volume,proximity,masterVolume,onSpeakersChange};
 const closePeer=(id:string)=>{const p=peers.current.get(id);if(p){p.pc.close();p.audio.pause();p.audio.srcObject=null;peers.current.delete(id);}};
 const stop=()=>{generation.current++;stream.current?.getTracks().forEach(t=>t.stop());stream.current=undefined;for(const id of peers.current.keys())closePeer(id);connection.room?.send('voice-state',false);setEnabled(false);setMembers([]);setSpeaking([]);settings.current.onSpeakersChange([]);setStatus('Microphone off');};
 const peer=(id:string)=>{
  const existing=peers.current.get(id);if(existing)return existing;
  const pc=new RTCPeerConnection(config.current),audio=new Audio();audio.autoplay=true;
  const p={pc,audio,candidates:[] as RTCIceCandidateInit[]};peers.current.set(id,p);
  for(const track of stream.current?.getTracks()??[])pc.addTrack(track,stream.current!);
  pc.onicecandidate=e=>{if(e.candidate)connection.room?.send('voice-signal',{to:id,candidate:e.candidate.toJSON()});};
  pc.ontrack=e=>{audio.srcObject=e.streams[0]??new MediaStream([e.track]);void audio.play().catch(()=>setStatus('Tap Join voice again to enable playback'));};
  pc.onconnectionstatechange=()=>{setStates(s=>({...s,[id]:pc.connectionState}));if(pc.connectionState==='failed')setStatus('Voice connection failed. Leave and rejoin voice.');};
  return p;
 };
 useEffect(()=>{
  connection.onVoiceConfig=c=>{config.current=c;};
  connection.onVoiceDisconnect=()=>{stop();setStatus('Voice stopped after connection loss');};
  connection.onVoiceRoster=ids=>{
   setMembers(ids);
   for(const id of peers.current.keys())if(!ids.includes(id))closePeer(id);
   if(!stream.current||!ids.includes(selfId))return;
   for(const id of ids)if(id!==selfId&&!peers.current.has(id)){
    const p=peer(id);
    if(selfId<id)void(async()=>{try{const offer=await p.pc.createOffer();await p.pc.setLocalDescription(offer);connection.room?.send('voice-signal',{to:id,description:p.pc.localDescription?.toJSON()});}catch{setStatus('Could not start a voice connection');}})();
   }
  };
  connection.onVoiceSignal=async signal=>{
   if(!stream.current||signal.from===selfId)return;
   const p=peer(signal.from);
   try{
    if(signal.description){await p.pc.setRemoteDescription(signal.description);for(const c of p.candidates)await p.pc.addIceCandidate(c);p.candidates=[];
     if(signal.description.type==='offer'){await p.pc.setLocalDescription(await p.pc.createAnswer());connection.room?.send('voice-signal',{to:signal.from,description:p.pc.localDescription?.toJSON()});}
    }else if(signal.candidate){if(p.pc.remoteDescription)await p.pc.addIceCandidate(signal.candidate);else p.candidates.push(signal.candidate);}
   }catch{setStatus('Voice connection interrupted. Leave and rejoin voice.');}
  };
  let sampling=false,disposed=false;
  const energy=new Map<string,{energy:number;duration:number}>(),lastSpeech=new Map<string,number>();
  const detect=(id:string,report:any)=>{
   let level=report.audioLevel??0;
   if(typeof report.totalAudioEnergy==='number'&&typeof report.totalSamplesDuration==='number'){
    const previous=energy.get(id);
    if(previous&&report.totalSamplesDuration>previous.duration)
      level=Math.max(level,Math.sqrt(Math.max(0,(report.totalAudioEnergy-previous.energy)/(report.totalSamplesDuration-previous.duration))));
    energy.set(id,{energy:report.totalAudioEnergy,duration:report.totalSamplesDuration});
   }
   if(level>.015)lastSpeech.set(id,Date.now());
  };
  const timer=setInterval(async()=>{
   const s=settings.current,me=s.snapshot.players.find(p=>p.id===selfId);
   for(const [id,p] of peers.current){const other=s.snapshot.players.find(player=>player.id===id);const distance=me&&other?Math.hypot(me.x-other.x,me.z-other.z):100;
    p.audio.volume=s.muted.includes(id)?0:s.volume*s.masterVolume*(s.proximity?Math.max(0,Math.min(1,(24-distance)/20)):1);
   }
   if(sampling)return;sampling=true;
   try{
    await Promise.all([...peers.current].map(async([id,p])=>{
     try{const reports=await p.pc.getStats();reports.forEach(report=>{
      if(report.type==='inbound-rtp'&&report.kind==='audio')detect(id,report);
      if(report.type==='media-source'&&report.kind==='audio'&&stream.current?.getAudioTracks()[0]?.enabled)detect(selfId,report);
     });}catch{/* Peer may have closed while collecting stats. */}
    }));
    if(disposed)return;
    const ids=[...lastSpeech].filter(([id,time])=>Date.now()-time<450&&(id===selfId?stream.current?.getAudioTracks()[0]?.enabled:peers.current.has(id))).map(([id])=>id).sort();
    setSpeaking(old=>old.join()===ids.join()?old:ids);
    settings.current.onSpeakersChange(ids);
   }finally{sampling=false;}
  },200);
  return()=>{disposed=true;clearInterval(timer);stop();connection.onVoiceRoster=()=>{};connection.onVoiceSignal=()=>{};connection.onVoiceConfig=()=>{};connection.onVoiceDisconnect=()=>{};};
 },[connection,selfId]);
 const join=async()=>{
  const token=++generation.current;setStatus('Waiting for microphone permission');
  try{
   if(!navigator.mediaDevices?.getUserMedia)throw Error('Voice needs HTTPS or localhost and a supported browser.');
   const local=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true},video:false});
   if(token!==generation.current){local.getTracks().forEach(t=>t.stop());return;}
   stream.current=local;setEnabled(true);setStatus('Microphone on · waiting for friends');connection.room?.send('voice-state',true);
  }catch(error){setStatus(error instanceof Error?error.message:'Microphone unavailable');}
 };
 return <details className="voice-controls"><summary>Voice chat · {enabled?'on':'off'}</summary>
  <p>Joining shares your microphone with friends who join voice in this room. Leaving stops microphone access.</p>
  <button className="secondary" onClick={()=>enabled?stop():void join()}>{enabled?'Leave voice':'Join voice'}</button>
  <span role="status">{status}</span>
  {enabled&&<><button className="secondary" onClick={()=>{const track=stream.current?.getAudioTracks()[0];if(track){track.enabled=!track.enabled;setStatus(track.enabled?'Microphone on':'Microphone muted');}}}>Toggle microphone mute</button>
   <label>Voice volume<input aria-label="Voice volume" type="range" min="0" max="1" step=".05" value={volume} onChange={e=>setVolume(Number(e.target.value))}/></label>
   <label><input type="checkbox" checked={proximity} onChange={e=>setProximity(e.target.checked)}/> Nearby voices only</label>
   {members.filter(id=>id!==selfId).map(id=><button key={id} data-voice-state={states[id]??'connecting'} data-speaking={speaking.includes(id)} className="text-button" onClick={()=>setMuted(m=>m.includes(id)?m.filter(v=>v!==id):[...m,id])}>{muted.includes(id)?'Unmute':'Mute'} {snapshot.players.find(p=>p.id===id)?.name??'Friend'} · {speaking.includes(id)?'speaking':states[id]??'connecting'}</button>)}
  </>}
 </details>;
}
