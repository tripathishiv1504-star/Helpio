# PROGRESS

## Part 1 — Scaffold, design system, landing page
`done`

### Files Created
- Shared:
  - `shared/constants.js`: ROLES, URGENCY, REQUEST_STATUS, PRICING_TYPE, CATEGORY_TYPE, OFFER_STATUS, PAYMENT_STATUS, VERIFICATION_STATUS, REPORT_STATUS
- Server:
  - `server/package.json`: Express, Helmet, CORS, Dotenv, Mongoose, Zod, Bcryptjs, JWT, Jest, Supertest
  - `server/.env.example`, `server/.env`: Configuration defaults
  - `server/src/config/env.js`: Environment config loader
  - `server/src/config/db.js`: MongoDB connection with in-memory fallback
  - `server/src/config/index.js`: Config re-exports
  - `server/src/utils/response.js`: Standard `{ success, data, error }` response helpers `ok()` and `fail()`
  - `server/src/utils/asyncHandler.js`: Async route wrapper
  - `server/src/utils/haversine.js`: Haversine distance calculator in km
  - `server/src/utils/index.js`: Utils re-exports
  - `server/src/middleware/errorHandler.js`: Centralized error handler
  - `server/src/middleware/validate.js`: Zod schema request validation middleware
  - `server/src/middleware/rateLimit.js`: In-memory IP rate limiter
  - `server/src/app.js`: Express app with Helmet, CORS, JSON parsing, logging, `/api/health`, and dynamic module auto-loader
  - `server/src/server.js`: Server entrypoint
- Client:
  - `client/package.json`: Vite, React 18, React Router v6, Tailwind CSS, Leaflet
  - `client/vite.config.js`: `@shared` alias to `../shared` and `/api` proxy
  - `client/tailwind.config.js`: Theme tokens (calm teal primary, warm amber accent, neutral grays)
  - `client/postcss.config.js`: Tailwind and Autoprefixer
  - `client/index.html`: Responsive HTML entry with Leaflet CDN
  - `client/src/index.css`: Tailwind directives and Leaflet rules
  - `client/src/main.jsx`: React root
  - `client/src/lib/api.js`: Fetch wrapper with JWT handling and unwrapped response contracts
  - `client/src/lib/session.js`: Session management and `useSession` hook
  - `client/src/components/ui/`: Button, Input, Select, Textarea, Card, Badge, StatusBadge, Modal, Spinner, EmptyState, Toast, PageHeader, LocationPicker, MapView, index.js
  - `client/src/app/`: App.jsx, AppLayout.jsx (auto-discovers nav from `features/*/routes.jsx` and nav widgets from `features/*/navWidget.jsx`), AppRouter.jsx, RequireRole.jsx, NotFound.jsx
  - `client/src/features/landing/`: LandingPage.jsx (hero, 3 value chips, 5-step lifecycle, 3 service areas, helper CTA, footer), routes.jsx

### Endpoints
- `GET /api/health`: Health status check

### How to Verify
1. Start server: `cd server && npm start` (proves port 5000 is listening and responds to `GET /api/health`)
2. Start client: `cd client && npm run dev` (opens Vite dev server at `http://localhost:5173`)
3. Build client: `cd client && npm run build` (verifies all bundle dependencies and JSX syntax)
4. Verify auto-mounting by adding a test module export in `server/src/modules/`

## Part 2 — Data models, indexes, seed
`done`

