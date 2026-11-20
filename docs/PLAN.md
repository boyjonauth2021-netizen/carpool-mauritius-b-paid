# Carpool Mauritius — Version B (paid rides)

Implementation plan for Bojo Solutions. This repository is **only version B**. It does not contain a free-matching mode (version A) or a regulated cost-sharing mode (version C).

## Build target

The live demo is a fully static single-page app. Intended URL: `https://boyjonauth2021-netizen.github.io/carpool-mauritius-b-paid/`.

- Vite and React, hash routing (`/#/rides`), base path `/carpool-mauritius-b-paid/`
- No server and no secrets in the Pages build
- The schema below is stored in the browser (`localStorage`), seeded on first visit
- Payments stay in TEST MODE. The sandbox adapter switches on only when both payment keys are present and look like test keys. Otherwise the in-browser simulator runs. Neither one contacts a bank
- Maps, SMS/OTP, and email are mocks unless a sandbox key is set, and even then they only write to the in-app inbox or, for Maps, load Google's script
- Output folder: `dist/` (includes `404.html` and `.nojekyll`)
- Workflow: `.github/workflows/pages.yml`

The money rules later in this file are what the app enforces. The attached spec file was not on disk when this was written, so every number the brief did not fix is still marked ASSUMPTION.

## Source of the rules

The task brief asked for a working MVP: English and French, passenger and driver roles, admin verification, ride posting, matching, and booking with payment, with Google Maps behind a key placeholder. Payments stay in test or sandbox mode, behind a provider abstraction. Secrets stay out of source control.

The attachment named `Project_B_With_Payment.txt` (expected at `/workspace/uploads/Project_B_With_Payment_a489.txt`) was **not on the filesystem** when this plan was written, and it was not in the connected Drive or GitHub accounts. Every product number below that the brief did not fix is marked **ASSUMPTION**. If the written spec disagrees, change the domain constants and this document before anyone treats the app as a specification of record.

Nothing in this repository is a licence, a legal opinion, or permission to carry paying passengers or to hold client money.

## What version B means here

A verified driver publishes a future trip and a **price per seat in Mauritian rupees**. A passenger searches, books one or more seats, and pays that fare **in the app** through the sandbox payment provider. Bojo Solutions records a platform commission and a driver payable. No bank, card network, or wallet is contacted. No payout is sent.

This is a commercial fare, not a voluntary contribution and not a computed share of fuel. That is the product difference from versions A and C, and it is also the main legal risk (see open questions).

## Stack

- Vite, React, TypeScript, Tailwind, shadcn/ui
- Hash router, so GitHub Pages needs no rewrite rules beyond `404.html`
- Business rules in `src/domain` (pure functions, unit tested)
- Booking, payment, and verification workflows in `src/store/actions.ts` (tested against the seeded state)
- Browser persistence in `localStorage`. Passwords are SHA-256 hashes of a demo pepper. This is not a production identity system
- Payment, maps, SMS, and email adapters in `src/services/adapters.ts`
- Google Maps only when `VITE_GOOGLE_MAPS_API_KEY` is a real key; otherwise a schematic of the island

Deploy target: the `dist/` folder on GitHub Pages. No database server, no container.

## Phases

1. **Plan** — this document.
2. **Domain** — money, ledger lines, cancellation, matching, place catalogue. Tests.
3. **Database and services** — schema, auth, driver review, rides, bookings, sandbox pay/refund. Service tests, including the ledger invariant.
4. **UI** — EN/FR, the flows above, empty/loading/error states, desktop and mobile.
5. **Run** — dev server, browser pass, README deploy steps.

## Database schema

The demo stores this shape as one JSON document in `localStorage` (`carpool-mauritius-b-v1`). Amounts are integer **cents** of MUR (Rs 1 = 100 cents). Timestamps are ISO-8601 UTC text. Mauritius civil dates use Indian/Mauritius (UTC+4, no daylight saving). `locale` lives on the document, not on each user. OTP challenges and the in-app inbox are extra collections on the same document.

