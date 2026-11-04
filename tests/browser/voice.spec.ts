import {test,expect,chromium} from '@playwright/test';
test('two fake microphones connect, mute individually, and leave voice',async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream','--autoplay-policy=no-user-gesture-required']});
 try{
  const a=await browser.newContext(),b=await browser.newContext(),host=await a.newPage(),friend=await b.newPage();
  for(const context of [a,b])await context.addInitScript(()=>{
   const original=navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
   (window as any).voiceTestTracks=[];
   (window as any).voiceTestPeers=[];
   (window as any).voiceTestAudio=[];
   const AudioElement=window.Audio;
   window.Audio=new Proxy(AudioElement,{construct(target,args){const audio=Reflect.construct(target,args);(window as any).voiceTestAudio.push(audio);return audio;}});
   const Peer=window.RTCPeerConnection;
   window.RTCPeerConnection=new Proxy(Peer,{construct(target,args){const pc=Reflect.construct(target,args);(window as any).voiceTestPeers.push(pc);return pc;}});
   navigator.mediaDevices.getUserMedia=async constraints=>{const stream=await original(constraints);(window as any).voiceTestTracks.push(...stream.getTracks());return stream;};
  });
  await host.goto('http://127.0.0.1:5173');await host.getByRole('button',{name:'Create Celebration',exact:true}).click();
  await host.getByLabel('Your name').fill('Voice host');await host.getByRole('button',{name:'Create & enter celebration'}).click();
  await expect(host.locator('.game-ui')).toBeVisible();
  await friend.goto(host.url());await friend.getByRole('button',{name:'Join Friends',exact:true}).click();await friend.getByLabel('Your name').fill('Voice friend');await friend.getByRole('button',{name:'Join celebration',exact:true}).click();
  await expect(friend.locator('.game-ui')).toBeVisible();
  for(const page of [host,friend]){await page.locator('.voice-controls summary').click();await page.getByRole('button',{name:'Join voice',exact:true}).click();}
  await expect(host.locator('[data-voice-state="connected"]')).toBeVisible({timeout:20000});
  await expect(friend.locator('[data-voice-state="connected"]')).toBeVisible({timeout:20000});
  for(const page of [host,friend])await expect.poll(()=>page.evaluate(async()=>{
   let bytes=0;for(const pc of (window as any).voiceTestPeers){const stats=await pc.getStats();stats.forEach((s:any)=>{if(s.type==='inbound-rtp'&&s.kind==='audio')bytes+=s.bytesReceived??0;});}return bytes;
  }),{timeout:10000}).toBeGreaterThan(0);
  await expect(host.locator('[data-voice-state="connected"]')).toHaveAttribute('data-speaking','true',{timeout:10000});
  await host.getByRole('button',{name:'Friends',exact:true}).click();
  await expect(host.locator('.participants > div').filter({hasText:'Voice friend'})).toContainText('Speaking now');
  await host.getByRole('button',{name:'Close panel'}).click();
  await expect.poll(()=>host.evaluate(()=>(window as any).voiceTestAudio.at(-1)?.volume??0)).toBeGreaterThan(0);
  await host.getByRole('button',{name:'Settings',exact:true}).click();
  await host.getByRole('slider',{name:'Master volume',exact:true}).focus();
  await host.getByRole('slider',{name:'Master volume',exact:true}).press('Home');
  await expect.poll(()=>host.evaluate(()=>(window as any).voiceTestAudio.at(-1)?.volume)).toBe(0);
  await host.getByRole('slider',{name:'Master volume',exact:true}).press('End');
  await expect.poll(()=>host.evaluate(()=>(window as any).voiceTestAudio.at(-1)?.volume??0)).toBeGreaterThan(0);
  await host.getByRole('button',{name:'Close panel'}).click();
  await host.getByRole('button',{name:/Mute Voice friend/}).click();await expect(host.getByRole('button',{name:/Unmute Voice friend/})).toBeVisible();
  await friend.getByRole('button',{name:'Toggle microphone mute'}).click();await expect(friend.locator('.voice-controls')).toContainText('Microphone muted');
  await expect(host.locator('[data-voice-state="connected"]')).toHaveAttribute('data-speaking','false',{timeout:10000});
  await friend.getByRole('button',{name:'Leave voice',exact:true}).click();await expect(host.locator('[data-voice-state]')).toHaveCount(0);
  expect(await friend.evaluate(()=>(window as any).voiceTestTracks.map((t:MediaStreamTrack)=>t.readyState))).toEqual(['ended']);
  await host.getByRole('button',{name:'Leave voice',exact:true}).click();await expect(host.locator('.voice-controls')).toContainText('Microphone off');
  expect(await host.evaluate(()=>(window as any).voiceTestTracks.map((t:MediaStreamTrack)=>t.readyState))).toEqual(['ended']);
 }finally{await browser.close();}
});