### Files Created
- Server Models (`server/src/models/`):
  - `User.js`: User model (name, email, phone, passwordHash, roles, status, timestamps)
  - `HelperProfile.js`: Helper profile (user ref, bio, skills with rate/rateType, GeoJSON Point location with 2dsphere index, radiusKm, isOnline, weeklyAvailability, verificationStatus, verificationNote, stats, earningsTotal)
  - `Category.js`: Category model (name, type, subcategories, active)
  - `ServiceRequest.js`: Request model (user, category, subcategory, description, location Point + address, asap, scheduledFor, urgency, pricingType, budget, status, helper, statusHistory, searchRadiusKm, finalAmount, 2dsphere & compound indexes)
  - `Offer.js`: Matching offer (request, helper, score, distanceKm, status, expiresAt, unique compound index on `{ request, helper }`)
  - `Message.js`: In-app chat messages (request, sender, text up to 1000 chars)
  - `Payment.js`: Payment transactions (request, amount, platformFee, helperPayout, method, status, providerRef)
  - `Rating.js`: 1–5 star reviews with comments (request, from, to, unique compound index on `{ request, from }`)
  - `Report.js`: Dispute / issue reporting (request, filedBy, against, reason, status, resolution)
  - `Notification.js`: System notifications (user, type, payload, read)
  - `Setting.js`: Platform settings (key, value, unique index on `key`)
  - `index.js`: Exports all 11 Mongoose models
- Categories Module (`server/src/modules/categories/`):
  - `categories.service.js`: `getActiveCategoriesGrouped()`
  - `index.js`: Exports `{ mountPath: '/categories', router, service }` exposing `GET /api/categories`
- Seed Script (`server/src/seed/index.js`):
  - Idempotent database seeder runnable via `npm run seed`:
    - Commission percent setting = 10%
    - Admin account from `ADMIN_EMAIL` / `ADMIN_PASSWORD`
    - 3 Category areas (Community Help, Professional Help, Instant Local Workforce) with 12 subcategories
    - 8 Demo Helpers (approved, online, with skills, hourly/fixed rates, and weekly schedules) geographically distributed around `SEED_CENTER_LAT` / `SEED_CENTER_LNG`

### Endpoints
- `GET /api/categories`: Returns active categories grouped by type (`community`, `professional`, `instant`)

### How to Verify
1. Run seed script: `cd server && npm run seed` (runs idempotently without duplicates)
2. Run again: `cd server && npm run seed` (confirms no duplicate documents are inserted)
3. Test categories endpoint: `curl http://localhost:5000/api/categories`
4. Test GeoJSON query: Query `HelperProfile` with `$near` using `[SEED_CENTER_LNG, SEED_CENTER_LAT]` coordinates

## Part 3 — Authentication and session
`done`

### Files Created
- Server:
  - `server/src/middleware/auth.js`: JWT authentication middleware (`requireAuth`, `requireRole`, `optionalAuth`) with 7-day token validation, user status check (blocks suspended accounts), and role-based access control.
  - `server/src/modules/auth/auth.validation.js`: Zod schemas for register, login, and profile update.
  - `server/src/modules/auth/auth.service.js`: Authentication business logic (register with user/helper roles, login, password comparison, getMe, updateMe with password verification).
  - `server/src/modules/auth/index.js`: Exposes `/api/auth` router with rate-limited login, registration, `/me`, and `PATCH /me`.
- Client:
  - `client/src/features/auth/redirects.js`: Post-login navigation strategy (`/admin` for admin, `/helper` for helper-only intent, `/dashboard` for others).
  - `client/src/features/auth/LoginPage.jsx`: Clean sign-in page with validation and toast notifications.
  - `client/src/features/auth/RegisterPage.jsx`: Sign-up page with "I want to offer my services as a Helper" toggle.
  - `client/src/features/auth/ProfilePage.jsx`: Full `/profile` management page allowing updating personal info and changing password.
  - `client/src/features/auth/routes.jsx`: Dynamic route definitions for `/login`, `/register`, and `/profile`.

### Endpoints
- `POST /api/auth/register`: Register as `user` or `[user, helper]` (admin role blocked)
- `POST /api/auth/login`: Rate-limited login returning JWT token and user profile
- `GET /api/auth/me`: Fetch authenticated user profile
- `PATCH /api/auth/me`: Update name, phone, or password

