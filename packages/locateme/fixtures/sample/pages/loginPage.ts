import { Page } from "@playwright/test";

// Page Object — locator lives OUTSIDE the spec (we must scan all TS, not just *.spec.ts)
export class LoginPage {
  constructor(private page: Page) {}

  // .locator() #4 — css selector inside a page object
  submit() {
    return this.page.locator("button[type=submit]");
  }
}
