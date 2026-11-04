import type {PublicPlayer,ShopAction} from './catalog';

/** Fixed world residents; never counted as room participants or inventory owners. */
export function shopkeepers(players:PublicPlayer[],now:number,actions:ShopAction[]=[]):PublicPlayer[] {
  return [
    {id:'npc-textiles',name:'Kumar · Chennai Silks',x:-12,outfit:'ivory'},
    {id:'npc-crackers',name:'Selvam · Cracker Corner',x:12,outfit:'saffron'},
  ].map(n=>{
    const z=4.3;
    const nearest=players.filter(p=>p.online).sort((a,b)=>Math.hypot(a.x-n.x,a.z-z)-Math.hypot(b.x-n.x,b.z-z))[0];
    const nearby=nearest&&Math.hypot(nearest.x-n.x,nearest.z-z)<6;
    const greeting=nearby&&now%12000<2500;
    const action=[...actions].reverse().find(a=>'npc-'+a.shop===n.id&&a.start<=now&&a.start+a.duration>now);
    const customer=action&&players.find(p=>p.id===action.player);
    const target=customer??(nearby?nearest:undefined);
    return {...n,type:'male',z,yaw:action?Math.PI:target?Math.atan2(target.x-n.x,target.z-z):Math.PI,
      moving:false,online:true,emote:action?'Shop':greeting?'Wave':'',emoteUntil:action?action.start+action.duration:greeting?now+100:0};
  });
}