### How to Verify
1. Register user: `curl -X POST http://localhost:5000/api/auth/register -H "Content-Type: application/json" -d '{"name":"Alice","email":"alice@test.com","password":"Password123!"}'`
2. Login user: `curl -X POST http://localhost:5000/api/auth/login -H "Content-Type: application/json" -d '{"email":"alice@test.com","password":"Password123!"}'`
3. Fetch profile with Bearer token: `curl http://localhost:5000/api/auth/me -H "Authorization: Bearer <TOKEN>"`
4. Verify admin protection: Request protected admin routes with a non-admin token (returns HTTP 403 Forbidden)
5. Test client pages: Visit `/login`, `/register`, and `/profile` in browser

## Part 4 — Helper onboarding, profile, availability
`done`

### Files Created
- Server (`server/src/modules/helpers/`):
  - `helpers.validation.js`: Zod validation schemas for `onboard`, `updateProfile`, `availability`, and `online` status toggle.
  - `helpers.service.js`: Service business logic including active category/subcategory validation, helper profile upsert with initial `pending` verification status, profile update, weekly availability update, online toggle restricted strictly to approved helpers, and earnings aggregation from Payment documents.
  - `index.js`: Exports `{ mountPath: '/helpers', router, service }` exposing all `/api/helpers/*` endpoints protected by `requireAuth` and `requireRole('helper')`.
- Client (`client/src/features/helper/`):
  - `HelperOnboarding.jsx`: 4-step wizard (Skills and Rates selection from active categories, Base location and radius slider via LocationPicker, Weekly availability schedule, Review and Submit).
  - `HelperDashboard.jsx`: Dashboard displaying verification status banners (pending review, approved, or rejected with administrator note), dynamic online/offline toggle with live pulse badge, key stats (rating average & count, completed jobs, total earnings, radius), and navigation cards.
  - `HelperProfilePage.jsx`: Page to view and edit bio, offered skills, base location, and service radius.
  - `HelperAvailabilityPage.jsx`: Weekly schedule manager for day-by-day active hours.
  - `HelperEarningsPage.jsx`: Earnings overview showing total payout, pending amounts, and historical job payment table.
  - `routes.jsx`: Route definitions for role `helper` with navbar navigation entries.

### Endpoints
- `POST /api/helpers/onboard`: Create or initialize HelperProfile with `verificationStatus: 'pending'`
- `GET /api/helpers/me`: Fetch authenticated helper profile
- `PATCH /api/helpers/me`: Update bio, skills, location, or radius
- `PATCH /api/helpers/me/availability`: Update weekly operating schedule
- `PATCH /api/helpers/me/online`: Toggle online/offline status (strictly rejected with 400 if not approved)
- `GET /api/helpers/me/earnings`: Retrieve earnings summary and payment breakdown

### How to Verify
1. Register as a helper (`wantsToHelp: true`)
2. Submit onboarding via `POST /api/helpers/onboard` and verify profile status is `pending`
3. Attempt to toggle online via `PATCH /api/helpers/me/online` (`isOnline: true`) -> blocked with 400
4. Update helper profile in database to `verificationStatus: 'approved'`
5. Attempt toggle online again -> succeeds with HTTP 200 and `isOnline: true`
6. Verify helper pages in client: `/helper`, `/helper/onboard`, `/helper/profile`, `/helper/availability`, `/helper/earnings`

## Part 5 — Service requests and status machine
`done`

### Files Created
- Server (`server/src/modules/requests/`):
  - `events.js`: Central application EventEmitter with constants (`request:posted`, `status:changed`, `offer:created`, `message:created`).
  - `stateMachine.js`: Comprehensive state machine table covering all legal transitions in PRD section 8 and addendum, actor permission checks, conditional skips (free jobs skipping paid), `transition()` implementation with history logging and event emission.
  - `requests.validation.js`: Zod schema for request posting (category, subcategory, description, coordinates, asap/scheduled, urgency, pricingType, budget).
  - `requests.service.js`: Creation of service requests, mine query, detail lookup with strict privacy serialization (`serializeRequestFor`), cancellation handling, and `setFinalAmount()` exposed for downstream jobs module.
  - `index.js`: Exports `{ mountPath: '/requests', router, service, events, transition, setFinalAmount }`.
  - `server/tests/stateMachine.test.js`: 20 unit tests covering every valid state change, actor restrictions, and illegal transition rejections.
