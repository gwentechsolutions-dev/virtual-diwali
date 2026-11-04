import type {IncomingMessage,ServerResponse} from 'node:http';
import {serverEndpoints} from '../shared/serverConfig';
export default function handler(_req:IncomingMessage,res:ServerResponse){
 res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');
 try{
  if(!process.env.GAME_SERVER_URL){res.statusCode=503;res.end(JSON.stringify({error:'Online celebrations are not connected to a multiplayer server yet.'}));return;}
  res.end(JSON.stringify(serverEndpoints(process.env.GAME_SERVER_URL)));
 }catch{
  res.statusCode=503;res.end(JSON.stringify({error:'The multiplayer server connection is not configured correctly.'}));
 }
}
