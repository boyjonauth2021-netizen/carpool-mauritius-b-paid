# Open questions and keys

Version B only: a passenger pays a seat price set by a verified driver, and the demo records a platform commission. This is not version A (free matching) and not version C (regulated cost sharing). Nothing here is legal advice, a licence, or permission to take real money.

The attached spec was not on the workspace filesystem when this file was written. The rules the app enforces are the ones in `docs/PLAN.md`. Where that plan marks a number as an assumption, it is an assumption.

## Legal questions still open

1. Does collecting a fare and a commission make the driver, Bojo Solutions, or both a public-transport or contract-car operation under the Road Traffic Act and National Land Transport Authority rules?
2. Does a driver on this product need a taxi licence, a contract-car permit, or a public-service vehicle licence? The admin screen stores a licence number. It does not check it with NLTA.
3. Does a private motor policy cover injury or damage when the driver is paid a fare? The form stores an expiry date only.
4. Does capturing a fare and keeping a driver payable count as a payment service or e-money activity regulated by the Bank of Mauritius? This demo never holds real funds. Who the merchant of record would be is undecided.
5. Does VAT apply to the fare, the commission, or both, and who issues a fiscal receipt? The on-screen receipt is a sandbox record, not an invoice.
6. NIC numbers, licence numbers, phone numbers, and trip history are personal data under the Data Protection Act 2017. Lawful basis, retention, access, and whether a controller or DPO is required are undecided. The demo keeps that data in the browser only.
7. The 2-hour cancellation cutoff is a product assumption, not a statement of Mauritian consumer law.
8. The "18 or older" checkbox is a product assumption, not a determination of the legal age for drivers or passengers.
9. Liability after a crash has to be written by counsel. The app does not show a waiver and does not claim one would be valid.
10. Paying drivers out, and the identity checks a bank or PSP will require, is entirely open.

## Product decisions still open

1. Commission is 15% of the fare, rounded down to the cent, taken from the driver rather than added on top.
2. Passenger cancellation is a full refund until 2 hours before departure, and refused after that. No fee is invented. No-shows are not handled.
3. The demo captures at booking. A real PSP may want authorisation now and capture after the ride.
4. Matching is by the two ends (same place, or within 8 km), not along the road.
5. Recurring commute trips, chat, live GPS, ratings, and Kreol are not in this build.
6. Verification is typed fields, not document upload.

## API keys

All of these are optional. The Pages build uses none of them. Names and placeholders live in `.env.example`. Do not commit real values. Do not use a live key: the app refuses payment keys that do not look like test or sandbox keys, and it refuses `VITE_PAYMENTS_MODE` other than `sandbox`.

| Name | Service | When it changes the demo |
| --- | --- | --- |
| `VITE_PAYMENTS_MODE` | Payment safety switch | Must be `sandbox`. Anything else keeps the TEST simulator and shows a warning. |
| `VITE_PAYMENT_PROVIDER` | Label for a future PSP | Documented only. The code path is the sandbox adapter or the in-browser simulator. |
| `VITE_PAYMENT_SECRET_KEY` | PSP test secret | Together with the publishable test key, switches on the sandbox payment adapter. Still no network charge. |
| `VITE_PAYMENT_PUBLISHABLE_KEY` | PSP test publishable key | Must be paired with the secret, and both must look like test keys. |
| `VITE_GOOGLE_MAPS_API_KEY` | Google Maps JavaScript API | Replaces the schematic map with Google's map. Public in the bundle. Restrict it by HTTP referrer. |
| `VITE_GOOGLE_MAPS_MAP_ID` | Optional vector map id | Passed through only when the Maps key is set. |
| `VITE_SMS_API_KEY` | SMS provider sandbox | If the value looks like a test or sandbox key, OTP messages are labelled sandbox. They still stay in the in-app inbox. |
| `VITE_SMS_SENDER_ID` | Sender id | Documented for a future provider. Not sent anywhere in this build. |
| `VITE_EMAIL_API_KEY` | Email provider sandbox | Same rule as SMS. Receipts and codes stay in the in-app inbox. |
| `VITE_EMAIL_FROM` | From address | Documented for a future provider. Not sent anywhere in this build. |

Mauritian acquirers to ask about later, not integrated here: Peach Payments, MCB (Juice or merchant acquiring), Blink by Emtel. Stripe is not assumed to be available for a Mauritian merchant.

There is no server session secret. The demo session is the signed-in user id in `localStorage`.