- Client (`client/src/features/requests/`):
  - `UserDashboard.jsx`: User home at `/dashboard` with "Post a Need" hero CTA and recent requests list with status badges.
  - `NewRequestPage.jsx`: Multi-section form at `/requests/new` featuring 3 service area cards (Community, Professional, Instant), skill selector, description textarea, LocationPicker, ASAP vs Scheduled toggle, urgency levels, and pricing/budget options.
  - `RequestsListPage.jsx`: List view at `/requests` with filter tabs (All, Active, Completed).
  - `RequestDetailPage.jsx`: Dynamic request view at `/requests/:id` that automatically discovers all `features/*/requestPanel.jsx` panels, sorts them by `order`, and filters by `visibleWhen(request, user)`. Includes user cancellation modal.
  - `requestPanel.jsx`: Exports `SummaryPanel` (Order 10) and `StatusTimelinePanel` (Order 20).
  - `routes.jsx`: Route definitions for user dashboard, new request, requests list, and request detail.

### Endpoints
- `POST /api/requests`: Create a new service request in `POSTED` status (emits `request:posted`)
- `GET /api/requests/mine`: Fetch all requests for authenticated user
- `GET /api/requests/:id`: Fetch single request with privacy serialization (approximate coordinates for unassigned helpers)
- `POST /api/requests/:id/cancel`: Cancel request before work starts (transitions to `CANCELLED`)

### How to Verify
1. Run state machine unit tests: `cd server && npm test` (all 20 unit tests pass)
2. Post request: `curl -X POST http://localhost:5000/api/requests -H "Authorization: Bearer <TOKEN>" -H "Content-Type: application/json" -d '{"category":"<CAT_ID>","subcategory":"electrician","description":"Repair kitchen lighting","location":{"lat":28.61,"lng":77.20},"asap":true,"pricingType":"fixed","budget":350}'`
3. Verify request is saved with status `POSTED` and stays `POSTED`
4. Cancel request: `curl -X POST http://localhost:5000/api/requests/<ID>/cancel -H "Authorization: Bearer <TOKEN>"` -> transitions to `CANCELLED`
5. Test client pages: `/dashboard`, `/requests/new`, `/requests`, and `/requests/:id`

## Part 6 — Matching engine and offers
`done`

### Files Created
- Server (`server/src/modules/matching/`):
  - `config.js`: Matching engine weights (distance: 0.35, rating: 0.25, response rate: 0.15, completion rate: 0.15, price match: 0.10), offer lifetime by urgency (urgent: 15m, normal: 30m, low: 60m), max offers per wave (5), and radius widening factor (1.5x).
  - `engine.js`: Pure, deterministic candidate scoring and ranking function `rank(candidates, request, config)`. Computes normalized individual component scores and returns sorted candidates with detailed score breakdowns.
  - `matching.service.js`: Handles `request:posted` event to automatically query candidates within radius, rank them, create up to 5 Offer records, and transition request to `OFFERED`. Provides atomic `acceptOffer` with race condition protection (`findOneAndUpdate` on request ensuring single winner, invalidating competing offers to `REJECTED`), helper rejection `rejectOffer`, and periodic background expiry worker `runExpiryCheck()` with 1-time 50% radius widening fallback.
  - `index.js`: Exposes `/api/offers` router (`GET /api/offers`, `POST /api/offers/:id/accept`, `POST /api/offers/:id/reject`), registers event hooks on `request:posted`, and runs background expiry sweep.
  - `server/tests/matchingEngine.test.js`: 13 unit tests covering weights, distance normalization, rating scores, price alignment, deterministic ordering, and empty candidate handling.
- Client (`client/src/features/offers/`):
  - `HelperOffersPage.jsx`: Helper incoming offers feed at `/helper/offers` with distance, countdown expiry timer, pricing preview, and Accept / Decline actions.
  - `requestPanel.jsx`: Auto-discovered `MatchStatusPanel` (Order 30) for `RequestDetailPage` displaying matching progress, search radius, active offers count, and matched helper information.
  - `routes.jsx`: Helper route definition for `/helper/offers`.

