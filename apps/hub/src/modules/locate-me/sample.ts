// Demo suite for "Try sample" - deliberately realistic, NOT a toy. It exists to make
// the real-world screen visible: many files with nested paths (long, truncating names),
// enough findings to scroll, every kind well represented, cross-file duplicates, dynamic
// (runtime) selectors, and a clean stable-only file. If the UI stays calm on this, it
// stays calm on a real repo. Framework: Playwright, TS + one legacy .js file.

import type { SourceFileInput } from '@locateme/core/types'

// A fragile xpath shared across three files - exercises cross-file duplicate counting.
const DUP = `//div[3]/span[2]/button`

const LOGIN = `import { test, expect } from '@playwright/test'

test('user logs in with valid credentials', async ({ page }) => {
  await page.goto('/login')
  await page.getByRole('textbox', { name: 'Email' }).fill('a@b.com')
  await page.getByLabel('Password').fill('secret')
  await page.getByTestId('login-submit').click()
  await expect(page.getByText('Welcome back')).toBeVisible()
  await page.locator('.header .avatar').click()
})

test('shows validation on empty submit', async ({ page }) => {
  await page.goto('/login')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.getByText('Email is required')).toBeVisible()
  await page.getByPlaceholder('you@example.com').fill('nope')
  await page.locator('#email-error').click()
  await page.getByTestId('remember-me').check()
})

test('forgot password flow', async ({ page }) => {
  await page.getByRole('link', { name: 'Forgot password?' }).click()
  await page.getByLabel('Email address').fill('a@b.com')
  await page.locator('form > div:nth-child(2) button').click()
  await expect(page.getByText('Check your inbox')).toBeVisible()
})
`

const REGISTRATION = `import { test, expect } from '@playwright/test'

test('new user registration', async ({ page }) => {
  await page.goto('/signup')
  await page.getByLabel('Full name').fill('Sam Doe')
  await page.getByLabel('Email').fill('sam@doe.com')
  await page.getByLabel('Password').fill('hunter2hunter2')
  await page.getByRole('checkbox', { name: 'I agree to the terms' }).check()
  await page.getByTestId('signup-submit').click()
  await expect(page.getByText('Verify your email')).toBeVisible()
})

test('duplicate email is rejected', async ({ page }) => {
  await page.getByLabel('Email').fill('taken@doe.com')
  await page.getByRole('button', { name: 'Create account' }).click()
  await page.locator('div.sc-1a2b3c').click()
  await expect(page.locator('[data-testid="field-error"]')).toBeVisible()
  await page.locator('#react-aria-42').click()
})

test('password strength meter', async ({ page }) => {
  await page.getByLabel('Password').fill('weak')
  await page.locator('.strength-meter .bar:nth-child(3)').click()
  await page.getByText('Too weak', { exact: true }).click()
})
`

const CART = `import { test, expect } from '@playwright/test'

test('add items to cart', async ({ page }) => {
  await page.locator('${DUP}').click()
  await page.locator('.product-card:nth-child(1)').click()
  await page.locator('div.sc-9z8y7x').click()
  await page.locator('//ul/li[4]/div/button').click()
  await page.getByRole('button', { name: 'Add to cart' }).click()
  await expect(page.getByText('Added to cart')).toBeVisible()
})

test('update quantity', async ({ page }) => {
  await page.locator('.cart-row:nth-of-type(2) input').fill('3')
  await page.locator('#mui-42').click()
  await page.locator('[data-index="2"]').click()
  await page.locator('button.jss128').click()
  await page.getByLabel('Quantity').fill('5')
})

test('remove item and go to checkout', async ({ page }) => {
  await page.locator('.list > li:nth-child(2) .remove').click()
  await page.locator('//table/tbody/tr[3]/td[2]').click()
  await page.getByRole('button', { name: 'Checkout' }).click()
  await page.getByTestId('cart-total').click()
})
`

const PAYMENT = `import { test, expect } from '@playwright/test'

const rowSelector = process.env.ROW || '.row'

test('enter card details', async ({ page }) => {
  await page.locator('${DUP}').click()
  await page.getByLabel('Card number').fill('4242424242424242')
  await page.getByLabel('Expiry').fill('12/30')
  await page.getByLabel('CVC').fill('123')
  await page.locator('div.css-1q2w3e').click()
  await page.locator(rowSelector).click()
  await page.locator(\`#field-\${'cvc'}\`).click()
})

test('apply promo code', async ({ page }) => {
  await page.getByPlaceholder('Promo code').fill('SAVE10')
  await page.getByRole('button', { name: 'Apply' }).click()
  await page.locator('//nav/a[5]').click()
  await expect(page.getByText('Discount applied')).toBeVisible()
  await page.locator('[data-state="open"] button').click()
})

test('place order', async ({ page }) => {
  await page.locator('.navbar > ul > li:nth-child(2) a').click()
  await page.getByTestId('place-order').click()
  await expect(page.getByText('Order total')).toBeVisible()
  await expect(page.getByText('Thank you for your order')).toBeVisible()
})
`

