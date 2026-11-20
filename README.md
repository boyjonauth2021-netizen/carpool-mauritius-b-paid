# Carpool Mauritius — version B (paid rides)

Paid-ride prototype for Bojo Solutions. A verified driver posts a trip and a price per seat. A passenger books it and pays in the app. This repository is only version B: no free-matching mode and no regulated cost-sharing mode.

The demo is fully static. Payments are simulated and labelled **TEST MODE**. No bank is contacted. No secret is required to run it.

Intended public URL: [https://boyjonauth2021-netizen.github.io/carpool-mauritius-b-paid/](https://boyjonauth2021-netizen.github.io/carpool-mauritius-b-paid/)

## Run it locally

```bash
npm ci
npm test
npm run dev
```

Open [http://127.0.0.1:43123/carpool-mauritius-b-paid/](http://127.0.0.1:43123/carpool-mauritius-b-paid/).

The sign-in screen lists four seeded people. Every one of them uses the password `demo-pass`.

| Person | Email | What they can do |
| --- | --- | --- |
| Asha Ramgoolam | passenger@bojosolutions.example | Search and pay for a seat |
| Jean-Luc Baptiste | driver@bojosolutions.example | Approved driver, three upcoming rides |
| Meera Seewoosurrun | pending@bojosolutions.example | Waiting in the admin queue |
| Kevin Admin | admin@bojosolutions.example | Approve drivers, read the test ledger |

A new account confirms an email code and a phone code. Both codes appear under Messages. Nothing is sent to a real inbox or a real phone.

Reset the browser data from the footer if a ride has been cancelled or the dates have gone stale.

## Build output

`npm run build` writes a fully static site to **`dist/`**.

That folder contains `index.html`, `404.html` (the same file, for a non-hash deep link), `.nojekyll`, and hashed assets. There is no server, no database, and no environment secret in that output. Preview it with:

```bash
npm run build
npm run preview
```

The preview uses the same base path: [http://127.0.0.1:43123/carpool-mauritius-b-paid/](http://127.0.0.1:43123/carpool-mauritius-b-paid/).

Routing is hash-based (`/#/rides`), so the host only has to serve the files.

## Deploy to GitHub Pages

1. Push this project to the GitHub repository that should serve `/carpool-mauritius-b-paid/` (repository name `carpool-mauritius-b-paid` on `boyjonauth2021-netizen`).
2. In the repository settings, set **Pages → Build and deployment → Source** to **GitHub Actions**.
3. Push to `main`. The workflow `.github/workflows/pages.yml` runs `npm ci`, `npm test`, and `npm run build`, then deploys `dist/`.

Commands the workflow runs, which you can also run by hand:

```bash
npm ci
npm test
npm run build
```

The artifact to upload is the `dist` directory.

## What is mocked

| Piece | Without keys | With a sandbox key |
| --- | --- | --- |
| Payments | In-browser TEST simulator | Sandbox adapter, still no network charge. Both keys must be set and must look like test keys (`sk_test_`, `pk_test_`, or a value containing `test` or `sandbox`). A live-looking key is refused |
| Maps | Schematic of Mauritius | Google Maps JavaScript API, markers only |
| SMS / OTP | Code shown in Messages | Same inbox, labelled sandbox |
| Email | Receipts and codes in Messages | Same inbox, labelled sandbox |

Test cards, and only these:

- `4242 4242 4242 4242`, expiry `12/34`, CVC `123` — captured
- `4000 0000 0000 0002`, expiry `12/34`, CVC `123` — declined, seat not taken

Any other number is refused and not stored.

Copy `.env.example` to `.env.local` only if you want the sandbox labels or the Google map at build time. Vite inlines `VITE_*` variables into the static bundle, so do not put a live secret there. The Pages workflow does not set any of them.

## Money rules in this build

Mauritian rupees, stored as integer cents. The driver sets the price per seat, from Rs 50 to Rs 2,000. The platform fee is 15%, rounded down to the cent, taken out of the driver's price rather than added on top. A passenger can cancel for a full reversal until two hours before departure. A driver cancel reverses every paid seat. "Driver payable" is a ledger line, not a payout.

These figures, and the open legal questions, are written up in [docs/PLAN.md](docs/PLAN.md) and [docs/OPEN_QUESTIONS.md](docs/OPEN_QUESTIONS.md). This prototype does not claim an NLTA permission, an insurance position, or a Bank of Mauritius permission. Do not take real money with it.

## Tests

```bash
npm test
```

Vitest covers the fare and commission, the ledger invariant, Mauritius-day matching, the sandbox-versus-mock adapter switch, and the booking flow: pay, decline, refund, driver cancel, admin approval, and the mock OTP.
