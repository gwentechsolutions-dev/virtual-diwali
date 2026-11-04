import {writeFileSync,renameSync} from 'node:fs';
export function saveJsonAtomic(path:string,value:unknown,io={writeFileSync,renameSync}):Error|undefined{
 try{
  io.writeFileSync(path+'.tmp',JSON.stringify(value),{mode:0o600});
  io.renameSync(path+'.tmp',path);
 }catch(error){return error instanceof Error?error:new Error(String(error));}
}
