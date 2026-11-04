import {test,expect} from '@playwright/test';
test('production female preview uses bundled saree model without local files',async({page})=>{
 test.skip(!process.env.PRODUCTION_REVIEW_URL,'Run against a built Vite preview with PRODUCTION_REVIEW_URL.');
 const errors:string[]=[],requests:string[]=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push(r.url()));
 await page.goto(process.env.PRODUCTION_REVIEW_URL!);
 const loaded=page.waitForResponse(r=>r.url().endsWith('/assets/characters/woman_saree_animated.glb')&&r.ok());
 await page.getByRole('button',{name:'Create Celebration',exact:true}).click();
 const response=await loaded,buffer=await response.body();
 expect(buffer.toString('ascii',0,4)).toBe('glTF');
 const model=JSON.parse(buffer.toString('utf8',20,20+buffer.readUInt32LE(12)));
 expect(model.skins[0].joints).toHaveLength(19);
 expect(model.animations.map((a:{name:string})=>a.name)).toContain('Namaste');
 expect(model.animations).toHaveLength(11);
 await page.waitForTimeout(1800);
 await page.screenshot({path:'test-results/production-female-saree.png'});
 expect(requests.some(url=>url.includes('/local-character/')||url.endsWith('/assets/female.glb'))).toBe(false);
 expect(errors).toEqual([]);
});
