import { test, expect } from "@playwright/test";

test("login", async ({ page }) => {
  // .locator() #1 — fragile positional xpath
  await page.locator("//div[3]/span[2]/button").click();
  // .locator() #2 — id css
  await page.locator("#username").fill("admin");
  // stable getByRole (first arg "button" is the selector)
  await page.getByRole("button", { name: "Sign in" }).click();
  // stable getByTestId
  await page.getByTestId("dashboard").waitFor();
  // .locator() #3 — duplicate of #1
  await page.locator("//div[3]/span[2]/button").click();

  // dynamic: testid built from a variable -> the final selector is not a plain string
  const id = "42";
  await page.getByTestId(`row-${id}`).click();
});
