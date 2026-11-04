import {test, expect} from '@playwright/test';

test('world remains rendered through repeated firework creation and disposal', async ({page}) => {
  const errors:string[]=[];
  page.on('pageerror', error=>errors.push(error.message));
  page.on('console', message=>{
    if(message.type()==='error' && /shader|webgl|context lost/i.test(message.text())) errors.push(message.text());
  });
  await page.route('**/render-check',route=>route.fulfill({contentType:'text/html',body:'<canvas id="review" width="960" height="640" style="width:960px;height:640px"></canvas>'}));
  await page.goto('/render-check');
  await page.evaluate(async()=>{
    const load=new Function('path','return import(path)');
    const {FestivalWorld}=await load('/src/game/world.ts');
    const {fireworks}=await load('/shared/catalog.ts');
    const world=new FestivalWorld(document.querySelector('canvas'));
    let clock=100000;
    world.now=()=>clock;
    world.setSnapshot({time:clock,code:'RENDER',host:'',locked:false,limit:8,players:[],events:[],finaleAt:0,lights:true});
    world.camera.target.set(0,2,15);
    world.camera.alpha=-Math.PI/2;world.camera.beta=1.2;world.camera.radius=14;
    (window as any).review={world,fireworks,setClock:(value:number)=>clock=value};
  });
  await expect.poll(()=>page.evaluate(()=>{
    const s=(window as any).review.world.scene;
    return s.isReady()? 'ready':JSON.stringify({pending:s.getWaitingItemsCount(),textures:s.textures.filter((t:any)=>!t.isReady()).map((t:any)=>t.name),meshes:s.meshes.filter((m:any)=>!m.isReady(true)).map((m:any)=>m.name),camera:s.activeCamera.isReady(true),layers:s.effectLayers.map((l:any)=>[l.name,l.isLayerReady()]),effects:s.getEngine().areAllEffectsReady(),checks:s._isReadyChecks.map((c:any)=>c.isReady())});
  }),{timeout:30000}).toBe('ready');
  const sample=()=>page.evaluate(()=>{
    const canvas=document.querySelector('canvas')!;
    const copy=document.createElement('canvas');copy.width=96;copy.height=64;
    const ctx=copy.getContext('2d')!;ctx.drawImage(canvas,0,0,96,64);
    // Lower half contains the road, pavement and buildings; exclude the sky.
    const data=ctx.getImageData(0,32,96,32).data;
    let luminance=0,visible=0;
    for(let i=0;i<data.length;i+=4){const value=(data[i]+data[i+1]+data[i+2])/3;luminance+=value;if(value>30)visible++;}
    return {luminance:luminance/(data.length/4),visible:visible/(data.length/4)};
  });
  await page.waitForTimeout(500);
  const baseline=await sample();
  expect(baseline.visible).toBeGreaterThan(.5);
  for(let cycle=0;cycle<12;cycle++) {
    await page.evaluate((cycle)=>{
      const {world,fireworks,setClock}=(window as any).review;
      const start=100000+cycle*30000;setClock(start+2800);
      const events=Array.from({length:6},(_,j)=>{
        const f=fireworks[(cycle*6+j)%fireworks.length];
        return {id:`${cycle}-${j}`,item:f.id,player:'',x:(j-2.5)*2,z:16,seed:100+j,start,duration:f.duration,outcome:'normal'};
      });
      world.setSnapshot({...world.snapshot,events});
    },cycle);
    await page.waitForTimeout(250);
    const active=await sample();
    if(cycle===0) await page.screenshot({path:'test-results/active-firework-smoke.png'});
    expect(active.visible).toBeGreaterThan(baseline.visible*.8);
    expect(active.luminance).toBeGreaterThan(baseline.luminance*.75);
    await page.evaluate(cycle=>{const r=(window as any).review;r.setClock(100000+cycle*30000+25000);},cycle);
    await page.waitForTimeout(250);
    expect(await page.evaluate(()=>(window as any).review.world.effects.size)).toBe(0);
    const cleared=await sample();
    expect(cleared.visible).toBeGreaterThan(baseline.visible*.9);
  }
  await page.screenshot({path:'test-results/render-after-72-effects.png'});
  await expect.poll(()=>page.evaluate(()=>(window as any).review.world.actors.has('npc-textiles')&&(window as any).review.world.actors.has('npc-crackers'))).toBe(true);
  await page.evaluate(()=>{const w=(window as any).review.world;w.camera.target.set(-12,1.3,5);w.camera.alpha=-Math.PI/2;w.camera.beta=1.3;w.camera.radius=7;});
  await page.waitForTimeout(300);
  await page.screenshot({path:'test-results/textile-shopkeeper.png'});
  await page.evaluate(()=>{
    const r=(window as any).review,start=500000;r.setClock(start+3200);
    r.world.setSnapshot({...r.world.snapshot,shopActions:[{id:'fabric-review',shop:'textiles',player:'',item:'maroon',start,duration:9000}]});
  });
  await page.waitForTimeout(500);
  expect(await page.evaluate(()=>(window as any).review.world.shopPresentations.get('fabric-review').cloth.isVisible)).toBe(true);
  await page.screenshot({path:'test-results/textile-unfolding.png'});
  await page.evaluate(()=>(window as any).review.setClock(510000));
  await page.waitForTimeout(100);
  expect(await page.evaluate(()=>(window as any).review.world.shopPresentations.size)).toBe(0);
  await page.evaluate(()=>{
    const w=(window as any).review.world;w.camera.target.set(0,5,24);w.camera.radius=14;w.camera.beta=1.4;w.camera.alpha=-Math.PI/2;
  });
  await page.waitForTimeout(300);
  await page.screenshot({path:'test-results/festival-board-fitted.png'});
  await page.evaluate(()=>{
    const w=(window as any).review.world;w.camera.target.set(0,1.2,15);w.camera.radius=7;w.lookAtSky();
    w.setSnapshot({...w.snapshot,events:[{id:'sky-review',item:'aerial',player:'',x:0,z:20,start:507200,duration:7000,seed:47,outcome:'normal'}]});
  });
  await page.waitForTimeout(300);
  const sky=await page.evaluate(()=>{const c=(window as any).review.world.camera;return {height:c.position.y,up:c.getForwardRay().direction.y};});
  expect(sky.height).toBeGreaterThanOrEqual(.69);expect(sky.up).toBeGreaterThan(.4);
  await page.screenshot({path:'test-results/skyshot-camera.png'});
  expect(errors).toEqual([]);
  await page.evaluate(()=>(window as any).review.world.dispose());
});