```text
users
  id                 TEXT PK
  email              TEXT UNIQUE NOT NULL
  password_hash      TEXT NOT NULL
  name               TEXT NOT NULL
  phone              TEXT
  locale             TEXT NOT NULL DEFAULT 'en'   -- en | fr
  is_admin           INTEGER NOT NULL DEFAULT 0
  confirmed_adult    INTEGER NOT NULL DEFAULT 0   -- self-declaration, not an identity check
  created_at         TEXT NOT NULL

driver_profiles
  id                 TEXT PK
  user_id            TEXT UNIQUE NOT NULL REFERENCES users(id)
  nic_number         TEXT NOT NULL                -- stored for an admin to read; not checked against a civil register
  licence_number     TEXT NOT NULL
  licence_expiry     TEXT NOT NULL                -- YYYY-MM-DD
  vehicle_make       TEXT NOT NULL
  vehicle_model      TEXT NOT NULL
  vehicle_colour     TEXT NOT NULL
  plate              TEXT NOT NULL
  seat_count         INTEGER NOT NULL             -- passenger seats, excluding the driver
  insurance_expiry   TEXT NOT NULL                -- YYYY-MM-DD
  status             TEXT NOT NULL                -- pending | approved | rejected
  review_note        TEXT
  reviewed_at        TEXT
  reviewed_by        TEXT REFERENCES users(id)
  created_at         TEXT NOT NULL
  updated_at         TEXT NOT NULL

rides
  id                    TEXT PK
  driver_user_id        TEXT NOT NULL REFERENCES users(id)
  origin_place_id       TEXT NOT NULL
  destination_place_id  TEXT NOT NULL
  departure_at          TEXT NOT NULL
  seats_total           INTEGER NOT NULL
  seats_left            INTEGER NOT NULL
  price_per_seat_cents  INTEGER NOT NULL
  notes                 TEXT
  status                TEXT NOT NULL             -- open | full | cancelled | completed
  created_at            TEXT NOT NULL

bookings
  id                  TEXT PK
  ride_id             TEXT NOT NULL REFERENCES rides(id)
  passenger_id        TEXT NOT NULL REFERENCES users(id)
  seats               INTEGER NOT NULL
  fare_cents          INTEGER NOT NULL
  commission_cents    INTEGER NOT NULL
  driver_net_cents    INTEGER NOT NULL
  status              TEXT NOT NULL               -- pending_payment | confirmed | completed | cancelled | refunded
  created_at          TEXT NOT NULL
  updated_at          TEXT NOT NULL

payments
  id             TEXT PK
  booking_id     TEXT NOT NULL REFERENCES bookings(id)
  provider       TEXT NOT NULL                    -- 'sandbox' in this build
  provider_ref   TEXT NOT NULL
  amount_cents   INTEGER NOT NULL
  status         TEXT NOT NULL                    -- requires_payment | captured | declined | refunded
  last4          TEXT                             -- test card only; full PAN is never stored
  created_at     TEXT NOT NULL
  updated_at     TEXT NOT NULL
  UNIQUE (provider, provider_ref)

ledger_entries
  id            TEXT PK
  booking_id    TEXT NOT NULL
  payment_id    TEXT
  account       TEXT NOT NULL                     -- platform_cash | platform_commission | driver_payable
  amount_cents  INTEGER NOT NULL                  -- signed
  memo          TEXT NOT NULL
  created_at    TEXT NOT NULL
```

Indexes: `rides (status, departure_at)`, `bookings (passenger_id, created_at)`, `bookings (ride_id)`, `driver_profiles (status)`, `ledger_entries (booking_id)`.

### Ledger invariant

For every booking, and for the books as a whole:

`sum(platform_cash) = sum(platform_commission) + sum(driver_payable)`

Capture writes `+fare`, `+commission`, `+driver_net` with `fare = commission + driver_net`. Refund writes the same lines negated. A declined card writes nothing.

## Domain rules (code in `src/domain`)