### Endpoints
- `GET /api/offers`: Helper lists active and historical incoming job offers
- `POST /api/offers/:id/accept`: Atomically accept an offer, assign helper, transition request to `MATCHED`, and cancel all other competing offers
- `POST /api/offers/:id/reject`: Helper explicitly declines an offer

### How to Verify
1. Run matching unit tests: `cd server && npm test` (all 33 unit tests pass across matching engine and state machine)
2. Build client: `cd client && npm run build` (builds cleanly with zero JSX or Vite errors)
3. Concurrency test: Two helpers accepting the same request concurrently results in exactly one 200 HTTP response and one 409 Conflict ("This request has already been accepted by another helper") response.
4. Auto-mount check: Verify `MatchStatusPanel` displays on `/requests/:id` and `/helper/offers` renders incoming offers.

## Part 7 — Job lifecycle and chat
`done`

### Files Created
- Server (`server/src/modules/jobs/`):
  - `jobs.validation.js`: Zod validation schemas for `completeJobSchema` (validating numerical `finalAmount` for paid requests) and `createMessageSchema` (trimming text, 1–1000 character validation).
  - `jobs.service.js`:
    - `startJob(requestId, user)`: Validates assigned helper and moves status from `ACCEPTED` to `IN_PROGRESS` via `transition()`.
    - `completeJob(requestId, user, { finalAmount })`: Validates assigned helper, validates required `finalAmount > 0` for paid jobs (or 0 for free community tasks), invokes `setFinalAmount()` exposed by requests module, and transitions from `IN_PROGRESS` to `COMPLETED`.
    - `getMessages(requestId, user)`: Fetches chronological direct chat messages for owner, assigned helper, or admin once accepted.
    - `sendMessage(requestId, user, text)`: Validates active chat window (`ACCEPTED` through `PAID`), creates message, and emits `message:created` event.
    - `getHelperJobs(user)`: Retrieves active (`ACCEPTED`, `IN_PROGRESS`) and past (`COMPLETED`, `PAID`, `RATED`, `CANCELLED`) jobs for the authenticated helper.
  - `index.js`: Auto-registering module mount at `/jobs` with chat rate limiting (30 msg/min per IP), exposing `GET /`, `GET /mine`, `POST /:requestId/start`, `POST /:requestId/complete`, `GET /:requestId/messages`, and `POST /:requestId/messages`.
  - `server/tests/jobs.test.js`: 14 unit and integration tests covering startJob, completeJob (free and paid), chat restrictions before acceptance, bidirectional chat, and third-party protection.
- Client (`client/src/features/jobs/`):
  - `requestPanel.jsx`:
    - Auto-discovered `WorkControlsPanel` (Order 25): Displayed only to assigned helper, shows customer contact, full unmasked address with coordinates, "Start Job" button (in `ACCEPTED`), and "Complete Job" form with final amount input (in `IN_PROGRESS`).
    - Auto-discovered `ChatPanel` (Order 40): Shows nothing before acceptance, renders real-time polling chat (every 5 seconds) with auto-scroll, distinct chat bubbles, timestamp formatting, role badges, and responsive message input form.
  - `HelperJobsPage.jsx`: Page at `/helper/jobs` with tabs for "Active Jobs" and "Past Jobs", rich card layouts, status & urgency badges, and quick links to request detail.
  - `routes.jsx`: Route definition for `/helper/jobs` auto-mounted to helper navigation.

### Endpoints
- `GET /api/jobs`: List helper's active and past assigned jobs
- `GET /api/jobs/mine`: Alias for helper's assigned jobs
- `POST /api/jobs/:requestId/start`: Transition request status from `ACCEPTED` to `IN_PROGRESS`
- `POST /api/jobs/:requestId/complete`: Transition request status from `IN_PROGRESS` to `COMPLETED` and record `finalAmount`
- `GET /api/jobs/:requestId/messages`: Retrieve direct chat messages
- `POST /api/jobs/:requestId/messages`: Post direct message and emit `message:created`

