export function serverEndpoints(value:string){
 const url=new URL(value);
 if(url.protocol!=='https:'&&url.protocol!=='http:')throw Error('Use an HTTP(S) multiplayer server URL.');
 if(url.username||url.password||url.search||url.hash)throw Error('The multiplayer server URL must not contain credentials, query parameters or a fragment.');
 const api=url.toString().replace(/\/$/,'');
 url.protocol=url.protocol==='https:'?'wss:':'ws:';
 return {api,ws:url.toString().replace(/\/$/,'')};
}
