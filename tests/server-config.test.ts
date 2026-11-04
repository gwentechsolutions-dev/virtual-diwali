import {test} from 'node:test';
import assert from 'node:assert/strict';
import {serverEndpoints} from '../shared/serverConfig';
import handler from '../api/game-config';
import type {IncomingMessage,ServerResponse} from 'node:http';
test('backend configuration derives matching HTTPS/WSS endpoints without leaking credentials',()=>{
 assert.deepEqual(serverEndpoints('https://game.example.com/'),{api:'https://game.example.com',ws:'wss://game.example.com'});
 assert.deepEqual(serverEndpoints('http://127.0.0.1:2567'),{api:'http://127.0.0.1:2567',ws:'ws://127.0.0.1:2567'});
 for(const input of ['file:///data','https://user:secret@example.com','https://example.com?token=secret','https://example.com#fragment'])assert.throws(()=>serverEndpoints(input));
});
test('Vercel configuration returns explicit failure until a backend is configured',()=>{
 const original=process.env.GAME_SERVER_URL;
 const request=()=>{
  let body='';const response={statusCode:200,setHeader:()=>{},end:(value:string)=>{body=value;}};
  handler({} as IncomingMessage,response as unknown as ServerResponse);
  return {status:response.statusCode,body:JSON.parse(body)};
 };
 try{
  delete process.env.GAME_SERVER_URL;assert.equal(request().status,503);
  process.env.GAME_SERVER_URL='https://backend.example.com';assert.deepEqual(request(),{status:200,body:{api:'https://backend.example.com',ws:'wss://backend.example.com'}});
  process.env.GAME_SERVER_URL='https://user:secret@backend.example.com';const invalid=request();assert.equal(invalid.status,503);assert.ok(!JSON.stringify(invalid.body).includes('secret'));
 }finally{if(original===undefined)delete process.env.GAME_SERVER_URL;else process.env.GAME_SERVER_URL=original;}
});
