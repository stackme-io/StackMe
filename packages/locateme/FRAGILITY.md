# How LocateMe judges locator fragility

The full rule reference behind every verdict. This is the catalogue; the product itself
explains each finding in place (the inspector's *reason*), and the "How we judge" sheet
covers the principle. This file is for when you want to see exactly what triggers what.

## The principle first

LocateMe reads your test code statically - no runtime, no DOM. So it can only judge what
the locator **string itself proves**.

- **Firm verdict (`fragile` / `stable`)** - only on signatures that are unmistakable from
  the string alone. These are mechanics, not opinion: an auto-generated class *does* change
  every build; a positional index *does* break when order changes.
- **`context`** - the gray zone, where stability depends on things the string can't show
  (the DOM, author intent, localization). We flag it conditionally, with an escape hatch,
  and leave the call to you. We never hand it a verdict.
- **`dynamic`** - the selector is built at runtime (a variable, template, or concatenation),
  so its final value isn't in the code. We can't classify it - a blind spot worth a manual
  look, not a pass.

Precision over noise: the audit is read-only, so a false `fragile` can't be dismissed. When
a signal is ambiguous we stay quiet rather than risk crying wolf. A clean report means
"nothing we can prove is wrong," not "nothing is wrong."

The prefer ladder for every recommendation: **Role → Label → Text (for assertions) →
TestId → raw CSS/XPath.** `getByRole` is the default (it binds to accessibility);
`getByTestId` is a fallback, not the goal.

---

## CSS selectors

| Signature | Example | Verdict | Why |
|---|---|---|---|
| Positional | `:nth-child(2)`, `:nth-of-type`, `li:nth-child(1) a` | **fragile** | Breaks when items are added or reordered. |
| Auto / hashed class | `div.sc-1a2b3c`, `.css-1q2w3e` | **fragile** | CSS-in-JS class names are regenerated every build. |
| Framework-generated id | `#mui-42`, `#ember1043`, `.cart-footer #mui-42` | **fragile** | Auto-generated ids change between builds/re-renders. Caught even inside a compound selector, since an ancestor only narrows scope - it can't save a regenerating id. |
| Test-hook attribute | `[data-testid='x']`, `[data-qa='y']`, `[data-cy]`, `[data-automation-id]` | **stable** | An explicit contract between the app and the suite. |
| Hand-written id | `#checkout-email` | **stable** | A single, intentional id. |
| Unknown `data-*` | `[data-index='3']`, `[data-state='open']` | **context** | Could be a real contract or volatile state - the string can't tell. Confirm it's stable in your app. |
| Class / other attribute | `.login-form`, `[name='email']` | **context** | Fine while stable, but a styling class can move on a redesign. |

Guards that stay `context` (a generated id there does **not** break the locator): selector
lists and `:is()` / `:where()` with a non-fragile branch (`.stable, #mui-42`), and `:not()`
(`.item:not(#mui-42)`). A generated pattern inside a class (`.mui-42`) or an attribute value
(`[href='#mui-42']`) is not an id segment and is never flagged on that basis.

## XPath

| Signature | Example | Verdict | Why |
|---|---|---|---|
| Axis traversal | `following-sibling::`, `ancestor::` | **fragile** | Tied to DOM structure; breaks on markup changes. |
| Positional index | `//div[3]/span[2]`, `(//button)[5]` | **fragile** | Breaks when order or layout changes. |
| Absolute / no anchor | `/html/body/div[2]/form/button` | **fragile** | A structural path with no stable anchor. |
| Framework-generated id | `//*[@id='mui-42']`, `//div[@class='x' and @id='ember7']`, `contains(@id,'radix-')` | **fragile** | Same as CSS - caught in any id predicate, at any step. |
| Test-hook attribute | `//button[@data-testid='save']` | **stable** | Anchored on a test contract. |
| `@id` / `@name` | `//input[@id='email']` | **stable** | Anchored on a stable attribute. |
| Text | `//*[text()='Submit']`, `contains(text(),'Sub')` | **context** | Can break on localization or copy edits. Fine for assertions. |
| Other attribute | `//*[@role='dialog']` | **context** | Depends on the attribute. |

## Playwright / Testing Library methods

| Method | Verdict | Note |
|---|---|---|
| `getByRole` (with name), `getByTestId`, `getByLabel` | **stable** | Bound to intent, not layout - the recommended default. |
| `getByText`, `getByPlaceholder`, `getByTitle`, `getByAltText` | **context** | Matches by visible text. Squarely fine for an assertion; weaker for a click (copy edits, i18n, possible non-uniqueness). |
| `cy.contains(...)` (Cypress) | **context** | Text-based, same caveat. |
| Cypress alias (`@saved`) | **stable** | An intent-based reference. |
| `locator('...')` / `cy.get('...')` | **see the string** | The wrapper is neutral - the selector string is judged by the CSS/XPath tables above. |

Call-site awareness: when a text locator drives an action (`.click()`, `.fill()`), the advice
sharpens toward `getByRole(..., { name })`; in an assertion (`expect(...)`, `.toBeVisible()`)
it softens. This only changes the wording - never the verdict. A firm `fragile` for text is
reserved for a loose-match signature (regex / `exact:false` / `contains(text)`), which is
provable from the string regardless of how the locator is used.

## Selenium (Java) - `By.*`

| Strategy | Verdict | Note |
|---|---|---|
| `By.id` | **stable** (or **fragile** if the id is framework-generated) | |
| `By.name` | **stable** | |
| `By.cssSelector`, `By.xpath` | **see the CSS/XPath tables** | Same shape rules; prefer advice is re-worded in Selenium idioms (`By.id`, `data-testid`). |
| `By.className` | **context** | A styling class can move on a redesign. |
| `By.tagName` | **context** | Over-broad - matches many, takes the first. A selection risk, not layout fragility. |
| `By.linkText`, `By.partialLinkText` | **context** | Matches visible link text; breaks on copy edits or localization. |

`@FindBy` and `@FindBys` Page Factory annotations are read the same way (the `How`/attribute
maps to a strategy). Fragility is judged at each locator's own declaration site - inherited
`@FindBy` fields are not merged. If a class extends a base outside the scanned files, its
inherited locators are flagged as unaudited rather than guessed at.

## Copy-ready swaps

Where a replacement is mechanically safe - the new locator matches exactly the same element
set with no added assumption - the inspector offers a copy-paste-ready swap. Currently:
`locator('[data-testid="x"]')` and the XPath equivalent → `getByTestId('x')`. Anything that
would need a role, name, or text we can't see from the string stays prose advice, never a
fake "ready" replacement.

---

*Open source, MIT. Found a case we get wrong? That's exactly the kind of feedback we want -
open an issue.*
