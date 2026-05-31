// Generates per-route HTML files in dist/ after vite build.
// Reads dist/index.html (with correct hashed asset paths) and produces
// route-specific versions with page-level og:title / og:description / og:url.

import { readFileSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const distDir = join(__dirname, '..', 'dist')

const base = readFileSync(join(distDir, 'index.html'), 'utf-8')

const routes = [
  {
    file: 'forge-me.html',
    title: 'ForgeMe - Synthetic Dataset Generator | StackMe',
    description: 'Free browser-based synthetic data generator. Create realistic datasets with anomalies, export to CSV/JSON - no install, no signup.',
    url: 'https://stackme-app.vercel.app/forge-me',
  },
  {
    file: 'analyze-me.html',
    title: 'AnalyzeMe - File Analyzer | StackMe',
    description: 'Analyze CSV and JSON files in the browser. Detect schema issues, outliers, missing values - no upload, no server.',
    url: 'https://stackme-app.vercel.app/analyze-me',
  },
  {
    file: 'market-me.html',
    title: 'MarketMe - Tools Marketplace | StackMe',
    description: 'Discover free browser-based data tools. Enable synthetic data generators, file analyzers and more - no install, no signup, no dark patterns.',
    url: 'https://stackme-app.vercel.app/market-me',
  },
]

const replace = (html, selector, value) =>
  html.replace(selector, (_, a, b) => `${a}${value}${b}`)

for (const route of routes) {
  let html = base
  html = html.replace(/(<title>).*?(<\/title>)/,           `$1${route.title}$2`)
  html = replace(html, /(<meta name="description" content=")[^"]*(")/,         route.description)
  html = replace(html, /(<meta property="og:title" content=")[^"]*(")/,        route.title)
  html = replace(html, /(<meta property="og:description" content=")[^"]*(")/,  route.description)
  html = replace(html, /(<meta property="og:url" content=")[^"]*(")/,          route.url)
  html = replace(html, /(<meta name="twitter:title" content=")[^"]*(")/,       route.title)
  html = replace(html, /(<meta name="twitter:description" content=")[^"]*(")/,  route.description)
  writeFileSync(join(distDir, route.file), html)
  console.log(`✓ dist/${route.file} generated`)
}