### How to Verify
1. Run all unit tests: `cd server && npm test` (all 47 unit tests pass across jobs, matching engine, and state machine)
2. Build client: `cd client && npm run build` (builds in ~3.4s with 0 errors)
3. Lifecycle test:
   - Accept request as helper -> status is `ACCEPTED`
   - Try to complete -> rejected with 400 (must be `IN_PROGRESS`)
   - Click "Start Job" -> status transitions to `IN_PROGRESS`
   - Complete paid request without final amount -> rejected with 400
   - Complete with final amount ₹650 -> status transitions to `COMPLETED` and `finalAmount` is recorded
4. Chat test:
   - Before acceptance, messaging returns 400 error
   - After acceptance, both user and helper can send messages, which appear with 5s polling and auto-scroll
   - Non-participants receive 403 Forbidden

## Part 8 — Payments, commission, earnings, ratings
`done`

### Files Created
- Server:
  - `server/src/modules/payments/provider.js`: Payment provider abstraction interface with `SimulatedPaymentProvider` (defaulting to simulated gateway) selectable via `PAYMENT_PROVIDER` environment variable.
  - `server/src/modules/payments/payments.service.js`: Processes payments for completed service requests, retrieves platform commission from `Setting` (default 10%), computes `platformFee` and `helperPayout`, creates `Payment` records, increments `HelperProfile.earningsTotal`, and transitions request to `PAID`. Includes `getPaymentsMine` for customers and helpers.
  - `server/src/modules/payments/index.js`: Exposes `/api/payments` router (`POST /api/payments/:requestId/pay`, `GET /api/payments/mine`).
  - `server/src/modules/ratings/ratings.validation.js`: Zod schema for ratings (1 to 5 stars, max 1000 character comment).
  - `server/src/modules/ratings/ratings.service.js`: Submits ratings with direction-aware rules (owner rating helper at `PAID` or free `COMPLETED` transitions to `RATED` and updates `HelperProfile.stats.ratingAvg` and `ratingCount` incrementally; helper rating customer after `COMPLETED` is optional and preserves status). Prevents multiple ratings per direction per request. Exposes helper rating summary lookup and request rating lookup.
  - `server/src/modules/ratings/index.js`: Exposes `/api/ratings` router (`POST /api/ratings/:requestId`, `GET /api/ratings/helper/:id`, `GET /api/ratings/request/:requestId`).
  - `server/tests/paymentsAndRatings.test.js`: Unit and integration tests verifying a ₹500 job at 10% pays out ₹450 and keeps ₹50, free jobs skip payment, rating updates helper's average and count incrementally, and duplicate ratings are rejected.
- Client:
  - `client/src/features/payments/requestPanel.jsx`: Auto-discovered `PaymentPanel` (Order 35) for request owners on completed requests showing itemized breakdown (helper fee, platform fee, total), simulated payment button, and verified payment receipt once settled.
  - `client/src/features/payments/PaymentsHistoryPage.jsx`: Transaction history page at `/payments` with date, service title, user/helper role badge, gross amount, platform fee, payout, and status.
  - `client/src/features/payments/routes.jsx`: Route definition for `/payments` mounted to user and helper navigation.
  - `client/src/features/ratings/requestPanel.jsx`: Auto-discovered `RatingPanel` (Order 50) with interactive 5-star selector, comment textarea, and helper overall rating summary badge for customers.
  - `client/src/features/ratings/routes.jsx`: Empty route array export ensuring auto-loader compliance.

### Endpoints
- `POST /api/payments/:requestId/pay`: Settle payment for completed request
- `GET /api/payments/mine`: List transactions for authenticated user
- `POST /api/ratings/:requestId`: Submit review for request counterparty
- `GET /api/ratings/helper/:id`: Fetch helper's public rating average, count, and review history
- `GET /api/ratings/request/:requestId`: Fetch reviews submitted on a specific request

