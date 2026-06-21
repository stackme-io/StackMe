import { test, expect } from "@playwright/test";

test("login", async ({ page }) => {
  // .locator() #1 — fragile positional xpath
  await page.locator("//div[3]/span[2]/button").click();
  // .locator() #2 — id css
  await page.locator("#username").fill("admin");
  // NOT .locator — stable getByRole
  await page.getByRole("button", { name: "Sign in" }).click();
  // NOT .locator — stable getByTestId
  await page.getByTestId("dashboard").waitFor();
  // .locator() #3 — duplicate of #1
  await page.locator("//div[3]/span[2]/button").click();
});
