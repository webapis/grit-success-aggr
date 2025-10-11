## refactored-crawl.js — Overview

This document explains what `scripts/refactored-crawl.js` does, its inputs and outputs, the main execution steps, error modes, related files, and how to run and debug it.

### Purpose

`refactored-crawl.js` is the top-level entrypoint script that orchestrates a single crawl run for a configured site. It:

- Reads the target site from environment variables.
- Loads and validates the site configuration.
- Prepares the list of URLs to visit.
- Creates Puppeteer routing logic (the "router").
- Initializes and runs the crawler with the prepared URLs.
- Emits logs and writes a small run record to a local Google Sheet helper for run-tracking.

All actual scraping, routing and persistence is delegated to helper modules (notably `routes-puppeteer.js`, `crawler.js` and persistence helpers). This script focuses on wiring those pieces together and handling high-level errors and run metadata.

### Entrypoint

The file exports no functions. It defines an `async function main()` and immediately calls `main()` at the bottom. Run the script with Node (see "How to run" below).

### Inputs (environment + config)

- `site` (required) — environment variable that determines which site's configuration to load. If not set, the script will log an error and exit with code 1.
- `GITHUB_REF_NAME` (optional) — GitHub branch name (set by GitHub Actions); used for logging and the run record.

The script loads site-specific configuration via `getConfig(site)` which returns a `siteConfig` object. The shape and contents of `siteConfig` are determined by `scripts/config.js` and the project's configuration store.

### Outputs / Side effects

- Starts the crawling process via `runCrawler(...)`. That process produces whatever artifacts the crawler implementation writes (for example: scraped datasets, screenshots, categorized output — see the rest of the repo).
- Writes a small run record to local sheet logging via `logToLocalSheet(...)` (contains GitHub run URL, site, branch and error notes when applicable).
- Logs detailed messages to stdout/stderr.

### High-level steps (what the code does)

1. Get GitHub Actions run URL using `getGitHubActionsRunUrl()` (used for consistent logging).
2. Log startup info and write an initial run record with `logToLocalSheet()`.
3. Validate that the `site` environment variable exists; exit if missing.
4. Fetch the site configuration using `getConfig(site)`.
5. Validate the returned configuration object and exit if invalid.
6. Use `validateConfig(siteConfig, site, githubRunUrl)` to run additional validation; if validation indicates an early exit, the script returns.
7. Build the list of URLs to scrape using `prepareUrls(siteConfig, site)`.
8. Create a Puppeteer router with `createRouter(siteConfig)`.
9. Initialize the crawler with `initializeCrawler(router)`.
10. Start the crawl via `runCrawler(crawler, urlsToScrape, site, githubRunUrl)` and await its completion.
11. Catch any unexpected errors, log them, write a 'Fatal Error' entry to the sheet, then exit with code 1.

These steps are implemented in sequence inside the `main()` function.

### Related files and responsibilities

- `scripts/config.js` — fetches and exposes site configuration.
- `scripts/urls.js` — prepares/normalizes the list of URLs to crawl.
- `scripts/routes-puppeteer.js` — creates Puppeteer route handlers used by the crawler.
- `scripts/crawler.js` — exposes `initializeCrawler` and `runCrawler`; contains crawler orchestration, concurrency and scraping pipelines.
- `src/2_data/persistence/sheet/logToLocalSheet.js` — writes run metadata to a Google Sheet helper used for run tracking.
- `src/shared/getGitHubActionsRunUrl.js` — helper to detect and format the GitHub Actions run URL.
- `src/shared/listeners.js` — required at top-level to register repository-wide event handlers.

If you need to change what gets scraped or how results are stored, inspect and update the modules listed above — this script only wires them together.

### Error handling and exit behavior

- Missing `site` env var: logs an error and calls `process.exit(1)`.
- Invalid or missing configuration: logs an error and calls `process.exit(1)`.
- Exceptions in the main flow: caught by the `catch` block, logged, a 'Fatal Error' row is written to the log sheet, and `process.exit(1)` is invoked.
- `validateConfig(...)` may cause the script to return early (for example, when a run should not proceed). The function determines whether to abort or continue.

Because the script calls `process.exit()` on failures, any cleanup logic should be implemented inside the crawler and helper modules or by the registered listeners.

### Contract (inputs / outputs / error modes)

- Inputs: env `site` (string, required) and `GITHUB_REF_NAME` (string, optional); site configuration loaded via `getConfig`.
- Outputs: starts `runCrawler` which performs scraping and persists results; writes run metadata to a sheet; logs to console.
- Error modes: missing env or invalid config -> process exit (non-zero). Unexpected exceptions -> logged, run recorded as fatal, then process exit.

### Edge cases and notes

- `siteConfig` may contain a `cachedAt` timestamp; the script logs whether config came from cache but does not alter behavior on its own.
- If `siteConfig.configurations` is empty or missing, the script exits early.
- The script prints debugging information (URLs to crawl and some configuration flags) which can be helpful for local debugging but could be noisy in CI — consider toggling verbose logging with an env var if needed.

### How to run (PowerShell example)

Set the `site` env var and run with Node. Replace `my-site-key` with the actual site identifier used by your project.

```powershell
$env:site = 'my-site-key';
node .\scripts\refactored-crawl.js
```

In GitHub Actions the `GITHUB_REF_NAME` is automatically available (reflected in the logs).

### Debugging tips

- If the script exits with "could not retrieve a valid configuration", inspect `scripts/config.js` and the configuration source to ensure the `site` key exists and contains `configurations`.
- Check the console logs printed near the top of the script for `totalUrls`, `paused`, `scrollable`, and `cachedAt` — they show what the script received from `getConfig`.
- To see what `runCrawler` does, open `scripts/crawler.js` and run it directly with a minimal `siteConfig` in a local Node REPL if desired.
- The run record written by `logToLocalSheet` includes the GitHub run URL and can help correlate CI runs with sheet entries.

### Appendices

- Where to add tests: add unit tests around `prepareUrls`, `validateConfig` and smaller helpers. Integration tests can run the full script in a controlled environment by mocking external persistence.
- Small follow-ups: add an optional `--dry-run` flag to print the prepared URLs without launching Puppeteer; add a `VERBOSE` env var to control console verbosity.

---

File: `scripts/refactored-crawl.js`

Purpose: Orchestrates one crawl run by loading config, preparing URLs, creating router/crawler, and running the crawler while logging run metadata.