### How to Verify
1. Run all unit tests: `cd server && npm test` (all 56 unit tests pass across payments, ratings, jobs, matching engine, and state machine)
2. Build client: `cd client && npm run build` (builds cleanly with 83 modules transformed)
3. Payment verification:
   - On a ₹500 completed job, click Pay -> creates payment document with `amount: 500, platformFee: 50, helperPayout: 450, status: "paid"`.
   - Helper profile `earningsTotal` increases by ₹450.
   - Request status transitions from `COMPLETED` to `PAID`.
4. Rating verification:
   - Requester submits 5 stars -> helper's `stats.ratingCount` becomes 1, `ratingAvg` becomes 5.0, request moves to `RATED`.
   - Requester submits 4 stars on second job -> `ratingCount` becomes 2, `ratingAvg` becomes 4.5.
   - Free jobs allow rating directly upon completion without payment.

## Part 9 — Admin panel, reports and disputes
`done`

### Files Created
- Server:
  - `server/src/modules/reports/reports.validation.js`: Zod schema for dispute reporting (minimum 5 character reason) and admin dispute resolution (target status in `paid`, `rated`, `cancelled` with resolution note).
  - `server/src/modules/reports/reports.service.js`: Creation of service request disputes (transitions request from `COMPLETED` or `PAID` into `DISPUTED`), and dispute resolution by administrator driving transitions into `PAID`, `RATED`, or `CANCELLED`.
  - `server/src/modules/reports/index.js`: Exposes `/api/reports` router (`POST /api/reports`, `GET /api/reports`, `POST /api/reports/:id/resolve`).
  - `server/src/modules/admin/admin.validation.js`: Validation for helper approval/rejection, category creation and update, commission percentage settings, and user suspension.
  - `server/src/modules/admin/admin.service.js`: Platform oversight services (statistics aggregation with paid volume and commission earned, user management, helper verification with notes, category management, requests list, payments audit, and platform settings).
  - `server/src/modules/admin/index.js`: Exposes `/api/admin` router guarded strictly by `requireAuth` and `requireRole(ROLES.ADMIN)`.
  - `server/tests/adminAndReports.test.js`: 9 unit and integration tests verifying helper approval/rejection with note, commission percentage update, dispute creation transitioning to `DISPUTED`, resolution into `CANCELLED` and `PAID`, and non-participant report protection.
- Client:
  - `client/src/features/reports/requestPanel.jsx`: Auto-discovered `DisputePanel` (Order 60) on request detail allowing either customer or helper to file a problem report, and displays "Under Dispute Review" status badge when disputed.
  - `client/src/features/reports/routes.jsx`: Route array export for reports module.
  - `client/src/features/admin/AdminDashboard.jsx`: Complete management portal at `/admin` with 8 responsive tabs: Overview (financial & operational metrics), Helper Verification (filterable cards with approval/rejection modals and notes), Users (search and suspend/reactivate toggles), Categories (create and edit category dialogs), Requests (live status monitor), Payments (financial breakdown audit), Disputes (open dispute resolution modal), and Settings (interactive commission slider).
  - `client/src/features/admin/routes.jsx`: Route definition for `/admin` guarded by role `admin` and displayed on top-level navigation.

### Endpoints
- `POST /api/reports`: File a dispute report (transitions `COMPLETED`/`PAID` requests to `DISPUTED`)
- `GET /api/reports`: Admin lists filed dispute reports
- `POST /api/reports/:id/resolve`: Admin resolves dispute into `PAID`, `RATED`, or `CANCELLED`
- `GET /api/admin/stats`: Operational counts, paid volume, and commission earned
- `GET /api/admin/users`: Search and list platform accounts
- `PATCH /api/admin/users/:id/status`: Suspend or reactivate user
- `GET /api/admin/helpers`: Filter helper profiles by verification status
- `PATCH /api/admin/helpers/:id/verify`: Approve or reject helper with note
- `GET /api/admin/categories` & `POST /api/admin/categories`: Category management
- `PATCH /api/admin/categories/:id`: Update category and subcategories
- `GET /api/admin/requests`: Filter requests by status
- `GET /api/admin/payments`: Platform financial transactions audit
- `GET /api/admin/settings` & `PATCH /api/admin/settings`: Read and update global commission rate

