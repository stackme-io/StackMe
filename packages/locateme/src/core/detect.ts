// Lightweight stack detection - language by extension, framework by signals.
// Browser-safe, pure. Honest: returns "unknown" when it can't tell.
import type { SourceFileInput } from './types.js'

export interface Detection {
  language: 'TypeScript' | 'JavaScript' | 'TypeScript + JavaScript' | 'Java' | 'unknown'
  framework: 'Playwright' | 'Cypress' | 'Selenium' | 'unknown'
}

export function detectStack(files: SourceFileInput[]): Detection {
  let ts = false
  let js = false
  let java = false
  for (const f of files) {
    if (/\.tsx?$/.test(f.path)) ts = true
    else if (/\.jsx?$/.test(f.path)) js = true
    else if (/\.java$/.test(f.path)) java = true
  }
  const language: Detection['language'] =
    java ? 'Java'
      : ts && js ? 'TypeScript + JavaScript'
        : ts ? 'TypeScript' : js ? 'JavaScript' : 'unknown'

  let pw = 0
  let cy = 0
  let se = 0
  for (const f of files) {
    const t = f.text
    if (/@playwright\/test/.test(t)) pw += 3
    if (/\.(getByRole|getByTestId|getByText|getByLabel|getByPlaceholder|getByTitle|getByAltText)\s*\(/.test(t)) pw += 1
    if (/\bcy\.(get|contains|find|visit|intercept)\s*\(/.test(t)) cy += 2
    if (/['"]cypress['"]|from\s+['"]cypress/i.test(t)) cy += 1
    if (/selenium-webdriver/.test(t)) se += 3
    if (/import\s+org\.openqa\.selenium/.test(t)) se += 3
    if (/@FindBy\b/.test(t)) se += 2
    if (/\bBy\.(xpath|cssSelector|css|id|name|className|tagName|linkText|partialLinkText)\s*\(/.test(t)) se += 2
    if (/driver\.findElement/.test(t)) se += 1
  }

  let framework: Detection['framework'] = 'unknown'
  const max = Math.max(pw, cy, se)
  if (max > 0) framework = pw === max ? 'Playwright' : cy === max ? 'Cypress' : 'Selenium'

  return { language, framework }
}
