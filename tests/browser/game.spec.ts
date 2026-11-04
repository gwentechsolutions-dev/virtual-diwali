import { test, expect } from "@playwright/test";
test("two separate browser sessions join, chat, launch and reconnect", async ({
  browser,
}) => {
  const a = await browser.newContext(),
    b = await browser.newContext();
  const host = await a.newPage(),
    friend = await b.newPage();
  const errors: string[] = [];
  host.on("pageerror", (e) => errors.push(e.stack??e.message));
  friend.on("pageerror", (e) => errors.push(e.stack??e.message));
  await host.goto("/");
  await expect(
    host.getByRole("heading", {
      name: "A thousand lights. Your favourite people.",
    }),
  ).toBeVisible();
  await host.screenshot({ path: "test-results/landing.png" });
  await host
    .getByRole("button", { name: "Create Celebration", exact: true })
    .click();
  await host.getByLabel("Your name").fill("Arun");
  await host.getByRole('button',{name:'Male',exact:true}).click();
  await host.waitForTimeout(1500);
  await host.screenshot({path:'test-results/male-onboarding.png'});
  await host
    .getByRole("button", { name: "Create & enter celebration" })
    .click();
  await expect(host.locator(".game-ui")).toBeVisible();
  await expect(host.locator(".connection-banner")).toHaveCount(0);
  const url = host.url();
  await friend.goto(url);
  await friend
    .getByRole("button", { name: "Join Friends", exact: true })
    .click();
  await friend.getByLabel("Your name").fill("Meena");
  await friend.getByRole('button', {name:'Female',exact:true}).click();
  await friend.waitForTimeout(2500);
  await friend.screenshot({path:'test-results/female-onboarding.png'});
  await friend
    .getByRole("button", { name: "Join celebration", exact: true })
    .click();
  await expect(friend.locator(".game-ui")).toBeVisible();
  await host.getByRole("button", { name: "Friends", exact: true }).click();
  await expect(host.locator(".participants")).toContainText("Meena");
  await host.getByRole("button", { name: "Close panel" }).click();
  await host.getByRole("button", { name: "Chat", exact: true }).click();
  await host
    .getByRole("textbox", { name: "Chat message" })
    .fill("Iniya Deepavali!");
  await host.getByRole("button", { name: "Send message" }).click();
  await friend.getByRole("button", { name: "Chat", exact: true }).click();
  await expect(friend.locator(".messages")).toContainText("Iniya Deepavali!");
  await host.getByRole("button", { name: "Close panel" }).click();
  await friend.getByRole("button", { name: "Close panel" }).click();
  await host.getByRole("button", { name: "Gathering", exact: true }).click();
  await host.getByRole("button", { name: /Festival bag/ }).click();
  await host.getByRole("button", { name: "Place this firework" }).click();
  await host.getByRole("button", { name: /Place & light/ }).click();
  await expect(host.locator(".toast")).toContainText("Firework placed");
  await host.screenshot({ path: "test-results/playing.png" });
  const photoDownload=host.waitForEvent('download');
  await host.getByRole('button',{name:'Save photo',exact:true}).click();
  const photo=await photoDownload;
  expect(photo.suggestedFilename()).toBe('Chennai-Deepavali-2026.png');
  await photo.saveAs('test-results/festival-photo.png');
  await host.getByRole("button", { name: "Friends", exact: true }).click();
  await host.getByRole("button", { name: "Start Grand Finale" }).click();
  await expect(friend.locator(".finale-banner")).toBeVisible();
  await expect(host.locator(".finale-banner")).toBeVisible();
  await host.waitForTimeout(8000);
  await host.screenshot({ path: "test-results/finale.png" });
  await friend.reload();
  await friend
    .getByRole("button", { name: "Join Friends", exact: true })
    .click();
  await friend
    .getByRole("button", { name: "Join celebration", exact: true })
    .click();
  await expect(friend.locator(".game-ui")).toBeVisible();
  await friend.getByRole("button", { name: "Friends", exact: true }).click();
  await expect(friend.locator(".participants")).toContainText("Arun");
  expect(errors).toEqual([]);
  await a.close();
  await b.close();
});
test("mobile onboarding and touch controls fit the viewport", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  await page.goto("/");
  await page
    .getByRole("button", { name: "Create Celebration", exact: true })
    .click();
  await page.getByLabel("Your name").fill("Mobile guest");
  await page
    .getByRole("button", { name: "Create & enter celebration" })
    .click();
  await expect(page.locator(".joystick")).toBeVisible();
  await expect(page.locator(".dock")).toBeVisible();
  await page.waitForTimeout(3000);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  await page.screenshot({ path: "test-results/mobile.png" });
  await context.close();
});