### How to Verify
1. Run all unit tests: `cd server && npm test` (all 65 unit tests pass across admin, reports, payments, ratings, jobs, matching, and state machine)
2. Build client: `cd client && npm run build` (builds in ~3.5s with 86 modules transformed)
3. Non-admin security check: Requesting any `/api/admin/*` endpoint with a user or helper token returns HTTP 403 Forbidden.
4. Admin verification:
   - Login as admin (`ADMIN_EMAIL` / `ADMIN_PASSWORD`).
   - Visit `/admin` -> All 8 tabs load correctly.
   - Go to Helper Verification -> click Approve on a pending helper -> helper is approved and can toggle online.
   - Go to Settings -> adjust commission slider to 15% and save -> updates setting in database.
   - File a dispute on a completed request -> status becomes `DISPUTED`.
   - Go to Disputes tab -> click Resolve -> choose `CANCELLED` or `PAID` -> request transitions cleanly and dispute is resolved.

## Part 10 — Notifications, end-to-end test, release
`done`

### Files Created
- Server:
  - `server/src/modules/notifications/notifications.service.js`: Subscribes in `init()` to application events (`status:changed`, `offer:created`, `message:created`) and generates system notifications for helpers, customers, and admins. Exposes `getUserNotifications`, `markAsRead`, and `markAllAsRead`.
  - `server/src/modules/notifications/index.js`: Exposes `/api/notifications` router (`GET /api/notifications`, `POST /api/notifications/:id/read`, `POST /api/notifications/read-all`) and registers event subscriptions in `init()`.
  - `server/tests/e2e.test.js`: Full automated API test covering the complete happy path lifecycle (register user & helper, admin verification, helper online toggle, post need, match & offer, helper accept, notification delivery, bidirectional chat, helper start, helper complete, customer pay, helper payout, customer rating, helper rating -> `RATED`), plus a second test verifying offer rejection, periodic expiry checking, 50% radius widening, and final `EXPIRED` transition.
- Client:
  - `client/src/features/notifications/navWidget.jsx`: Auto-discovered Navbar widget displaying a notification bell with live unread badge, 15-second polling interval, dropdown with recent notifications, direct link navigation, and "Mark all read" action.
  - `client/src/features/notifications/NotificationsPage.jsx`: Full notifications inbox page at `/notifications`.
  - `client/src/features/notifications/routes.jsx`: Route export for `/notifications`.
- Deployment & Release:
  - `package.json`: Root package with unified scripts (`install:all`, `seed`, `test`, `build`, `start`, `dev:server`, `dev:client`).
  - `Dockerfile`: Production multi-stage build containerizing frontend Vite build and Node.js backend.
  - `docker-compose.yml`: Ready-to-deploy multi-container stack with MongoDB 7.0 and Helpio server.
  - `README.md`: Comprehensive documentation covering architecture, quick start, environment variables, seed data, run commands, testing, Docker deployment, and demo credentials.

### Cross-part Fixes
- `server/src/modules/matching/index.js`: Updated route registration to `router.get(['/', '/mine'], ...)` so both `GET /api/offers` and `GET /api/offers/mine` are accepted by the helper offers router.

### Endpoints
- `GET /api/notifications`: Retrieve user's notification feed and unread count
- `POST /api/notifications/:id/read`: Mark notification as read
- `POST /api/notifications/read-all`: Mark all notifications as read

### How to Verify
1. Run full test suite: `cd server && npm test` (all 67 unit and end-to-end integration tests pass cleanly across all 6 test suites)
2. Build client for production: `cd client && npm run build` (builds cleanly with 89 modules in ~3.9s)
3. Run E2E test in isolation: `npx jest tests/e2e.test.js` (both happy path and rejection/expiry flows pass)
4. Verify notifications:
   - Login as user -> bell widget polls every 15s.
   - When a helper accepts an offer or sends a message, bell shows red unread badge and clicking notification navigates to request detail.

## Blockers
