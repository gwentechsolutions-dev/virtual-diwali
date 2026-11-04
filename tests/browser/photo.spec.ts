import {test,expect} from '@playwright/test';
test('consenting friends share a photo countdown and can save or leave it',async({browser})=>{
 const a=await browser.newContext(),b=await browser.newContext(),host=await a.newPage(),friend=await b.newPage();
 try{
  await host.goto('/');await host.getByRole('button',{name:'Create Celebration',exact:true}).click();await host.getByLabel('Your name').fill('Photo host');await host.getByRole('button',{name:'Create & enter celebration'}).click();await expect(host.locator('.game-ui')).toBeVisible();
  await friend.goto(host.url());await friend.getByRole('button',{name:'Join Friends',exact:true}).click();await friend.getByLabel('Your name').fill('Photo friend');await friend.getByRole('button',{name:'Join celebration',exact:true}).click();await expect(friend.locator('.game-ui')).toBeVisible();
  for(const page of [host,friend]){await page.getByRole('button',{name:'Friends',exact:true}).click();await page.getByRole('button',{name:'Open photo booth',exact:true}).click();await page.getByRole('button',{name:'Join photo area',exact:true}).click();await expect(page.getByRole('button',{name:'Leave photo area',exact:true})).toBeVisible();}
  await host.getByRole('button',{name:'Start photo countdown',exact:true}).click();
  await expect(host.locator('.photo-moment')).toBeVisible();await expect(friend.locator('.photo-moment')).toBeVisible();
  await friend.getByRole('button',{name:'Close panel'}).click();
  await expect(host.getByRole('button',{name:'Save group photo',exact:true})).toBeEnabled({timeout:7000});
  const download=host.waitForEvent('download');await host.getByRole('button',{name:'Save group photo',exact:true}).click();await (await download).saveAs('test-results/staged-group-photo.png');
  await friend.getByRole('button',{name:'Leave photo moment',exact:true}).click();await expect(friend.locator('.photo-moment')).toHaveCount(0);
  await host.getByRole('button',{name:'Leave photo moment',exact:true}).click();await expect(host.locator('.photo-moment')).toHaveCount(0);
 }finally{await a.close();await b.close();}
});