| Rule | Value | Status |
| --- | --- | --- |
| Currency | MUR only | From the brief (Mauritius) |
| Price setter | The driver, per seat | ASSUMPTION |
| Commission | 15% of the fare (`COMMISSION_BPS = 1500`), rounded **down** to the cent. Deducted from the driver, not added on top | ASSUMPTION — open product decision |
| Minimum price per seat | Rs 50.00 | ASSUMPTION |
| Maximum price per seat | Rs 2,000.00 | ASSUMPTION |
| Seats per booking | 1 to 4, and not more than `seats_left` or the vehicle's passenger seats | ASSUMPTION |
| Lead time to post | Departure at least 30 minutes ahead | ASSUMPTION |
| Who may post | A driver whose profile status is `approved`, and whose licence and insurance expiry dates are still today or later in Mauritius | From the brief, dates are ASSUMPTION |
| Own ride | A driver cannot book their own ride | ASSUMPTION |
| Charge timing | Sandbox **capture at booking**. There is no separate authorisation hold | ASSUMPTION. A real PSP may want auth now and capture after the ride |
| Passenger cancel | Full refund if departure is at least 2 hours away. After that the app refuses and tells them to contact Bojo Solutions. No cancellation fee | ASSUMPTION |
| Driver cancel | Cancels the ride and fully refunds every confirmed booking | ASSUMPTION |
| Complete | The driver may mark the ride complete from 15 minutes before departure onward. Confirmed bookings become `completed`. Payables stay on the ledger. Nothing is transferred to a bank | ASSUMPTION |
| Match | Same catalogue place, or both ends within 8 km. Departure inside the searched Mauritius civil day. Status `open`, enough seats | ASSUMPTION. Not a corridor match along the road |
| Ranking | Earlier departure, then lower price per seat | ASSUMPTION |
| Adult declaration | Account creation requires a self-declaration of being 18 or older. This is not a legal age determination and not an ID check | ASSUMPTION |
| Island | Catalogue is Mauritius island localities only. Rodrigues is out | ASSUMPTION |

Quote:

```text
fare        = seats * price_per_seat
commission  = floor(fare * 1500 / 10000)
driver_net  = fare - commission
```

Sandbox cards (never a real charge):

| PAN | Expiry | CVC | Result |
| --- | --- | --- | --- |
| 4242 4242 4242 4242 | 12/34 | 123 | Captured |
| 4000 0000 0000 0002 | 12/34 | 123 | Declined, booking stays unpaid |
| Anything else | | | Rejected. The number is not stored |

Any PAN that is not one of those two test numbers is refused, so a real card cannot be typed in and kept.

Idempotency: confirming a captured payment twice does not capture again or decrement seats again. Refunding twice does not write a second reversal.

## Application map

- `/` — what the product is, the sandbox warning, a search
- `/rides` — matches
- `/rides/new` — post a ride (approved drivers)
- `/rides/[id]` — detail, map or schematic, book
- `/bookings` — passenger bookings and receipts
- `/drive` — the driver's rides, cancel, complete
- `/driver` — verification application and status
- `/admin` — pending drivers, review, payment ledger (sandbox)
- `/login`, `/register`
- `/legal` — prototype notice and the open questions. Not terms of carriage

Routes are hash paths (`/#/rides`). Every action checks the signed-in user inside `src/store/actions.ts`. Copy lives in `src/i18n.ts`. `/verify` confirms the mock email and SMS codes. `/messages` is the only inbox.

## External services and keys

None are required. The app runs with every variable unset. Names and placeholders are in `.env.example`. The full table is also in `docs/OPEN_QUESTIONS.md`.

Vite inlines `VITE_*` at build time. The GitHub Pages workflow does not set them, so the published demo stays on the mocks.

| Env name | What an empty value does |
| --- | --- |
| `VITE_PAYMENTS_MODE` | Defaults to sandbox. Any other value is refused; the TEST simulator stays on |
| `VITE_PAYMENT_SECRET_KEY` and `VITE_PAYMENT_PUBLISHABLE_KEY` | Both set, and both looking like test keys, switches on the sandbox payment adapter. Still no network charge |
| `VITE_GOOGLE_MAPS_API_KEY` | Schematic map until this is a non-placeholder browser key |
| `VITE_GOOGLE_MAPS_MAP_ID` | Optional, used only with the Maps key |
| `VITE_SMS_API_KEY` | In-app OTP. A sandbox-looking key only changes the label |
| `VITE_SMS_SENDER_ID` | Documented, not sent |
| `VITE_EMAIL_API_KEY` | In-app email. A sandbox-looking key only changes the label |
| `VITE_EMAIL_FROM` | Documented, not sent |
| `VITE_PAYMENT_PROVIDER` | Documented for a later PSP. Unused beyond the sandbox/simulator switch |

