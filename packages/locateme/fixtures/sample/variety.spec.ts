import { test } from "@playwright/test";

// Golden set: each line is labelled with the EXPECTED classification.
// We eyeball the tool output against these labels and iterate the rules.
test("variety", async ({ page }) => {
  // --- FRAGILE (core, confident) ---
  await page.locator("//div[3]/button").click();              // fragile: positional xpath
  await page.locator("(//button)[2]").click();                // fragile: indexed xpath
  await page.locator(".list > li:nth-child(2)").click();      // fragile: nth-child
  await page.locator("div.css-1a2b3c").click();               // fragile: auto-generated class
  await page.locator("//div/span/button").click();            // fragile: pure structural path (no anchor)

  // --- STABLE ---
  await page.locator("#submit").click();                      // stable: id
  await page.locator("[data-testid=save]").click();           // stable: testid attribute
  await page.locator('//button[@id="checkout"]').click();     // stable: id-anchored xpath
  await page.locator('//h3[@data-test="error"]').click();     // stable: testid-anchored xpath
  await page.getByRole("button", { name: "Save" }).click();   // stable: role method
  await page.getByTestId("cart").click();                     // stable: testid method

  // --- CONTEXT (depends on project) ---
  await page.locator(".user-name").click();                   // context: plain class
  await page.locator("button[type=submit]").click();          // context: attribute selector
  await page.locator('//a[text()="Logout"]').click();         // context: text xpath (i18n)
  await page.locator('//div[@class="card"]').click();         // context: class-anchored xpath
  await page.getByText("Sign out").click();                   // context: visible text (i18n)

  // --- DYNAMIC (unclassified) ---
  const id = "7";
  await page.getByTestId(`row-${id}`).click();                // dynamic: built from a variable
});