const SEARCH = `import { test, expect } from '@playwright/test'

test('search returns results', async ({ page }) => {
  await page.goto('/search')
  await page.getByRole('searchbox', { name: 'Search products' }).fill('shoes')
  await page.getByRole('button', { name: 'Search' }).click()
  await expect(page.getByText('results for "shoes"')).toBeVisible()
  await page.locator('.results-grid > div:nth-child(1)').click()
})

test('filter by category', async ({ page }) => {
  await page.getByRole('link', { name: 'Footwear' }).click()
  await page.locator('.facet[data-facet="brand"] label').click()
  await page.locator('#radix-:r7:').click()
  await page.getByText('Nike').click()
  await page.locator('xpath=//aside//button[contains(text(),"Apply")]').click()
})

test('sort and paginate', async ({ page }) => {
  await page.getByLabel('Sort by').selectOption('price-asc')
  await page.locator('.pagination li:last-child a').click()
  await page.getByRole('button', { name: 'Next page' }).click()
  await page.getByTestId('result-count').click()
})
`

const PDP = `import { test, expect } from '@playwright/test'

test('product detail page', async ({ page }) => {
  await page.goto('/products/running-shoe')
  await expect(page.getByRole('heading', { name: 'Running Shoe' })).toBeVisible()
  await page.getByText('In stock').click()
  await page.getByRole('button', { name: 'Select size' }).click()
  await page.locator('.size-option[data-size="42"]').click()
  await page.getByTestId('add-to-bag').click()
})

test('image gallery', async ({ page }) => {
  await page.locator('.gallery .thumb:nth-child(3)').click()
  await page.locator('div[class^="ImageZoom__"]').click()
  await page.getByRole('button', { name: 'Next image' }).click()
  await page.getByTitle('Zoom in').click()
})

test('reviews section', async ({ page }) => {
  await page.getByRole('tab', { name: 'Reviews' }).click()
  await page.getByText('Write a review').click()
  await page.getByLabel('Your rating').click()
  await page.locator('.review:nth-child(1) .helpful-btn').click()
  await page.getByText('Verified purchase').first().click()
})
`

const SETTINGS = `import { test, expect } from '@playwright/test'

// A well-built page: everything is role/label/test-id based. A clean file should read clean.
test('update profile settings', async ({ page }) => {
  await page.goto('/settings/profile')
  await page.getByLabel('Display name').fill('Sam')
  await page.getByLabel('Bio').fill('Hello')
  await page.getByRole('button', { name: 'Save changes' }).click()
  await expect(page.getByText('Profile updated')).toBeVisible()
})

test('notification preferences', async ({ page }) => {
  await page.getByRole('tab', { name: 'Notifications' }).click()
  await page.getByRole('switch', { name: 'Email notifications' }).click()
  await page.getByTestId('save-notifications').click()
  await expect(page.getByRole('alert')).toBeVisible()
})

test('danger zone', async ({ page }) => {
  await page.getByRole('button', { name: 'Delete account' }).click()
  await page.getByLabel('Type DELETE to confirm').fill('DELETE')
  await page.getByRole('button', { name: 'Permanently delete' }).click()
})
`

const LEGACY = `const { test, expect } = require('@playwright/test')

test('legacy checkout still works', async ({ page }) => {
  await page.locator('${DUP}').click()
  await page.locator('/html/body/div[2]/main/div/form/button').click()
  await page.locator('table tr:nth-child(4) td:nth-child(2) a').click()
  await page.locator('#ember1043').click()
  await page.locator('.btn.btn-primary.pull-right').click()
  await page.getByText('Legacy order placed').isVisible()
})

test('legacy account menu', async ({ page }) => {
  await page.locator('//header/div/ul/li[3]/a').click()
  await page.locator('div > div > div > div > span').click()
  await page.locator('[href="/logout"]').click()
})
`

// Nested paths on purpose: long names truncate, "Most fragile files" ranks, and grouping
// by file shows many same-file rows in a row.
export const SAMPLE_FILES: SourceFileInput[] = [
  { path: 'tests/e2e/auth/login.spec.ts', text: LOGIN },
  { path: 'tests/e2e/auth/registration.spec.ts', text: REGISTRATION },
  { path: 'tests/e2e/checkout/cart.spec.ts', text: CART },
  { path: 'tests/e2e/checkout/payment-flow.spec.ts', text: PAYMENT },
  { path: 'tests/e2e/products/search-results.spec.ts', text: SEARCH },
  { path: 'tests/e2e/products/product-detail.spec.ts', text: PDP },
  { path: 'tests/e2e/dashboard/settings.spec.ts', text: SETTINGS },
  { path: 'tests/e2e/legacy/old-checkout.spec.js', text: LEGACY },
]
