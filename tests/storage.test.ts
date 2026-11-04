import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,writeFileSync,renameSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {saveJsonAtomic} from '../server/storage';
test('failed file replacement preserves last saved room and succeeds on retry',()=>{
 const dir=mkdtempSync(join(tmpdir(),'deepavali-storage-')),path=join(dir,'room.json');
 try{
  assert.equal(saveJsonAtomic(path,{coins:100}),undefined);
  const error=saveJsonAtomic(path,{coins:75},{writeFileSync,renameSync:()=>{throw Object.assign(new Error('File locked'),{code:'EPERM'});}});
  assert.equal((error as NodeJS.ErrnoException).code,'EPERM');
  assert.deepEqual(JSON.parse(readFileSync(path,'utf8')),{coins:100});
  assert.deepEqual(JSON.parse(readFileSync(path+'.tmp','utf8')),{coins:75});
  assert.equal(saveJsonAtomic(path,{coins:50},{writeFileSync,renameSync}),undefined);
  assert.deepEqual(JSON.parse(readFileSync(path,'utf8')),{coins:50});
 }finally{rmSync(dir,{recursive:true,force:true});}
});
