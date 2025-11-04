# Playwright MCP Cloud Testing

Simple project to run Playwright tests, produce reports and upload test artifacts (videos, screenshots, traces, HTML report) to S3.

## What this project contains

- `tests/` – example Playwright tests (`example.spec.ts`).
- `playwright.config.ts` – Playwright configuration (records video, trace, screenshots; 3 browser projects).
- `playwright-report/` – generated HTML report and report assets.
- `test-results/` – per-test artifacts (videos, screenshots, traces) and JSON / JUnit outputs.
- `scripts/upload-artifacts.ts` – script that uploads `playwright-report/` and `test-results/` to S3 and generates a simple index page.
- `utils/s3-uploader.ts` – S3 helper using AWS SDK.

## Requirements

- Node.js (recommended latest LTS)
- npm
- (For uploading) An AWS S3 bucket and AWS credentials with PutObject permissions

## Setup

1. Install dependencies

   zsh
   npm install

2. (Optional) Install Playwright browsers (if browsers are not present)

   zsh
   npx playwright install

## Run tests

- Run all tests (uses `playwright.config.ts`):

  zsh
  npm test

- Run tests in headed mode (show the browser):

  zsh
  npm run test:headed

- Run tests with Playwright UI (interactive):

  zsh
  npm run test:ui

- Run a single test file (example):

  zsh
  npx playwright test tests/example.spec.ts --reporter=dot --workers=1

- Run tests and then upload artifacts to S3 (see Upload section for env vars):

  zsh
  npm run test:upload

## View report

- Generate or open the Playwright HTML report saved by the runner:

  zsh
  npm run report

- The HTML report files live under `playwright-report/`.
- Per-test artifacts (videos, screenshots, traces) live under `test-results/`.

## Upload artifacts to S3

The repository includes a TypeScript upload script that packages and uploads:
- `playwright-report/`
- `test-results/`

Environment variables required:

- `S3_BUCKET_NAME` (required)
- `AWS_ACCESS_KEY_ID` (required)
- `AWS_SECRET_ACCESS_KEY` (required)
- `AWS_REGION` (optional, default `us-east-1`)
- `GITHUB_RUN_ID` (optional — used to name the run folder)

You can create a `.env` file in the project root with these values (the uploader uses `dotenv`). Example `.env`:

  S3_BUCKET_NAME=your-bucket-name
  AWS_REGION=us-east-1
  AWS_ACCESS_KEY_ID=AKIA...
  AWS_SECRET_ACCESS_KEY=...

Run the uploader locally (build then start):

  zsh
  npm run upload-artifacts

Or run tests and upload in one command:

  zsh
  npm run test:upload

After a successful upload the script prints a public URL like:

  https://<S3_BUCKET_NAME>.s3.<AWS_REGION>.amazonaws.com/test-runs/<runId>/index.html

Note: Make sure your bucket policy or object ACLs allow the access pattern you expect.

## Notes / tips

- The Playwright config currently records video, traces and screenshots for all tests. This produces many files — expect `test-results/` to grow.
- The tests use fixed `waitForTimeout` sleeps which can slow or make tests flaky. Prefer explicit waits for conditions when you edit tests.
- The uploader uses the AWS SDK. For large uploads ensure your IAM and network settings are correct.

## Troubleshooting

- If you see an error about `S3_BUCKET_NAME`, export it or add it to `.env` before running the uploader.
- To debug failing tests run with `--debug` or `--headed`.

----

That's it — run `npm test` to run tests, `npm run report` to view the HTML report, and `npm run upload-artifacts` to upload artifacts to S3.