Google Maps, when Kevin wants it: Google Cloud project, billing, Maps JavaScript API, HTTP-referrer restricted browser key. The key will be inside the static bundle. Restrict it.

A later PSP for Mauritius is likely Peach Payments, MCB (Juice or acquiring), or Blink by Emtel. The seam is `src/services/adapters.ts`. A new adapter must refuse live keys. Stripe is not assumed.

## Local demo identities

Seeded in the browser. Password for every one of them is `demo-pass`. These are fixture accounts, shown on the sign-in screen, not staff credentials.

- Passenger — `passenger@bojosolutions.example` (Asha Ramgoolam)
- Approved driver — `driver@bojosolutions.example` (Jean-Luc Baptiste), with three upcoming rides
- Pending driver — `pending@bojosolutions.example` (Meera Seewoosurrun)
- Admin — `admin@bojosolutions.example` (Kevin Admin)

## Deploy (detail in the README)

1. `npm ci`
2. `npm test`
3. `npm run build`
4. Publish the `dist/` folder. On GitHub, push to `main`. `.github/workflows/pages.yml` builds, tests, and deploys to Pages.
5. In the GitHub repo settings, set Pages source to GitHub Actions. The site path is `/carpool-mauritius-b-paid/`.

Do not set a live payment key. The static build has no server to hide one, and the adapter refuses keys that do not look like test keys.

## Unresolved legal questions

These block any real passenger paying any real driver. They are not answered here.

1. **Operating authority.** Collecting a fare and a commission may make the driver, Bojo Solutions, or both a public-transport or contract-car operation under the Road Traffic Act and National Land Transport Authority rules. Version B is the paid model on purpose. No NLTA, taxi, or contract-car permission is claimed, and none was supplied.
2. **Driver permission.** It is undecided whether a driver on this product needs a taxi licence, a contract-car permit, or a public-service vehicle licence, and whether a private-car licence is enough. The admin screen records a licence number; it does not check it with NLTA.
3. **Insurance.** It is undecided whether a private motor policy covers injury or damage when the driver is paid a fare. The form records an expiry date only.
4. **Holding funds.** Capturing a fare and keeping a driver payable may be a payment service or e-money activity regulated by the Bank of Mauritius. The MVP never holds real funds. Who the merchant of record is (the driver or Bojo Solutions) is undecided.
5. **VAT and income.** It is undecided whether the commission is a taxable supply, whether VAT applies to the fare, and who issues the receipt. The on-screen receipt is a sandbox record, not a fiscal invoice.
6. **Data protection.** NIC numbers, licence numbers, phone numbers, and trip history are personal data under the Data Protection Act 2017. Lawful basis, retention, access, and whether Bojo Solutions needs a registered controller or a DPO are undecided. There is no production privacy notice.
7. **Consumer refunds.** The 2-hour cutoff is a product assumption, not a statement of Mauritian consumer law.
8. **Age.** The "18 or older" checkbox is a product assumption, not legal advice on the age of drivers or of passengers.
9. **Liability after a crash.** Wording has to come from counsel. The app does not display a liability waiver and does not claim that one would be valid.
10. **Payouts and AML.** Paying drivers out, and what identity checks a PSP or bank will require, is entirely open.

## Unresolved product decisions

1. Commission rate, and whether the passenger sees it added on top instead of taken from the driver.
2. Cancellation windows, fees, and no-shows (passenger no-show and driver no-show).
3. Auth-and-capture versus capture-at-booking, once a PSP exists.
4. Endpoint matching (what the MVP does) versus matching a pickup along the driver's route.
5. Recurring commute trips. Not built.
6. In-app chat, live GPS, and ratings. Not built.
7. Creole as a third language. Not built. English and French only.
8. Document upload (licence photo, insurance PDF) versus the typed fields the MVP uses.
9. Whether an admin may suspend a user or reverse a completed ride. Not built. Refunds of completed rides are an open case for a human.
10. Suggested prices from distance. Not built. The driver types the price inside the min/max.
