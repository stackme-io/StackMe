# StackMe - free browser tools for testing and data quality

**LocateMe: find fragile test locators before they break your suite.**
[Try it, no signup →](https://stackme-app.vercel.app/locate-me)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
![No signup](https://img.shields.io/badge/no-signup-brightgreen)
![Runs in your browser](https://img.shields.io/badge/runs-in%20your%20browser-blue)
![No telemetry](https://img.shields.io/badge/no-telemetry-lightgrey)

<!-- TODO before launch: screenshot or GIF of a LocateMe report goes here, above the fold.
     Highest-converting element in the whole file. Client-safe mode is a good choice -
     it also shows off a feature nobody would otherwise notice. -->

## What LocateMe does

Point it at a test suite. It reads your locators and tells you which ones are built to break.

- **Frameworks:** Playwright (TS/JS), Cypress (TS/JS), Selenium with Java (beta)
- **Four verdicts:** fragile, stable, context, dynamic - each with the sub-cause and the reason
- **Duplicate detection** across files, so you fix one place and close many
- **Reports:** HTML export, print to PDF, a client-safe mode that masks paths and hides code

It calls a locator fragile **only when the code alone proves it** - a framework-generated id, a
CSS-in-JS hash, a positional path. When a signal is ambiguous it stays quiet rather than raise a
false alarm you cannot dismiss.
[How the classification works →](https://github.com/stackme-io/StackMe/discussions)
<!-- TODO: point that link at the methodology discussion once it exists -->

## Quick start

1. Open [LocateMe](https://stackme-app.vercel.app/locate-me)
2. Pick a folder with your tests, or paste a single test file
3. Read the report

No account, no install, no upload. LocateMe sends nothing on its own. Two things can leave your
machine, and only when you click: a report you choose to save to an account, and an anonymous
stats row you choose to share.

<!-- TODO at launch: link the stats article here.
     "We scanned 200 open-source test suites: here is what we found" -->

## Privacy

Everything runs client-side. Your test code is parsed in your browser and never sent anywhere.
There is no analytics script, no telemetry, no third-party tracker in the app. Saving a report to
your account is opt-in, per report, and clearly labelled.

**Anonymous stats (opt-in).** After auditing your own folder you can share one row of rounded
counts: framework, size range, how many locators fall in each verdict and sub-cause, and,
if you choose, the age of the suite. The dialog shows the exact data before you send it. No code,
selectors, paths, file or project names, account or exact time are sent, your IP is not stored
with the row, and rows are only published as a summary once at least 10 suites are shared. The
field list lives in [`packages/locateme/src/core/stats.ts`](packages/locateme/src/core/stats.ts).

## The rest of StackMe

StackMe is a growing set of free, privacy-first tools for testing and data quality. LocateMe is the
mature one; the others are in active development.

| Tool | What it does | Status |
| --- | --- | --- |
| **LocateMe** | Static audit of test-locator fragility | Stable |
| **ForgeMe** | Generates test data with labeled defects, so you can check whether your data-quality checks actually catch them | Beta, actively changing |
| **AnalyzeMe** | Finds missing values, duplicates and outliers in CSV/JSON (DuckDB-Wasm) | Early beta |

[stackme-app.vercel.app](https://stackme-app.vercel.app)

## Contributing

The most useful thing you can report is a **false positive** - a locator we called fragile that is
fine in your project. Those go straight into the test fixtures.

- [Discussions](https://github.com/stackme-io/StackMe/discussions) - questions, ideas, roadmap
- [Issues](https://github.com/stackme-io/StackMe/issues) - bugs, false positives, framework requests
- [Full rule catalogue](packages/locateme/FRAGILITY.md) - every rule and the pattern that triggers it

## License

MIT.
