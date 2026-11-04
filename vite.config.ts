import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import {createReadStream,existsSync} from 'node:fs';
import {resolve} from 'node:path';
const localFemale=resolve('assets-source/characters/female/female-rigged-draft.glb');
export default defineConfig({
  define:{'import.meta.env.VITE_LOCAL_FEMALE':JSON.stringify(existsSync(localFemale)?'true':'false')},
  plugins: [react(), {
    name:'local-character-review',
    configureServer(server){
      server.middlewares.use('/local-character/female.glb',(req,res)=>{
        if(req.url!=='/'&&req.url!==''){res.statusCode=404;res.end();return;}
        res.setHeader('Content-Type','model/gltf-binary');
        res.setHeader('Cache-Control','no-store');
        const stream=createReadStream(existsSync(localFemale)?localFemale:resolve('public/assets/female.glb'));
        stream.on('error',()=>{res.statusCode=404;res.end('Character working file unavailable');});
        stream.pipe(res);
      });
    }
  }],
  server: {
    port: 5173,
    proxy: {
      "/api": "http://127.0.0.1:2567",
      "/matchmake": "http://127.0.0.1:2567",
    },
  },
  build: { chunkSizeWarningLimit: 1800 },
});
