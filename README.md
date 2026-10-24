# Toolshop QA

[![Tests](https://github.com/kevbot00/toolshop-qa/actions/workflows/tests.yml/badge.svg)](https://github.com/kevbot00/toolshop-qa/actions/workflows/tests.yml)

End-to-end and API test automation for [Toolshop](https://github.com/testsmith-io/practice-software-testing), an open source e-commerce app (Angular UI, Laravel REST API, MariaDB) built for practicing software testing.

The app runs in Docker from its published images, and the suites run against it on every push and pull request in GitHub Actions. A green run means a clean copy of the app was started, seeded and tested from scratch.

| Suite | Tool | Tests | Runs in |
|---|---|---|---|
| UI end-to-end | Playwright + TypeScript | 25 | Chromium, Firefox |
| API | Playwright `request` + Zod | 34 | Node |
| API | Pytest + Requests | 26 | Python |
| Accessibility | axe-core (inside the UI suite) | 3 pages | Chromium, Firefox |

## What's covered

| Area | UI | API |
|---|---|---|
| Sign in, sign out, protected pages | ✓ | ✓ |
| Registration and password policy | ✓ | ✓ |
| Catalog search, category filter, price sort, pagination | ✓ | ✓ |
| Product details | ✓ | ✓ |
| Cart: add, update quantity, remove, totals | ✓ | ✓ |
| Checkout as a signed-in customer (cash on delivery) | ✓ | ✓ |
| Checkout as a guest (credit card) | ✓ | |
| Payment validation (expired card) | | ✓ |
| Contact form | ✓ | |
| Response contracts (schema validation) | | ✓ |
| Quantity boundaries (0, 1, 99, 100) | | ✓ |

## Test strategy

**Most checks live at the API layer.** API tests are fast and rarely flaky, so business rules (validation, boundaries, auth, pricing) are tested there. UI tests cover the journeys a customer takes, plus anything only the browser can show.

**UI results are checked against the API.** Search, category filter and product detail tests ask the API for the expected data, then assert that the UI shows exactly that. The tests don't hard-code product lists, so they keep working when the seed data changes, and they catch the UI showing the wrong data, not just the UI breaking.

**Each test sets up its own data.** Anything that changes account state (registering, ordering, logging out) runs as a freshly registered user from the `customer` fixture. The seeded accounts are only read from. The database is reseeded before every run. Tests can run in parallel, in any order.

**UI tests log in through the API.** The `signedInCustomer` fixture registers a user and puts their token in `localStorage` before the app loads. The login form itself is tested once, in `auth.spec.ts`, rather than on every test that needs a signed-in user.

**No fixed sleeps.** Page objects wait for the API response that a search, sort or page change triggers. List assertions use `expect.poll` so they retry until the grid finishes rendering. I found this the hard way: the search caption updates before the product grid does, so reading the grid once failed intermittently (1 in 20 repeated runs). After switching to retrying assertions, the catalog spec ran 15 times in both browsers (240 test runs) with no failures.

**Known bugs are expected failures, not skipped tests.** A confirmed defect gets a test that asserts the correct behavior, marked `test.fail()` in Playwright and `xfail(strict=True)` in Pytest. These show up in every report. When the bug is fixed, the test unexpectedly passes and fails the build, so the marker gets removed and the test becomes a regular regression check.

**Accessibility scans have a baseline.** axe-core scans each key page for serious and critical WCAG 2 A/AA issues. Violations already reported are recorded as annotations. Any new one fails the build.

### What isn't automated, and why

- **Visual regression.** Screenshot comparisons differ between macOS and Linux font rendering, so they need a pinned browser image in Docker to be reliable. That's the next thing I'd add.
- **Admin area.** Not yet covered. It needs the same isolation approach, with an admin-created fixture per test.
- **Load testing.** It belongs in a separate k6 job, not in a functional suite on every PR.
- **Real payment providers and PDF invoice contents.** The app fakes both, so testing them here wouldn't prove much.

## Findings

Bugs and accessibility issues found while writing the suite. Each one is covered by a test.

| # | Finding | Severity | Test |
|---|---|---|---|
| 1 | `POST /users/register` accepts a malformed email address (for example `qa-at-example.com`) and returns `201 Created`. A user can register with an address that can never receive mail. | Medium | `tests/api/auth.spec.ts`, `python/tests/test_auth.py` (expected failures) |
| 2 | The show-password toggle (the eye icon in the shared password field on login and registration) is an icon-only `<button>` with no accessible name, so screen readers announce it as just "button". axe `button-name`, WCAG 4.1.2. | Critical (axe) | `tests/ui/accessibility.spec.ts` |
| 3 | Home page: the category filter's nested `<ul>` elements contain non-`<li>` children, so assistive tech misreports the list structure. axe `list`, WCAG 1.3.1. | Serious (axe) | `tests/ui/accessibility.spec.ts` |

Reproduce finding 1:

```bash
curl -s -X POST http://localhost:8091/users/register \
  -H 'content-type: application/json' -H 'accept: application/json' \
  -d '{"first_name":"A","last_name":"B","email":"not-an-email","password":"Sup3r$ecret!"}'
```

Expected `422` with an email validation error. Actual: `201` and the user is created.

Notes for anyone testing this app:

- The product grid fetches with the HTTP `QUERY` method, not `GET`. Network waits that filter on `GET` never match.
- Checkout validates that the billing city and state match what the app's postcode lookup returns for that country and postcode. Tests build addresses from `GET /postcode-lookup`, the same way the UI's autofill does.

## Project structure

```
├── docker-compose.yml          App stack from the published images
├── docker-compose.arm64.yml    Native builds for Apple Silicon (applied automatically)
├── docker/                     nginx image for the API, plus the native builds
├── scripts/start-app.sh        Start, wait until healthy, reseed. Used locally and in CI
├── playwright.config.ts        Projects: api, chromium, firefox
├── src/
│   ├── api/ToolshopApi.ts      Typed API client used by both suites
│   ├── pages/                  Page objects
│   ├── data/                   Seeded accounts and test-data builders
│   └── fixtures.ts             api, customer, signedInCustomer, page objects
├── tests/
│   ├── api/                    API tests
│   └── ui/                     UI and accessibility tests
├── python/                     Pytest API suite
└── .github/workflows/tests.yml
```

## Running locally

You need Docker, Node 22 or newer, and Python 3.11 or newer for the Pytest suite.

```bash
npm ci
npx playwright install chromium firefox
npm run app:start
npm test
```

`npm run app:start` takes a few minutes the first time while images download. Later runs take about a minute. It also reseeds the database, so run it again to reset the data.

On Apple Silicon, the start script builds the API and UI images natively. The published images are x86-only, and both PHP and Angular's esbuild crash under emulation. CI runs on x86 Linux and uses the published images directly. The nginx image in front of the API is always built from this repo, because the published one is the opposite: arm64-only.

Useful commands:

```bash
npm run test:api        # API tests only
npm run test:ui         # UI tests in Chromium and Firefox
npm run test:smoke      # tests tagged @smoke
npm run report          # open the last HTML report
npm run app:stop        # stop the app and delete its data
```

Run the Pytest suite:

```bash
cd python
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
pytest
```

Point either suite at another environment with `BASE_URL` and `API_URL`.

## CI

[`.github/workflows/tests.yml`](.github/workflows/tests.yml) runs on every push to `main`, every pull request, nightly, and on demand.

- **Playwright** runs as a matrix of three parallel jobs (`api`, `chromium`, `firefox`). Each starts its own copy of the app with the same script used locally. If a job fails, the app's container logs are uploaded with it.
- **Pytest** runs the Python suite against its own copy of the app and uploads JUnit results.
- **Report** merges the three Playwright results into a single HTML report, with traces and screenshots for any failure. On `main` it's published to GitHub Pages.
- Failed tests get one retry in CI. A test that passes only on retry is marked flaky in the report, so it stays visible.

## Credits

The application under test is [Practice Software Testing](https://github.com/testsmith-io/practice-software-testing) by Testsmith, pulled from its published Docker images. This repository contains only the tests and the tooling around them.
